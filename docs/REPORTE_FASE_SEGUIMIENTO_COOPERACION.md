# Seguimiento por proyecto y preparación para cooperación

## Flujo implementado

Una cartera conserva proyectos independientes. Al cargar el consolidado se indica explícitamente la vigencia de los planes y se crean sus fichas de seguimiento. El lector existente sigue separando alcances, actividades, hojas auxiliares y datos financieros. Los proyectos ya incorporados no se vuelven a crear ni se sustituyen al recargar el consolidado.

Se importan series mensuales de ejecución y asistencias, con valor observado, planeado y evidencia de hoja, filas y cobertura. El cero escrito en el Excel se conserva; una celda vacía no se convierte en cero. Los porcentajes de ejecución comparan exclusivamente el valor con lo planeado en el mismo periodo. No se suman porcentajes ni se interpreta asistencia como personas únicas o impacto.

Cada sugerencia puede incorporarse al proyecto correspondiente. Se pueden registrar indicadores propios con código, nivel causal, definición, unidad, sentido de éxito, línea base, fundamento de meta, fecha, fuente, instrumento, frecuencia, responsable y metas ODS. Cambiar la unidad o fórmula de una serie con historial requiere crear otro indicador, para conservar comparabilidad.

Las mediciones por mes requieren evidencia o motivo de ausencia. El cero manual necesita confirmación explícita. Una corrección agrega una revisión con nota y conserva la anterior. La ficha muestra el historial, el estado de todos los indicadores y una revisión por periodo. El avance de resultados respeta aumento, disminución y rango; sin referencia comparable no produce un porcentaje ficticio.

## Cooperación y réplica

La ficha de cooperación documenta problema y evidencia, población, territorio, mecanismo causal, unidad replicable, método, adaptación territorial, capacidades, alianzas, costos, continuidad, riesgos y salvaguardas. Se puede descargar en Markdown junto con las mediciones más recientes y brechas identificadas.

Las reglas identifican ejecución sin indicadores de resultado, ausencia de mediciones y fichas incompletas. Cada hallazgo muestra regla, evidencia y acción. Es un diagnóstico interno de preparación: no mide elegibilidad frente a un donante ni garantiza financiación, sostenibilidad o impacto. No inventa los datos necesarios para completar la propuesta.

Se aplicaron criterios de la habilidad `grant-writer-es` sobre outputs y outcomes, MEAL, contribución, sostenibilidad y unidad mínima replicable. No se consultó ni se postuló a una convocatoria.

## Guardado y portabilidad

El guardado automático usa el almacenamiento local del navegador, con estado visible si no se puede escribir. Se puede descargar y abrir un respaldo JSON versionado. Al abrir una copia se muestra el alcance de sustitución y se descarga un respaldo de la cartera anterior antes de sustituirla. Un archivo inválido no modifica la cartera. La descarga de plantilla XLSX permite cargar mediciones por proyecto e indicador con validación transaccional: un error no deja una importación parcial.

Los identificadores estables, el esquema versionado y las reglas separadas de la interfaz facilitan una futura migración a servidor. Esta entrega es para una persona: no incorpora autenticación, sincronización, permisos entre personas ni resolución de conflictos de edición. Las revisiones locales no son una auditoría autenticada. Los archivos originales no se guardan en Git ni se envían a un servicio externo.

## Validación

- 84 pruebas aprobadas, incluyendo la lectura del archivo de trabajo y pruebas de portabilidad, duplicados, ausencias/cero, correcciones, disminución/rango, adopción de sugerencias, brechas, importación transaccional y protección de unidades históricas.
- `npm run check`, TypeScript sin emisión y compilación estática con base `/medidor-indicadores/` completados.
- Chromium: creación de seguimiento de los 10 proyectos del archivo, incorporación de una sugerencia al proyecto correcto, indicador propio, medición y corrección (50% a 60% del cambio hacia la meta), conservación de dos revisiones, ficha descargable con evidencia, recarga y restauración íntegra del respaldo en un navegador nuevo. Comprobación en desarrollo y versión estática; sin errores de página ni desborde de la cartera en móvil.

No se desplegó, publicó ni subió el código al repositorio remoto. Los cambios permanecen en el checkout local.
