

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
import ResponsesProbability from "../components/ResponsesProbability";
Chart.register(CategoryScale);

export const generateId = () => {
  return uuidv4(); // Genera un UUID único
};
export const generatePeriod = () => {
  const now = new Date(); // Momento actual
  const end = now.toISOString(); // Fin del período (momento actual)

  const start = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // Inicio: 30 minutos antes

  return { start, end };
};

export default function QuestionnaireScreen() {
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
  //const {probability,setProbality}=useState(false);
  const [probability, setProbality] = useState(false);

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
  const handleSave = async (anwers) => {
    // const confirmSave = window.confirm("¿Está seguro de que desea guardar las respuestas?");
    // if (!confirmSave) return;
    console.log("CLICK SAVE")
 
    const questionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      id: generateId(),
      item: anwers,
    };
    console.log("Saved Responses (antes de setState):", questionnaireResponses);

    // Misma idea: NO uses .push, haz un spread
    setQuestionnaireResponses((prev) => [...prev, questionnaireResponse]);

    // Aquí inmediatamente seguirá mostrando el viejo estado
    console.log("Saved Responses (después de setState):", questionnaireResponses);

    // Para ver el estado actualizado, puedes usar un useEffect
    setProbality(true);

/*
    const firstResponse = anwers;
    var specificAnswer = anwers.find(answer => answer.linkId === "PAT_NHC");
    const patientId = specificAnswer?.answer?.[0]?.valueString || '';
    specificAnswer = anwers.find(answer => answer.linkId === "PAT_IND");
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
    setResponses(allItems);*/
  };
  const handleContinue = async (answers) => {
    const questionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      id: generateId(),
      item: answers,
    };
    console.log("Saved Responses:", questionnaireResponse);
  
    // Agregar sin mutar el estado
    setQuestionnaireResponses((prev) => [...prev, questionnaireResponse]);
  
    // ¡Ojo! Aquí, inmediatamente después de setState, `questionnaireResponses`
    // todavía NO reflejará el nuevo valor. Para verlo, hazlo en un useEffect.
    console.log("Saved Responses2 (inmed. after setState):", questionnaireResponses);
  };
  const QBack = async (anwers) => {
    setQuestionnaireResponses([]);
    setResponses([]);
    // checkUserRoles();

    fetchQuestionnaire();
    setProbality(false);
  }

  useEffect(() => {
    console.log(keycloak)

    setQuestionnaireResponses([]);
    setResponses([]);
    // checkUserRoles();

    fetchQuestionnaire();



  }, [initialized]); // Ejecutar el efecto solo cuando Keycloak esté inicializado
  return (
    <div>
      {questionnaire ? (
        !probability ? (
          <QuestionnaireForm eventContinue={handleContinue} event={handleSave} questionnaire={questionnaire.resourceData} />
        ) : (
          // <ResponsesSummary event={QBack} responses={responses} />
          <ResponsesProbability responses={questionnaireResponses} event={QBack} />
        )
      ) : (
        null
      )}
    </div>
  );
}
