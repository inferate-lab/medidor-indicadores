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
  orientation: "ascendente" | "descendente" | "estable";
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

export interface LogicalFrameworkReview {
  status: "coherente" | "requiere_ajustes" | "incompleto";
  strengths: string[];
  issues: LogicalFrameworkIssue[];
  checks: {
    verticalLogic: boolean;
    indicatorCoverage: boolean;
    baselineReadiness: boolean;
    odsTraceability: boolean;
    attributionControl: boolean;
  };
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
