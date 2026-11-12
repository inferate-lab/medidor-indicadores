/** Modelo de dominio del Medidor de Indicadores. Los faltantes son null, nunca cero. */
export type EvidenceStatus =
  "confirmed_in_project" | "inferred" | "external_source" | "needs_input";
export const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  confirmed_in_project: "Confirmado en el proyecto",
  inferred: "Inferido",
  external_source: "Fuente externa",
  needs_input: "Requiere insumo",
};

export type CausalLevel = "gestion" | "producto" | "resultado" | "impacto";
export const LEVEL_LABELS: Record<CausalLevel, string> = {
  gestion: "Gestión / proceso",
  producto: "Producto",
  resultado: "Resultado",
  impacto: "Impacto",
};
export const LEVEL_TEMPLATE: Record<CausalLevel, number> = {
  gestion: 8,
  producto: 4,
  resultado: 2,
  impacto: 1,
};

export type Dimension = "social" | "cultural" | "economica" | "ambiental" | "institucional";
export const DIMENSION_LABELS: Record<Dimension, string> = {
  social: "Social",
  cultural: "Cultural",
  economica: "Económica",
  ambiental: "Ambiental",
  institucional: "Institucional",
};

export type Sphere = "control" | "influencia" | "interes";
export const SPHERE_LABELS: Record<Sphere, string> = {
  control: "Esfera de control",
  influencia: "Esfera de influencia",
  interes: "Esfera de interés",
};
export type Horizon = "corto" | "mediano" | "largo";
export const HORIZON_LABELS: Record<Horizon, string> = {
  corto: "Corto plazo",
  mediano: "Mediano plazo",
  largo: "Largo plazo",
};
/** Sentido en el que el indicador expresa éxito. */
export type Orientation = "ascendente" | "descendente" | "estable" | "rango";
export const ORIENTATION_LABELS: Record<Orientation, string> = {
  ascendente: "Aumentar es avance",
  descendente: "Disminuir es avance",
  estable: "Mantenerse es avance",
  rango: "Permanecer dentro de un rango es avance",
};
export type MeasurementBurden = "baja" | "media" | "alta";
export type ReviewVerdict = "apto" | "revisar" | "excluir";
export const REVIEW_LABELS: Record<ReviewVerdict, string> = {
  apto: "Apto",
  revisar: "Revisar",
  excluir: "Excluir",
};
export type IndicatorDecision = "propuesto" | "aprobado" | "modificado" | "excluido";
export const DECISION_LABELS: Record<IndicatorDecision, string> = {
  propuesto: "Propuesto",
  aprobado: "Aprobado",
  modificado: "Modificado",
  excluido: "Excluido",
};
export type ContributionType = "directa" | "indirecta" | "habilitadora";
export type OdsReviewStatus = "sugerida" | "aceptada" | "rechazada";
export type TargetValidationStatus = "pendiente" | "provisional" | "validada" | "aprobada";
export type DeterminationMethod =
  "ingreso_humano" | "calculo_linea_base" | "benchmark_verificado" | "pendiente";
export const DETERMINATION_LABELS: Record<DeterminationMethod, string> = {
  ingreso_humano: "Ingreso humano",
  calculo_linea_base: "Cálculo desde línea base",
  benchmark_verificado: "Benchmark verificado",
  pendiente: "Meta pendiente",
};

export interface ProjectInput {
  name: string;
  sector: string;
  territory: string;
  duration: string;
  targetPopulation: string;
  budget: string;
  text: string;
  sourceFileNames: string[];
}

export type SectorKey =
  | "medio_ambiente"
  | "ciencia"
  | "educacion_ambiental"
  | "gestion_cultural"
  | "gestion_social"
  | "innovacion"
  | "soluciones_naturaleza"
  | "lectura_educacion";

export const SECTOR_LABELS: Record<SectorKey, string> = {
  medio_ambiente: "Medio ambiente",
  ciencia: "Ciencia",
  educacion_ambiental: "Educación ambiental",
  gestion_cultural: "Gestión cultural",
  gestion_social: "Gestión social",
  innovacion: "Innovación",
  soluciones_naturaleza: "Soluciones basadas en la naturaleza",
  lectura_educacion: "Educación y lectura",
};

