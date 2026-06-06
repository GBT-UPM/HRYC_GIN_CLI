


import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKeycloak } from '@react-keycloak/web';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, Typography } from "@mui/material";
import { Close, InfoOutlined } from "@mui/icons-material";
import ApiService from "../services/ApiService";

import QuestionnaireForm from "../components/QuestionnaireForm";

import { v4 as uuidv4 } from "uuid";

import ResponsesProbability from "../components/ResponsesProbability";
import { useNavigate } from "react-router-dom";
import { getAllowedCenters, getCentersDisplayLabel, getPrimaryRoleLabel, isSiteCoordinator, isStudyCoordinator } from "../utils/auth";
import { DEFAULT_CARE_SETTING, normalizeCareSetting } from "../utils/careSetting";
import { mapCenterToCode } from "../utils/caseMetadata";
import {
  recordStudyUsageEvent,
  STUDY_USAGE_EVENT_TYPES,
} from "../services/studyUsageEventService";
Chart.register(CategoryScale);

const HEADER_PAPER_SX = {
  p: { xs: 2, md: 2.5 },
  mb: 2,
  border: "1px solid #D9E2EC",
  borderRadius: 2,
  backgroundColor: "#FFFFFF",
};

const DIALOG_PAPER_SX = {
  borderRadius: "12px",
  border: "1px solid #D6E0EA",
  boxShadow: "0 8px 32px rgba(15, 23, 42, 0.12)",
};

const DIALOG_TITLE_SX = {
  fontWeight: 800,
  color: "#1F2933",
  fontSize: "1.05rem",
  borderBottom: "1px solid #EEF2F6",
  pb: 1.5,
  pr: 6,
};

const INFO_ROWS = [
  [
    "Propósito",
    "El cuestionario recoge información clínica y ecográfica estructurada para el estudio MIA.",
  ],
  [
    "NHC",
    "El NHC se utiliza únicamente para comprobaciones internas de pseudonimización y control de duplicados.",
  ],
  [
    "Privacidad",
    "El valor del NHC no debe mostrarse fuera de su campo ni incluirse en exportaciones.",
  ],
  [
    "Código de estudio",
    "Puede introducirse si está disponible o gestionarse posteriormente según el flujo actual.",
  ],
  [
    "Obligatorios",
    "Los campos marcados con asterisco son obligatorios.",
  ],
  [
    "Lógica condicional",
    "Algunas preguntas se muestran de forma condicional según respuestas previas.",
  ],
];

export const generateId = () => {
  return uuidv4(); // Genera un UUID único
};
export const generatePeriod = () => {
  const now = new Date(); // Momento actual
  const end = now.toISOString(); // Fin del período (momento actual)

  const start = new Date(now.getTime() - 15 * 60 * 1000).toISOString(); // Inicio: 15 minutos antes

  return { start, end };
};

const findAnswerByLinkId = (answers = [], linkId) =>
  answers.find((item) => item.linkId === linkId)?.answer?.[0] || null;

const resolveQuestionnaireCenterId = (answers = []) => {
  const answer = findAnswerByLinkId(answers, "HOSPITAL_REF");
  return mapCenterToCode(answer?.valueString || answer?.valueCoding?.display || "");
};

