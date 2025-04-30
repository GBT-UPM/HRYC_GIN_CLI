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
import ApiService from "./services/ApiService";
import DownloadScreen from "./screens/DownloadScreen";



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
   
        </Route>

        {/* Otras rutas que no usen Layout, si deseas */}
        {/* <Route path="/login" element={<Login />} /> */}
      </Routes>



    </>



  );
}

export default App;
