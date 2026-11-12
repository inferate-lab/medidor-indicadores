import { useEffect, useState, type ReactNode } from "react";
import * as XLSX from "xlsx";
import { ExcelIndicatorDesigner } from "@/components/ExcelIndicatorDesigner";
import { ALL_TARGETS } from "@/data/ods-catalog";
import { LEVEL_LABELS, ORIENTATION_LABELS } from "@/types/medidor";
import {
  emptyPortfolio,
  type Portfolio,
  type TrackedProject,
  type TrackingIndicator,
  type Observation,
  type CooperationProfile,
} from "@/types/project-tracking";
import {
  PORTFOLIO_STORAGE_KEY,
  cooperationBrief,
  addTrackedProjects,
  adoptIndicator,
  assessMeasurement,
  blankIndicator,
  importTrackingRows,
  latestObservations,
  measurementTemplateRows,
  parsePortfolio,
  recordObservation,
  serializePortfolio,
  trackExecutionProject,
  trackingGaps,
  updateTrackingIndicator,
  validateTrackingIndicator,
} from "@/lib/project-tracking";
import { sanitizeCell } from "@/lib/sanitize";

const panel = "rounded-xl border bg-card p-5 shadow-sm";
const input = "mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm";
const button =
  "rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50";
const primary = `${button} bg-primary text-primary-foreground hover:bg-primary/90`;
const numberValue = (text: string) => (text.trim() === "" ? null : Number(text.replace(",", ".")));
const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "No se pudo completar la operación.";

