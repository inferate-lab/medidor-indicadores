# Reporte: medidor ODS en la ficha de cada proyecto

Rama `claude/ods-cartera`, 17 de noviembre de 2026

## Problema reportado
En la pantalla principal (cartera de proyectos), la pestaña "Medición ODS" no mostraba ningún medidor: listaba el vínculo de cada actividad con sus metas, repitiendo las mismas metas, y todos los indicadores aparecían "Sin dato · Sin medición", aunque el Excel de ejecución sí traía lo realizado. La ficha guardaba la lista de actividades, pero no sus cifras.

## Cambio
`src/types/project-tracking.ts` y `src/lib/project-tracking.ts`: al crear o actualizar la ficha desde el Excel se guardan, por actividad, lo planeado y lo realizado al mes de corte y las asistencias, además del mes de corte. Los campos son opcionales: las fichas guardadas antes siguen abriendo.
`src/lib/ods-meter.ts`: medidor por meta ODS con el mismo vínculo actividad por actividad que ya usaba la ficha (`activityOdsMappings`). Suma actividades vinculadas, realizadas, planeadas y asistencias, calcula el peso en lo ejecutado del proyecto y clasifica el aporte. Si la ficha no tiene cifras, pide volver a cargar el Excel.
`src/components/OdsMeterPanel.tsx`: tabla "Medidor ODS del proyecto" al inicio de la pestaña, con las tres metas principales explicadas y el indicador para medir el cambio, o su último valor si ya se mide.
`src/components/MelPanels.tsx`: la lista de vínculos por actividad queda plegada debajo del medidor. Al guardar una aclaración se conservan las cifras de la actividad.

## Evidencia
`npm run test`: 141 pruebas pasan, tres nuevas en `src/lib/ods-meter.test.ts` con datos ficticios
`npx tsc --noEmit` sin errores y `npm run build:static` con salida 0
Recorrido en navegador sobre la compilación estática: cargar un Excel ficticio en la cartera, indicar la vigencia, abrir el proyecto y ver el medidor en "Medición ODS", sin errores de consola

## Límites
Las fichas creadas antes de este cambio no tienen cifras: hay que volver a cargar el Excel de ejecución; no se borran indicadores ni mediciones
El vínculo actividad-meta es el de la ficha existente: una actividad bajo el alcance "Educación ambiental" se vincula también con 4.7 aunque no sea en escuelas, por lo que 12.8 y 4.7 pueden mostrar las mismas cifras
El medidor cuenta contribución en actividades y asistencias; no mide el indicador global ni el avance de la meta en el país
