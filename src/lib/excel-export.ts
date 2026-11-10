/**
 * Exportación a Excel (SheetJS, 100% en el navegador).
 *
 * Hojas: Resumen, Indicadores, Marco lógico sugerido, Alineación ODS, Referencias,
 * Marcos de la fundación, Reglas aplicadas y Pendientes.
 * No exporta resultados medidos: solo el diseño de medición recomendado.
 * Las celdas sin evidencia quedan vacías, nunca en 0.
 */

import * as XLSX from "xlsx";

import { findTarget, ODS_SOURCE } from "@/data/ods-catalog";
import { BID_CATALOG_SOURCE } from "@/data/bid-catalog";
import { sanitizeCell } from "@/lib/sanitize";
import { assessSmart } from "@/lib/smart-rules";
import { canAcceptValue, evaluateTarget } from "@/lib/target-rules";
import { frameworkNames, reviewLogicalFramework } from "@/lib/framework-rules";
import { detectOdsWashing } from "@/lib/ods-rules";
import {
  CAUSAL_LINK_LABELS,
  DECISION_LABELS,
  DETERMINATION_LABELS,
  DIMENSION_LABELS,
  EVIDENCE_LABELS,
  HORIZON_LABELS,
  LEVEL_LABELS,
  ORIENTATION_LABELS,
  RULE_DEFINITIONS,
  REVIEW_LABELS,
  defaultSettings,
  SMART_LABELS,
  SPHERE_LABELS,
  type CausalLevel,
  type CausalLinkKey,
  type SmartCriterion,
  type Indicator,
  type PlatformSettings,
  type ProjectInput,
  type SessionAnalysis,
} from "@/types/medidor";

const LEVEL_FILL: Record<CausalLevel, string> = {
  gestion: "FFE8EEF6",
  producto: "FFDCE9F7",
  resultado: "FFD9EFE3",
  impacto: "FFC9E4D6",
};

type Row = (string | number | null)[];

function sheetFromRows(rows: Row[], widths: number[]): XLSX.WorkSheet {
  const sanitized = rows.map((row) => row.map((cell) => sanitizeCell(cell)));
  const sheet = XLSX.utils.aoa_to_sheet(sanitized as unknown[][], { cellStyles: true });
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(rows.length - 1, 0), c: Math.max(widths.length - 1, 0) },
    }),
  };
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[ref] as XLSX.CellObject | undefined;
      if (!cell) continue;
      cell.s = {
        alignment: { wrapText: true, vertical: "top" },
        font: r === 0 ? { bold: true, color: { rgb: "FFFFFFFF" } } : undefined,
        fill: r === 0 ? { patternType: "solid", fgColor: { rgb: "FF12355B" } } : undefined,
      };
    }
  }
  return sheet;
}

function tintLevels(sheet: XLSX.WorkSheet, levels: CausalLevel[], columns: number) {
  levels.forEach((level, index) => {
    for (let c = 0; c < columns; c += 1) {
      const ref = XLSX.utils.encode_cell({ r: index + 1, c });
      const cell = sheet[ref] as XLSX.CellObject | undefined;
      if (!cell) continue;
      cell.s = {
        ...(cell.s as object),
        fill: { patternType: "solid", fgColor: { rgb: LEVEL_FILL[level] } },
        alignment: { wrapText: true, vertical: "top" },
      };
    }
  });
}

function list(values: string[]): string {
  return values.filter((v) => v.trim().length > 0).join("; ");
}

