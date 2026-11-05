import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FileText,
  FlaskConical,
  Leaf,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import { DEMO_PROJECT, buildDemoAnalysis } from "@/data/demo-project";
import { ODS_SOURCE } from "@/data/ods-catalog";
import { analyzeProject } from "@/lib/analyze-project";
import { extractTextFromFile } from "@/lib/doc-extract";
import { validateAlignments } from "@/lib/ods-rules";
import { detectEmbeddedInstructions } from "@/lib/sanitize";
import { SessionProvider, useSession } from "@/lib/session";
import {
  DIMENSION_LABELS,
  HORIZON_LABELS,
  LEVEL_LABELS,
  SPHERE_LABELS,
  type CausalLevel,
  type Indicator,
} from "@/types/medidor";

export const Route = createFileRoute("/")({ component: Index });

const STEPS = [
  "Proyecto",
  "Contexto opcional",
  "Indicadores sugeridos",
  "ODS y línea base",
  "Marco lógico",
];

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const textareaClass = `${inputClass} min-h-28 resize-y`;
const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50";

function Index() {
  return (
    <SessionProvider>
      <MedidorApp />
    </SessionProvider>
  );
}

function MedidorApp() {
  const { step, setStep, analysis } = useSession();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-5 sm:px-6">
          <div className="rounded-lg bg-white/10 p-2"><Leaf aria-hidden className="size-6" /></div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
              Recomendación de indicadores para cooperación internacional
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">Medidor de Indicadores</h1>
          </div>
          <span className="ml-auto hidden rounded-full bg-white/10 px-3 py-1 text-xs sm:block">
            Motor local · sin créditos de IA
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Stepper current={step} onSelect={(next) => (next === 1 || analysis ? setStep(next) : undefined)} />
        <div className="mt-6">
          {step === 1 && <ProjectStep />}
          {step === 2 && analysis && <UnderstandingStep />}
          {step === 3 && analysis && <IndicatorsStep />}
          {step === 4 && analysis && <OdsBaselineStep />}
          {step === 5 && analysis && <LogicalFrameworkStep />}
        </div>
      </main>
    </div>
  );
}

