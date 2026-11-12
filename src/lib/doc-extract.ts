/**
 * Extracción de texto en el navegador. Nada se sube a un servidor ni se guarda.
 */

export const MAX_FILE_BYTES = 12 * 1024 * 1024;
export const MAX_TEXT_CHARS = 120_000;

export class ExtractionError extends Error {}

function extensionOf(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() as string) : "";
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractionError(
      `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el límite es 12 MB.`,
    );
  }
  const ext = extensionOf(file.name);

  if (["xlsx", "xls", "xlsm", "csv"].includes(ext)) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const lines: string[] = [];
    for (const name of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name]!, {
        header: 1, defval: null, blankrows: true,
      });
      lines.push(`Hoja: ${name}`);
      rows.forEach((row, index) => {
        const cells = row.flatMap((value, column) => value === null || value === "" ? [] :
          [`${XLSX.utils.encode_col(column)}: ${String(value)}`]);
        if (cells.length) lines.push(`Fila ${index + 1} | ${cells.join(" | ")}`);
      });
    }
    if (!lines.some((line) => line.startsWith("Fila "))) {
      throw new ExtractionError("El Excel no contiene celdas con datos. Revisa las hojas del archivo.");
    }
    const text = lines.join("\n");
    if (text.length > MAX_TEXT_CHARS) {
      throw new ExtractionError("El Excel supera el límite de lectura. Carga un archivo con las hojas del proyecto que quieres analizar.");
    }
    return text;
  }

  if (ext === "txt" || ext === "md" || file.type === "text/plain") {
    return truncate(await file.text());
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth/mammoth.browser.js");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return truncate(result.value);
  }

  if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    const chunks: string[] = [];
    for (let page = 1; page <= doc.numPages; page += 1) {
      const content = await (await doc.getPage(page)).getTextContent();
      chunks.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " "),
      );
    }
    const text = chunks.join("\n\n").trim();
    if (!text) {
      throw new ExtractionError(
        "El PDF no contiene texto seleccionable (parece escaneado). Pega el texto manualmente.",
      );
    }
    return truncate(text);
  }

  if (ext === "doc") {
    throw new ExtractionError(
      "El formato .doc antiguo no se puede leer aquí. Guárdalo como .docx o .pdf.",
    );
  }

  throw new ExtractionError(
    `No se puede leer un archivo .${ext || "sin extensión"}. Formatos admitidos: Excel, CSV, PDF, DOCX y TXT.`,
  );
}

function truncate(text: string): string {
  const clean = text.replace(/\u0000/g, "").trim();
  return clean.length > MAX_TEXT_CHARS ? `${clean.slice(0, MAX_TEXT_CHARS)}\n[Texto recortado]` : clean;
}