export interface DetectedSector {
  key: SectorKey;
  label: string;
  evidence: string[];
  confidence: "alta" | "media" | "baja";
}
export interface CausalModel {
  changeSynthesis: string;
  counterfactual: string;
  problem: string;
  causes: string[];
  population: string;
  territory: string;
  gaps: string[];
  activities: string[];
  outputs: string[];
  outcomes: string[];
  impact: string;
  assumptions: string[];
  /** Equipo, dinero, alianzas y conocimiento con los que cuenta el proyecto. */
  resources: string[];
  /** Condición bajo la cual cada paso de la cadena produce el siguiente. Vacío = por confirmar. */
  linkAssumptions: Record<CausalLinkKey, string>;
  risks: string[];
  externalFactors: string[];
  preliminaryTheoryOfChange: string;
  consolidatedTheoryOfChange: string | null;
  evidenceStatus: EvidenceStatus;
  warnings: string[];
}
export interface OdsAlignment {
  id: string;
  role: "principal" | "secundaria";
  goalNumber: number;
  goalTitle: string;
  targetCode: string;
  officialTargetText: string;
  officialIndicatorCodes: string[];
  contributionType: ContributionType;
  causalRationale: string;
  compatibilityAssessment: string;
  localProxy: string | null;
  sourceVersion: string;
  reviewStatus: OdsReviewStatus;
}
export interface IndicatorTarget {
  value: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  unit: string;
  targetDate: string;
  targetPopulation: string;
  targetTerritory: string;
  baselineReference: string;
  baselineValue: number | null;
  baselineDate: string;
  determinationMethod: DeterminationMethod;
  benchmarkReference: string;
  evidenceSource: string;
  calculationRule: string;
  assumptions: string;
  enteredBy: string;
  responsibleApprover: string;
  approvedAt: string;
  validationStatus: TargetValidationStatus;
  explicitZero: boolean;
}
export interface IndicatorReview {
  verdict: ReviewVerdict;
  reasons: string[];
}

export interface BaselinePlan {
  timing: string;
  method: string;
  instrument: string;
  variables: string[];
  samplingGuidance: string;
  analysisGuidance: string;
  requiredBeforeTarget: boolean;
}

export interface InternationalReference {
  organization: string;
  framework: string;
  url: string;
  use: string;
}

export interface BidReference {
  code: string;
  title: string;
  sectors: SectorKey[];
  use: string;
  scope: string;
}

export interface ColombiaReference {
  source: string;
  title: string;
  sectors: SectorKey[];
  url: string;
  use: string;
  geography: string;
}

export interface Indicator {
  id: string;
  name: string;
  level: CausalLevel;
  observedChange: string;
  decisionInformed: string;
  dimension: Dimension;
  crossCuttingApproaches: string[];
  sphere: Sphere;
  horizon: Horizon;
  population: string;
  territory: string;
  unit: string;
  orientation: Orientation;
  /** Por qué el éxito va en ese sentido. Obligatoria cuando no es ascendente. */
  orientationRationale: string;
  /** Código propio de la fundación; es la llave para cruzar con otras herramientas de reporte. */
  institutionalCode: string;
  /** Identificadores de los marcos institucionales a los que reporta el indicador. */
  frameworkIds: string[];
  accumulation: "acumulado" | "no_acumulado" | "flujo";
  numerator: string;
  denominator: string;
  formula: string;
  disaggregations: string[];
  primarySource: string;
  secondarySource: string;
  instrument: string;
  technique: string;
  frequency: string;
  responsible: string;
  measurementBurden: MeasurementBurden;
  qualityRisks: string[];
  biases: string[];
  externalFactors: string[];
  attributionLimits: string;
  safeguards: string[];
  evidenceStatus: EvidenceStatus;
  pendingIssues: string[];
  isGuardrail: boolean;
  decision: IndicatorDecision;
  review: IndicatorReview;
  recommendationTier: "esencial" | "complementario" | "salvaguarda";
  recommendationRationale: string;
  projectEvidence: string[];
  baselinePlan: BaselinePlan;
  internationalReferences: InternationalReference[];
  bidReferences: BidReference[];
  colombiaReferences: ColombiaReference[];
  odsAlignments: OdsAlignment[];
  target: IndicatorTarget;
}
export interface AnalysisWarning {
  field: string;
  message: string;
}
export interface OpenQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  answer: string;
}
export type ClimateAlignmentType =
  "no_material" | "mitigacion" | "adaptacion" | "mitigacion_y_adaptacion";
