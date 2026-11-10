/**
 * Revisión SMART de un indicador a partir de su propia ficha.
 *
 * No hay puntaje: cada criterio se cumple o no, con su razón, porque un
 * promedio escondería fallos que impiden medir. Las comprobaciones son
 * deterministas; la pertinencia de fondo la decide el equipo.
 */

import type { Indicator, SmartAssessment, SmartCriterion } from "@/types/medidor";

function filled(value: string): boolean {
  const clean = value.trim().toLowerCase();
  return clean.length > 0 && !clean.startsWith("pendiente");
}

export function assessSmart(indicator: Indicator): SmartAssessment {
  const missingM = [
    filled(indicator.unit) ? "" : "unidad",
    filled(indicator.formula) ? "" : "fórmula",
    filled(indicator.numerator) ? "" : "qué se cuenta",
    filled(indicator.primarySource) ? "" : "fuente",
    filled(indicator.instrument) ? "" : "instrumento",
  ].filter(Boolean);
  const specific = filled(indicator.name) && filled(indicator.population) && filled(indicator.observedChange);
  const relevant = indicator.projectEvidence.length > 0 || indicator.decision === "modificado";
  const timed = filled(indicator.frequency) && filled(indicator.baselinePlan.timing);
  const criteria: SmartAssessment["criteria"] = {
    S: {
      ok: specific,
      reason: specific
        ? "Identifica quién cambia y qué cambia."
        : "Falta precisar la población o el cambio que observa.",
    },
    M: {
      ok: missingM.length === 0,
      reason: missingM.length === 0 ? "Tiene unidad, fórmula, fuente e instrumento." : `Falta: ${missingM.join(", ")}.`,
    },
    A: {
      ok: filled(indicator.responsible),
      reason: !filled(indicator.responsible)
        ? "No tiene responsable de la medición."
        : indicator.measurementBurden === "alta"
          ? "Tiene responsable. La carga de medición es alta: confirma tiempo y presupuesto."
          : "Tiene responsable y una carga de medición manejable.",
    },
    R: {
      ok: relevant,
      reason: relevant
        ? "Se apoya en el texto del proyecto o fue redactado por el equipo."
        : "No se encontró en el proyecto el resultado al que responde; confírmalo o ajústalo.",
    },
    T: {
      ok: timed,
      reason: timed ? "Define cuándo se mide y cuándo se levanta la línea base." : "Falta la frecuencia o el momento de la línea base.",
    },
  };
  const failed = (Object.keys(criteria) as SmartCriterion[]).filter((key) => !criteria[key].ok);
  return { criteria, failed };
}

const DELIVERY_TERMS = [
  "entregad",
  "entregar",
  "realizad",
  "capacitad",
  "asistente",
  "asistencia",
  "taller",
  "kits",
  "número de",
  "numero de",
  "cobertura",
  "inscrit",
];
const CHANGE_TERMS = [
  "mejor",
  "aument",
  "reduc",
  "disminu",
  "aplic",
  "adopt",
  "usan",
  "utiliz",
  "fortalec",
  "cambi",
  "incorpor",
  "mantien",
  "apropi",
];

/** Resultados que parecen describir una entrega y no un cambio. Es una señal para revisar, no un veredicto. */
export function outcomesThatLookLikeOutputs(outcomes: string[]): string[] {
  return outcomes.filter((outcome) => {
    const value = outcome.toLowerCase();
    return (
      DELIVERY_TERMS.some((term) => value.includes(term)) &&
      !CHANGE_TERMS.some((term) => value.includes(term))
    );
  });
}
