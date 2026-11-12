import { findTarget } from "@/data/ods-catalog";
import { MONTHS, type ExecutionProject } from "@/types/execution";
import type { Indicator } from "@/types/medidor";
import { progressToward, withinTarget } from "@/lib/target-rules";
import {
  emptyCooperation,
  observationSchema,
  portfolioSchema,
  trackingIndicatorSchema,
  type Observation,
  type Portfolio,
  type TrackedProject,
  type TrackingIndicator,
} from "@/types/project-tracking";

export const PORTFOLIO_STORAGE_KEY = "medidor.portfolio.v1";
export function parsePortfolio(text: string): Portfolio {
  const result = portfolioSchema.safeParse(JSON.parse(text));
  if (!result.success)
    throw new Error(
      `El respaldo no es válido: ${result.error.issues[0]?.message ?? "estructura incompatible"}`,
    );
  for (const project of result.data.projects)
    for (const indicator of project.indicators) {
      validateTrackingIndicator(indicator);
    }
  return result.data;
}
export function serializePortfolio(portfolio: Portfolio): string {
  return JSON.stringify(parsePortfolio(JSON.stringify(portfolio)), null, 2);
}
export function blankIndicator(id: string = crypto.randomUUID()): TrackingIndicator {
  return {
    id,
    name: "Nuevo indicador",
    code: "",
    level: "resultado",
    unit: "Número",
    formula: "Valor observado",
    outcome: "",
    source: "",
    instrument: "",
    frequency: "Mensual",
    responsible: "",
    baseline: null,
    baselineSource: "",
    target: null,
    targetSource: "",
    targetDate: "",
    orientation: "ascendente",
    lower: null,
    upper: null,
    ods: [],
    origin: "propio",
  };
}
export function adoptIndicator(indicator: Indicator): TrackingIndicator {
  return {
    ...blankIndicator(`sugerido-${indicator.id}`),
    name: indicator.name,
    code: indicator.institutionalCode,
    level: indicator.level,
    unit: indicator.unit,
    formula: indicator.formula,
    outcome: indicator.observedChange,
    source: indicator.primarySource,
    instrument: indicator.instrument,
    frequency: indicator.frequency,
    responsible: "",
    ods: indicator.odsAlignments.map((a) => a.targetCode),
    origin: "sugerido",
  };
}
function sumKnown(values: (number | null)[]) {
  const known = values.filter((value): value is number => value !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}
/** Un periodo por mes con evidencia de cobertura. No agrega porcentajes ni identifica personas únicas. */
export function trackExecutionProject(
  project: ExecutionProject,
  year: number,
  now = new Date().toISOString(),
): TrackedProject {
  if (!Number.isInteger(year) || year < 1900 || year > 2200)
    throw new Error("Indica una vigencia válida para los planes.");
  const active = project.activities.filter((a) => a.note !== "suprimida");
  const base = blankIndicator("ejecucion-actividades");
  const indicators: TrackingIndicator[] = [
    {
      ...base,
      name: "Actividades realizadas",
      level: "gestion",
      unit: "Unidades de avance del plan",
      formula: "Suma de resultados de actividades del mes (puede incluir fracciones)",
      source: `Hoja ${project.sheet}: columnas mensuales Meta y Resultado`,
      origin: "excel",
    },
  ];
  if (project.hasParticipantData)
    indicators.push({
      ...base,
      id: "ejecucion-asistencias",
      name: "Asistencias registradas",
      level: "producto",
      unit: "Asistencias",
      formula: "Suma de asistencias del mes; una persona puede asistir varias veces",
      source: `Hoja ${project.sheet}: beneficiarios proyectados y reales`,
      origin: "excel",
    });
  const observations: Observation[] = [];
  for (let month = 0; month < 12; month++)
    for (const indicator of indicators) {
      const people = indicator.id === "ejecucion-asistencias";
      const values = active.map((a) =>
        people ? (a.participantsActual[month] ?? null) : (a.months[month]?.actual ?? null),
      );
      const plannedValues = active.map((a) =>
        people ? (a.participantsPlanned[month] ?? null) : (a.months[month]?.planned ?? null),
      );
      const value = sumKnown(values),
        planned = sumKnown(plannedValues);
      if (value === null && planned === null) continue;
      const period = `${year}-${String(month + 1).padStart(2, "0")}`;
      observations.push({
        id: `${project.id}/${indicator.id}/${period}/1`,
        indicatorId: indicator.id,
        period,
        value,
        planned,
        explicitZero: value === 0,
        evidence: `Hoja ${project.sheet}, ${MONTHS[month]}. Filas ${active.map((a) => a.row).join(", ")}. Resultado disponible en ${values.filter((v) => v !== null).length} de ${active.length} actividades.`,
        note: "Dato importado del plan. Verificar cierre del periodo y cobertura antes de interpretarlo. No demuestra impacto.",
        missingReason: value === null ? "El Excel no trae resultados para este periodo." : "",
        recordedAt: now,
        revision: 1,
      });
    }
  return {
    id: project.id,
    name: project.name,
    sheet: project.sheet,
    description: [project.purpose, project.objective].filter(Boolean).join("\n"),
    indicators,
    observations,
    cooperation: emptyCooperation(),
  };
}
export function addTrackedProjects(portfolio: Portfolio, projects: TrackedProject[]): Portfolio {
  const existing = new Set(portfolio.projects.map((p) => p.id));
  if (projects.some((project) => existing.has(project.id)))
    throw new Error(
      "Un proyecto ya está en la cartera. Conserva su historial; registra nuevos periodos dentro de su ficha.",
    );
  return parsePortfolio(
    JSON.stringify({ ...portfolio, projects: [...portfolio.projects, ...projects] }),
  );
}
export function latestObservations(project: TrackedProject, indicatorId: string): Observation[] {
  const latest = new Map<string, Observation>();
  for (const value of project.observations.filter((o) => o.indicatorId === indicatorId)) {
    if ((latest.get(value.period)?.revision ?? 0) < value.revision) latest.set(value.period, value);
  }
  return [...latest.values()].sort((a, b) => a.period.localeCompare(b.period));
}
export function recordObservation(
  project: TrackedProject,
  input: Omit<Observation, "id" | "revision" | "recordedAt">,
  correct = false,
): TrackedProject {
  if (!project.indicators.some((i) => i.id === input.indicatorId))
    throw new Error("El indicador no pertenece al proyecto.");
  const prior = latestObservations(project, input.indicatorId).find(
    (o) => o.period === input.period,
  );
  if (prior && !correct)
    throw new Error(
      "Ya hay una medición en ese periodo. Guarda una corrección para conservar el historial.",
    );
  if (prior && !input.note.trim())
    throw new Error("Explica la corrección para conservar su trazabilidad.");
  const observation = observationSchema.parse({
    ...input,
    id: crypto.randomUUID(),
    revision: (prior?.revision ?? 0) + 1,
    recordedAt: new Date().toISOString(),
  });
  return { ...project, observations: [...project.observations, observation] };
}
export function validateTrackingIndicator(input: TrackingIndicator): TrackingIndicator {
  const indicator = trackingIndicatorSchema.parse(input);
  if (indicator.baseline !== null && !indicator.baselineSource.trim())
    throw new Error("Registra la fuente de la línea base.");
  if (
    (indicator.target !== null || indicator.lower !== null || indicator.upper !== null) &&
    (!indicator.targetSource.trim() || !indicator.targetDate)
  )
    throw new Error("Una meta requiere fundamento y fecha.");
  if (indicator.lower !== null && indicator.upper !== null && indicator.lower > indicator.upper)
    throw new Error("El límite inferior supera al superior.");
  if (
    indicator.orientation === "ascendente" &&
    indicator.target !== null &&
    indicator.baseline !== null &&
    indicator.target < indicator.baseline
  )
    throw new Error("La meta es menor que la línea base: revisa el sentido de éxito.");
  if (
    indicator.orientation === "descendente" &&
    indicator.target !== null &&
    indicator.baseline !== null &&
    indicator.target > indicator.baseline
  )
    throw new Error("La meta es mayor que la línea base: revisa el sentido de éxito.");
  if (indicator.ods.some((code) => !findTarget(code)))
    throw new Error("Selecciona metas ODS válidas del catálogo.");
  return indicator;
}
export function assessMeasurement(indicator: TrackingIndicator, observation?: Observation): string {
  if (!observation || observation.value === null) return "Sin medición";
  if (indicator.origin === "excel" && observation.planned !== null) {
    return observation.planned > 0
      ? `${Math.round((observation.value / observation.planned) * 100)}% de lo planeado en el periodo`
      : "Sin meta de ejecución positiva en el periodo";
  }
  if (indicator.orientation === "rango" || indicator.orientation === "estable") {
    const within = withinTarget(indicator.lower, indicator.upper, observation.value);
    return within === null
      ? "Define límites para evaluar"
      : within
        ? "Dentro del rango"
        : "Fuera del rango";
  }
  const progress = progressToward(
    indicator.orientation,
    indicator.baseline,
    indicator.target,
    observation.value,
  );
  return progress === null
    ? "Sin línea base o meta comparable"
    : `${Math.round(progress * 100)}% del cambio hacia la meta`;
}
export interface TrackingGap {
  rule: string;
  evidence: string;
  action: string;
}
export function trackingGaps(project: TrackedProject): TrackingGap[] {
  const gaps: TrackingGap[] = [];
  const results = project.indicators.filter(
    (i) => i.level === "resultado" || i.level === "impacto",
  );
  if (!results.length)
    gaps.push({
      rule: "Medir resultados",
      evidence: "Solo hay indicadores de ejecución o productos.",
      action:
        "Incorpora un indicador de cambio en acceso, prácticas, capacidades o condiciones; define cómo observarlo.",
    });
  for (const indicator of project.indicators) {
    const hasMonthlyPlan =
      indicator.origin === "excel" &&
      latestObservations(project, indicator.id).some((o) => o.planned !== null);
    const missing = [
      !indicator.source.trim() && "fuente",
      !indicator.instrument.trim() && "instrumento",
      !indicator.responsible.trim() && "responsable",
      !hasMonthlyPlan && indicator.baseline === null && "línea base",
      !hasMonthlyPlan && indicator.target === null && indicator.lower === null && "meta",
    ].filter(Boolean);
    if (missing.length)
      gaps.push({
        rule: "Ficha de medición",
        evidence: `${indicator.name}: falta ${missing.join(", ")}.`,
        action: "Completa la ficha con datos verificables; no asumir cero como línea base.",
      });
    if (!latestObservations(project, indicator.id).some((o) => o.value !== null))
      gaps.push({
        rule: "Evidencia de resultados",
        evidence: `${indicator.name} no tiene mediciones numéricas.`,
        action: "Registra un periodo con su fuente, o explica por qué falta el dato.",
      });
  }
  const criteria = [
    [
      "problem",
      "Problema y evidencia",
      "Documenta la magnitud y fuente del problema que el proyecto puede modificar.",
    ],
    [
      "population",
      "Población",
      "Define población, criterios de inclusión y desagregaciones pertinentes.",
    ],
    ["territory", "Territorio", "Especifica dónde se implementa y el contexto de comparación."],
    [
      "causalHypothesis",
      "Mecanismo causal",
      "Explica cómo los productos permiten el cambio, bajo qué supuestos y con qué evidencia.",
    ],
    [
      "replicableUnit",
      "Unidad replicable",
      "Define qué paquete mínimo se podría implementar en otro lugar.",
    ],
    [
      "method",
      "Método transferible",
      "Documenta pasos, requisitos y estándares de calidad del paquete.",
    ],
    [
      "adaptation",
      "Adaptación territorial",
      "Distingue qué se conserva y qué requiere adaptación o validación local.",
    ],
    [
      "partners",
      "Capacidad y alianzas",
      "Identifica quién ejecuta y qué capacidades o acuerdos son necesarios.",
    ],
    [
      "costs",
      "Costo y financiación",
      "Documenta costos del paquete y costos recurrentes con fuente; no confundir costo por actividad con costo por resultado.",
    ],
    [
      "sustainability",
      "Continuidad",
      "Define responsables, recursos y mantenimiento después de la financiación.",
    ],
    [
      "risks",
      "Riesgos y salvaguardas",
      "Describe riesgos, mitigaciones y protección de la población y sus datos.",
    ],
  ] as const;
  for (const [key, rule, action] of criteria)
    if (!project.cooperation[key].trim())
      gaps.push({ rule, evidence: "Sin documentación en la ficha de cooperación.", action });
  return gaps;
}

export const MEASUREMENT_HEADERS = [
  "Proyecto ID",
  "Indicador ID",
  "Proyecto",
  "Indicador",
  "Periodo (AAAA-MM)",
  "Valor",
  "Cero confirmado (sí/no)",
  "Fuente o evidencia",
  "Motivo sin dato",
  "Nota",
];
export function measurementTemplateRows(portfolio: Portfolio): unknown[][] {
  return [
    MEASUREMENT_HEADERS,
    ...portfolio.projects.flatMap((p) =>
      p.indicators.map((i) => [p.id, i.id, p.name, i.name, "", null, "", "", "", ""]),
    ),
  ];
}
export function importTrackingRows(portfolio: Portfolio, rows: unknown[][]): Portfolio {
  const header = rows[0] ?? [];
  const columns = MEASUREMENT_HEADERS.map((h) => header.indexOf(h));
  if (columns.some((c) => c < 0))
    throw new Error("Usa la plantilla de mediciones de esta cartera y conserva sus encabezados.");
  const cell = (row: unknown[], index: number) => row[columns[index]!] ?? "";
  let next = portfolio;
  const seen = new Set<string>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    if (row.every((c) => c === null || String(c).trim() === "")) continue;
    const projectId = String(cell(row, 0));
    const project = next.projects.find((p) => p.id === projectId);
    if (!project) throw new Error(`Fila ${r + 1}: proyecto desconocido.`);
    const indicatorId = String(cell(row, 1));
    const period = String(cell(row, 4)).trim();
    const key = `${projectId}/${indicatorId}/${period}`;
    if (seen.has(key)) throw new Error(`Fila ${r + 1}: indicador y periodo duplicados.`);
    seen.add(key);
    const raw = String(cell(row, 5)).trim();
    const value = raw === "" ? null : Number(raw.replace(",", "."));
    if (value !== null && !Number.isFinite(value))
      throw new Error(`Fila ${r + 1}: valor no numérico.`);
    try {
      const updated = recordObservation(project, {
        indicatorId,
        period,
        value,
        planned: null,
        explicitZero: /^(si|sí)$/i.test(String(cell(row, 6)).trim()),
        evidence: String(cell(row, 7)).trim(),
        missingReason: String(cell(row, 8)).trim(),
        note: String(cell(row, 9)).trim(),
      });
      next = { ...next, projects: next.projects.map((p) => (p.id === projectId ? updated : p)) };
    } catch (cause) {
      throw new Error(
        `Fila ${r + 1}: ${cause instanceof Error ? cause.message : "medición inválida"}`,
      );
    }
  }
  if (!seen.size) throw new Error("La plantilla no contiene mediciones.");
  return parsePortfolio(JSON.stringify(next));
}

