/**
 * Entrada de la versión estática (sin servidor) para publicar en GitHub Pages.
 * La aplicación es una sola página y todo su trabajo ocurre en el navegador,
 * así que se monta directamente la pantalla principal, sin el enrutador.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Route } from "@/routes/index";
import "@/styles.css";

const Page = Route.options.component;
if (!Page) throw new Error("La pantalla principal no está definida.");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