export function buildWorkbook(
  project: ProjectInput,
  analysis: SessionAnalysis,
  settings: PlatformSettings = defaultSettings(),
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const included = analysis.indicators.filter((i) => i.decision === "aprobado" || i.decision === "modificado");
  const activeFrameworks = settings.frameworks.filter((framework) => framework.active);
  // Se recalcula con las decisiones, ediciones y reglas vigentes al exportar.
  const review = reviewLogicalFramework(project, analysis.causal, analysis.indicators, settings.rules);

  const resumen: Row[] = [
    ["Campo", "Contenido"],
    ["Proyecto", project.name || null],
    ["Sector", project.sector || null],
    ["Territorio", project.territory || null],
    ["Duración", project.duration || null],
    ["Población objetivo", project.targetPopulation || null],
    ["Presupuesto", project.budget || null],
    ["Documentos analizados", list(project.sourceFileNames) || "Texto pegado o demostración"],
    ["Origen del análisis", analysis.origin === "motor_local" ? "Motor local sin servicios de IA" : "Modo demostración local"],
    ["Sectores detectados", analysis.detectedSectors.map((sector) => `${sector.label} (${sector.confidence})`).join("; ")],
    ["Síntesis del cambio buscado", analysis.causal.changeSynthesis || null],
    ["Escenario sin proyecto", analysis.causal.counterfactual || null],
    ["Problema", analysis.causal.problem || null],
    ["Causas", list(analysis.causal.causes) || null],
    ["Brechas", list(analysis.causal.gaps) || null],
    ["Recursos", list(analysis.causal.resources) || null],
    ...(Object.keys(CAUSAL_LINK_LABELS) as CausalLinkKey[]).map(
      (key): Row => [`Supuesto: ${CAUSAL_LINK_LABELS[key].toLowerCase()}`, analysis.causal.linkAssumptions[key].trim() || "PENDIENTE"],
    ),
    ["Supuestos generales", list(analysis.causal.assumptions) || null],
    ["Riesgos", list(analysis.causal.risks) || null],
    ["Factores externos", list(analysis.causal.externalFactors) || null],
    ["Teoría del Cambio preliminar", analysis.causal.preliminaryTheoryOfChange || null],
    ["Teoría del Cambio consolidada", analysis.causal.consolidatedTheoryOfChange],
    ["Indicadores definitivos", included.length],
    ["Estado de selección", included.length ? "Incluye solo indicadores aceptados o modificados." : "No hay indicadores aceptados o modificados; revise la selección antes de utilizar este archivo."],
    ["Referencias BID", `${BID_CATALOG_SOURCE.version} — ${BID_CATALOG_SOURCE.url}`],
    ["Uso de fuentes Colombia", "Las referencias oficiales colombianas contextualizan el proyecto; no reemplazan la línea base de participantes, instituciones o sitios intervenidos."],
    ["Catálogo ODS", `${ODS_SOURCE.version} — ${ODS_SOURCE.url}`],
    ["Materialidad climática", analysis.climateAlignment.materiality],
    ["Tipo de alineación climática", analysis.climateAlignment.alignmentType],
    ["Áreas de alineación E2050", list(analysis.climateAlignment.alignmentAreas) || null],
    ["Justificación climática", analysis.climateAlignment.causalRationale || null],
    ["Métrica de emisiones", analysis.climateAlignment.emissionsMetric || null],
    ["Estado de revisión climática", analysis.climateAlignment.reviewStatus],
    [
      "Fuente climática",
      `${analysis.climateAlignment.sourceVersion} — ${analysis.climateAlignment.sourceUrl}`,
    ],
    [
      "Advertencia",
      "Este archivo contiene un diseño de medición recomendado. No contiene resultados medidos ni cifras estimadas.",
    ],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows(resumen, [34, 90]), "Resumen");

  const indHeader: Row = [
    "Código de la fundación",
    "Nombre",
    "Marcos de la fundación",
    "Prioridad de recomendación",
    "Razón de recomendación",
    "Evidencia del proyecto",
    "Nivel causal",
    "Cambio observado",
    "Decisión que informa",
    "Dimensión",
    "Enfoques transversales",
    "Esfera",
    "Horizonte",
    "Población",
    "Territorio",
    "Unidad",
    "Sentido de éxito",
    "Justificación del sentido de éxito",
    "Acumulación",
    "Numerador",
    "Denominador",
    "Fórmula",
    "Desagregaciones",
    "Fuente primaria",
    "Fuente secundaria",
    "Instrumento",
    "Técnica",
    "Frecuencia",
    "Responsable",
    "Carga de medición",
    "Riesgos de calidad",
    "Sesgos",
    "Factores externos",
    "Límites de atribución",
    "Salvaguardas",
    "Estado de evidencia",
    "Asuntos pendientes",
    "Guardrail",
    "Decisión",
    "Revisión",
    "Razones de la revisión",
    "Línea base: momento",
    "Línea base: método",
    "Línea base: instrumento",
    "Línea base: variables",
    "Línea base: muestra o censo",
    "Línea base: análisis",
    "Referencias internacionales",
    "Meta: valor",
    "Meta: límite inferior",
    "Meta: límite superior",
    "Meta: unidad",
    "Meta: fecha",
    "Meta: población",
    "Meta: territorio",
    "Meta: línea base",
    "Meta: valor de línea base",
    "Meta: fecha de línea base",
    "Meta: método",
    "Meta: benchmark",
    "Meta: fuente o fundamento",
    "Meta: regla de cálculo",
    "Meta: supuestos",
    "Meta: ingresada por",
    "Meta: aprobador",
    "Meta: fecha de aprobación",
    "Meta: estado",
    "Meta: señales",
  ];
  const indRows: Row[] = included.map((i) => {
    const evaluation = evaluateTarget(i);
    const supportedTarget = canAcceptValue(i.target).ok;
    return [
      i.institutionalCode || null,
      i.name,
      list(frameworkNames(i, activeFrameworks)) || null,
      i.recommendationTier,
      i.recommendationRationale,
      list(i.projectEvidence),
      LEVEL_LABELS[i.level],
      i.observedChange,
      i.decisionInformed,
      DIMENSION_LABELS[i.dimension],
      list(i.crossCuttingApproaches),
      SPHERE_LABELS[i.sphere],
      HORIZON_LABELS[i.horizon],
      i.population,
      i.territory,
      i.unit,
      ORIENTATION_LABELS[i.orientation],
      i.orientationRationale || null,
      i.accumulation,
      i.numerator,
      i.denominator,
      i.formula,
      list(i.disaggregations),
      i.primarySource,
      i.secondarySource,
      i.instrument,
      i.technique,
      i.frequency,
      i.responsible,
      i.measurementBurden,
      list(i.qualityRisks),
      list(i.biases),
      list(i.externalFactors),
      i.attributionLimits,
      list(i.safeguards),
      EVIDENCE_LABELS[i.evidenceStatus],
      list(i.pendingIssues),
      i.isGuardrail ? "Sí" : "No",
      DECISION_LABELS[i.decision],
      REVIEW_LABELS[i.review.verdict],
      list(i.review.reasons),
      i.baselinePlan.timing,
      i.baselinePlan.method,
      i.baselinePlan.instrument,
      list(i.baselinePlan.variables),
      i.baselinePlan.samplingGuidance,
      i.baselinePlan.analysisGuidance,
      i.internationalReferences
        .map((reference) => `${reference.organization}: ${reference.framework} — ${reference.url}`)
        .join("; "),
      supportedTarget ? i.target.value : null,
      supportedTarget ? i.target.lowerBound : null,
      supportedTarget ? i.target.upperBound : null,
      i.target.unit || null,
      i.target.targetDate || null,
      i.target.targetPopulation || null,
      i.target.targetTerritory || null,
      i.target.baselineReference || null,
      i.target.baselineValue,
      i.target.baselineDate || null,
      DETERMINATION_LABELS[i.target.determinationMethod],
      i.target.benchmarkReference || null,
      i.target.evidenceSource || null,
      i.target.calculationRule || null,
      i.target.assumptions || null,
      i.target.enteredBy || null,
      i.target.responsibleApprover || null,
      i.target.approvedAt || null,
      i.target.validationStatus,
      list([...evaluation.flags, ...evaluation.incompatibilities]) || null,
    ];
  });
  const indSheet = sheetFromRows(
    [indHeader, ...indRows],
    indHeader.map((_, index) => (index === 1 ? 40 : 26)),
  );
  tintLevels(
    indSheet,
    included.map((i) => i.level),
    indHeader.length,
  );
  XLSX.utils.book_append_sheet(wb, indSheet, "Indicadores");

  const marcoHeader: Row = [
    "Nivel",
    "Cadena de resultados",
    "Indicador recomendado",
    "Línea base / referencia",
    "Meta del proyecto",
    "Medio de verificación",
    "Supuestos y límites",
    "ODS y metas",
  ];
  const marcoRows: Row[] = [];
  const causalResult = (level: CausalLevel): string => {
    if (level === "impacto") return analysis.causal.impact;
    if (level === "resultado") return list(analysis.causal.outcomes);
    if (level === "producto") return list(analysis.causal.outputs);
    return list(analysis.causal.activities);
  };
  for (const level of ["impacto", "resultado", "producto", "gestion"] as CausalLevel[]) {
    const levelIndicators = included.filter((indicator) => indicator.level === level);
    for (const [index, indicator] of levelIndicators.entries()) {
      marcoRows.push([
        LEVEL_LABELS[level],
        index === 0 ? causalResult(level) : null,
        indicator.name,
        `REQUIERE LÍNEA BASE — ${indicator.baselinePlan.method}`,
        "Pendiente hasta disponer de línea base, benchmark verificable o cifra explícita aprobada",
        `${indicator.primarySource}; ${indicator.instrument}`,
        `${indicator.attributionLimits}${indicator.qualityRisks.length ? ` Riesgos: ${list(indicator.qualityRisks)}` : ""}`,
        indicator.odsAlignments.map((alignment) => `${alignment.targetCode} (${alignment.role})`).join("; ") || null,
      ]);
    }
  }
  const marcoSheet = sheetFromRows(
    [marcoHeader, ...marcoRows],
    [20, 70, 48, 70, 52, 62, 70, 22],
  );
  tintLevels(
    marcoSheet,
    included
      .slice()
      .sort(
        (a, b) =>
          ["impacto", "resultado", "producto", "gestion"].indexOf(a.level) -
          ["impacto", "resultado", "producto", "gestion"].indexOf(b.level),
      )
      .map((indicator) => indicator.level),
    marcoHeader.length,
  );
  XLSX.utils.book_append_sheet(wb, marcoSheet, "Marco lógico sugerido");

  const odsHeader: Row = [
    "Indicador",
    "Nivel",
    "Rol",
    "ODS",
    "Título del ODS",
    "Código de meta",
    "Texto oficial de la meta",
    "Indicadores oficiales",
    "Tipo de contribución",
    "Justificación causal",
    "Evaluación de compatibilidad",
    "Proxy local",
    "Versión de la fuente",
    "Estado de revisión",
    "Señales de alineación débil",
  ];
  const odsRows: Row[] = [];
  for (const indicator of included) {
    const washing = detectOdsWashing(indicator);
    for (const a of indicator.odsAlignments) {
      odsRows.push([
        indicator.name,
        LEVEL_LABELS[indicator.level],
        a.role,
        a.goalNumber,
        a.goalTitle,
        a.targetCode,
        a.officialTargetText,
        list(findTarget(a.targetCode)?.indicatorCodes ?? a.officialIndicatorCodes) || null,
        a.contributionType,
        a.causalRationale || null,
        a.compatibilityAssessment || null,
        a.localProxy,
        a.sourceVersion,
        a.reviewStatus,
        washing.weak ? list(washing.reasons) : null,
      ]);
    }
  }
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(
      [odsHeader, ...odsRows],
      [40, 18, 14, 8, 40, 14, 80, 20, 18, 46, 46, 30, 22, 16, 50],
    ),
    "Alineación ODS",
  );

  const bidHeader: Row = [
    "Indicador del proyecto",
    "Tipo de referencia",
    "Código o fuente",
    "Referencia",
    "Uso recomendado",
    "Límite de uso o escala",
    "Enlace oficial",
  ];
  const bidRows: Row[] = [];
  for (const indicator of included) {
    for (const reference of indicator.bidReferences) {
      bidRows.push([
        indicator.name,
        "Marco de Impacto BID",
        reference.code,
        reference.title,
        reference.use,
        reference.scope,
        BID_CATALOG_SOURCE.url,
      ]);
    }
    for (const reference of indicator.colombiaReferences) {
      bidRows.push([
        indicator.name,
        "Fuente oficial Colombia",
        reference.source,
        reference.title,
        reference.use,
        reference.geography,
        reference.url,
      ]);
    }
  }
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows([bidHeader, ...bidRows], [42, 24, 28, 62, 70, 62, 54]),
    "Referencias BID y Colombia",
  );

  const frameworkHeader: Row = [
    "Marco de la fundación",
    "Descripción",
    "Código de la fundación",
    "Indicador",
    "Nivel causal",
    "Sentido de éxito",
    "ODS y metas",
  ];
  const frameworkRows: Row[] = [];
  for (const framework of activeFrameworks) {
    const own = included.filter((indicator) => indicator.frameworkIds.includes(framework.id));
    if (own.length === 0) {
      frameworkRows.push([framework.name, framework.description || null, null, "Sin indicadores asignados", null, null, null]);
    }
    for (const indicator of own) {
      frameworkRows.push([
        framework.name,
        framework.description || null,
        indicator.institutionalCode || null,
        indicator.name,
        LEVEL_LABELS[indicator.level],
        ORIENTATION_LABELS[indicator.orientation],
        indicator.odsAlignments.map((alignment) => alignment.targetCode).join("; ") || null,
      ]);
    }
  }
  for (const indicator of included) {
    if (frameworkNames(indicator, activeFrameworks).length > 0) continue;
    frameworkRows.push([
      "Sin marco asignado",
      null,
      indicator.institutionalCode || null,
      indicator.name,
      LEVEL_LABELS[indicator.level],
      ORIENTATION_LABELS[indicator.orientation],
      indicator.odsAlignments.map((alignment) => alignment.targetCode).join("; ") || null,
    ]);
  }
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows([frameworkHeader, ...frameworkRows], [32, 46, 22, 60, 20, 34, 22]),
    "Marcos de la fundación",
  );

  const smartKeys = Object.keys(SMART_LABELS) as SmartCriterion[];
  const smartHeader: Row = ["Indicador", ...smartKeys.map((key) => SMART_LABELS[key]), "Qué corregir"];
  const smartRows: Row[] = included.map((indicator) => {
    const smart = assessSmart(indicator);
    return [
      indicator.name,
      ...smartKeys.map((key) => (smart.criteria[key].ok ? "Cumple" : "Revisar")),
      smart.failed.map((key) => `${SMART_LABELS[key]}: ${smart.criteria[key].reason}`).join(" ") || null,
    ];
  });
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows([smartHeader, ...smartRows], [60, 14, 14, 14, 14, 20, 80]),
    "Matriz SMART",
  );

  const rulesHeader: Row = ["Regla", "Qué exige", "Aplicación en este proyecto", "Parámetros", "Resultado", "Justificación si no se aplica"];
  const rulesRows: Row[] = RULE_DEFINITIONS.map((rule) => {
    const setting = settings.rules.rules[rule.id];
    const status = review.checks.find((check) => check.id === rule.id)?.status;
    const parameters =
      rule.id === "logicaVertical"
        ? `Mínimo por nivel de la cadena: ${settings.rules.minChainItems}`
        : rule.id === "cobertura"
          ? `Gestión ${settings.rules.minByLevel.gestion}; producto ${settings.rules.minByLevel.producto}; resultado ${settings.rules.minByLevel.resultado}; impacto ${settings.rules.minByLevel.impacto}`
          : null;
    return [
      rule.label,
      rule.description,
      setting.enabled ? "Se aplica" : "No se aplica",
      setting.enabled ? parameters : null,
      status === "cumple" ? "Cumple" : status === "revisar" ? "Revisar" : "No evaluada",
      setting.enabled ? null : setting.justification.trim() || "SIN JUSTIFICACIÓN",
    ];
  });
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows([rulesHeader, ...rulesRows], [26, 70, 24, 46, 16, 60]),
    "Reglas aplicadas",
  );

  const pendHeader: Row = ["Origen", "Asunto", "Detalle", "Estado"];
  const pendRows: Row[] = [];
  for (const w of analysis.warnings) {
    pendRows.push(["Análisis", w.field, w.message, "Abierto"]);
  }
  for (const issue of review.issues) {
    pendRows.push([
      "Validación del marco lógico",
      `${issue.severity.toUpperCase()} — ${issue.area}`,
      `${issue.message} Acción requerida: ${issue.action}`,
      "Abierto",
    ]);
  }
  for (const q of analysis.questions) {
    pendRows.push([
      "Pregunta al equipo",
      q.question,
      q.whyItMatters,
      q.answer.trim() ? "Respondida" : "Abierto",
    ]);
  }
  for (const i of included) {
    for (const p of i.pendingIssues) {
      pendRows.push(["Indicador", i.name, p, "Abierto"]);
    }
    const evaluation = evaluateTarget(i);
    for (const flag of evaluation.flags) {
      pendRows.push(["Meta del indicador", i.name, flag, "Abierto"]);
    }
    for (const issue of evaluation.incompatibilities) {
      pendRows.push(["Meta del indicador", i.name, issue, "Abierto"]);
    }
  }
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows([pendHeader, ...pendRows], [22, 44, 80, 14]),
    "Pendientes",
  );

  return wb;
}

export function exportToExcel(
  project: ProjectInput,
  analysis: SessionAnalysis,
  settings: PlatformSettings = defaultSettings(),
): void {
  const wb = buildWorkbook(project, analysis, settings);
  const base = (project.name || "medidor-de-indicadores")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${base || "medidor-de-indicadores"}.xlsx`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
