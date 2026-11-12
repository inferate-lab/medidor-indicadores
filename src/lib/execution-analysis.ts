/**
 * Análisis de ejecución de un proyecto: cuánto se hizo frente a lo planeado,
 * mes a mes y frente al año, y qué actividades conviene revisar o ampliar.
 *
 * Las señales son evidencia para decidir, no veredictos: cada una muestra sus
 * cifras y no se emite cuando los números son demasiado pequeños para leerlos.
 * Contar actividades y asistentes mide ejecución y alcance, no resultados.
 */

import {
  MONTHS,
  type ActivityResult,
  type ExecutionAnalysis,
  type ExecutionProject,
  type LearningSignal,
  type MonthResult,
} from "@/types/execution";

export interface AnalysisThresholds {
  /** Por debajo de esta proporción de lo planeado, la ejecución se marca para revisar. */
  reviewExecutionBelow: number;
  /** Por debajo de esta proporción de las personas esperadas, la asistencia se marca para revisar. */
  reviewAttendanceBelow: number;
  /** Mínimo de actividades planeadas a la fecha para juzgar el cumplimiento. */
  minPlanned: number;
  /** Mínimo de participantes proyectados para juzgar la asistencia. */
  minParticipants: number;
  /** Mínimo de meses con meta ya transcurridos para hablar de buen desempeño: un solo mes bueno no basta. */
  minPeriods: number;
}

export const DEFAULT_THRESHOLDS: AnalysisThresholds = {
  reviewExecutionBelow: 0.7,
  reviewAttendanceBelow: 0.7,
  minPlanned: 3,
  minParticipants: 30,
  minPeriods: 2,
};

function sum(values: (number | null)[], until: number): number {
  let total = 0;
  for (let i = 0; i <= until && i < values.length; i += 1) total += values[i] ?? 0;
  return total;
}

