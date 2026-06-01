


import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";

import { useCallback, useEffect, useState } from "react";
import { useKeycloak } from '@react-keycloak/web';
import ApiService from "../services/ApiService";

import QuestionnaireForm from "../components/QuestionnaireForm";

import { v4 as uuidv4 } from "uuid";

import ResponsesProbability from "../components/ResponsesProbability";
import { useNavigate } from "react-router-dom";
import { isSiteCoordinator } from "../utils/auth";
import { DEFAULT_CARE_SETTING, normalizeCareSetting } from "../utils/careSetting";
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
  const token = keycloak?.token;
  const [questionnaire, setQuestionnaire] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [responses, setResponses] = useState([]);
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
  const [transientNhc, setTransientNhc] = useState("");
  const [studyPatientCode, setStudyPatientCode] = useState("");
  const [careSetting, setCareSetting] = useState(DEFAULT_CARE_SETTING);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);


  //const {probability,setProbality}=useState(false);
  const [probability, setProbality] = useState(false);
  const navigate = useNavigate();
  const fetchQuestionnaire = useCallback(async () => {
    if (!token) {
      if (process.env.NODE_ENV === "development") {
        console.log("[QuestionnaireScreen] skip fetchQuestionnaire: token not available", {
          initialized,
          authenticated: keycloak?.authenticated,
          hasToken: Boolean(token),
        });
      }
      return;
    }

    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[QuestionnaireScreen] fetching questionnaire", {
          baseUrl: process.env.REACT_APP_API_BASE_URL,
          keycloakUrl: process.env.REACT_APP_KEYCLOAK_URL,
          realm: process.env.REACT_APP_KEYCLOAK_REALM,
          clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID,
          authenticated: keycloak?.authenticated,
          hasToken: Boolean(token),
          tokenPrefix: token.slice(0, 12),
          tokenRealmRoles: keycloak?.tokenParsed?.realm_access?.roles || [],
          allowedCenters: keycloak?.tokenParsed?.allowed_centers,
          issuer: keycloak?.tokenParsed?.iss,
          audience: keycloak?.tokenParsed?.aud,
          authorizedParty: keycloak?.tokenParsed?.azp,
        });
      }

      const response = await ApiService(
        token,
        'GET',
        `/fhir/Questionnaire?name=registro_ginecologico`,
        {}
      );

      if (process.env.NODE_ENV === "development") {
        console.log("[QuestionnaireScreen] questionnaire response", {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
        });
      }
  
      if (response.status === 200) {
          const data = await response.json();
        if (data && data.length > 0) {
          setQuestionnaire(data[0]);
        }
      } else {
      throw new Error(`Error en la respuesta: ${response.status}`);
    }
  } catch (error) {
      console.error("[QuestionnaireScreen] Error al obtener el cuestionario:", error);
      setError("Error al obtener los datos del paciente.");
    }
  }, [initialized, keycloak, token, setQuestionnaire, setError]);
  const handleSave = async (anwers) => {
    // const confirmSave = window.confirm("¿Está seguro de que desea guardar las respuestas?");
    // if (!confirmSave) return;
    const questionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      id: generateId(),
      item: anwers,
    };
    // Misma idea: NO uses .push, haz un spread
    setQuestionnaireResponses((prev) => [...prev, questionnaireResponse]);
    setHasUnsavedChanges(true);

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
    // Agregar sin mutar el estado
    setQuestionnaireResponses((prev) => [...prev, questionnaireResponse]);
    setHasUnsavedChanges(true);
  };
  const QBack = async (anwers) => {
    setQuestionnaireResponses([]);
    setResponses([]);
    setTransientNhc("");
    setStudyPatientCode("");
    setCareSetting(DEFAULT_CARE_SETTING);
    setHasUnsavedChanges(false);
    // checkUserRoles();

    fetchQuestionnaire();
    setProbality(false);
 
    
        navigate('/');
    
  }

  useEffect(() => {
    if (!initialized || !keycloak?.authenticated || !token) {
      return;
    }

    setQuestionnaireResponses([]);
    setResponses([]);
    setTransientNhc("");
    setStudyPatientCode("");
    setCareSetting(DEFAULT_CARE_SETTING);
    setHasUnsavedChanges(false);
    // checkUserRoles();
  
    fetchQuestionnaire();
  
  }, [initialized, keycloak?.authenticated, token, setResponses, setQuestionnaireResponses, fetchQuestionnaire]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) {
        return undefined;
      }

      const message = "Hay cambios sin guardar. Si sale de esta pantalla, se perderá la información introducida.";
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div>
      {questionnaire ? (
        !probability ? (
	          <QuestionnaireForm
              eventContinue={handleContinue}
              event={handleSave}
              token={token}
              questionnaire={questionnaire.resourceData}
              transientNhc={transientNhc}
              onTransientNhcChange={setTransientNhc}
              studyPatientCode={studyPatientCode}
              onStudyPatientCodeChange={setStudyPatientCode}
              canEnterStudyPatientCode={isSiteCoordinator(keycloak)}
              careSettingCode={careSetting.code}
              onCareSettingChange={(nextCareSetting) =>
                setCareSetting(normalizeCareSetting(nextCareSetting?.code || nextCareSetting))
              }
              onDirtyChange={setHasUnsavedChanges}
            />
	        ) : (
	          // <ResponsesSummary event={QBack} responses={responses} />
	          <ResponsesProbability
              responses={questionnaireResponses}
              event={QBack}
              transientNhc={transientNhc}
              onClearTransientNhc={() => setTransientNhc("")}
              studyPatientCode={studyPatientCode}
              canUseStudyPatientCode={isSiteCoordinator(keycloak)}
              careSetting={careSetting}
              onCaseSaved={() => {
                setStudyPatientCode("");
                setHasUnsavedChanges(false);
              }}
            />
        )
      ) : (
        null
      )}
    </div>
  );
}
