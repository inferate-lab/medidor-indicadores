/**
 * Rutas de contribución a los ODS: cómo un tipo de actividad aporta a una meta
 * concreta y con qué indicador de proyecto se puede observar ese aporte.
 *
 * Cada ruta une tres piezas que antes estaban separadas:
 * 1. Las palabras con las que se reconoce la actividad en el Excel o el documento.
 * 2. La meta ODS y su indicador global oficial (que mide a escala de país).
 * 3. Un indicador de proyecto que sí se puede medir y que se acerca al global.
 *
 * Es una guía revisable: el indicador de proyecto no reemplaza el indicador
 * global ni permite atribuir al proyecto el avance del país.
 */

import { targetEvidenceSupported } from "@/lib/ods-evidence";
import type { BaselinePlan, CausalLevel, Dimension, SectorKey } from "@/types/medidor";

export interface OdsPathway {
  id: string;
  targetCode: string;
  theme: string;
  /** Palabras que identifican la actividad (sin tildes, en minúscula). */
  keywords: string[];
  /** Palabras que, si aparecen, descartan la coincidencia (evitan falsos positivos). */
  exclude?: string[];
  sectors: SectorKey[];
  dimension: Dimension;
  /** Indicador global oficial más cercano. Mide a escala de país. */
  globalIndicator: { code: string; name: string };
  /** Qué del aporte ya se puede contar con el plan de actividades. */
  output: { name: string; note: string };
  /** Indicador de resultado del proyecto que se acerca al indicador global. */
  outcome: {
    name: string;
    level: CausalLevel;
    observedChange: string;
    unit: string;
    numerator: string;
    denominator: string;
    instrument: string;
    technique: string;
    frequency: string;
    baseline: BaselinePlan;
  };
  /** Por qué el indicador de proyecto se acerca al global, y hasta dónde. */
  bridge: string;
}

const prePost = (construct: string, instrument: string): BaselinePlan => ({
  timing: "Antes de la primera actividad con el grupo y al cerrar el ciclo de la intervención.",
  method: `Medición inicial y final de ${construct} en las mismas personas o grupos.`,
  instrument,
  variables: [construct, "Grupo o institución", "Territorio", "Sexo y edad si se registran"],
  samplingGuidance: "Censo si el grupo es pequeño; si se usa muestra, documentar universo y selección.",
  analysisGuidance: "Comparar el mismo grupo antes y después; reportar pérdidas de seguimiento.",
  requiredBeforeTarget: true,
});

const inventory = (subject: string, instrument: string): BaselinePlan => ({
  timing: "Antes de intervenir y al finalizar cada instalación o intervención.",
  method: `Verificación del estado inicial de ${subject}.`,
  instrument,
  variables: [subject, "Estado funcional", "Ubicación", "Responsable"],
  samplingGuidance: "Censo de los sitios intervenidos; no estimar faltantes como cero.",
  analysisGuidance: "Separar instalado, funcionando y en uso efectivo.",
  requiredBeforeTarget: true,
});

