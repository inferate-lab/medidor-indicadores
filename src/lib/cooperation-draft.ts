import type {
  CooperationProfile,
  CooperationFieldMeta,
  TrackedProject,
} from "@/types/project-tracking";

export const COOPERATION_DRAFT_VERSION = 1;
export const COOPERATION_KEYS: (keyof CooperationProfile)[] = [
  "problem",
  "population",
  "territory",
  "causalHypothesis",
  "replicableUnit",
  "method",
  "adaptation",
  "partners",
  "costs",
  "sustainability",
  "risks",
];
function plain(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
function compact(text: string, limit = 450) {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > limit ? value.slice(0, limit - 1) + "…" : value;
}
function sourceLines(project: TrackedProject) {
  return project.description
    .split(/\n+|(?<=[.;!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

/** Reglas de orientación: mecanismos propuestos, no diagnósticos ni resultados comprobados. */
function orientation(description: string) {
  const text = plain(description);
  if (/potabil|agua potable|acceso.*agua/.test(text))
    return {
      change: "acceso seguro y continuidad del agua potable",
      unit: "una solución de potabilización funcional con diagnóstico, instalación, formación y acompañamiento",
      verify:
        "funcionamiento, calidad del agua según norma aplicable, uso y continuidad del servicio",
      risk: "fallas de operación, calidad del agua y falta de recursos para mantenimiento",
      recurring: "insumos, operación, análisis de calidad, repuestos y mantenimiento",
    };
  if (
    /(energia|transmision|lineas)/.test(text) &&
    /(infraestructura|socioeconomic|impactos|comunidad|comunitari|territorio|licencia)/.test(text)
  )
    return {
      change:
        "comprensión del proyecto de infraestructura, participación informada y gestión de compromisos socioambientales",
      unit: "un ciclo territorial de caracterización, información, diálogo, acuerdos y seguimiento de compromisos",
      verify:
        "comprensión antes y después, participación efectiva, respuesta a inquietudes y cumplimiento verificable de compromisos",
      risk: "información insuficiente, exclusión de actores, conflictos y compromisos sin seguimiento",
      recurring:
        "equipo territorial, desplazamientos, comunicación accesible, gestión de inquietudes y seguimiento",
    };
  if (/ambient|residuos|ecosistema|conservacion|hidrofon/.test(text))
    return {
      change:
        "adopción y permanencia de prácticas de cuidado ambiental y uso responsable de recursos",
      unit: "un ciclo de diagnóstico, formación socioambiental, práctica acompañada y verificación posterior",
      verify:
        "cambios de conocimientos, adopción observable de prácticas y permanencia después del acompañamiento",
      risk: "confundir asistencia con cambio, barreras para adoptar prácticas y pérdida de continuidad",
      recurring: "facilitación, materiales, acompañamiento territorial y medición de prácticas",
    };
  if (/salud|prevencion|sanitari|nutricion/.test(text))
    return {
      change: "acceso a prevención y adopción de prácticas de cuidado verificables",
      unit: "un ciclo de identificación de necesidades, orientación, acceso a servicios y seguimiento",
      verify:
        "acceso efectivo, adopción de prácticas y seguimiento con protocolos de salud pertinentes",
      risk: "barreras de acceso, derivación insuficiente y manejo inadecuado de datos de salud",
      recurring: "personal competente, coordinación de servicios y seguimiento",
    };
  if (/productiv|emprend|ingreso|negocio/.test(text))
    return {
      change: "adopción de capacidades productivas y sostenibilidad de las iniciativas acompañadas",
      unit: "un paquete de diagnóstico organizativo, formación, asistencia técnica y seguimiento de adopción",
      verify: "aplicación de prácticas de gestión y cambios sostenidos con registros comparables",
      risk: "cambios de mercado, baja adopción y confusión entre capacitación e ingresos atribuibles",
      recurring: "asistencia técnica, acompañamiento, acceso a herramientas y monitoreo",
    };
  if (/genero|mujeres|ninas/.test(text))
    return {
      change: "reducción de barreras de acceso y participación efectiva de mujeres y niñas",
      unit: "un ciclo de diagnóstico de barreras, apoyos de acceso, formación y seguimiento de participación efectiva",
      verify:
        "barreras resueltas, participación y cambios en oportunidades; la asistencia no demuestra igualdad por sí sola",
      risk: "exclusión, sobrecarga de cuidados y exposición de personas a daños o datos sensibles",
      recurring: "apoyos de acceso, acompañamiento y seguimiento desagregado",
    };
  if (/educa|aprendiz|docente|escuela|estudiant|formacion/.test(text))
    return {
      change: "mejora de capacidades y aplicación verificable de lo aprendido",
      unit: "un ciclo de diagnóstico, formación, aplicación acompañada y evaluación posterior",
      verify: "aprendizaje comparable antes y después, aplicación práctica y permanencia",
      risk: "abandono, barreras de acceso y aprendizaje sin condiciones para su aplicación",
      recurring: "facilitación, materiales, acompañamiento y evaluación",
    };
  return {
    change: "el cambio esperado del proyecto, definido operacionalmente con su población",
    unit: "el componente mínimo descrito en el proyecto, con sus actividades, recursos y seguimiento",
    verify:
      "la diferencia entre situación inicial y cambio esperado mediante una definición, fuente y periodo comparables",
    risk: "supuestos causales no comprobados, falta de datos y capacidades insuficientes para sostener el cambio",
    recurring: "equipo, insumos, operación y medición que requiera el componente seleccionado",
  };
}
export function generateCooperationDraft(project: TrackedProject): {
  values: CooperationProfile;
  meta: Record<string, CooperationFieldMeta>;
} {
  const lines = sourceLines(project);
  const domain = orientation(`${project.name}\n${project.description}`);
  const take = (pattern: RegExp) =>
    lines
      .filter((line) => pattern.test(plain(line)))
      .slice(0, 2)
      .map((s) => compact(s));
  const activities = project.causalPlan?.activities.filter((s) => s.trim()).slice(0, 3) ?? [];
  const anchor = compact(activities.join("; ") || project.description || project.name, 650);
  const problemEvidence = take(/problema|brecha|barrera|dificultad|deficit|carencia|limitacion/);
  const people = take(
    /poblacion|beneficiari|comunidad|comunitari|estudiant|docente|mujeres|ninas|hogares|familias|organizacion|funcionari/,
  );
  const territory = take(
    /territorio\s*:|municipio|departamento de|vereda|corregimiento|zona rural|territorio de/,
  );
  const costEvidence = take(/presupuesto|costo total|inversion|valor total/);
  const partners = take(/alianza|convenio|socio|aliado|administracion municipal|junta de accion/);
  const observations = project.observations.filter((o) => o.value !== null);
  const measurementNote = observations.length
    ? "Existen registros de seguimiento en la ficha; contrastar su periodo y cobertura. Actividades y asistencias no prueban resultados por sí solas."
    : "Todavía no hay resultados medidos registrados en la ficha: definir línea base, meta justificada, fuente y periodo antes de afirmar mejora.";
  const values: CooperationProfile = {
    problem: problemEvidence.length
      ? `Lectura del documento: «${problemEvidence.join("»; «")}». Orientación: precisar qué brecha puede modificar ${project.name}, su magnitud y la población afectada. No se dispone aquí de una línea base diagnóstica verificada.`
      : `Hipótesis de diagnóstico para ${project.name}: identificar las barreras que impiden ${domain.change}. El documento aporta estas acciones: «${anchor}». Contrastar la hipótesis con un diagnóstico y fuentes; el objetivo del proyecto no demuestra por sí mismo la magnitud del problema.`,
    population: people.length
      ? `Población o actores mencionados: «${people.join("»; «")}». Propuesta: distinguir participantes directos, actores institucionales y personas que podrían beneficiarse indirectamente; documentar criterios de inclusión, barreras de acceso y desagregaciones pertinentes. No se deduce un número de personas únicas de las asistencias.`
      : `Propuesta para ${project.name}: definir quién experimentará el cambio y separar esa población de quienes ejecutan las actividades. Levantar universo y criterios de selección; revisar edad, género, discapacidad y acceso solo cuando sean pertinentes. El archivo no permite confirmar la población ni su tamaño.`,
    territory: territory.length
      ? `Referencia territorial del documento: «${territory.join("»; «")}». Para orientar la intervención y una réplica, delimitar cobertura, condiciones de acceso, instituciones y factores locales; verificar que los territorios comparados tengan condiciones compatibles.`
      : `El archivo no permite confirmar una delimitación territorial para ${project.name}. Propuesta: identificar lugares de implementación, contexto social e institucional, barreras de acceso y diferencias frente al territorio donde se quiera replicar. No se asigna una ubicación por el nombre del proyecto.`,
    causalHypothesis: `Hipótesis propuesta: si se implementa ${domain.unit}, con recursos y participación suficientes, se espera avanzar hacia ${domain.change}, porque la intervención conecta capacidades, condiciones de aplicación y acompañamiento. Acciones del proyecto que deben revisarse dentro de esa secuencia: «${anchor}». Verificar ${domain.verify}. ${measurementNote}`,
    replicableUnit: `Propuesta de unidad mínima replicable para ${project.name}: ${domain.unit}. Basarla en las acciones documentadas: «${anchor}». Especificar entregables, población, duración, recursos y criterio de finalización; pilotar el paquete antes de afirmar que es replicable.`,
    method: `Ruta propuesta: 1) validar problema, población y diagnóstico inicial; 2) ordenar las actividades de ${project.name} por productos y cambios esperados; 3) aplicar el paquete con acompañamiento y control de calidad; 4) verificar ${domain.verify}; 5) comparar con la línea base, registrar aprendizajes y ajustar. Vincular cada resultado a un indicador, fuente, instrumento, frecuencia y responsable de la ficha MEL.`,
    adaptation: `Mantener como núcleo el mecanismo que conecta ${domain.unit} con ${domain.change}. Adaptar lenguaje, logística, aliados y apoyos de acceso al nuevo contexto. Comparar necesidades y capacidad operativa entre territorios, realizar una prueba acotada y comprobar resultados con definiciones equivalentes. La transferencia no puede darse por demostrada con el número de actividades.`,
    partners: partners.length
      ? `Actores o relaciones mencionados en el documento: «${partners.join("»; «")}». Propuesta: validar quién asume ejecución, acceso a población, verificación técnica, seguimiento y continuidad. Documentar compromisos y capacidad; la mención de un actor no acredita un acuerdo vigente.`
      : `Propuesta de roles para ${project.name}: coordinación del paquete, referente técnico, representación de la población y responsable MEL. Identificar aliados para acceso, implementación y continuidad; verificar sus capacidades y acuerdos. No se atribuyen compromisos a organizaciones que el archivo no confirma.`,
    costs: `${costEvidence.length ? `Referencia económica del documento: «${costEvidence.join("»; «")}». Debe comprobarse su alcance antes de usarla como costo de réplica. ` : ""}Orientación presupuestal: costear por separado diagnóstico, implementación del paquete, ${domain.recurring}, salvaguardas y evaluación. Para replicar, distinguir instalación inicial y operación recurrente. El archivo no permite confirmar un costo completo del paquete; usar cotizaciones y alcance verificable. Calcular costo por resultado solo si existen costos y resultados comparables; no inventar presupuesto, ROI o multiplicadores.`,
    sustainability: `Propuesta de continuidad: asignar quién mantendrá ${domain.unit}, qué capacidades necesita y cómo financiará ${domain.recurring} después del apoyo inicial. Verificar uso y mantenimiento con evidencia posterior al cierre. Formalizar responsabilidades y recursos antes de afirmar sostenibilidad; la capacitación por sí sola no garantiza continuidad.`,
    risks: `Riesgos a revisar para ${project.name}: ${domain.risk}. Propuesta: registrar probabilidad, consecuencia, mitigación y responsable de cada riesgo; comprobar los supuestos entre actividades, productos y resultados. Incorporar consentimiento, minimización de datos y un canal de respuesta según la población. Los protocolos y capacidades existentes deben verificarse, no suponerse.`,
  };
  const gaps: Record<keyof CooperationProfile, string[]> = {
    problem: ["Verificar diagnóstico, magnitud de la brecha y fuente de línea base."],
    population: ["Confirmar población, universo y criterios de inclusión."],
    territory: ["Validar delimitación y condiciones del territorio de implementación y réplica."],
    causalHypothesis: [
      "Contrastar el mecanismo causal y sus supuestos con evidencia de resultados.",
    ],
    replicableUnit: ["Definir alcance y comprobar el paquete mediante una prueba de réplica."],
    method: ["Validar estándares técnicos, instrumentos y responsabilidades de medición."],
    adaptation: ["Documentar diferencias territoriales y resultados de la adaptación."],
    partners: ["Verificar capacidades y compromisos vigentes de cada actor."],
    costs: [
      "Completar costos, fuentes y financiación recurrente; no hay un presupuesto de réplica confirmado.",
    ],
    sustainability: ["Documentar responsables, financiación y evidencia de continuidad."],
    risks: ["Validar riesgos y medidas con la población y el equipo responsable."],
  };
  const evidence: Partial<Record<keyof CooperationProfile, string[]>> = {
    problem: problemEvidence,
    population: people,
    territory,
    partners,
    costs: costEvidence,
    causalHypothesis: activities.slice(0, 2).map((s) => compact(s)),
    replicableUnit: activities.slice(0, 2).map((s) => compact(s)),
  };
  const meta: Record<string, CooperationFieldMeta> = {};
  for (const key of COOPERATION_KEYS)
    meta[key] = {
      origin:
        evidence[key]?.length &&
        ["problem", "population", "territory", "partners", "costs"].includes(key)
          ? "documento"
          : "propuesta",
      evidence: evidence[key] ?? [],
      gaps: gaps[key],
      generatedText: values[key],
    };
  return { values, meta };
}

/** Completa vacíos y actualiza únicamente texto generado que no fue editado. */
export function completeCooperationDraft(project: TrackedProject): TrackedProject {
  const draft = generateCooperationDraft(project);
  const cooperation = { ...project.cooperation };
  const cooperationMeta = { ...project.cooperationMeta };
  for (const key of COOPERATION_KEYS) {
    const previous = project.cooperationMeta[key];
    const untouched = previous?.origin !== "manual" && previous?.generatedText === cooperation[key];
    if (!cooperation[key].trim() || untouched) {
      cooperation[key] = draft.values[key];
      cooperationMeta[key] = draft.meta[key]!;
    } else if (!previous || previous.generatedText !== cooperation[key]) {
      cooperationMeta[key] = {
        origin: "manual",
        evidence: [],
        gaps: [],
        generatedText: "",
      };
    }
  }
  return {
    ...project,
    cooperation,
    cooperationMeta,
    cooperationDraftVersion: COOPERATION_DRAFT_VERSION,
    cooperationSourceText: project.description,
  };
}
export function cooperationDraftNeeded(project: TrackedProject) {
  return (
    project.cooperationDraftVersion < COOPERATION_DRAFT_VERSION ||
    project.cooperationSourceText !== project.description
  );
}
