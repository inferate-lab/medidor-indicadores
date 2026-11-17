# Reporte: sugerencias de indicadores conectadas a los ODS

Rama `claude/ods-sugerencias`, 17 de noviembre de 2026

## Problema
Las sugerencias salían de dos motores que no se coordinaban: la biblioteca general de indicadores asignaba a cada plantilla metas ODS fijas, sin importar el proyecto, y el mapa de temas proponía otras metas por palabras. Un mismo proyecto podía recibir metas distintas en cada vista, y los indicadores de gestión aparecían asociados a metas como 10.2 sin relación con el proyecto.

## Cambio
`src/data/ods-pathways.ts`: doce rutas de contribución (6.1, 6.b, 6.4, 12.8, 4.7, 7.3, 8.3, 15.3, 12.5, 13.3, 16.7, 17.17). Cada una une las palabras que identifican la actividad, la meta oficial, su indicador global y un indicador de resultado del proyecto que se acerca a él, con instrumento, frecuencia y línea base.
`src/lib/ods-contribution.ts`: asocia cada actividad del plan con sus rutas y calcula el aporte por meta: actividades, realizadas, asistencias y proporción de lo ejecutado. Ordena por lo ejecutado y clasifica el aporte como claro, parcial o solo declarado.
`src/lib/analyze-project.ts`: la batería incluye primero el indicador de resultado de cada ruta detectada (hasta tres), alinea los ODS de los demás indicadores con esas mismas metas y deja sin ODS a los indicadores de gestión, salvo los de género que ya existían. La batería se mantiene en 12 como máximo.
`src/lib/execution-insights.ts`: las metas ODS y los indicadores que faltan salen del aporte medido.
`src/components/OdsContributionPanel.tsx`: panel "Aporte a las metas ODS" con cifras, indicador para medirlo, indicador global y actividades asociadas, en el monitoreo y en el diseño desde Excel.

## Evidencia
`npm run test`: 110 pruebas, todas pasan; siete nuevas con datos ficticios en `src/lib/ods-contribution.test.ts`
`npx tsc --noEmit` sin errores y `npm run build:static` con salida 0
Recorrido en navegador con el ejemplo ficticio sobre la compilación estática: seis metas ordenadas por ejecución y detalle desplegable, sin errores de consola

## Límites
El Excel real de la organización ya no estaba disponible al hacer este cambio; las palabras clave se calibraron con los nombres de actividades observados antes en ese archivo
La asociación es por palabras: una actividad con nombre ambiguo puede quedar sin meta o en una que no le corresponde, y una actividad puede aportar a dos metas
El aporte se mide en actividades y asistencias; no mide el indicador global ni el avance de la meta en el país
Los nombres de los indicadores globales se escribieron a partir de la lista oficial de la ONU y deben contrastarse con ella antes de citarlos en un informe
El panel en la vista de diseño desde Excel no se recorrió en navegador, porque requiere cargar un archivo
