/**
 * Conceptos que suelen aparecer en los proyectos y cómo se vuelven medibles.
 *
 * Es una guía para definir la medición, no un dato medido: indica qué
 * dimensiones observar y qué marco de referencia consultar. Los valores de
 * comparación deben tomarse de la fuente oficial en el momento de usarlos.
 */

export interface ConceptReference {
  key: string;
  label: string;
  /** Términos con los que se reconoce el concepto en el texto del proyecto. */
  keywords: string[];
  meaning: string;
  /** Qué observar para medirlo a escala de proyecto. */
  dimensions: string[];
  /** Ejemplo de indicador de resultado a escala de proyecto. */
  exampleIndicator: string;
  /** Marcos de referencia reconocidos para definir y comparar. */
  frameworks: string[];
}

export const CONCEPT_CATALOG: ConceptReference[] = [
  {
    key: "cohesion_social",
    label: "Cohesión social",
    keywords: ["cohesion social", "tejido social", "convivencia", "confianza", "sentido de pertenencia", "fortalecimiento comunitario"],
    meaning: "Qué tanto las personas confían entre sí y en sus instituciones, se sienten parte de la comunidad y actúan juntas.",
    dimensions: ["Confianza entre vecinos y en las instituciones", "Sentido de pertenencia", "Participación en acciones colectivas", "Percepción de inclusión"],
    exampleIndicator: "Porcentaje de participantes que reportan mayor confianza para trabajar con sus vecinos, medido con encuesta antes y después.",
    frameworks: ["CEPAL: Cohesión social, inclusión y sentido de pertenencia en América Latina y el Caribe", "ODS 16.7.2: población que considera inclusiva y participativa la toma de decisiones"],
  },
  {
    key: "resiliencia",
    label: "Resiliencia",
    keywords: ["resiliencia", "resiliente", "adaptacion", "gestion del riesgo", "capacidad de respuesta", "recuperacion"],
    meaning: "Capacidad de una comunidad o un hogar para anticipar, resistir y recuperarse de una crisis sin perder sus medios de vida.",
    dimensions: ["Acceso a servicios básicos", "Activos y medios de vida", "Redes de apoyo", "Capacidad de adaptación"],
    exampleIndicator: "Porcentaje de hogares u organizaciones que aplican al menos una práctica de preparación o adaptación promovida por el proyecto.",
    frameworks: ["BID, Marco de Impacto 2.1: personas con mayor resiliencia frente a desastres y choques climáticos", "FAO: RIMA-II, medición y análisis del índice de resiliencia", "Marco de Sendai para la Reducción del Riesgo de Desastres", "ODS 1.5 y 13.1"],
  },
  {
    key: "participacion",
    label: "Participación comunitaria",
    keywords: ["participacion", "iniciativas comunitarias", "organizaciones sociales", "liderazgo", "veeduria", "juntas de accion"],
    meaning: "Qué tanto la comunidad decide, propone y sostiene las acciones, más allá de asistir a ellas.",
    dimensions: ["Asistencia sostenida", "Iniciativas propuestas por la comunidad", "Organizaciones fortalecidas", "Decisiones tomadas con la comunidad"],
    exampleIndicator: "Número de iniciativas comunitarias formuladas y en marcha seis meses después del acompañamiento.",
    frameworks: ["ODS 16.7.2", "ODS 11.3.2: participación de la sociedad civil en la planificación"],
  },
  {
    key: "apropiacion",
    label: "Apropiación de conocimientos y prácticas",
    keywords: ["apropiacion", "sensibilizacion", "concientizacion", "educacion ambiental", "uso eficiente", "cultura", "habitos"],
    meaning: "Qué tanto las personas entienden, valoran y aplican en su vida lo que el proyecto enseñó.",
    dimensions: ["Conocimiento adquirido", "Cambio de actitud", "Práctica aplicada", "Permanencia de la práctica en el tiempo"],
    exampleIndicator: "Porcentaje de participantes que aplican al menos una práctica enseñada, verificado tres meses después.",
    frameworks: ["ODS 4.7 y 12.8: educación e información para el desarrollo sostenible", "UNESCO: Educación para el Desarrollo Sostenible"],
  },
];

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function detectConcepts(text: string): ConceptReference[] {
  const value = plain(text);
  return CONCEPT_CATALOG.filter((concept) => concept.keywords.some((keyword) => value.includes(keyword)));
}
