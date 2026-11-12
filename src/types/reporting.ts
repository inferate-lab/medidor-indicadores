/** Modelo puro para el reporte periódico y su trazabilidad de revisión. */
export interface ReportingPeriod {
  id: string;
  kind: "mensual" | "trimestral" | "semestral" | "anual";
  start: string;
  end: string;
  dueDate: string;
  open: boolean;
}

export type ReportStatus =
  | "borrador"
  | "enviado"
  | "en_revision"
  | "devuelto"
  | "aprobado"
  | "reabierto";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  en_revision: "En revisión",
  devuelto: "Devuelto",
  aprobado: "Aprobado",
  reabierto: "Reabierto",
};

export type Role =
  | "admin"
  | "coordinador"
  | "responsable"
  | "revisor"
  | "aprobador"
  | "lector";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  responsable: "Responsable",
  revisor: "Revisor",
  aprobador: "Aprobador",
  lector: "Lector",
};

export interface ReportingUser {
  id: string;
  name: string;
  roles: Role[];
  projectIds: string[];
}

export interface IndicatorValue {
  indicatorId: string;
  institutionalCode: string;
  periodId: string;
  value: number | null;
  explicitZero: boolean;
  notMeasuredReason: string;
  evidenceNote: string;
  comment: string;
  enteredBy: string;
  enteredAt: string;
}

export interface IndicatorReport {
  id: string;
  projectId: string;
  periodId: string;
  status: ReportStatus;
  values: IndicatorValue[];
  version: number;
  submittedVersion: number | null;
  createdBy: string;
  submittedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReviewAction = "enviar" | "tomar_revision" | "devolver" | "aprobar" | "reabrir";

export interface ReviewEvent {
  id: string;
  reportId: string;
  action: ReviewAction;
  fromStatus: ReportStatus;
  toStatus: ReportStatus;
  actorId: string;
  actorRole: Role;
  comment: string;
  indicatorComments: Record<string, string>;
  at: string;
}

export interface ReportVersionSnapshot {
  reportId: string;
  version: number;
  values: IndicatorValue[];
  savedBy: string;
  savedAt: string;
}

export type PermissionAction =
  | "ver"
  | "editar"
  | "enviar"
  | "revisar"
  | "devolver"
  | "aprobar"
  | "reabrir";