export function updateTrackingIndicator(
  project: TrackedProject,
  input: TrackingIndicator,
): TrackedProject {
  const validated = validateTrackingIndicator(input);
  const previous = project.indicators.find((i) => i.id === validated.id);
  if (!previous) throw new Error("El indicador no pertenece al proyecto.");
  if (
    project.observations.some((o) => o.indicatorId === previous.id) &&
    (previous.unit !== validated.unit || previous.formula !== validated.formula)
  )
    throw new Error(
      "Este indicador ya tiene historial. Para cambiar la unidad o la fórmula crea otro indicador y conserva la serie original.",
    );
  const result = {
    ...project,
    indicators: project.indicators.map((i) => (i.id === validated.id ? validated : i)),
  };
  return parsePortfolio(JSON.stringify({ schemaVersion: 1, projects: [result] })).projects[0]!;
}

export function cooperationBrief(project: TrackedProject): string {
  const profile = project.cooperation;
  const sections = [
    ["Problema y evidencia", profile.problem],
    ["Población", profile.population],
    ["Territorio", profile.territory],
    ["Hipótesis de cambio (por validar)", profile.causalHypothesis],
    ["Unidad replicable", profile.replicableUnit],
    ["Método y estándares", profile.method],
    ["Adaptación territorial", profile.adaptation],
    ["Capacidades y alianzas", profile.partners],
    ["Costos y financiación", profile.costs],
    ["Continuidad", profile.sustainability],
    ["Riesgos y salvaguardas", profile.risks],
  ];
  const indicators = project.indicators.map((indicator) => {
    const latest = latestObservations(project, indicator.id).at(-1);
    return `### ${indicator.name}\n\nNivel: ${indicator.level}. Definición: ${indicator.formula}. Unidad: ${indicator.unit}.\n\nResultado que se propone observar: ${indicator.outcome || "Pendiente"}.\n\nLínea base: ${indicator.baseline ?? "Sin dato"}. Fuente: ${indicator.baselineSource || "Pendiente"}. Meta: ${indicator.target ?? "Sin dato"}. Fundamento: ${indicator.targetSource || "Pendiente"}.\n\nÚltimo periodo registrado: ${latest?.period ?? "Sin medición"}. Valor: ${latest?.value ?? "Sin dato"}. Fuente: ${latest?.evidence || "Pendiente"}. ${assessMeasurement(indicator, latest)}.\n\nMetas ODS para revisión: ${indicator.ods.join(", ") || "Sin asociación específica"}.`;
  });
  return `# Ficha de cooperación: ${project.name}\n\nDocumento de trabajo. Las metas ODS son asociaciones de proyecto para revisión. No acredita elegibilidad, impacto ni financiación ante un donante.\n\n${sections.map(([title, value]) => `## ${title}\n\n${value || "Pendiente de documentar con evidencia."}`).join("\n\n")}\n\n## Marco de medición\n\n${indicators.join("\n\n")}\n\n## Brechas de evidencia y preparación\n\n${trackingGaps(
    project,
  )
    .map((gap) => `- ${gap.rule}: ${gap.evidence} ${gap.action}`)
    .join("\n")}\n`;
}
