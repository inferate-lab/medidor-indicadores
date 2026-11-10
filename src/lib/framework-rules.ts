/**
 * Validación del marco lógico y clasificación por marcos institucionales.
 *
 * Las reglas son deterministas y visibles. Cada proyecto puede cambiar sus
 * umbrales o dejar de aplicar una regla, pero una regla desactivada exige una
 * justificación escrita que queda en la pantalla y en el Excel.
 */

import { directionIssues } from "@/lib/target-rules";
import {
  LEVEL_LABELS,
  RULE_DEFINITIONS,
  type CausalLevel,
  type CausalModel,
  type CheckStatus,
  type Indicator,
  type InstitutionalFramework,
  type LogicalFrameworkIssue,
  type LogicalFrameworkReview,
  type LogicalFrameworkRules,
  type ProjectInput,
  type RuleId,
} from "@/types/medidor";

const LEVELS: CausalLevel[] = ["gestion", "producto", "resultado", "impacto"];

/** Marcos activos que, por nivel causal, se proponen para un indicador nuevo. */
export function suggestFrameworkIds(
  level: CausalLevel,
  frameworks: InstitutionalFramework[],
): string[] {
  return frameworks
    .filter((framework) => framework.active && framework.suggestedLevels.includes(level))
    .map((framework) => framework.id);
}

export function frameworkNames(
  indicator: Indicator,
  frameworks: InstitutionalFramework[],
): string[] {
  return frameworks
    .filter((framework) => indicator.frameworkIds.includes(framework.id))
    .map((framework) => framework.name);
}

