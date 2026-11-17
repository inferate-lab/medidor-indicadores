import * as XLSX from "xlsx";
import { findTarget, ODS_SOURCE } from "@/data/ods-catalog";
import { THEME_RULES } from "@/data/theme-ods-map";
import { blankIndicator } from "@/lib/project-tracking";
import { sanitizeCell } from "@/lib/sanitize";
import type { TrackedProject } from "@/types/project-tracking";

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
const compact = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 600);
function compatible(code: string, text: string) {
  if (code === "12.8")
    return /ambient|consumo responsable|consumo sostenible|estilos de vida sostenible|uso racional|eficiencia energetica|cuidado.*recurso/.test(
      text,
    );
  if (code === "4.7")
    return /sostenib|ambient|derechos humanos|igualdad de genero|ciudadania|paz|diversidad cultural/.test(
      text,
    );
  if (code === "5.1") return /discrimin|barrera|igualdad de genero|equidad de genero/.test(text);
  if (code === "13.3")
    return (
      /clima|climatic/.test(text) && /educa|sensibili|capacit|formacion|conocim|taller/.test(text)
    );
  return true;
}
const LOCAL_PROXIES: Record<
  string,
  { name: string; numerator: string; denominator: string; instrument: string; limit: string }
> = {
  "5.1": {
    name: "Porcentaje de barreras de discriminación identificadas con respuesta verificada",
    numerator: "Barreras de discriminación registradas con respuesta implementada y verificada",
    denominator: "Barreras de discriminación registradas en el periodo",
    instrument:
      "Registro agregado de barreras, respuestas y verificación con la población, sin datos personales innecesarios",
    limit:
      "El indicador global 5.1.1 examina marcos jurídicos para promover, hacer cumplir y supervisar igualdad y no discriminación por sexo. La participación de mujeres o la respuesta a barreras locales no sustituye esa medición jurídica.",
  },
  "5.2": {
    name: "Porcentaje de participantes que identifican rutas de apoyo frente a violencia de género",
    numerator: "Participantes que identifican correctamente las rutas de apoyo acordadas",
    denominator: "Participantes con evaluación comparable de conocimiento de rutas",
    instrument:
      "Evaluación agregada inicial y final sobre rutas, con salvaguardas y protocolo de respuesta",
    limit:
      "Los indicadores globales 5.2.1 y 5.2.2 miden violencia con definiciones, poblaciones y periodos específicos. Conocer una ruta de apoyo no mide prevalencia ni demuestra reducción de violencia.",
  },
  "5.5": {
    name: "Porcentaje de cargos de decisión del espacio acompañado ocupados por mujeres",
    numerator: "Cargos de decisión del espacio acompañado ocupados por mujeres",
    denominator: "Total de cargos de decisión del mismo espacio y periodo",
    instrument: "Registro de composición, tipo de cargo y evidencia de participación efectiva",
    limit:
      "Los indicadores globales 5.5.1 y 5.5.2 distinguen representación política y posiciones directivas. Un comité del proyecto no equivale automáticamente a sus universos estadísticos.",
  },
  "6.2": {
    name: "Porcentaje de población atendida con acceso verificado a saneamiento e higiene",
    numerator:
      "Personas con servicio de saneamiento y condiciones de higiene verificadas según los criterios definidos",
    denominator: "Población objetivo con verificación del servicio",
    instrument:
      "Verificación del servicio, uso y condiciones de higiene; distinguir instalación de acceso efectivo",
    limit:
      "El indicador global 6.2.1 distingue servicios de saneamiento gestionados sin riesgos y disponibilidad de instalaciones de lavado de manos con agua y jabón. Contar baños o letrinas instaladas no demuestra todos esos criterios.",
  },
  "12.8": {
    name: "Porcentaje de participantes que aplican prácticas de consumo responsable después del acompañamiento",
    numerator: "Participantes que aplican una práctica definida y verificada",
    denominator: "Participantes con seguimiento comparable",
    instrument: "Registro de prácticas antes y después y verificación de aplicación",
    limit:
      "El indicador global 12.8.1 se refiere a la incorporación de educación para el desarrollo sostenible y ciudadanía mundial en políticas educativas, currículos, formación docente y evaluación. Las charlas o asistencias locales no equivalen a ese indicador.",
  },
  "7.3": {
    name: "Porcentaje de unidades acompañadas que reducen su consumo específico de energía",
    numerator: "Unidades con reducción de consumo de energía por unidad de servicio o producción",
    denominator: "Unidades con medición inicial y final comparable",
    instrument: "Registro de consumo, unidad de servicio o producción y periodo comparable",
    limit:
      "El indicador global 7.3.1 es intensidad energética en función de energía primaria y PIB. Una reducción local de consumo o el número de talleres no mide directamente ese indicador nacional.",
  },
  "6.1": {
    name: "Porcentaje de población atendida con acceso verificado a agua potable segura",
    numerator:
      "Personas con acceso verificado según criterios definidos de seguridad y disponibilidad",
    denominator: "Población objetivo con verificación de acceso",
    instrument:
      "Verificación de acceso, disponibilidad y calidad de agua según criterios aplicables",
    limit:
      "El indicador global 6.1.1 mide población que utiliza servicios de suministro de agua potable gestionados sin riesgos. Entregar equipos o dar talleres no demuestra ese nivel de servicio.",
  },
};
export function officialOdsLinks(code: string) {
  const target = findTarget(code);
  if (!target) throw new Error("La meta no existe en el catálogo ONU.");
  return {
    goal: `https://sdgs.un.org/goals/goal${target.goal}#targets_and_indicators`,
    framework: ODS_SOURCE.url,
    metadata: ODS_SOURCE.metadataUrl,
  };
}
/** Solo el texto de origen activa asociaciones; los borradores generados no son evidencia. */
function candidatesForActivity(
  project: TrackedProject,
  activity: { description: string; scope: string; clarification: string },
) {
  if (
    /mobiliario|papeleria|reunion administrativa|gestion administrativa|equipo[s]? de computo/.test(
      plain(activity.description),
    )
  )
    return [];
  const source = `${activity.description}\n${activity.scope}\n${activity.clarification ? `Aclaración de la actividad: ${activity.clarification}` : ""}`;
  const text = plain(source);
  const scored = THEME_RULES.flatMap((rule) => {
    const matched = [...new Set(rule.keywords.filter((keyword) => text.includes(plain(keyword))))];
    if (!matched.length || !compatible(rule.targetCode, text)) return [];
    if (
      matched.every((word) =>
        new RegExp(`no (incluye|contempla|abarca|aborda|realiza)[^.\\n]{0,50}${plain(word)}`).test(
          text,
        ),
      )
    )
      return [];
    const target = findTarget(rule.targetCode);
    if (!target) return [];
    const evidence = source
      .split(/\n+|(?<=[.;!?])\s+/)
      .filter((line) => matched.some((keyword) => plain(line).includes(plain(keyword))))
      .slice(0, 3)
      .map(compact);
    return [{ rule, target, matched, evidence }];
  }).sort((a, b) => b.matched.length - a.matched.length);
  const seen = new Set<string>();
  return scored
    .filter((item) => {
      if (seen.has(item.target.code)) return false;
      seen.add(item.target.code);
      return true;
    })
    .slice(0, 4)
    .map(({ rule, target, matched, evidence }) => {
      const rationale = `Relación propuesta con la meta ${target.code} por el tema «${rule.theme}» y estas menciones de esta actividad o su alcance: ${matched.join(", ")}. Confirmar el mecanismo de contribución con resultados; la coincidencia temática no demuestra cumplimiento de la meta ONU.`;
      const stored = project.indicatorSuggestions.find(
        (i) =>
          i.ods.includes(target.code) &&
          i.level !== "gestion" &&
          i.id !== `ods-auto-${target.code}`,
      );
      const proxy = LOCAL_PROXIES[target.code];
      const indicator =
        stored && !proxy
          ? {
              ...stored,
              id: `ods-auto-${target.code}`,
              ods: [target.code],
              odsRationale: rationale,
            }
          : {
              ...blankIndicator(`ods-auto-${target.code}`),
              name:
                proxy?.name ??
                `Porcentaje de unidades atendidas que logran el cambio definido para ${rule.theme}`,
              level: "resultado" as const,
              unit: "Porcentaje",
              origin: "sugerido" as const,
              formula: `(${proxy?.numerator ?? "Unidades que logran el cambio definido y verificado"} / ${proxy?.denominator ?? "Unidades con seguimiento comparable"}) × 100`,
              outcome: `Propuesta por operacionalizar: ${rule.theme}. No es un resultado observado.`,
              source: "Fuente propuesta: registro de seguimiento del proyecto, por validar",
              instrument:
                proxy?.instrument ??
                "Definir criterio de cambio, medición inicial y final y verificación con la población",
              frequency: "Medición inicial, cierre y seguimiento posterior según el cambio",
              ods: [target.code],
              odsRationale: rationale,
            };
      return {
        target,
        evidence,
        rationale,
        indicator,
        limit:
          proxy?.limit ??
          "Este indicador local es una propuesta de contribución. Para afirmar que mide un indicador global deben coincidir definición, población, cobertura, fuente y método de sus metadatos ONU.",
      };
    });
}
export function activityOdsMappings(project: TrackedProject) {
  const activities = project.activitySources.length
    ? project.activitySources.map((source) => ({ ...source, inferred: false }))
    : project.description
        .split(/\n+|(?<=[.;!?])\s+/)
        .map((line, index) => ({
          id: `texto-${index}`,
          description: line.trim(),
          scope: "",
          clarification: "",
          sheet: project.sheet,
          row: null,
          inferred: true,
        }))
        .filter((source) => source.description.length > 15);
  return activities.map((activity) => ({
    activity,
    candidates: candidatesForActivity(project, activity),
  }));
}
export function automaticOdsCandidates(project: TrackedProject) {
  const grouped = new Map<string, ReturnType<typeof candidatesForActivity>[number]>();
  for (const { activity, candidates } of activityOdsMappings(project))
    for (const candidate of candidates) {
      const ref = `${activity.sheet}${activity.row ? `, fila ${activity.row}` : ""}: ${activity.description}`;
      const previous = grouped.get(candidate.target.code);
      if (previous) previous.evidence = [...new Set([...previous.evidence, ref])];
      else grouped.set(candidate.target.code, { ...candidate, evidence: [ref] });
    }
  return [...grouped.values()];
}
export function buildAutomaticOdsWorkbook(project: TrackedProject) {
  const rows: unknown[][] = [
    [
      "Proyecto",
      "ODS",
      "Objetivo ONU",
      "Meta ONU (sub-ODS)",
      "Texto de la meta",
      "Indicadores globales de referencia",
      "Indicador local propuesto",
      "Fórmula propuesta",
      "Fragmentos de origen",
      "Justificación",
      "Límite metodológico",
      "Estado",
      "Página oficial ONU",
      "Metadatos ONU",
    ],
  ];
  rows[0]!.push("Actividad", "Hoja", "Fila de origen");
  for (const { activity, candidates } of activityOdsMappings(project)) {
    for (const item of candidates) {
      const links = officialOdsLinks(item.target.code);
      rows.push([
        project.name,
        item.target.goal,
        item.target.goalTitle,
        item.target.code,
        item.target.text,
        item.target.indicatorCodes.join(", "),
        item.indicator.name,
        item.indicator.formula,
        item.evidence.join("\n"),
        item.rationale,
        item.limit,
        "Propuesta por actividad: no equivale a resultado medido",
        links.goal,
        links.metadata,
        activity.description,
        activity.sheet,
        activity.row,
      ]);
    }
    if (!candidates.length)
      rows.push([
        project.name,
        null,
        "",
        "",
        "",
        "",
        "",
        "",
        activity.description,
        "Falta precisar cambio o contenido para sustentar una meta específica",
        "Sin asignación automática",
        "Por aclarar",
        "",
        "",
        activity.description,
        activity.sheet,
        activity.row,
      ]);
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(
      rows.map((row) => row.map((cell) => (typeof cell === "string" ? sanitizeCell(cell) : cell))),
    ),
    "Vinculación ODS",
  );
  return workbook;
}
