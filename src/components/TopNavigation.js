import React from "react";
import { NavLink } from "react-router-dom";
import {
  Assignment,
  CalendarMonth,
  Download,
  FactCheck,
  Home,
  ManageAccounts,
  PostAdd,
} from "@mui/icons-material";
import { canRegisterQuestionnaire, isSiteCoordinator, isStudyCoordinator } from "../utils/auth";

const TopNavigation = ({ keycloak }) => {
  const canUseQuestionnaireRegistration = canRegisterQuestionnaire(keycloak);
  const canUseScientificExports = isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak);
  const canUseStudyAudit = isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak);
  const items = [
    { to: "/", label: "Inicio", icon: <Home fontSize="small" />, end: true },
    ...(canUseQuestionnaireRegistration
      ? [{ to: "/questionnaire", label: "Nuevo cuestionario", icon: <PostAdd fontSize="small" /> }]
      : []),
    { to: "/responses", label: "Casos y evaluaciones", icon: <Assignment fontSize="small" /> },
    { to: "/encounters", label: "Citas / encuentros", icon: <CalendarMonth fontSize="small" /> },
    ...(canUseScientificExports
      ? [{ to: "/download", label: "Exportaciones", icon: <Download fontSize="small" /> }]
      : []),
    ...(canUseStudyAudit
      ? [{ to: "/study-audit", label: "Trazabilidad", icon: <FactCheck fontSize="small" /> }]
      : []),
    ...(isSiteCoordinator(keycloak)
      ? [{ to: "/users", label: "Usuarios del centro", icon: <ManageAccounts fontSize="small" /> }]
      : []),
  ];

  return (
    <nav className="top-navigation" aria-label="Navegación principal">
      <div className="top-navigation-inner">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `top-navigation-link${isActive ? " active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default TopNavigation;