function download(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

export function ProjectWorkspace() {
  const [portfolio, setPortfolio] = useState<Portfolio>(emptyPortfolio);
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [selected, setSelected] = useState("");
  const [focusIndicator, setFocusIndicator] = useState("");
  const [status, setStatus] = useState("");
  const [pendingRestore, setPendingRestore] = useState<Portfolio | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
      if (saved) setPortfolio(parsePortfolio(saved));
    } catch {
      setStorageBlocked(true);
      setError(
        "No se pudo recuperar el guardado local. Se conserva intacto; puedes trabajar y descargar un respaldo sin sobrescribirlo.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || storageBlocked) return;
    try {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, serializePortfolio(portfolio));
      setStatus("Guardado en este navegador");
    } catch {
      setStatus("Sin guardar en el navegador: descarga un respaldo JSON antes de cerrar.");
    }
  }, [portfolio, ready, storageBlocked]);
  useEffect(() => {
    if (focusIndicator)
      document
        .getElementById("seguimiento-proyecto")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusIndicator]);
  const project = portfolio.projects.find((p) => p.id === selected);
  const updateProject = (updated: TrackedProject) =>
    setPortfolio((current) => ({
      ...current,
      projects: current.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  async function restore(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("El respaldo supera 20 MB.");
      const restored = parsePortfolio(await file.text());
      setPendingRestore(restored);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  async function template() {
    try {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(
          measurementTemplateRows(portfolio).map((row) =>
            row.map((c) => (typeof c === "string" ? sanitizeCell(c) : c)),
          ),
        ),
        "Mediciones",
      );
      download(
        XLSX.write(workbook, { type: "array", bookType: "xlsx" }),
        "plantilla-mediciones.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  async function importMeasurements(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error("El Excel supera 12 MB.");
      const workbook = XLSX.read(await file.arrayBuffer());
      const sheet = workbook.Sheets["Mediciones"];
      if (!sheet) throw new Error("Falta la hoja Mediciones de la plantilla.");
      setPortfolio(
        importTrackingRows(portfolio, XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  if (!ready) return <p role="status">Abriendo la cartera de proyectos…</p>;
  return (
    <div className="space-y-6">
      <section className={panel}>
        <h2 className="text-xl font-semibold">Mi cartera de proyectos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Seguimiento individual: cada proyecto conserva sus indicadores, mediciones por periodo y
          ficha de cooperación. Descarga un respaldo para abrirlo en otro equipo. Los datos de este
          navegador no se comparten con otras personas.
        </p>
        <p role="status" className="mt-2 text-sm">
          {status}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={button}
            disabled={!portfolio.projects.length}
            onClick={() => {
              try {
                download(
                  serializePortfolio(portfolio),
                  "cartera-proyectos-v1.json",
                  "application/json",
                );
              } catch (cause) {
                setError(errorMessage(cause));
              }
            }}
          >
            Descargar respaldo de la cartera
          </button>
          <label className={`${button} cursor-pointer`}>
            Abrir respaldo JSON
            <input
              type="file"
              accept=".json"
              className="sr-only"
              onChange={(event) => {
                void restore(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <button className={button} disabled={!portfolio.projects.length} onClick={template}>
            Descargar plantilla de mediciones
          </button>
          <label className={`${button} cursor-pointer`}>
            Importar mediciones Excel
            <input
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={(event) => {
                void importMeasurements(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {pendingRestore && (
          <div className="mt-3 rounded border p-3 text-sm">
            <p>
              El respaldo contiene {pendingRestore.projects.length} proyectos. Al abrirlo se
              sustituye la cartera activa. Antes se descargará una copia de la cartera actual.
            </p>
            <button
              className={`${button} mt-2`}
              onClick={() => {
                try {
                  if (portfolio.projects.length)
                    download(
                      serializePortfolio(portfolio),
                      "cartera-antes-de-restaurar.json",
                      "application/json",
                    );
                  setPortfolio(pendingRestore);
                  setPendingRestore(null);
                  setSelected("");
                } catch (cause) {
                  setError(errorMessage(cause));
                }
              }}
            >
              Abrir esta copia y conservar un respaldo de la actual
            </button>
            <button className={`${button} ml-2`} onClick={() => setPendingRestore(null)}>
              Cancelar apertura
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {portfolio.projects.map((p) => {
            const measured = p.indicators.filter((i) =>
              latestObservations(p, i.id).some((o) => o.value !== null),
            ).length;
            return (
              <button
                key={p.id}
                aria-pressed={selected === p.id}
                onClick={() => {
                  setSelected(p.id);
                  setFocusIndicator("");
                }}
                className={`rounded-lg border p-4 text-left ${selected === p.id ? "border-primary bg-primary/5" : "bg-background"}`}
              >
                <span className="block font-semibold">{p.name}</span>
                <span className="mt-1 block text-sm">
                  {p.indicators.length} indicadores · {measured} con medición ·{" "}
                  {trackingGaps(p).length} pendientes de revisión
                </span>
              </button>
            );
          })}
        </div>
        {!portfolio.projects.length && (
          <p className="mt-4 text-sm">
            Carga el consolidado en el apartado siguiente y crea el seguimiento de sus proyectos.
          </p>
        )}
      </section>
      {project && (
        <ProjectFollowup
          key={`${project.id}-${focusIndicator}`}
          initialIndicator={focusIndicator}
          project={project}
          onChange={updateProject}
        />
      )}
      <ExcelIndicatorDesigner
        onTrackProjects={(projects, year) => {
          const newProjects = projects.filter(
            (p) => !portfolio.projects.some((own) => own.id === p.id),
          );
          if (!newProjects.length)
            throw new Error(
              "Estos proyectos ya tienen seguimiento. Se conservan sus mediciones; elige una ficha en la cartera.",
            );
          setPortfolio(
            addTrackedProjects(
              portfolio,
              newProjects.map((p) => trackExecutionProject(p, year)),
            ),
          );
          setSelected(newProjects[0]?.id ?? "");
        }}
        onAdopt={(projectId, indicator) => {
          const own = portfolio.projects.find((p) => p.id === projectId);
          if (!own) throw new Error("Primero crea el seguimiento de los proyectos del Excel.");
          const adopted = adoptIndicator(indicator);
          if (own.indicators.some((i) => i.id === adopted.id))
            throw new Error("Este indicador ya está en el seguimiento del proyecto.");
          updateProject({ ...own, indicators: [...own.indicators, adopted] });
          setSelected(own.id);
          setFocusIndicator(adopted.id);
        }}
      />
    </div>
  );
}

function ProjectFollowup({
  project,
  onChange,
  initialIndicator,
}: {
  project: TrackedProject;
  onChange: (project: TrackedProject) => void;
  initialIndicator: string;
}) {
  const [tab, setTab] = useState<"medicion" | "cooperacion">("medicion");
  const [selected, setSelected] = useState(initialIndicator || project.indicators[0]?.id || "");
  const [reviewPeriod, setReviewPeriod] = useState("");
  const indicator = project.indicators.find((i) => i.id === selected);
  const gaps = trackingGaps(project);
  return (
    <section id="seguimiento-proyecto" className={`${panel} space-y-4`}>
      <h2 className="text-xl font-semibold">Seguimiento: {project.name}</h2>
      <div className="flex flex-wrap gap-2">
        <button
          className={tab === "medicion" ? primary : button}
          onClick={() => setTab("medicion")}
        >
          Indicadores y mediciones
        </button>
        <button
          className={tab === "cooperacion" ? primary : button}
          onClick={() => setTab("cooperacion")}
        >
          Cooperación y réplica
        </button>
      </div>
      {tab === "medicion" ? (
        <>
          <Field label="Periodo a revisar (vacío: último registro de cada indicador)">
            <input
              className={input}
              type="month"
              value={reviewPeriod}
              onChange={(event) => setReviewPeriod(event.target.value)}
            />
          </Field>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <caption className="mb-2 text-left font-medium">
                Estado de los indicadores del proyecto
              </caption>
              <thead>
                <tr>
                  <th className="p-2">Indicador</th>
                  <th className="p-2">Periodo</th>
                  <th className="p-2">Medición</th>
                  <th className="p-2">Lectura</th>
                  <th className="p-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {project.indicators.map((item) => {
                  const history = latestObservations(project, item.id);
                  const observation = reviewPeriod
                    ? history.find((o) => o.period === reviewPeriod)
                    : history.at(-1);
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">
                        {observation?.period ?? (reviewPeriod || "Sin periodo")}
                      </td>
                      <td className="p-2">{observation?.value ?? "Sin dato"}</td>
                      <td className="p-2">{assessMeasurement(item, observation)}</td>
                      <td className="p-2">
                        <button className={button} onClick={() => setSelected(item.id)}>
                          Ver y registrar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Field label="Indicador en seguimiento">
            <select
              className={input}
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {project.indicators.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            className={button}
            onClick={() => {
              const added = blankIndicator();
              onChange({ ...project, indicators: [...project.indicators, added] });
              setSelected(added.id);
            }}
          >
            Agregar un indicador que ya usamos
          </button>
          {indicator && (
            <IndicatorFollowup
              key={indicator.id}
              project={project}
              indicator={indicator}
              onChange={onChange}
            />
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Documenta el proyecto para cooperación internacional. Esta revisión interna identifica
            vacíos; no evalúa elegibilidad ni sustituye los requisitos de una convocatoria.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {COOPERATION_FIELDS.map(([key, label, help]) => (
              <Field key={key} label={label}>
                <textarea
                  className={input}
                  rows={3}
                  value={project.cooperation[key]}
                  placeholder={help}
                  onChange={(event) =>
                    onChange({
                      ...project,
                      cooperation: { ...project.cooperation, [key]: event.target.value },
                    })
                  }
                />
              </Field>
            ))}
          </div>
          <button
            className={button}
            onClick={() =>
              download(
                cooperationBrief(project),
                "ficha-cooperacion.md",
                "text/markdown;charset=utf-8",
              )
            }
          >
            Descargar ficha para cooperación
          </button>
          <h3 className="font-semibold">Resultados que respaldan la adaptación</h3>
          {project.indicators
            .filter((i) => i.level === "resultado" || i.level === "impacto")
            .map((i) => {
              const latest = latestObservations(project, i.id).at(-1);
              return (
                <p key={i.id} className="rounded border p-3 text-sm">
                  <strong>{i.name}:</strong> {latest?.value ?? "Sin dato"}{" "}
                  {latest?.value === null || latest?.value === undefined ? "" : i.unit}{" "}
                  {latest ? `(${latest.period})` : ""}. {assessMeasurement(i, latest)}.{" "}
                  {latest?.evidence}
                </p>
              );
            })}
          <p className="text-sm">
            Una réplica necesita resultados verificables, método transferible, costos y condiciones
            locales. Tener una ficha diligenciada no demuestra impacto ni garantiza financiación.
          </p>
        </>
      )}
      <details>
        <summary className="cursor-pointer font-medium">
          Qué hace falta: {gaps.length} hallazgos para revisar
        </summary>
        <ul className="mt-3 space-y-2">
          {gaps.map((gap, index) => (
            <li
              key={index}
              className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
            >
              <strong>{gap.rule}.</strong> {gap.evidence}
              <p className="mt-1">{gap.action}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

const COOPERATION_FIELDS: [keyof CooperationProfile, string, string][] = [
  [
    "problem",
    "Problema y evidencia",
    "Qué problema se busca cambiar y qué fuente respalda su magnitud",
  ],
  [
    "population",
    "Población y criterios de inclusión",
    "Quiénes participan y cómo se identifica su necesidad",
  ],
  ["territory", "Territorio", "Dónde se ejecuta y qué contexto influye en los resultados"],
  [
    "causalHypothesis",
    "Cómo se produce el cambio",
    "Si hacemos…, bajo estas condiciones…, esperamos este cambio… porque…",
  ],
  [
    "replicableUnit",
    "Qué se puede replicar",
    "Paquete mínimo: servicio, método, equipo o intervención",
  ],
  ["method", "Método y calidad", "Pasos y estándares que deben mantenerse en una réplica"],
  [
    "adaptation",
    "Adaptación a otro territorio",
    "Qué cambiaría y qué tendría que validarse antes de replicar",
  ],
  ["partners", "Equipo y alianzas", "Capacidades, funciones y acuerdos necesarios"],
  ["costs", "Costos y fuentes", "Costo del paquete, costos recurrentes y soporte verificable"],
  [
    "sustainability",
    "Continuidad después de la financiación",
    "Quién opera, mantiene y financia la continuidad",
  ],
  [
    "risks",
    "Riesgos y salvaguardas",
    "Condiciones externas, mitigación y protección de las personas",
  ],
];

function IndicatorFollowup({
  project,
  indicator,
  onChange,
}: {
  project: TrackedProject;
  indicator: TrackingIndicator;
  onChange: (project: TrackedProject) => void;
}) {
  const [draft, setDraft] = useState(indicator);
  const [error, setError] = useState("");
  const values = latestObservations(project, indicator.id);
  const update = <K extends keyof TrackingIndicator>(key: K, value: TrackingIndicator[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  function save() {
    setError("");
    try {
      const validated = validateTrackingIndicator(draft);
      if (
        validated.code.trim() &&
        project.indicators.some(
          (i) =>
            i.id !== indicator.id &&
            i.code.trim().toLowerCase() === validated.code.trim().toLowerCase(),
        )
      )
        throw new Error("El código ya se usa en este proyecto.");
      onChange(updateTrackingIndicator(project, validated));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  return (
    <div className="space-y-4">
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer font-medium">Definición, línea base, meta y ODS</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(
            [
              ["name", "Nombre"],
              ["code", "Código propio"],
              ["unit", "Unidad"],
              ["outcome", "Cambio o resultado que mide"],
              ["formula", "Definición y fórmula"],
              ["source", "Fuente"],
              ["instrument", "Instrumento"],
              ["frequency", "Frecuencia"],
              ["responsible", "Responsable"],
              ["baselineSource", "Fuente de la línea base"],
              ["targetSource", "Fundamento de la meta"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className={input}
                value={draft[key]}
                onChange={(event) => update(key, event.target.value)}
              />
            </Field>
          ))}
          <Field label="Nivel causal">
            <select
              className={input}
              value={draft.level}
              onChange={(event) =>
                update("level", event.target.value as TrackingIndicator["level"])
              }
            >
              {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sentido de éxito">
            <select
              className={input}
              value={draft.orientation}
              onChange={(event) =>
                update("orientation", event.target.value as TrackingIndicator["orientation"])
              }
            >
              {Object.entries(ORIENTATION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          {(
            [
              ["baseline", "Línea base"],
              ["target", "Meta"],
              ["lower", "Límite inferior (rango o estabilidad)"],
              ["upper", "Límite superior (rango o estabilidad)"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                step="any"
                className={input}
                value={draft[key] ?? ""}
                onChange={(event) => update(key, numberValue(event.target.value))}
              />
            </Field>
          ))}
          <Field label="Fecha de la meta">
            <input
              className={input}
              type="date"
              value={draft.targetDate}
              onChange={(event) => update("targetDate", event.target.value)}
            />
          </Field>
          <Field label="Metas ODS (hasta tres; selección para revisión)">
            <select
              multiple
              size={5}
              className={input}
              value={draft.ods}
              onChange={(event) =>
                update(
                  "ods",
                  Array.from(event.target.selectedOptions, (option) => option.value),
                )
              }
            >
              {ALL_TARGETS.map((target) => (
                <option key={target.code} value={target.code}>
                  {target.code} · {target.text}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button className={`${primary} mt-3`} onClick={save}>
          Guardar definición del indicador
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-800">
            {error}
          </p>
        )}
      </details>
      <MeasurementForm
        key={`${indicator.id}-${project.observations.length}`}
        project={project}
        indicator={indicator}
        onChange={onChange}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="mb-2 text-left font-medium">Historial de {indicator.name}</caption>
          <thead>
            <tr>
              <th className="p-2">Periodo</th>
              <th className="p-2">Valor</th>
              <th className="p-2">Planeado</th>
              <th className="p-2">Lectura</th>
              <th className="p-2">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {values.map((observation) => (
              <tr key={observation.id} className="border-t">
                <td className="p-2">
                  {observation.period} · v{observation.revision}
                </td>
                <td className="p-2">{observation.value ?? "Sin dato"}</td>
                <td className="p-2">{observation.planned ?? "Sin dato"}</td>
                <td className="p-2">{assessMeasurement(indicator, observation)}</td>
                <td className="p-2">{observation.evidence || observation.missingReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!values.length && <p className="text-sm">Este indicador todavía no tiene mediciones.</p>}
      <details>
        <summary className="cursor-pointer text-sm">Ver todas las revisiones conservadas</summary>
        {project.observations
          .filter((o) => o.indicatorId === indicator.id)
          .map((o) => (
            <p key={o.id} className="mt-2 break-words text-xs">
              {o.period} · revisión {o.revision} · {o.recordedAt} · {o.value ?? "Sin dato"} ·{" "}
              {o.note} · {o.evidence}
            </p>
          ))}
      </details>
    </div>
  );
}

function MeasurementForm({
  project,
  indicator,
  onChange,
}: {
  project: TrackedProject;
  indicator: TrackingIndicator;
  onChange: (project: TrackedProject) => void;
}) {
  const [period, setPeriod] = useState("");
  const [value, setValue] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [zero, setZero] = useState(false);
  const [error, setError] = useState("");
  const prior = latestObservations(project, indicator.id).find((o) => o.period === period);
  function save() {
    setError("");
    try {
      const observation: Omit<Observation, "id" | "revision" | "recordedAt"> = {
        indicatorId: indicator.id,
        period,
        value: numberValue(value),
        planned: prior?.planned ?? null,
        explicitZero: zero,
        evidence,
        missingReason: reason,
        note,
      };
      onChange(recordObservation(project, observation, Boolean(prior)));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <h3 className="font-semibold">Registrar una medición</h3>
      <p className="mt-1 text-sm">
        Valor en {indicator.unit}. Usa la definición: {indicator.formula}. Un vacío significa que no
        se midió.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Periodo de medición">
          <input
            className={input}
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </Field>
        <Field label="Valor observado">
          <input
            className={input}
            type="number"
            step="any"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
        <Field label="Fuente o evidencia de esta medición">
          <input
            className={input}
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
          />
        </Field>
        <Field label="Motivo si no se midió">
          <input
            className={input}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <Field label="Nota o explicación de la corrección">
          <input className={input} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={zero} onChange={(event) => setZero(event.target.checked)} />
        Confirmo que el cero es real, si el valor ingresado es cero
      </label>
      {prior && (
        <p className="mt-2 text-sm">
          Ya existe una medición: {prior.value ?? "Sin dato"}. Se guardará una nueva revisión y se
          conservará la anterior.
        </p>
      )}
      <button className={`${primary} mt-3`} onClick={save}>
        {prior ? "Guardar corrección con historial" : "Guardar medición"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
