# Medidor de Indicadores

## Alcance
Prototipo de ideación para cooperación internacional, con datos ficticios
Leer README.md, docs/PLAN_DESARROLLO.md y docs/ESTADO_INICIAL.md antes de editar
Conservar las funciones actuales y preferir cambios incrementales
No conectar sistemas institucionales ni utilizar documentos sensibles
No agregar proveedores de IA, autenticación ni telemetría sin un encargo específico
No desplegar ni sincronizar con el Site de origen durante esta etapa

## Entorno
Node.js 24 y npm, con package-lock.json como fuente reproducible
Preparar con bash scripts/setup-dev.sh
Desarrollo con npm run dev -- --host 127.0.0.1 --port 5173
Verificar con npm run check
Separar cualquier error preexistente de las regresiones introducidas

## Arquitectura
Conservar React, TypeScript y TanStack salvo evidencia documentada que justifique cambiar
Separar interfaz, reglas, cálculos, catálogos e importación y exportación
La clasificación institucional es independiente del nivel causal
Usar identificadores estables y esquemas de intercambio versionados
No ejecutar expresiones del usuario mediante eval o Function

## Integridad metodológica
Ausencia de datos se representa con null, nunca con cero automático
No inventar metas, líneas base, fuentes ni relaciones causales
Distinguir actividades, productos, resultados e impacto
Una reducción puede ser favorable según definición y evidencia
Distinguir egreso exitoso, abandono y pérdida de seguimiento
No sumar existencias ni porcentajes sin una regla de agregación documentada
Cada hallazgo debe identificar regla, evidencia y explicación
La revisión automática apoya la decisión humana
Conservar excepciones justificadas y el hallazgo original
No cambiar textos oficiales de metas ODS para justificar una asociación

## Forma de trabajar
Una rama por fase y commits acotados
Ejecutar pruebas relevantes y compilación antes de entregar
No afirmar que una descarga o flujo de navegador funciona sin comprobarlo
No guardar archivos cargados por usuarios en Git
Actualizar docs/ESTADO_INICIAL.md o crear un reporte por fase con evidencia
No afirmar que hay habilidades instaladas sin verificar su disponibilidad
