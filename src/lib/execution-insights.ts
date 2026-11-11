/**
 * Lectura MEL de un proyecto en ejecución: indicadores que ya se miden, los
 * que faltan, ODS a los que aporta y un borrador de teoría de cambio y marco
 * lógico.
 *
 * Todo lo que no sale de una cifra del Excel se marca como sugerencia o como
 * hipótesis por comprobar. El sistema redacta los supuestos para ahorrar
 * trabajo, pero no los presenta como evidencia.
 */

import { bidReferencesForSectors, type BidCountryCategory } from "@/data/bid-catalog";
import { detectConcepts, type ConceptReference } from "@/data/concept-catalog";
import { ODS_GOALS, findTarget } from "@/data/ods-catalog";
import { THEME_RULES } from "@/data/theme-ods-map";
import { analyzeProject } from "@/lib/analyze-project";
import type { ExecutionAnalysis, ExecutionProject } from "@/types/execution";
import type { BidReference, CausalLevel, CausalLinkKey, DetectedSector } from "@/types/medidor";

export interface MeasuredIndicator {
  name: string;
  value: string;
  detail: string;
  level: CausalLevel;
}

export interface SuggestedIndicator {
  name: string;
  level: CausalLevel;
  why: string;
  howToMeasure: string;
  kind: "desagregacion" | "resultado" | "impacto";
}

export interface GoalContribution {
  goal: number;
  goalTitle: string;
  targetCode: string | null;
  targetText: string | null;
  source: "declarado" | "sugerido" | "declarado_y_sugerido";
  rationale: string;
}

export interface DraftAssumption {
  link: CausalLinkKey;
  text: string;
  /** "con_datos": el Excel permite contrastarlo. "hipotesis": no hay medición todavía. */
  basis: "con_datos" | "hipotesis";
}

export interface LogframeRow {
  level: string;
  statement: string;
  indicators: string[];
  status: "medido" | "falta_medir";
}

export interface ProjectInsights {
  sectors: DetectedSector[];
  measured: MeasuredIndicator[];
  missing: SuggestedIndicator[];
  goals: GoalContribution[];
  /** Qué del aporte a los ODS se puede contar hoy con el Excel. */
  goalMeasure: string;
  concepts: ConceptReference[];
  /** Referencias del catálogo del BID: marco de impacto y categorías de indicadores de país. */
  bid: { framework: BidReference[]; countryCategories: BidCountryCategory[] };
  theory: {
    activities: string[];
    outputs: string[];
    outcomes: string[];
    impact: string;
    assumptions: DraftAssumption[];
  };
  logframe: LogframeRow[];
}

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function percent(value: number | null): string {
  return value === null ? "sin dato" : `${Math.round(value * 100)}%`;
}

