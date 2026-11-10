import { progressToward, withinTarget } from "@/lib/target-rules";
import type { Indicator } from "@/types/medidor";
import {
  REPORT_STATUS_LABELS,
  type IndicatorReport,
  type PermissionAction,
  type ReportVersionSnapshot,
  type ReportingPeriod,
  type ReportingUser,
  type ReviewAction,
  type ReviewEvent,
  type Role,
} from "@/types/reporting";

const EDITABLE_STATUSES = ["borrador", "devuelto", "reabierto"] as const;
const REVIEWABLE_STATUSES = ["enviado", "en_revision"] as const;

function hasStatus(status: IndicatorReport["status"], statuses: readonly IndicatorReport["status"][]): boolean {
  return statuses.includes(status);
}

function permissionRole(
  user: ReportingUser,
  action: PermissionAction,
  report: IndicatorReport,
): Role | null {
  if (!user.roles.includes("admin") && !user.projectIds.includes(report.projectId)) return null;

  let allowed = false;
  let requiredRole: Role = "lector";
  switch (action) {
    case "ver":
      allowed = user.roles.length > 0;
      requiredRole = user.roles[0] ?? "lector";
      break;
    case "editar":
    case "enviar":
      allowed = hasStatus(report.status, EDITABLE_STATUSES);
      requiredRole = "responsable";
      break;
    case "revisar":
    case "devolver":
      allowed = hasStatus(report.status, REVIEWABLE_STATUSES);
      requiredRole = "revisor";
      break;
    case "aprobar":
      allowed = report.status === "en_revision";
      requiredRole = "aprobador";
      break;
    case "reabrir":
      allowed = report.status === "aprobado";
      requiredRole = "coordinador";
      break;
  }

  if (!allowed) return null;
  const grantedRole: Role | null = user.roles.includes("admin")
    ? "admin"
    : user.roles.includes(requiredRole)
      ? requiredRole
      : null;
  if (grantedRole === null) return null;
  if (
    action === "aprobar" &&
    (report.createdBy === user.id ||
      report.submittedBy === user.id ||
      report.values.some((value) => value.enteredBy === user.id))
  ) {
    return null;
  }
  return grantedRole;
}

export function can(user: ReportingUser, action: PermissionAction, report: IndicatorReport): boolean {
  return permissionRole(user, action, report) !== null;
}

export interface SubmissionValidationInput {
  report: IndicatorReport;
  indicators: Indicator[];
  period: ReportingPeriod;
  /** Reporte aprobado del periodo inmediatamente anterior, resuelto por el llamador. */
  previousApproved: IndicatorReport | null;
  otherReports: IndicatorReport[];
  variationThreshold?: number;
  now: string;
}

export interface SubmissionValidation {
  errors: string[];
  warnings: string[];
}

