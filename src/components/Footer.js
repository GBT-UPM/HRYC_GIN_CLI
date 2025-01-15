import React from 'react';
import '../assets/css/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      {/* <div className="footer-content">
       
      </div> */}
      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} Grupo de Bioingeniería y Telemdicina, Univesidad Politecnica de Madrid.
      </div>
    </footer>
  );
};

export default Footer;