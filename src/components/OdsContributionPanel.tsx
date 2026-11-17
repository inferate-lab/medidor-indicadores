import { useState } from "react";

import type { EvidenceStrength, OdsContribution } from "@/lib/ods-contribution";

const STRENGTH: Record<EvidenceStrength, { label: string; style: string; help: string }> = {
  alta: {
    label: "Aporte claro",
    style: "border-emerald-300 bg-emerald-50 text-emerald-950",
    help: "Varias actividades ejecutadas y al menos el 15% de lo hecho en el proyecto.",
  },
  media: {
    label: "Aporte parcial",
    style: "border-sky-200 bg-sky-50 text-sky-950",
    help: "Hay actividades ejecutadas, pero pesan poco en el proyecto.",
  },
  baja: {
    label: "Solo declarado",
    style: "border-slate-200 bg-slate-50 text-slate-800",
    help: "Lo menciona el proyecto, pero no hay actividades ejecutadas asociadas.",
  },
};

function n(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

/** Aporte del proyecto a cada meta ODS, con las actividades que lo sostienen y cómo medirlo. */
export function OdsContributionPanel({ contributions }: { contributions: OdsContribution[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (contributions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ninguna actividad del plan coincide con las metas ODS del catálogo. Revisa los nombres de las actividades o asigna la meta a mano.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {contributions.map((item) => {
        const strength = STRENGTH[item.strength];
        const isOpen = open === item.pathway.id;
        return (
          <article key={item.pathway.id} className={`rounded-lg border p-4 text-sm ${strength.style}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  ODS {item.goal} · Meta {item.pathway.targetCode} · {item.pathway.theme}
                </p>
                <p className="mt-0.5 text-xs opacity-80">{item.goalTitle}</p>
              </div>
              <span className="rounded-full border border-current px-2 py-0.5 text-xs font-medium" title={strength.help}>
                {strength.label}
                {item.declared ? " · declarado por la organización" : ""}
              </span>
            </div>
            <p className="mt-2">{item.summary}</p>
            {item.shareOfExecution !== null && item.executed > 0 && (
              <div className="mt-2 h-2 w-full rounded bg-white/70" aria-hidden>
                <div className="h-2 rounded bg-current opacity-60" style={{ width: `${Math.min(100, item.shareOfExecution * 100)}%` }} />
              </div>
            )}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide">Lo que ya se puede contar</p>
                <p className="mt-1">
                  {item.pathway.output.name}: <strong>{n(item.executed)}</strong> realizadas
                  {item.participants !== null ? <> y <strong>{n(item.participants)}</strong> asistencias</> : null}.
                </p>
              </div>
              <div className="rounded-md bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide">Indicador para medir el aporte</p>
                <p className="mt-1 font-medium">{item.pathway.outcome.name}</p>
                <p className="mt-1 text-xs">
                  Se acerca al indicador global <strong>{item.pathway.globalIndicator.code}</strong>: {item.pathway.globalIndicator.name}.
                </p>
              </div>
            </div>
            <button className="mt-3 text-xs font-medium underline" onClick={() => setOpen(isOpen ? null : item.pathway.id)}>
              {isOpen ? "Ocultar detalle" : "Ver actividades, meta oficial y cómo medir"}
            </button>
            {isOpen && (
              <div className="mt-3 space-y-3 border-t border-current/20 pt-3">
                <p><strong>Meta oficial:</strong> {item.targetText}</p>
                <p><strong>Cómo medirlo:</strong> {item.pathway.outcome.numerator}{item.pathway.outcome.denominator !== "No aplica" ? `, sobre ${item.pathway.outcome.denominator.toLowerCase()}` : ""}. Instrumento: {item.pathway.outcome.instrument}. Frecuencia: {item.pathway.outcome.frequency}.</p>
                <p><strong>Hasta dónde llega:</strong> {item.pathway.bridge}</p>
                {item.activities.length > 0 && (
                  <div>
                    <p className="font-semibold">Actividades asociadas</p>
                    <ul className="mt-1 space-y-1">
                      {item.activities.map((activity) => (
                        <li key={activity.row}>
                          • {activity.name} — {n(activity.executed)} realizadas
                          {activity.participants !== null ? `, ${n(activity.participants)} asistencias` : ""}
                          <span className="opacity-70"> (fila {activity.row}; por «{activity.matched.join("», «")}»)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
      <p className="text-xs text-muted-foreground">
        El aporte se cuenta en actividades y asistencias: muestra contribución, no el avance de la meta en el país. Una actividad puede aportar a más de una meta, por eso los porcentajes no suman 100. Para afirmar un cambio hace falta medir el indicador de resultado propuesto.
      </p>
    </div>
  );
}
