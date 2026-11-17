# Recuperación de actividades y educación socioambiental

## Problema observado

La captura mostraba el objetivo institucional genérico como única «actividad» de Afinia. Las fichas antiguas sin activitySources no recuperaban sus filas al abrirlas desde el monitor. Al recargar el archivo, el anterior código solo completaba fichas completamente vacías y no renovaba su descripción documental. Además, el texto fijo del panel explicaba agua potable incluso en proyectos ajenos a esa temática.

## Correcciones

- Abrir una ficha existente desde el monitor y recargar el consolidado usan la misma función de recuperación de contexto, exclusivamente por identificador de proyecto. Se actualizan actividades, alcances y descripción fuente. No se reemplazan indicadores adoptados, observaciones, revisiones, teoría editada o cooperación. Se conservan aclaraciones de actividades con el mismo identificador.
- El objetivo institucional genérico no se muestra como una actividad. Si la ficha antigua solo conserva ese objetivo, aparece un aviso para recuperar las fuentes con el archivo original, sin pedir borrar la cartera. El navegador no conserva el Excel original y no puede reconstruir filas ausentes sin volver a cargarlo.
- Se eliminó la explicación fija de agua potable del panel de todos los proyectos.
- Educación socioambiental, educación ambiental y jornadas educativas se evalúan contra 4.7 con la condición de contenido sostenible/ambiental. El contexto procede del alcance de esa actividad, no de otros proyectos.
- Para 4.7 se propone evaluación inicial/final de competencias socioambientales con numerador, denominador e instrumento; se distingue del indicador global 4.7.1.
- La versión de propuestas pasa a 2 para renovar sugerencias generadas antiguas.

## Evidencia y límites

Auditoría del Excel original: Hidrofonías contiene 22 actividades y propone 4.7, 12.8 y 16.7 por sus alcances pertinentes; no 6.1. Afinia contiene ocho filas: el alcance dice «Educación a clientes» y no especifica el contenido de charlas o visitas. No se infiere acceso a agua ni eficiencia energética solo por el nombre del cliente. Para proponer una meta temática específica hace falta ese contenido en la fuente o en una aclaración. En el consolidado, únicamente los proyectos de Gobernación y Agua presentan actividad que sustenta 6.1.

Navegador Chromium con Excel original: recuperación de ficha antigua de Afinia al recargar archivo y al abrir desde monitor; mediciones idénticas antes y después; ocho fuentes recuperadas; Hidrofonías muestra 4.7; ambos sin 6.1; cero errores de página. Las pruebas incorporan la regresión de fuentes antiguas y contrastan los diez proyectos del archivo cuando se proporciona MEDIDOR_WORKBOOK. No se afirma comprensión semántica universal ni una revisión documental ONU adicional en esta corrección.
