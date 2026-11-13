# Diagnóstico previo de MEL y usabilidad

La inspección del código y la captura del usuario confirman:

| Hallazgo | Evidencia | Corrección prevista |
| --- | --- | --- |
| Excel tratado de dos formas | El cargador de documentos serializa todas las hojas y falla a 120.000 caracteres; la cartera usa un lector estructurado | Encauzar los Excel hacia una sola entrada y seleccionar hoja para formatos distintos |
| Sesiones aparentemente precargadas | localStorage restaura cartera, sin opción de vaciarla ni explicar su origen | Estado vacío claro, borrado por proyecto y reinicio con alcance explícito |
| Otros proyectos sin entrada directa | Solo se crean fichas desde el formato mensual conocido | Crear proyectos con nombre y descripción, con sugerencias propias |
| ODS sin lectura de medición | La ficha guarda códigos, sin vista por meta de datos, referencia y evidencia | Relacionar cada meta con indicadores locales, periodos, línea base, meta y fuente |
| Dos flujos desconectados | El diseño documental termina en una sesión distinta de la cartera | Permitir incorporar ese diseño a una ficha de seguimiento |
| Aprendizaje sin registro | Valores e historial, pero no hallazgos, decisiones ni acciones revisables | Registro de evaluación/aprendizaje ligado a indicador y periodo |

Criterios: no sumar porcentajes ni avances ODS heterogéneos; no equiparar ejecución con resultados; señalar datos faltantes y asociaciones por revisar; mantener respaldos anteriores legibles; no insertar proyectos de ejemplo automáticamente. Los datos originales no se incluyen en Git.
