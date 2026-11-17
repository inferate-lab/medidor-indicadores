import { odsMeter, type MeterStrength } from "@/lib/ods-meter";
import type { TrackedProject } from "@/types/project-tracking";

const STRENGTH: Record<MeterStrength, { label: string; style: string }> = {
  alta: { label: "Aporte claro", style: "border-emerald-300 bg-emerald-50 text-emerald-950" },
  media: { label: "Aporte parcial", style: "border-sky-200 bg-sky-50 text-sky-950" },
  baja: { label: "Sin ejecución aún", style: "border-slate-200 bg-slate-50 text-slate-800" },
  sin_cifras: { label: "Faltan cifras", style: "border-amber-300 bg-amber-50 text-amber-950" },
};

function n(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

/** Resumen por meta ODS con las cifras de ejecución del proyecto. */
export function OdsMeterPanel({ project }: { project: TrackedProject }) {
  const rows = odsMeter(project);
  if (rows.length === 0) return null;
  const missingNumbers = rows.every((row) => row.strength === "sin_cifras");
  return (
    <section className="rounded border-2 border-primary/30 p-4">
      <h4 className="text-base font-semibold">Medidor ODS del proyecto</h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Cuánto de lo que el proyecto ejecutó aporta a cada meta ODS, ordenado de mayor a menor aporte. Es contribución contada en actividades y asistencias, no el avance de la meta en el país.
      </p>
      {missingNumbers && (
        <p role="status" className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Esta ficha se creó antes de que la herramienta guardara las cifras de cada actividad.{" "}
          <a className="underline" href="#excel-project-import">Vuelve a cargar el Excel de ejecución</a> para calcular el medidor; no se borran indicadores ni mediciones.
        </p>
      )}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted text-left">
              <th className="border p-2">Meta ODS</th>
              <th className="border p-2 text-right">Actividades</th>
              <th className="border p-2 text-right">Realizadas</th>
              <th className="border p-2 text-right">Asistencias</th>
              <th className="border p-2">Peso en el proyecto</th>
              <th className="border p-2">Aporte</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="align-top">
                <td className="border p-2">
                  <strong>ODS {row.goal} · Meta {row.code}</strong>
                  <span className="block text-xs text-muted-foreground">{row.goalTitle}</span>
                </td>
                <td className="border p-2 text-right">{row.activities.length}</td>
                <td className="border p-2 text-right">
                  {n(row.executed)}
                  {row.planned !== null && <span className="block text-xs text-muted-foreground">de {n(row.planned)}</span>}
                </td>
                <td className="border p-2 text-right">{n(row.participants)}</td>
                <td className="border p-2">
                  {row.shareOfExecution === null ? (
                    "—"
                  ) : (
                    <>
                      <div className="h-2 w-full rounded bg-muted" aria-hidden>
                        <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, row.shareOfExecution * 100)}%` }} />
                      </div>
                      <span className="text-xs">{Math.round(row.shareOfExecution * 100)}% de lo ejecutado</span>
                    </>
                  )}
                </td>
                <td className="border p-2">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STRENGTH[row.strength].style}`}>
                    {STRENGTH[row.strength].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 space-y-2">
        {rows.slice(0, 3).map((row) => (
          <article key={row.code} className={`rounded border p-3 text-sm ${STRENGTH[row.strength].style}`}>
            <p className="font-semibold">Meta {row.code}: {row.summary}</p>
            <p className="mt-1">
              <strong>Para medir el cambio:</strong> {row.indicatorName}.{" "}
              {row.outcomeValue
                ? `Último valor registrado: ${n(row.outcomeValue.value)} (${row.outcomeValue.period}).`
                : "Todavía no se mide: regístralo en «Indicadores y mediciones» para saber si las actividades produjeron el cambio."}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Una actividad puede aportar a más de una meta, por eso los porcentajes no suman 100. El detalle de cada vínculo está más abajo.
      </p>
    </section>
  );
}
