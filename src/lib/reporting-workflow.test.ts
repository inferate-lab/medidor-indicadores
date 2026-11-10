import { beforeAll, describe, expect, it } from "vitest";

import { buildDemoAnalysis } from "@/data/demo-project";
import {
  can,
  diffVersions,
  reportProgress,
  transition,
  validateForSubmission,
} from "@/lib/reporting-workflow";
import type { Indicator } from "@/types/medidor";
import type {
  IndicatorReport,
  IndicatorValue,
  ReportingPeriod,
  ReportingUser,
  ReportVersionSnapshot,
  Role,
} from "@/types/reporting";

const NOW = "2026-06-20T12:00:00.000Z";
const PERIOD: ReportingPeriod = {
  id: "2026-T2",
  kind: "trimestral",
  start: "2026-04-01T00:00:00.000Z",
  end: "2026-06-30T23:59:59.999Z",
  dueDate: "2026-07-10T23:59:59.999Z",
  open: true,
};

let demoIndicators: Indicator[];

beforeAll(async () => {
  demoIndicators = (await buildDemoAnalysis()).indicators;
});

function user(id: string, roles: Role[], projectIds = ["project-1"]): ReportingUser {
  return { id, name: id, roles, projectIds };
}

function indicator(overrides: Partial<Indicator> = {}): Indicator {
  const base = structuredClone(demoIndicators[0]!);
  return {
    ...base,
    id: overrides.id ?? base.id,
    name: overrides.name ?? base.name,
    institutionalCode: overrides.institutionalCode ?? base.institutionalCode,
    decision: "aprobado",
    ...overrides,
  };
}

function value(indicatorValue: Indicator, amount: number | null, enteredBy = "responsable-1"): IndicatorValue {
  return {
    indicatorId: indicatorValue.id,
    institutionalCode: indicatorValue.institutionalCode,
    periodId: PERIOD.id,
    value: amount,
    explicitZero: amount === 0,
    notMeasuredReason: "",
    evidenceNote: "Registro verificado",
    comment: "",
    enteredBy,
    enteredAt: NOW,
  };
}

