# Estado inicial

Código recuperado del Site Medidor de Indicadores el 5 de noviembre de 2026
Commit de origen 1a4b56f7996eaa42b9d67891791f0e4def5bbb64
Esta copia no contiene la identidad de despliegue del Site y no está vinculada a su publicación
El historial del Site no se incluye en esta copia de trabajo

## Inspección estática confirmada
React 19, TypeScript, TanStack Start, Vite, Vitest, SheetJS, pdfjs y mammoth
src/lib/session.tsx conserva el estado en memoria de React
src/lib/excel-export.ts genera XLSX y dispara descarga con Blob y un enlace temporal
El Excel filtra indicadores aprobados o modificados
Las fórmulas de indicadores se exportan como texto en la implementación inspeccionada
No se ha verificado en navegador la descarga reportada
No se ha completado auditoría de tráfico, dependencias ni privacidad
Las afirmaciones del README de origen requieren contrastarse con esa auditoría

## Preparación realizada
Configuración Node 24, devcontainer, integración continua y comandos de arranque
Instrucciones compartidas AGENTS.md y entrada para Claude
Plan de desarrollo y criterios de aceptación

## Pendiente externo
Repositorio privado de destino inferate-lab/medidor-indicadores
La preparación de código y configuración está incluida en este repositorio
Seleccionarlo en el entorno de Codex y verificar sus permisos
No afirmar que el entorno remoto está creado hasta comprobarlo