export function validateForSubmission({
  report,
  indicators,
  period,
  previousApproved,
  otherReports,
  variationThreshold = 0.5,
  now,
}: SubmissionValidationInput): SubmissionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const expected = indicators.filter(
    (indicator) => indicator.decision === "aprobado" || indicator.decision === "modificado",
  );
  const expectedById = new Map(expected.map((indicator) => [indicator.id, indicator]));
  const currentById = new Map(report.values.map((value) => [value.indicatorId, value]));
  const previousById = new Map(
    (previousApproved?.values ?? []).map((value) => [value.indicatorId, value]),
  );

  if (!period.open) errors.push(`El periodo ${period.id} está cerrado.`);
  if (report.periodId !== period.id) {
    errors.push(`El reporte es del periodo ${report.periodId} y se está validando contra ${period.id}.`);
  }
  // Un Map se quedaría en silencio con la última fila; los duplicados se rechazan antes.
  const seen = new Set<string>();
  for (const value of report.values) {
    const label = value.institutionalCode || value.indicatorId;
    if (seen.has(value.indicatorId)) {
      errors.push(`El indicador "${label}" tiene más de un valor en el mismo reporte.`);
    }
    seen.add(value.indicatorId);
    if (value.periodId !== report.periodId) {
      errors.push(`El valor de "${label}" pertenece al periodo ${value.periodId}, no a ${report.periodId}.`);
    }
    if (value.explicitZero && value.value !== 0) {
      errors.push(`El valor de "${label}" está marcado como cero explícito pero no es cero.`);
    }
    if (value.value === 0 && !value.explicitZero) {
      errors.push(`El valor de "${label}" es cero sin confirmación: confirma que es un cero real y no un dato faltante.`);
    }
  }
  if (
    otherReports.some(
      (other) =>
        other.id !== report.id &&
        other.projectId === report.projectId &&
        other.periodId === report.periodId,
    )
  ) {
    errors.push(`Ya existe otro reporte para el proyecto y el periodo ${report.periodId}.`);
  }

  for (const indicator of expected) {
    const current = currentById.get(indicator.id);
    if (current === undefined) {
      errors.push(`El indicador "${indicator.name}" no tiene un registro de valor.`);
      continue;
    }
    if (
      current.value === null &&
      !current.explicitZero &&
      current.notMeasuredReason.trim() === ""
    ) {
      errors.push(`El indicador "${indicator.name}" no tiene valor ni motivo de no medición.`);
    }
    if (current.value === null) continue;

    const normalizedUnit = indicator.unit.trim().toLowerCase();
    if (
      current.value < 0 &&
      (normalizedUnit.startsWith("número") || normalizedUnit.startsWith("porcentaje"))
    ) {
      errors.push(`El indicador "${indicator.name}" no admite valores negativos.`);
    }
    if (normalizedUnit.startsWith("porcentaje") && current.value > 100) {
      errors.push(`El indicador "${indicator.name}" no admite porcentajes superiores a 100.`);
    }

    const previous = previousById.get(indicator.id)?.value ?? null;
    if (
      previous !== null &&
      indicator.accumulation === "acumulado" &&
      indicator.orientation === "ascendente" &&
      current.value < previous
    ) {
      errors.push(`El indicador acumulado ascendente "${indicator.name}" disminuyó frente al periodo anterior.`);
    }
    if (previous !== null) {
      if (previous !== 0 && Math.abs(current.value - previous) / Math.abs(previous) > variationThreshold) {
        warnings.push(`El indicador "${indicator.name}" varió más del umbral frente al periodo anterior.`);
      }
      if (
        (indicator.orientation === "ascendente" && current.value < previous) ||
        (indicator.orientation === "descendente" && current.value > previous)
      ) {
        warnings.push(`El indicador "${indicator.name}" se movió en contra de su orientación.`);
      }
    }
  }

  for (const value of report.values) {
    if (!expectedById.has(value.indicatorId)) {
      errors.push(`El valor del indicador "${value.institutionalCode || value.indicatorId}" no corresponde a un indicador esperado.`);
    }
  }
  // Se compara solo la fecha: enviar el mismo día del vencimiento no es tardío.
  if (now.slice(0, 10) > period.dueDate.slice(0, 10)) {
    warnings.push(`El reporte del periodo ${period.id} se presenta después de la fecha límite.`);
  }

  return { errors, warnings };
}

export interface TransitionInput {
  report: IndicatorReport;
  action: ReviewAction;
  actor: ReportingUser;
  now: string;
  eventId: string;
  comment?: string;
  indicatorComments?: Record<string, string>;
  /** Contexto para validar el envío. Obligatorio en la acción "enviar". */
  submission?: Omit<SubmissionValidationInput, "report" | "now">;
}

export type TransitionResult =
  | { ok: true; report: IndicatorReport; event: ReviewEvent; snapshot: ReportVersionSnapshot | null; warnings: string[] }
  | { ok: false; errors: string[] };

const ACTION_LABELS: Record<ReviewAction, string> = {
  enviar: "enviar",
  tomar_revision: "tomar en revisión",
  devolver: "devolver",
  aprobar: "aprobar",
  reabrir: "reabrir",
};

