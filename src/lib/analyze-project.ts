import {
  INDICATOR_LIBRARY,
  REFERENCES,
  SECTOR_KEYWORDS,
  type IndicatorTemplate,
} from "@/data/indicator-library";
import { bidReferencesForIndicator } from "@/data/bid-catalog";
import { colombiaReferencesForIndicator } from "@/data/colombia-context-catalog";
import { reviewLogicalFramework, suggestFrameworkIds } from "@/lib/framework-rules";
import { buildAlignment } from "@/lib/ods-rules";
import {
  SECTOR_LABELS,
  defaultSettings,
  emptyTarget,
  type CausalLevel,
  type DetectedSector,
  type Indicator,
  type InstitutionalFramework,
  type InternationalReference,
  type PlatformSettings,
  type ProjectInput,
  type SectorKey,
  type SessionAnalysis,
} from "@/types/medidor";

const LEVEL_QUOTAS: Record<CausalLevel, number> = {
  gestion: 2,
  producto: 2,
  resultado: 3,
  impacto: 1,
};
const ESSENTIAL_LIMIT = 8;
const OPTIONAL_LIMIT = 4;

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%áéíóúñü\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentences(text: string): string[] {
  return text
    .replace(/\r/g, "\n")
    .split(/(?:\n{1,}|(?<=[.!?;:])\s+)/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 25 && line.length <= 700);
}

function contains(text: string, term: string): boolean {
  return text.includes(normalized(term));
}

function evidenceFor(allSentences: string[], terms: string[], limit = 2): string[] {
  const normalTerms = terms.map(normalized);
  return allSentences
    .filter((sentence) => {
      const value = normalized(sentence);
      return normalTerms.some((term) => value.includes(term));
    })
    .slice(0, limit);
}

function displayKeyword(term: string): string {
  const replacements: Record<string, string> = {
    ninas: "niñas y niños",
    ninos: "niñas y niños",
    "niñas": "niñas y niños",
    "niños": "niñas y niños",
    jovenes: "jóvenes",
    inclusion: "inclusión",
    apropiacion: "apropiación",
    metodologia: "metodología",
  };
  return replacements[normalized(term)] ?? term;
}

