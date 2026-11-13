import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";

import { BID_INDICATOR_CATALOG_URL, bidCategoryUrl } from "@/data/bid-catalog";
import { buildDemoExecutionSheets } from "@/data/demo-execution";
import { analyzeExecution } from "@/lib/execution-analysis";
import { parseExecutionGrids, readExecutionWorkbook } from "@/lib/execution-import";
import { buildInsights, type ProjectInsights } from "@/lib/execution-insights";
import {
  SIGNAL_LABELS,
  type ActivityResult,
  type ExecutionAnalysis,
  type ExecutionProject,
  type ExecutionWorkbook,
  type LearningSignal,
} from "@/types/execution";

const card = "rounded-xl border bg-card p-5 shadow-sm";
const SIGNAL_STYLE: Record<LearningSignal, string> = {
  escalar: "border-emerald-300 bg-emerald-50 text-emerald-950",
  en_linea: "border-sky-200 bg-sky-50 text-sky-950",
  pocos_datos: "border-slate-200 bg-slate-50 text-slate-800",
  ajustar: "border-amber-300 bg-amber-50 text-amber-950",
  sin_ejecutar: "border-red-300 bg-red-50 text-red-950",
  sin_meta: "border-violet-200 bg-violet-50 text-violet-950",
  programada_despues: "border-slate-200 bg-slate-50 text-slate-800",
  sin_actividad: "border-slate-200 bg-slate-50 text-slate-800",
  suprimida: "border-slate-200 bg-slate-50 text-slate-800",
};

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function n(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className={card}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {lead && <p className="mt-1 text-sm text-muted-foreground">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Bar({ value, tone }: { value: number | null; tone: "plan" | "done" }) {
  const width = value === null ? 0 : Math.max(0, Math.min(1.5, value)) / 1.5;
  return (
    <div className="h-2 w-full rounded bg-muted">
      <div className={`h-2 rounded ${tone === "done" ? "bg-primary" : "bg-slate-400"}`} style={{ width: `${width * 100}%` }} />
    </div>
  );
}

export function ExecutionMonitor({ onOpenMel }: { onOpenMel: (project: ExecutionProject) => void }) {
  const [workbook, setWorkbook] = useState<ExecutionWorkbook | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");

  async function load(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const parsed = readExecutionWorkbook(await file.arrayBuffer());
      setWorkbook(parsed);
      setFileName(file.name);
      setSelected("");
      if (parsed.projects.length === 0) setError(parsed.warnings[0] ?? "No se encontraron proyectos en el archivo.");
    } catch {
      setError("No fue posible leer el archivo. Verifica que sea un Excel (.xlsx) y que no esté protegido.");
    } finally {
      setBusy(false);
    }
  }

  const analyses = useMemo(
    () => new Map((workbook?.projects ?? []).map((project) => [project.id, analyzeExecution(project)])),
    [workbook],
  );
  const project = workbook?.projects.find((item) => item.id === selected);
  const analysis = project ? analyses.get(project.id) : undefined;

  if (!workbook || workbook.projects.length === 0) {
    return (
      <div className={`${card} mx-auto max-w-3xl text-center`}>
        <FileSpreadsheet aria-hidden className="mx-auto size-10 text-primary" />
        <h2 className="mt-3 text-xl font-semibold">Sube el Excel de ejecución de proyectos</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          El sistema lee cada proyecto, cuenta lo que se hizo frente a lo planeado, te dice qué funciona y qué conviene ajustar, y arma los indicadores, los ODS y el marco lógico. No tienes que diligenciar nada.
        </p>
        <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
          {busy ? "Leyendo…" : "Elegir archivo de Excel"}
          <input className="sr-only" type="file" accept=".xlsx,.xlsm" onChange={(event) => load(event.target.files?.[0])} />
        </label>
        <button
          className="ml-3 mt-5 inline-flex items-center gap-2 rounded-md border bg-background px-5 py-3 text-sm font-medium hover:bg-muted"
          onClick={() => {
            setWorkbook(parseExecutionGrids(buildDemoExecutionSheets()));
            setFileName("ejemplo ficticio");
            setSelected("");
            setError("");
          }}
        >
          Ver un ejemplo ficticio
        </button>
        {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950">{error}</p>}
        <p className="mt-5 text-xs text-muted-foreground">El archivo se lee en este navegador. No se sube a ningún servidor ni se guarda.</p>
      </div>
    );
  }

  if (!project || !analysis) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Proyectos encontrados: {workbook.projects.length}</h2>
            <p className="text-sm text-muted-foreground">Archivo: {fileName}. Elige un proyecto para ver su análisis.</p>
          </div>
          <button className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted" onClick={() => setWorkbook(null)}>Cargar otro archivo</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workbook.projects.map((item) => {
            const result = analyses.get(item.id);
            if (!result) return null;
            return (
              <button key={item.id} onClick={() => setSelected(item.id)} className={`${card} text-left transition hover:border-primary`}>
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.status || "Estado no indicado"} · corte: {result.cutoffLabel}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground">Cumplimiento</p><p className="text-xl font-semibold">{pct(result.compliance)}</p></div>
                  <div><p className="text-muted-foreground">Asistencias</p><p className="text-xl font-semibold">{n(result.participantsActualToDate)}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {result.counts.escalar > 0 && <span className={`rounded-full border px-2 py-0.5 ${SIGNAL_STYLE.escalar}`}>{result.counts.escalar} con mejor desempeño</span>}
                  {result.counts.ajustar > 0 && <span className={`rounded-full border px-2 py-0.5 ${SIGNAL_STYLE.ajustar}`}>{result.counts.ajustar} para revisar</span>}
                  {result.counts.sin_ejecutar > 0 && <span className={`rounded-full border px-2 py-0.5 ${SIGNAL_STYLE.sin_ejecutar}`}>{result.counts.sin_ejecutar} sin ejecución</span>}
                </div>
              </button>
            );
          })}
        </div>
        {workbook.skippedSheets.length > 0 && (
          <p className="text-xs text-muted-foreground">Hojas que no son planes de acción y no se analizaron: {workbook.skippedSheets.join(", ")}.</p>
        )}
      </div>
    );
  }

  return <ProjectView project={project} analysis={analysis} onBack={() => setSelected("")} onOpenMel={() => onOpenMel(project)} />;
}