/** Indicadores que comparten código institucional: probable duplicado entre marcos. */
export function duplicatedCodes(indicators: Indicator[]): string[] {
  const seen = new Map<string, number>();
  for (const indicator of indicators) {
    const code = indicator.institutionalCode.trim().toLowerCase();
    if (code) seen.set(code, (seen.get(code) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([code]) => code);
}

export function reviewLogicalFramework(
  project: ProjectInput,
  causal: CausalModel,
  allIndicators: Indicator[],
  rules: LogicalFrameworkRules,
): LogicalFrameworkReview {
  const indicators = allIndicators.filter((indicator) => indicator.decision !== "excluido");
  const found: Record<RuleId, LogicalFrameworkIssue[]> = {
    poblacion: [],
    territorio: [],
    logicaVertical: [],
    cobertura: [],
    lineaBase: [],
    ods: [],
    atribucion: [],
    sentidoExito: [],
  };

  if (!project.targetPopulation.trim()) {
    found.poblacion.push({
      severity: "critico",
      area: "Población",
      message: "No se identificó una población objetivo verificable.",
      action: "Definir quién participa, quién se beneficia y los criterios de elegibilidad.",
    });
  }
  if (!project.territory.trim()) {
    found.territorio.push({
      severity: "importante",
      area: "Territorio",
      message: "La unidad territorial de análisis no está confirmada.",
      action: "Precisar municipios, instituciones, comunidades o ecosistemas incluidos.",
    });
  }

  const min = rules.minChainItems;
  if (causal.activities.length < min || causal.outputs.length < min || causal.outcomes.length < min) {
    found.logicaVertical.push({
      severity: "critico",
      area: "Lógica vertical",
      message: `La cadena actividad–producto–resultado no alcanza el mínimo de ${min} elemento(s) por nivel.`,
      action: "Completar los niveles faltantes y comprobar que cada enlace expresa un mecanismo plausible.",
    });
  }

  const counts = indicators.reduce<Record<CausalLevel, number>>(
    (acc, indicator) => ({ ...acc, [indicator.level]: acc[indicator.level] + 1 }),
    { gestion: 0, producto: 0, resultado: 0, impacto: 0 },
  );
  for (const level of LEVELS) {
    if (counts[level] >= rules.minByLevel[level]) continue;
    found.cobertura.push({
      severity: level === "resultado" ? "critico" : "importante",
      area: `Cobertura: ${LEVEL_LABELS[level]}`,
      message: `Hay ${counts[level]} indicador(es) de ${LEVEL_LABELS[level].toLowerCase()} y el mínimo definido es ${rules.minByLevel[level]}.`,
      action:
        level === "resultado"
          ? "Incorporar resultados que vayan más allá de cobertura y entregables, o ajustar el mínimo con su justificación."
          : "Agregar indicadores de este nivel o ajustar el mínimo si el proyecto no lo requiere.",
    });
  }

  const withoutBaseline = indicators.filter(
    (indicator) => !indicator.baselinePlan.method || !indicator.baselinePlan.instrument,
  );
  if (withoutBaseline.length) {
    found.lineaBase.push({
      severity: "importante",
      area: "Línea base",
      message: `${withoutBaseline.length} indicador(es) no tienen método o instrumento de línea base.`,
      action: "Definir cómo y con qué formato se medirá el punto de partida.",
    });
  }

  if (!indicators.some((indicator) => indicator.odsAlignments.length > 0)) {
    found.ods.push({
      severity: "importante",
      area: "ODS",
      message: "Ningún indicador está vinculado a una meta ODS.",
      action: "Asociar al menos un indicador de resultado o impacto a una meta ODS.",
    });
  }
  if (indicators.some((indicator) => indicator.odsAlignments.some((a) => !a.causalRationale.trim()))) {
    found.ods.push({
      severity: "importante",
      area: "ODS",
      message: "Existe una relación ODS sin justificación causal.",
      action: "Explicar cómo el resultado contribuye a la meta ODS y diferenciar contribución de atribución.",
    });
  }

  if (indicators.some((indicator) => indicator.level === "impacto" && !indicator.attributionLimits.trim())) {
    found.atribucion.push({
      severity: "importante",
      area: "Atribución",
      message: "Un indicador de impacto no declara factores externos ni límites de atribución.",
      action: "Añadir análisis de contribución o un diseño evaluativo proporcional.",
    });
  }

  for (const indicator of indicators) {
    if (indicator.orientation !== "ascendente" && !indicator.orientationRationale.trim()) {
      found.sentidoExito.push({
        severity: "importante",
        area: "Sentido de éxito",
        message: `"${indicator.name}" no mejora al aumentar, pero no explica por qué.`,
        action: "Escribir por qué disminuir, mantenerse o permanecer en un rango representa el éxito del proyecto.",
      });
    }
    for (const message of directionIssues(indicator)) {
      found.sentidoExito.push({
        severity: "importante",
        area: "Sentido de éxito",
        message: `"${indicator.name}": ${message}`,
        action: "Corregir la meta o el sentido de éxito del indicador.",
      });
    }
  }

  const issues: LogicalFrameworkIssue[] = [];
  const exemptions: LogicalFrameworkReview["exemptions"] = [];
  const checks = RULE_DEFINITIONS.map((rule) => {
    const setting = rules.rules[rule.id];
    let status: CheckStatus;
    if (setting.enabled) {
      issues.push(...found[rule.id]);
      status = found[rule.id].length ? "revisar" : "cumple";
    } else {
      status = "exenta";
      exemptions.push({ rule: rule.label, justification: setting.justification.trim() });
      if (!setting.justification.trim()) {
        issues.push({
          severity: "importante",
          area: `Regla no aplicada: ${rule.label}`,
          message: "La regla se desactivó sin justificación.",
          action: "Escribir por qué no aplica a este proyecto o volver a activarla.",
        });
      }
    }
    return { id: rule.id, label: rule.label, status };
  });

  const duplicates = duplicatedCodes(indicators);
  if (duplicates.length) {
    issues.push({
      severity: "importante",
      area: "Códigos institucionales",
      message: `Código repetido en más de un indicador: ${duplicates.join(", ")}.`,
      action: "Si es el mismo indicador, conservar uno solo y asignarle todos sus marcos; si no, corregir el código.",
    });
  }

  return {
    status: issues.some((issue) => issue.severity === "critico")
      ? "incompleto"
      : issues.length
        ? "requiere_ajustes"
        : "coherente",
    strengths: [
      `La batería combina ${counts.gestion} indicadores de gestión, ${counts.producto} de producto, ${counts.resultado} de resultado y ${counts.impacto} de impacto.`,
      "Cada indicador incluye una línea base sugerida, fórmula, fuente, instrumento y referencia internacional.",
      "La alineación ODS está separada de la meta cuantitativa del proyecto.",
    ],
    issues,
    checks,
    exemptions,
  };
}
