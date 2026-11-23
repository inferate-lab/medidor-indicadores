# Sugerencias de medición según la intervención

## Cambio

El motor compartido de diseño ahora identifica intervenciones en el texto fuente: formación, equipamiento, infraestructura/servicios, fortalecimiento comunitario, prácticas ambientales, desarrollo productivo, salud e investigación. Un proyecto puede contener varias. La identificación muestra fragmentos concretos y avisa cuando no hay una intervención reconocible. Los nombres comerciales no activan clasificaciones.

La nueva batería prioriza preguntas de decisión, no solo asociaciones ODS. Para equipamiento educativo incluye costo total durante el horizonte definido, comparación con alternativas, aulas distintas por kit, disponibilidad, aprendizaje con mediciones inicial/final y horas hasta autonomía docente cuando se mencionan docentes. Comparación y réplica tienen condiciones explícitas de aplicación. Otros proyectos reciben resultados como implementación de decisiones comunitarias, continuidad de atención, acceso efectivo a servicios, margen productivo o validación de prototipos.

Cada propuesta contiene fórmula, unidad, instrumento, periodicidad, justificación, evidencia documental, datos necesarios y límites de interpretación. No se generan cotizaciones, resultados, líneas base o metas ficticias. Los costos no reciben ODS decorativos; se preservan las rutas temáticas justificadas del motor anterior. La batería sigue limitada a doce indicadores; las propuestas de intervención preceden a los indicadores generales y conservan un producto y el impacto sectorial propuesto. Los metadatos y las referencias de aprendizaje existentes se mantienen al mejorar su medición.

## Uso y persistencia

En la ficha de cada proyecto aparece «Qué hace este proyecto y qué conviene evaluar». Las sugerencias permiten revisar el texto que las sustenta y los datos necesarios, incorporarlas y registrar observaciones con evidencia mediante el medidor existente. El mismo motor alimenta las sugerencias desde documentos y Excel.

Los respaldos incorporan justificación, evidencia, datos necesarios y límites, con valores predeterminados compatibles con respaldos previos. La orientación del indicador se conserva al adoptarlo. Los costos y horas no se interpretan como mejores solo por disminuir: se exige acordar un rango y conservar calidad y resultados.

La versión de propuestas generadas sube a 3 para renovar sugerencias antiguas al abrir cada proyecto. Indicadores adoptados, observaciones y ediciones manuales se conservan. Se integraron primero los cambios remotos de main (c7e85e0), incluido el medidor ODS en cada ficha.

## Validación

- `npm run check`: pruebas y compilación aprobadas; TypeScript sin emisión y compilación estática de Pages aprobadas.
- Con MEDIDOR_WORKBOOK y el archivo original: 14 archivos, 153 pruebas aprobadas.
- Nuevas regresiones: independencia del nombre ROVI; proyectos mixtos; seis familias distintas sin indicadores de aulas/docencia; formación sobre potabilización no equivale a acceso al servicio; equipo humano no equivale a dotación; exclusiones explícitas; incertidumbre institucional genérica; comparabilidad de costos; datos faltantes; adopción y registro de un costo sin mezcla entre proyectos; persistencia de explicación y orientación.
- Chromium sobre la compilación estática: creación de un proyecto de kit, identificación de intervenciones, sugerencias de costos/alternativas/aulas/docencia/aprendizaje, consulta de evidencia y datos necesarios, adopción y registro de valor de prueba 850000 con fuente; creación de proyecto comunitario con decisiones implementadas sin sugerencias de kits; recarga conserva observaciones; vista móvil sin desborde; cero errores de página.

## Límites

Es una identificación transparente mediante reglas y familias de intervenciones, no comprensión semántica universal. Las exclusiones y sinónimos no constituyen un analizador exhaustivo de lenguaje natural. Las sugerencias requieren revisión del contexto, de la unidad de seguimiento y de la factibilidad de recoger datos. Los valores calculados fuera de la plataforma deben sustentarse en registros; la herramienta no obtiene precios externos ni prueba causalidad. No se añadió proveedor de IA ni se enviaron documentos del usuario a servicios externos.