function count(value: number): string {
  return value.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

function projectText(project: ExecutionProject): string {
  const parts = [
    project.name,
    project.purpose,
    project.objective,
    ...project.scopes.map((scope) => scope.name),
    ...project.activities.map((activity) => `${activity.name} ${activity.type}`),
  ];
  return parts.filter(Boolean).join(". ");
}

export async function buildInsights(
  project: ExecutionProject,
  analysis: ExecutionAnalysis,
): Promise<ProjectInsights> {
  const text = projectText(project).padEnd(90, " .");
  const base = await analyzeProject({
    data: {
      name: project.name,
      sector: "",
      territory: "",
      duration: "",
      targetPopulation: "Participantes del proyecto",
      budget: "",
      text,
      sourceFileNames: [],
    },
  });

  const unit = analysis.fractionalUnits ? "unidades de avance" : "actividades";
  const measured: MeasuredIndicator[] = [
    {
      name: `Número de ${unit} realizadas`,
      value: `${count(analysis.executedToDate)} de ${count(analysis.plannedToDate)} planeadas a ${analysis.cutoffLabel}`,
      detail: `Meta del año: ${count(analysis.plannedYear)}.`,
      level: "gestion",
    },
    {
      name: "Cumplimiento del plan de actividades",
      value: percent(analysis.compliance),
      detail: `Avance frente a la meta del año: ${percent(analysis.yearProgress)}.`,
      level: "gestion",
    },
  ];
  if (analysis.participantsActualToDate !== null) {
    measured.push({
      name: "Número de participantes alcanzados",
      value:
        analysis.participantsPlannedToDate !== null
          ? `${count(analysis.participantsActualToDate)} de ${count(analysis.participantsPlannedToDate)} esperados`
          : count(analysis.participantsActualToDate),
      detail:
        analysis.participantRatio !== null
          ? `Asistencia frente a lo proyectado: ${percent(analysis.participantRatio)}. Es la suma de asistencias: una misma persona puede contarse en varias actividades.`
          : "Es la suma de asistencias: una misma persona puede contarse en varias actividades.",
      level: "producto",
    });
  }

  const missing: SuggestedIndicator[] = [];
  if (analysis.participantsActualToDate !== null && project.disaggregations.length === 0) {
    missing.push({
      name: "Participación de mujeres y niñas",
      level: "producto",
      kind: "desagregacion",
      why: "El Excel solo trae el total de participantes. Sin separar por sexo no se puede mostrar el aporte a la igualdad de género.",
      howToMeasure: "Registrar en las listas de asistencia cuántas participantes son mujeres y niñas, y agregar esa columna al Excel. Mientras no exista el dato, no se mide.",
    });
  }
  if (analysis.participantsActualToDate !== null) {
    missing.push({
      name: "Personas únicas atendidas",
      level: "producto",
      kind: "desagregacion",
      why: "La cifra actual suma asistencias. Para decir cuántas personas distintas llegaron hace falta no contarlas dos veces.",
      howToMeasure: "Usar un identificador por persona en las listas de asistencia y contar cada una una sola vez.",
    });
  }
  const outcomeCandidates = base.indicators.filter(
    (indicator) => indicator.level === "resultado" || indicator.level === "impacto",
  );
  for (const indicator of outcomeCandidates.slice(0, 4)) {
    missing.push({
      name: indicator.name,
      level: indicator.level,
      kind: indicator.level === "impacto" ? "impacto" : "resultado",
      why:
        indicator.level === "impacto"
          ? "El Excel no mide el cambio de largo plazo. Sin esto no se puede decir que el proyecto tuvo impacto."
          : "El Excel cuenta lo que se hizo, no lo que cambió en las personas. Este indicador muestra si la actividad sirvió.",
      howToMeasure: `${indicator.instrument}. ${indicator.frequency}.`,
    });
  }

  // ODS: se parte de los que la organización ya declara y se propone la meta específica.
  // La meta se propone por el tema de las actividades, pesando cada una por lo que se ha ejecutado.
  const scored = THEME_RULES.map((rule) => {
    let weight = 0;
    const matched = new Set<string>();
    const hit = (value: string) => rule.keywords.filter((keyword) => plain(value).includes(keyword));
    for (const keyword of hit(`${project.name} ${project.purpose}`)) {
      matched.add(keyword);
      weight += 2;
    }
    for (const result of analysis.activities) {
      const found = hit(`${result.activity.scope} ${result.activity.name} ${result.activity.type}`);
      if (found.length === 0) continue;
      found.forEach((keyword) => matched.add(keyword));
      weight += 1 + (result.executed > 0 ? 1 : 0);
    }
    return { rule, weight, matched: [...matched] };
  })
    .filter((item) => item.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  const declared = new Set(project.declaredGoals);
  const goals: GoalContribution[] = [];
  const usedGoals = new Set<number>();
  const ordered = [
    ...scored.filter((item) => declared.has(findTarget(item.rule.targetCode)?.goal ?? -1)),
    ...scored.filter((item) => !declared.has(findTarget(item.rule.targetCode)?.goal ?? -1)),
  ];
  for (const item of ordered) {
    const target = findTarget(item.rule.targetCode);
    if (!target || usedGoals.has(target.goal) || goals.length >= 3) continue;
    usedGoals.add(target.goal);
    goals.push({
      goal: target.goal,
      goalTitle: target.goalTitle,
      targetCode: target.code,
      targetText: target.text,
      source: declared.has(target.goal) ? "declarado_y_sugerido" : "sugerido",
      rationale: `Tema: ${item.rule.theme}. Se propone porque las actividades mencionan: ${item.matched.slice(0, 4).join(", ")}. Debe confirmarlo el equipo.`,
    });
  }
  for (const goal of project.declaredGoals) {
    if (usedGoals.has(goal)) continue;
    const info = ODS_GOALS.find((item) => item.number === goal);
    goals.push({
      goal,
      goalTitle: info?.title ?? `ODS ${goal}`,
      targetCode: null,
      targetText: null,
      source: "declarado",
      rationale: "La organización lo declara para este proyecto, pero las actividades leídas no permiten proponer una meta específica.",
    });
  }
  const goalMeasure =
    analysis.participantsActualToDate !== null
      ? `Hoy se puede contar el aporte en ${count(analysis.executedToDate)} ${unit} realizadas y ${count(analysis.participantsActualToDate)} asistencias. Eso muestra contribución, no el avance de la meta ODS: para eso hace falta medir el cambio en las personas.`
      : `Hoy se puede contar el aporte en ${count(analysis.executedToDate)} ${unit} realizadas. Eso muestra contribución, no el avance de la meta ODS.`;

  const scopeNames = project.scopes.map((scope) => scope.name).filter(Boolean);
  const activities = scopeNames.length ? scopeNames : [...new Set(project.activities.map((activity) => activity.scope))];
  const outputs = activities.slice(0, 8).map((scope) => {
    const own = analysis.activities.filter((result) => result.activity.scope === scope && result.signal !== "suprimida");
    const done = own.reduce((total, result) => total + result.executed, 0);
    const planned = own.reduce((total, result) => total + result.plannedToDate, 0);
    const people = own.reduce((total, result) => total + (result.participantsActual ?? 0), 0);
    return `${scope}: ${count(done)} de ${count(planned)} realizadas${people > 0 ? `, ${count(people)} asistencias` : ""}.`;
  });
  const outcomes = outcomeCandidates
    .filter((indicator) => indicator.level === "resultado")
    .slice(0, 3)
    .map((indicator) => indicator.observedChange);
  const impact =
    project.objective ||
    project.purpose ||
    "El Excel no describe el cambio de largo plazo que busca el proyecto.";

  const assumptions: DraftAssumption[] = [
    {
      link: "actividad_producto",
      basis: "con_datos",
      text:
        analysis.participantRatio !== null
          ? `Supuesto: si se realizan las actividades planeadas, la gente convocada asiste. Hasta ${analysis.cutoffLabel} se ha hecho el ${percent(analysis.compliance)} de lo planeado y ha asistido el ${percent(analysis.participantRatio)} de las personas esperadas: ${analysis.participantRatio >= 0.9 ? "por ahora el dato lo respalda" : "por ahora el dato no lo respalda del todo"}.`
          : `Si se cuenta con el equipo y la logística, las actividades planeadas se realizan. Hasta ${analysis.cutoffLabel} se ha hecho el ${percent(analysis.compliance)} de lo planeado.`,
    },
    {
      link: "producto_resultado",
      basis: "hipotesis",
      text: outcomes[0]
        ? `Si las personas participan en las actividades, entonces: ${outcomes[0].replace(/\.$/, "")}. El Excel no trae ninguna medición de ese cambio: es una hipótesis por comprobar.`
        : "Si las personas participan en las actividades, cambian sus conocimientos o prácticas. El Excel no trae ninguna medición de ese cambio: es una hipótesis por comprobar.",
    },
    {
      link: "resultado_impacto",
      basis: "hipotesis",
      text: `Si esos cambios se mantienen en el tiempo y otros actores hacen su parte, el proyecto aporta a: ${impact.replace(/\.$/, "").slice(0, 220)}. No es medible con la información actual.`,
    },
  ];

  const measuredNames = measured.map((indicator) => indicator.name);
  const logframe: LogframeRow[] = [
    {
      level: "Impacto",
      statement: impact,
      indicators: missing.filter((item) => item.kind === "impacto").map((item) => item.name),
      status: "falta_medir",
    },
    {
      level: "Resultados",
      statement: outcomes.join(" ") || "Cambios esperados en las personas, por definir con el equipo.",
      indicators: missing.filter((item) => item.kind === "resultado").map((item) => item.name),
      status: "falta_medir",
    },
    {
      level: "Productos",
      statement: outputs.join(" "),
      indicators: measuredNames.filter((name) => name.includes("participantes")),
      status: analysis.participantsActualToDate !== null ? "medido" : "falta_medir",
    },
    {
      level: "Actividades",
      statement: activities.join("; "),
      indicators: measuredNames.filter((name) => !name.includes("participantes")),
      status: "medido",
    },
  ];

  return {
    sectors: base.detectedSectors,
    measured,
    missing,
    goals,
    goalMeasure,
    concepts: detectConcepts(text),
    bid: bidReferencesForSectors(base.detectedSectors.map((sector) => sector.key)),
    theory: { activities, outputs, outcomes, impact, assumptions },
    logframe,
  };
}
