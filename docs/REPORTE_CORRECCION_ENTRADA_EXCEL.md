# Corrección de la entrada de Excel

La entrada superior de la cartera solo aceptaba la hoja `Mediciones`. Al cargar el consolidado habitual mostraba «Falta la hoja Mediciones de la plantilla», aunque ese archivo era válido para el lector de proyectos del apartado siguiente.

El botón ahora se llama **Cargar Excel de proyectos o mediciones** y clasifica el archivo por contenido. Un consolidado reconocido pasa al flujo de vigencia y creación de seguimiento sin modificar automáticamente la cartera. Una plantilla conserva las validaciones de proyecto, indicador, periodo, cero explícito, evidencia y duplicados. Los archivos desconocidos reciben instrucciones concretas sobre ambos formatos admitidos. No se requiere renombrar hojas del consolidado.

Validación: 88 pruebas aprobadas y 1 prueba optativa con archivo externo omitida en la suite; TypeScript y ambas compilaciones completados. En Chromium sobre la compilación estática se cargó el archivo de trabajo por la entrada superior, se reconocieron sus 10 proyectos, se crearon las fichas y se importó una medición desde la misma entrada. Una segunda importación duplicada fue rechazada sin alterar la cartera. Sin errores de página. El archivo del usuario no se incorpora a Git.
