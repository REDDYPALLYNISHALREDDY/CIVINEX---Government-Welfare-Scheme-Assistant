
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./theme.css";
import App from "./App.tsx";
import "./i18n";

try {
  const savedTheme = localStorage.getItem("civinex_theme");
  document.documentElement.dataset.theme =
    savedTheme === "dark" ? "dark" : "light";
  document.documentElement.style.colorScheme =
    savedTheme === "dark" ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