function detectSectors(project: ProjectInput, allSentences: string[]): DetectedSector[] {
  const combined = normalized(`${project.sector} ${project.text}`);
  const scored = (Object.entries(SECTOR_KEYWORDS) as [SectorKey, string[]][])
    .map(([key, terms]) => {
      const matched = terms.filter((term) => contains(combined, term));
      const phraseBonus = matched.filter((term) => term.includes(" ")).length * 2;
      return {
        key,
        label: SECTOR_LABELS[key],
        score: matched.length + phraseBonus,
        evidence: evidenceFor(allSentences, matched.length ? matched : terms, 2),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return [
      {
        key: "gestion_social",
        label: SECTOR_LABELS.gestion_social,
        evidence: allSentences.slice(0, 1),
        confidence: "baja",
      },
    ];
  }

  const first = scored[0];
  if (!first) return [];
  const top = first.score;
  return scored
    .filter((item, index) => index < 3 && (index === 0 || item.score >= Math.max(2, top * 0.45)))
    .map((item) => ({
      key: item.key,
      label: item.label,
      evidence: item.evidence,
      confidence: item.score >= 5 ? "alta" : item.score >= 3 ? "media" : "baja",
    }));
}

function pickSentences(all: string[], terms: string[], limit: number): string[] {
  const found = evidenceFor(all, terms, limit);
  return found.length ? found : all.slice(0, Math.min(limit, all.length));
}

function hasAny(value: string, terms: string[]): boolean {
  return terms.some((term) => contains(value, term));
}

/**
 * Los vacíos metodológicos son información útil para las alertas y preguntas,
 * pero no describen actividades, productos ni resultados. Separarlos evita
 * que frases como "el documento no contiene una línea base" contaminen la
 * teoría del cambio.
 */
function isMethodologicalGapSentence(sentence: string): boolean {
  const value = normalized(sentence);
  return hasAny(value, [
    "el documento no contiene",
    "el documento no incluye",
    "no contiene una linea base",
    "no cuenta con linea base",
    "no existe linea base",
    "no hay linea base",
    "sin linea base",
    "cantidad confirmada",
    "dato pendiente de confirmar",
  ]);
}

function isObjectiveSentence(sentence: string): boolean {
  return hasAny(normalized(sentence), [
    "el proyecto busca",
    "el proyecto pretende",
    "objetivo general",
    "objetivo especifico",
    "se espera que",
    "contribuir a",
  ]);
}

function isOutcomeSentence(sentence: string): boolean {
  return hasAny(normalized(sentence), [
    "se espera que",
    "mejoren",
    "aumenten",
    "fortalezcan",
    "apliquen lo aprendido",
    "adopten",
    "incorporar la metodologia",
    "cambien",
  ]);
}

function compact(text: string, max = 260): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trim()}…`;
}

function causalModel(project: ProjectInput, all: string[], detected: DetectedSector[]) {
  const substantive = all.filter((sentence) => !isMethodologicalGapSentence(sentence));
  const activitiesOnly = substantive.filter((sentence) => !isObjectiveSentence(sentence));
  const productsOnly = substantive.filter((sentence) => !isOutcomeSentence(sentence));
  const outcomesOnly = substantive.filter(
    (sentence) =>
      !hasAny(normalized(sentence), ["formara", "capacitar", "entregara", "desarrollara", "se realizaran"]),
  );
  const objectiveEvidence = pickSentences(
    substantive,
    ["objetivo", "busca", "propósito", "proposito", "pretende", "se espera", "contribuir", "mejorar"],
    3,
  );
  const activityEvidence = pickSentences(
    activitiesOnly,
    [
      "implementar",
      "realizar",
      "desarrollar",
      "capacitar",
      "formar",
      "entregar",
      "acompañar",
      "acompanar",
      "diseñar",
      "disenar",
      "fortalecer",
    ],
    6,
  );
  const outputEvidence = pickSentences(
    productsOnly,
    ["producto", "entregable", "kit", "prototipo", "material", "metodología", "metodologia", "sistema", "taller", "comité", "comite"],
    5,
  );
  const outcomeEvidence = pickSentences(
    outcomesOnly,
    ["resultado", "cambio", "adopción", "adopcion", "apropiación", "apropiacion", "capacidad", "aprendizaje", "uso", "mejora"],
    5,
  );
  const problemEvidence = pickSentences(
    substantive,
    ["problema", "brecha", "limit", "ausencia", "falta", "dificultad", "riesgo", "barrera", "degrad"],
    2,
  );
  const sectorNames = detected.map((item) => item.label.toLowerCase()).join(", ");
  const changeSynthesis = objectiveEvidence.length
    ? objectiveEvidence.map((item) => compact(item, 320)).join(" ")
    : `El proyecto propone una intervención en ${sectorNames}. El cambio esperado debe confirmarse con los objetivos y resultados explícitos del documento.`;
  const impact = objectiveEvidence[0]
    ? compact(objectiveEvidence[0], 380)
    : `Transformación sostenible asociada con ${sectorNames}, pendiente de confirmación documental.`;
  return {
    changeSynthesis,
    counterfactual: `Sin la intervención, las brechas identificadas en ${sectorNames} continuarían sin los productos, capacidades y mecanismos previstos. Esta formulación es una hipótesis de coste de oportunidad y debe validarse con evidencia territorial.`,
    problem: problemEvidence[0] ? compact(problemEvidence[0], 380) : "Problema central pendiente de formulación explícita en los documentos.",
    causes: problemEvidence.slice(1).length
      ? problemEvidence.slice(1).map((item) => compact(item))
      : ["Las causas no aparecen diferenciadas de los síntomas; requieren validación del equipo."],
    population: project.targetPopulation || "Población objetivo pendiente de confirmación",
    territory: project.territory || "Territorio pendiente de confirmación",
    gaps: [
      ...(project.targetPopulation ? [] : ["Falta definir la población objetivo y sus criterios de elegibilidad."]),
      ...(project.territory ? [] : ["Falta precisar el territorio y la unidad geográfica de análisis."]),
      ...(project.duration ? [] : ["Falta precisar la duración para definir horizontes y frecuencias."]),
      "Las líneas base deben levantarse antes de aprobar metas cuantitativas.",
    ],
    activities: activityEvidence.map((item) => compact(item)),
    outputs: outputEvidence.map((item) => compact(item)),
    outcomes: outcomeEvidence.map((item) => compact(item)),
    impact,
    assumptions: [
      "La población objetivo puede acceder y permanecer en la intervención.",
      "Los aliados mantienen las capacidades y compromisos necesarios.",
      "Los factores territoriales externos no revierten el mecanismo de cambio.",
    ],
    risks: [
      "Confundir entrega o asistencia con cambios en capacidades, prácticas o condiciones de vida.",
      "Definir metas sin línea base, universo o capacidad operativa verificable.",
      "Atribuir al proyecto cambios afectados por políticas, economía, clima u otras intervenciones.",
    ],
    externalFactors: [
      "Cambios institucionales o regulatorios.",
      "Condiciones socioeconómicas y territoriales.",
      "Intervenciones de otros actores durante el mismo periodo.",
    ],
    preliminaryTheoryOfChange: `Si el proyecto ejecuta las actividades identificadas y entrega productos funcionales y accesibles, entonces la población y las instituciones podrán desarrollar y aplicar capacidades relacionadas con ${sectorNames}. Si esas prácticas se sostienen y los aliados cumplen sus compromisos, el proyecto contribuirá al cambio de largo plazo descrito en su objetivo. Esta hipótesis requiere comprobar la secuencia actividad–producto–resultado y validar sus supuestos con el equipo.`,
    consolidatedTheoryOfChange: null,
    evidenceStatus: "inferred" as const,
    warnings: [
      "La comprensión se genera mediante reglas locales y trazabilidad textual; el equipo debe confirmar los fragmentos interpretados.",
    ],
  };
}

function scoreTemplate(
  template: IndicatorTemplate,
  normalizedText: string,
  sectors: DetectedSector[],
): number {
  const sectorRank = new Map(sectors.map((sector, index) => [sector.key, sectors.length - index]));
  const sectorScore = Math.max(...template.sectors.map((key) => sectorRank.get(key) ?? 0), 0) * 5;
  const keywordScore = template.keywords.filter((term) => contains(normalizedText, term)).length * 3;
  const tierScore = template.tier === "esencial" ? 2 : template.tier === "salvaguarda" ? 1 : 0;
  return sectorScore + keywordScore + tierScore;
}

function selectTemplates(text: string, sectors: DetectedSector[]): IndicatorTemplate[] {
  const normalizedText = normalized(text);
  const active = new Set(sectors.map((item) => item.key));
  const candidates = INDICATOR_LIBRARY.filter((template) =>
    template.sectors.some((sector) => active.has(sector)),
  )
    .map((template) => ({ template, score: scoreTemplate(template, normalizedText, sectors) }))
    .sort((a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id));

  const selected: IndicatorTemplate[] = [];
  const alreadySelected = (template: IndicatorTemplate) => selected.some((item) => item.id === template.id);
  for (const level of ["gestion", "producto", "resultado", "impacto"] as CausalLevel[]) {
    const essential = candidates
      .filter((item) => item.template.level === level && item.template.tier === "esencial")
      .slice(0, LEVEL_QUOTAS[level]);
    const fallback = candidates
      .filter((item) => item.template.level === level && !essential.some((pick) => pick.template.id === item.template.id))
      .slice(0, Math.max(0, LEVEL_QUOTAS[level] - essential.length));
    selected.push(...[...essential, ...fallback].map((item) => item.template));
  }
  for (const candidate of candidates) {
    if (selected.length >= ESSENTIAL_LIMIT) break;
    if (!alreadySelected(candidate.template)) selected.push(candidate.template);
  }
  const optional: IndicatorTemplate[] = [];
  for (const candidate of candidates) {
    if (optional.length >= OPTIONAL_LIMIT) break;
    if (alreadySelected(candidate.template) || candidate.template.tier === "esencial") continue;
    optional.push(candidate.template);
  }
  return [...selected.slice(0, ESSENTIAL_LIMIT), ...optional];
}

/**
 * Convierte las plantillas técnicas en nombres que un equipo de proyecto puede
 * usar de inmediato. Las fórmulas y fuentes permanecen en la ficha; el título
 * responde primero y sin jerga a la pregunta: "¿qué debemos medir?".
 */
type ConcreteIndicatorCopy = Pick<
  Indicator,
  "name" | "unit" | "numerator" | "denominator" | "formula" | "observedChange"
>;

function concreteIndicatorCopy(template: IndicatorTemplate, project: ProjectInput): ConcreteIndicatorCopy {
  const text = normalized(`${project.name} ${project.sector} ${project.text}`);
  const robotics = hasAny(text, ["robotica", "stem", "kit", "prototipo", "programacion"]);
  const water = hasAny(text, ["agua potable", "potabilizacion", "recurso hidrico", "acueducto"]);
  const original: ConcreteIndicatorCopy = {
    name: template.name,
    unit: template.unit,
    numerator: template.numerator,
    denominator: template.denominator,
    formula: template.formula,
    observedChange: template.observedChange,
  };
  const count = (name: string, unit: string, numerator: string, observedChange: string): ConcreteIndicatorCopy => ({
    name,
    unit,
    numerator,
    denominator: "No aplica",
    formula: `Conteo de ${numerator.toLowerCase()}`,
    observedChange,
  });

  if (robotics) {
    const copy: Partial<Record<string, ConcreteIndicatorCopy>> = {
      g_schedule: { ...original, name: "Porcentaje de actividades de la ruta de robótica ejecutadas según el cronograma" },
      g_participation: count("Número de estudiantes que participan y completan la ruta de robótica escolar", "Número de estudiantes", "estudiantes únicos que cumplen el criterio de participación y finalización", "Los estudiantes previstos participan y completan la ruta de robótica escolar."),
      g_quality: { ...original, name: "Porcentaje de kits de robótica entregados que cumplen criterios de funcionamiento" },
      g_access: count("Número de situaciones que impiden la participación segura e inclusiva en robótica y que fueron resueltas", "Número de situaciones resueltas", "situaciones registradas, atendidas y verificadas con las personas participantes", "El proyecto identifica y resuelve situaciones que limitan la participación segura e inclusiva de niñas y niños."),
      g_deliverables: count("Número de kits de robótica entregados y disponibles para uso educativo", "Número de kits", "kits entregados, verificados y disponibles para uso educativo", "Las instituciones educativas reciben kits de robótica funcionales y disponibles para el aprendizaje."),
      g_sustainability: count("Número de instituciones educativas con responsables y plan de mantenimiento de los kits de robótica", "Número de instituciones educativas", "instituciones con responsables designados y plan de mantenimiento verificable", "Las instituciones cuentan con condiciones mínimas para mantener los kits después del acompañamiento."),
      env_waste: { ...original, name: "Cantidad de material reciclado incorporado en la construcción de robots y prototipos" },
      learning_gain: { ...original, name: "Porcentaje de estudiantes que mejoran sus competencias STEM" },
      learning_application: { ...original, name: "Porcentaje de estudiantes que aplican competencias STEM en la construcción de prototipos funcionales" },
      science_use: count("Número de docentes que usan evidencia de aprendizaje para ajustar la enseñanza STEM", "Número de docentes", "docentes que documentan un ajuste pedagógico basado en evidencia de aprendizaje", "Los docentes usan evidencia de aprendizaje para adaptar sus prácticas STEM."),
      innovation_prototypes: count("Número de robots o prototipos construidos por estudiantes que cumplen la prueba de funcionamiento", "Número de prototipos", "robots o prototipos que superan la prueba de funcionamiento definida", "Los estudiantes construyen prototipos funcionales que responden a un reto de aprendizaje o del territorio."),
      innovation_user_testing: count("Número de prototipos de robótica validados con estudiantes, docentes u otros usuarios", "Número de prototipos", "prototipos validados con usuarios mediante una prueba documentada", "Los prototipos se prueban y ajustan con las personas que los utilizarán."),
      innovation_adoption: { ...original, name: "Porcentaje de docentes que incorporan actividades de robótica en sus prácticas de aula" },
      innovation_value: { ...original, name: "Porcentaje de estudiantes que mantienen su participación en actividades STEM después de finalizar la ruta de robótica" },
    };
    return copy[template.id] ?? original;
  }

  if (water) {
    const copy: Partial<Record<string, ConcreteIndicatorCopy>> = {
      g_participation: count("Número de personas que participan y completan la formación en gestión y uso racional del agua", "Número de personas", "personas que cumplen el criterio de participación y finalización de la formación", "Las personas completan la formación prevista en gestión y uso racional del agua."),
      g_deliverables: count("Número de instituciones educativas con acceso a agua potable mediante soluciones de potabilización", "Número de instituciones educativas", "instituciones con solución de potabilización instalada, funcional y disponible", "Las instituciones educativas cuentan con acceso efectivo a agua potable mediante una solución funcional."),
      g_sustainability: count("Número de personas capacitadas en operación y mantenimiento de soluciones de potabilización", "Número de personas", "personas que completan y aprueban la capacitación práctica de operación y mantenimiento", "Las personas responsables demuestran capacidades para operar y mantener las soluciones de potabilización."),
      env_waste: { ...original, name: "Cantidad de material recuperado o reciclado incorporado en las soluciones de potabilización" },
      learning_gain: { ...original, name: "Nivel de apropiación de conocimientos sobre uso racional del agua y conservación de recursos naturales" },
      learning_application: { ...original, name: "Porcentaje de participantes que aplican prácticas de uso racional y cuidado del recurso hídrico" },
      env_practices: { ...original, name: "Porcentaje de instituciones educativas que adoptan prácticas de uso eficiente y cuidado del agua" },
      innovation_value: { ...original, name: "Cambio en las condiciones de acceso seguro al agua potable de la población beneficiaria" },
    };
    return copy[template.id] ?? original;
  }

  return original;
}

function makeIndicator(
  template: IndicatorTemplate,
  project: ProjectInput,
  allSentences: string[],
  frameworks: InstitutionalFramework[],
): Indicator {
  const evidence = evidenceFor(allSentences, template.keywords, 3);
  const concrete = concreteIndicatorCopy(template, project);
  const projectText = normalized(`${project.name} ${project.sector} ${project.text}`);
  const waterProject = hasAny(projectText, ["agua potable", "potabilizacion", "recurso hidrico", "acueducto"]);
  const waterIndicator = waterProject && ["g_deliverables", "g_sustainability", "learning_gain", "learning_application"].includes(template.id);
  const bidReferences = [
    ...bidReferencesForIndicator(template.id, template.sectors),
    ...(waterIndicator ? bidReferencesForIndicator("water_access", ["medio_ambiente"]) : []),
  ].filter((reference, index, list) => list.findIndex((item) => item.code === reference.code) === index);
  const colombiaReferences = [
    ...colombiaReferencesForIndicator(template.id, template.sectors),
    ...(waterIndicator ? colombiaReferencesForIndicator("water_access", ["medio_ambiente"]) : []),
  ].filter((reference, index, list) => list.findIndex((item) => item.url === reference.url) === index);
  const target = emptyTarget();
  target.unit = concrete.unit;
  target.targetPopulation = project.targetPopulation;
  target.targetTerritory = project.territory;
  target.baselineReference = `REQUIERE LÍNEA BASE: ${template.baseline.method}`;
  target.determinationMethod = "pendiente";
  const odsAlignments = template.ods.slice(0, 3).flatMap((code, index) => {
    const alignment = buildAlignment(code, index === 0 ? "principal" : "secundaria");
    if (!alignment) return [];
    return [
      {
        ...alignment,
        contributionType: index === 0 ? ("directa" as const) : ("indirecta" as const),
        causalRationale: `${template.observedChange} La relación se propone por el mecanismo de cambio descrito y debe confirmarse contra el objetivo específico del proyecto.`,
        compatibilityAssessment:
          "El indicador recomendado opera a escala de proyecto. No sustituye el indicador global ODS ni permite atribuir el avance nacional al proyecto.",
        localProxy: template.name,
        reviewStatus: "sugerida" as const,
      },
    ];
  });
  return {
    id: template.id,
    name: concrete.name,
    level: template.level,
    observedChange: concrete.observedChange,
    decisionInformed: template.decisionInformed,
    dimension: template.dimension,
    crossCuttingApproaches: template.disaggregations,
    sphere: template.sphere,
    horizon: template.horizon,
    population: project.targetPopulation || "Pendiente de confirmación",
    territory: project.territory || "Pendiente de confirmación",
    unit: concrete.unit,
    orientation: "ascendente",
    orientationRationale: "",
    institutionalCode: "",
    frameworkIds: suggestFrameworkIds(template.level, frameworks),
    accumulation: template.accumulation,
    numerator: concrete.numerator,
    denominator: concrete.denominator,
    formula: concrete.formula,
    disaggregations: template.disaggregations,
    primarySource: template.source,
    secondarySource: "Fuente oficial territorial o sectorial comparable, si existe y coincide en definición y escala",
    instrument: template.instrument,
    technique: template.technique,
    frequency: template.frequency,
    responsible: template.responsible,
    measurementBurden: template.burden,
    qualityRisks: template.qualityRisks ?? [],
    biases: [],
    externalFactors: [],
    attributionLimits:
      template.attributionLimits ??
      "Reportar contribución cuando existan factores externos o intervenciones concurrentes.",
    safeguards: template.guardrail
      ? ["Canal accesible y confidencial", "Consentimiento y protección de datos", "Respuesta con responsable y plazo"]
      : [],
    evidenceStatus: evidence.length ? "inferred" : "needs_input",
    pendingIssues: [
      "REQUIERE LÍNEA BASE antes de aprobar una meta cuantitativa.",
      ...(evidence.length ? [] : ["Confirmar que este indicador corresponde a un resultado explícito del proyecto."]),
    ],
    isGuardrail: template.guardrail ?? false,
    decision: "propuesto",
    review: {
      verdict: evidence.length || template.tier === "salvaguarda" ? "apto" : "revisar",
      reasons: [
        evidence.length
          ? "La recomendación tiene evidencia temática en los documentos cargados."
          : "La recomendación proviene del marco sectorial y requiere confirmar su relación causal específica.",
      ],
    },
    recommendationTier: template.tier,
    recommendationRationale: evidence.length
      ? `Se recomienda porque el proyecto menciona elementos relacionados con: ${template.keywords.filter((term) => evidence.some((line) => contains(normalized(line), term))).slice(0, 4).map(displayKeyword).join(", ") || template.keywords.slice(0, 3).map(displayKeyword).join(", ")}.`
      : "Se recomienda como indicador habitual del sector detectado; debe validarse su pertinencia causal.",
    projectEvidence: evidence,
    baselinePlan: template.baseline,
    internationalReferences: template.references
      .map((key) => REFERENCES[key])
      .filter((reference): reference is InternationalReference => Boolean(reference)),
    bidReferences,
    colombiaReferences,
    odsAlignments,
    target,
  };
}

function criticalQuestions(project: ProjectInput, sectors: DetectedSector[]) {
  const questions = [];
  if (!project.targetPopulation) {
    questions.push({
      id: "population",
      question: "¿Cuál es la población objetivo y cuáles son sus criterios de elegibilidad?",
      whyItMatters: "Define universos, denominadores, desagregaciones y el diseño de la línea base.",
      answer: "",
    });
  }
  if (!project.territory) {
    questions.push({
      id: "territory",
      question: "¿Cuál es el territorio y cuál es la unidad de análisis principal?",
      whyItMatters: "Evita mezclar datos nacionales, municipales, institucionales o comunitarios.",
      answer: "",
    });
  }
  questions.push({
    id: "baseline",
    question: "¿Existe alguna medición previa comparable para los cambios principales?",
    whyItMatters: "La aplicación puede sugerir el método, pero no debe inventar el valor inicial ni la meta.",
    answer: "",
  });
  questions.push({
    id: "decision",
    question: `¿Qué decisiones deben tomar los responsables cuando cambien los indicadores de ${sectors.map((item) => item.label.toLowerCase()).join(" y ")}?`,
    whyItMatters: "Permite descartar métricas informativas que no conducen a ninguna acción.",
    answer: "",
  });
  return questions.slice(0, 4);
}

function climateAlignment(text: string) {
  const value = normalized(text);
  const mitigation = ["emision", "carbono", "energia", "eficiencia energetica", "residuo", "reciclaje"].some((term) => contains(value, term));
  const adaptation = ["clima", "agua", "ecosistema", "biodiversidad", "restauracion", "resiliencia"].some((term) => contains(value, term));
  const material = mitigation || adaptation;
  return {
    materiality: material ? ("material" as const) : ("no_material" as const),
    alignmentType:
      mitigation && adaptation
        ? ("mitigacion_y_adaptacion" as const)
        : mitigation
          ? ("mitigacion" as const)
          : adaptation
            ? ("adaptacion" as const)
            : ("no_material" as const),
    alignmentAreas: [
      ...(mitigation ? ["Descarbonización, circularidad o eficiencia de recursos"] : []),
      ...(adaptation ? ["Adaptación, biodiversidad o gestión del recurso hídrico"] : []),
    ],
    causalRationale: material
      ? "El documento contiene mecanismos ambientales compatibles con la E2050. La magnitud de la contribución requiere línea base y metodología específica."
      : "No se detectó una relación ambiental material suficiente para atribuir una contribución climática.",
    emissionsMetric: mitigation
      ? "Definir actividad, dato primario, factor de emisión y escenario de referencia antes de calcular tCO₂e."
      : "",
    evidenceStatus: material ? ("inferred" as const) : ("needs_input" as const),
    reviewStatus: "sugerida" as const,
    sourceVersion: "E2050 Colombia — Estrategia climática de largo plazo",
    sourceUrl:
      "https://www.minambiente.gov.co/cambio-climatico-y-gestion-del-riesgo/estrategia-2050/",
  };
}

function validateInput(data: ProjectInput): void {
  if (!data || typeof data.text !== "string") throw new Error("El proyecto no contiene texto.");
  if (data.text.trim().length < 80) {
    throw new Error("El texto del proyecto es demasiado corto para reconstruir su lógica.");
  }
  if (data.text.length > 360_000) {
    throw new Error("El conjunto de documentos supera el límite de 360.000 caracteres.");
  }
}

export async function analyzeProject({
  data,
  settings = defaultSettings(),
}: {
  data: ProjectInput;
  settings?: PlatformSettings;
}): Promise<SessionAnalysis> {
  validateInput(data);
  const allSentences = sentences(data.text);
  const detectedSectors = detectSectors(data, allSentences);
  const causal = causalModel(data, allSentences, detectedSectors);
  const templates = selectTemplates(`${data.sector} ${data.text}`, detectedSectors);
  const indicators = templates.map((template) => makeIndicator(template, data, allSentences, settings.frameworks));
  const logicalFrameworkReview = reviewLogicalFramework(data, causal, indicators, settings.rules);
  return {
    origin: "motor_local",
    generatedAt: new Date().toISOString(),
    detectedSectors,
    causal,
    indicators,
    climateAlignment: climateAlignment(`${data.sector} ${data.text}`),
    logicalFrameworkReview,
    questions: criticalQuestions(data, detectedSectors),
    warnings: [
      {
        field: "Metas",
        message: "No se generan valores meta sin línea base, benchmark verificable o cifra explícita del proyecto.",
      },
      {
        field: "Alcance",
        message: "El motor recomienda cómo medir; no registra ni calcula resultados ejecutados.",
      },
    ],
  };
}
