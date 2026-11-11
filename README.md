# Medidor de Indicadores · Entorno de ideación

Copia del código fuente existente preparada para desarrollo con Work, Codex y Claude
Usar exclusivamente datos ficticios durante la ideación

## Inicio

Requiere Node.js 24 y npm

```bash
bash scripts/setup-dev.sh
npm run dev -- --host 127.0.0.1 --port 5173
```

Abrir http://localhost:5173
El script instala las versiones del lockfile, ejecuta pruebas y compila
No requiere claves de servicios de IA
Si falla una operación, conservar el error y revisar antes de continuar

## Comandos

| Comando | Función |
| --- | --- |
| npm ci | Instalar dependencias reproducibles |
| npm run dev -- --host 127.0.0.1 --port 5173 | Entorno de desarrollo |
| npm run test | Pruebas existentes |
| npm run build | Compilación |
| npm run check | Pruebas y compilación |
| npm run preview -- --host 0.0.0.0 --port 5173 | Vista previa de compilación |

## Codex y Work

Guardar este proyecto en un repositorio privado
Abrir el repositorio desde el entorno de trabajo disponible en la cuenta
Para configurar Codex Cloud, seleccionar el repositorio y usar bash scripts/setup-dev.sh como preparación cuando el entorno solicite un comando
No hay una vinculación automática entre este paquete y un entorno remoto de Codex
No introducir secretos en los archivos de configuración

## Claude

Claude debe abrir el mismo repositorio y leer CLAUDE.md y AGENTS.md
La primera tarea está en docs/ARRANQUE_CLAUDE.md
Trabajar mediante ramas por fase y pull requests

## GitHub

Si se descarga este paquete, crear un repositorio privado vacío y ejecutar desde la carpeta extraída

```bash
git init -b main
git add .
git commit -m "Preparar entorno de ideación del medidor"
git remote add origin https://github.com/TU_USUARIO/medidor-indicadores.git
git push -u origin main
git switch -c develop
git push -u origin develop
```

Sustituir TU_USUARIO por la cuenta propietaria
No ejecutar git init si ya se está trabajando dentro de un repositorio clonado
GitHub Actions ejecuta npm run check cuando se sube main o develop o se abre un pull request
Su ejecución remota no se ha comprobado hasta subir el proyecto

## Documentación

- docs/PLAN_DESARROLLO.md describe fases y aceptación
- docs/ESTADO_INICIAL.md distingue lo confirmado de lo pendiente
- docs/ARRANQUE_CLAUDE.md contiene la primera tarea
- docs/VERIFICACION_ENTORNO.md contiene resultados locales

## Límite de esta entrega

Se conserva la lógica de la aplicación original
La clasificación institucional, seguimiento periódico y demás mejoras continúan como trabajo planificado
El Site original no se modifica y esta copia no contiene su configuración de publicación

## Marcos de la fundación y reglas ajustables

- El paso 1 define los marcos institucionales (Cuadro de mando integral, Plan de Acción, Seguimiento a la gestión, Teoría del cambio u otros). El catálogo es editable y cada indicador puede pertenecer a varios marcos.
- Cada indicador admite un código de la fundación y un sentido de éxito: aumentar, disminuir, mantenerse o permanecer en un rango. Un sentido distinto de aumentar exige una justificación escrita.
- Las reglas del marco lógico viven en `src/lib/framework-rules.ts`. Cada proyecto puede cambiar los mínimos o dejar de aplicar una regla con justificación; el Excel registra las reglas aplicadas.

## Teoría de cambio y revisión SMART

- La cadena causal pide un supuesto por cada enlace (actividades a productos, productos a resultados, resultados a impacto). La aplicación no los inventa: los vacíos quedan como pendientes.
- `src/lib/smart-rules.ts` revisa cada indicador definitivo por criterio SMART, sin puntaje, y señala resultados que parecen describir entregas.

## Flujo de reporte periódico (sin interfaz todavía)

- `src/types/reporting.ts` y `src/lib/reporting-workflow.ts` definen reportes por periodo, permisos por rol con segregación de funciones, transiciones validadas (borrador, enviado, en revisión, devuelto, aprobado, reabierto), versiones y avance según el sentido de éxito.
- Son funciones puras con pruebas. Conectarlas a pantallas requiere persistencia y autenticación en servidor.

## Plantilla de reporte e importación desde Excel

- El Excel exportado incluye la hoja "Plantilla de reporte", con una fila por indicador seleccionado. `src/lib/excel-import.ts` la lee diligenciada usando el código de la fundación como llave.
- La importación no corrige en silencio: un vacío no es cero, un cero debe confirmarse, los códigos duplicados o desconocidos se rechazan y cada problema indica su fila.
- El marco lógico se evalúa con los indicadores seleccionados en cuanto existe alguno, y no exige indicadores ni supuestos de impacto cuando la teoría de cambio no define impacto.

## Monitoreo de proyectos en ejecución

- La pantalla inicial recibe el Excel de ejecución (una hoja de plan de acción por proyecto) y lo lee en el navegador, sin subirlo ni guardarlo.
- Por proyecto muestra lo hecho frente a lo planeado, el avance mensual, las asistencias y una señal por actividad (mejor desempeño, para revisar, sin ejecución registrada) con sus cifras.
- Propone los indicadores que faltan, una meta ODS por tema, referencias del catálogo del BID y un borrador de teoría de cambio y marco lógico. Lo que no sale de una cifra del Excel se rotula como sugerencia o hipótesis.
- El botón "Ver un ejemplo ficticio" carga datos inventados con el mismo formato. Detalle en `docs/REPORTE_FASE_MONITOR_EJECUCION.md`.