export function transition({
  report,
  action,
  actor,
  now,
  eventId,
  comment = "",
  indicatorComments = {},
  submission,
}: TransitionInput): TransitionResult {
  const permission: PermissionAction = action === "tomar_revision" ? "revisar" : action;
  const expected: Partial<Record<ReviewAction, IndicatorReport["status"][]>> = {
    enviar: ["borrador", "devuelto", "reabierto"],
    tomar_revision: ["enviado"],
    devolver: ["en_revision"],
    aprobar: ["en_revision"],
    reabrir: ["aprobado"],
  };
  if (!expected[action]?.includes(report.status)) {
    return {
      ok: false,
      errors: [`No se puede ${ACTION_LABELS[action]} un reporte en estado ${REPORT_STATUS_LABELS[report.status]}.`],
    };
  }

  const actorRole = permissionRole(actor, permission, report);
  if (actorRole === null) {
    return { ok: false, errors: [`No tiene permiso para ${ACTION_LABELS[action]} este reporte.`] };
  }
  let warnings: string[] = [];
  if (action === "enviar") {
    if (submission === undefined) {
      return { ok: false, errors: ["Faltan los datos para validar el reporte antes de enviarlo."] };
    }
    // La validación se ejecuta aquí, sobre el contenido que realmente se envía:
    // no se acepta un resultado calculado antes o sobre otra versión.
    const validation = validateForSubmission({ ...submission, report, now });
    if (validation.errors.length > 0) return { ok: false, errors: validation.errors };
    warnings = validation.warnings;
  }
  if (
    action === "devolver" &&
    comment.trim() === "" &&
    !Object.values(indicatorComments).some((value) => value.trim() !== "")
  ) {
    return { ok: false, errors: ["Debe registrar un comentario para devolver el reporte."] };
  }
  if (action === "reabrir" && comment.trim() === "") {
    return { ok: false, errors: ["Debe registrar un comentario para reabrir el reporte."] };
  }

  const toStatus: IndicatorReport["status"] =
    action === "enviar"
      ? "enviado"
      : action === "tomar_revision"
        ? "en_revision"
        : action === "devolver"
          ? "devuelto"
          : action === "aprobar"
            ? "aprobado"
            : "reabierto";
  const isResubmission = action === "enviar" && report.submittedVersion !== null;
  const nextVersion = isResubmission ? report.version + 1 : report.version;
  const nextReport: IndicatorReport = {
    ...report,
    status: toStatus,
    version: nextVersion,
    submittedBy: action === "enviar" ? actor.id : report.submittedBy,
    submittedVersion: action === "enviar" ? nextVersion : report.submittedVersion,
    updatedAt: now,
    values: report.values.map((value) => ({ ...value })),
  };
  // Cada envío es una versión: la instantánea queda identificada de forma única por reporte y versión.
  const shouldSnapshot = action === "enviar";
  const snapshot: ReportVersionSnapshot | null = shouldSnapshot
    ? {
        reportId: report.id,
        version: nextVersion,
        values: report.values.map((value) => ({ ...value })),
        savedBy: actor.id,
        savedAt: now,
      }
    : null;
  const event: ReviewEvent = {
    id: eventId,
    reportId: report.id,
    action,
    fromStatus: report.status,
    toStatus,
    actorId: actor.id,
    actorRole,
    comment,
    indicatorComments: { ...indicatorComments },
    at: now,
  };
  return { ok: true, report: nextReport, event, snapshot, warnings };
}

export function currentTurn(status: IndicatorReport["status"]): Role | null {
  if (hasStatus(status, EDITABLE_STATUSES)) return "responsable";
  if (status === "enviado") return "revisor";
  if (status === "en_revision") return "aprobador";
  return null;
}

export function diffVersions(
  a: ReportVersionSnapshot,
  b: ReportVersionSnapshot,
): { indicatorId: string; before: number | null; after: number | null }[] {
  const before = new Map(a.values.map((value) => [value.indicatorId, value.value]));
  const after = new Map(b.values.map((value) => [value.indicatorId, value.value]));
  const ids = [...new Set([...before.keys(), ...after.keys()])];
  return ids
    .filter((id) => (before.get(id) ?? null) !== (after.get(id) ?? null))
    .map((indicatorId) => ({
      indicatorId,
      before: before.get(indicatorId) ?? null,
      after: after.get(indicatorId) ?? null,
    }));
}

export function reportProgress(
  report: IndicatorReport,
  indicators: Indicator[],
): { indicatorId: string; progress: number | null; withinRange: boolean | null }[] {
  const values = new Map(report.values.map((value) => [value.indicatorId, value.value]));
  return indicators.map((indicator) => {
    const current = values.get(indicator.id) ?? null;
    return {
      indicatorId: indicator.id,
      progress: progressToward(
        indicator.orientation,
        indicator.target.baselineValue,
        indicator.target.value,
        current,
      ),
      withinRange: withinTarget(
        indicator.target.lowerBound,
        indicator.target.upperBound,
        current,
      ),
    };
  });
}
