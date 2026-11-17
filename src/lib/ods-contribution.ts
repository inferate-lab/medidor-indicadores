/**
 * Aporte de un proyecto a cada meta ODS, calculado desde sus actividades.
 *
 * Cada actividad se asocia con la ruta cuyas palabras aparecen en su nombre,
 * tipo o alcance. La meta se ordena por lo ejecutado, no por cuántas veces se
 * menciona: un proyecto aporta más a la meta donde concentra su trabajo.
 * El resultado describe contribución medida en actividades y asistencias; no
 * mide el indicador global ni el avance de la meta en el país.
 */

import { findTarget } from "@/data/ods-catalog";
import { ODS_PATHWAYS, pathwayHits, type OdsPathway } from "@/data/ods-pathways";
import type { ActivityResult, ExecutionAnalysis, ExecutionProject } from "@/types/execution";

export type EvidenceStrength = "alta" | "media" | "baja";

export interface OdsContribution {
  pathway: OdsPathway;
  goal: number;
  goalTitle: string;
  targetText: string;
  /** Actividades del plan asociadas con la meta. */
  activities: { name: string; row: number; executed: number; participants: number | null; matched: string[] }[];
  executed: number;
  planned: number;
  participants: number | null;
  /** Proporción de todo lo ejecutado del proyecto que corresponde a esta meta. */
  shareOfExecution: number | null;
  strength: EvidenceStrength;
  declared: boolean;
  /** Explicación en lenguaje claro, con cifras. */
  summary: string;
}

function count(value: number): string {
  return value.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

/** Rutas que encajan con un texto libre (para proyectos sin Excel de ejecución). */
export function pathwaysForText(text: string): { pathway: OdsPathway; hits: string[] }[] {
  return ODS_PATHWAYS.map((pathway) => ({ pathway, hits: pathwayHits(pathway, text) }))
    .filter((item) => item.hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length);
}

export function odsContributions(
  project: ExecutionProject,
  analysis: ExecutionAnalysis,
): OdsContribution[] {
  const counted = analysis.activities.filter((result) => result.signal !== "suprimida");
  const totalExecuted = counted.reduce((total, result) => total + result.executed, 0);
  const declared = new Set(project.declaredGoals);
  const projectText = `${project.name} ${project.purpose}`;

  const contributions: OdsContribution[] = [];
  for (const pathway of ODS_PATHWAYS) {
    const target = findTarget(pathway.targetCode);
    if (!target) continue;
    const matched: { result: ActivityResult; hits: string[] }[] = [];
    for (const result of counted) {
      const { activity } = result;
      const hits = pathwayHits(pathway, `${activity.name} ${activity.type} ${activity.scope}`);
      if (hits.length) matched.push({ result, hits });
    }
    const projectHits = pathwayHits(pathway, projectText);
    if (matched.length === 0 && projectHits.length === 0) continue;

    const executed = matched.reduce((total, item) => total + item.result.executed, 0);
    const planned = matched.reduce((total, item) => total + item.result.plannedToDate, 0);
    const withPeople = matched.filter((item) => item.result.participantsActual !== null);
    const participants = withPeople.length
      ? withPeople.reduce((total, item) => total + (item.result.participantsActual ?? 0), 0)
      : null;
    const shareOfExecution = totalExecuted > 0 ? executed / totalExecuted : null;
    const executedActivities = matched.filter((item) => item.result.executed > 0).length;
    const strength: EvidenceStrength =
      executedActivities >= 2 && (shareOfExecution ?? 0) >= 0.15
        ? "alta"
        : executedActivities >= 1
          ? "media"
          : "baja";

    const summary =
      matched.length === 0
        ? `El objeto del proyecto menciona ${projectHits.slice(0, 3).join(", ")}, pero ninguna actividad del plan se asocia con esta meta. Es una relación declarada, no observada en la ejecución.`
        : `${matched.length} actividad(es) del plan se asocian con esta meta. Llevan ${count(executed)} de ${count(planned)} realizadas a ${analysis.cutoffLabel}` +
          (shareOfExecution !== null ? ` (${Math.round(shareOfExecution * 100)}% de lo ejecutado en el proyecto)` : "") +
          (participants !== null ? ` y ${count(participants)} asistencias.` : ".") +
          ` Se asocian por: ${[...new Set(matched.flatMap((item) => item.hits))].slice(0, 4).join(", ")}.`;

    contributions.push({
      pathway,
      goal: target.goal,
      goalTitle: target.goalTitle,
      targetText: target.text,
      activities: matched.map((item) => ({
        name: item.result.activity.name,
        row: item.result.activity.row,
        executed: item.result.executed,
        participants: item.result.participantsActual,
        matched: item.hits,
      })),
      executed,
      planned,
      participants,
      shareOfExecution,
      strength,
      declared: declared.has(target.goal),
      summary,
    });
  }

  const order: Record<EvidenceStrength, number> = { alta: 0, media: 1, baja: 2 };
  return contributions.sort(
    (a, b) =>
      order[a.strength] - order[b.strength] ||
      b.executed - a.executed ||
      Number(b.declared) - Number(a.declared),
  );
}
