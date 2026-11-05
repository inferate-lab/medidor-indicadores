/**
 * Saneamiento de texto.
 *
 * 1. `sanitizeCell` neutraliza fórmulas en la exportación a Excel.
 * 2. `detectEmbeddedInstructions` marca documentos que intentan dar
 *    instrucciones al análisis. El contenido cargado es evidencia, nunca
 *    instrucciones.
 */

const FORMULA_PREFIXES = ["=", "+", "-", "@"];

export function sanitizeCell(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value);
  if (text.length === 0) return "";
  const first = text.trimStart().charAt(0);
  if (FORMULA_PREFIXES.includes(first)) {
    return `'${text}`;
  }
  return text;
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignora(?:r|)\s+(?:las\s+)?(?:instrucciones|indicaciones|reglas)\s+(?:anteriores|previas|del sistema)/i,
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
  /olvida(?:r|)\s+(?:todo|las instrucciones)/i,
  /act[úu]a\s+como\s+(?:si|un|una)\b/i,
  /you\s+are\s+now\s+(?:a|an)\b/i,
  /system\s*prompt/i,
  /\bprompt\s+del\s+sistema\b/i,
  /(?:desarrolla|revela)\s+(?:tus\s+)?instrucciones/i,
  /no\s+apliques\s+(?:las\s+)?(?:reglas|restricciones|validaciones)/i,
  /inventa\s+(?:cifras|datos|l[íi]neas?\s+base)/i,
  /\[\s*(?:system|assistant)\s*\]/i,
];

export interface InjectionScan {
  suspicious: boolean;
  matches: string[];
}

export function detectEmbeddedInstructions(text: string): InjectionScan {
  const matches: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    const found = text.match(pattern);
    if (found) matches.push(found[0].trim().slice(0, 120));
  }
  return { suspicious: matches.length > 0, matches };
}

/**
 * Envuelve el texto del proyecto como evidencia inerte antes de enviarlo al
 * modelo, y neutraliza delimitadores que podrían cerrar el bloque.
 */
export function wrapAsEvidence(text: string): string {
  const neutral = text.replace(/<\/?evidencia_proyecto>/gi, "[bloque]");
  return `<evidencia_proyecto>\n${neutral}\n</evidencia_proyecto>`;
}
