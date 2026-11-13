import { ODS_GOALS, findTarget } from "@/data/ods-catalog";
import { analyzeProject } from "@/lib/analyze-project";
import { adoptIndicator, assessMeasurement, latestObservations } from "@/lib/project-tracking";
import {
  emptyCooperation,
  learningEntrySchema,
  type LearningEntry,
  type TrackedProject,
} from "@/types/project-tracking";
import type { ProjectInput, SessionAnalysis } from "@/types/medidor";

export function createMelProject(name: string, description: string): TrackedProject {
  if (!name.trim()) throw new Error("Escribe el nombre del proyecto.");
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description.trim(),
    sheet: "Creación propia",
    indicators: [],
    observations: [],
    cooperation: emptyCooperation(),
    declaredGoals: [],
    learning: [],
  };
}
export function trackDesignedProject(
  input: ProjectInput,
  analysis: SessionAnalysis,
): TrackedProject {
  const project = createMelProject(input.name, input.text);
  return {
    ...project,
    indicators: analysis.indicators.map(adoptIndicator),
    cooperation: {
      ...project.cooperation,
      population: input.targetPopulation,
      territory: input.territory,
      causalHypothesis: analysis.causal.preliminaryTheoryOfChange,
    },
  };
}
export async function suggestForMelProject(project: TrackedProject) {
  return analyzeProject({
    data: {
      name: project.name,
      text: project.description,
      sector: "",
      territory: project.cooperation.territory,
      targetPopulation: project.cooperation.population,
      budget: "",
      duration: "",
      sourceFileNames: [],
    },
  });
}
export function odsMeasurementRows(project: TrackedProject, period = "") {
  const codes = [...new Set(project.indicators.flatMap((indicator) => indicator.ods))];
  return codes.flatMap((code) => {
    const target = findTarget(code);
    if (!target) return [];
    return [
      {
        target,
        indicators: project.indicators
          .filter((i) => i.ods.includes(code))
          .map((indicator) => {
            const history = latestObservations(project, indicator.id);
            const observation = period ? history.find((o) => o.period === period) : history.at(-1);
            return {
              indicator,
              observation,
              assessment: assessMeasurement(indicator, observation),
            };
          }),
      },
    ];
  });
}
export function declaredGoalsWithoutMeasurement(project: TrackedProject) {
  const linked = new Set(odsMeasurementRows(project).map((r) => r.target.goal));
  return project.declaredGoals
    .filter((g) => !linked.has(g))
    .map((number) => ODS_GOALS.find((g) => g.number === number)!)
    .filter(Boolean);
}
export function saveLearning(
  project: TrackedProject,
  input: Omit<LearningEntry, "id" | "recordedAt" | "status" | "review" | "observationRevision">,
): TrackedProject {
  if (
    !project.observations.some(
      (o) => o.indicatorId === input.indicatorId && o.period === input.period,
    )
  )
    throw new Error(
      "Registra primero la medición o el motivo de ausencia en ese indicador y periodo.",
    );
  const entry = learningEntrySchema.parse({
    ...input,
    observationRevision: latestObservations(project, input.indicatorId).find(
      (o) => o.period === input.period,
    )!.revision,
    id: crypto.randomUUID(),
    recordedAt: new Date().toISOString(),
    status: "abierta",
    review: "",
  });
  return { ...project, learning: [...project.learning, entry] };
}
export function closeLearning(project: TrackedProject, id: string, review: string): TrackedProject {
  const entry = project.learning.find((e) => e.id === id);
  if (!entry) throw new Error("No se encontró la acción.");
  const closed = learningEntrySchema.parse({ ...entry, status: "cerrada", review });
  return { ...project, learning: project.learning.map((e) => (e.id === id ? closed : e)) };
}
