import { useState } from "react";
import * as XLSX from "xlsx";
import { incorporateSuggestion, projectLogframe } from "@/lib/mel-workflow";
import { sanitizeCell } from "@/lib/sanitize";
import type { CausalPlan, TrackedProject } from "@/types/project-tracking";

const input = "mt-1 block w-full rounded border bg-background p-2 text-sm";
const button = "rounded border bg-background px-3 py-2 text-sm font-medium hover:bg-muted";
export function TheoryPanel({
  project,
  onChange,
}: {
  project: TrackedProject;
  onChange: (project: TrackedProject) => void;
}) {
  const plan = project.causalPlan;
  if (!plan)
    return (
      <p className="rounded border p-3 text-sm">
        Para preparar el borrador, completa la descripción de este proyecto con sus actividades y
        cambios esperados (al menos 80 caracteres). No hace falta volver a cargarlo.
      </p>
    );
  const update = <K extends keyof CausalPlan>(key: K, value: CausalPlan[K]) =>
    onChange({ ...project, causalPlan: { ...plan, [key]: value } });
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Teoría del cambio: {project.name}</h3>
      <p className="text-sm">
        Borrador del proyecto seleccionado. Revisa las frases: describen una hipótesis de cambio, no
        resultados demostrados. Tus ajustes se guardan en esta ficha y alimentan su marco lógico.
      </p>
      {plan.sourceText !== project.description && (
        <p className="rounded border border-amber-200 p-3 text-sm">
          La descripción se modificó después de preparar este borrador. Revisa la coherencia de la
          cadena; se conservan tus ajustes.
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-4">
        {(
          [
            ["activities", "1. Lo que hacemos", "Actividades concretas"],
            ["outputs", "2. Lo que entregamos", "Bienes y servicios verificables"],
            [
              "outcomes",
              "3. Lo que debería cambiar",
              "Cambios en capacidades, prácticas o condiciones",
            ],
          ] as const
        ).map(([key, label, hint]) => (
          <label key={key} className="rounded border p-3 text-sm">
            <span className="font-semibold">{label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {hint}. Un elemento por línea.
            </span>
            <textarea
              aria-label={label}
              rows={8}
              className={input}
              value={plan[key].join("\n")}
              onChange={(event) => update(key, event.target.value.split("\n"))}
            />
          </label>
        ))}
        <label className="rounded border p-3 text-sm">
          <span className="font-semibold">4. A qué contribuimos</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Cambio de largo plazo, sujeto a factores externos.
          </span>
          <textarea
            aria-label="4. A qué contribuimos"
            rows={8}
            className={input}
            value={plan.impact}
            onChange={(event) => update("impact", event.target.value)}
          />
        </label>
      </div>
      <h4 className="font-semibold">Condiciones que deben cumplirse</h4>
      <div className="grid gap-3 md:grid-cols-3">
        {(
          [
            ["activityAssumption", "De actividades a productos"],
            ["outcomeAssumption", "De productos a resultados"],
            ["impactAssumption", "De resultados a impacto"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm">
            {label}
            <textarea
              aria-label={label}
              rows={3}
              className={input}
              value={plan[key]}
              placeholder="Pendiente: si…, entonces… bajo estas condiciones…"
              onChange={(event) => update(key, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function LogframePanel({
  project,
  onChange,
  onMeasure,
}: {
  project: TrackedProject;
  onChange: (project: TrackedProject) => void;
  onMeasure: (id: string) => void;
}) {
  const [period, setPeriod] = useState("");
  const rows = projectLogframe(project, period);
  function download() {
    const data: unknown[][] = [
      [
        "Proyecto",
        "Nivel",
        "Descripción",
        "Indicador",
        "Estado",
        "Línea base",
        "Meta local",
        "Periodo",
        "Valor",
        "Unidad",
        "Fuente",
        "Supuesto",
      ],
    ];
    for (const row of rows) {
      for (const { indicator, observation } of row.indicators)
        data.push([
          project.name,
          row.title,
          row.statements.join("\n"),
          indicator.name,
          "En seguimiento",
          indicator.baseline,
          indicator.target,
          observation?.period ?? period,
          observation?.value ?? null,
          indicator.unit,
          observation?.evidence || observation?.missingReason || "Sin medición",
          row.assumption || "Pendiente",
        ]);
      for (const indicator of row.suggestions)
        data.push([
          project.name,
          row.title,
          row.statements.join("\n"),
          indicator.name,
          "Sugerido: no incorporado",
          null,
          null,
          period,
          null,
          indicator.unit,
          "Fuente propuesta: " + indicator.source,
          row.assumption || "Pendiente",
        ]);
      if (!row.indicators.length && !row.suggestions.length)
        data.push([
          project.name,
          row.title,
          row.statements.join("\n"),
          "Falta definir indicador",
          "Pendiente",
          null,
          null,
          period,
          null,
          "",
          "",
          row.assumption || "Pendiente",
        ]);
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(
        data.map((r) => r.map((v) => (typeof v === "string" ? sanitizeCell(v) : v))),
      ),
      "Marco lógico",
    );
    const url = URL.createObjectURL(
      new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "marco-logico-proyecto.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Marco lógico: {project.name}</h3>
      <p className="text-sm">
        La cadena viene de la teoría del cambio de esta ficha. Los valores y fuentes vienen de sus
        mediciones. Una sugerencia sin incorporar no cuenta como indicador medido.
      </p>
      <label className="block text-sm">
        Periodo del marco lógico (vacío: último registro por indicador)
        <input
          className={input}
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        />
      </label>
      <button className={button} onClick={download}>
        Descargar marco lógico de este proyecto
      </button>
      {rows.map((row) => (
        <section key={row.level} className="rounded-lg border p-4">
          <h4 className="font-semibold">{row.title}</h4>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {row.statements.length ? (
              row.statements.map((statement, index) => <li key={index}>{statement}</li>)
            ) : (
              <li>Pendiente de definir en la teoría del cambio.</li>
            )}
          </ul>
          <div className="mt-3 space-y-3">
            {row.indicators.map(({ indicator, observation, assessment }) => (
              <article key={indicator.id} className="rounded border bg-muted/20 p-3 text-sm">
                <p className="font-semibold">En seguimiento: {indicator.name}</p>
                <p>
                  Medición: {observation?.value ?? "Sin dato"} {indicator.unit} ·{" "}
                  {observation?.period ?? "Sin periodo registrado"}. Línea base:{" "}
                  {indicator.baseline ?? "Sin dato"}. Meta: {indicator.target ?? "Sin dato"}.
                </p>
                <p>
                  Fuente:{" "}
                  {observation?.evidence || observation?.missingReason || "Sin medición registrada"}
                  . {assessment}.
                </p>
                <button className={`${button} mt-2`} onClick={() => onMeasure(indicator.id)}>
                  Ver o registrar medición
                </button>
              </article>
            ))}
          </div>
          {row.suggestions.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer">
                Indicadores propuestos para este nivel ({row.suggestions.length})
              </summary>
              {row.suggestions.map((indicator) => (
                <div key={indicator.id} className="mt-2 rounded border p-3">
                  <p>{indicator.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {indicator.formula}. Metas ODS sugeridas:{" "}
                    {indicator.ods.join(", ") || "Sin asociación específica"}.
                  </p>
                  <button
                    className={`${button} mt-2`}
                    onClick={() => {
                      onChange(incorporateSuggestion(project, indicator.id));
                      onMeasure(indicator.id);
                    }}
                  >
                    Incorporar y medir este indicador
                  </button>
                </div>
              ))}
            </details>
          )}
          {!row.indicators.length && (
            <p className="mt-2 text-sm text-amber-800">
              Falta incorporar o definir un indicador para medir este nivel.
            </p>
          )}
          {row.level !== "gestion" && (
            <p className="mt-3 text-sm">
              Supuesto: {row.assumption || "Pendiente de confirmar por el equipo."}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