function Stepper({ current, onSelect }: { current: number; onSelect: (step: number) => void }) {
  return (
    <nav aria-label="Progreso del análisis" className="overflow-x-auto">
      <ol className="flex min-w-[780px] gap-2">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const active = number === current;
          const done = number < current;
          return (
            <li key={label} className="flex-1">
              <button
                onClick={() => onSelect(number)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm transition ${active ? "border-primary bg-primary text-primary-foreground" : done ? "border-success/40 bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:border-primary/40"}`}
              >
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${active ? "bg-white/20" : "bg-muted"}`}>
                  {done ? <Check className="size-3" /> : number}
                </span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {help && <span className="mt-1 block text-xs text-muted-foreground">{help}</span>}
    </label>
  );
}

function Notice({ kind, children }: { kind: "info" | "success" | "warning" | "error"; children: ReactNode }) {
  const cls = {
    info: "border-blue-200 bg-blue-50 text-blue-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    error: "border-red-200 bg-red-50 text-red-950",
  }[kind];
  return <div className={`rounded-lg border p-3 text-sm ${cls}`}>{children}</div>;
}

function ProjectStep() {
  const { project, setProject, setAnalysis, setStep } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scan = useMemo(() => detectEmbeddedInstructions(project.text), [project.text]);
  const set = (key: keyof typeof project, value: string) =>
    setProject((previous) => ({ ...previous, [key]: value }));

  async function loadFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    try {
      const selected = Array.from(files);
      const extracted = await Promise.all(selected.map(async (file) => ({ name: file.name, text: await extractTextFromFile(file) })));
      setProject((previous) => ({
        ...previous,
        sourceFileNames: [...previous.sourceFileNames, ...selected.map((file) => file.name)],
        text: [
          previous.text,
          ...extracted.map((item) => `\n\n=== DOCUMENTO: ${item.name} ===\n${item.text}`),
        ].filter(Boolean).join(""),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible leer los documentos.");
    } finally {
      setBusy(false);
    }
  }

  async function runAnalysis(useDemo = false) {
    setError("");
    const input = useDemo ? DEMO_PROJECT : project;
    if (!useDemo && scan.suspicious) {
      setError("El documento contiene instrucciones dirigidas a una IA. Revisa el texto antes de continuar.");
      return;
    }
    setBusy(true);
    try {
      const result = useDemo ? await buildDemoAnalysis() : await analyzeProject({ data: input });
      if (useDemo) setProject(() => DEMO_PROJECT);
      setAnalysis(result);
      setStep(2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible analizar el proyecto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_350px]">
      <Panel
        title="Carga el proyecto"
        description="Puedes seleccionar varios PDF, DOCX o TXT. El sistema recomendará entre 10 y 15 indicadores concretos para este proyecto."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["name", "Nombre del proyecto"],
            ["sector", "Sector, si ya está definido"],
            ["territory", "Territorio"],
            ["duration", "Duración"],
            ["targetPopulation", "Población objetivo"],
            ["budget", "Presupuesto, si está disponible"],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label}>
              <input className={inputClass} value={project[key]} onChange={(event) => set(key, event.target.value)} />
            </Field>
          ))}
        </div>
        <div className="mt-4">
          <Field label="Documentos o descripción del proyecto" help="No se requiere un formato especial. Cuanto más explícitos sean objetivos, actividades y resultados, mejor será la recomendación.">
            <textarea className={`${textareaClass} min-h-64`} value={project.text} onChange={(event) => set("text", event.target.value)} placeholder="Pega aquí el contenido o carga varios documentos…" />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className={buttonSecondary}>
            <FileText className="size-4" />
            {busy ? "Procesando…" : "Cargar varios documentos"}
            <input className="sr-only" type="file" multiple accept=".pdf,.docx,.txt,.md,text/plain,application/pdf" onChange={(event) => loadFiles(event.target.files)} />
          </label>
          {project.sourceFileNames.length > 0 && (
            <button
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setProject((previous) => ({ ...previous, text: "", sourceFileNames: [] }))}
            >
              <Trash2 className="size-4" /> Limpiar {project.sourceFileNames.length} archivo(s)
            </button>
          )}
        </div>
        {project.sourceFileNames.length > 0 && (
          <ul className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {project.sourceFileNames.map((name, index) => <li key={`${name}-${index}`}>• {name}</li>)}
          </ul>
        )}
        {scan.suspicious && <div className="mt-4"><Notice kind="warning">Se detectaron instrucciones incrustadas en el documento. El texto requiere revisión antes del análisis.</Notice></div>}
        {error && <div className="mt-4"><Notice kind="error">{error}</Notice></div>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className={buttonPrimary} disabled={busy || project.text.trim().length < 80} onClick={() => runAnalysis(false)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Sugerir indicadores
          </button>
          <button className={buttonSecondary} disabled={busy} onClick={() => runAnalysis(true)}>
            <FlaskConical className="size-4" /> Probar con robótica
          </button>
        </div>
      </Panel>
      <aside className="space-y-4">
        <Notice kind="success">
          <strong>Sin créditos ni servicios de IA.</strong> La lectura, clasificación y recomendación se ejecutan con reglas y bibliotecas locales.
        </Notice>
        <Notice kind="info">
          Los documentos permanecen en la memoria temporal de esta pestaña. No se guardan y desaparecen al recargar o iniciar un análisis nuevo.
        </Notice>
        <Panel title="Qué recibes">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Entre 10 y 15 indicadores priorizados.</li>
            <li>• Gestión, productos, aprendizaje, resultados e impacto.</li>
            <li>• Fórmula, fuentes, instrumentos y periodicidad.</li>
            <li>• Método concreto para levantar la línea base.</li>
            <li>• ODS, meta oficial y justificación causal.</li>
            <li>• Marco lógico sugerido y alertas de coherencia.</li>
          </ul>
        </Panel>
      </aside>
    </div>
  );
}

function UnderstandingStep() {
  const { analysis, updateCausal, setStep } = useSession();
  if (!analysis) return null;
  const causal = analysis.causal;
  return (
    <div className="space-y-5">
      <Panel
        title="Contexto de intervención (opcional)"
        description="No necesitas rediseñar el proyecto. Si ya está en marcha, conserva o ajusta sus actividades, productos y cambios esperados. Esta información se incorporará al marco lógico y al Excel de salida."
      >
        <Notice kind="info">
          Puedes pasar directamente a los indicadores. Edita estas casillas únicamente si quieres corregir o completar lo que el sistema entendió del proyecto.
        </Notice>
        <div className="grid gap-3 md:grid-cols-4">
          {([
            ["Actividades", causal.activities],
            ["Productos", causal.outputs],
            ["Resultados", causal.outcomes],
            ["Impacto", [causal.impact]],
          ] as const).map(([label, items], index) => {
            const key = index === 0 ? "activities" : index === 1 ? "outputs" : index === 2 ? "outcomes" : "impact";
            const value = key === "impact" ? causal.impact : items.join("\n");
            return (
              <div key={label} className="rounded-lg border bg-surface p-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">{label}</span>
                  <textarea
                    className={`${textareaClass} mt-3 min-h-40 text-sm`}
                    value={value}
                    onChange={(event) => updateCausal((current) => {
                      const nextValue = event.target.value;
                      if (key === "impact") return { ...current, impact: nextValue };
                      const entries = nextValue.split("\n").map((item) => item.trim()).filter(Boolean);
                      return { ...current, [key]: entries };
                    })}
                    placeholder={key === "impact" ? "Cambio de largo plazo al que el proyecto aporta" : "Escribe un elemento por línea"}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </Panel>
      {analysis.questions.length > 0 && (
        <Panel title="Vacíos que afectan la medición" description="No bloquean las recomendaciones, pero deben resolverse antes de aprobar metas.">
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.questions.map((question) => (
              <div key={question.id} className="rounded-lg border p-4">
                <strong className="text-sm">{question.question}</strong>
                <p className="mt-1 text-sm text-muted-foreground">{question.whyItMatters}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <NavButtons back={() => setStep(1)} next={() => setStep(3)} nextLabel="Ver indicadores recomendados" />
    </div>
  );
}

function IndicatorsStep() {
  const { analysis, updateIndicator, setStep } = useSession();
  const [level, setLevel] = useState<CausalLevel | "todos">("todos");
  const [tier, setTier] = useState<"todos" | Indicator["recommendationTier"]>("todos");
  if (!analysis) return null;
  const included = analysis.indicators.filter((indicator) => indicator.decision !== "excluido");
  const visible = analysis.indicators.filter(
    (indicator) => (level === "todos" || indicator.level === level) && (tier === "todos" || indicator.recommendationTier === tier),
  );
  return (
    <div className="space-y-5">
      <Panel title="Qué debes medir en este proyecto" description="Cada propuesta expresa una medición concreta. Acepta las que te sirvan y descarta las que no correspondan al proyecto.">
        <div className="grid gap-3 sm:grid-cols-4">
          {(["gestion", "producto", "resultado", "impacto"] as CausalLevel[]).map((item) => (
            <button key={item} onClick={() => setLevel(item)} className={`rounded-lg border p-3 text-left ${level === item ? "border-primary ring-2 ring-primary/20" : "bg-card"}`}>
              <span className="text-xs text-muted-foreground">{LEVEL_LABELS[item]}</span>
              <div className="mt-1 text-2xl font-semibold">{included.filter((indicator) => indicator.level === item).length}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["todos", "esencial", "complementario", "salvaguarda"] as const).map((item) => (
            <button key={item} onClick={() => setTier(item)} className={`rounded-full border px-3 py-1.5 text-sm ${tier === item ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
              {{
                todos: "Todos",
                esencial: "Esenciales",
                complementario: "Complementarios",
                salvaguarda: "Salvaguardas",
              }[item]}
            </button>
          ))}
          <button onClick={() => setLevel("todos")} className="px-3 py-1.5 text-sm text-primary underline">Todos los niveles</button>
        </div>
      </Panel>
      <div className="space-y-3">
        {visible.map((indicator) => (
          <IndicatorCard key={indicator.id} indicator={indicator} onChange={(next) => updateIndicator(indicator.id, () => next)} />
        ))}
      </div>
      <NavButtons back={() => setStep(2)} next={() => setStep(4)} />
    </div>
  );
}

function plainLanguage(value: string): string {
  const replacements: Record<string, string> = {
    "Registro administrativo deduplicado": "Usa la lista de asistencia y cuenta a cada persona una sola vez, aunque participe en varias actividades.",
    "Conteo deduplicado y verificación directa": "Cuenta cada persona, organización o producto una sola vez y comprueba que la información sea correcta.",
    "Registro deduplicado y encuesta": "Usa la lista de participantes sin repetir personas y compleméntala con una encuesta breve.",
    "Listado con identificador anonimizado y regla de permanencia": "Crea una lista de asistencia con un código por persona. Antes de empezar, define cuántas sesiones debe completar una persona para considerarla participante que finalizó.",
    "Registro único de participantes y asistencia": "Guarda una lista de asistencia por actividad con un código único por persona, fecha, institución o territorio.",
  };
  return replacements[value] ?? value;
}

function plainCalculation(indicator: Indicator): string {
  if (indicator.denominator === "No aplica") {
    return `Suma únicamente: ${plainLanguage(indicator.numerator).replace(/\.$/, "")}.`;
  }
  return `Cuenta: ${plainLanguage(indicator.numerator).replace(/\.$/, "")}. Luego divídelo entre: ${plainLanguage(indicator.denominator).replace(/\.$/, "")}; multiplica el resultado por 100 para obtener el porcentaje.`;
}

function friendlyBurden(burden: Indicator["measurementBurden"]): string {
  const labels: Record<Indicator["measurementBurden"], string> = {
    baja: "Bajo: puede registrarse durante la operación normal del proyecto, con un formato sencillo.",
    media: "Medio: requiere una revisión periódica, por ejemplo una encuesta, una lista de chequeo o una visita de verificación.",
    alta: "Alto: requiere una medición antes y después, análisis adicional o apoyo técnico para interpretar los resultados.",
  };
  return labels[burden];
}

function IndicatorCard({ indicator, onChange }: { indicator: Indicator; onChange: (indicator: Indicator) => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Indicator>(indicator);
  const selectionValue = editing || indicator.decision === "modificado" ? "modificar" : indicator.decision;
  const updateDraft = <K extends keyof Indicator>(key: K, value: Indicator[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const saveDraft = () => {
    onChange({ ...draft, decision: "modificado", target: { ...draft.target, unit: draft.unit } });
    setEditing(false);
  };
  return (
    <article className={`rounded-xl border bg-card p-4 shadow-sm ${indicator.decision === "excluido" ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge>{LEVEL_LABELS[indicator.level]}</Badge>
            <Badge>{indicator.recommendationTier}</Badge>
            <Badge>{DIMENSION_LABELS[indicator.dimension]}</Badge>
            {indicator.decision === "modificado" && <Badge>Modificado</Badge>}
            {indicator.isGuardrail && <Badge>Salvaguarda</Badge>}
          </div>
          <h3 className="mt-2 text-base font-semibold">{indicator.name}</h3>
          <p className="mt-2 text-sm"><strong>Qué mide:</strong> {indicator.observedChange}</p>
          <p className="mt-1 text-sm text-muted-foreground">Se expresa en: {indicator.unit}. {indicator.recommendationRationale}</p>
        </div>
        <select
          className={`${inputClass} sm:w-44`}
          value={selectionValue}
          onChange={(event) => {
            if (event.target.value === "modificar") {
              setDraft(indicator);
              setEditing(true);
              return;
            }
            setEditing(false);
            onChange({ ...indicator, decision: event.target.value as Indicator["decision"] });
          }}
        >
          <option value="propuesto">Propuesto</option>
          <option value="aprobado">Aceptar</option>
          <option value="excluido">Descartar</option>
          <option value="modificar">Modificar</option>
        </select>
      </div>
      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-semibold">Guía rápida para medirlo</p>
        <ol className="mt-2 space-y-2 leading-relaxed">
          <li><strong>1. Prepara el formato:</strong> {plainLanguage(indicator.instrument)}</li>
          <li><strong>2. Registra la información:</strong> {plainLanguage(indicator.primarySource)}</li>
          <li><strong>3. Haz el cálculo:</strong> {plainCalculation(indicator)}</li>
          <li><strong>4. Cuándo hacerlo:</strong> {plainLanguage(indicator.frequency)}</li>
        </ol>
        <p className="mt-3 text-muted-foreground"><strong>Tiempo de registro:</strong> {friendlyBurden(indicator.measurementBurden)}</p>
      </div>
      {editing && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h4 className="font-semibold">Modificar indicador</h4>
          <p className="mt-1 text-sm text-muted-foreground">Edita la redacción y los elementos técnicos necesarios. Al guardar, esta versión aparecerá en el marco lógico y en el Excel.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Nombre del indicador"><input className={inputClass} value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} /></Field>
            <Field label="Unidad de medida"><input className={inputClass} value={draft.unit} onChange={(event) => updateDraft("unit", event.target.value)} /></Field>
            <Field label="Qué mide"><textarea className={`${textareaClass} min-h-24`} value={draft.observedChange} onChange={(event) => updateDraft("observedChange", event.target.value)} /></Field>
            <Field label="Cómo sacar el resultado"><textarea className={`${textareaClass} min-h-24`} value={draft.formula} onChange={(event) => updateDraft("formula", event.target.value)} /></Field>
            <Field label="Qué debes contar"><textarea className={`${textareaClass} min-h-20`} value={draft.numerator} onChange={(event) => updateDraft("numerator", event.target.value)} /></Field>
            <Field label="Total con el que comparar"><textarea className={`${textareaClass} min-h-20`} value={draft.denominator} onChange={(event) => updateDraft("denominator", event.target.value)} /></Field>
            <Field label="Dónde guardar la información"><input className={inputClass} value={draft.primarySource} onChange={(event) => updateDraft("primarySource", event.target.value)} /></Field>
            <Field label="Formato o herramienta que usarás"><input className={inputClass} value={draft.instrument} onChange={(event) => updateDraft("instrument", event.target.value)} /></Field>
            <Field label="Cuándo registrar o revisar"><input className={inputClass} value={draft.frequency} onChange={(event) => updateDraft("frequency", event.target.value)} /></Field>
            <Field label="Responsable"><input className={inputClass} value={draft.responsible} onChange={(event) => updateDraft("responsible", event.target.value)} /></Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className={buttonPrimary} onClick={saveDraft}>Guardar cambios</button>
            <button className={buttonSecondary} onClick={() => { setDraft(indicator); setEditing(false); }}>Cancelar</button>
          </div>
        </div>
      )}
      <button className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary" onClick={() => setOpen(!open)}>
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
        {open ? "Cerrar cómo medirlo" : "Ver cómo medirlo"}
      </button>
      {open && (
        <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-2">
          <Info label="Qué cambio observa" value={indicator.observedChange} />
          <Info label="Decisión que informa" value={indicator.decisionInformed} />
          <Info label="Cómo sacar el resultado" value={plainCalculation(indicator)} />
          <Info label="Unidad" value={indicator.unit} />
          <Info label="Qué debes contar" value={plainLanguage(indicator.numerator)} />
          <Info label="Total con el que comparar" value={plainLanguage(indicator.denominator)} />
          <Info label="Dónde guardar la información" value={plainLanguage(indicator.primarySource)} />
          <Info label="Formato que vas a usar" value={plainLanguage(indicator.instrument)} />
          <Info label="Forma de medir" value={plainLanguage(indicator.technique)} />
          <Info label="Cuándo registrar o revisar" value={plainLanguage(indicator.frequency)} />
          <Info label="Responsable sugerido" value={indicator.responsible} />
          <Info label="Tiempo de registro" value={friendlyBurden(indicator.measurementBurden)} />
          <Info label="Desagregaciones" value={indicator.disaggregations.join(", ")} />
          {indicator.projectEvidence.length > 0 && (
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidencia encontrada</p>
              <ul className="mt-2 space-y-2 text-sm">{indicator.projectEvidence.map((item, index) => <li key={index} className="rounded-md bg-muted p-2">“{item}”</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function OdsBaselineStep() {
  const { analysis, updateIndicator, setStep } = useSession();
  const initialIndicator = analysis?.indicators.find((indicator) => indicator.decision !== "excluido");
  const [selectedId, setSelectedId] = useState(initialIndicator?.id ?? "");
  if (!analysis) return null;
  const indicators = analysis.indicators.filter((indicator) => indicator.decision !== "excluido");
  const selected = indicators.find((indicator) => indicator.id === selectedId) ?? indicators[0];
  if (!selected) return <Notice kind="warning">No hay indicadores seleccionados.</Notice>;
  const alignmentValidation = validateAlignments(selected.odsAlignments);
  return (
    <div className="space-y-5">
      <Panel title="Selecciona un indicador" description="La línea base propuesta y la alineación ODS cambian según el indicador.">
        <select className={inputClass} value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
          {indicators.map((indicator) => <option key={indicator.id} value={indicator.id}>{LEVEL_LABELS[indicator.level]} · {indicator.name}</option>)}
        </select>
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Plan de línea base" description="Se propone cómo medir el punto inicial; el valor permanece pendiente hasta aplicar el instrumento.">
          <BaselineDetails indicator={selected} />
          <div className="mt-4"><Notice kind="warning"><strong>Meta cuantitativa:</strong> REQUIERE LÍNEA BASE. La aplicación no inventará un porcentaje, cantidad ni umbral.</Notice></div>
        </Panel>
        <Panel title="Alineación ODS" description="Meta ODS y meta cuantitativa del proyecto son conceptos diferentes.">
          <p className="mb-4 text-sm text-muted-foreground">
            Catálogo: <a className="underline" href={ODS_SOURCE.url} target="_blank" rel="noreferrer">{ODS_SOURCE.version}</a>
          </p>
          {selected.odsAlignments.length === 0 ? (
            <Notice kind="info">Este indicador no necesita una asociación ODS directa.</Notice>
          ) : (
            <div className="space-y-3">
              {selected.odsAlignments.map((alignment) => (
                <div key={alignment.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <strong>ODS {alignment.goalNumber} · Meta {alignment.targetCode}</strong>
                      <p className="mt-1 text-sm">{alignment.officialTargetText}</p>
                    </div>
                    <select className={`${inputClass} w-36`} value={alignment.reviewStatus} onChange={(event) => updateIndicator(selected.id, (old) => ({
                      ...old,
                      odsAlignments: old.odsAlignments.map((item) => item.id === alignment.id ? { ...item, reviewStatus: event.target.value as typeof item.reviewStatus } : item),
                    }))}>
                      <option value="sugerida">Sugerida</option>
                      <option value="aceptada">Aceptar</option>
                      <option value="rechazada">Rechazar</option>
                    </select>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground"><strong>Relación:</strong> {alignment.causalRationale}</p>
                  <p className="mt-2 text-sm text-muted-foreground"><strong>Escala:</strong> {alignment.compatibilityAssessment}</p>
                </div>
              ))}
            </div>
          )}
          {!alignmentValidation.ok && <div className="mt-4"><Notice kind="error">{alignmentValidation.errors.join(" ")}</Notice></div>}
        </Panel>
      </div>
      <Panel title="Alineación climática y E2050">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Materialidad" value={analysis.climateAlignment.materiality} />
          <Info label="Tipo" value={analysis.climateAlignment.alignmentType.replaceAll("_", " ")} />
          <Info label="Áreas" value={analysis.climateAlignment.alignmentAreas.join(", ") || "No material"} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{analysis.climateAlignment.causalRationale}</p>
      </Panel>
      <Panel title="Referencias BID y fuentes para Colombia" description="Sirven para comprender el contexto y comparar definiciones. No reemplazan la línea base que el equipo debe levantar en su proyecto.">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">Fuentes colombianas sugeridas</h3>
            {selected.colombiaReferences.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No se identificó una fuente nacional específica para este indicador; confirme la entidad sectorial competente en el territorio.</p> : (
              <div className="mt-3 space-y-3">
                {selected.colombiaReferences.map((reference) => (
                  <div key={`${reference.source}-${reference.title}`} className="rounded-lg border p-3 text-sm">
                    <a className="font-medium text-primary underline" href={reference.url} target="_blank" rel="noreferrer">{reference.source}: {reference.title}</a>
                    <p className="mt-1">{reference.use}</p>
                    <p className="mt-1 text-muted-foreground"><strong>Escala disponible:</strong> {reference.geography}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold">Referencias del Marco de Impacto BID</h3>
            {selected.bidReferences.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Este indicador no tiene una referencia BID directa; no se fuerza una asociación.</p> : (
              <div className="mt-3 space-y-3">
                {selected.bidReferences.map((reference) => (
                  <div key={reference.code} className="rounded-lg border p-3 text-sm">
                    <strong>BID {reference.code} · {reference.title}</strong>
                    <p className="mt-1">{reference.use}</p>
                    <p className="mt-1 text-muted-foreground"><strong>Límite de uso:</strong> {reference.scope}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>
      <NavButtons back={() => setStep(3)} next={() => setStep(5)} />
    </div>
  );
}

function BaselineDetails({ indicator }: { indicator: Indicator }) {
  const baseline = indicator.baselinePlan;
  return (
    <div className="space-y-3">
      <Info label="Momento" value={baseline.timing} />
      <Info label="Método" value={baseline.method} />
      <Info label="Instrumento" value={baseline.instrument} />
      <Info label="Variables mínimas" value={baseline.variables.join(", ")} />
      <Info label="Muestra o censo" value={baseline.samplingGuidance} />
      <Info label="Análisis" value={baseline.analysisGuidance} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referencias internacionales</p>
        <ul className="mt-2 space-y-1 text-sm">
          {indicator.internationalReferences.map((reference) => (
            <li key={`${reference.organization}-${reference.framework}`}>
              <a className="text-primary underline" href={reference.url} target="_blank" rel="noreferrer">{reference.organization}: {reference.framework}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LogicalFrameworkStep() {
  const { project, analysis, setStep, reset } = useSession();
  if (!analysis) return null;
  const included = analysis.indicators.filter((indicator) => indicator.decision === "aprobado" || indicator.decision === "modificado");
  const review = analysis.logicalFrameworkReview;
  const currentAnalysis = analysis;
  async function download() {
    const { exportToExcel } = await import("@/lib/excel-export");
    exportToExcel(project, currentAnalysis);
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Indicadores seleccionados" value={included.length} />
        <Metric label="ODS vinculados" value={new Set(included.flatMap((indicator) => indicator.odsAlignments.map((alignment) => alignment.goalNumber))).size} />
        <Metric label="Alertas críticas" value={review.issues.filter((issue) => issue.severity === "critico").length} />
      </div>
      <Panel title="Validación experta del marco lógico" description="El estado no se basa en un puntaje arbitrario. Cada hallazgo identifica la regla incumplida y la acción requerida.">
        <div className="grid gap-3 sm:grid-cols-5">
          {Object.entries(review.checks).map(([key, value]) => (
            <div key={key} className={`rounded-lg border p-3 text-sm ${value ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <strong>{value ? "Cumple" : "Revisar"}</strong>
              <p className="mt-1 text-xs">{{
                verticalLogic: "Lógica vertical",
                indicatorCoverage: "Cobertura causal",
                baselineReadiness: "Plan de línea base",
                odsTraceability: "Trazabilidad ODS",
                attributionControl: "Control de atribución",
              }[key]}</p>
            </div>
          ))}
        </div>
        {review.issues.length > 0 ? (
          <div className="mt-4 space-y-2">
            {review.issues.map((issue, index) => (
              <Notice key={`${issue.area}-${index}`} kind={issue.severity === "critico" ? "error" : "warning"}>
                <strong>{issue.area}:</strong> {issue.message} <span className="block mt-1">Acción: {issue.action}</span>
              </Notice>
            ))}
          </div>
        ) : <div className="mt-4"><Notice kind="success">La estructura supera las validaciones automáticas. Aún requiere aprobación humana y datos de línea base.</Notice></div>}
      </Panel>
      <Panel title="Marco lógico sugerido" description="Vista resumida. El Excel incluye la matriz completa con indicadores, línea base, meta pendiente, medios de verificación y supuestos.">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead><tr className="bg-primary text-primary-foreground">
              <th className="border p-3 text-left">Nivel</th><th className="border p-3 text-left">Resultado</th><th className="border p-3 text-left">Indicadores recomendados</th><th className="border p-3 text-left">Línea base</th><th className="border p-3 text-left">Verificación</th>
            </tr></thead>
            <tbody>
              {(["impacto", "resultado", "producto", "gestion"] as CausalLevel[]).map((level) => {
                const indicators = included.filter((indicator) => indicator.level === level);
                const result = level === "impacto" ? analysis.causal.impact : level === "resultado" ? analysis.causal.outcomes.join("; ") : level === "producto" ? analysis.causal.outputs.join("; ") : analysis.causal.activities.join("; ");
                return (
                  <tr key={level} className="align-top">
                    <td className="border p-3 font-semibold">{LEVEL_LABELS[level]}</td>
                    <td className="border p-3">{result}</td>
                    <td className="border p-3"><ul className="space-y-1">{indicators.map((indicator) => <li key={indicator.id}>• {indicator.name}</li>)}</ul></td>
                    <td className="border p-3">{indicators.map((indicator) => `${indicator.name}: ${indicator.baselinePlan.method}`).join(" | ")}</td>
                    <td className="border p-3">{indicators.map((indicator) => indicator.primarySource).join("; ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className={buttonPrimary} onClick={download} disabled={included.length === 0}><Download className="size-4" /> Descargar marco lógico en Excel</button>
          <button className={buttonSecondary} onClick={() => setStep(4)}><ArrowLeft className="size-4" /> Revisar ODS y líneas base</button>
          <button className={buttonSecondary} onClick={reset}><RotateCcw className="size-4" /> Nuevo análisis</button>
        </div>
      </Panel>
      {included.length === 0 && <Notice kind="warning">Antes de descargar, marca los indicadores definitivos como <strong>Aceptar</strong> o <strong>Modificar</strong>. El Excel no incluirá los que permanezcan como propuestos.</Notice>}
      <Notice kind="info">
        <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4" /> El archivo es una recomendación metodológica. No contiene resultados ejecutados ni metas inventadas.</span>
      </Notice>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-relaxed">{value || "Pendiente"}</p></div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">{children}</span>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold">{value}</p></div>;
}

function NavButtons({ back, next, nextLabel = "Continuar" }: { back: () => void; next: () => void; nextLabel?: string }) {
  return (
    <div className="flex justify-between">
      <button className={buttonSecondary} onClick={back}><ArrowLeft className="size-4" /> Anterior</button>
      <button className={buttonPrimary} onClick={next}>{nextLabel} <ArrowRight className="size-4" /></button>
    </div>
  );
}