export const ODS_PATHWAYS: OdsPathway[] = [
  {
    id: "agua_potable",
    targetCode: "6.1",
    theme: "Acceso a agua potable segura",
    keywords: ["agua potable", "potabilizacion", "potabilizadora", "solucion de pot", "cuarto tecnico", "filtro", "calidad del agua", "toma de muestra"],
    sectors: ["medio_ambiente"],
    dimension: "social",
    globalIndicator: { code: "6.1.1", name: "Proporción de la población que utiliza servicios de suministro de agua potable gestionados sin riesgos" },
    output: { name: "Soluciones de agua potable instaladas y en funcionamiento", note: "Cuenta instalaciones y puestas en marcha registradas en el plan." },
    outcome: {
      name: "Personas con acceso a agua potable segura gracias a las soluciones instaladas",
      level: "resultado",
      observedChange: "Las personas de las sedes intervenidas consumen agua que cumple los parámetros de calidad.",
      unit: "Número de personas",
      numerator: "Personas que usan las soluciones instaladas y funcionando con agua apta para consumo verificada",
      denominator: "No aplica",
      instrument: "Registro de sedes intervenidas con matrícula o usuarios y resultado de análisis de calidad del agua",
      technique: "Verificación en sitio y prueba de laboratorio",
      frequency: "Semestral",
      baseline: inventory("las fuentes y la calidad del agua en cada sede", "Ficha técnica de la sede y análisis de calidad inicial"),
    },
    bridge: "El indicador global cuenta población con agua gestionada sin riesgos; el proyecto aporta las personas de las sedes intervenidas, verificando calidad, no solo instalación.",
  },
  {
    id: "agua_gestion_comunitaria",
    targetCode: "6.b",
    theme: "Participación comunitaria en la gestión del agua",
    keywords: ["comite del agua", "comites de agua", "acueducto comunitario", "acueductos comunitarios", "gestion comunitaria del agua", "operacion y mantenimiento", "autogestion"],
    sectors: ["medio_ambiente", "gestion_social"],
    dimension: "institucional",
    globalIndicator: { code: "6.b.1", name: "Proporción de dependencias administrativas locales con políticas y procedimientos para la participación de las comunidades locales en la gestión del agua y el saneamiento" },
    output: { name: "Espacios de gestión comunitaria del agua acompañados", note: "Cuenta comités, encuentros y capacitaciones de operación registrados." },
    outcome: {
      name: "Comunidades o sedes que operan y mantienen su solución de agua con un responsable y plan activos",
      level: "resultado",
      observedChange: "La comunidad asume la operación y el mantenimiento de su solución de agua sin depender del proyecto.",
      unit: "Número de comunidades o sedes",
      numerator: "Comunidades o sedes con comité o responsable activo y plan de mantenimiento cumplido",
      denominator: "No aplica",
      instrument: "Lista de chequeo de autogestión (responsable, registros de mantenimiento, recursos)",
      technique: "Visita de verificación",
      frequency: "Semestral",
      baseline: inventory("la organización comunitaria para la gestión del agua", "Lista de chequeo de autogestión"),
    },
    bridge: "La meta pide fortalecer la participación local en la gestión del agua; el proyecto lo observa en comunidades que sostienen la operación por sí mismas.",
  },
  {
    id: "agua_uso_eficiente",
    targetCode: "6.4",
    theme: "Uso eficiente y cuidado del agua",
    keywords: ["uso eficiente del agua", "uso racional del agua", "ahorro de agua", "cuidado del agua", "recurso hidrico", "guardianes del agua"],
    exclude: ["potabiliz"],
    sectors: ["medio_ambiente", "educacion_ambiental"],
    dimension: "ambiental",
    globalIndicator: { code: "6.4.1", name: "Cambio en la eficiencia del uso del agua con el tiempo" },
    output: { name: "Actividades de cuidado del agua realizadas", note: "Cuenta encuentros, campañas y talleres sobre el agua registrados." },
    outcome: {
      name: "Porcentaje de participantes que aplican prácticas de ahorro y cuidado del agua",
      level: "resultado",
      observedChange: "Las personas y sedes reducen el desperdicio de agua en su vida cotidiana.",
      unit: "Porcentaje de participantes",
      numerator: "Participantes que aplican al menos dos prácticas de ahorro verificadas",
      denominator: "Participantes encuestados",
      instrument: "Encuesta corta de prácticas o lectura de consumo cuando exista medidor",
      technique: "Encuesta antes y después",
      frequency: "Al inicio y al cierre",
      baseline: prePost("las prácticas de uso del agua", "Encuesta de prácticas de uso del agua"),
    },
    bridge: "El indicador global mide eficiencia del agua en la economía; el proyecto aporta el cambio de prácticas de las personas, no la eficiencia nacional.",
  },
  {
    id: "educacion_ambiental",
    targetCode: "12.8",
    theme: "Educación y sensibilización ambiental",
    keywords: ["educacion ambiental", "sensibilizacion", "concientizacion", "talleres pedagogicos", "talleres ambientales", "acciones pedagogicas", "practicas ambientales", "campanas", "socioambiental"],
    sectors: ["educacion_ambiental", "medio_ambiente"],
    dimension: "ambiental",
    globalIndicator: { code: "12.8.1", name: "Grado en que la educación para la ciudadanía mundial y la educación para el desarrollo sostenible se incorporan en políticas, planes de estudio, formación docente y evaluación" },
    output: { name: "Actividades de educación ambiental y asistencias", note: "Cuenta talleres, campañas y procesos formativos ambientales y sus asistencias." },
    outcome: {
      name: "Porcentaje de participantes que adoptan al menos una práctica ambiental tres meses después",
      level: "resultado",
      observedChange: "Las personas pasan de conocer a aplicar prácticas ambientales en su hogar, escuela u organización.",
      unit: "Porcentaje de participantes",
      numerator: "Participantes que aplican al menos una práctica ambiental verificada",
      denominator: "Participantes con seguimiento",
      instrument: "Encuesta de seguimiento o visita de verificación",
      technique: "Seguimiento a una muestra de participantes",
      frequency: "Tres meses después de cada ciclo",
      baseline: prePost("las prácticas ambientales", "Encuesta de prácticas ambientales"),
    },
    bridge: "La meta 12.8 busca que las personas tengan la información y los conocimientos para estilos de vida sostenibles; el proyecto lo observa en la práctica adoptada, más allá de la asistencia.",
  },
  {
    id: "escuelas_eds",
    targetCode: "4.7",
    theme: "Educación para el desarrollo sostenible en instituciones educativas",
    keywords: ["instituciones educativas", "institucion educativa", "estudiantes", "docentes", "hidroprofes", "colegio", "escuela", "diplomado", "prae"],
    sectors: ["educacion_ambiental", "lectura_educacion", "ciencia"],
    dimension: "social",
    globalIndicator: { code: "4.7.1", name: "Grado en que la educación para la ciudadanía mundial y la educación para el desarrollo sostenible se incorporan en políticas, planes de estudio, formación docente y evaluación" },
    output: { name: "Actividades con instituciones educativas, docentes y estudiantes", note: "Cuenta encuentros, formaciones y talleres con la comunidad educativa." },
    outcome: {
      name: "Instituciones educativas que incorporan la temática ambiental en su plan de estudios o proyecto escolar",
      level: "resultado",
      observedChange: "La escuela integra la educación para el desarrollo sostenible en su práctica regular, no solo en la actividad del proyecto.",
      unit: "Número de instituciones educativas",
      numerator: "Instituciones con el tema incorporado en plan de estudios, PRAE o proyecto transversal verificado",
      denominator: "No aplica",
      instrument: "Revisión documental del plan de estudios o PRAE y entrevista con docentes",
      technique: "Revisión documental",
      frequency: "Anual",
      baseline: inventory("la incorporación del tema en cada institución", "Ficha de revisión del plan de estudios o PRAE"),
    },
    bridge: "El indicador global mide la incorporación de la educación para el desarrollo sostenible en planes de estudio y formación docente; el proyecto lo observa en las instituciones que acompaña.",
  },
  {
    id: "energia_eficiente",
    targetCode: "7.3",
    theme: "Uso eficiente de la energía",
    keywords: ["uso eficiente de la energia", "ahorro de energia", "eficiencia energetica", "uso responsable de la energia", "uso seguro de la energia", "educacion a clientes", "consumo responsable"],
    sectors: ["medio_ambiente"],
    dimension: "ambiental",
    globalIndicator: { code: "7.3.1", name: "Intensidad energética medida en función de la energía primaria y el PIB" },
    output: { name: "Charlas y talleres de uso eficiente de la energía y asistencias", note: "Cuenta las actividades educativas con usuarios y sus asistencias." },
    outcome: {
      name: "Porcentaje de hogares participantes que aplican prácticas de ahorro de energía",
      level: "resultado",
      observedChange: "Los hogares reducen consumos innecesarios y usan la energía de forma segura.",
      unit: "Porcentaje de hogares",
      numerator: "Hogares que aplican al menos dos prácticas de ahorro verificadas",
      denominator: "Hogares con seguimiento",
      instrument: "Encuesta de prácticas o comparación de consumo facturado cuando esté disponible",
      technique: "Encuesta antes y después",
      frequency: "Seis meses después de la actividad",
      baseline: prePost("las prácticas de uso de la energía", "Encuesta de prácticas de consumo"),
    },
    bridge: "El indicador global es nacional (intensidad energética); el proyecto aporta el cambio de prácticas de los hogares, que no puede compararse con la cifra del país.",
  },
  {
    id: "organizaciones_productivas",
    targetCode: "8.3",
    theme: "Fortalecimiento de organizaciones productivas y emprendimiento",
    keywords: ["organizaciones productivas", "plan de negocio", "actividades economicas", "emprendimiento", "unidades productivas", "giras pedagogicas", "comercializacion", "productores"],
    sectors: ["innovacion", "gestion_social"],
    dimension: "economica",
    globalIndicator: { code: "8.3.1", name: "Proporción de empleo informal en el empleo total, desglosada por sector y sexo" },
    output: { name: "Organizaciones o unidades productivas acompañadas", note: "Cuenta diagnósticos, planes de negocio y acompañamientos registrados." },
    outcome: {
      name: "Organizaciones productivas que implementan su plan de negocio y aumentan sus ventas o ingresos",
      level: "resultado",
      observedChange: "Las organizaciones ponen en marcha su plan y mejoran su actividad económica.",
      unit: "Número de organizaciones",
      numerator: "Organizaciones con al menos una acción del plan en marcha y ventas o ingresos superiores a la línea base",
      denominator: "No aplica",
      instrument: "Ficha de seguimiento del plan de negocio con registro de ventas o ingresos",
      technique: "Visita y revisión de registros",
      frequency: "Semestral",
      baseline: inventory("la situación económica de cada organización", "Diagnóstico inicial de la organización"),
    },
    bridge: "El indicador global mide informalidad laboral nacional; el proyecto aporta organizaciones fortalecidas, que es un paso hacia la formalización, no su medida.",
  },
  {
    id: "restauracion",
    targetCode: "15.3",
    theme: "Restauración de ecosistemas",
    keywords: ["restauracion ecologica", "restauracion", "reforestacion", "siembra", "arboles", "viveros", "recuperacion de suelos", "conservacion de bosque"],
    sectors: ["medio_ambiente", "soluciones_naturaleza"],
    dimension: "ambiental",
    globalIndicator: { code: "15.3.1", name: "Proporción de tierras degradadas en comparación con la superficie total" },
    output: { name: "Jornadas y talleres de restauración realizados", note: "Cuenta las actividades de restauración registradas." },
    outcome: {
      name: "Hectáreas en proceso de restauración con supervivencia verificada",
      level: "resultado",
      observedChange: "Las áreas intervenidas recuperan cobertura vegetal y se mantienen en el tiempo.",
      unit: "Hectáreas",
      numerator: "Hectáreas intervenidas con supervivencia de la siembra igual o superior al umbral definido",
      denominator: "No aplica",
      instrument: "Georreferenciación de polígonos y monitoreo de supervivencia",
      technique: "Visita de campo con parcelas de monitoreo",
      frequency: "Semestral",
      baseline: inventory("el estado de cobertura de las áreas", "Georreferenciación y registro fotográfico inicial"),
    },
    bridge: "El indicador global mide tierras degradadas; el proyecto aporta hectáreas que se recuperan, verificando supervivencia y no solo siembra.",
  },
  {
    id: "residuos",
    targetCode: "12.5",
    theme: "Reducción, reciclaje y aprovechamiento de residuos",
    keywords: ["residuos", "reciclaje", "reciclados", "aprovechamiento", "separacion en la fuente", "compostaje", "economia circular"],
    sectors: ["medio_ambiente", "educacion_ambiental"],
    dimension: "ambiental",
    globalIndicator: { code: "12.5.1", name: "Tasa nacional de reciclado, en toneladas de material reciclado" },
    output: { name: "Actividades de manejo de residuos realizadas", note: "Cuenta jornadas, talleres y campañas de residuos." },
    outcome: {
      name: "Kilogramos de residuos aprovechados o separados correctamente por los participantes",
      level: "resultado",
      observedChange: "Las personas y sedes separan y aprovechan sus residuos de forma sostenida.",
      unit: "Kilogramos",
      numerator: "Residuos aprovechables entregados a gestor o compostados, según registro",
      denominator: "No aplica",
      instrument: "Registro de pesaje o certificados de entrega a gestor",
      technique: "Pesaje periódico",
      frequency: "Mensual",
      baseline: inventory("la generación y separación de residuos", "Aforo inicial de residuos"),
    },
    bridge: "El indicador global es la tasa nacional de reciclaje; el proyecto aporta toneladas aprovechadas en su ámbito, medidas con pesaje.",
  },
  {
    id: "clima",
    targetCode: "13.3",
    theme: "Educación y capacidad frente al cambio climático",
    keywords: ["cambio climatico", "adaptacion", "gestion del riesgo", "variabilidad climatica", "mitigacion", "huella de carbono"],
    sectors: ["medio_ambiente", "educacion_ambiental"],
    dimension: "ambiental",
    globalIndicator: { code: "13.3.1", name: "Grado en que la educación para la ciudadanía mundial y la educación para el desarrollo sostenible se incorporan en políticas, planes de estudio, formación docente y evaluación" },
    output: { name: "Actividades sobre cambio climático y gestión del riesgo", note: "Cuenta las actividades educativas o de preparación registradas." },
    outcome: {
      name: "Comunidades u organizaciones con un plan o medida de adaptación en marcha",
      level: "resultado",
      observedChange: "Las comunidades identifican sus riesgos climáticos y aplican medidas para reducirlos.",
      unit: "Número de comunidades u organizaciones",
      numerator: "Comunidades con plan o medida de adaptación aprobada y al menos una acción ejecutada",
      denominator: "No aplica",
      instrument: "Revisión del plan y verificación de acciones",
      technique: "Revisión documental y visita",
      frequency: "Anual",
      baseline: inventory("la preparación frente al riesgo climático", "Diagnóstico de riesgo comunitario"),
    },
    bridge: "La meta pide mejorar la educación y la capacidad frente al cambio climático; el proyecto lo observa en medidas que las comunidades sí aplican.",
  },
  {
    id: "participacion",
    targetCode: "16.7",
    theme: "Participación comunitaria y fortalecimiento de organizaciones sociales",
    keywords: ["fortalecimiento comunitario", "organizaciones sociales", "iniciativas comunitarias", "red de lideres", "lideres", "juntas de accion", "mesa de trabajo", "veeduria", "participacion comunitaria"],
    sectors: ["gestion_social"],
    dimension: "institucional",
    globalIndicator: { code: "16.7.2", name: "Proporción de la población que considera que la adopción de decisiones es inclusiva y participativa" },
    output: { name: "Encuentros y acompañamientos a organizaciones y líderes", note: "Cuenta encuentros, iniciativas y acompañamientos registrados." },
    outcome: {
      name: "Iniciativas comunitarias formuladas y en marcha seis meses después del acompañamiento",
      level: "resultado",
      observedChange: "La comunidad propone, decide y sostiene sus propias iniciativas.",
      unit: "Número de iniciativas",
      numerator: "Iniciativas formuladas por la comunidad que siguen activas seis meses después",
      denominator: "No aplica",
      instrument: "Ficha de seguimiento de iniciativas",
      technique: "Visita y entrevista con la organización",
      frequency: "Semestral",
      baseline: inventory("las organizaciones e iniciativas existentes", "Mapa inicial de organizaciones"),
    },
    bridge: "El indicador global mide si la población siente que las decisiones son participativas; el proyecto lo observa en iniciativas que la comunidad decide y sostiene.",
  },
  {
    id: "alianzas",
    targetCode: "17.17",
    theme: "Articulación con administraciones y aliados",
    keywords: ["socializacion con administraciones", "administraciones municipales", "alianza", "alianzas", "articulacion", "comite de seguimiento"],
    sectors: ["gestion_social"],
    dimension: "institucional",
    globalIndicator: { code: "17.17.1", name: "Suma en dólares comprometida para asociaciones público-privadas de infraestructura" },
    output: { name: "Espacios de articulación con administraciones y aliados", note: "Cuenta socializaciones y reuniones con entidades." },
    outcome: {
      name: "Acuerdos o aportes formalizados con administraciones y aliados",
      level: "resultado",
      observedChange: "Las entidades aliadas asumen compromisos concretos (recursos, permisos, continuidad).",
      unit: "Número de acuerdos",
      numerator: "Acuerdos, actas o aportes firmados con compromisos verificables",
      denominator: "No aplica",
      instrument: "Registro de acuerdos y actas",
      technique: "Revisión documental",
      frequency: "Semestral",
      baseline: inventory("los acuerdos vigentes con aliados", "Registro inicial de alianzas"),
    },
    bridge: "La meta promueve alianzas eficaces; el indicador global solo mide inversión en infraestructura, por eso el proyecto mide acuerdos concretos, no reuniones.",
  },
];

function plain(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Palabras de la ruta que aparecen en un texto, respetando las exclusiones. */
export function pathwayHits(pathway: OdsPathway, text: string): string[] {
  const value = plain(text);
  if (!targetEvidenceSupported(pathway.targetCode, value)) return [];
  if (pathway.exclude?.some((term) => value.includes(term))) return [];
  return pathway.keywords.filter((keyword) => value.includes(keyword));
}
