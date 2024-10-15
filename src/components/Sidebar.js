import { faBars, faTimes, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import LogoETSIT from "../assets/images/LOGO_ESCUELA.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import '../assets/css/Sidebar.css';
import React, { useState } from 'react';
const Sidebar = ({ sidebarOpen, toggleSidebar }) => {
    const [sections, setSections] = useState({
        historico: false,
        datos: false,
        enlaces: false,
    });

    const toggleSection = (section) => {
        setSections((prevSections) => ({
            ...prevSections,
            [section]: !prevSections[section],
        }));
    };
    return (
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button className="close-sidebar-btn" onClick={toggleSidebar}>
                <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
            </button>
            <img src={LogoETSIT} alt="LogoEscuela" class="logoEscuela" />
            <div className="sections">
                <div className="sidebar-section">
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
                            <li><a href="#link3">Enlace 3</a></li>
                            <li><a href="#link4">Enlace 4</a></li>
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
                </div>
            </div>
        </div>
    );
};
export default Sidebar;