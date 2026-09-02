import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import AccepterInvitationAdministrateur from "./modules/auth/AccepterInvitationAdministrateur.jsx";

const chemin = window.location.pathname;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {chemin === "/accepter-invitation" ? (
      <AccepterInvitationAdministrateur />
    ) : (
      <App />
    )}
  </StrictMode>
);