function hasAny(values: (number | null)[]): boolean {
  return values.some((value) => value !== null);
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function count(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("es-CO") : value.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

export function analyzeExecution(
  project: ExecutionProject,
  thresholds: AnalysisThresholds = DEFAULT_THRESHOLDS,
): ExecutionAnalysis {
  const live = project.activities.filter((activity) => activity.note !== "suprimida");

  // Mes de corte: el último con algún resultado mayor que cero en cualquier actividad.
  let cutoff: number | null = null;
  for (const activity of live) {
    activity.months.forEach((pair, index) => {
      if ((pair.actual ?? 0) > 0 && (cutoff === null || index > cutoff)) cutoff = index;
    });
  }
  const until = cutoff ?? -1;
  const cutoffName: string = cutoff === null ? "la fecha" : (MONTHS[cutoff] ?? "la fecha");

  const monthly: MonthResult[] = [];
  let cumulativePlanned = 0;
  let cumulativeExecuted = 0;
  MONTHS.forEach((month, index) => {
    const planned = live.reduce((total, activity) => total + (activity.months[index]?.planned ?? 0), 0);
    const executed = live.reduce((total, activity) => total + (activity.months[index]?.actual ?? 0), 0);
    cumulativePlanned += planned;
    cumulativeExecuted += executed;
    monthly.push({
      month,
      planned,
      executed,
      compliance: planned > 0 ? executed / planned : null,
      cumulativePlanned,
      cumulativeExecuted,
    });
  });

  const fractionalUnits = live.some((activity) =>
    activity.months.some((pair) => [pair.planned, pair.actual].some((value) => value !== null && value > 0 && value < 1)),
  );

  const activities: ActivityResult[] = project.activities.map((activity) => {
    const plannedAll = activity.months.map((pair) => pair.planned);
    const actualAll = activity.months.map((pair) => pair.actual);
    const plannedYear = sum(plannedAll, 11);
    const plannedToDate = sum(plannedAll, until);
    const executed = sum(actualAll, until);
    const compliance = plannedToDate > 0 ? executed / plannedToDate : null;

    const withPlanned = project.hasParticipantData && hasAny(activity.participantsPlanned);
    const withActual = project.hasParticipantData && hasAny(activity.participantsActual);
    const participantsPlanned = withPlanned ? sum(activity.participantsPlanned, until) : null;
    const participantsActual = withActual ? sum(activity.participantsActual, until) : null;
    const participantRatio =
      participantsPlanned !== null && participantsActual !== null && participantsPlanned > 0
        ? participantsActual / participantsPlanned
        : null;
    const participantsPerSession =
      participantsActual !== null && executed > 0 && !fractionalUnits ? participantsActual / executed : null;
    const costPerParticipant =
      activity.unitCost !== null && participantsActual !== null && participantsActual > 0 && executed > 0
        ? (activity.unitCost * executed) / participantsActual
        : null;

    const cautions: string[] = [];
    const enoughPlanned = plannedToDate >= thresholds.minPlanned;
    const enoughParticipants = (participantsPlanned ?? 0) >= thresholds.minParticipants;
    let signal: LearningSignal;
    let evidence: string;

    if (activity.note === "suprimida") {
      signal = "suprimida";
      evidence = "El plan la marca como suprimida; no entra en los cálculos.";
    } else if (plannedYear === 0 && executed === 0) {
      signal = "sin_actividad";
      // Un vacío no es un cero: se dice cuál de los dos trae el Excel.
      evidence = hasAny(plannedAll) || hasAny(actualAll)
        ? "Tiene metas y resultados en cero durante el año."
        : "Las celdas de meta y resultado están vacías: no hay dato, que no es lo mismo que cero.";
    } else if (plannedToDate === 0 && executed === 0) {
      signal = "programada_despues";
      evidence = `Tiene ${count(plannedYear)} programadas para meses posteriores a ${cutoffName}.`;
    } else if (plannedToDate === 0 && executed > 0) {
      signal = "sin_meta";
      evidence = hasAny(plannedAll.slice(0, until + 1))
        ? `Se registran ${count(executed)} realizadas con meta en cero a ${cutoffName}. Conviene confirmar si fue una adición al plan.`
        : `Se registran ${count(executed)} realizadas y la meta está vacía. Falta registrar la meta para poder compararla.`;
    } else if (executed === 0) {
      signal = "sin_ejecutar";
      evidence = hasAny(actualAll.slice(0, until + 1))
        ? `Había ${count(plannedToDate)} planeadas a ${cutoffName} y el resultado registrado es cero.`
        : `Había ${count(plannedToDate)} planeadas a ${cutoffName} y las celdas de resultado están vacías: puede que no se haya hecho o que falte reportarla.`;
    } else {
      const base = `Se hicieron ${count(executed)} de ${count(plannedToDate)} planeadas a ${cutoffName} (${percent(compliance ?? 0)}).`;
      const attendance =
        participantRatio !== null
          ? ` Asistieron ${count(participantsActual ?? 0)} de ${count(participantsPlanned ?? 0)} personas esperadas (${percent(participantRatio)}).`
          : "";
      const lowExecution = enoughPlanned && (compliance ?? 1) < thresholds.reviewExecutionBelow;
      const lowAttendance =
        enoughParticipants && participantRatio !== null && participantRatio < thresholds.reviewAttendanceBelow;
      const noAttendanceRecorded = lowAttendance && !lowExecution && (participantsActual ?? 0) === 0;
      const periods = plannedAll.slice(0, until + 1).filter((value) => (value ?? 0) > 0).length;
      const strong =
        (compliance ?? 0) >= 1 &&
        enoughPlanned &&
        periods >= thresholds.minPeriods &&
        (participantRatio === null ? !project.hasParticipantData : participantRatio >= 1 && enoughParticipants);
      if (lowExecution || lowAttendance) {
        signal = "ajustar";
        evidence =
          base +
          attendance +
          (noAttendanceRecorded
            ? " Las actividades se registran como hechas, pero no hay ninguna asistencia anotada: o no asistió nadie, o no se registró, o la actividad no convoca público. Confirmar antes de decidir."
            : lowAttendance && !lowExecution
              ? " Las sesiones se hicieron pero llegó menos gente de la esperada: revisar convocatoria, horario, lugar o pertinencia antes de repetirla igual."
              : " Va por debajo de lo planeado: revisar si la meta era realista o qué impidió ejecutar.");
      } else if (strong) {
        signal = "escalar";
        evidence =
          base +
          attendance +
          " Cumple o supera lo planeado en ejecución y asistencia durante varios meses. Es de las que mejor operan; para decidir ampliarla falta confirmar que produce el cambio esperado.";
      } else if (!enoughPlanned) {
        // Con una o dos actividades no se afirma que va bien ni mal.
        signal = "pocos_datos";
        evidence = base + attendance + " Son muy pocas para sacar conclusiones.";
      } else {
        signal = "en_linea";
        evidence = base + attendance;
      }
      if (project.hasParticipantData && participantsActual === null) {
        cautions.push("No tiene registro de participantes: no se sabe cuánta gente asistió.");
      } else if (participantRatio !== null && !enoughParticipants) {
        cautions.push("Se esperaban muy pocas personas para juzgar la asistencia.");
      }
      if (signal === "escalar") {
        cautions.push("Que se haya ejecutado y haya asistido gente no prueba que haya producido un cambio; para escalar con evidencia falta medir el resultado.");
      }
    }

    return {
      activity,
      plannedYear,
      plannedToDate,
      executed,
      compliance,
      participantsPlanned,
      participantsActual,
      participantRatio,
      participantsPerSession,
      costPerParticipant,
      signal,
      evidence,
      cautions,
    };
  });

  const counts = {
    escalar: 0,
    en_linea: 0,
    pocos_datos: 0,
    ajustar: 0,
    sin_ejecutar: 0,
    sin_meta: 0,
    programada_despues: 0,
    sin_actividad: 0,
    suprimida: 0,
  } satisfies Record<LearningSignal, number>;
  for (const result of activities) counts[result.signal] += 1;

  const counted = activities.filter((result) => result.signal !== "suprimida");
  const plannedYear = counted.reduce((total, result) => total + result.plannedYear, 0);
  const plannedToDate = counted.reduce((total, result) => total + result.plannedToDate, 0);
  const executedToDate = counted.reduce((total, result) => total + result.executed, 0);
  const withParticipants = counted.filter((result) => result.participantsActual !== null);
  const participantsActualToDate = withParticipants.length
    ? withParticipants.reduce((total, result) => total + (result.participantsActual ?? 0), 0)
    : null;
  const plannedParticipants = counted.filter((result) => result.participantsPlanned !== null);
  const participantsPlannedToDate = plannedParticipants.length
    ? plannedParticipants.reduce((total, result) => total + (result.participantsPlanned ?? 0), 0)
    : null;

  // La asistencia global solo compara actividades que tienen los dos datos: esperados y reales.
  const comparable = counted.filter((result) => result.participantsPlanned !== null && result.participantsActual !== null);
  const comparablePlanned = comparable.reduce((total, result) => total + (result.participantsPlanned ?? 0), 0);
  const comparableActual = comparable.reduce((total, result) => total + (result.participantsActual ?? 0), 0);

  return {
    cutoff,
    cutoffLabel: cutoff === null ? "sin ejecución registrada" : (MONTHS[cutoff] ?? ""),
    plannedYear,
    plannedToDate,
    executedToDate,
    compliance: plannedToDate > 0 ? executedToDate / plannedToDate : null,
    yearProgress: plannedYear > 0 ? executedToDate / plannedYear : null,
    monthly,
    participantsPlannedToDate,
    participantsActualToDate,
    participantRatio: comparablePlanned > 0 ? comparableActual / comparablePlanned : null,
    activities,
    counts,
    fractionalUnits,
  };
}
