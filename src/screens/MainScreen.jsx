

import { useTranslation } from "react-i18next";
import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";
import { Col, Container, Row } from "react-bootstrap";
import { useEffect, useState } from "react";
import { useKeycloak } from '@react-keycloak/web';
import ApiService from "../services/ApiService";
import Header from "../components/Header";
import QuestionPanel from "../components/QuestionPanel";
import Panel from "../components/Panel";
import QuestionnaireForm from "../components/QuestionnaireForm";
import Sidebar from "../components/Sidebar";
import ResponsesSummary from "../components/ResponsesSummary";

Chart.register(CategoryScale);



export default function MainScreen() {
  const { keycloak, initialized } = useKeycloak();
  const [questionnaire, setQuestionnaire] = useState(null);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [responses, setResponses] = useState([]);
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
  
  // Función para obtener los datos del paciente
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const fetchQuestionnaire = async () => {
    try {
      const response = await ApiService(keycloak.token, 'GET', `/fhir/Questionnaire?name=registro_ginecologico`, {});
      if (response.status === 200) {
        const data = await response.json();
        console.log(data)
        if (data && data.length > 0) {
          setQuestionnaire(data[0]);
        }
      } else {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }
    } catch (error) {
      console.error("Error al obtener los datos del paciente:", error);
      setError("Error al obtener los datos del paciente.");
    }
  };
  const QBack = async (anwers) => {
setResponses([])
  }

  const handleSave = async (anwers) => {
    const confirmSave = window.confirm("¿Está seguro de que desea guardar las respuestas?");
    if (!confirmSave) return;
    const questionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      item: anwers,
    };
    console.log("Saved Responses:", questionnaireResponse);
    console.log("Saved Responses:", questionnaireResponses);
    questionnaireResponses.push(questionnaireResponse);
    for (const qResponse of questionnaireResponses) {
      // Aquí puedes procesar cada respuesta
    // Aquí puedes añadir la lógica para enviar las respuestas a un servidor o guardarlas localmente
    try {
      const response = await ApiService(keycloak.token, 'POST', `/fhir/QuestionnaireResponse`, qResponse);
      if (response.status === 200) {

        console.log(response)
    //    setResponses(questionnaireResponse.item)
      } else {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }
    } catch (error) {
      console.error("Error al obtener los datos del paciente:", error);
      setError("Error al obtener los datos del paciente.");
    }

  }
  };
  const handleContinue = async (anwers) => {
    const confirmSave = window.confirm("¿Está seguro de que desea guardar las respuestas?");
    if (!confirmSave) return;
    const questionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      item: anwers,
    };
    console.log("Saved Responses:", questionnaireResponse);
    var a=questionnaireResponses.push(questionnaireResponse)
    console.log(questionnaireResponses)
    setQuestionnaireResponses(questionnaireResponses)
    // Aquí puedes añadir la lógica para enviar las respuestas a un servidor o guardarlas localmente
    
  };
  const closeSession = async () => {
    keycloak.logout();
  }

  useEffect(() => {
    if (initialized && keycloak.authenticated) {

      // checkUserRoles();
      const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
      const clientRoles = keycloak.tokenParsed?.resource_access?.['my-api-client']?.roles || [];
      console.log(keycloak)
      if (realmRoles.includes('practitioner') || clientRoles.includes('practitioner')) {
        setIsAdmin(true);
        // Si el usuario es administrador, hacer llamada para obtener Practitioners
        fetchQuestionnaire();

      } else if (realmRoles.includes('patient') || clientRoles.includes('patient')) {
        // Si el usuario es paciente, hacer llamada para obtener los datos del paciente
        const username = keycloak.tokenParsed.preferred_username;
        //fetchPatientData();
      }
    }
  }, [initialized, keycloak]); // Ejecutar el efecto solo cuando Keycloak esté inicializado

  if (!initialized) {
    return <div>Cargando...</div>;
  }

  return (
    <Container className="App">
      {keycloak.authenticated ? (
        <>
        
          <div className="App">
         {/*} <Header name={keycloak.tokenParsed.preferred_username} />{*/}
            <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
            <div className="main-content">
            <Header name={keycloak.tokenParsed.preferred_username} closeSession={closeSession} />
              {/* Mostrar diferentes secciones basadas en el rol del usuario */}
              {isAdmin ? (
                <div>
                  {questionnaire ? (
                    responses.length === 0 ?(
                      <QuestionnaireForm eventContinue={handleContinue} event={handleSave} questionnaire={questionnaire.resourceData} />
                    ):(
                      <ResponsesSummary event={QBack} responses={responses} />
                    )
                  ) : (
                    null
                  )}

                </div>
              ) : (
                <div>
                  <h2>Sección de Usuario</h2>
                  <p>Esta es una sección visible para usuarios regulares.</p>
                </div>
              )}
            </div>
          </div></>

      ) : (
        <button onClick={() => keycloak.login()}>Iniciar sesión</button>
      )}

    </Container>
  );
}
