import { identifyInterventions } from "@/lib/intervention-measurement";

export function InterventionProfile({ text }: { text: string }) {
  const profile = identifyInterventions(text);
  return (
    <section
      className="rounded-lg border bg-muted/20 p-3 text-sm"
      aria-label="Intervenciones identificadas"
    >
      <h3 className="font-semibold">Qué hace este proyecto y qué conviene evaluar</h3>
      {profile.unresolved ? (
        <p className="mt-2">
          La descripción todavía no permite identificar una intervención concreta. Agrega qué se
          hará, con quién y qué cambio se espera para orientar las mediciones.
        </p>
      ) : (
        <>
          <p className="mt-1">
            Se identifican estas intervenciones en el documento. Cada una puede requerir mediciones
            diferentes de calidad, resultados y viabilidad.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.interventions.map((item) => (
              <details key={item.id} className="rounded border bg-background p-2">
                <summary className="cursor-pointer font-medium">{item.label}</summary>
                {item.evidence.map((line, index) => (
                  <p className="mt-1 max-w-xl text-xs" key={index}>
                    {line}
                  </p>
                ))}
              </details>
            ))}
          </div>
          <p className="mt-2 text-xs">
            Revisa la interpretación con las actividades reales. Las propuestas no implican
            resultados medidos ni metas ODS demostradas.
          </p>
        </>
      )}
    </section>
  );
}
