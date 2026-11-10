/**
 * Reglas del constructor de meta del indicador.
 *
 * Ninguna meta cuantitativa puede existir sin evidencia explícita:
 * - sin línea base y regla escrita no se calcula nada;
 * - sin fuente no se propone benchmark;
 * - el cero solo se conserva si una persona lo escribió;
 * - `null` es un valor válido y esperado.
 */

import type { Indicator, IndicatorTarget } from "@/types/medidor";

export type TargetFlag = "REQUIERE LÍNEA BASE" | "REQUIERE BENCHMARK" | "REQUIERE VALIDACIÓN";

export interface TargetEvaluation {
  flags: TargetFlag[];
  incompatibilities: string[];
  canHoldValue: boolean;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function evaluateTarget(indicator: Indicator): TargetEvaluation {
  const t = indicator.target;
  const flags: TargetFlag[] = [];
  const incompatibilities: string[] = [];
  const hasQuantifiedTarget = t.value !== null || t.lowerBound !== null || t.upperBound !== null;

  if (t.determinationMethod === "calculo_linea_base") {
    if (isBlank(t.baselineReference) || t.baselineValue === null || isBlank(t.calculationRule)) {
      flags.push("REQUIERE LÍNEA BASE");
    }
  }
  if (
    t.determinationMethod === "benchmark_verificado" &&
    (isBlank(t.benchmarkReference) || isBlank(t.evidenceSource))
  ) {
    flags.push("REQUIERE BENCHMARK");
  }
  if (hasQuantifiedTarget && t.validationStatus !== "aprobada") {
    flags.push("REQUIERE VALIDACIÓN");
  }
  if (
    t.value !== null &&
    t.determinationMethod === "ingreso_humano" &&
    (isBlank(t.evidenceSource) || isBlank(t.enteredBy))
  ) {
    flags.push("REQUIERE VALIDACIÓN");
  }

  if (t.value !== null && !isBlank(t.unit) && !isBlank(indicator.unit)) {
    if (t.unit.trim().toLowerCase() !== indicator.unit.trim().toLowerCase()) {
      incompatibilities.push(
        `La unidad de la meta ("${t.unit}") no coincide con la del indicador ("${indicator.unit}").`,
      );
    }
  }
  if (
    t.value !== null &&
    !isBlank(t.targetPopulation) &&
    !isBlank(indicator.population) &&
    t.targetPopulation.trim().toLowerCase() !== indicator.population.trim().toLowerCase()
  ) {
    incompatibilities.push(
      "La población de la meta difiere de la población del indicador; verifica que sean comparables.",
    );
  }
  if (hasQuantifiedTarget && isBlank(t.targetDate)) {
    incompatibilities.push("La meta no tiene fecha; sin plazo no es verificable.");
  }
  if (
    t.validationStatus === "aprobada" &&
    (isBlank(t.responsibleApprover) || isBlank(t.approvedAt))
  ) {
    incompatibilities.push("Una meta aprobada requiere responsable y fecha de aprobación.");
  }
  if (t.lowerBound !== null && t.upperBound !== null && t.lowerBound > t.upperBound) {
    incompatibilities.push("El límite inferior es mayor que el superior.");
  }
  if (indicator.territory.trim() && t.targetPopulation.trim() === "" && t.value !== null) {
    incompatibilities.push(
      "Define la población objetivo de la meta para poder contrastarla con el territorio del indicador.",
    );
  }
  if (
    t.value !== null &&
    indicator.territory.trim() &&
    t.targetTerritory.trim() &&
    indicator.territory.trim().toLowerCase() !== t.targetTerritory.trim().toLowerCase()
  ) {
    incompatibilities.push(
      "El territorio de la meta difiere del territorio del indicador; documenta la razón.",
    );
  }

  incompatibilities.push(...directionIssues(indicator));

  return {
    flags: [...new Set(flags)],
    incompatibilities: [...new Set(incompatibilities)],
    canHoldValue: canAcceptValue(t).ok,
  };
}

/**
 * Coherencia entre la meta y el sentido de éxito del indicador. Un indicador
 * descendente (por ejemplo, participantes que dejan de necesitar el programa)
 * es válido; lo incoherente es una meta que va en sentido contrario.
 */
export function directionIssues(indicator: Indicator): string[] {
  const t = indicator.target;
  const issues: string[] = [];
  const comparable = t.value !== null && t.baselineValue !== null;
  if (indicator.orientation === "descendente" && comparable && t.value! >= t.baselineValue!) {
    issues.push("El indicador mejora al disminuir, pero la meta no es menor que la línea base.");
  }
  if (indicator.orientation === "ascendente" && comparable && t.value! < t.baselineValue!) {
    issues.push(
      "La meta es menor que la línea base. Si el éxito consiste en disminuir, cambia el sentido de éxito del indicador.",
    );
  }
  if (
    indicator.orientation === "rango" &&
    (t.value !== null || t.lowerBound !== null || t.upperBound !== null) &&
    (t.lowerBound === null || t.upperBound === null)
  ) {
    issues.push("El éxito es permanecer en un rango: la meta necesita límite inferior y superior.");
  }
  if (
    indicator.orientation === "estable" &&
    comparable &&
    t.value !== t.baselineValue &&
    (t.lowerBound === null || t.upperBound === null)
  ) {
    issues.push(
      "El éxito es mantenerse: la meta difiere de la línea base y no define el margen tolerado (límite inferior y superior).",
    );
  }
  return issues;
}

/**
 * Avance hacia la meta como proporción (1 = meta alcanzada), respetando el
 * sentido de éxito. Devuelve null cuando falta un dato o cuando el indicador
 * no se evalúa por avance. Para "estable" y "rango" usa `withinTarget`.
 */
export function progressToward(
  orientation: Indicator["orientation"],
  baseline: number | null,
  target: number | null,
  current: number | null,
): number | null {
  if (orientation !== "ascendente" && orientation !== "descendente") return null;
  if (baseline === null || target === null || current === null || target === baseline) return null;
  return (current - baseline) / (target - baseline);
}

/** Para indicadores de rango: si el valor actual está dentro de los límites. */
export function withinTarget(
  lowerBound: number | null,
  upperBound: number | null,
  current: number | null,
): boolean | null {
  if (lowerBound === null || upperBound === null || current === null) return null;
  return current >= lowerBound && current <= upperBound;
}

export function canAcceptValue(t: IndicatorTarget): { ok: boolean; reason: string | null } {
  switch (t.determinationMethod) {
    case "ingreso_humano":
      if (isBlank(t.evidenceSource)) {
        return { ok: false, reason: "Registra el fundamento o fuente de la meta ingresada." };
      }
      if (isBlank(t.enteredBy)) {
        return { ok: false, reason: "Identifica quién ingresó la meta." };
      }
      return { ok: true, reason: null };
    case "calculo_linea_base":
      if (isBlank(t.baselineReference) || t.baselineValue === null) {
        return { ok: false, reason: "Registra la línea base antes de calcular una meta." };
      }
      if (isBlank(t.calculationRule)) {
        return {
          ok: false,
          reason: "Escribe la regla de cálculo explícita antes de calcular una meta.",
        };
      }
      return { ok: true, reason: null };
    case "benchmark_verificado":
      if (isBlank(t.benchmarkReference) || isBlank(t.evidenceSource)) {
        return {
          ok: false,
          reason: "Describe el benchmark comparable y registra su fuente verificable.",
        };
      }
      return { ok: true, reason: null };
    case "pendiente":
    default:
      return { ok: false, reason: "La meta está pendiente: no admite valores." };
  }
}

/**
 * Normaliza un valor escrito por una persona. Un campo vacío es `null`,
 * nunca 0. El cero solo sobrevive si fue escrito explícitamente.
 */
export function parseNumericInput(raw: string): { value: number | null; explicitZero: boolean } {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, explicitZero: false };
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) return { value: null, explicitZero: false };
  return { value: parsed, explicitZero: parsed === 0 };
}

/** Nunca convierte un faltante en 0. */
export function coalesceMissing(value: number | null | undefined): number | null {
  return value === null || value === undefined || Number.isNaN(value) ? null : value;
}
