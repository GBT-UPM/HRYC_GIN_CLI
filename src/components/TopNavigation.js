import React from "react";
import { NavLink } from "react-router-dom";
import {
  Assignment,
  CalendarMonth,
  Download,
  Home,
  PeopleAlt,
  PostAdd,
} from "@mui/icons-material";
import { isSiteCoordinator, isStudyCoordinator } from "../utils/auth";

const TopNavigation = ({ keycloak }) => {
  const canManageStudyParticipants = isSiteCoordinator(keycloak);
  const canUseScientificExports = isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak);
  const items = [
    { to: "/", label: "Inicio", icon: <Home fontSize="small" />, end: true },
    { to: "/questionnaire", label: "Nuevo cuestionario", icon: <PostAdd fontSize="small" /> },
    { to: "/responses", label: "Casos y evaluaciones", icon: <Assignment fontSize="small" /> },
    { to: "/encounters", label: "Citas / encuentros", icon: <CalendarMonth fontSize="small" /> },
    ...(canManageStudyParticipants
      ? [{ to: "/study-participants/pending", label: "Pendientes", icon: <PeopleAlt fontSize="small" /> }]
      : []),
    ...(canUseScientificExports
      ? [{ to: "/download", label: "Exportaciones", icon: <Download fontSize="small" /> }]
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
