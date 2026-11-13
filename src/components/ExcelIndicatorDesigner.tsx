import { useEffect, useState } from "react";
import {
  buildSuggestionWorkbook,
  calculateProportion,
  designFromExecution,
} from "@/lib/indicator-design";
import { LEVEL_LABELS, type Indicator } from "@/types/medidor";
import type { ExecutionProject, ExecutionWorkbook } from "@/types/execution";

const panel = "rounded-xl border bg-card p-5 shadow-sm";
const button =
  "rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50";
type Result = Awaited<ReturnType<typeof designFromExecution>>;

export function ExcelIndicatorDesigner({
  onTrackProjects,
  onAdopt,
  incomingUpload,
  onUpload,
  uploadBusy,
}: {
  onUpload: (file: File) => Promise<void>;
  uploadBusy: boolean;
  incomingUpload: { name: string; workbook: ExecutionWorkbook } | null;
  onTrackProjects: (projects: ExecutionProject[], year: number) => void;
  onAdopt: (projectId: string, indicator: Indicator) => void;
}) {
  const [year, setYear] = useState("");
  const [workbook, setWorkbook] = useState<ExecutionWorkbook | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  useEffect(() => {
    if (!incomingUpload) return;
    setWorkbook(incomingUpload.workbook);
    setFileName(incomingUpload.name);
    setResult(null);
    setSelected("");
    setYear("");
    setError("");
    document
      .getElementById("excel-project-import")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [incomingUpload]);
  async function suggest() {
    const project = workbook?.projects.find((item) => item.id === selected);
    if (!project) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await designFromExecution(project));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo analizar el proyecto.");
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!project || !result) return;
    try {
      const XLSX = await import("xlsx");
      const bytes = XLSX.write(buildSuggestionWorkbook(project, result), {
        type: "array",
        bookType: "xlsx",
      });
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "indicadores-y-ods-sugeridos.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setError("No se pudo generar el Excel de indicadores. Intenta de nuevo.");
    }
  }
  const project = workbook?.projects.find((item) => item.id === selected);
  return (
    <div className="space-y-5">
      <section id="excel-project-import" className={panel}>
        <h2 className="text-xl font-semibold">Del Excel a indicadores que puedes medir</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          1. Carga tu consolidado. 2. Crea el seguimiento de sus proyectos. 3. Incorpora los
          indicadores que quieras medir.
        </p>
        <p className="mt-2 text-sm">
          Lee planes con Alcance, Actividad y meses con Meta / Resultado. Reconoce el objeto y los
          ODS declarados en la hoja Consolidado. Los resúmenes financieros no se suman otra vez.
        </p>
        <label className={`${button} mt-4 inline-block cursor-pointer`}>
          {busy || uploadBusy ? "Procesando…" : "Cargar Excel para sugerir indicadores"}
          <input
            disabled={busy || uploadBusy}
            className="sr-only"
            type="file"
            accept=".xlsx,.xlsm,.xls,.csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpload(file);
              event.target.value = "";
            }}
          />
        </label>
        {workbook && (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              {fileName} · {workbook.projects.length} proyectos reconocidos. Se detectó un
              consolidado: indica la vigencia y crea el seguimiento.
            </p>
            <label className="block text-sm font-medium">
              Vigencia de los planes (revisa el Excel, no se deduce del nombre del archivo)
              <input
                aria-label="Vigencia de los planes"
                type="number"
                min="1900"
                max="2200"
                className="mt-1 block w-full rounded-md border bg-background p-3"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            </label>
            <button
              className={button}
              disabled={!year || busy}
              onClick={() => {
                try {
                  onTrackProjects(workbook.projects, Number(year));
                  setError("");
                } catch (cause) {
                  setError(
                    cause instanceof Error ? cause.message : "No se pudo crear el seguimiento.",
                  );
                }
              }}
            >
              Crear seguimiento de todos los proyectos
            </button>
            <label className="block text-sm font-medium">
              Proyecto a medir
              <select
                aria-label="Proyecto a medir"
                disabled={busy}
                className="mt-1 block w-full rounded-md border bg-background p-3"
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value);
                  setResult(null);
                }}
              >
                <option value="">Elige un proyecto</option>
                {workbook.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button className={button} disabled={busy || !selected} onClick={suggest}>
              Sugerir indicadores y vincular ODS
            </button>
            <details className="text-sm text-muted-foreground">
              <summary>Qué hojas se interpretaron</summary>
              <p>Planes: {workbook.projects.map((item) => item.sheet).join(", ")}.</p>
              <p>Hojas sin plan mensual (no se suman): {workbook.skippedSheets.join(", ")}.</p>
            </details>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-950"
          >
            {error}
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          El Excel original y las sugerencias se leen en memoria. Los proyectos e indicadores
          incorporados al seguimiento se guardan en la cartera de este navegador.
        </p>
      </section>
      {result && project && (
        <>
          <section className={panel}>
            <h2 className="text-lg font-semibold">{project.name}: esto ya se puede medir</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fuente: hoja {project.sheet}. Corte inferido: {result.execution.cutoffLabel}; revisa
              que corresponda al periodo reportado.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {result.insights.measured.map((item) => (
                <div key={item.name} className="rounded-lg border p-3">
                  <h3 className="text-sm font-medium">{item.name}</h3>
                  <p className="mt-2 text-xl font-semibold">{item.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm">
              Las actividades y asistencias miden ejecución y alcance. Para medir cambios en acceso
              al agua, aprendizaje o igualdad de género hacen falta los datos indicados en cada
              ficha.
            </p>
            {project.warnings.map((warning) => (
              <p key={warning} className="mt-2 text-sm text-amber-800">
                {warning}
              </p>
            ))}
          </section>
          <section className={panel}>
            <h2 className="text-lg font-semibold">
              Qué medir a continuación y con qué ODS se relaciona
            </h2>
            <button className={`${button} mt-3`} onClick={download}>
              Descargar indicadores y ODS en Excel
            </button>
            <p className="mt-1 text-sm text-muted-foreground">
              Sugerencias para revisión. Las cifras que faltan permanecen sin dato; no se inventan
              líneas base ni metas. Los indicadores de proyecto no sustituyen los indicadores
              globales ODS.
            </p>
            <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
              {result.design.indicators.map((indicator) => (
                <IndicatorSuggestion
                  key={`${selected}-${indicator.id}`}
                  indicator={indicator}
                  onAdopt={() => {
                    try {
                      onAdopt(project.id, indicator);
                      setError("");
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "No se pudo incorporar el indicador.",
                      );
                    }
                  }}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function IndicatorSuggestion({
  indicator,
  onAdopt,
}: {
  indicator: Indicator;
  onAdopt: () => void;
}) {
  const [numerator, setNumerator] = useState("");
  const [denominator, setDenominator] = useState("");
  const value = calculateProportion(numerator, denominator);
  const proportion = /porcentaje/i.test(indicator.unit) && indicator.formula.includes("100");
  return (
    <article className="rounded-lg border p-4">
      <p className="text-xs font-medium text-primary">
        {LEVEL_LABELS[indicator.level]} · Sugerido, falta medir
      </p>
      <h3 className="mt-1 font-semibold">{indicator.name}</h3>
      <button className={`${button} mt-2`} onClick={onAdopt}>
        Incorporar al seguimiento de este proyecto
      </button>
      <p className="mt-2 text-sm">{indicator.observedChange}</p>
      <p className="mt-2 text-sm">
        <strong>Fórmula:</strong> {indicator.formula}
      </p>
      <p className="mt-1 text-sm">
        <strong>Datos necesarios:</strong> {indicator.numerator}
        {proportion ? ` / ${indicator.denominator}` : ""}.
      </p>
      <p className="mt-1 text-sm">
        <strong>Cómo obtenerlos:</strong> {indicator.instrument}. {indicator.frequency}.
      </p>
      <div className="mt-3 space-y-2">
        {indicator.odsAlignments.length ? (
          indicator.odsAlignments.map((alignment) => (
            <details key={alignment.id} className="rounded border bg-muted/30 p-2 text-sm">
              <summary className="cursor-pointer font-medium">
                ODS {alignment.goalNumber} · Meta {alignment.targetCode} · relación sugerida
              </summary>
              <p className="mt-2">{alignment.officialTargetText}</p>
              <p className="mt-2 text-xs">{alignment.causalRationale}</p>
              <p className="mt-1 text-xs">
                Indicadores globales de referencia: {alignment.officialIndicatorCodes.join(", ")}.{" "}
                {alignment.compatibilityAssessment}
              </p>
            </details>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin meta ODS específica: este indicador apoya la gestión del proyecto.
          </p>
        )}
      </div>
      {proportion && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Calcular con mis datos del mismo periodo
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Usa la misma población, unidad y periodo en ambas cifras. Este cálculo no confirma una
            meta ni demuestra impacto.
          </p>
          <label className="mt-2 block">
            Numerador: {indicator.numerator}
            <input
              className="mt-1 block w-full rounded border bg-background p-2"
              inputMode="decimal"
              value={numerator}
              onChange={(event) => setNumerator(event.target.value)}
            />
          </label>
          <label className="mt-2 block">
            Denominador: {indicator.denominator}
            <input
              className="mt-1 block w-full rounded border bg-background p-2"
              inputMode="decimal"
              value={denominator}
              onChange={(event) => setDenominator(event.target.value)}
            />
          </label>
          <p role="status" className="mt-2 font-medium">
            {value === null
              ? "Sin cálculo: ingresa cifras válidas y un denominador mayor que cero."
              : `${value.toLocaleString("es-CO", { maximumFractionDigits: 2 })}%`}
          </p>
        </details>
      )}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer">Por qué se sugiere y qué revisar</summary>
        <p className="mt-2">{indicator.recommendationRationale}</p>
        <p className="mt-2">
          {indicator.projectEvidence.join(" ") ||
            "Plantilla general: confirma su pertinencia para este proyecto."}
        </p>
        <p className="mt-2">{indicator.attributionLimits}</p>
      </details>
    </article>
  );
}
