


import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";

import { useCallback, useEffect, useState } from "react";
import { useKeycloak } from '@react-keycloak/web';
import ApiService from "../services/ApiService";

import QuestionnaireForm from "../components/QuestionnaireForm";

import { v4 as uuidv4 } from "uuid";

import ResponsesProbability from "../components/ResponsesProbability";
import { useNavigate } from "react-router-dom";
Chart.register(CategoryScale);

export const generateId = () => {
  return uuidv4(); // Genera un UUID único
};
export const generatePeriod = () => {
  const now = new Date(); // Momento actual
  const end = now.toISOString(); // Fin del período (momento actual)

  const start = new Date(now.getTime() - 15 * 60 * 1000).toISOString(); // Inicio: 15 minutos antes

  return { start, end };
};

export default function QuestionnaireScreen() {
  const { keycloak, initialized } = useKeycloak();
  const [questionnaire, setQuestionnaire] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [responses, setResponses] = useState([]);
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);


  //const {probability,setProbality}=useState(false);
  const [probability, setProbality] = useState(false);
  const navigate = useNavigate();
  const fetchQuestionnaire = useCallback(async () => {
    try {
      const response = await ApiService(
        keycloak.token,
        'GET',
        `/fhir/Questionnaire?name=registro_ginecologico`,
        {}
      );
  
      if (response.status === 200) {
        const data = await response.json();
        console.log(data);
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
  }, [keycloak.token, setQuestionnaire, setError]);
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
 
    
        navigate('/');
    
  }

  useEffect(() => {
    console.log(keycloak);
  
    setQuestionnaireResponses([]);
    setResponses([]);
    // checkUserRoles();
  
    fetchQuestionnaire();
  
  }, [initialized, keycloak, setResponses, setQuestionnaireResponses, fetchQuestionnaire]);
  return (
    <div>
      {questionnaire ? (
        !probability ? (
          <QuestionnaireForm eventContinue={handleContinue} event={handleSave} questionnaire={questionnaire.resourceData}/>
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
