# Vinculación ODS por actividad

## Corrección

La vista Medición ODS dependía de que se incorporara manualmente un indicador a seguimiento. Por ello podía verse vacía aun con datos de proyecto. Se añadió una matriz automática por actividad y una síntesis por meta, separando propuestas sin medición de indicadores ya registrados.

La asociación usa la actividad, su alcance y cualquier aclaración registrada. Para planes de ejecución conserva hoja y fila. Las carteras anteriores sin esas referencias usan fragmentos identificados como texto por revisar; recargar un consolidado completa las referencias faltantes de proyectos coincidentes sin modificar observaciones. Un fragmento de otra actividad o un borrador de cooperación no se usa como evidencia de esta actividad.

Se mantiene la nomenclatura ONU: objetivo, meta específica (sub-ODS, como término explicativo de interfaz) e indicador global. Se muestran nombre del objetivo, código y texto de la meta del catálogo, códigos globales, justificación textual, indicador local propuesto y enlaces oficiales. El texto normativo de las metas no se reformula para justificar el vínculo.

Ejemplos: agua potable 6.1; saneamiento e higiene 6.2; discriminación de mujeres y niñas 5.1 cuando el contenido lo sustenta; violencia contra mujeres y niñas 5.2; liderazgo de mujeres 5.5. La mención aislada de mujeres, de una empresa de energía o de una charla no permite asignar esas metas. El uso eficiente del agua no se vincula automáticamente con eficiencia energética. Los asuntos administrativos no reciben metas por heredar un tema del proyecto.

Cuando falta contenido se muestra Sin una meta sustentada y se permite aclarar esa actividad, preservando el texto original del Excel. Los vínculos se recalculan para ella. Los códigos propuestos corresponden a metas reales del catálogo; la asociación temática sigue siendo una propuesta que requiere comprobar el mecanismo de contribución. No demuestra logro del ODS.

Las reglas incluyen temas de los 17 objetivos, pero no constituyen comprensión semántica ilimitada ni cubren toda redacción posible. No se presenta una regla de palabras como validación oficial de Naciones Unidas.

## Medición y entrega

La síntesis reúne propuestas y registros existentes. Cada indicador conserva su unidad, base, meta local, periodo y fuente. Se puede pasar de una propuesta a su configuración y registro sin asignar un valor ficticio. No se calcula un porcentaje agregado de cumplimiento del ODS. Se explican las diferencias entre el proxy local y referencias globales como 7.3.1 y 12.8.1.

La descarga XLSX contiene una fila por actividad/meta, el texto de la meta, códigos globales, justificación, referencia de origen y enlaces. Incluye actividades sin asignación con el pendiente por aclarar.

## Fuentes y límite de verificación

El catálogo local contiene 17 objetivos y 169 metas. Se conserva su texto, y se enlazan:

- Marco global: https://unstats.un.org/sdgs/indicators/indicators-list/
- Repositorio de metadatos: https://unstats.un.org/sdgs/metadata/
- Páginas de objetivos y metas: https://sdgs.un.org/goals/

Las solicitudes a unstats.un.org y sdgs.un.org fueron bloqueadas por la política de red del entorno (CONNECT 403). No se verificó en línea una revisión reciente de metadatos. Se retiró de la etiqueta de versión la afirmación no contrastada «revisión 2026» y se identifica el catálogo como local. La alineación debe contrastarse con los metadatos vigentes antes de afirmar equivalencia con un indicador global.

## Validación

- 119 pruebas aprobadas después de integrar los cambios recientes de rutas ODS del repositorio, incluida la lectura del archivo de trabajo y casos de correspondencia por actividad, independencia entre filas, agua/energía, género, ambigüedad, aclaraciones, códigos oficiales, referencias, periodos, cero explícito y exportación.
- TypeScript y compilaciones normal/estática completados.
- Chromium con el archivo de trabajo: Afinia muestra actividades y referencias de origen, sin forzar una meta en charlas sin contenido; aclarar una actividad de consumo responsable y eficiencia energética propone 12.8 y 7.3 solo para ella; registrar su medición y releer el XLSX con la fila original.
- Proyecto nuevo: cinco actividades separadas, con 6.1, 6.2, 5.5 y 5.2 en sus respectivas filas; actividad administrativa sin asignación. Aclaración y medición conservadas tras recargar. Sin errores de página ni desborde móvil.

No se incorpora el archivo del usuario a Git.
