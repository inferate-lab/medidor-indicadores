# Reporte de fase: monitoreo de proyectos en ejecución desde Excel

Rama `claude/monitor-excel-ejecucion`, 11 de noviembre de 2026
Adelanta las fases 5 y 6 del plan: seguimiento por periodo y lectura de XLSX real

## Por qué
La persona responsable de MEL reportó que el asistente de seis pasos no se entendía y que pedía trabajo que el sistema debía hacer
La necesidad real es cargar el Excel de ejecución, ver qué se hizo frente a lo planeado y obtener evidencia para ajustar o ampliar actividades

## Entregado
Pantalla inicial "Monitorear proyectos en ejecución"; el asistente de diseño queda como segunda pestaña
`src/lib/execution-import.ts`: lee las hojas de plan de acción ubicando columnas por encabezado, sin sumar dos veces alcances ni actividades agrupadoras, y cruza cada hoja con la hoja Consolidado
`src/lib/execution-analysis.ts`: ejecución frente a lo planeado al mes de corte, avance mensual y acumulado, asistencias, y una señal por actividad con sus cifras y sus advertencias
`src/lib/execution-insights.ts`: indicadores que el Excel ya mide, indicadores que faltan, meta ODS propuesta por tema, conceptos medibles, referencias del BID y borrador de teoría de cambio y marco lógico
`src/data/theme-ods-map.ts` y `src/data/concept-catalog.ts`: reglas visibles de tema a meta ODS y guía de medición de conceptos
Botón "Ver un ejemplo ficticio" con `src/data/demo-execution.ts`

## Decisiones metodológicas
Los vacíos se conservan como null; cero solo cuando el Excel lo trae
Las señales no concluyen con menos de 3 actividades planeadas ni con menos de 30 participantes esperados; esos casos quedan como "muy pocos datos"
Se marca "para revisar" por debajo del 70% de lo planeado o de la asistencia esperada; los umbrales son constantes configurables
"Mejor desempeño" exige además al menos dos meses con meta ya transcurridos
"Mejor desempeño" advierte que ejecutar y convocar no prueba un cambio; la aplicación no recomienda escalar por sí sola
Cero asistencias registradas se informa como dato por confirmar, no como ausencia de público
Las asistencias se describen como suma de asistencias, no como personas únicas
Género no se mide si el archivo no trae el dato; se sugiere la columna y se permite ingresar la cifra
Resultados e impacto aparecen como "falta medir": el Excel solo contiene actividades, asistencias y valores
Los supuestos los redacta el sistema y se rotulan como "con datos del Excel" o "hipótesis por comprobar"
La meta ODS se propone por palabras del proyecto, muestra las que la activaron y queda por confirmar
Las referencias del BID son enlaces al catálogo oficial; la aplicación no consulta servicios externos

## Evidencia
`npm run test`: 71 pruebas en 3 archivos, todas pasan; las nuevas usan solo datos ficticios
`npx tsc --noEmit` sin errores
Recorrido en navegador con el ejemplo ficticio: lista de proyectos, vista de proyecto y sus siete secciones, sin errores de consola
Lectura local del Excel real de la organización, sin guardarlo ni incluirlo en el repositorio: 10 proyectos reconocidos, totales de dos proyectos iguales a los de su hoja de presentación y meta anual igual a la fila "Total actividades" en las hojas que la traen

## Límites
La carga de un archivo desde el selector no se probó en navegador; se probó la misma función con un .xlsx generado en las pruebas
El formato soportado es el del plan de acción con Alcance, Actividad y meses con Meta y Resultado; otros formatos se rechazan con un mensaje
El mes de corte es el último con algún resultado mayor que cero
La asociación con la hoja Consolidado es por nombre; si hay varias versiones de un proyecto sin una única activa, no se asocia
El costo por participante se calcula pero no se muestra
Nada se guarda al recargar la página
Las filas sin numeración separadas del bloque de actividades se tratan como cuadros de resumen y no se suman; si una hoja guarda allí sus beneficiarios, no se leen por actividad
Cuando la suma leída no coincide con la fila "Total actividades", la pantalla lo advierte antes de las cifras

## Revisión de Codex incorporada
Corregido: las reglas de tema a ODS no reconocían palabras con tilde
Corregido: números guardados como texto, actividad sin numerar tras un alcance, cuadros de resumen sumados como actividades y cruce con Consolidado por una sola palabra
Ajustado: umbrales separados, mínimo de periodos, categoría "muy pocos datos" y distinción entre celda vacía y cero
Ajustado: reglas ODS 7.1 por 7.3, 11.3 por 16.7, 6.b más estricta y eliminada la de género por mención
No incorporado: pantalla previa obligatoria de validación de la importación, mes de corte con cobertura mínima y árbol jerárquico completo
