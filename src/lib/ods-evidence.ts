/** Condiciones de pertinencia: términos genéricos no acreditan un mecanismo de contribución. */
export const ODS_CALIBRATION_VERSION = 1;
export const normalizeOdsText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
export function targetEvidenceSupported(code: string, source: string): boolean {
  const text = normalizeOdsText(source);
  const education = /educa|sensibili|capacit|formacion|conocim|taller|aprendiz/.test(text);
  if (
    /mobiliario|papeleria|reunion administrativa|gestion administrativa|equipos? de computo/.test(
      text,
    ) &&
    !/investigacion cientifica|tecnologia de asistencia/.test(text)
  )
    return false;
  switch (code) {
    case "6.1": {
      const water = /agua potable|potabiliz|agua.*consumo humano|abastecimiento de agua/.test(text);
      const service =
        /instala|constru|abastec|suministr|acceso|operacion|mantenim|puesta.*funcion|verifica.*calidad|analisis.*calidad/.test(
          text,
        );
      return water && service;
    }
    case "6.b":
      return (
        /agua|acueduct|hidric|saneamiento/.test(text) &&
        /comunitari|comite|participaci|gobernanza|autogestion/.test(text)
      );
    case "6.4":
      return (
        /agua|hidric/.test(text) && /eficien|uso racional|ahorro|consumo especifico/.test(text)
      );
    case "6.2":
      return /saneamiento|higiene|letrina|sanitario|lavado de manos/.test(text);
    case "7.1":
      return (
        /electricidad|electrificacion|energia/.test(text) &&
        /acceso|cobertura|conexion|electrificacion/.test(text)
      );
    case "7.3":
      return (
        /energia|energetic|electricidad/.test(text) &&
        /eficien|ahorro|uso racional|consumo especifico|reduc.*consumo/.test(text)
      );
    case "4.7":
      return (
        education &&
        /sostenib|ambient|derechos humanos|igualdad de genero|ciudadania|paz|diversidad cultural/.test(
          text,
        )
      );
    case "12.8":
      return (
        education &&
        /ambient|consumo responsable|consumo sostenible|estilos de vida sostenib|uso racional|cuidado.*recurso|agua|energetic/.test(
          text,
        )
      );
    case "12.5":
      return /residuo|recicl|compost|economia circular|basura|desecho/.test(text);
    case "13.3":
      return education && /clima|climatic/.test(text);
    case "13.1":
      return /clima|climatic/.test(text) && /resilien|adaptaci|riesgo|desastre/.test(text);
    case "5.1":
      return (
        /mujer|nina|genero/.test(text) &&
        /discrimin|barrera|igualdad de genero|equidad de genero/.test(text)
      );
    case "5.2":
      return /violencia/.test(text) && /mujer|nina|genero/.test(text);
    case "5.5":
      return /mujer/.test(text) && /liderazgo|decisio|directiv|representacion politica/.test(text);
    case "15.1":
      return /ecosistema|bosque|biodiversidad|humedal|reforest|restauracion ecologica|conservacion.*natur/.test(
        text,
      );
    case "8.3":
      return /emprend|productiv|negocio|comercializ|productor/.test(text);
    case "16.7":
      return /participacion|fortalecimiento comunitario|organizacion.*social|juntas de accion|veeduria|decision.*comunitari/.test(
        text,
      );
    case "17.17":
      return /alianza|acuerdo|convenio|articulacion institucional/.test(text);
    default:
      return true;
  }
}
