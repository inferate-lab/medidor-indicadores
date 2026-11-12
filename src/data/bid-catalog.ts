import type { BidReference, SectorKey } from "@/types/medidor";

/**
 * Referencias del Marco de Impacto BID 2024-2030. Son un puente de contexto
 * y comparabilidad; no sustituyen el indicador ni la línea base del proyecto.
 */
export const BID_CATALOG_SOURCE = {
  name: "BID Group Impact Framework Portfolio Results 2024-2030",
  url: "https://data.iadb.org/dataset/idb-group-impact-framework-portfolio-results-dataset",
  version: "Marco de Impacto BID 2024-2030",
  consultedAt: "2026-09-30",
} as const;

export const BID_REFERENCES: BidReference[] = [
  {
    code: "2.1",
    title: "Personas con mayor resiliencia y protección financiera frente a desastres y choques climáticos",
    sectors: ["medio_ambiente", "soluciones_naturaleza", "educacion_ambiental"],
    use: "Referencia para proyectos que fortalecen resiliencia frente a riesgos climáticos; requiere definir el riesgo y el mecanismo local.",
    scope: "Resultado de cartera BID. No permite atribuir al proyecto cambios territoriales amplios sin evaluación adicional.",
  },
  {
    code: "2.2",
    title: "Emisiones de gases de efecto invernadero evitadas",
    sectors: ["medio_ambiente", "soluciones_naturaleza", "innovacion"],
    use: "Referencia para proyectos con un mecanismo verificable de mitigación, actividad medible, escenario de referencia y factor de emisión.",
    scope: "No usar para educación ambiental o reciclaje si no existe un método de cuantificación de emisiones.",
  },
  {
    code: "2.3",
    title: "Área bajo gestión sostenible",
    sectors: ["medio_ambiente", "soluciones_naturaleza"],
    use: "Referencia para restauración, infraestructura verde, conservación y soluciones basadas en la naturaleza.",
    scope: "La unidad debe ser área georreferenciada; no confundir área intervenida con área que mantiene gestión sostenible.",
  },
  {
    code: "2.5",
    title: "Países con mejor gestión del riesgo de desastres o gobernanza del cambio climático",
    sectors: ["medio_ambiente", "gestion_social", "soluciones_naturaleza"],
    use: "Referencia para fortalecimiento institucional o gobernanza climática; a escala local se requiere un proxy de capacidades o acuerdos activos.",
    scope: "Indicador de escala país. Un proyecto local solo puede reportar contribución, no el resultado BID.",
  },
  {
    code: "2.6",
    title: "Personas beneficiadas por mayor igualdad de género o inclusión de grupos diversos",
    sectors: ["gestion_social", "gestion_cultural", "educacion_ambiental", "lectura_educacion"],
    use: "Referencia para desagregar cobertura y, además, medir cambios en acceso, participación, poder de decisión o barreras.",
    scope: "No basta con contar participantes por sexo; debe evidenciarse un beneficio o una barrera resuelta.",
  },
  {
    code: "2.10",
    title: "Agencias y organizaciones del sector privado con capacidad digital fortalecida",
    sectors: ["ciencia", "innovacion"],
    use: "Referencia para innovación, tecnología y fortalecimiento de capacidades organizacionales.",
    scope: "Usar solo cuando la unidad de cambio sea una organización, no únicamente participantes individuales.",
  },
  {
    code: "2.12",
    title: "Personas beneficiadas por programas de desarrollo infantil, escolarización, educación y desarrollo de habilidades de calidad",
    sectors: ["ciencia", "innovacion", "lectura_educacion", "educacion_ambiental"],
    use: "Referencia para educación, lectura, STEM y formación; acompañar cobertura con una medida de aprendizaje o aplicación.",
    scope: "El conteo de personas atendidas es producto; no sustituye la medición de competencias, uso o aprendizaje.",
  },
  {
    code: "2.18",
    title: "Personas con acceso nuevo o mejorado a agua potable gestionada de forma segura y/o saneamiento",
    sectors: ["medio_ambiente", "educacion_ambiental"],
    use: "Referencia para agua y saneamiento; verificar funcionamiento, disponibilidad y condiciones de seguridad de la solución.",
    scope: "No equiparar instalación o entrega de equipos con acceso efectivo y seguro.",
  },
];

const BID_BY_INDICATOR: Record<string, string[]> = {
  g_participation: ["2.6"],
  g_sustainability: ["2.10"],
  env_area: ["2.3"],
  env_condition: ["2.1", "2.3"],
  learning_gain: ["2.12"],
  learning_application: ["2.12"],
  science_use: ["2.10"],
  social_agency: ["2.6"],
  social_institutional_use: ["2.10"],
  innovation_adoption: ["2.10"],
  innovation_value: ["2.10"],
  nbs_sites_functional: ["2.3"],
  nbs_area: ["2.3"],
  nbs_functionality: ["2.1", "2.3"],
  nbs_stewardship: ["2.5"],
  reading_completion: ["2.12"],
  reading_comprehension: ["2.12"],
  reading_habit: ["2.12"],
  reading_mediators: ["2.12"],
  water_access: ["2.18"],
};

export function bidReferencesForIndicator(templateId: string, sectors: SectorKey[]): BidReference[] {
  const active = new Set(sectors);
  const codes = BID_BY_INDICATOR[templateId] ?? [];
  return BID_REFERENCES.filter(
    (reference) => codes.includes(reference.code) && reference.sectors.some((sector) => active.has(sector)),
  );
}

/** Catálogo de indicadores de Datos Abiertos del BID, consultado el 11 de noviembre de 2026. */
export const BID_INDICATOR_CATALOG_URL = "https://data.iadb.org/es/indicator-catalog";

export interface BidCountryCategory {
  /** Nombre exacto de la categoría en el catálogo del BID. */
  category: string;
  label: string;
  sectors: SectorKey[];
}

/**
 * Categorías de "Social Indicators of Latin America and the Caribbean". Son
 * indicadores de país: sirven de contexto y comparación, no miden el proyecto.
 */
export const BID_COUNTRY_CATEGORIES: BidCountryCategory[] = [
  { category: "Education", label: "Educación", sectors: ["lectura_educacion", "ciencia", "educacion_ambiental", "innovacion"] },
  { category: "Poverty and inequality", label: "Pobreza y desigualdad", sectors: ["gestion_social"] },
  { category: "Gender and diversity", label: "Género y diversidad", sectors: ["gestion_social", "gestion_cultural"] },
  { category: "Housing", label: "Vivienda y servicios (agua, saneamiento, energía)", sectors: ["medio_ambiente", "soluciones_naturaleza"] },
  { category: "Employment and social security", label: "Empleo y seguridad social", sectors: ["innovacion", "gestion_social"] },
];

export function bidCategoryUrl(category: string): string {
  return `https://data.iadb.org/es/dataset/?type=indicator&vocab_indicator_categories=${encodeURIComponent(category).replace(/%20/g, "+")}`;
}

/** Referencias del BID pertinentes para los temas detectados en un proyecto. */
export function bidReferencesForSectors(sectors: SectorKey[]): {
  framework: BidReference[];
  countryCategories: BidCountryCategory[];
} {
  const active = new Set(sectors);
  return {
    framework: BID_REFERENCES.filter((reference) => reference.sectors.some((sector) => active.has(sector))).slice(0, 4),
    countryCategories: BID_COUNTRY_CATEGORIES.filter((item) => item.sectors.some((sector) => active.has(sector))).slice(0, 3),
  };
}
