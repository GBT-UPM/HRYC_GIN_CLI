import { faBars, faTimes } from "@fortawesome/free-solid-svg-icons";
import LogoETSIT from "../assets/images/LOGO_ESCUELA.png";
import LogoGBT from "../assets/images/GBT_SIMPLE.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import '../assets/css/Sidebar.css';
import React from 'react';
import HomeIcon from '@mui/icons-material/Home';
import DownloadIcon from '@mui/icons-material/Download';
const Sidebar = ({ sidebarOpen, toggleSidebar, download }) => {

    return (
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button className="close-sidebar-btn" onClick={toggleSidebar}>
                <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
            </button>
            <img src={LogoETSIT} alt="LogoEscuela" class="logoEscuela" />
            <img src={LogoGBT} alt="LogoGbt" class="logoEscuela" />
            <div className="sections">
                <div className="sidebar-section">
                    <ul>
                        <li>
                            <a href="/">
                                <HomeIcon sx={{ fontSize: 18, verticalAlign: 'middle', marginRight: 1 }} />
                                Inicio
                            </a>
                        </li>
                    </ul>
                </div>

                <div className="sidebar-section">
                    <ul>
                        <li>
                            <a href="/download">
                                <DownloadIcon sx={{ fontSize: 18, verticalAlign: 'middle', marginRight: 1 }} />
                                Descargas
                            </a>
                        </li>
                    </ul>
                </div>
                {/* <div className="sidebar-section">
                    <button className="section-toggle-btn" onClick={() => toggleSection('historico')}>
                        Histórico <FontAwesomeIcon icon={sections.historico ? faChevronUp : faChevronDown} />
                    </button>
                    {sections.historico && (
                        <ul>
                            <li><a href="#link1">Respuestas</a></li>
                            <li><a href="#link2">Enlace 2</a></li>
                        </ul>
                    )}
                </div>
                <div className="sidebar-section">
                    <button className="section-toggle-btn" onClick={() => toggleSection('datos')}>
                        Datos <FontAwesomeIcon icon={sections.datos ? faChevronUp : faChevronDown} />
                    </button>
                    {sections.datos && (
                        <ul>
                            <li><a href="#link3" onClick={download}>Descargar</a></li>
                        </ul>
                    )}
                </div>
                <div className="sidebar-section">
                    <button className="section-toggle-btn" onClick={() => toggleSection('enlaces')}>
                        Enlaces <FontAwesomeIcon icon={sections.enlaces ? faChevronUp : faChevronDown} />
                    </button>
                    {sections.enlaces && (
                        <ul>
                            <li><a href="#link5">Enlace 5</a></li>
                            <li><a href="#link6">Enlace 6</a></li>
                        </ul>
                    )}
                </div> */}
            </div>
        </div>
    );
};
export default Sidebar;