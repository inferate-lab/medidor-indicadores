import type { CausalLevel, Indicator, ProjectInput } from "@/types/medidor";
import { emptyTarget } from "@/types/medidor";

type Kind =
  | "educacion"
  | "equipamiento"
  | "servicio"
  | "comunidad"
  | "ambiente"
  | "productivo"
  | "salud"
  | "investigacion";
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
const RULES: { id: Kind; label: string; matches: (text: string) => boolean }[] = [
  {
    id: "educacion",
    label: "Formación y aprendizaje",
    matches: (t) => /educa|aprendiz|\bformacion|capacit|docent|ensenanza|taller.*pedagog|comprension lectora|alfabetiz/.test(t),
  },
  {
    id: "equipamiento",
    label: "Desarrollo, dotación o uso de equipos",
    matches: (t) =>
      /kits?\b|equipos?\b|dispositiv|prototipo|material didactico/.test(t) &&
      !/equipo (docente|humano|de trabajo|de salud)/.test(t) &&
      /entreg|fabric|constru|desarroll|disen|instala|utiliz|uso|compart|dotacion|proveer|educativ|robotic|costo|precio/.test(
        t,
      ),
  },
  {
    id: "servicio",
    label: "Infraestructura y acceso a servicios",
    matches: (t) =>
      /instal|constru|rehabil|acceso|mantenim|operacion/.test(t) &&
      (!/capacit|formacion|taller|visita/.test(t) ||
        /instalar|instalacion|construir|construccion|rehabilitar|rehabilitacion|garantizar.*acceso/.test(
          t,
        )) &&
      /infraestructura|agua potable|potabiliz|saneamiento|red electrica|electricidad|servicios basicos/.test(
        t,
      ),
  },
  {
    id: "comunidad",
    label: "Participación y fortalecimiento comunitario",
    matches: (t) =>
      /fortalec|participa|acompan|gobernanza|liderazgo/.test(t) &&
      /comunitari|organizaci|lideres|decisiones/.test(t),
  },
  {
    id: "ambiente",
    label: "Prácticas y recuperación ambiental",
    matches: (t) =>
      /restaur|reforest|recicl|practicas|uso racional|sensibili|educa/.test(t) &&
      /ambient|ecosistema|bosque|residuo|recicl|recurso|agua/.test(t),
  },
  {
    id: "productivo",
    label: "Emprendimiento y desarrollo productivo",
    matches: (t) => /emprend|unidad.*productiva|negocio|comercializa|productores/.test(t),
  },
  {
    id: "salud",
    label: "Atención y acceso a salud",
    matches: (t) =>
      /atencion primaria|servicios de salud|atencion sanitaria|pacientes|salud mental/.test(t),
  },
  {
    id: "investigacion",
    label: "Investigación y validación de soluciones",
    matches: (t) =>
      /investigacion cientifica|investigacion aplicada|validar.*prototipo|ensayo experimental|desarroll.*prototipo/.test(
        t,
      ),
  },
];
export function identifyInterventions(source: string) {
  const fragments = source
    .split(/\n+|(?<=[.;!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Una exclusión explícita no es evidencia para incorporar esa intervención.
  const eligible = fragments.filter(
    (s) =>
      !/\b(no incluye|no contempla|no se realizar|sin componente de|no consiste en)\b/.test(
        normalize(s),
      ),
  );
  const interventions = RULES.flatMap((rule) => {
    const evidence = eligible.filter((s) => rule.matches(normalize(s))).slice(0, 3);
    return evidence.length ? [{ id: rule.id, label: rule.label, evidence }] : [];
  });
  return {
    interventions,
    unresolved: interventions.length === 0,
    limitation:
      "Identificación por reglas y evidencia del documento. Revisa las intervenciones propuestas; un nombre o una palabra aislada no demuestra resultados.",
  };
}

type Recipe = {
  id: string;
  name: string;
  kind: Kind;
  level: CausalLevel;
  unit: string;
  numerator: string;
  denominator: string;
  formula: string;
  decision: string;
  instrument: string;
  frequency: string;
  required: string[];
  limit: string;
  orientation?: "ascendente" | "descendente" | "estable";
  role?: "esencial" | "complementario" | "salvaguarda";
};
export function measurementRecommendations(text: string) {
  const profile = identifyInterventions(text);
  const has = (id: Kind) => profile.interventions.some((i) => i.id === id);
  const recipes: Recipe[] = [];
  const add = (r: Recipe) => recipes.push(r);
  if (has("equipamiento")) {
    add({
      id: "equipment_cost",
      kind: "equipamiento",
      name: "Costo total por equipo o kit durante su vida útil",
      level: "gestion",
      unit: "Moneda por equipo",
      numerator:
        "Compra o fabricación, transporte, formación, operación, reposición y mantenimiento en el horizonte definido",
      denominator: "Equipos funcionales del mismo lote y horizonte",
      formula: "Costo total del lote / número de equipos funcionales",
      decision:
        "Determinar si la solución es asequible y qué costos se omiten en el precio de compra",
      instrument:
        "Ficha de costos con facturas o cotizaciones comparables; separar inversión y costos recurrentes",
      frequency: "Diseño, compra y revisión anual",
      required: [
        "Moneda y año de precios",
        "Vida útil y horizonte de costos",
        "Equipos funcionales",
        "Costos de adquisición, formación, operación y mantenimiento",
      ],
      limit:
        "No confundir precio de compra con costo total; documentar costos compartidos y evitar contarlos dos veces.",
      orientation: "estable",
    });
    if (has("educacion")) {
      add({
        id: "classrooms_per_kit",
        kind: "equipamiento",
        name: "Aulas distintas atendidas por kit en el periodo",
        level: "producto",
        unit: "Aulas por kit",
        numerator: "Pares únicos aula-kit con uso efectivo registrado",
        denominator: "Kits funcionales disponibles en el mismo periodo",
        formula: "Pares aula-kit con uso efectivo / kits funcionales",
        decision:
          "Dimensionar cuántas aulas pueden compartir el equipo y si se necesita ampliar la dotación",
        instrument:
          "Agenda de préstamo y registro de sesiones con identificadores de aula y kit; contrastar con horarios y duración de sesiones",
        frequency: "Mensual o por periodo escolar",
        required: [
          "Identificador de aula y kit",
          "Fecha y duración de cada sesión",
          "Número de kits funcionales",
          "Horas disponibles y tiempo de traslado",
        ],
        limit:
          "Es uso observado, no capacidad máxima. La capacidad debe estimarse con horarios, tiempos de traslado y sesiones mínimas por aula.",
      });
    }
    add({
      id: "equipment_availability",
      kind: "equipamiento",
      name: "Disponibilidad funcional del equipo durante las sesiones programadas",
      level: "producto",
      unit: "Porcentaje",
      numerator: "Horas programadas con el equipo funcional y disponible",
      denominator: "Horas de uso programadas",
      formula: "(Horas disponibles / horas programadas) × 100",
      decision: "Evitar que compartir más equipos reduzca la calidad o interrumpa el servicio",
      instrument: "Bitácora de averías, reparaciones, disponibilidad y sesiones canceladas",
      frequency: "Mensual",
      required: ["Horas programadas", "Horas de indisponibilidad", "Causas y reparaciones"],
      limit:
        "Distinguir falta de demanda de fallas del equipo; menos uso no significa mejor disponibilidad.",
      role: "salvaguarda",
    });
  }
  if (has("educacion")) {
    add({
      id: "learning_change",
      kind: "educacion",
      name: "Cambio en las competencias trabajadas por el proyecto",
      level: "resultado",
      unit: "Puntos en escala definida",
      numerator: "Suma de diferencias entre puntaje final e inicial de las mismas personas",
      denominator: "Personas con medición inicial y final comparable",
      formula: "Σ(puntaje final − puntaje inicial) / personas con ambas mediciones",
      decision:
        "Determinar si el proceso educativo mejora las competencias previstas y ajustar su metodología",
      instrument:
        "Prueba o rúbrica alineada con las competencias del proyecto, aplicada antes y después; registrar ausencias",
      frequency: "Inicio y cierre de cada cohorte",
      required: [
        "Competencias y escala de evaluación",
        "Puntajes iniciales y finales vinculables",
        "Personas sin evaluación final y motivo",
      ],
      limit:
        "Un cambio antes-después no demuestra causalidad. Reportar pérdidas de seguimiento y posibles efectos de práctica.",
    });
    if (/docent|profesor|maestr/.test(normalize(text))) {
      add({
        id: "teacher_autonomy",
        kind: "educacion",
        name: "Horas de formación hasta el uso autónomo por docentes",
        level: "resultado",
        unit: "Horas por docente que demuestra autonomía",
        numerator: "Horas acumuladas de formación y práctica de docentes que superan la rúbrica",
        denominator: "Docentes que demuestran uso autónomo",
        formula: "Σ horas hasta alcanzar autonomía / docentes que la alcanzan",
        decision:
          "Planear la carga de formación y el acompañamiento necesario para replicar la intervención",
        instrument:
          "Registro de horas por docente y rúbrica de sesión autónoma observada; registrar también quienes no alcanzan el criterio",
        frequency: "Durante la formación y al verificar autonomía",
        required: [
          "Horas de formación y práctica por docente",
          "Rúbrica de autonomía",
          "Fecha de verificación",
          "Docentes sin autonomía al cierre",
        ],
        limit:
          "No comparar solo a quienes terminaron: reportar cuántos docentes no alcanzaron autonomía y sus horas invertidas.",
        orientation: "estable",
      });
    }
  }
  if (has("servicio")) {
    add({
      id: "service_access",
      kind: "servicio",
      name: "Población objetivo con acceso efectivo al servicio intervenido",
      level: "resultado",
      unit: "Porcentaje",
      numerator:
        "Personas con acceso verificado según condiciones de calidad, continuidad y disponibilidad",
      denominator: "Población objetivo del mismo territorio y periodo",
      formula: "(Personas con acceso verificado / población objetivo) × 100",
      decision: "Distinguir infraestructura instalada de servicio efectivamente disponible",
      instrument: "Verificación del servicio y registro de cobertura sin duplicar personas",
      frequency: "Línea base, puesta en servicio y seguimiento trimestral",
      required: [
        "Definición del servicio y condiciones de acceso",
        "Población objetivo",
        "Verificación de calidad y continuidad",
      ],
      limit:
        "Una instalación no equivale a acceso efectivo; no asignar automáticamente agua o energía si el texto no lo sustenta.",
    });
    add({
      id: "service_unit_cost",
      kind: "servicio",
      name: "Costo por persona con acceso efectivo al servicio",
      level: "gestion",
      unit: "Moneda por persona",
      numerator: "Costos atribuibles de inversión y operación en el horizonte definido",
      denominator: "Personas únicas con acceso efectivo verificado en ese horizonte",
      formula: "Costos atribuibles / personas con acceso efectivo",
      decision: "Comparar viabilidad y costos de expansión sin perder calidad",
      instrument: "Registro de costos y padrón agregado de cobertura verificada",
      frequency: "Anual y al planear expansión",
      required: [
        "Moneda y horizonte",
        "Costos atribuibles",
        "Personas únicas con acceso verificado",
      ],
      limit:
        "Comparar alternativas con el mismo nivel de servicio, calidad, vida útil y territorio.",
      orientation: "estable",
    });
  }
  if (has("comunidad"))
    add({
      id: "community_decisions",
      kind: "comunidad",
      name: "Decisiones comunitarias acordadas que se implementan y verifican",
      level: "resultado",
      unit: "Porcentaje",
      numerator: "Decisiones acordadas con implementación verificada",
      denominator: "Decisiones acordadas cuyo plazo venció en el periodo",
      formula: "(Decisiones implementadas / decisiones con plazo vencido) × 100",
      decision: "Evaluar si la participación influye en acciones y no solo genera reuniones",
      instrument: "Actas, matriz de compromisos, plazos y verificación participativa",
      frequency: "Trimestral",
      required: [
        "Decisiones y responsables",
        "Plazos acordados",
        "Evidencia de implementación",
        "Participación de grupos menos representados",
      ],
      limit:
        "Contar decisiones no demuestra representación equitativa ni atribución exclusiva al proyecto.",
    });
  if (has("ambiente"))
    add({
      id: "environment_practice",
      kind: "ambiente",
      name: "Unidades acompañadas que mantienen la práctica ambiental definida",
      level: "resultado",
      unit: "Porcentaje",
      numerator: "Hogares, organizaciones o sitios con práctica verificada en el seguimiento",
      denominator: "Unidades con seguimiento comparable",
      formula: "(Unidades que mantienen la práctica / unidades con seguimiento) × 100",
      decision: "Evaluar si la sensibilización o intervención se traduce en prácticas sostenidas",
      instrument:
        "Lista de verificación antes, al cierre y después del acompañamiento; definir una práctica observable",
      frequency: "Inicio, cierre y seguimiento posterior",
      required: [
        "Práctica concreta",
        "Unidad de seguimiento",
        "Criterio de verificación",
        "Unidades sin seguimiento",
      ],
      limit:
        "La adopción de prácticas no equivale a volumen de agua ahorrada, emisiones evitadas o ecosistemas recuperados.",
    });
  if (has("productivo"))
    add({
      id: "productive_margin",
      kind: "productivo",
      name: "Cambio del margen neto de las unidades productivas acompañadas",
      level: "resultado",
      unit: "Moneda por unidad y periodo",
      numerator: "Suma de cambios en ingresos menos costos comparables por unidad",
      denominator: "Unidades con registros iniciales y finales comparables",
      formula: "Σ[(ingresos − costos) final − (ingresos − costos) inicial] / unidades comparables",
      decision: "Determinar si el acompañamiento mejora la viabilidad económica",
      instrument:
        "Registro simplificado de ingresos y costos; contrastar estacionalidad e inflación",
      frequency: "Línea base y trimestral",
      required: [
        "Ingresos y costos por unidad",
        "Periodos comparables",
        "Moneda y precios",
        "Unidades sin registro",
      ],
      limit: "No confundir ventas con beneficios ni atribuir cambios de mercado al proyecto.",
    });
  if (has("salud"))
    add({
      id: "health_continuity",
      kind: "salud",
      name: "Personas atendidas que completan la ruta de atención indicada",
      level: "resultado",
      unit: "Porcentaje",
      numerator: "Personas con ruta completada y verificada",
      denominator: "Personas con ruta indicada cuyo seguimiento corresponde al periodo",
      formula: "(Personas que completan la ruta / personas con ruta indicada) × 100",
      decision: "Identificar barreras de continuidad y ajustar el acompañamiento",
      instrument:
        "Registro agregado de derivación y continuidad con autorización y protección de datos",
      frequency: "Mensual según ruta clínica",
      required: [
        "Ruta y criterio de continuidad",
        "Personas elegibles",
        "Completitud y causas de interrupción",
      ],
      limit:
        "Completar una ruta no demuestra mejoría clínica; el resultado clínico requiere definición y personal competente.",
    });
  if (has("investigacion"))
    add({
      id: "validated_solution",
      kind: "investigacion",
      name: "Soluciones o prototipos que superan el protocolo de validación",
      level: "resultado",
      unit: "Porcentaje",
      numerator: "Soluciones evaluadas que cumplen criterios predefinidos de desempeño y seguridad",
      denominator: "Soluciones evaluadas con el mismo protocolo",
      formula: "(Soluciones que cumplen el protocolo / soluciones evaluadas) × 100",
      decision: "Decidir qué soluciones avanzar, adaptar o descartar antes de escalar",
      instrument: "Protocolo de ensayo con criterios establecidos antes de la evaluación",
      frequency: "Por ciclo de validación",
      required: [
        "Criterios de desempeño y seguridad",
        "Protocolo",
        "Resultados de todas las pruebas, incluidas fallidas",
      ],
      limit: "Una prueba de laboratorio no demuestra efectividad en condiciones reales.",
    });
  // Las comparaciones y la réplica requieren una intervención concreta, nunca un nombre de proyecto.
  if (
    has("equipamiento") ||
    (/comparar|alternativas|costo.efectiv/.test(normalize(text)) && profile.interventions.length)
  ) {
    const kind = has("equipamiento") ? "equipamiento" : profile.interventions[0]!.id;
    add({
      id: "alternative_cost",
      kind,
      name: "Diferencia de costo total frente a una alternativa comparable",
      level: "gestion",
      unit: "Porcentaje",
      numerator: "Costo total de la intervención menos costo total de la alternativa",
      denominator: "Costo total de la alternativa para la misma cobertura y resultado requerido",
      formula: "((Costo intervención − costo alternativa) / costo alternativa) × 100",
      decision:
        "Elegir entre opciones comparables sin asumir que menor precio significa mayor valor",
      instrument:
        "Matriz de alternativas con moneda, fecha, horizonte, cobertura, prestaciones y calidad equivalentes",
      frequency: "Diseño, compra y decisión de réplica",
      required: [
        "Alternativa real y fuente de costo",
        "Mismo horizonte y moneda",
        "Cobertura y nivel de servicio equivalentes",
        "Resultados de aprendizaje o calidad, cuando apliquen",
      ],
      limit:
        "No calcular con alternativa de costo cero o sin cotización. Una diferencia de costo no demuestra costo-efectividad.",
      orientation: "estable",
      role: "complementario",
    });
  }
  if (
    profile.interventions.length &&
    /replic|escal|expan|otra institucion|otros territorios/.test(normalize(text))
  ) {
    add({
      id: "replication_cost",
      kind: profile.interventions[0]!.id,
      name: "Costo de implementar la intervención en una nueva unidad o territorio",
      level: "gestion",
      unit: "Moneda por nueva implementación",
      numerator:
        "Costos de preparación, adaptación, formación, instalación y acompañamiento en el nuevo contexto",
      denominator: "Nuevas implementaciones funcionales con calidad verificada",
      formula: "Costos atribuibles de réplica / nuevas implementaciones funcionales",
      decision: "Evaluar condiciones mínimas y recursos necesarios para replicar el proyecto",
      instrument: "Ficha de réplica con costos, tiempos, adaptaciones y verificación de calidad",
      frequency: "Piloto de réplica y cierre de cada nueva implementación",
      required: [
        "Unidad de réplica",
        "Costos y tiempos de adaptación",
        "Condiciones mínimas y verificación de calidad",
      ],
      limit:
        "Separar costos únicos de desarrollo y costos marginales; no extrapolar un piloto a todos los territorios.",
      orientation: "estable",
      role: "complementario",
    });
  }
  return {
    ...profile,
    recommendations: recipes.map((recipe) => ({
      ...recipe,
      evidence: profile.interventions.find((i) => i.id === recipe.kind)!.evidence,
      rationale: `Aplica por la intervención «${profile.interventions.find((i) => i.id === recipe.kind)!.label}». ${recipe.decision}.`,
    })),
  };
}

export function designInterventionIndicators(project: ProjectInput): Indicator[] {
  return measurementRecommendations(project.text).recommendations.map((r) => ({
    id: `adaptive_${r.id}`,
    name: r.name,
    level: r.level,
    observedChange: `Cambio por verificar: ${r.name}`,
    decisionInformed: r.decision,
    dimension: r.level === "gestion" ? "economica" : "social",
    crossCuttingApproaches: [],
    sphere: r.level === "resultado" ? "influencia" : "control",
    horizon: "mediano",
    population: project.targetPopulation || "Por definir",
    territory: project.territory || "Por definir",
    unit: r.unit,
    orientation: r.orientation ?? "ascendente",
    orientationRationale:
      r.orientation === "estable"
        ? "No se presume que reducir costos u horas sea mejor sin conservar calidad y resultados; definir rango con evidencia."
        : "",
    institutionalCode: "",
    frameworkIds: [],
    accumulation: "no_acumulado",
    numerator: r.numerator,
    denominator: r.denominator,
    formula: r.formula,
    disaggregations: [],
    primarySource: "Fuente propuesta por levantar con el equipo del proyecto",
    secondarySource: "",
    instrument: r.instrument,
    technique: "Registro y verificación según el instrumento propuesto",
    frequency: r.frequency,
    responsible: "Responsable por acordar con el proyecto",
    measurementBurden: "media",
    qualityRisks: [r.limit],
    biases: [],
    externalFactors: [],
    attributionLimits: r.limit,
    safeguards: [],
    evidenceStatus: "inferred",
    pendingIssues: [
      ...r.required,
      "Definir línea base y meta con evidencia, sin completar con cero",
    ],
    isGuardrail: r.role === "salvaguarda",
    decision: "propuesto",
    review: { verdict: "revisar", reasons: [r.rationale] },
    recommendationTier: r.role ?? "esencial",
    recommendationRationale: r.rationale,
    projectEvidence: r.evidence,
    baselinePlan: {
      timing: "Antes de implementar o decidir la expansión",
      method: r.instrument,
      instrument: r.instrument,
      variables: r.required,
      samplingGuidance: "Definir población y cobertura; documentar pérdidas de seguimiento",
      analysisGuidance: r.limit,
      requiredBeforeTarget: true,
    },
    internationalReferences: [],
    bidReferences: [],
    colombiaReferences: [],
    odsAlignments: [],
    target: emptyTarget(),
  }));
}
