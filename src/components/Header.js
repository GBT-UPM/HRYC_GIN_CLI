import React from 'react';
import LogoHRYC from "../assets/images/LogoHRYC.jpg";
import LogoUser from "../assets/images/user.png";
import LogoIrycis from "../assets/images/logo-irycis.png";
import LogoMIA from "../assets/images/logo-mia.png";
const Header = (props) => {
  return (
<header className="header">
  <div className="logo-section">
    <img src={LogoHRYC} alt="Logo HRYC" className="logo" />
    <img src={LogoIrycis} alt="Logo IRYCIS" className="logo" />
    <img src={LogoMIA} alt="Logo MIA" className="logo logo-mia" />
  </div>

  <div className="user-section">
    <img src={LogoUser} alt="Avatar" className="user-avatar" />
    <span className="user-name">{props.name}</span>
    <button onClick={props.closeSession} className="logout-btn">
      Cerrar Sesión
    </button>
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
