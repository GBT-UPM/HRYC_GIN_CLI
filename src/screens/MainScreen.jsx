

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
import Footer from "../components/Footer";
import { v4 as uuidv4 } from "uuid";
import { useEncounterTemplate } from "../hooks/useEncounterTemplate";
import { useObservationTemplate } from "../hooks/useObservationTemplate";
import { useImageStudyTemplate } from "../hooks/useImageStudyTemplate";
Chart.register(CategoryScale);

const generateId = () => {
  return uuidv4(); // Genera un UUID único
};
const generatePeriod = () => {
  const now = new Date(); // Momento actual
  const end = now.toISOString(); // Fin del período (momento actual)

  const start = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // Inicio: 30 minutos antes

  return { start, end };
};
export default function MainScreen() {
  const { keycloak, initialized } = useKeycloak();
  const [questionnaire, setQuestionnaire] = useState(null);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [responses, setResponses] = useState([]);
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
  const [practitioner, setPractitioner] = useState("");
  const [practitionerName, setPractitionerName] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const { generateEncounter } = useEncounterTemplate();
  const { generateObservation } = useObservationTemplate();
  const { generateImagingStudy } = useImageStudyTemplate();
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

  const handleDownload = async () => {
    try {
      // Realiza la llamada al endpoint
      const response = await ApiService(keycloak.token, 'GET', `/downloadcsv`, {});

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      // Extraer el contenido como un blob
      const blob = await response.blob();

      // Crear un enlace para descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Configura el nombre del archivo
      a.download = 'questionnaire_responses.csv';

      // Simula el clic para iniciar la descarga
      a.click();

      // Limpia el objeto URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
    }
  };





  const QBack = async (anwers) => {
    setResponses([])
  }

  const handleSave = async (anwers) => {
    // const confirmSave = window.confirm("¿Está seguro de que desea guardar las respuestas?");
    // if (!confirmSave) return;
    const firstResponse = anwers;
    var specificAnswer = anwers.find(answer => answer.linkId === "138324799523");
    const patientId = specificAnswer?.answer?.[0]?.valueString || '';
    specificAnswer = anwers.find(answer => answer.linkId === "9485775618610");
    const observation = specificAnswer?.answer?.[0]?.valueString || '';
    
    const encId = generateId();
    const obsId = generateId();
    const imgStuId = generateId();
    const serieId = generateId();
    setEncounterId(encId);
    const Encounter= generateEncounter(encId,patientId,practitioner,practitionerName,generatePeriod());
    const Observation= generateObservation(obsId, encId , patientId, imgStuId, observation);
    const ImageStudy = generateImagingStudy(imgStuId, encId, patientId, serieId);

    const successfulResponses = [];
    try {
      const encounter = await ApiService(keycloak.token, 'POST', `/fhir/Encounter`, Encounter);
      if (encounter.status === 200) {

        const observation = await ApiService(keycloak.token, 'POST', `/fhir/Observation`, Observation);
        console.log("observation: "+observation.status)
        const imageStudy = await ApiService(keycloak.token, 'POST', `/fhir/ImagingStudy`, ImageStudy);
        console.log("imageStudy: "+imageStudy.status)

        const questionnaireResponse = {
          resourceType: "QuestionnaireResponse",
          status: "completed",
          id: generateId(),
          item: anwers,
        };

        var a =questionnaireResponses;
        a.push(questionnaireResponse);
        setQuestionnaireResponses(a)
        var b =encounterId
        console.log(b)
        //questionnaireResponses.push(questionnaireResponse);
        
        for (const qResponse of questionnaireResponses) {
          // Aquí puedes procesar cada respuesta
          console.log("Response -------------------")
          // Aquí puedes añadir la lógica para enviar las respuestas a un servidor o guardarlas localmente
          try {
            qResponse.partOf = [
              {
                reference: `Encounter/${encId}`
              }
            ];
            const response = await ApiService(keycloak.token, 'POST', `/fhir/QuestionnaireResponse`, qResponse);
            if (response.status === 200) {

              console.log(response)
              successfulResponses.push(qResponse);
              //setResponses(questionnaireResponse.item)
              
            } else {
              throw new Error(`Error en la respuesta: ${response.status}`);
            }
          } catch (error) {
            console.error("Error al guardar la respuesta:", error);
            setError("Error al guardar la respuesta.");
          }
        }
        
      } else {
        throw new Error(`Error en el encounter: ${encounter.status}`);
      }
    } catch (error) {
      console.error("Error al guardar el encounter:", error);
      setError("Error al guardar el encounter.");
    }
    // Extraer todos los .item de los elementos de questionnaireResponses
     // Eliminar las respuestas exitosas del array questionnaireResponses
     const remainingResponses = questionnaireResponses.filter(qResponse => !successfulResponses.includes(qResponse));
     setQuestionnaireResponses(remainingResponses);
    const allItems = questionnaireResponses.flatMap(qResponse => qResponse.item);
    setResponses(allItems);
  };
  const handleContinue = async (anwers) => {

    const questionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      id: generateId(),
      item: anwers,
    };
    console.log("Saved Responses:", questionnaireResponse);
    setQuestionnaireResponses(questionnaireResponses)
    // Aquí puedes añadir la lógica para enviar las respuestas a un servidor o guardarlas localmente

  };
  const closeSession = async () => {
    keycloak.logout();
  }

  useEffect(() => {
    console.log(keycloak)
    if (initialized && keycloak.authenticated) {
      setQuestionnaireResponses([]);
      setResponses([]);
      // checkUserRoles();
      const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
      const clientRoles = keycloak.tokenParsed?.resource_access?.['my-api-client']?.roles || [];
      if (realmRoles.includes('practitioner') || clientRoles.includes('practitioner')) {
        setIsAdmin(true);
        // Si el usuario es administrador, hacer llamada para obtener Practitioners
        fetchQuestionnaire();
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

  if (!initialized) {
    return <div>Cargando...</div>;
  }

  return (
    <Container className="App">
      {keycloak.authenticated ? (
        <>

          <div className="App">
            {/*} <Header name={keycloak.tokenParsed.preferred_username} />{*/}
            <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} download={handleDownload} />
            <div className="main-content">
              <Header name={keycloak.tokenParsed.preferred_username} closeSession={closeSession} />
              {/* Mostrar diferentes secciones basadas en el rol del usuario */}
              {isAdmin ? (
                <div>
                  {questionnaire ? (
                    responses.length === 0 ? (
                      <QuestionnaireForm eventContinue={handleContinue} event={handleSave} questionnaire={questionnaire.resourceData} />
                    ) : (
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
              {/* <Footer/> */}
            </div>
          </div></>

      ) : (
        <button onClick={() => keycloak.login()}>Iniciar sesión</button>
      )}

    </Container>
  );
}