const resolveHasAdnexalMass = (answers = []) => {
  const answer = findAnswerByLinkId(answers, "PAT_MA");
  if (!answer) {
    return null;
  }

  const value = String(answer?.valueCoding?.display || answer?.valueCoding?.code || "").trim().toLowerCase();
  if (!value) {
    return null;
  }

  if (value === "sí" || value === "si" || value === "yes") {
    return true;
  }

  if (value === "no") {
    return false;
  }

  return null;
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [studyUsageFlowId, setStudyUsageFlowId] = useState(() => uuidv4());
  const hasRecordedQuestionnaireStartRef = useRef(false);
  const isRecordingQuestionnaireStartRef = useRef(false);


  //const {probability,setProbality}=useState(false);
  const [probability, setProbality] = useState(false);
  const navigate = useNavigate();
  const allowedCenters = useMemo(() => getAllowedCenters(keycloak), [keycloak]);
  const roleLabel = useMemo(() => getPrimaryRoleLabel(keycloak), [keycloak]);
  const centersLabel = useMemo(() => getCentersDisplayLabel(keycloak), [keycloak]);
  const visibleScopeLabel = useMemo(() => {
    if (isStudyCoordinator(keycloak) && allowedCenters.length === 0) {
      return "Vista global";
    }

    if (allowedCenters.length === 1) {
      return `Centro ${allowedCenters[0]}`;
    }

    if (allowedCenters.length > 1) {
      return "Centros autorizados";
    }

    return "Centro pendiente";
  }, [allowedCenters, keycloak]);

  const resetStudyUsageSession = useCallback(() => {
    setStudyUsageFlowId(uuidv4());
    hasRecordedQuestionnaireStartRef.current = false;
    isRecordingQuestionnaireStartRef.current = false;
  }, []);

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
  const handleQuestionnaireInteraction = useCallback(async (answers = []) => {
    if (!token || hasRecordedQuestionnaireStartRef.current || isRecordingQuestionnaireStartRef.current) {
      return;
    }

    const derivedCenterId =
      resolveQuestionnaireCenterId(answers) ||
      (allowedCenters.length === 1 ? allowedCenters[0] : "");

    if (!derivedCenterId) {
      return;
    }

    isRecordingQuestionnaireStartRef.current = true;

    try {
      await recordStudyUsageEvent(token, {
        eventType: STUDY_USAGE_EVENT_TYPES.questionnaireStarted,
        flowId: studyUsageFlowId,
        centerId: derivedCenterId,
        careSettingCode: normalizeCareSetting(careSetting?.code || careSetting).code,
        evaluationType: "PRIMARY",
        hasAdnexalMass: resolveHasAdnexalMass(answers),
        metadata: {
          source: "questionnaire_form",
        },
      });
      hasRecordedQuestionnaireStartRef.current = true;
    } catch (error) {
      console.error("[QuestionnaireScreen] No se pudo registrar QUESTIONNAIRE_STARTED:", error);
    } finally {
      isRecordingQuestionnaireStartRef.current = false;
    }
  }, [allowedCenters, careSetting, studyUsageFlowId, token]);
  const QBack = async (anwers) => {
    setQuestionnaireResponses([]);
    setResponses([]);
    setTransientNhc("");
    setStudyPatientCode("");
    setCareSetting(DEFAULT_CARE_SETTING);
    setHasUnsavedChanges(false);
    resetStudyUsageSession();
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
    resetStudyUsageSession();
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
    <Box sx={{ px: 0, py: 0 }}>
      <Paper elevation={0} sx={HEADER_PAPER_SX}>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: "#1F2933",
                  fontSize: { xs: "1.25rem", sm: "1.45rem", md: "1.6rem" },
                  fontWeight: 800,
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                Nuevo cuestionario ecográfico
              </Typography>
              <Typography variant="body2" sx={{ color: "#52616B", fontSize: "0.875rem", lineHeight: 1.4 }}>
                Registro estructurado de hallazgos clínicos y ecográficos para el estudio MIA.
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<InfoOutlined sx={{ fontSize: "1rem !important" }} />}
              onClick={() => setInfoOpen(true)}
              aria-label="Información del cuestionario"
              sx={{
                borderColor: "#D9E2EC",
                color: "#52616B",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                whiteSpace: "nowrap",
                py: 0.5,
                "&:hover": { borderColor: "#2F5D7C", color: "#1E3A5F", backgroundColor: "#F5F7FA" },
              }}
            >
              Información del cuestionario
            </Button>
          </Box>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            <Chip
              label={visibleScopeLabel}
              size="small"
              variant="outlined"
              sx={{ borderColor: "#2F5D7C", color: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem" }}
            />
            <Chip label={roleLabel} size="small" variant="outlined" sx={{ fontSize: "0.75rem" }} />
            {centersLabel && (
              <Chip label={`Centros: ${centersLabel}`} size="small" variant="outlined" sx={{ fontSize: "0.75rem" }} />
            )}
            <Chip label="Datos pseudonimizados" size="small" variant="outlined" sx={{ fontSize: "0.75rem" }} />
            {isSiteCoordinator(keycloak) && (
              <Chip label="Código pendiente permitido" size="small" variant="outlined" sx={{ fontSize: "0.75rem" }} />
            )}
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: DIALOG_PAPER_SX }}>
        <DialogTitle sx={DIALOG_TITLE_SX}>
          Información del cuestionario
          <Typography variant="body2" sx={{ color: "#52616B", fontWeight: 500, mt: 0.5 }}>
            Referencias de uso clínico y de privacidad para el registro ecográfico del estudio.
          </Typography>
          <IconButton
            onClick={() => setInfoOpen(false)}
            size="small"
            aria-label="Cerrar"
            sx={{ position: "absolute", right: 12, top: 12, color: "#52616B" }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2.5, py: 1.5 }}>
          <Stack spacing={0}>
            {INFO_ROWS.map(([label, value], index) => (
              <Box
                key={label}
                sx={{ py: 1.25, borderBottom: index < INFO_ROWS.length - 1 ? "1px solid #EEF2F6" : "none" }}
              >
                <Typography variant="caption" sx={{ color: "#52616B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ color: "#1F2933", fontWeight: 600, mt: 0.25 }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.25 }}>
          <Button onClick={() => setInfoOpen(false)} size="small" sx={{ textTransform: "none", color: "#1E3A5F", fontWeight: 700 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

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
              onQuestionnaireInteraction={handleQuestionnaireInteraction}
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
              studyUsageFlowId={studyUsageFlowId}
              onCaseSaved={() => {
                setStudyPatientCode("");
                setHasUnsavedChanges(false);
                resetStudyUsageSession();
              }}
            />
        )
      ) : (
        null
      )}
    </Box>
  );
}
