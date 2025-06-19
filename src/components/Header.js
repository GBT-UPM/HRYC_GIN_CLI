import React from 'react';
import LogoHRYC from "../assets/images/LogoHRYC.jpg";
import LogoUser from "../assets/images/user.png";
import LogoIrycis from "../assets/images/logo-irycis.png";
const Header = (props) => {
  return (
    <header class="header">
  <div class="logo-section">
    <img src={LogoHRYC} alt="Logo" class="logo"/>
    <img src={LogoIrycis} alt="Logo" class="logo"/>    
  
    {/* <span
      style={{
        fontSize: '24px',
        fontWeight: 'bold',
        letterSpacing: '1px'
      }}
    >
    MIA 
    </span> */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: '10px' }}>
      <span style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '1px' }}>
        MIA
      </span>
      <span style={{ fontSize: '12px', fontStyle: 'italic', color: '#555' }}>
        Masses Identification Assistant
      </span>
    </div>
  </div>
  
  <div class="user-section">
    <img src={LogoUser}  alt="Avatar" class="user-avatar"/>
    <span class="user-name">{props.name}</span>
    <button onClick={props.closeSession} class="logout-btn">Cerrar Sesión</button>
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
