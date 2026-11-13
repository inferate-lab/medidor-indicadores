import { useState } from "react";
import { ODS_SOURCE } from "@/data/ods-catalog";
import { adoptIndicator, latestObservations } from "@/lib/project-tracking";
import {
  closeLearning,
  declaredGoalsWithoutMeasurement,
  odsMeasurementRows,
  saveLearning,
  suggestForMelProject,
} from "@/lib/mel-workflow";
import type { TrackedProject } from "@/types/project-tracking";
import type { SessionAnalysis } from "@/types/medidor";

const input = "mt-1 block w-full rounded border bg-background p-2 text-sm";
const button =
  "rounded border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50";
const message = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación.";

export function ProjectSuggestions({
  project,
  onChange,
}: {
  project: TrackedProject;
  onChange: (project: TrackedProject) => void;
}) {
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function suggest() {
    setBusy(true);
    setError("");
    try {
      setAnalysis(await suggestForMelProject(project));
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded border p-3">
      <summary className="cursor-pointer font-medium">
        Revisar y sugerir indicadores de este proyecto
      </summary>
      <label className="mt-3 block text-sm">
        Descripción, objetivos, actividades y resultados esperados
        <textarea
          rows={5}
          className={input}
          value={project.description}
          onChange={(event) => {
            onChange({ ...project, description: event.target.value });
            setAnalysis(null);
          }}
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        Describe al menos 80 caracteres. Las sugerencias son hipótesis de medición basadas en
        reglas; se incorporan solo cuando las eliges.
      </p>
      <button
        className={`${button} mt-3`}
        disabled={busy || project.description.trim().length < 80}
        onClick={suggest}
      >
        {busy ? "Analizando…" : "Sugerir indicadores para este proyecto"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {analysis?.indicators.map((indicator) => {
          const adopted = adoptIndicator(indicator);
          const exists = project.indicators.some((own) => own.id === adopted.id);
          return (
            <article key={indicator.id} className="rounded border p-3 text-sm">
              <h4 className="font-semibold">{indicator.name}</h4>
              <p className="mt-1">{indicator.formula}</p>
              <p className="mt-1">
                Fuente propuesta: {indicator.primarySource}. {indicator.frequency}.
              </p>
              <p className="mt-1">
                Metas ODS para revisión:{" "}
                {indicator.odsAlignments.map((a) => a.targetCode).join(", ") ||
                  "Sin asociación específica"}
                .
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {indicator.recommendationRationale}
              </p>
              <button
                className={`${button} mt-2`}
                disabled={exists}
                onClick={() =>
                  onChange({ ...project, indicators: [...project.indicators, adopted] })
                }
              >
                {exists ? "Ya está en seguimiento" : "Incorporar este indicador"}
              </button>
            </article>
          );
        })}
      </div>
    </details>
  );
}

export function OdsMeasurementPanel({
  project,
  onMeasure,
}: {
  project: TrackedProject;
  onMeasure: (id: string) => void;
}) {
  const [period, setPeriod] = useState("");
  const rows = odsMeasurementRows(project, period);
  const declared = declaredGoalsWithoutMeasurement(project);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cómo se mide la contribución del proyecto a los ODS</h3>
      <p className="text-sm">
        Cada meta se respalda con indicadores locales y sus fuentes. Los avances se evalúan por
        indicador; no se suman para producir un porcentaje de cumplimiento del ODS.
      </p>
      <label className="block text-sm">
        Periodo ODS (vacío: último registro de cada indicador)
        <input
          type="month"
          className={input}
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        />
      </label>
      {!rows.length && (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          Todavía no hay metas ODS vinculadas a indicadores de seguimiento. Incorpora una sugerencia
          o abre la definición de un indicador, selecciona la meta y justifica su relación. Cargar
          un Excel no demuestra contribución por sí solo.
        </p>
      )}
      {declared.map((goal) => (
        <p key={goal.number} className="rounded border border-amber-200 p-3 text-sm">
          <strong>ODS {goal.number} declarado en el Excel:</strong> {goal.title}. Falta vincular una
          meta específica con un indicador medible del proyecto.
        </p>
      ))}
      {rows.map(({ target, indicators }) => (
        <section key={target.code} className="rounded-lg border p-4">
          <h4 className="font-semibold">
            ODS {target.goal} · Meta {target.code}
          </h4>
          <p className="mt-2 text-sm">{target.text}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Referencia global: {target.indicatorCodes.join(", ")}. El indicador local no sustituye
            estos indicadores oficiales. Fuente: {ODS_SOURCE.version}.
          </p>
          <div className="mt-3 space-y-3">
            {indicators.map(({ indicator, observation, assessment }) => (
              <article key={indicator.id} className="rounded border bg-muted/20 p-3 text-sm">
                <h5 className="font-semibold">Indicador local: {indicator.name}</h5>
                <p className="mt-1">Definición: {indicator.formula}.</p>
                <p className="mt-1">
                  Relación propuesta:{" "}
                  {indicator.odsRationale || "Pendiente de justificar y revisar."}
                </p>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt>Línea base</dt>
                    <dd>
                      {indicator.baseline ?? "Sin dato"} ·{" "}
                      {indicator.baselineSource || "Sin fuente"}
                    </dd>
                  </div>
                  <div>
                    <dt>Meta local</dt>
                    <dd>
                      {indicator.target ??
                        (indicator.lower !== null && indicator.upper !== null
                          ? `${indicator.lower}–${indicator.upper}`
                          : "Sin dato")}{" "}
                      · {indicator.targetDate || "Sin fecha"}
                    </dd>
                  </div>
                  <div>
                    <dt>Medición y periodo</dt>
                    <dd>
                      {observation?.value ?? "Sin dato"}{" "}
                      {observation?.value !== null && observation?.value !== undefined
                        ? indicator.unit
                        : ""}{" "}
                      · {observation?.period ?? "Sin medición"}
                    </dd>
                  </div>
                  <div>
                    <dt>Lectura frente a la meta local</dt>
                    <dd>{assessment}</dd>
                  </div>
                </dl>
                <p className="mt-2">
                  Evidencia:{" "}
                  {observation?.evidence || observation?.missingReason || "Pendiente de registrar"}.
                </p>
                <button className={`${button} mt-2`} onClick={() => onMeasure(indicator.id)}>
                  Configurar y medir este indicador
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function LearningPanel({
  project,
  onChange,
}: {
  project: TrackedProject;
  onChange: (project: TrackedProject) => void;
}) {
  const [indicatorId, setIndicator] = useState(project.indicators[0]?.id ?? "");
  const [period, setPeriod] = useState("");
  const [finding, setFinding] = useState("");
  const [decision, setDecision] = useState("");
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const observation = latestObservations(project, indicatorId).find((o) => o.period === period);
  function save() {
    try {
      onChange(
        saveLearning(project, { indicatorId, period, finding, decision, responsible, dueDate }),
      );
      setFinding("");
      setDecision("");
      setError("");
    } catch (cause) {
      setError(message(cause));
    }
  }
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Evaluación y aprendizaje para decidir</h3>
      <p className="text-sm">
        Interpreta una medición, documenta sus límites y acuerda una acción. Cierra la acción cuando
        registres qué ocurrió; el dato por sí solo no prueba causalidad.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Indicador que respalda el hallazgo
          <select
            aria-label="Indicador que respalda el hallazgo"
            className={input}
            value={indicatorId}
            onChange={(event) => setIndicator(event.target.value)}
          >
            <option value="">Selecciona un indicador</option>
            {project.indicators.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Periodo evaluado
          <input
            type="month"
            className={input}
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </label>
      </div>
      <p className="rounded border p-3 text-sm">
        Registro vinculado:{" "}
        {observation
          ? `${observation.value ?? "Sin dato"} · ${observation.evidence || observation.missingReason}`
          : "Selecciona un indicador y periodo con una medición o ausencia documentada."}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["Hallazgo e interpretación (incluye límites)", finding, setFinding],
            ["Decisión o ajuste que se probará", decision, setDecision],
            ["Responsable de la acción", responsible, setResponsible],
          ] as const
        ).map(([label, value, setter]) => (
          <label key={label} className="text-sm">
            {label}
            <textarea
              className={input}
              rows={2}
              value={value}
              onChange={(event) => setter(event.target.value)}
            />
          </label>
        ))}
        <label className="text-sm">
          Fecha de revisión de la acción
          <input
            type="date"
            className={input}
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
      </div>
      <button className={button} onClick={save}>
        Guardar hallazgo y acción
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      {project.learning.map((entry) => (
        <article key={entry.id} className="rounded border p-3 text-sm">
          <h4 className="font-semibold">
            {project.indicators.find((i) => i.id === entry.indicatorId)?.name} · {entry.period} ·{" "}
            {entry.status}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Registro evaluado: revisión {entry.observationRevision}. Valor:{" "}
            {project.observations.find(
              (o) =>
                o.indicatorId === entry.indicatorId &&
                o.period === entry.period &&
                o.revision === entry.observationRevision,
            )?.value ?? "Sin dato"}
            . Fuente:{" "}
            {project.observations.find(
              (o) =>
                o.indicatorId === entry.indicatorId &&
                o.period === entry.period &&
                o.revision === entry.observationRevision,
            )?.evidence || "Ausencia documentada"}
            .
          </p>
          <p className="mt-1">Hallazgo: {entry.finding}</p>
          <p className="mt-1">Decisión: {entry.decision}</p>
          <p className="mt-1">
            Responsable: {entry.responsible}. Revisar el {entry.dueDate}.
          </p>
          {entry.status === "cerrada" ? (
            <p className="mt-2">Resultado de la acción: {entry.review}</p>
          ) : (
            <>
              <label className="mt-2 block">
                Resultado y evidencia de la acción
                <textarea
                  aria-label={`Resultado de la acción ${entry.id}`}
                  className={input}
                  value={reviews[entry.id] ?? ""}
                  onChange={(event) => setReviews({ ...reviews, [entry.id]: event.target.value })}
                />
              </label>
              <button
                className={`${button} mt-2`}
                onClick={() => {
                  try {
                    onChange(closeLearning(project, entry.id, reviews[entry.id] ?? ""));
                    setError("");
                  } catch (cause) {
                    setError(message(cause));
                  }
                }}
              >
                Cerrar acción con evidencia
              </button>
            </>
          )}
        </article>
      ))}
      {!project.learning.length && (
        <p className="text-sm text-muted-foreground">
          No hay hallazgos registrados. Los ejemplos no se incorporan automáticamente.
        </p>
      )}
    </div>
  );
}
