import { Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css"
import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css';

import HomeScreen from "./screens/MainScreen";
import QuestionnaireScreen from "./screens/QuestionnaireScreen";
import Layout from "./layout/Layout";
import { useEffect, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import ResponsesScreen from "./screens/ResponsesScreen";
import ApiService from "./services/ApiService";
import DownloadScreen from "./screens/DownloadScreen";
import EncountersScreen from "./screens/EncountersScreen";
import PendingParticipantsScreen from "./screens/PendingParticipantsScreen";



function App() {
  const { keycloak, initialized } = useKeycloak();
  const [isAdmin, setIsAdmin] = useState(false);
  const [keycloakInitTimedOut, setKeycloakInitTimedOut] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [practitioner, setPractitioner] = useState("");
  const [practitionerName, setPractitionerName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const handleDownload = async () => {
    try {
      const response = await ApiService(keycloak.token, 'GET', `/downloadcsv`, {});
      if (response.status === 200) {

        const contentDisposition = response.headers.get("Content-Disposition");
          const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
          const filename = filenameMatch ? filenameMatch[1] : "questionnaire.csv";
      
          const blob = await response.blob();
    
           // Crear un enlace temporal para descargar
          const url = window.URL.createObjectURL(blob);
           const link = document.createElement("a");
          link.href = url;
           link.download = filename;
           document.body.appendChild(link);
           link.click();
           link.remove();
          window.URL.revokeObjectURL(url);



      } else {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }
    } catch (error) {
      console.error("Error al obtener los datos del paciente:", error);

    }
    // try {
    //   const response = await fetch("http://localhost:8080/downloadcsv", { 
    //     method: "GET",
    //     headers: {
    //       Authorization: `Bearer ${keycloak.token}` // si usas Keycloak
    //     }
    //   });
  
    //   if (!response.ok) {
    //     throw new Error(`Error al descargar: ${response.statusText}`);
    //   }
  
    //   // Extraer el nombre del archivo del header si está disponible
    //   const contentDisposition = response.headers.get("Content-Disposition");
    //   const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
    //   const filename = filenameMatch ? filenameMatch[1] : "questionnaire.csv";
  
    //   const blob = await response.blob();
  
    //   // Crear un enlace temporal para descargar
    //   const url = window.URL.createObjectURL(blob);
    //   const link = document.createElement("a");
    //   link.href = url;
    //   link.download = filename;
    //   document.body.appendChild(link);
    //   link.click();
    //   link.remove();
    //   window.URL.revokeObjectURL(url);
    // } catch (error) {
    //   console.error("Error al descargar el CSV:", error);
    // }
  };
  const closeSession = async () => {
    keycloak.logout();
  }

  useEffect(() => {
    if (initialized) {
      setKeycloakInitTimedOut(false);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setKeycloakInitTimedOut(true);
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [initialized]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const keycloakState = {
        initialized,
        authenticated: keycloak?.authenticated,
        hasToken: Boolean(keycloak?.token),
        keycloakRealm: process.env.REACT_APP_KEYCLOAK_REALM,
        keycloakClientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID,
        issuer: keycloak?.tokenParsed?.iss,
        audience: keycloak?.tokenParsed?.aud,
        authorizedParty: keycloak?.tokenParsed?.azp,
        realmRoles: keycloak?.tokenParsed?.realm_access?.roles || [],
        allowedCenters: keycloak?.tokenParsed?.allowed_centers,
      };
      console.log("[App] keycloak state", keycloakState);
      console.log("[App] keycloak state json", JSON.stringify(keycloakState));
    }

    if (initialized && keycloak.authenticated) {
      const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
      const configuredClientId = process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'my-api-client';
      const resourceAccess = keycloak.tokenParsed?.resource_access || {};
      const configuredClientRoles = resourceAccess[configuredClientId]?.roles || [];
      const allClientRoles = Object.values(resourceAccess).flatMap((client) => client?.roles || []);
      const clientRoles = [...configuredClientRoles, ...allClientRoles];
  
      if (realmRoles.includes('practitioner') || clientRoles.includes('practitioner')) {
        setIsAdmin(true);
        setPractitioner(keycloak.tokenParsed.preferred_username);
        const fullName = `${keycloak.tokenParsed.given_name} ${keycloak.tokenParsed.family_name}`;
        setPractitionerName(fullName);
        sessionStorage.setItem('practitioner', keycloak.tokenParsed.preferred_username);
        sessionStorage.setItem('practitionerName', fullName);
      } else if (realmRoles.includes('patient') || clientRoles.includes('patient')) {
        // fetchPatientData();
      }
    }
  }, [initialized, keycloak, setIsAdmin, setPractitioner, setPractitionerName]);

  if (!initialized) {
    const keycloakUrl = process.env.REACT_APP_KEYCLOAK_URL || "https://emma.gbt.tfo.upm.es/auth";
    const realm = process.env.REACT_APP_KEYCLOAK_REALM || "TFT";
    const discoveryUrl = `${keycloakUrl.replace(/\/$/, "")}/realms/${realm}/.well-known/openid-configuration`;

    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Inicializando sesión...
        {keycloakInitTimedOut && (
          <div style={{ marginTop: "1rem", textAlign: "left", display: "inline-block", maxWidth: 760 }}>
            <p>No se ha podido completar la inicialización de Keycloak.</p>
            <p><strong>Discovery URL:</strong> {discoveryUrl}</p>
            <p>Comprueba en el navegador si esa URL responde JSON y revisa la consola para los eventos de Keycloak.</p>
          </div>
        )}
      </div>
    );
  }

  if (!keycloak?.authenticated) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        No autenticado.
      </div>
    );
  }

  return (
    <>{/*<Notification />*/}
      {/* <Routes>
      <Route path="/" element={<HomeScreen />} />
    </Routes>*/}
      <Routes>
        {/* Ruta que utiliza Layout como contenedor */}
        <Route path="/" element={<Layout sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} handleDownload={handleDownload} closeSession={closeSession} preferred_username={practitionerName} isAdmin={isAdmin} keycloak={keycloak} />}>

          {/* Rutas hijas dentro de Layout */}
          <Route index element={
            <HomeScreen
              keycloak={keycloak}
              practitionerName={practitionerName}
              isAdmin={isAdmin}
            />
          } />
          <Route path="/questionnaire" element={<QuestionnaireScreen />} />
          <Route path="/responses" element={<ResponsesScreen />} />
          <Route path="/download" element={<DownloadScreen />} />
          <Route path="/encounters" element={<EncountersScreen />} />
          <Route path="/study-participants/pending" element={<PendingParticipantsScreen />} />
        </Route>

        {/* Otras rutas que no usen Layout, si deseas */}
        {/* <Route path="/login" element={<Login />} /> */}
      </Routes>



    </>



  );
}

export default App;
