import React from 'react';
import '../assets/css/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-identity">
          <strong>MIA</strong>
          <span aria-hidden="true">·</span>
          <span>Masses Identification Assistant</span>
        </div>
        <div className="footer-study">Estudio multicéntrico ECO-SCORE</div>
        <div className="footer-institutions">
          Hospital Universitario Ramón y Cajal · Hospital Universitario 12 de Octubre · Universidad Politécnica de Madrid · IRYCIS
        </div>
      </div>
    </footer>
  );
};

export default Footer;