function report(values: IndicatorValue[], overrides: Partial<IndicatorReport> = {}): IndicatorReport {
  return {
    id: "report-1",
    projectId: "project-1",
    periodId: PERIOD.id,
    status: "borrador",
    values,
    version: 1,
    submittedVersion: null,
    createdBy: "creator-1",
    submittedBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function submissionFor(indicators: Indicator[]) {
  return { indicators, period: PERIOD, previousApproved: null, otherReports: [] };
}

describe("flujo de reportes periódicos", () => {
  it("completa el camino feliz de borrador a aprobado y guarda la versión enviada", () => {
    const tracked = indicator();
    const initial = report([value(tracked, 10)]);
    const sent = transition({
      report: initial,
      action: "enviar",
      actor: user("responsable-1", ["responsable"]),
      now: NOW,
      eventId: "event-1",
      submission: submissionFor([tracked]),
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.report.status).toBe("enviado");
    expect(sent.snapshot).toMatchObject({ version: 1, savedBy: "responsable-1" });
    expect(sent.report.submittedVersion).toBe(1);

    const reviewing = transition({
      report: sent.report,
      action: "tomar_revision",
      actor: user("reviewer-1", ["revisor"]),
      now: NOW,
      eventId: "event-2",
    });
    expect(reviewing.ok).toBe(true);
    if (!reviewing.ok) return;

    const approved = transition({
      report: reviewing.report,
      action: "aprobar",
      actor: user("approver-1", ["aprobador"]),
      now: NOW,
      eventId: "event-3",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.report.status).toBe("aprobado");
    expect(approved.report.version).toBe(1);
    expect(approved.snapshot).toBeNull();
    expect(approved.event.actorRole).toBe("aprobador");
    expect(initial.status).toBe("borrador");
  });

  it("impide devolver un reporte sin comentario", () => {
    const result = transition({
      report: report([], { status: "en_revision" }),
      action: "devolver",
      actor: user("reviewer-1", ["revisor"]),
      now: NOW,
      eventId: "event-1",
    });
    expect(result).toEqual({
      ok: false,
      errors: ["Debe registrar un comentario para devolver el reporte."],
    });
  });

  it("conserva una instantánea al reenviar después de una devolución", () => {
    const tracked = indicator();
    const result = transition({
      report: report([value(tracked, 20)], { status: "devuelto", submittedBy: "responsable-1", submittedVersion: 1 }),
      action: "enviar",
      actor: user("responsable-1", ["responsable"]),
      now: NOW,
      eventId: "event-1",
      submission: submissionFor([tracked]),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot).toMatchObject({ reportId: "report-1", version: 2 });
    expect(result.report.submittedVersion).toBe(2);
    expect(result.snapshot?.values).not.toBe(result.report.values);
  });

  it("aplica segregación de funciones incluso a un administrador que ingresó valores", () => {
    const tracked = indicator();
    const admin = user("admin-1", ["admin"], []);
    const candidate = report([value(tracked, 15, "admin-1")], {
      status: "en_revision",
      createdBy: "creator-1",
      submittedBy: "responsable-1",
    });
    expect(can(admin, "aprobar", candidate)).toBe(false);
    expect(
      transition({
        report: candidate,
        action: "aprobar",
        actor: admin,
        now: NOW,
        eventId: "event-1",
      }),
    ).toMatchObject({ ok: false });
  });

  it("impide ver el reporte a una persona ajena al proyecto", () => {
    expect(can(user("reader-1", ["lector"], ["project-2"]), "ver", report([]))).toBe(false);
  });

  it("detecta otro reporte del mismo proyecto y periodo", () => {
    const tracked = indicator();
    const candidate = report([value(tracked, 10)]);
    const result = validateForSubmission({
      report: candidate,
      indicators: [tracked],
      period: PERIOD,
      previousApproved: null,
      otherReports: [report([], { id: "report-2" })],
      now: NOW,
    });
    expect(result.errors).toContain(`Ya existe otro reporte para el proyecto y el periodo ${PERIOD.id}.`);
  });

  it("exige un valor o motivo y acepta el cero explícito", () => {
    const tracked = indicator();
    const missing = value(tracked, null);
    const invalid = validateForSubmission({
      report: report([missing]),
      indicators: [tracked],
      period: PERIOD,
      previousApproved: null,
      otherReports: [],
      now: NOW,
    });
    expect(invalid.errors.some((message) => message.includes("no tiene valor ni motivo"))).toBe(true);

    const explicitZero = { ...missing, value: 0, explicitZero: true };
    const valid = validateForSubmission({
      report: report([explicitZero]),
      indicators: [tracked],
      period: PERIOD,
      previousApproved: null,
      otherReports: [],
      now: NOW,
    });
    expect(valid.errors).toEqual([]);
  });

  it("trata correctamente la mejora de un indicador descendente", () => {
    const tracked = indicator({
      id: "descending",
      name: "Personas pendientes",
      orientation: "descendente",
      accumulation: "acumulado",
      unit: "Número de personas",
      target: {
        ...structuredClone(demoIndicators[0]!.target),
        baselineValue: 120,
        value: 40,
        lowerBound: null,
        upperBound: null,
      },
    });
    const previous = report([value(tracked, 120)], { id: "previous", status: "aprobado" });
    const current = report([value(tracked, 80)]);
    const validation = validateForSubmission({
      report: current,
      indicators: [tracked],
      period: PERIOD,
      previousApproved: previous,
      otherReports: [],
      now: NOW,
    });
    expect(validation.errors).toEqual([]);
    expect(validation.warnings.some((message) => message.includes("contra de su orientación"))).toBe(false);
    expect(reportProgress(current, [tracked])).toEqual([
      { indicatorId: "descending", progress: 0.5, withinRange: null },
    ]);
  });

  it("rechaza la disminución de un indicador acumulado ascendente", () => {
    const tracked = indicator({
      id: "ascending",
      name: "Participantes acumulados",
      orientation: "ascendente",
      accumulation: "acumulado",
    });
    const result = validateForSubmission({
      report: report([value(tracked, 80)]),
      indicators: [tracked],
      period: PERIOD,
      previousApproved: report([value(tracked, 120)], { id: "previous", status: "aprobado" }),
      otherReports: [],
      now: NOW,
    });
    expect(result.errors.some((message) => message.includes("disminuyó"))).toBe(true);
  });

  it("compara valores cambiados, agregados y retirados entre versiones", () => {
    const one = indicator({ id: "one" });
    const two = indicator({ id: "two" });
    const three = indicator({ id: "three" });
    const snapshot = (version: number, values: IndicatorValue[]): ReportVersionSnapshot => ({
      reportId: "report-1",
      version,
      values,
      savedBy: "user-1",
      savedAt: NOW,
    });
    expect(
      diffVersions(
        snapshot(1, [value(one, 1), value(two, 2)]),
        snapshot(2, [value(one, 3), value(three, 4)]),
      ),
    ).toEqual([
      { indicatorId: "one", before: 1, after: 3 },
      { indicatorId: "two", before: 2, after: null },
      { indicatorId: "three", before: null, after: 4 },
    ]);
  });

  it("rechaza aprobar directamente desde borrador", () => {
    const result = transition({
      report: report([]),
      action: "aprobar",
      actor: user("approver-1", ["aprobador"]),
      now: NOW,
      eventId: "event-1",
    });
    expect(result).toEqual({
      ok: false,
      errors: ["No se puede aprobar un reporte en estado Borrador."],
    });
  });
});

describe("fecha límite", () => {
  it("no marca como tardío un envío hecho el mismo día del vencimiento", () => {
    const report = {
      id: "r", projectId: "p", periodId: "2026-T2", status: "borrador" as const, values: [],
      version: 1, submittedVersion: null, createdBy: "u", submittedBy: null,
      createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z",
    };
    const period = { id: "2026-T2", kind: "trimestral" as const, start: "2026-04-01", end: "2026-06-30", dueDate: "2026-07-15", open: true };
    const base = { report, indicators: [], period, previousApproved: null, otherReports: [] };
    expect(validateForSubmission({ ...base, now: "2026-07-15T18:30:00Z" }).warnings).toEqual([]);
    expect(validateForSubmission({ ...base, now: "2026-07-16T08:00:00Z" }).warnings).toHaveLength(1);
  });
});

describe("integridad del envío", () => {
  const send = (candidate: IndicatorReport, indicators: Indicator[]) =>
    transition({
      report: candidate,
      action: "enviar",
      actor: user("responsable-1", ["responsable"]),
      now: NOW,
      eventId: "event-1",
      submission: submissionFor(indicators),
    });

  it("valida el contenido real: no se puede enviar un reporte incompleto ni sin contexto de validación", () => {
    const tracked = indicator();
    expect(send(report([]), [tracked])).toMatchObject({ ok: false });
    expect(
      transition({
        report: report([value(tracked, 10)]),
        action: "enviar",
        actor: user("responsable-1", ["responsable"]),
        now: NOW,
        eventId: "event-1",
      }),
    ).toMatchObject({ ok: false });
  });

  it("rechaza dos valores del mismo indicador en lugar de quedarse con el último", () => {
    const tracked = indicator();
    const result = send(report([value(tracked, 20), value(tracked, 80)]), [tracked]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((message) => message.includes("más de un valor"))).toBe(true);
  });

  it("rechaza valores de otro periodo", () => {
    const tracked = indicator();
    const result = send(report([{ ...value(tracked, 10), periodId: "2026-T1" }]), [tracked]);
    expect(result).toMatchObject({ ok: false });
  });

  it("distingue cero de dato faltante en las cuatro combinaciones", () => {
    const tracked = indicator();
    const errorsFor = (amount: number | null, explicitZero: boolean) =>
      validateForSubmission({
        ...submissionFor([tracked]),
        report: report([{ ...value(tracked, amount), explicitZero, notMeasuredReason: amount === null ? "Sin medición este periodo" : "" }]),
        now: NOW,
      }).errors;
    expect(errorsFor(0, true)).toEqual([]);
    expect(errorsFor(null, false)).toEqual([]);
    expect(errorsFor(0, false)).toHaveLength(1);
    expect(errorsFor(null, true)).toHaveLength(1);
  });

  it("numera cada reenvío con una versión distinta", () => {
    const tracked = indicator();
    const first = send(report([value(tracked, 10)]), [tracked]);
    if (!first.ok) throw new Error("el primer envío debía pasar");
    const second = send({ ...first.report, status: "devuelto" }, [tracked]);
    if (!second.ok) throw new Error("el segundo envío debía pasar");
    const third = send({ ...second.report, status: "devuelto" }, [tracked]);
    if (!third.ok) throw new Error("el tercer envío debía pasar");
    expect([first.snapshot?.version, second.snapshot?.version, third.snapshot?.version]).toEqual([1, 2, 3]);
  });
});
