# Plan de desarrollo

## Objetivo
Preparar un prototipo portable de diseño y seguimiento de indicadores con información ficticia
La conexión con la Fundación, Copilot y Excel institucional queda fuera de esta etapa

| Fase | Trabajo | Aceptación |
| --- | --- | --- |
| 0 | Diagnóstico de código, red, extracción y descarga | Hallazgos reproducibles, inventario y resultados de pruebas |
| 1 | Modelo versionado de proyecto, resultado, indicador, clasificación y observación | Identificadores estables, null conservado y validación de entrada |
| 2 | Clasificación institucional configurable | Un indicador puede pertenecer a varios instrumentos y mantener un nivel causal independiente |
| 3 | Fichas y plan de medición | Definición, unidad, fórmula, variables, fuente, responsable, línea base, metas y fechas editables |
| 4 | Reglas explicables y orientación | Aumento, disminución, mantenimiento y rango con condiciones de éxito y excepciones justificadas |
| 5 | Cronograma y seguimiento | Metas por periodo, observaciones, fuentes y agregación compatible con el indicador |
| 6 | Importación y exportación | XLSX real, vista previa, mapeo de columnas, conflictos y fórmulas operativas permitidas |
| 7 | Intercambio y pruebas de aceptación | Exportación e importación JSON versionado sin pérdidas y recorrido completo verificable |

## Modelo de datos objetivo
Proyecto, instrumento institucional, resultado, indicador, clasificación, plan de medición, observación, relación ODS y revisión
No reemplazar los tipos existentes sin analizar compatibilidad
Cada indicador tendrá ID interno y código institucional independientes
La clasificación institucional conservará las denominaciones configuradas por el usuario
Códigos institucionales de demostración deben marcarse como ficticios

## Criterios metodológicos
Faltante distinto de cero
Actividades y cobertura no prueban impacto
Relación ODS con meta específica y justificación revisable
Sentido favorable separado de tendencia observada
Distinguir valores de periodo, acumulados, existencias y cohortes
Definir tratamiento de denominadores cero, línea base igual a meta y resultados negativos
No imponer una única fórmula de avance a todos los indicadores
Los hallazgos causales requieren juicio humano
Conservar versión de regla, campos revisados, explicación y decisión

## Casos de aceptación ficticios
Aumento de aprendizaje con medición comparable
Disminución de necesidad de acompañamiento con egreso exitoso y abandono separados
Valor dentro de un rango y mantenimiento con tolerancia definida
Línea base ausente, cero explícito, denominador cero y meta igual a línea base
Importación repetida con conflictos y sin duplicación silenciosa
Excel que abre con datos y fórmulas, con protección frente a inyección de fórmulas en textos
Proyecto recuperable mediante JSON versionado
Navegación con teclado, pantallas pequeñas y errores vinculados a sus campos
Comprobación de red con documentos ficticios antes de afirmar procesamiento exclusivamente local

## Capacidades a utilizar
Revisión de marco lógico y MEAL basada en reglas documentadas
Diseño de datos, unidades, fuentes y comparabilidad
Desarrollo React y TypeScript incremental
Pruebas de XLSX con SheetJS y Vitest
Pruebas de navegador cuando el entorno las permita
Las habilidades de formulación y hojas de cálculo deben usarse si están disponibles
Si no existen, aplicar estas especificaciones y documentar el límite
No instalar ni copiar habilidades privadas automáticamente

## Entregas
Una rama por fase, código, pruebas, instrucciones y limitaciones
La publicación requiere un encargo posterior
