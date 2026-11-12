# Medición e indicadores desde el consolidado de ejecución

## Cambio

El segundo apartado permite cargar un Excel de ejecución, elegir un proyecto y revisar primero lo que ya puede calcularse. Reutiliza el lector del seguimiento mensual y separa las hojas auxiliares para evitar duplicaciones. El seguimiento original permanece accesible.

Para cada proyecto se generan fichas sugeridas con nivel causal, fórmula, datos necesarios, instrumento, frecuencia, evidencia de hoja/fila y metas ODS desplegables con texto oficial. El análisis usa objeto, objetivo, alcances y actividades del proyecto seleccionado; excluye actividades suprimidas. No incorpora contratos, nombres de responsables ni hojas financieras a la descripción analizada.

Los indicadores concretados de acceso a agua potable se vinculan con 6.1. Uso eficiente se vincula con 6.4 y aprendizaje ambiental con 12.8. Se añaden participación de mujeres y niñas (relación indirecta con 5.1, por revisar) y liderazgo de mujeres (5.5 cuando el proyecto menciona decisiones o liderazgo). Contar participantes no demuestra igualdad ni mide el indicador global 5.1.1. Las relaciones son sugerencias para revisión humana.

Las proporciones pueden calcularse con cifras explícitas del mismo periodo. Los campos vacíos y denominadores cero no producen resultados. Este cálculo es temporal: la descarga contiene medición del plan y fichas sugeridas, sin aprobar metas.

La descarga XLSX separa medición actual, indicadores sugeridos y metas ODS. Neutraliza fórmulas en textos. El flujo de documentos anterior queda disponible como opción avanzada y admite también extracción de Excel/CSV con coordenadas de origen.

## Evidencia de validación

- Archivo aportado: 10 planes de proyecto reconocidos; generación de fichas verificada para todos, sin incorporar el archivo a Git.
- 77 pruebas aprobadas, incluyendo lectura XLSX, cero/faltantes, proporciones, separación de proyectos, agua 6.1 y género 5.1/5.5.
- `npm run check`, `tsc --noEmit` y compilación estática con base `/medidor-indicadores/` completados.
- Chromium/Playwright: cargar el archivo, reconocer 10 proyectos, seleccionar uno, generar 12 fichas, encontrar 6.1, descargar y releer el XLSX. Sin errores de página. Vista móvil de 390 px sin desborde horizontal. Acceso al seguimiento original comprobado. El mismo recorrido pasó en la compilación estática servida con base `/medidor-indicadores/`.

## Límites

El motor es local y se basa en reglas y catálogos; no es una interpretación semántica ilimitada ni utiliza servicios de IA. Reconoce el formato mensual documentado; formatos distintos necesitan adaptación. El lector conserva el criterio existente de inferir el corte por el último mes con ejecución positiva: debe revisarse ante meses sin ejecución o periodos incompletos. Asistencias no equivalen a personas únicas ni prueban impacto. No se inventan resultados, líneas base o metas. Los cálculos manuales no se guardan al recargar.

No se desplegó ni se publicó el sitio. Los cambios corresponden a la rama local `feat/excel-indicadores-ods`.