function ProjectView({ project, analysis, onBack, onOpenMel }: { project: ExecutionProject; analysis: ExecutionAnalysis; onBack: () => void; onOpenMel: () => void }) {
  const [insights, setInsights] = useState<ProjectInsights | null>(null);
  const [failed, setFailed] = useState(false);
  const [women, setWomen] = useState("");
  const [filter, setFilter] = useState<LearningSignal | "todas">("todas");

  useEffect(() => {
    let active = true;
    setInsights(null);
    setFailed(false);
    buildInsights(project, analysis)
      .then((result) => {
        if (active) setInsights(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [project, analysis]);

  const hidden = analysis.counts.sin_actividad + analysis.counts.suprimida;
  const relevant = analysis.activities.filter((result) => !["sin_actividad", "suprimida"].includes(result.signal));
  const groups: LearningSignal[] = ["ajustar", "sin_ejecutar", "escalar", "sin_meta", "en_linea", "pocos_datos", "programada_despues"];
  const shown = relevant
    .filter((result) => filter === "todas" || result.signal === filter)
    .sort((a, b) => groups.indexOf(a.signal) - groups.indexOf(b.signal));
  const total = analysis.participantsActualToDate;
  const womenCount = women.trim() === "" ? null : Number(women);
  const womenValid = womenCount !== null && Number.isFinite(womenCount) && womenCount >= 0 && total !== null && womenCount <= total;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button className="text-sm text-primary underline" onClick={onBack}>← Todos los proyectos</button>
          <h2 className="mt-1 text-2xl font-semibold">{project.name}</h2>
          <button className="mt-3 rounded-md border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" onClick={onOpenMel}>Abrir ficha MEL: indicadores, teoría y marco lógico</button>
          {project.purpose && <p className="mt-1 max-w-4xl text-sm text-muted-foreground">{project.purpose.slice(0, 320)}{project.purpose.length > 320 ? "…" : ""}</p>}
        </div>
      </div>

      {project.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <strong>Antes de leer las cifras:</strong> {project.warnings.join(" ")}
        </div>
      )}

      <Section title="Cómo va el proyecto" lead={`Datos hasta ${analysis.cutoffLabel}, el último mes con ejecución registrada.`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Se ha hecho" value={`${n(analysis.executedToDate)} de ${n(analysis.plannedToDate)}`} hint={analysis.fractionalUnits ? "Unidades de avance planeadas a la fecha" : "Actividades planeadas a la fecha"} />
          <Stat label="Cumplimiento a la fecha" value={pct(analysis.compliance)} hint="Lo hecho frente a lo planeado hasta el corte" />
          <Stat label="Avance del año" value={pct(analysis.yearProgress)} hint={`Meta del año: ${n(analysis.plannedYear)}`} />
          <Stat label="Asistencias" value={n(total)} hint={analysis.participantsPlannedToDate !== null ? `Esperadas: ${n(analysis.participantsPlannedToDate)} (${pct(analysis.participantRatio)})` : "El Excel no trae participantes"} />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1 pr-3">Mes</th><th className="py-1 pr-3">Planeado</th><th className="py-1 pr-3">Hecho</th><th className="py-1 pr-3">Del mes</th><th className="w-1/3 py-1 pr-3">Acumulado frente a la meta del año</th></tr></thead>
            <tbody>
              {analysis.monthly.map((month, index) => {
                const future = analysis.cutoff === null || index > analysis.cutoff;
                if (future && month.planned === 0) return null;
                return (
                  <tr key={month.month} className={`border-t ${future ? "text-muted-foreground" : ""}`}>
                    <td className="py-1.5 pr-3 font-medium">{month.month}</td>
                    <td className="py-1.5 pr-3">{n(month.planned)}</td>
                    <td className="py-1.5 pr-3">{future ? "—" : n(month.executed)}</td>
                    <td className="py-1.5 pr-3">{future ? "pendiente" : pct(month.compliance)}</td>
                    <td className="py-1.5 pr-3">
                      <Bar value={analysis.plannedYear > 0 ? month.cumulativePlanned / analysis.plannedYear : null} tone="plan" />
                      {!future && <div className="mt-1"><Bar value={analysis.plannedYear > 0 ? month.cumulativeExecuted / analysis.plannedYear : null} tone="done" /></div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">Barra gris: lo que debía llevarse. Barra de color: lo que se lleva.</p>
        </div>
        {analysis.fractionalUnits && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Este proyecto registra avances parciales (decimales), no conteos de actividades. Las cifras se leen como unidades de avance.</p>}
      </Section>

      <Section title="Qué funciona y qué conviene ajustar" lead="Cada actividad se compara con su plan y con la asistencia esperada. Son señales para decidir, con sus cifras a la vista; la decisión es del equipo.">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter("todas")} className={`rounded-full border px-3 py-1.5 text-sm ${filter === "todas" ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>Todas ({relevant.length})</button>
          {groups.filter((signal) => analysis.counts[signal] > 0).map((signal) => (
            <button key={signal} onClick={() => setFilter(signal)} className={`rounded-full border px-3 py-1.5 text-sm ${filter === signal ? "border-primary bg-primary text-primary-foreground" : SIGNAL_STYLE[signal]}`}>
              {SIGNAL_LABELS[signal]} ({analysis.counts[signal]})
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {shown.map((result) => <ActivityRow key={result.activity.id} result={result} />)}
          {shown.length === 0 && <p className="text-sm text-muted-foreground">No hay actividades en este grupo.</p>}
          {hidden > 0 && <p className="text-xs text-muted-foreground">No se listan {analysis.counts.sin_actividad} actividades sin programación ni resultados en el año y {analysis.counts.suprimida} suprimidas.</p>}
        </div>
      </Section>

      {!insights ? (
        <div className={`${card} flex items-center gap-2 text-sm text-muted-foreground`}>{failed ? "No fue posible preparar los indicadores y el marco lógico de este proyecto. El análisis de ejecución de arriba sí es válido." : <><Loader2 className="size-4 animate-spin" /> Preparando indicadores, ODS y marco lógico…</>}</div>
      ) : (
        <>
          <Section title="Indicadores" lead="A la izquierda, lo que tu Excel ya permite medir. A la derecha, lo que falta para saber si el proyecto sirvió.">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Ya se miden</h4>
                <ul className="mt-2 space-y-2">
                  {insights.measured.map((item) => (
                    <li key={item.name} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                      <strong>{item.name}:</strong> {item.value}
                      <span className="mt-1 block text-xs">{item.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-800">Faltan (sugeridos)</h4>
                <ul className="mt-2 space-y-2">
                  {insights.missing.map((item) => (
                    <li key={item.name} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                      <strong>{item.name}</strong>
                      <span className="mt-1 block">{item.why}</span>
                      <span className="mt-1 block text-xs"><strong>Cómo medirlo:</strong> {item.howToMeasure}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {total !== null && project.disaggregations.length === 0 && (
              <div className="mt-5 rounded-lg border p-4 text-sm">
                <p className="font-semibold">¿Tienes el dato de mujeres y niñas?</p>
                <p className="mt-1 text-muted-foreground">El Excel trae {n(total)} asistencias en total, sin separar. Si conoces cuántas fueron de mujeres y niñas, escríbelo y se calcula el indicador. Si no lo tienes, no se mide.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input aria-label="Asistencias de mujeres y niñas" className="w-40 rounded-md border border-input bg-background px-3 py-2" inputMode="numeric" value={women} onChange={(event) => setWomen(event.target.value.replace(/[^\d]/g, ""))} placeholder="Ej.: 1200" />
                  {womenValid && total > 0 && <span className="font-medium">Mujeres y niñas: {pct((womenCount ?? 0) / total)} de las asistencias. Es un dato de participación útil para el ODS 5; no mide el avance de esa meta.</span>}
                  {womenCount !== null && !womenValid && <span className="text-red-700">La cifra no puede ser mayor que el total de asistencias.</span>}
                </div>
              </div>
            )}
          </Section>

          <Section title="ODS a los que aporta" lead={insights.goalMeasure}>
            <div className="grid gap-3 md:grid-cols-3">
              {insights.goals.map((goal) => (
                <div key={`${goal.goal}-${goal.targetCode ?? "x"}`} className="rounded-lg border p-4 text-sm">
                  <p className="font-semibold">ODS {goal.goal}{goal.targetCode ? ` · Meta ${goal.targetCode}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{goal.goalTitle}</p>
                  {goal.targetText && <p className="mt-2">{goal.targetText}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    <strong>{{ declarado: "Declarado por la organización.", sugerido: "Sugerido por el sistema.", declarado_y_sugerido: "Declarado por la organización; meta sugerida por el sistema." }[goal.source]}</strong> {goal.rationale}
                  </p>
                </div>
              ))}
              {insights.goals.length === 0 && <p className="text-sm text-muted-foreground">No se pudo proponer un ODS con la información de las actividades.</p>}
            </div>
          </Section>

          {insights.concepts.length > 0 && (
            <Section title="Conceptos del proyecto y cómo medirlos" lead="El sistema reconoció estos conceptos en las actividades. Aquí está qué observar y qué marco de referencia usar; no son valores medidos.">
              <div className="grid gap-3 md:grid-cols-2">
                {insights.concepts.map((concept) => (
                  <div key={concept.key} className="rounded-lg border p-4 text-sm">
                    <p className="font-semibold">{concept.label}</p>
                    <p className="mt-1">{concept.meaning}</p>
                    <p className="mt-2"><strong>Qué observar:</strong> {concept.dimensions.join("; ")}.</p>
                    <p className="mt-2"><strong>Ejemplo de indicador:</strong> {concept.exampleIndicator}</p>
                    <p className="mt-2 text-xs text-muted-foreground"><strong>Referencia:</strong> {concept.frameworks.join(" · ")}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(insights.bid.framework.length > 0 || insights.bid.countryCategories.length > 0) && (
            <Section title="Referencias del BID para comparar" lead="Del catálogo de indicadores del BID. Sirven para usar definiciones reconocidas y comparar con el país; no miden tu proyecto ni reemplazan tu línea base. El sistema no descarga cifras: los enlaces abren el catálogo oficial.">
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold">Marco de Impacto del BID</h4>
                  <ul className="mt-2 space-y-2">
                    {insights.bid.framework.map((reference) => (
                      <li key={reference.code} className="rounded-lg border p-3 text-sm">
                        <strong>{reference.code} · {reference.title}</strong>
                        <span className="mt-1 block">{reference.use}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">Límite: {reference.scope}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Indicadores de país para contexto</h4>
                  <ul className="mt-2 space-y-2">
                    {insights.bid.countryCategories.map((item) => (
                      <li key={item.category} className="rounded-lg border p-3 text-sm">
                        <a className="font-medium text-primary underline" href={bidCategoryUrl(item.category)} target="_blank" rel="noreferrer">{item.label}</a>
                        <span className="mt-1 block text-xs text-muted-foreground">Categoría «{item.category}» de los Indicadores Sociales de América Latina y el Caribe.</span>
                      </li>
                    ))}
                  </ul>
                  <a className="mt-3 inline-block text-sm text-primary underline" href={BID_INDICATOR_CATALOG_URL} target="_blank" rel="noreferrer">Abrir el catálogo completo del BID</a>
                </div>
              </div>
            </Section>
          )}

          <Section title="Teoría de cambio y marco lógico" lead="Borrador automático a partir del Excel. Lo que está medido se apoya en tus cifras; lo demás es una hipótesis que el equipo debe confirmar.">
            <div className="grid gap-3 md:grid-cols-4">
              {([
                ["1. Lo que hacemos", insights.theory.activities],
                ["2. Lo que entregamos", insights.theory.outputs],
                ["3. Lo que debería cambiar", insights.theory.outcomes.length ? insights.theory.outcomes : ["Por definir con el equipo: el Excel no describe cambios esperados."]],
                ["4. A qué aporta", [insights.theory.impact]],
              ] as const).map(([label, items]) => (
                <div key={label} className="rounded-lg border bg-background p-3 text-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">{label}</p>
                  <ul className="mt-2 space-y-1.5">{items.slice(0, 8).map((item, index) => <li key={index}>• {item}</li>)}</ul>
                </div>
              ))}
            </div>
            <h4 className="mt-5 text-sm font-semibold">De qué depende que funcione</h4>
            <ul className="mt-2 space-y-2">
              {insights.theory.assumptions.map((assumption) => (
                <li key={assumption.link} className={`rounded-lg border p-3 text-sm ${assumption.basis === "con_datos" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-slate-50 text-slate-900"}`}>
                  <strong>{assumption.basis === "con_datos" ? "Se puede contrastar con tu Excel: " : "Hipótesis por comprobar: "}</strong>{assumption.text}
                </li>
              ))}
            </ul>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead><tr className="bg-primary text-primary-foreground"><th className="border p-2 text-left">Nivel</th><th className="border p-2 text-left">Qué se espera</th><th className="border p-2 text-left">Indicadores</th><th className="border p-2 text-left">Estado</th></tr></thead>
                <tbody>
                  {insights.logframe.map((row) => (
                    <tr key={row.level} className="align-top">
                      <td className="border p-2 font-semibold">{row.level}</td>
                      <td className="border p-2">{row.statement}</td>
                      <td className="border p-2">{row.indicators.length ? <ul>{row.indicators.map((name) => <li key={name}>• {name}</li>)}</ul> : "Sin indicador"}</td>
                      <td className="border p-2">{row.status === "medido" ? "Se mide hoy" : "Falta medir"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function ActivityRow({ result }: { result: ActivityResult }) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${SIGNAL_STYLE[result.signal]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{result.activity.code ? `${result.activity.code} · ` : ""}{result.activity.name}</p>
        <span className="rounded-full border border-current px-2 py-0.5 text-xs font-medium">{SIGNAL_LABELS[result.signal]}</span>
      </div>
      <p className="mt-1 text-xs opacity-80">{result.activity.scope}{result.activity.note ? ` · ${result.activity.note}` : ""}</p>
      <p className="mt-2">{result.evidence}</p>
      {result.participantsPerSession !== null && <p className="mt-1 text-xs">Promedio: {n(result.participantsPerSession)} asistentes por actividad.</p>}
      {result.cautions.map((caution) => <p key={caution} className="mt-1 text-xs italic">Ojo: {caution}</p>)}
    </div>
  );
}
