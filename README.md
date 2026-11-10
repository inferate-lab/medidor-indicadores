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
