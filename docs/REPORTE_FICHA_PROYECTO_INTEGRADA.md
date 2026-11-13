# Una ficha MEL para cada proyecto seleccionado

## Problema observado

La cartera y el asistente documental mantenían contextos separados. Seleccionar T&D o Hidrofonías no cargaba el asistente inferior; este abría la configuración institucional, haciendo parecer que había que diseñar el proyecto nuevamente. Las propuestas generadas dentro de la ficha tampoco se conservaban como borrador propio.

## Solución

La ficha de cada proyecto reúne indicadores, mediciones, ODS, teoría del cambio, marco lógico, cooperación y aprendizaje. Al seleccionar un proyecto con descripción suficiente se prepara y guarda su borrador, incluyendo las sugerencias de indicadores. Se aplica a proyectos importados y proyectos nuevos. Las sugerencias no se convierten en valores observados ni en indicadores incorporados sin una acción del usuario.

Las tarjetas de cartera y el selector del Excel comparten la selección. La vista de ejecución añade **Abrir ficha MEL: indicadores, teoría y marco lógico**. Si el proyecto ya tiene ficha, la recupera sin duplicarlo. Si todavía no la tiene, lleva su plan al flujo de vigencia para crear el seguimiento, sin inventar el año.

La **Teoría del cambio** permite revisar actividades, productos, resultados e impacto y documentar supuestos entre niveles. Es una hipótesis por revisar; los supuestos se dejan pendientes. Las ediciones se conservan y un cambio posterior de descripción se señala sin sobrescribirlas.

El **Marco lógico** toma la cadena de esa ficha y los indicadores y mediciones del mismo proyecto. Permite elegir periodo, distinguir propuestas de indicadores en seguimiento, incorporar una sugerencia y pasar a medir, y descargar XLSX con valores, referencias, fuentes y supuestos. Una medición nueva aparece en el marco; un dato ausente sigue sin dato. No se copian observaciones de otro proyecto.

El formulario independiente ahora se llama **Crear otro proyecto desde documentos** y explica su alcance. Comienza por el proyecto, con cinco pasos visibles. Los marcos institucionales quedan en configuración opcional. Sus diseños pueden incorporarse a la cartera con su propio contexto.

Los campos nuevos tienen valores por defecto para mantener compatibles los respaldos anteriores. Los proyectos que no tengan 80 caracteres de descripción pueden completar la información y solicitar el borrador. El motor sigue basado en reglas; no comprueba causalidad ni sustituye la revisión metodológica humana.

## Validación

- 98 pruebas aprobadas, incluida la lectura del archivo de trabajo, independencia de borradores, ausencia de metas inventadas, marco por proyecto/periodo, incorporación sin duplicados y persistencia de ediciones.
- TypeScript y compilaciones normal y estática completados.
- Chromium sobre la compilación estática: seleccionar Hidrofonías, editar su teoría, pasar a T&D mediante el selector y comprobar independencia; registrar valor 11 en T&D, verlo en su marco y en el XLSX; volver a Hidrofonías y comprobar que conserva su edición y no muestra la medición ajena.
- Cargar otro Excel, crear su ficha, comprobar teoría y marco propios e incorporar una propuesta para medirla. Recarga con ediciones conservadas. El formulario documental comienza en Proyecto y muestra cinco pasos.
- Desde ejecución, abrir Hidrofonías en su ficha MEL sin duplicación. Sin errores de página ni desborde horizontal en móvil.

No se incorpora el Excel del usuario al repositorio.
