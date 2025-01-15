import React from 'react';
import LogoHRYC from "../assets/images/LogoHRYC.jpg";
import LogoUser from "../assets/images/user.png";
const Header = (props) => {
  return (
    <header class="header">
  <div class="logo-section">
    <img src={LogoHRYC} alt="Logo" class="logo"/>
    <span class="app-name">AdnexaTech HRC</span>
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
