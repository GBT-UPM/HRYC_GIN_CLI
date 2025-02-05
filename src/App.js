import { Routes, Route, Router } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css"
import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css';


import i18n from "./i18n"

import HomeScreen from "./screens/MainScreen";
import QuestionnaireScreen from "./screens/QuestionnaireScreen";
import Layout from "./layout/Layout";
import { useEffect, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import ResponsesScreen from "./screens/ResponsesScreen";



function App() {
  const { keycloak, initialized } = useKeycloak();
  const [isAdmin, setIsAdmin] = useState(false);
  const [practitioner, setPractitioner] = useState("");
  const [practitionerName, setPractitionerName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const handleDownload = async () => {

  };
  const closeSession = async () => {
    keycloak.logout();
  }
  useEffect(() => {
    console.log(keycloak)
    if (initialized && keycloak.authenticated) {

      const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
      const clientRoles = keycloak.tokenParsed?.resource_access?.['my-api-client']?.roles || [];
      if (realmRoles.includes('practitioner') || clientRoles.includes('practitioner')) {
        setIsAdmin(true);

        setPractitioner(keycloak.tokenParsed.preferred_username);
        const fullName = `${keycloak.tokenParsed.given_name} ${keycloak.tokenParsed.family_name}`;
        setPractitionerName(fullName);
      } else if (realmRoles.includes('patient') || clientRoles.includes('patient')) {
        // Si el usuario es paciente, hacer llamada para obtener los datos del paciente
        const username = keycloak.tokenParsed.preferred_username;
        //fetchPatientData();
      }
    }
  }, [initialized, keycloak]); // Ejecutar el efecto solo cuando Keycloak esté inicializado

  return (
    <>{/*<Notification />*/}
      {/* <Routes>
      <Route path="/" element={<HomeScreen />} />
    </Routes>*/}
      <Routes>
        {/* Ruta que utiliza Layout como contenedor */}
        <Route path="/" element={<Layout sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} handleDownload={handleDownload} closeSession={closeSession} preferred_username={practitionerName} isAdmin={isAdmin} />}>

          {/* Rutas hijas dentro de Layout */}
          <Route index element={<HomeScreen />} />
          <Route path="/questionnaire" element={<QuestionnaireScreen />} />
          <Route path="/responses" element={<ResponsesScreen />} />
   
        </Route>

        {/* Otras rutas que no usen Layout, si deseas */}
        {/* <Route path="/login" element={<Login />} /> */}
      </Routes>



    </>



  );
}

export default App;
