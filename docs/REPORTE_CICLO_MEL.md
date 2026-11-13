# Mejora del ciclo MEL y de la entrada de proyectos

## Diagnóstico

El diagnóstico previo está en `ANALISIS_MEL_Y_USABILIDAD.md`. La captura correspondía a un cargador documental que recorría todas las hojas del Excel: el parche de la entrada de cartera no cubría esa ruta. Había además flujos desconectados para diseñar, medir y documentar decisiones.

## Cambios

- La cartera abre como pantalla principal. Explica si está vacía o si restaura datos guardados en este equipo; no añade ejemplos automáticamente.
- Se crean proyectos independientes desde nombre y descripción, sin depender de un Excel particular. Sus indicadores se pueden registrar o sugerir desde la descripción del propio proyecto.
- El cargador documental, el de cartera y el de sugerencias usan la misma entrada de Excel/CSV. Un consolidado conocido se interpreta por proyectos. Para otros formatos se elige una hoja, se conservan coordenadas y se revisa la descripción. Una hoja extensa muestra explícitamente un aviso de lectura parcial; no se mezcla el libro completo ni se afirma interpretar un formato arbitrario como mediciones estructuradas.
- Se puede eliminar un proyecto o empezar de cero. La confirmación distingue ambos alcances y permite descargar un respaldo antes del borrado. La cancelación no cambia datos. El reinicio limpia cartera y estados temporales, manteniéndose vacío al recargar.
- Un diseño documental puede incorporarse a una ficha de seguimiento; sus sugerencias no se convierten en mediciones realizadas ni reciben metas numéricas inventadas.
- La vista Medición ODS organiza metas oficiales, indicadores locales, fórmula, justificación, línea base, meta, periodo, valor observado y fuente. Identifica ODS declarados sin indicadores vinculados. No calcula un porcentaje agregado de cumplimiento de un ODS.
- Evaluación y aprendizaje registra hallazgos, límites, decisiones, responsables, plazo y cierre con evidencia. Cada hallazgo se vincula al indicador, periodo y revisión del dato que se evaluó. Las correcciones posteriores conservan esa referencia. La ficha descargable incluye las decisiones y aprendizajes.

## Persistencia y límites

Los respaldos anteriores se leen con campos nuevos por defecto, sin perder mediciones. Se conservan el almacenamiento local y el respaldo versionado; no hay sincronización ni autenticación entre personas. El motor continúa basado en reglas y revisión humana. No evalúa causalidad, calidad de fuentes ni elegibilidad ante un donante de manera automática. Los indicadores locales no sustituyen las metodologías oficiales ODS.

## Evidencia

- 95 pruebas aprobadas, incluidas las comprobaciones con el archivo de trabajo, compatibilidad de respaldos, medición ODS por periodo, proyectos independientes, vínculo de aprendizaje con revisión y selección de hojas extensas.
- TypeScript, compilación normal y estática completados.
- Chromium: recorrido de la captura con el Excel grande en el cargador documental y reconocimiento de 10 proyectos; cancelar borrado, reiniciar, recargar y comprobar cartera vacía; crear otro proyecto; registrar medición con valor 10, base 0 y meta 20; consultar meta 6.1 y avance local del 50% con evidencia; guardar y cerrar acción de aprendizaje; recuperar todo al recargar; leer solo una hoja de otro Excel y eliminar ese proyecto sin alterar el primero. Sin errores de página ni desborde horizontal en móvil.

Los archivos del usuario no se incorporan al repositorio.
