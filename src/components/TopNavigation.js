import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button, Menu, MenuItem } from "@mui/material";
import {
  Assignment,
  CalendarMonth,
  Download,
  FactCheck,
  Home,
  ManageAccounts,
  Settings,
} from "@mui/icons-material";
import { isSiteCoordinator, isStudyCoordinator } from "../utils/auth";

const TopNavigation = ({ keycloak }) => {
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const location = useLocation();
  const canUseScientificExports = isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak);
  const canUseStudyAudit = isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak);
  const items = [
    { to: "/", label: "Inicio", icon: <Home fontSize="small" />, end: true },
    { to: "/responses", label: "Casos y evaluaciones", icon: <Assignment fontSize="small" /> },
    { to: "/encounters", label: "Citas / encuentros", icon: <CalendarMonth fontSize="small" /> },
  ];
  const managementItems = [
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
  const managementActive = managementItems.some((item) => location.pathname.startsWith(item.to));

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
        {managementItems.length > 0 && (
          <>
            <Button
              className={`top-navigation-link top-navigation-menu-trigger${managementActive ? " active" : ""}`}
              startIcon={<Settings fontSize="small" />}
              onClick={(event) => setSettingsAnchor(event.currentTarget)}
              aria-controls={settingsAnchor ? "management-menu" : undefined}
              aria-haspopup="menu"
              aria-expanded={Boolean(settingsAnchor)}
            >
              Gestión
            </Button>
            <Menu
              id="management-menu"
              anchorEl={settingsAnchor}
              open={Boolean(settingsAnchor)}
              onClose={() => setSettingsAnchor(null)}
            >
              {managementItems.map((item) => (
                <MenuItem
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  selected={location.pathname.startsWith(item.to)}
                  onClick={() => setSettingsAnchor(null)}
                  sx={{ gap: 1 }}
                >
                  {item.icon}{item.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </div>
    </nav>
  );
};

export default TopNavigation;
