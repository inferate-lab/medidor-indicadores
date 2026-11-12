/** Modelo del Excel de ejecución: proyectos, actividades y su avance mensual. Los vacíos son null, nunca cero. */

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export interface MonthlyPair {
  planned: number | null;
  actual: number | null;
}

export type ActivityNote = "suprimida" | "adicionada" | "nueva" | null;

export interface ExecutionActivity {
  id: string;
  /** Fila del Excel, para poder volver al dato original. */
  row: number;
  code: string;
  name: string;
  type: string;
  scope: string;
  months: MonthlyPair[];
  participantsPlanned: (number | null)[];
  participantsActual: (number | null)[];
  unitCost: number | null;
  note: ActivityNote;
}

export interface ExecutionProject {
  id: string;
  sheet: string;
  name: string;
  /** Objetivo estratégico al que se asocia el plan de acción. */
  objective: string;
  /** Objeto del proyecto según la hoja consolidada. */
  purpose: string;
  status: string;
  /** ODS que la organización ya declara para el proyecto. */
  declaredGoals: number[];
  scopes: { code: string; name: string }[];
  activities: ExecutionActivity[];
  /** La hoja trae la sección de participantes (beneficiarios). */
  hasParticipantData: boolean;
  /** Columnas de desagregación encontradas (por ejemplo, mujeres). Vacío si solo hay totales. */
  disaggregations: string[];
  warnings: string[];
}

export interface ExecutionWorkbook {
  projects: ExecutionProject[];
  skippedSheets: string[];
  warnings: string[];
}

export type LearningSignal =
  | "escalar"
  | "en_linea"
  | "pocos_datos"
  | "ajustar"
  | "sin_ejecutar"
  | "sin_meta"
  | "programada_despues"
  | "sin_actividad"
  | "suprimida";

export const SIGNAL_LABELS: Record<LearningSignal, string> = {
  escalar: "Mejor desempeño",
  en_linea: "Va según lo planeado",
  pocos_datos: "Muy pocos datos para concluir",
  ajustar: "Para revisar",
  sin_ejecutar: "Sin ejecución registrada",
  sin_meta: "Se hizo sin estar planeada",
  programada_despues: "Programada para más adelante",
  sin_actividad: "Sin programación este año",
  suprimida: "Suprimida",
};

export interface ActivityResult {
  activity: ExecutionActivity;
  plannedYear: number;
  plannedToDate: number;
  executed: number;
  /** Ejecutado frente a lo planeado hasta el mes de corte. Null si no había nada planeado. */
  compliance: number | null;
  participantsPlanned: number | null;
  participantsActual: number | null;
  participantRatio: number | null;
  participantsPerSession: number | null;
  costPerParticipant: number | null;
  signal: LearningSignal;
  /** Explicación con las cifras que sostienen la señal. */
  evidence: string;
  /** Advertencias que impiden leer la señal con confianza. */
  cautions: string[];
}

export interface MonthResult {
  month: string;
  planned: number;
  executed: number;
  compliance: number | null;
  cumulativePlanned: number;
  cumulativeExecuted: number;
}

export interface ExecutionAnalysis {
  /** Índice (0-11) del último mes con ejecución registrada. Null si no hay ninguna. */
  cutoff: number | null;
  cutoffLabel: string;
  plannedYear: number;
  plannedToDate: number;
  executedToDate: number;
  compliance: number | null;
  yearProgress: number | null;
  monthly: MonthResult[];
  participantsPlannedToDate: number | null;
  participantsActualToDate: number | null;
  participantRatio: number | null;
  activities: ActivityResult[];
  counts: Record<LearningSignal, number>;
  /** Las cantidades parecen porcentajes de avance y no conteos de actividades. */
  fractionalUnits: boolean;
}
