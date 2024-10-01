

import { useTranslation } from "react-i18next";
import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";
import { Col, Container, Row } from "react-bootstrap";
import { MdExitToApp } from "react-icons/md";
import { MdHelp } from "react-icons/md";
import { useEffect, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { useKeycloak } from '@react-keycloak/web';


import MainScreen from "./MainScreen";
import CustomMessage from "../components/CustomMessage";
import ApiService from "../services/ApiService";
Chart.register(CategoryScale);



export default function HomeScreen() {
  const { keycloak, initialized } = useKeycloak();
  const [patientData, setPatientData] = useState(null);
  const [practitioners, setPractitioners] = useState(null);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Función para obtener los datos del paciente
  const fetchPatientData = async () => {
    try {
      const response = await ApiService(keycloak.token, 'GET', `/fhir/Patient/${keycloak.tokenParsed.preferred_username}`, {});
      if (response.status === 200) {
        const data = await response.json();
        setPatientData(data);
      } else {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }
    } catch (error) {
      console.error("Error al obtener los datos del paciente:", error);
      setError("Error al obtener los datos del paciente.");
    }
  };
  // Función para obtener los clinicos
  const fetchPrescribers = async () => {
    try {
      const response = await ApiService(keycloak.token, 'GET', `/fhir/Practitioner`, {});
      if (response.status === 200) {
        const data = await response.json();
        console.log(data);
        setPractitioners(data);
      } else {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }
    } catch (error) {
      console.error("Error al obtener los datos del paciente:", error);
      setError("Error al obtener los datos del paciente.");
    }
  };
  // Función para verificar los roles del usuario
  const checkUserRoles = () => {
    const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
    const clientRoles = keycloak.tokenParsed?.resource_access?.['my-client']?.roles || [];

    // Comprueba si el usuario tiene el rol de 'admin'
    setIsAdmin(realmRoles.includes('admin') || clientRoles.includes('admin'));
  };
  useEffect(() => {
    if (initialized && keycloak.authenticated) {

      // checkUserRoles();
      const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
      const clientRoles = keycloak.tokenParsed?.resource_access?.['my-client']?.roles || [];
      console.log(keycloak)
      if (realmRoles.includes('admin') || clientRoles.includes('admin')) {
        setIsAdmin(true);
        // Si el usuario es administrador, hacer llamada para obtener Practitioners
        fetchPrescribers();
      } else if (realmRoles.includes('patient') || clientRoles.includes('patient')) {
        // Si el usuario es paciente, hacer llamada para obtener los datos del paciente
        const username = keycloak.tokenParsed.preferred_username;
        fetchPatientData();
      }
    }
  }, [initialized, keycloak]); // Ejecutar el efecto solo cuando Keycloak esté inicializado

  if (!initialized) {
    return <div>Cargando...</div>;
  }

  return (
    <Container className="App">
      <div className="App">
        {keycloak.authenticated ? (
          <div>
            <h1>Bienvenido, {keycloak.tokenParsed.preferred_username}</h1>

            {/* Mostrar diferentes secciones basadas en el rol del usuario */}
            {isAdmin ? (
              <div>
                <h2>Sección de Administración</h2>
                <p>Esta es una sección solo visible para administradores.</p>
                <div>
                  <h2>List of Prescribers</h2>
                  <ul>
                    {practitioners && practitioners.length > 0 ? (
                      practitioners.map((practitioner, index) => (
                        <li key={index}>
                          {practitioner.resourceData.name[0].family}, {practitioner.resourceData.name[0].given[0]}
                        </li>
                      ))
                    ) : (
                      <p>No practitioners found.</p>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <h2>Sección de Usuario</h2>
                <p>Esta es una sección visible para usuarios regulares.</p>
              </div>
            )}

            {error && <div style={{ color: 'red' }}>{error}</div>}
            {patientData ? (
              <pre>{JSON.stringify(patientData, null, 2)}</pre>
            ) : (
              <div>Cargando datos del paciente...</div>
            )}

            <button onClick={() => keycloak.logout()}>Cerrar sesión</button>
          </div>
        ) : (
          <button onClick={() => keycloak.login()}>Iniciar sesión</button>
        )}
      </div>
    </Container>
  );
}