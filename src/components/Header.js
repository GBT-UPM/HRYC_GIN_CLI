import React from 'react';
import { getCentersDisplayLabel, getPreferredUsername, getPrimaryRoleLabel } from "../utils/auth";

const Header = (props) => {
  const username = getPreferredUsername(props.keycloak) || props.name || "Usuario";
  const roleLabel = getPrimaryRoleLabel(props.keycloak);
  const centersLabel = getCentersDisplayLabel(props.keycloak);
  const hasMissingCenter = centersLabel === "Sin centro asignado";

  return (
<header className="header">
  <div className="header-inner">
    <div className="brand-section" aria-label="MIA">
      <div>
        <div className="brand-title">MIA</div>
        <div className="brand-subtitle">Masses Identification Assistant</div>
      </div>
      <div className="study-subtitle">Validación externa multicéntrica del ECO-SCORE</div>
    </div>

    <div className="institution-section" aria-label="Instituciones">
      <span>HURYC</span>
      <span>H12O</span>
      <span>GBT/UPM</span>
      <span>IRYCIS</span>
    </div>

    <div className="user-section">
      <div className="session-info" aria-label="Información de sesión">
        <div className="session-info-row">
          <span className="session-label">Usuario</span>
          <span className="session-info-main">{username}</span>
        </div>
        <div className="session-info-row">
          <span className="session-label">Rol</span>
          <span>{roleLabel}</span>
        </div>
        <div className={hasMissingCenter ? "session-info-warning" : "session-info-centers"}>
          <span className="session-label">Centros</span>
          <span>{centersLabel}</span>
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
