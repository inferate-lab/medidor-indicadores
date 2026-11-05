/**
 * Reglas de alineación ODS: validación de códigos, límites de asociación y
 * detector de ODS-washing.
 */

import { findTarget, ODS_SOURCE } from "@/data/ods-catalog";
import type { Indicator, OdsAlignment } from "@/types/medidor";

export const MAX_PRIMARY = 1;
export const MAX_SECONDARY = 2;

export function isValidTargetCode(code: string): boolean {
  return findTarget(code) !== undefined;
}

export interface AlignmentValidation {
  ok: boolean;
  errors: string[];
}

export function validateAlignments(alignments: OdsAlignment[]): AlignmentValidation {
  const errors: string[] = [];
  const principals = alignments.filter((a) => a.role === "principal");
  const secondaries = alignments.filter((a) => a.role === "secundaria");

  if (principals.length > MAX_PRIMARY) {
    errors.push("Solo se admite una meta ODS principal por indicador.");
  }
  if (secondaries.length > MAX_SECONDARY) {
    errors.push("Se admiten como máximo dos metas ODS secundarias por indicador.");
  }
  for (const a of alignments) {
    const official = findTarget(a.targetCode);
    if (!official) {
      errors.push(`La meta ${a.targetCode} no existe en el catálogo oficial.`);
      continue;
    }
    if (official.text !== a.officialTargetText) {
      errors.push(`El texto oficial de la meta ${a.targetCode} fue alterado.`);
    }
    if (official.goal !== a.goalNumber) {
      errors.push(`La meta ${a.targetCode} no pertenece al ODS ${a.goalNumber}.`);
    }
  }
  const codes = alignments.map((a) => a.targetCode);
  if (new Set(codes).size !== codes.length) {
    errors.push("Hay metas ODS repetidas en el mismo indicador.");
  }
  return { ok: errors.length === 0, errors };
}

export interface WashingSignal {
  weak: boolean;
  reasons: string[];
}

/**
 * Marca alineación débil cuando solo hay coincidencia temática, cuando no hay
 * vínculo con un resultado, o cuando se asocian más de tres metas.
 */
export function detectOdsWashing(indicator: Indicator): WashingSignal {
  const reasons: string[] = [];
  const alignments = indicator.odsAlignments;
  if (alignments.length === 0) return { weak: false, reasons };

  if (alignments.length > 3) {
    reasons.push("Más de tres metas ODS asociadas: la contribución se diluye.");
  }
  if (indicator.level === "gestion") {
    reasons.push(
      "Es un indicador de gestión: no requiere alineación ODS y la asociación puede ser decorativa.",
    );
  }
  // Los productos pueden contribuir legítimamente a una meta ODS cuando son
  // el entregable que habilita el cambio. La alerta se reserva para gestión.
  for (const a of alignments) {
    if (a.causalRationale.trim().length < 40) {
      reasons.push(
        `La meta ${a.targetCode} solo tiene coincidencia temática: falta justificación causal.`,
      );
    }
    if (a.contributionType === "indirecta" && a.role === "principal") {
      reasons.push(
        `La meta principal ${a.targetCode} declara contribución indirecta; revisa si debería ser secundaria.`,
      );
    }
  }
  return { weak: reasons.length > 0, reasons };
}

export function buildAlignment(
  targetCode: string,
  role: "principal" | "secundaria",
): OdsAlignment | null {
  const official = findTarget(targetCode);
  if (!official) return null;
  return {
    id: `${role}-${targetCode}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    goalNumber: official.goal,
    goalTitle: official.goalTitle,
    targetCode: official.code,
    officialTargetText: official.text,
    // Los códigos oficiales siempre salen del catálogo local versionado. De
    // este modo la IA puede sugerir una meta, pero nunca inventar ni omitir el
    // marco oficial asociado a esa meta.
    officialIndicatorCodes: [...official.indicatorCodes],
    contributionType: "directa",
    causalRationale: "",
    compatibilityAssessment: "",
    localProxy: null,
    sourceVersion: ODS_SOURCE.version,
    reviewStatus: "sugerida",
  };
}
