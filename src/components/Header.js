import React from 'react';
import { getAllowedCenters, getCentersDisplayLabel, getPreferredUsername, getPrimaryRoleLabel } from "../utils/auth";

const CENTER_INSTITUTION_NAMES = {
  HURYC: "Hospital Universitario Ramón y Cajal",
  H12O: "Hospital Universitario 12 de Octubre",
  "GBT/UPM": "Universidad Politécnica de Madrid",
  IRYCIS: "Instituto Ramón y Cajal de Investigación Sanitaria",
};

const Header = (props) => {
  const username = getPreferredUsername(props.keycloak) || props.name || "Usuario";
  const roleLabel = getPrimaryRoleLabel(props.keycloak);
  const centersLabel = getCentersDisplayLabel(props.keycloak);
  const allowedCenters = getAllowedCenters(props.keycloak);
  const activeCenterCode = allowedCenters.length === 1 ? allowedCenters[0] : "";
  const institutionName = CENTER_INSTITUTION_NAMES[activeCenterCode];
  const hasMissingCenter = centersLabel === "Sin centro asignado";
  const institutionHeading = hasMissingCenter
    ? centersLabel
    : institutionName || `Centro ${activeCenterCode || centersLabel}`;
  const sessionSummary = institutionName
    ? `${activeCenterCode} · ${roleLabel} · ${username}`
    : `${roleLabel} · ${username}`;

  return (
<header className="header">
  <div className="header-inner">
    <div className="brand-section" aria-label="MIA">
      <div>
        <div className="brand-title">MIA</div>
        <div className="brand-subtitle">Masses Identification Assistant</div>
      </div>
    </div>

    <div className="header-study-context">Estudio multicéntrico ECO-SCORE</div>

    <div className="user-section">
      <div className={`session-info${hasMissingCenter ? " session-info--warning" : ""}`} aria-label="Información de sesión">
        <div className="session-institution" title={institutionHeading}>
          {institutionHeading}
        </div>
        <div className="session-summary" title={sessionSummary}>
          {institutionName && (
            <>
              <span>{activeCenterCode}</span>
              <span aria-hidden="true"> · </span>
            </>
          )}
          <span>{roleLabel}</span>
          <span aria-hidden="true"> · </span>
          <span>{username}</span>
        </div>
      </div>
      <button onClick={props.closeSession} className="logout-btn">
        Cerrar sesión
      </button>
    </div>
  </div>
</header>
  );
}

export default Header;

/*        <div class="logo-container">
            <img src="${url.resourcesPath}/img/GBT_SIMPLE.png" alt="Logo de Mi Aplicación">
            <img src="${url.resourcesPath}/img/logo-huryc.jpg" alt="Logo de Mi Aplicación">
            <img src="${url.resourcesPath}/img/logo-irycis.png" alt="Logo de Mi Aplicación">
        </div>
        */