export interface ClimateAlignment {
  materiality: "pendiente" | "material" | "no_material";
  alignmentType: ClimateAlignmentType;
  alignmentAreas: string[];
  causalRationale: string;
  emissionsMetric: string;
  evidenceStatus: EvidenceStatus;
  reviewStatus: OdsReviewStatus;
  sourceVersion: string;
  sourceUrl: string;
}

export interface LogicalFrameworkIssue {
  severity: "critico" | "importante" | "mejora";
  area: string;
  message: string;
  action: string;
}

export type RuleId =
  | "poblacion"
  | "territorio"
  | "logicaVertical"
  | "cobertura"
  | "lineaBase"
  | "ods"
  | "atribucion"
  | "sentidoExito"
  | "supuestosEnlace"
  | "productoResultado"
  | "smart";

export interface RuleDefinition {
  id: RuleId;
  label: string;
  description: string;
}

/** Lineamientos con los que se valida el marco lógico. Son reglas fijas y visibles, no una IA. */
export const RULE_DEFINITIONS: RuleDefinition[] = [
  { id: "poblacion", label: "Población objetivo", description: "El proyecto identifica quién participa o se beneficia." },
  { id: "territorio", label: "Territorio", description: "La unidad territorial de análisis está confirmada." },
  { id: "logicaVertical", label: "Lógica vertical", description: "Hay un mínimo de actividades, productos y resultados que sostienen la cadena causal." },
  { id: "cobertura", label: "Cobertura causal", description: "La batería tiene un mínimo de indicadores en cada nivel: gestión, producto, resultado e impacto." },
  { id: "lineaBase", label: "Plan de línea base", description: "Cada indicador tiene método e instrumento para medir el punto de partida." },
  { id: "ods", label: "Trazabilidad ODS", description: "Al menos un indicador se vincula a una meta ODS y toda relación tiene justificación causal." },
  { id: "atribucion", label: "Control de atribución", description: "Los indicadores de impacto declaran factores externos y límites de atribución." },
  { id: "sentidoExito", label: "Sentido de éxito", description: "Todo indicador cuyo éxito no sea aumentar explica por escrito por qué, y su meta es coherente con ese sentido." },
  { id: "supuestosEnlace", label: "Supuestos por enlace", description: "Cada paso de la cadena (actividades a productos, productos a resultados, resultados a impacto) explica bajo qué condición se espera el cambio." },
  { id: "productoResultado", label: "Productos y resultados separados", description: "Ningún resultado describe en realidad una entrega, cobertura o asistencia." },
  { id: "smart", label: "Indicadores SMART", description: "Cada indicador seleccionado es específico, medible, alcanzable, relevante y tiene momento de medición." },
];

export interface RuleSetting {
  enabled: boolean;
  /** Razón escrita para no aplicar la regla en este proyecto. */
  justification: string;
}

export interface LogicalFrameworkRules {
  rules: Record<RuleId, RuleSetting>;
  /** Mínimo de actividades, productos y resultados para la lógica vertical. */
  minChainItems: number;
  /** Mínimo de indicadores por nivel para la cobertura causal. */
  minByLevel: Record<CausalLevel, number>;
}

export function defaultRules(): LogicalFrameworkRules {
  return {
    rules: Object.fromEntries(
      RULE_DEFINITIONS.map((rule) => [rule.id, { enabled: true, justification: "" }]),
    ) as Record<RuleId, RuleSetting>,
    minChainItems: 2,
    minByLevel: { gestion: 2, producto: 2, resultado: 2, impacto: 1 },
  };
}

