/**
 * Medidor ODS de un proyecto: cuánto de lo ejecutado aporta a cada meta.
 *
 * Usa el mismo vínculo actividad por actividad que muestra la ficha
 * (activityOdsMappings), de modo que el resumen y el detalle coinciden. Las
 * cifras salen del Excel de ejecución guardado en cada actividad. El medidor
 * cuenta contribución en actividades y asistencias: no es el avance de la meta
 * en el país ni un porcentaje de cumplimiento del ODS.
 */

import { activityOdsMappings } from "@/lib/automatic-ods";
import { latestObservations } from "@/lib/project-tracking";
import type { TrackedProject } from "@/types/project-tracking";

export type MeterStrength = "alta" | "media" | "baja" | "sin_cifras";

export interface OdsMeterRow {
  code: string;
  goal: number;
  goalTitle: string;
  targetText: string;
  activities: { description: string; row: number | null; executed: number | null; participants: number | null }[];
  /** Null cuando ninguna actividad vinculada trae cifras. */
  executed: number | null;
  planned: number | null;
  participants: number | null;
  shareOfExecution: number | null;
  strength: MeterStrength;
  /** Indicador local propuesto para medir el resultado. */
  indicatorName: string;
  /** Último valor registrado del indicador de resultado, si el equipo ya lo mide. */
  outcomeValue: { period: string; value: number | null } | null;
  summary: string;
}

function count(value: number): string {
  return value.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

function sumKnown(values: (number | null | undefined)[]): number | null {
  const known = values.filter((value): value is number => typeof value === "number");
  return known.length ? known.reduce((total, value) => total + value, 0) : null;
}

export function odsMeter(project: TrackedProject): OdsMeterRow[] {
  const mappings = activityOdsMappings(project);
  const totalExecuted = sumKnown(project.activitySources.map((source) => source.executed));
  const cutoff = project.executionCutoff ? ` a ${project.executionCutoff}` : "";
  const byTarget = new Map<string, { candidate: (typeof mappings)[number]["candidates"][number]; activities: (typeof mappings)[number]["activity"][] }>();
  for (const { activity, candidates } of mappings) {
    for (const candidate of candidates) {
      const entry = byTarget.get(candidate.target.code) ?? { candidate, activities: [] };
      entry.activities.push(activity);
      byTarget.set(candidate.target.code, entry);
    }
  }

  const rows: OdsMeterRow[] = [...byTarget.values()].map(({ candidate, activities }) => {
    const numbers = activities.map((activity) => ({
      executed: "executed" in activity ? (activity.executed ?? null) : null,
      planned: "planned" in activity ? (activity.planned ?? null) : null,
      participants: "participants" in activity ? (activity.participants ?? null) : null,
    }));
    const executed = sumKnown(numbers.map((item) => item.executed));
    const planned = sumKnown(numbers.map((item) => item.planned));
    const participants = sumKnown(numbers.map((item) => item.participants));
    const shareOfExecution = executed !== null && totalExecuted ? executed / totalExecuted : null;
    const executedActivities = numbers.filter((item) => (item.executed ?? 0) > 0).length;
    const strength: MeterStrength =
      executed === null
        ? "sin_cifras"
        : executedActivities >= 2 && (shareOfExecution ?? 0) >= 0.15
          ? "alta"
          : executedActivities >= 1
            ? "media"
            : "baja";

    const linked = project.indicators.find((indicator) => indicator.ods.includes(candidate.target.code) && indicator.level !== "gestion");
    const latest = linked ? latestObservations(project, linked.id).at(-1) : undefined;
    const outcomeValue = latest ? { period: latest.period, value: latest.value } : null;

    const summary =
      executed === null
        ? `${activities.length} actividad(es) se vinculan con esta meta, pero la ficha no tiene sus cifras. Vuelve a cargar el Excel de ejecución para calcular el medidor.`
        : `${activities.length} actividad(es) vinculadas: ${count(executed)} realizadas de ${count(planned ?? 0)} planeadas${cutoff}` +
          (shareOfExecution !== null ? `, el ${Math.round(shareOfExecution * 100)}% de lo ejecutado en el proyecto` : "") +
          (participants !== null ? `, con ${count(participants)} asistencias.` : ".");

    return {
      code: candidate.target.code,
      goal: candidate.target.goal,
      goalTitle: candidate.target.goalTitle,
      targetText: candidate.target.text,
      activities: activities.map((activity, index) => ({
        description: activity.description,
        row: activity.row,
        executed: numbers[index]?.executed ?? null,
        participants: numbers[index]?.participants ?? null,
      })),
      executed,
      planned,
      participants,
      shareOfExecution,
      strength,
      indicatorName: linked?.name ?? candidate.indicator.name,
      outcomeValue,
      summary,
    };
  });

  const order: Record<MeterStrength, number> = { alta: 0, media: 1, baja: 2, sin_cifras: 3 };
  return rows.sort(
    (a, b) => order[a.strength] - order[b.strength] || (b.executed ?? 0) - (a.executed ?? 0) || b.activities.length - a.activities.length,
  );
}
