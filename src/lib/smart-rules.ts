/**
 * Revisión SMART de un indicador a partir de su propia ficha y de la cadena
 * causal del proyecto.
 *
 * No hay puntaje: cada criterio se cumple o no, con su razón, porque un
 * promedio escondería fallos que impiden medir. Las comprobaciones son
 * deterministas y prudentes; la pertinencia de fondo la decide el equipo.
 */

import type { CausalModel, Indicator, SmartAssessment, SmartCriterion } from "@/types/medidor";

const PLACEHOLDERS = ["pendiente", "por definir", "por confirmar", "sin definir", "n/a", "na", "tbd", "no aplica"];

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Un campo con texto de relleno no cuenta como diligenciado. */
function filled(value: string): boolean {
  const clean = plain(value);
  return clean.length > 0 && !PLACEHOLDERS.some((item) => clean === item || clean.startsWith(`${item} `));
}

function keywords(value: string): Set<string> {
  return new Set(plain(value).split(/[^a-z0-9]+/).filter((word) => word.length >= 5));
}

/**
 * Elemento de la cadena causal con el que el indicador comparte vocabulario.
 * Es una señal de trazabilidad, no una prueba: exige al menos dos términos en común.
 */
export function tracedCausalStatement(indicator: Indicator, causal: CausalModel): string | null {
  const own = keywords(`${indicator.name} ${indicator.observedChange}`);
  const statements = [...causal.outcomes, ...causal.outputs, causal.impact, ...causal.activities];
  for (const statement of statements) {
    let shared = 0;
    for (const word of keywords(statement)) if (own.has(word)) shared += 1;
    if (shared >= 2) return statement;
  }
  return null;
}

export function assessSmart(indicator: Indicator, causal: CausalModel): SmartAssessment {
  const missingM = [
    filled(indicator.unit) ? "" : "unidad",
    filled(indicator.formula) ? "" : "fórmula",
    filled(indicator.numerator) ? "" : "qué se cuenta",
    filled(indicator.primarySource) ? "" : "fuente",
    filled(indicator.instrument) ? "" : "instrumento",
  ].filter(Boolean);
  const specific = filled(indicator.name) && filled(indicator.population) && filled(indicator.observedChange);
  const relevant = indicator.projectEvidence.length > 0 || tracedCausalStatement(indicator, causal) !== null;
  const timed = filled(indicator.frequency) && filled(indicator.baselinePlan.timing);
  const hasResponsible = filled(indicator.responsible);
  const unsupportedBurden = indicator.measurementBurden === "alta" && causal.resources.length === 0;
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
      ok: hasResponsible && !unsupportedBurden,
      reason: !hasResponsible
        ? "No tiene responsable de la medición."
        : unsupportedBurden
          ? "La carga de medición es alta y el proyecto no declara recursos que la respalden."
          : indicator.measurementBurden === "alta"
            ? "Tiene responsable y recursos declarados. La carga es alta: confirma que alcanzan."
            : "Tiene responsable y una carga de medición manejable.",
    },
    R: {
      ok: relevant,
      reason: relevant
        ? "Se relaciona con el texto del proyecto o con un elemento de su cadena causal."
        : "No se pudo vincular con ningún producto, resultado o impacto del proyecto; confírmalo o ajústalo.",
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
