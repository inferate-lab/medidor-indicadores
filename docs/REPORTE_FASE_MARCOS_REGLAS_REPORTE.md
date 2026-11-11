# Reporte de fase: marcos, reglas ajustables, teoría de cambio y reporte periódico

Rama `claude/marcos-reglas-reporte`, 11 de noviembre de 2026
Cubre la fase 2 y la fase 4 del plan, y adelanta piezas de las fases 5 y 6 como lógica pura sin interfaz

## Entregado
Fase 2: catálogo editable de marcos de la fundación; un indicador puede pertenecer a varios marcos con nivel causal independiente y código institucional propio
Fase 4: sentido de éxito por indicador (aumentar, disminuir, mantenerse, rango) con justificación obligatoria; reglas del marco lógico con mínimos ajustables y exenciones justificadas que conservan el hallazgo
Teoría de cambio: recursos, un supuesto por enlace causal que la aplicación no inventa, alerta de resultados que describen entregas y revisión SMART por criterio sin puntaje
Fase 5 (parcial): tipos y transiciones de reporte por periodo, permisos por rol con segregación de funciones, versiones por envío y avance según el sentido de éxito
Fase 6 (parcial): hoja "Plantilla de reporte" en el Excel e importación por código institucional con errores por fila

## Evidencia
`npm run test`: 51 pruebas en 2 archivos, todas pasan
`npx tsc --noEmit` sin errores y `npm run build` con salida 0
Recorrido en navegador con el proyecto de demostración: paso de marcos, clasificación por indicador, sentido de éxito descendente, panel de reglas, supuestos por enlace y etiquetas SMART

## Límites
La descarga del Excel no se abrió en un programa de hojas de cálculo; su contenido se comprobó solo por pruebas
El flujo de reporte y la importación no tienen pantalla ni persistencia; los roles son lógica, no autenticación
La trazabilidad SMART entre indicador y cadena causal es una coincidencia de vocabulario, no una prueba
La clasificación sugerida por nivel causal es un punto de partida editable, no la codificación real de la fundación
`npm run lint` falla por finales de línea y por un error previo en `src/lib/doc-extract.ts`, ambos anteriores a esta fase
El catálogo de marcos y las reglas no sobreviven a una recarga de la página

## Fuentes consultadas
Los repositorios externos revisados (ICARDA IA-Reporting-Tool-in-MEL, ICARDA M-QAP-API y toolkit-teoria-de-cambio) no tienen licencia de uso
No se copió código, texto, preguntas ni umbrales de ninguno; solo se implementaron patrones generales con diseño propio
