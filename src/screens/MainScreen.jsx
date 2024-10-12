

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

Chart.register(CategoryScale);



export default function MainScreen() {
  const { keycloak, initialized } = useKeycloak();
  const [patientData, setPatientData] = useState(null);
  const [practitioners, setPractitioners] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [responses, setResponses] = useState([]);
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
  const fetchQuestionnaire = async () => {
    try {
      const response = await ApiService(keycloak.token, 'GET', `/fhir/Questionnaire?identifier=BR-Q02`, {});
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

  const generateQuestions = () => {
    const processItems = (items) => {
      return items.map((item, index) => {
        // Renderizar todos los items sin importar el tipo
        return (
          <Panel key={item.linkId}>
            <QuestionPanel
              linkId={item.linkId}
              question={item.text}
              questionNumber={index + 1}
              options={item.answerOption != null ? JSON.parse(item.answerOption).answerOption : []}
              enable={item.enableWhen != null ? JSON.parse(item.enableWhen).enableWhen : []}
              type={item.type}
              id={index}
              updateResponses={updateResponses}
              responses={responses}
              isDisabled={false}
              repeats={item.repeats ? true : false}
            />
            {/* Si el item tiene sub-items, procesarlos recursivamente */}
            {item.hasOwnProperty("item") && processItems(item.item)}
          </Panel>
        );
      });
    };
  
    // Ordenar y procesar todos los items
    const sortedItems = questionnaire?.resourceData.item.sort((a, b) => a.id - b.id);
    return processItems(sortedItems);
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
  const updateResponses = (code, questionNumber, type, linkId, display, rep) => {

    let existingResponsesArray = [...responses];
    let arrayObject = {};
    arrayObject = {
      linkId,
      value: display,
      code
    };
    if (rep) {
      let index = existingResponsesArray.findIndex(item => item.linkId === linkId && item.code === code);
      if (index !== -1) {
        let temp = existingResponsesArray.splice(index, index);
        console.log(temp)
      } else {
        existingResponsesArray.push(arrayObject);
      }
    } else {
      // Find the index of the item in the array
      let index = existingResponsesArray.findIndex(item => item.linkId === linkId);

      // If the item is found, update it
      if (index !== -1) {
        existingResponsesArray[index] = arrayObject;
      }
      else {
        existingResponsesArray.push(arrayObject);
      }
    }
    setResponses(existingResponsesArray);
  }
  return (
    <Container className="App">


      {keycloak.authenticated ? (
        <><Header name={keycloak.tokenParsed.preferred_username} /><div className="App">
          <div>
            {/* Mostrar diferentes secciones basadas en el rol del usuario */}
            {isAdmin ? (
              <div>
                <h2>Sección de Administración</h2>
                <p>Cuestionanio</p>
                {questionnaire && generateQuestions()}
              {/*}  <div>
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
                </div>{*/}
              </div>
            ) : (
              <div>
                <h2>Sección de Usuario</h2>
                <p>Esta es una sección visible para usuarios regulares.</p>
              </div>
            )}


            <button onClick={() => keycloak.logout()}>Cerrar sesión</button>
          </div>
        </div></>

      ) : (
        <button onClick={() => keycloak.login()}>Iniciar sesión</button>
      )}

    </Container>
  );
}