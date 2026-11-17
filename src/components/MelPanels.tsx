import * as XLSX from "xlsx";
import {
  activityOdsMappings,
  buildAutomaticOdsWorkbook,
  officialOdsLinks,
} from "@/lib/automatic-ods";
import type { TrackingIndicator } from "@/types/project-tracking";
import { useState } from "react";
import { ODS_SOURCE } from "@/data/ods-catalog";
import { latestObservations } from "@/lib/project-tracking";
import {
  closeLearning,
  declaredGoalsWithoutMeasurement,
  odsMeasurementRows,
  saveLearning,
  prepareProjectDesign,
  incorporateSuggestion,
} from "@/lib/mel-workflow";
import type { TrackedProject } from "@/types/project-tracking";

const input = "mt-1 block w-full rounded border bg-background p-2 text-sm";
const button =
  "rounded border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50";
const message = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación.";

export function ProjectSuggestions({
  project,
  onChange,
  onMeasure,
}: {
  project: TrackedProject;
  onChange: (project: TrackedProject) => void;
  onMeasure: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function suggest() {
    setBusy(true);
    setError("");
    try {
      onChange(await prepareProjectDesign(project));
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded border p-3" open={project.indicators.length === 0}>
      <summary className="cursor-pointer font-medium">
        Indicadores propuestos para este proyecto
      </summary>
      <label className="mt-3 block text-sm">
        Descripción, objetivos, actividades y resultados esperados
        <textarea
          rows={5}
          className={input}
          value={project.description}
          onChange={(event) => {
            onChange({ ...project, description: event.target.value });
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
        {project.indicatorSuggestions.map((indicator) => {
          const adopted = indicator;
          const exists = project.indicators.some((own) => own.id === adopted.id);
          return (
            <article key={indicator.id} className="rounded border p-3 text-sm">
              <h4 className="font-semibold">{indicator.name}</h4>
              <p className="mt-1">{indicator.formula}</p>
              <p className="mt-1">
                Fuente propuesta: {indicator.source}. {indicator.frequency}.
              </p>
              <p className="mt-1">
                Metas ODS para revisión: {indicator.ods.join(", ") || "Sin asociación específica"}.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {indicator.odsRationale ||
                  "Propuesta por revisar contra el resultado esperado del proyecto."}
              </p>
              <button
                className={`${button} mt-2`}
                disabled={exists}
                onClick={() => {
                  onChange(incorporateSuggestion(project, adopted.id));
                  onMeasure(adopted.id);
                }}
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
  onRegister,
  onChange,
}: {
  project: TrackedProject;
  onMeasure: (id: string) => void;
  onRegister: (indicator: TrackingIndicator) => void;
  onChange: (project: TrackedProject) => void;
}) {
  const [period, setPeriod] = useState("");
  const rows = odsMeasurementRows(project, period);
  const activityMappings = activityOdsMappings(project);
  const declared = declaredGoalsWithoutMeasurement(project);
  function download() {
    const bytes = XLSX.write(buildAutomaticOdsWorkbook(project), {
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
    anchor.download = "propuesta-vinculacion-ods.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cómo se mide la contribución del proyecto a los ODS</h3>
      <p className="text-sm">
        La ONU organiza la Agenda 2030 en ODS, metas específicas (también llamadas aquí «sub-ODS») e
        indicadores globales. La herramienta propone automáticamente la vinculación según el texto
        del proyecto y muestra qué indicador local permitiría medir su contribución. Los resultados
        faltantes no se inventan ni se agregan como un porcentaje de cumplimiento del ODS.
      </p>
      <p className="text-sm">
        <a
          className="text-primary underline"
          href={ODS_SOURCE.url}
          target="_blank"
          rel="noreferrer"
        >
          Marco global de indicadores ONU
        </a>
        {" · "}
        <a
          className="text-primary underline"
          href={ODS_SOURCE.metadataUrl}
          target="_blank"
          rel="noreferrer"
        >
          Repositorio de metadatos ONU
        </a>
      </p>
      <button className={button} disabled={!rows.length} onClick={download}>
        Descargar propuesta de vinculación ODS
      </button>
      <section className="rounded border p-3">
        <h4 className="font-semibold">ODS y metas por actividad</h4>
        <p className="mt-1 text-sm">
          La asociación usa el texto de cada actividad, su alcance y las aclaraciones que registres.
          No hereda las metas de otras actividades del proyecto. La meta 6.1 corresponde a agua
          potable; 6.2, a saneamiento e higiene. Las descripciones siguientes mantienen el texto del
          catálogo ONU.
        </p>
        <div className="mt-3 max-h-[32rem] space-y-3 overflow-y-auto">
          {activityMappings.map(({ activity, candidates }) => (
            <article key={activity.id} className="rounded border bg-muted/20 p-3 text-sm">
              <p className="font-semibold">{activity.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activity.inferred
                  ? "Fragmento detectado de la descripción: revisar que sea una actividad"
                  : `Hoja ${activity.sheet}${activity.row ? ` · Fila ${activity.row}` : " · Sin fila de origen"}`}
                . {activity.scope ? `Alcance: ${activity.scope}` : ""}
              </p>
              {candidates.length ? (
                candidates.map((item) => (
                  <div key={item.target.code} className="mt-2 rounded border p-2">
                    <p className="font-semibold">
                      ODS {item.target.goal}: {item.target.goalTitle}
                    </p>
                    <p className="mt-1">
                      <strong>Meta {item.target.code} (sub-ODS):</strong> {item.target.text}
                    </p>
                    <p className="mt-1 text-xs">{item.rationale}</p>
                    <p className="mt-1 text-xs">
                      Indicadores globales de referencia: {item.target.indicatorCodes.join(", ")}.{" "}
                      {item.limit}
                    </p>
                  </div>
                ))
              ) : (
                <p className="mt-2 text-amber-800">
                  Sin una meta sustentada en lo leído. Una charla, visita o la mención de mujeres no
                  basta: precisa el contenido y el cambio que busca esta actividad.
                </p>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs">
                  Precisar el contenido de esta actividad para evaluar su vínculo
                </summary>
                <label className="mt-2 block text-xs">
                  Aclaración (no modifica el texto original del Excel)
                  <textarea
                    aria-label={`Aclaración de actividad ${activity.id}`}
                    rows={2}
                    className={input}
                    value={activity.clarification}
                    onChange={(event) =>
                      onChange({
                        ...project,
                        activitySources: activityMappings.map(({ activity: original }) => ({
                          id: original.id,
                          description: original.description,
                          scope: original.scope,
                          sheet: original.sheet,
                          row: original.row,
                          clarification:
                            original.id === activity.id
                              ? event.target.value
                              : original.clarification,
                        })),
                      })
                    }
                    placeholder="Qué se hace y qué cambio se busca: agua potable, saneamiento, discriminación, liderazgo…"
                  />
                </label>
              </details>
            </article>
          ))}
        </div>
        {!activityMappings.length && (
          <p className="mt-2 text-sm">
            Añade las actividades del proyecto a su descripción para evaluarlas una por una.
          </p>
        )}
      </section>
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
          La descripción disponible todavía no permite proponer una meta específica con fundamento.
          Añade el objetivo, actividades y cambio esperado del proyecto: la herramienta evaluará
          automáticamente sus relaciones. No asigna un ODS por el nombre de una empresa ni por una
          lista de actividades sin contexto.
        </p>
      )}
      {declared.map((goal) => (
        <p key={goal.number} className="rounded border border-amber-200 p-3 text-sm">
          <strong>ODS {goal.number} declarado en el Excel:</strong> {goal.title}. Falta vincular una
          meta específica con un indicador medible del proyecto.{" "}
          {rows.some((row) => row.target.goal === goal.number)
            ? "Hay una propuesta automática para revisar más abajo."
            : "La declaración por sí sola no identifica qué meta se contribuye a medir."}
        </p>
      ))}
      {rows.map(({ target, indicators, evidence, rationale, limit }) => (
        <section key={target.code} className="rounded-lg border p-4">
          <h4 className="font-semibold">
            ODS {target.goal} · Meta {target.code}
          </h4>
          <p className="mt-1 text-sm font-medium">{target.goalTitle}</p>
          <p className="mt-2 text-sm">
            <strong>Meta específica ONU (sub-ODS):</strong> {target.text}
          </p>
          <p className="mt-2 text-sm">{rationale}</p>
          {evidence.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Fragmentos que activaron la propuesta: {evidence.join(" · ")}
            </p>
          )}
          <p className="mt-2 text-sm">
            <a
              className="text-primary underline"
              href={officialOdsLinks(target.code).goal}
              target="_blank"
              rel="noreferrer"
            >
              Consultar ODS y metas en Naciones Unidas
            </a>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Referencia global: {target.indicatorCodes.join(", ")}. El indicador local no sustituye
            estos indicadores oficiales. Fuente: {ODS_SOURCE.version}. {limit}
          </p>
          <div className="mt-3 space-y-3">
            {indicators.map(({ indicator, observation, assessment, registered }) => (
              <article key={indicator.id} className="rounded border bg-muted/20 p-3 text-sm">
                <p className="text-xs font-medium text-primary">
                  {registered
                    ? "Indicador en seguimiento"
                    : "Propuesta automática de indicador local · todavía no medido"}
                </p>
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
                <p className="mt-2">
                  Fuente e instrumento propuestos: {indicator.source}. {indicator.instrument}.
                </p>
                <button
                  className={`${button} mt-2`}
                  onClick={() => (registered ? onMeasure(indicator.id) : onRegister(indicator))}
                >
                  {registered
                    ? "Configurar y medir este indicador"
                    : "Medir este indicador propuesto"}
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