export interface InstitutionalFramework {
  id: string;
  name: string;
  description: string;
  /** Niveles causales que se asignan a este marco como sugerencia inicial. */
  suggestedLevels: CausalLevel[];
  /** Si el proyecto actual reporta a este marco. */
  active: boolean;
}

/**
 * Catálogo inicial de marcos de la fundación. Es un punto de partida editable:
 * los nombres y los niveles sugeridos deben ajustarse a la codificación real.
 */
export function defaultFrameworks(): InstitutionalFramework[] {
  return [
    { id: "cmi", name: "Cuadro de mando integral", description: "Indicadores estratégicos de la organización.", suggestedLevels: ["resultado", "impacto"], active: true },
    { id: "plan_accion", name: "Plan de Acción", description: "Compromisos y entregables del periodo.", suggestedLevels: ["gestion", "producto"], active: true },
    { id: "seguimiento_gestion", name: "Seguimiento a la gestión", description: "Ejecución operativa y cumplimiento.", suggestedLevels: ["gestion"], active: true },
    { id: "teoria_cambio", name: "Teoría del cambio", description: "Cambios esperados en personas, instituciones o territorios.", suggestedLevels: ["resultado", "impacto"], active: true },
  ];
}

export interface PlatformSettings {
  frameworks: InstitutionalFramework[];
  rules: LogicalFrameworkRules;
}

export function defaultSettings(): PlatformSettings {
  return { frameworks: defaultFrameworks(), rules: defaultRules() };
}

export type CheckStatus = "cumple" | "revisar" | "exenta";

export interface LogicalFrameworkCheck {
  id: RuleId;
  label: string;
  status: CheckStatus;
}

export interface LogicalFrameworkReview {
  status: "coherente" | "requiere_ajustes" | "incompleto";
  strengths: string[];
  issues: LogicalFrameworkIssue[];
  checks: LogicalFrameworkCheck[];
  /** Reglas que el equipo decidió no aplicar, con su justificación. */
  exemptions: { rule: string; justification: string }[];
}

export interface SessionAnalysis {
  detectedSectors: DetectedSector[];
  causal: CausalModel;
  indicators: Indicator[];
  climateAlignment: ClimateAlignment;
  logicalFrameworkReview: LogicalFrameworkReview;
  questions: OpenQuestion[];
  warnings: AnalysisWarning[];
  origin: "motor_local" | "demostracion";
  generatedAt: string;
}

export const CROSS_CUTTING_OPTIONS = [
  "Género",
  "Edad",
  "Discapacidad",
  "Pertenencia étnica",
  "Procedencia",
  "Ruralidad",
  "Situación socioeconómica",
];
export function emptyTarget(): IndicatorTarget {
  return {
    value: null,
    lowerBound: null,
    upperBound: null,
    unit: "",
    targetDate: "",
    targetPopulation: "",
    targetTerritory: "",
    baselineReference: "",
    baselineValue: null,
    baselineDate: "",
    determinationMethod: "pendiente",
    benchmarkReference: "",
    evidenceSource: "",
    calculationRule: "",
    assumptions: "",
    enteredBy: "",
    responsibleApprover: "",
    approvedAt: "",
    validationStatus: "pendiente",
    explicitZero: false,
  };
}

export type CausalLinkKey = "actividad_producto" | "producto_resultado" | "resultado_impacto";
export const CAUSAL_LINK_LABELS: Record<CausalLinkKey, string> = {
  actividad_producto: "De actividades a productos",
  producto_resultado: "De productos a resultados",
  resultado_impacto: "De resultados a impacto",
};
export function emptyLinkAssumptions(): Record<CausalLinkKey, string> {
  return { actividad_producto: "", producto_resultado: "", resultado_impacto: "" };
}

export type SmartCriterion = "S" | "M" | "A" | "R" | "T";
export const SMART_LABELS: Record<SmartCriterion, string> = {
  S: "Específico",
  M: "Medible",
  A: "Alcanzable",
  R: "Relevante",
  T: "Con tiempo definido",
};
export interface SmartAssessment {
  criteria: Record<SmartCriterion, { ok: boolean; reason: string }>;
  /** Criterios que no se cumplen. No hay puntaje: un solo fallo pide corregir. */
  failed: SmartCriterion[];
}
