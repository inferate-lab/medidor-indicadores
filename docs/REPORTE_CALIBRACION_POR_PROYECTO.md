# Calibración y medidores por proyecto

- Cada ficha identifica explícitamente su propio medidor y sus ODS. Las observaciones, teoría del cambio y marco lógico siguen vinculados al identificador del proyecto.
- Se comparte la validación de evidencia entre los motores de propuestas y la matriz de actividades. Filtros fotográficos, mantenimiento eléctrico y visitas a plantas no justifican acceso a agua potable. Las reglas distinguen acceso, educación, eficiencia, saneamiento, participación y género.
- El catálogo conserva los 17 objetivos y 169 metas. Las reglas de asociación cubren objetivos diversos, pero no constituyen comprensión semántica universal ni cubren automáticamente todas las metas.
- Las propuestas generadas tienen versión y texto de origen. Al abrir un proyecto se renuevan las propuestas antiguas; se conservan indicadores adoptados, mediciones, correcciones y edición manual de la teoría. Un resultado asíncrono de otro proyecto se rechaza y uno basado en una descripción anterior no se aplica.
- Las asociaciones guardadas sin evidencia actual en las actividades se conservan en una sección de revisión. No se borran registros ni se presentan como contribución demostrada.
- Las descargas ODS incluyen el nombre del proyecto.

## Validación

`npm run check`: 12 archivos, 139 pruebas aprobadas, compilación aprobada con el Excel del usuario mediante MEDIDOR_WORKBOOK. TypeScript sin emisión y compilación estática para /medidor-indicadores/ aprobadas. Regresión adicional con indicador y observación no vacíos aprobada.

Navegador Chromium: Excel real (10 proyectos), actividades con hoja y fila, Afinia sin asignación arbitraria, aclaración individual hacia 7.3 y 12.8, registro de valor 50 con evidencia, descarga XLSX, proyecto nuevo con actividades independientes 6.1/6.2/5.5/5.2 y administración sin asignación. Persistencia tras recarga, vista móvil sin desborde y cero errores de página.

Auditoría del consolidado: Hidrofonías deja de sugerir 6.1 por visitas pedagógicas; T&D no recibe propuestas de agua potable. Los proyectos con instalaciones de agua conservan sus vínculos pertinentes.

## Límite documental

La consulta directa solicitada a https://www.un.org/sustainabledevelopment/es/sustainable-development-goals/ y dominios oficiales relacionados recibió CONNECT 403 por la política de destinos del entorno. Se guardó una propuesta de configuración de red para revisión; no está aplicada. El README público del repositorio oficial UNStats/SDG se pudo consultar y confirma la distinción entre 17 objetivos, 169 metas e indicadores globales, pero no sustituye la revisión completa de las metas y metodología solicitada. No se afirma una nueva certificación ni actualización documental ONU en esta fase.
