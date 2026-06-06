import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import '../assets/css/ResponsesSummary.css';

import '../assets/css/ResponsesProbability.css';
import Modal from "./Modal";

import { useKeycloak } from '@react-keycloak/web';
import { useEncounterTemplate } from "../hooks/useEncounterTemplate";
import { useObservationTemplate } from "../hooks/useObservationTemplate";
import { useImageStudyTemplate } from "../hooks/useImageStudyTemplate";
import ApiService from '../services/ApiService';
import { generateId } from '../screens/QuestionnaireScreen';
import { generatePeriod } from '../screens/QuestionnaireScreen';
import { useRiskAssessmentTemplate } from '../hooks/useRiskAssessmentTemplate';
import { usePatientTemplate } from '../hooks/usePatientTemplate';
import { maskNhc, sanitizeQuestionnaireResponse } from '../utils/privacy';
import {
  formatCodeStatusLabel,
  resolveDisplayStudyIdentifier,
  resolveStudyCodeDisplay,
  validateCaseMetadata,
} from '../utils/caseMetadata';
import { DEFAULT_CARE_SETTING, getCareSettingDisplay, normalizeCareSetting } from '../utils/careSetting';
import { generateClinicalReportPdf } from '../utils/pdfReport';
import { calculateEcoScoreFromQuestionnaireResponse, ECO_SCORE_STATUS, extractEcoScoreInputs } from '../utils/ecoScore';
import { formatProbabilityFromDecimal } from '../utils/riskDisplay';
import {
  addSecondaryEvaluation,
  checkDuplicateCase,
  createCase,
  CASE_ERROR_MESSAGES,
} from '../services/caseService';
import { upsertEcoScoreResult } from '../services/ecoScoreResultService';
import {
  recordStudyUsageEvent,
  STUDY_USAGE_EVENT_TYPES,
} from '../services/studyUsageEventService';

  const tipoMap = {
    'sólida': 'sólido',
    'quística': 'quístico',
    'sólido-quística': 'sólido-quístico'
  };

const ECO_SCORE_FORMULA_VERSION = "ECO_SCORE_V1";

const getDuplicateMatches = (duplicateResult) => {
  if (Array.isArray(duplicateResult)) return duplicateResult;

  const matches =
    duplicateResult?.matches ||
    duplicateResult?.duplicates ||
    duplicateResult?.cases ||
    duplicateResult?.data ||
    [];

  if (Array.isArray(matches)) return matches;

  if (
    duplicateResult?.duplicate ||
    duplicateResult?.hasDuplicate ||
    duplicateResult?.hasDuplicates ||
    duplicateResult?.exists ||
    duplicateResult?.caseId
  ) {
    return [matches || duplicateResult.case || duplicateResult.caseRecord || duplicateResult];
  }

  return [];
};

const getSafeSaveErrorMessage = (error) => {
  if (
    error?.message === CASE_ERROR_MESSAGES.forbidden ||
    error?.message === CASE_ERROR_MESSAGES.studyCodeConflict ||
    error?.message === CASE_ERROR_MESSAGES.unauthorized
  ) {
    return error.message;
  }

  return CASE_ERROR_MESSAGES.network;
};

const ResponsesProbability = ({
  responses,
  event,
  transientNhc,
  onClearTransientNhc,
  studyPatientCode = "",
  canUseStudyPatientCode = false,
  careSetting = DEFAULT_CARE_SETTING,
  studyUsageFlowId = "",
  onCaseSaved = () => {},
}) => {
  const normalizedCareSetting = normalizeCareSetting(careSetting?.code || careSetting);
  const [reports, setReports] = useState([]);
  const [observations, setObservations] = useState([]);
  //nuevo
  // eslint-disable-next-line no-unused-vars
  const [probality, setProbality] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [encounterId, setEncounterId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [includeProbability, setIncludeProbability] = useState(false);
  const [mass, setMass] = useState(false);
  const [sco, setSco] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState(null);
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [selectedDuplicateCaseId, setSelectedDuplicateCaseId] = useState("");
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [isSaveConfirmationOpen, setIsSaveConfirmationOpen] = useState(false);
  const [pendingSaveRequest, setPendingSaveRequest] = useState(null);
  const [isStudyCodeConflictOpen, setIsStudyCodeConflictOpen] = useState(false);
  const [studyCodeConflictRequest, setStudyCodeConflictRequest] = useState(null);
  const [correctedStudyPatientCode, setCorrectedStudyPatientCode] = useState("");
  const [studyCodeConflictError, setStudyCodeConflictError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const { keycloak } = useKeycloak();
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  const { generateEncounter } = useEncounterTemplate();
  const { generateObservation } = useObservationTemplate();
  const { generateImagingStudy } = useImageStudyTemplate();
  const { generateRiskAssessment } = useRiskAssessmentTemplate();
  const { generatePatient } = usePatientTemplate();

  const effectiveStudyPatientCode = canUseStudyPatientCode
    ? String(studyPatientCode || "").trim()
    : "";
  const reportMetadata = (() => {
    try {
      return validateCaseMetadata(sanitizeQuestionnaireResponse(responses?.[0] || {}));
    } catch (validationError) {
      return {
        centerId: "",
        lateralityDisplay: "",
        anatomicalStructureDisplay: "",
        massIndex: responses?.length ? 1 : 0,
      };
    }
  })();
  const reportCenterId = reportMetadata.centerId || "";
  const reportMassCount = reports.length || responses?.length || 0;
  const reportStudyCodeLabel = effectiveStudyPatientCode || "Pendiente";

  const selectedDuplicateMatch = duplicateMatches.find(
    (match) => String(match?.caseId || match?.id || "") === String(selectedDuplicateCaseId || "")
  ) || duplicateMatches[0];

  const duplicateModalMessage = (() => {
    if (!selectedDuplicateMatch) {
      return "";
    }

    if (selectedDuplicateMatch.codeStatus === "CODE_ASSIGNED") {
      return selectedDuplicateMatch.studyPatientCode
        ? `El caso seleccionado ya tiene código de estudio asignado: ${selectedDuplicateMatch.studyPatientCode}.`
        : "El caso seleccionado ya tiene código de estudio asignado.";
    }

    if (selectedDuplicateMatch.codeStatus === "PENDING_CODE" && effectiveStudyPatientCode) {
      return "Se añadirá una evaluación secundaria al caso existente y se asignará el código de estudio indicado.";
    }

    if (selectedDuplicateMatch.codeStatus === "PENDING_CODE") {
      return "Se añadirá una evaluación secundaria al caso existente y el caso seguirá pendiente de código de estudio.";
    }

    return "";
  })();

  const getDuplicateCaseIdentifier = (match) =>
    resolveDisplayStudyIdentifier(match) || `Caso ${match?.caseId || match?.id || "sin identificador"}`;

  const getDuplicateCaseStudyCode = (match) =>
    match?.codeStatus === "CODE_ASSIGNED" ? resolveStudyCodeDisplay(match) : "";

  const getDuplicateCaseDate = (match) =>
    match?.createdAt ? new Date(match.createdAt).toLocaleDateString("es-ES") : "No disponible";

  const getDuplicateCaseCenterScope = (match) => {
    const center = match?.centerId || match?.center || match?.centerName || "";
    const careSetting =
      match?.careSettingDisplay ||
      (match?.careSettingCode ? getCareSettingDisplay(match.careSettingCode) : "");

    if (center && careSetting) {
      return `${center} · ${careSetting}`;
    }

    return center || careSetting || "No disponible";
  };


  // Verifica si hay masa anexial
  // const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";
  // const calcularScore = responses[0]?.item?.some(resp => resp.linkId?.toLowerCase() === "MA_PROB".toLowerCase() && resp.answer?.[0]?.valueCoding?.display !== "No");

  /* // Función para renderizar las respuestas 
  const renderAnswer = (answer) => {
    if (answer.valueCoding) {
      return `${answer.valueCoding.display} (${answer.valueCoding.code})`;
    }
    if (answer.valueDecimal !== undefined) {
      return answer.valueDecimal;
    }
    if (answer.valueString) {
      return answer.valueString;
    }
    if (answer.valueDate) {
      return answer.valueDate;
    }
    // Añadir más tipos de respuesta según sea necesario
    return JSON.stringify(answer);
  }; */

  const generateReport = useCallback((res) => {

    const getValue = (id) => {
      const response = res.item.find((resp) => resp.linkId.toLowerCase() === id.toLowerCase());

      if (response && response.answer.length > 0) {

        const answer = response.answer[0];

        // Determinar el tipo de valor presente en la respuesta
        if (answer.valueCoding && answer.valueCoding.display) {
          return answer.valueCoding.display.toLowerCase(); // Campo display de valueCoding
        } else if (answer.valueString) {
          return answer.valueString.toLowerCase(); // Campo valueString
        } else if (answer.valueInteger !== undefined) {
          return answer.valueInteger.toString(); // Campo valueInteger convertido a string
        } else if (answer.valueDate) {
          return answer.valueDate; // Campo valueDate como está (ya es un string)
        }else if (answer.valueDecimal) {
          return answer.valueDecimal.toString(); // Campo valueDecimal convertido a string
        }
      }
      return '';  //Si no encuentra nada.
    };

    const PAT_MA = getValue('PAT_MA');
    const MA_TIPO = getValue('MA_TIPO');
    const MA_ESTRUCTURA = getValue('MA_ESTRUCTURA');
    const MA_LADO = getValue('MA_LADO');
    const MA_M1 = getValue('MA_M1');
    const MA_M2 = getValue('MA_M2');
    const MA_M3 = getValue('MA_M3');
    const volumen = ((parseFloat(MA_M1) * parseFloat(MA_M2) * parseFloat(MA_M3) * 0.52)/1000);
    const MA_VOL = volumen < 0.01 ? volumen.toFixed(3) : volumen.toFixed(2); // Volumen en cm³
    const MA_SOL_CONTORNO = getValue('MA_SOL_CONTORNO');
    const MA_CONTENIDO = getValue('MA_CONTENIDO');
    const MA_CONTENIDO_OTRO = getValue('MA_CONTENIDO_OTRO'); // Otro contenido.
    const MA_SOL_VASC = getValue('MA_SOL_VASC');
    const MA_Q_CONTORNO = getValue('MA_Q_CONTORNO');
    const MA_Q_GROSOR = getValue('MA_Q_GROSOR');
    const MA_Q_VASC = getValue('MA_Q_VASC');
    const MA_PAPS = getValue('MA_PAPS');     //Presencia de papilas.
    const MA_Q_P = getValue('MA_Q_P');       // Número de papilas.
    const MA_Q_P_M1 = getValue('MA_Q_P_M1');
    const MA_Q_P_M2 = getValue('MA_Q_P_M2');
    const MA_Q_P_CONTORNO = getValue('MA_Q_P_CONTORNO');
    const MA_Q_P_VASC = getValue('MA_Q_P_VASC');
    const MA_Q_T = getValue('MA_Q_T');
    const MA_Q_T_TIPO = getValue('MA_Q_T_TIPO');
    const MA_Q_T_GROSOR = getValue('MA_Q_T_GROSOR');
    const MA_Q_T_VASC = getValue('MA_Q_T_VASC');
    const MA_Q_T_N = getValue('MA_Q_T_N');
    const MA_Q_AS = getValue('MA_Q_AS');
    const MA_Q_AS_N = getValue('MA_Q_AS_N');
    const MA_Q_AS_M1 = getValue('MA_Q_AS_M1');
    const MA_Q_AS_M2 = getValue('MA_Q_AS_M2');
    const MA_Q_AS_M3 = getValue('MA_Q_AS_M3');
    const MA_Q_AS_VASC = getValue('MA_Q_AS_VASC');
    const MA_SA = getValue('MA_SA');
    const MA_PS = getValue('MA_PS');
    const MA_PS_M1 = getValue('MA_PS_M1');
    const MA_PS_M2 = getValue('MA_PS_M2');
    const MA_PS_M3 = getValue('MA_PS_M3');
    const MA_ASC = getValue('MA_ASC');
    const MA_ASC_TIPO = getValue('MA_ASC_TIPO');
    const MA_CARC = getValue('MA_CARC');
    //const MA_PROB = getValue('MA_PROB'); //¿Quiere calcular la probabilidad?


    const ecoScore = calculateEcoScoreFromQuestionnaireResponse(res);

    //Construcción del informe
    let report = '';

     if (PAT_MA === 'no') {   //Si NO hay masa anexial
      const OD_M1 = getValue('OD_M1');
      const OD_M2 = getValue('OD_M2');
      const OD_FOL = getValue('OD_FOL');
      const OI_M1 = getValue('OI_M1');
      const OI_M2 = getValue('OI_M2');
      const OI_FOL = getValue('OI_FOL');

      report += `Anejo derecho de ${OD_M1} x ${OD_M2} mm con ${OD_FOL} folículo/s.<br/>`;
      report += `Anejo izquierdo de ${OI_M1} x ${OI_M2} mm con ${OI_FOL} folículo/s.<br/>`;

      return {
        text: report,
        ecoScoreStatus: ecoScore.status,
        missingEcoScoreVariables: ecoScore.missingVariables,
      };
    } else {  //Si SÍ hay masa anexial
        const estructurasFemeninas = ['trompa'];
        if (['sólida', 'quística', 'sólido-quística'].includes(MA_TIPO)) {
          let dependencia = '';
          const contorno = MA_TIPO === 'sólida' ? MA_SOL_CONTORNO : MA_Q_CONTORNO;

          // Vascularización sólo para masas sólidas
          let vascularizacion_MA_SOL = '';
          if (MA_TIPO === 'sólida') {
            vascularizacion_MA_SOL = MA_SOL_VASC === 'ninguno (score color 1)' 
              ? ' Es <b>avascular</b>.' 
              : ` Su grado de vascularización es <b>${MA_SOL_VASC}</b>.`;
          }
          if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {   //Estructura o lateralidad INDEFINIDAS
            dependencia = 'De dependencia <b>indefinida</b>';
          } else {
            const estructura = MA_ESTRUCTURA;
            const lado = estructurasFemeninas.includes(estructura) 
              ? (MA_LADO === 'derecho' ? 'derecha' : MA_LADO === 'izquierdo' ? 'izquierda' : MA_LADO) : MA_LADO;
            dependencia = `Dependiente de <b>${estructura}</b> <b>${lado}</b>`;
          }
          const contenido = MA_CONTENIDO === 'otro' ? MA_CONTENIDO_OTRO : MA_CONTENIDO;
          const tipoMasculino = tipoMap[MA_TIPO] || MA_TIPO;
          report += `${dependencia}, se objetiva formación de <b>${MA_M1} x ${MA_M2} x ${MA_M3} mm</b> <b>(${MA_VOL} cm³)</b> de aspecto <b>${tipoMasculino}</b> de contorno <b>${contorno}</b> y de contenido <b>${contenido}</b>.${vascularizacion_MA_SOL}<br/>`;
          
          // Información adicional para masas quísticas y sólido-quísticas
          let vascularizacion_MA_Q = '';	
          if (MA_TIPO === 'quística' || MA_TIPO === 'sólido-quística') {
            vascularizacion_MA_Q = MA_Q_VASC === 'ninguno (score color 1)' 
              ? ' y es <b>avascular</b>' 
              : ` y su grado de vascularización es <b>${MA_Q_VASC}</b>`;
            report += `La pared mide <b>${MA_Q_GROSOR} mm</b>${vascularizacion_MA_Q}. El contorno es <b>${MA_Q_CONTORNO}</b>.<br/>`;
            // Papilas
            let vascularizacion_papila = '';
            vascularizacion_papila = MA_Q_P_VASC === 'ninguno (score color 1)'
              ? '<b>avascular</b>'
              : `con grado de vascularización <b>${MA_Q_P_VASC}</b>`;
            if (MA_PAPS === 'sí') {    
              report += `Contiene <b>${MA_Q_P} papila/s</b>, la mayor de ellas de <b>${MA_Q_P_M1} x ${MA_Q_P_M2} mm</b> de morfología <b>${MA_Q_P_CONTORNO}</b> y ${vascularizacion_papila}</b>.<br/>`;
            }
            //Tabiques.
            let vascularizacion_tabiques = '';
            vascularizacion_tabiques= MA_Q_T_VASC === 'ninguno (score color 1)' 
              ? ' y <b>avasculares</b>' 
              : ` y su grado de vascularización es <b>${MA_Q_T_VASC}</b>`;
            if (MA_Q_T === 'sí') {      
              report += `Los tabiques son <b>${MA_Q_T_TIPO}</b>, de grosor <b>${MA_Q_T_GROSOR} mm</b>${vascularizacion_tabiques}</b>. La formación tiene <b>${MA_Q_T_N} lóculo/s</b>.<br/>`;
            }
            //Área sólida.
            let vascularizacion_AS = '';
            vascularizacion_AS= MA_Q_AS_VASC === 'ninguno (score color 1)' 
              ? 'y es <b>avascular</b>' 
              : `con grado de vascularización <b>${MA_Q_AS_VASC}</b>`;
            if (MA_Q_AS === 'sí') {   
              report += `Contiene <b>${MA_Q_AS_N} porción/es sólida/s</b>, la mayor de ellas tiene un tamaño de <b>${MA_Q_AS_M1} x ${MA_Q_AS_M2} x ${MA_Q_AS_M3} mm</b> ${vascularizacion_AS}.<br/>`;
            }
          }
          //Esto ya no depende del tipo de masa anexial.
          if (MA_SA === 'sí') {   //Sombra acústica posterior.
            report += `Presenta sombra posterior.<br/>`;
          }
          if (MA_PS === 'sí') {   //Parénquima ovárico sano.
            report += `Tiene parénquima ovárico sano, de tamaño <b>${MA_PS_M1} x ${MA_PS_M2} x ${MA_PS_M3} mm</b>.<br/>`;
          }
          if (MA_ASC === 'sí') {    //Ascitis.
            report += `Presenta ascitis <b>${MA_ASC_TIPO}</b>.<br/>`;
          }
          if (MA_CARC === 'sí') {   //Carcinomatosis.
            report += 'Hay carcinomatosis.<br/>';
          }
        }
    }
    return {
      text: report,
      score: ecoScore.score,
      probability: ecoScore.probability,
      text_score: ecoScore.text_score,
      ecoScoreStatus: ecoScore.status,
      missingEcoScoreVariables: ecoScore.missingVariables,
    };
  }, []);
  useEffect(() => {
    if (!responses || responses.length === 0) return;

    const generated = responses.map((r) => generateReport(r));
    const hasMassInReports = generated.some(
      (report) => report.ecoScoreStatus !== ECO_SCORE_STATUS.NOT_APPLICABLE
    );
    const hasCalculatedScore = generated.some(
      (report) => report.ecoScoreStatus === ECO_SCORE_STATUS.CALCULATED
    );

    setMass(hasMassInReports);
    setSco(hasCalculatedScore);

    setReports(generated);
  }, [responses, generateReport]);

  // Función para generar el informe médico

  /**
   * Maneja el cambio de texto en la observación del reporte de índice `index`.
   */
  const handleObservationChange = (index, newValue) => {
    setObservations((prev) => {
      const updated = [...prev];
      updated[index] = newValue;
      return updated;
    });
  };
  /**
   * Ejemplo de función que maneje el click del botón en cada reporte.
   * Podrías hacer lo que necesites (guardar, eliminar, etc.)
   */
  const clearTransientCaseState = () => {
    onClearTransientNhc();
    setPendingDuplicate(null);
    setDuplicateMatches([]);
    setSelectedDuplicateCaseId("");
    setIsDuplicateModalOpen(false);
    setStudyCodeConflictRequest(null);
    setCorrectedStudyPatientCode("");
    setStudyCodeConflictError("");
    setIsStudyCodeConflictOpen(false);
  };

  const clearDuplicateModalState = () => {
    setPendingDuplicate(null);
    setDuplicateMatches([]);
    setSelectedDuplicateCaseId("");
    setIsDuplicateModalOpen(false);
  };

  const countMassesInResponses = useCallback(
    (preparedResponses = []) => preparedResponses.filter((item) => item?.metadata?.hasAdnexalMass).length,
    []
  );

  const safelyRecordStudyUsageEvent = useCallback(async (payload) => {
    if (!keycloak.token) {
      return null;
    }

    try {
      return await recordStudyUsageEvent(keycloak.token, payload);
    } catch (usageError) {
      console.error("No se pudo registrar el evento de uso:", usageError);
      return null;
    }
  }, [keycloak.token]);

  const buildPreparedQuestionnaireResponses = () => {
    return responses.map((qResponse) => {
      const sanitizedQuestionnaireResponse = sanitizeQuestionnaireResponse(qResponse);
      const metadata = validateCaseMetadata(sanitizedQuestionnaireResponse);

      if (!metadata.isValid) {
        throw new Error(metadata.errors.join(" "));
      }

      return {
        questionnaireResponse: sanitizedQuestionnaireResponse,
        metadata,
      };
    });
  };

  const createPersistenceContext = async (centerId, careSettingCode) => {
    try {
      const body = {
        action: "SAVE_QUESTIONNAIRE",
        details: "Usuario guarda cuestionario",
        durationMs: 0
      }
      const res = await ApiService(keycloak.token, 'POST', `/audit/register`, body);
      if (process.env.NODE_ENV === "development") {
        console.debug("Audit status:", res.status);
      }
    } catch (error) {
      console.error("Error al auditar el inicio de cuestionario:", error);
    }

    const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";

    const patientId = generateId();
    const Patient = generatePatient(patientId);
    const patient = await ApiService(keycloak.token, 'POST', `/fhir/Patient/check-or-create`, Patient);
    if (!patient.ok) {
      throw new Error(`Error en patient: ${patient.status}`);
    }

    const encId = generateId();
    const imgStuId = generateId();
    const serieId = generateId();
    setEncounterId(encId);
    const Encounter = generateEncounter({
      encId,
      patientId,
      period: generatePeriod(),
      centerId,
      careSettingCode,
    });
    const ImageStudy = generateImagingStudy(imgStuId, encId, patientId, serieId);

    const encounter = await ApiService(keycloak.token, 'POST', `/fhir/Encounter`, Encounter);
    if (encounter.status !== 200) {
      throw new Error(`Error en el encounter: ${encounter.status}`);
    }

    const imageStudy = await ApiService(keycloak.token, 'POST', `/fhir/ImagingStudy`, ImageStudy);
    if (process.env.NODE_ENV === "development") {
      console.debug("ImageStudy status:", imageStudy.status);
    }

    return {
      hasMassInReports,
      patientId,
      encId,
      imgStuId,
    };
  };

  const openStudyCodeConflictModal = (request, failedCode = "") => {
    setStudyCodeConflictRequest(request);
    setCorrectedStudyPatientCode(failedCode);
    setStudyCodeConflictError("");
    setIsStudyCodeConflictOpen(true);
  };

  const runDuplicateChecks = async ({ nhc, options, preparedResponses, decisions = {}, startIndex = 0 }) => {
    for (let index = startIndex; index < preparedResponses.length; index++) {
      const { metadata } = preparedResponses[index];

      if (!metadata.hasAdnexalMass) {
        continue;
      }

      const duplicateResult = await checkDuplicateCase(keycloak.token, {
        centerId: metadata.centerId,
        nhc,
        lateralityCode: metadata.lateralityCode,
        lateralityDisplay: metadata.lateralityDisplay,
        anatomicalStructureCode: metadata.anatomicalStructureCode,
        anatomicalStructureDisplay: metadata.anatomicalStructureDisplay,
      });
      const matches = getDuplicateMatches(duplicateResult);

      if (matches.length > 0) {
        setPendingDuplicate({
          nhc,
          options,
          preparedResponses,
          decisions,
          index,
        });
        setDuplicateMatches(matches);
        setSelectedDuplicateCaseId(String(matches[0]?.caseId || matches[0]?.id || ""));
        setIsDuplicateModalOpen(true);
        return;
      }
    }

    await persistCaseFlow({ nhc, options, preparedResponses, decisions });
  };

  const beginCaseSave = async (options) => {
    const nhc = transientNhc.trim();
    if (!nhc) {
      setError("Debe introducir el NHC para continuar.");
      return;
    }

    try {
      setError(null);
      const preparedResponses = buildPreparedQuestionnaireResponses();
      setPendingSaveRequest({
        nhc,
        options: options || { shouldPrint: false, includeProbability: false },
        preparedResponses,
      });
      setIsSaveConfirmationOpen(true);
    } catch (error) {
      setError(error.message || "Error al preparar el guardado del caso.");
    }
  };

  const confirmCaseSave = async () => {
    if (!pendingSaveRequest) return;

    try {
      setSaveInProgress(true);
      setError(null);
      setIsSaveConfirmationOpen(false);
      await runDuplicateChecks(pendingSaveRequest);
      setPendingSaveRequest(null);
    } catch (error) {
      setError(error.message || CASE_ERROR_MESSAGES.network);
    } finally {
      setSaveInProgress(false);
    }
  };

  const handleDuplicateDecision = async (type) => {
    if (!pendingDuplicate) return;

    const selectedCaseId = selectedDuplicateCaseId || duplicateMatches[0]?.caseId || duplicateMatches[0]?.id;
    if (type === "secondary" && !selectedCaseId) {
      setError("Debe seleccionar un caso existente para añadir la evaluación secundaria.");
      return;
    }

    const decisions = {
      ...pendingDuplicate.decisions,
      [pendingDuplicate.index]: type === "secondary"
        ? { type, caseId: selectedCaseId }
        : { type },
    };

    const nextRequest = {
      ...pendingDuplicate,
      decisions,
      startIndex: pendingDuplicate.index + 1,
    };

    setIsDuplicateModalOpen(false);
    setPendingDuplicate(null);

    try {
      setSaveInProgress(true);
      await runDuplicateChecks(nextRequest);
    } catch (error) {
      setError(error.message || "Error al resolver duplicados.");
      clearDuplicateModalState();
    } finally {
      setSaveInProgress(false);
    }
  };

  const cancelStudyCodeConflictModal = () => {
    setIsStudyCodeConflictOpen(false);
    setStudyCodeConflictError("");
  };

  const retrySaveWithCorrectedStudyCode = async () => {
    if (!studyCodeConflictRequest) return;

    try {
      setSaveInProgress(true);
      setError(null);
      setStudyCodeConflictError("");
      await persistCaseFlow({
        ...studyCodeConflictRequest,
        studyPatientCodeOverride: correctedStudyPatientCode,
      });
    } catch (error) {
      setStudyCodeConflictError(getSafeSaveErrorMessage(error));
    } finally {
      setSaveInProgress(false);
    }
  };

  const saveWithoutStudyCode = async () => {
    if (!studyCodeConflictRequest) return;

    try {
      setSaveInProgress(true);
      setError(null);
      setStudyCodeConflictError("");
      await persistCaseFlow({
        ...studyCodeConflictRequest,
        studyPatientCodeOverride: null,
        successMessage: "El caso se ha guardado como pendiente de código de estudio.",
      });
    } catch (error) {
      setStudyCodeConflictError(getSafeSaveErrorMessage(error));
    } finally {
      setSaveInProgress(false);
    }
  };

  const persistCaseFlow = async ({
    nhc,
    options,
    preparedResponses,
    decisions,
    startIndex = 0,
    persistenceContext = null,
    studyPatientCodeOverride,
    successMessage = "",
  }) => {
    try {
      setProbality(true);

      const contextCenterId = preparedResponses[startIndex]?.metadata?.centerId || preparedResponses[0]?.metadata?.centerId;
      const context = persistenceContext || await createPersistenceContext(contextCenterId, normalizedCareSetting.code);
      const { patientId, encId, imgStuId } = context;
      const savedUsageContext = [];
      const requestStudyPatientCode =
        canUseStudyPatientCode && studyPatientCodeOverride !== null
          ? String((studyPatientCodeOverride ?? studyPatientCode) || "").trim()
          : "";

      for (let index = startIndex; index < preparedResponses.length; index++) {
        const preparedResponse = preparedResponses[index];
        try {
          const sanitizedQuestionnaireResponse = sanitizeQuestionnaireResponse({
            ...preparedResponse.questionnaireResponse,
            partOf: [
              {
                reference: `Encounter/${encId}`
              }
            ],
            subject: {
              reference: `Patient/${patientId}`
            },
            encounter: {
              reference: `Encounter/${encId}`
            },
          });

          const decision = decisions[index];
          const caseResponse = decision?.type === "secondary"
            ? await addSecondaryEvaluation(keycloak.token, decision.caseId, {
                questionnaireResponse: sanitizedQuestionnaireResponse,
                encounterId: encId,
                observerInitials: preparedResponse.metadata.observerInitials,
                careSettingCode: normalizedCareSetting.code,
                careSettingDisplay: normalizedCareSetting.display,
                studyPatientCode: requestStudyPatientCode || undefined,
              })
            : await createCase(keycloak.token, {
                centerId: preparedResponse.metadata.centerId,
                nhc,
                lateralityCode: preparedResponse.metadata.lateralityCode,
                lateralityDisplay: preparedResponse.metadata.lateralityDisplay,
                anatomicalStructureCode: preparedResponse.metadata.anatomicalStructureCode,
                anatomicalStructureDisplay: preparedResponse.metadata.anatomicalStructureDisplay,
                hasAdnexalMass: preparedResponse.metadata.hasAdnexalMass,
                questionnaireResponse: sanitizedQuestionnaireResponse,
                encounterId: encId,
                observerInitials: preparedResponse.metadata.observerInitials,
                studyPatientCode: requestStudyPatientCode || undefined,
                careSettingCode: normalizedCareSetting.code,
                careSettingDisplay: normalizedCareSetting.display,
              });

          const questionnaireResponseId = caseResponse.questionnaireResponseFhirId;
          const evaluationId = caseResponse.evaluationId;
          if (!questionnaireResponseId) {
            throw new Error("El backend no devolvió questionnaireResponseFhirId.");
          }
          if (!evaluationId) {
            throw new Error("El backend no devolvió evaluationId.");
          }

          const obsId = generateId();
          const ObservationImagen = generateObservation(obsId, encId, patientId, imgStuId, observations[index]);
          await ApiService(keycloak.token, 'POST', `/fhir/Observation`, ObservationImagen);
          let riskAssessmentFhirId = null;
          if (reports[index]?.ecoScoreStatus === ECO_SCORE_STATUS.CALCULATED) {
            const riskId = generateId();
            const RiskAssessment = generateRiskAssessment(
              riskId,
              encId,
              patientId,
              null,
              reports[index].probability,
              "",
              questionnaireResponseId
            );
            await ApiService(keycloak.token, 'POST', `/fhir/RiskAssessment`, RiskAssessment);
            riskAssessmentFhirId = riskId;
          }
          await upsertEcoScoreResult(keycloak.token, evaluationId, {
            questionnaireResponseFhirId: questionnaireResponseId,
            riskAssessmentFhirId,
            status: reports[index]?.ecoScoreStatus,
            probability: reports[index]?.ecoScoreStatus === ECO_SCORE_STATUS.CALCULATED
              ? reports[index].probability
              : null,
            probabilityPercent: reports[index]?.ecoScoreStatus === ECO_SCORE_STATUS.CALCULATED
              ? Number((reports[index].probability * 100).toFixed(2))
              : null,
            formulaVersion: ECO_SCORE_FORMULA_VERSION,
            missingVariables: reports[index]?.missingEcoScoreVariables || [],
            inputSummary: extractEcoScoreInputs(preparedResponse.questionnaireResponse),
          });

          const usagePayload = {
            eventType: STUDY_USAGE_EVENT_TYPES.questionnaireSaved,
            flowId: studyUsageFlowId,
            centerId: preparedResponse.metadata.centerId,
            caseId: caseResponse.caseId,
            evaluationId,
            encounterId: caseResponse.encounterFhirId || encId,
            questionnaireResponseFhirId: questionnaireResponseId,
            careSettingCode: caseResponse.careSettingCode || normalizedCareSetting.code,
            evaluationType: decision?.type === "secondary" ? "SECONDARY" : "PRIMARY",
            hasAdnexalMass: preparedResponse.metadata.hasAdnexalMass,
            numberOfMassesInEncounter: countMassesInResponses(preparedResponses),
            ecoScoreStatus: reports[index]?.ecoScoreStatus || null,
            metadata: {
              source: "questionnaire_save_flow",
            },
          };

          savedUsageContext.push(usagePayload);
          await safelyRecordStudyUsageEvent(usagePayload);
        } catch (error) {
          if (error.message === CASE_ERROR_MESSAGES.studyCodeConflict) {
            openStudyCodeConflictModal(
              {
                nhc,
                options,
                preparedResponses,
                decisions,
                startIndex: index,
                persistenceContext: context,
              },
              requestStudyPatientCode
            );
            return;
          }

          console.error("Error al guardar la respuesta:", error);
          setError(getSafeSaveErrorMessage(error));
          throw error;
        }
      }

      if (options?.shouldPrint) {
        await generatePdf(options.includeProbability, {
          encounterId: context.encId,
          savedUsageContext,
          preparedResponses,
        });
      }
      if (successMessage) {
        setSaveMessage(successMessage);
      }
      clearTransientCaseState();
      onCaseSaved();
      event();
    } catch (error) {
      console.error("Error al guardar el encounter:", error);
      const safeMessage = getSafeSaveErrorMessage(error);
      setError(safeMessage);
      if (studyCodeConflictRequest) {
        setStudyCodeConflictError(safeMessage);
      }
    }
  };

  const generatePdf = async (includeProbability, usageContext = {}) => {
    try {
      generateClinicalReportPdf({
        responses,
        reports,
        observations,
        includeProbability,
        centerIdHint: reportCenterId,
        practitionerName: sessionStorage.getItem('practitionerName') || '',
        careSettingDisplay: normalizedCareSetting.display || '',
        studyPatientCode: effectiveStudyPatientCode || '',
      });

      const singleSavedContext = usageContext.savedUsageContext?.length === 1
        ? usageContext.savedUsageContext[0]
        : null;
      await safelyRecordStudyUsageEvent({
        eventType: STUDY_USAGE_EVENT_TYPES.reportGenerated,
        flowId: studyUsageFlowId || null,
        centerId: singleSavedContext?.centerId || reportCenterId || null,
        caseId: singleSavedContext?.caseId ?? null,
        evaluationId: singleSavedContext?.evaluationId ?? null,
        encounterId: usageContext.encounterId || singleSavedContext?.encounterId || encounterId || null,
        questionnaireResponseFhirId: singleSavedContext?.questionnaireResponseFhirId ?? null,
        careSettingCode: normalizedCareSetting.code,
        evaluationType: singleSavedContext?.evaluationType || null,
        hasAdnexalMass:
          usageContext.preparedResponses?.some((item) => item?.metadata?.hasAdnexalMass) ?? mass,
        numberOfMassesInEncounter:
          usageContext.preparedResponses?.filter((item) => item?.metadata?.hasAdnexalMass).length ??
          reportMassCount,
        ecoScoreStatus: singleSavedContext?.ecoScoreStatus || null,
        metadata: {
          reportSource: "questionnaire_save_flow",
          includesProbability: Boolean(includeProbability),
        },
      });
    } catch (error) {
      console.error('Error al generar el informe:', error);
      setError('Error al generar el informe.');
    }
  };
  return (
    <div className="responses-summary">
      <section className="responses-review-card">
        <header className="responses-review-card__header">
          <div>
            <p className="responses-review-card__eyebrow">Cierre clínico del cuestionario</p>
            <h3>Informe médico</h3>
            <p className="responses-review-card__subtitle">
              Revisión del contenido generado a partir del cuestionario ecográfico.
            </p>
          </div>
          <div className="responses-review-card__meta">
            {mass && reportMassCount > 0 && (
              <span className="responses-review-chip">Masa anexial #{Math.min(reportMassCount, 1)}</span>
            )}
            {!mass && (
              <span className="responses-review-chip">Sin masa anexial</span>
            )}
            {reportCenterId && (
              <span className="responses-review-chip">{reportCenterId}</span>
            )}
            <span className="responses-review-chip">{normalizedCareSetting.display}</span>
            <span className="responses-review-chip">Código {reportStudyCodeLabel}</span>
          </div>
        </header>

        {reportMassCount > 0 && (
          <section className="responses-review-panel responses-review-panel--context">
            <h4>Contexto clínico</h4>
            <p className="responses-review-panel__supporting">
              Revise el informe estructurado y complete una conclusión clínica libre si desea complementar el cierre del caso.
            </p>
            <div className="responses-review-facts">
              {reportMetadata.lateralityDisplay && (
                <div className="responses-review-fact">
                  <span className="responses-review-fact__label">Lateralidad</span>
                  <span className="responses-review-fact__value">{reportMetadata.lateralityDisplay}</span>
                </div>
              )}
              {reportMetadata.anatomicalStructureDisplay && (
                <div className="responses-review-fact">
                  <span className="responses-review-fact__label">Estructura anatómica</span>
                  <span className="responses-review-fact__value">{reportMetadata.anatomicalStructureDisplay}</span>
                </div>
              )}
              {reportCenterId && (
                <div className="responses-review-fact">
                  <span className="responses-review-fact__label">Hospital participante</span>
                  <span className="responses-review-fact__value">{reportCenterId}</span>
                </div>
              )}
              <div className="responses-review-fact">
                <span className="responses-review-fact__label">Ámbito asistencial</span>
                <span className="responses-review-fact__value">{normalizedCareSetting.display}</span>
              </div>
            </div>
          </section>
        )}

      {/* Iterar sobre los reportes */}
      {reports.map((report, index) => (
        <article key={index} className="report-item responses-review-panel">

          {/* Mostrar SÓLO si hay masa anexial */}
          {mass  && <h4>Masa anexial #{index + 1}</h4>}

          {/* SIEMPRE se muestra */}
          <section className="parts responses-review-section">
            <div className='tlabel'>Informe estructurado</div>
            <div className='text responses-report-box' dangerouslySetInnerHTML={{ __html: report.text }} />
          </section>

          {report.ecoScoreStatus === ECO_SCORE_STATUS.CALCULATED && (
            <section className="parts responses-review-section responses-score-box">
              <span className='tlabel'>Probabilidad de malignidad</span>
              <span className='text'>{formatProbabilityFromDecimal(report.probability ?? report.score, { withSpace: true })}</span>
              <p className="responses-score-box__note">
                <em>
                  (Rodríguez-Rubio C, Vegas-Viedma S, Del Olmo-Reillo M, Quintana-Zapata P, Sancho-Sauco J, Pablos-Antona MJ, Alcázar JL, Pelayo-Delgado I. ECO-SCORE: Development of a New Ultrasound Score for the Study of Cystic and Solid-Cystic Adnexal Masses Based on Imaging Characteristics. Biomedicines. 2025 Jan 29;13(2):317. doi: 10.3390/biomedicines13020317. PMID: 40002730; PMCID: PMC11852474)
                </em>
              </p>
            </section>
          )}
          {/* Campo de texto para observación */}
          <section className="parts responses-review-section">
            <div className='tlabel'>Conclusión del ecografista</div>
            <p className="responses-review-panel__supporting">
              Añada una conclusión clínica libre si desea complementar el informe estructurado.
            </p>
            <div className='text'>
              <textarea
                className="responses-observation-textarea"
                rows="7"
                cols="75"
                value={observations[index] || ""}
                onChange={(e) => handleObservationChange(index, e.target.value)}
              />
            </div>
          </section>


          {/* Botón para este reporte 
          <button onClick={() => handleReportButtonClick(index)}>
            Descarga Informe
          </button>
          */}
        </article>
      ))}
      <div className="responses-final-actions">
        <div className="responses-final-actions__messages">
          {saveMessage && <p className="success-message">{saveMessage}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>
        <div className="responses-final-actions__buttons">
	        <button
          className="save-btn"
          onClick={() => beginCaseSave({ shouldPrint: false, includeProbability: false })}
          disabled={saveInProgress}
        >
          Guardar
        </button>
        <button className="save-btn" onClick={() => {
          if (sco)  {
            setIsModalOpen(true);
          } else {
            beginCaseSave({ shouldPrint: true, includeProbability: false });
          }
        }}
        disabled={saveInProgress}
        >
          Guardar e Imprimir
        </button>
        </div>
      </div>
      </section>

      {/* Modal para dar opción de incluir la probabilidad en el informe */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2>Incluir probabilidad en el informe</h2>
        <p>Seleccione si desea que la probabilidad de malignidad calculada se incluya en el informe PDF.</p>
        <div className="custom-modal-info">
          Esta decisión afecta únicamente a la versión del informe que se va a generar. No modifica las respuestas del cuestionario ni el cálculo realizado.
        </div>
        <div className="custom-modal-actions">
          <button className="cancel" onClick={() => {
            setIsModalOpen(false);
            beginCaseSave({ shouldPrint: true, includeProbability: false });
          }}>No incluir</button>
          <button className="save" onClick={() => {
            setIsModalOpen(false);
            beginCaseSave({ shouldPrint: true, includeProbability: true });
          }}>Incluir en informe</button>
        </div>
      </Modal>
      <Modal isOpen={isSaveConfirmationOpen} onClose={() => setIsSaveConfirmationOpen(false)}>
        {(() => {
          const metadata = pendingSaveRequest?.preparedResponses?.[0]?.metadata || {};
          const codeLabel =
            canUseStudyPatientCode && String(studyPatientCode || "").trim()
              ? String(studyPatientCode).trim()
              : "Pendiente";
          const massCount = pendingSaveRequest?.preparedResponses?.length || 0;
          const nhcStatus = pendingSaveRequest?.nhc ? "NHC informado" : "NHC no informado";
          const massLabel = `${massCount} ${massCount === 1 ? "masa" : "masas"}`;
          const hasStudyCode = codeLabel !== "Pendiente";

          return (
            <div className="save-confirmation-modal">
              <header className="save-confirmation-modal__header">
                <h2>Confirmar guardado del cuestionario</h2>
                <p className="save-confirmation-modal__subtitle">
                  Revise los datos principales antes de guardar el cuestionario ecográfico.
                </p>
                <div className="save-confirmation-modal__chips">
                  <span className="responses-review-chip responses-review-chip--info">{maskNhc(pendingSaveRequest?.nhc)}</span>
                  <span className={`responses-review-chip ${hasStudyCode ? "responses-review-chip--neutral" : "responses-review-chip--pending"}`}>
                    {codeLabel}
                  </span>
                  <span className="responses-review-chip responses-review-chip--soft">{massLabel}</span>
                </div>
              </header>

              <section className="save-confirmation-callout" aria-label="Información de privacidad y duplicados">
                <p>
                  Al guardar, se comprobará si ya existe un caso previo para esta paciente, lateralidad y estructura.
                  El NHC se utilizará únicamente para comprobaciones internas de pseudonimización y duplicados.
                  No se mostrará ni se incluirá en las exportaciones del estudio.
                  No se almacenará en los recursos FHIR generados.
                </p>
              </section>

              <section className="save-confirmation-summary">
                <h3>Resumen del registro</h3>
                <div className="save-confirmation-summary__grid">
                  <section className="save-confirmation-section">
                    <h4>Contexto del estudio</h4>
                    <div className="save-confirmation-field">
                      <span className="save-confirmation-field__label">Centro</span>
                      <span className="save-confirmation-field__value">{metadata.centerId || "No disponible"}</span>
                    </div>
                    <div className="save-confirmation-field">
                      <span className="save-confirmation-field__label">Ámbito asistencial</span>
                      <span className="save-confirmation-field__value">{normalizedCareSetting.display}</span>
                    </div>
                    <div className="save-confirmation-field">
                      <span className="save-confirmation-field__label">Código de estudio</span>
                      <span className={`responses-review-chip ${hasStudyCode ? "responses-review-chip--neutral" : "responses-review-chip--pending"}`}>
                        {codeLabel}
                      </span>
                    </div>
                  </section>

                  <section className="save-confirmation-section">
                    <h4>Datos de comprobación</h4>
                    <div className="save-confirmation-field">
                      <span className="save-confirmation-field__label">NHC</span>
                      <span className="responses-review-chip responses-review-chip--info">{nhcStatus}</span>
                    </div>
                    <div className="save-confirmation-field">
                      <span className="save-confirmation-field__label">Lateralidad</span>
                      <span className="save-confirmation-field__value">{metadata.lateralityDisplay || "No disponible"}</span>
                    </div>
                    <div className="save-confirmation-field">
                      <span className="save-confirmation-field__label">Estructura anatómica</span>
                      <span className="save-confirmation-field__value">{metadata.anatomicalStructureDisplay || "No disponible"}</span>
                    </div>
                  </section>

                  <section className="save-confirmation-section">
                    <h4>Cuestionario</h4>
                    <div className="save-confirmation-field">
                      <span className="save-confirmation-field__label">Siglas ecografista</span>
                      <span className="save-confirmation-field__value">{metadata.observerInitials || "No disponible"}</span>
                    </div>
                    <div className="save-confirmation-field">
                      <span className="save-confirmation-field__label">Número de masas</span>
                      <span className="responses-review-chip responses-review-chip--soft">{massLabel}</span>
                    </div>
                  </section>
                </div>
              </section>

              <footer className="save-confirmation-modal__actions">
                <button className="cancel" onClick={() => setIsSaveConfirmationOpen(false)} disabled={saveInProgress}>
                  Cancelar
                </button>
                <button className="save" onClick={confirmCaseSave} disabled={saveInProgress}>
                  Guardar
                </button>
              </footer>
            </div>
          );
        })()}
      </Modal>
      <Modal isOpen={isDuplicateModalOpen} onClose={clearDuplicateModalState}>
        <div className="duplicate-case-modal">
          <header className="duplicate-case-modal__header">
            <h2>Caso previo detectado</h2>
            <p className="duplicate-case-modal__subtitle">
              Se ha encontrado un caso registrado con la misma paciente, lateralidad y estructura anatómica.
              Revise la información antes de continuar.
            </p>
          </header>

          <section className="duplicate-case-modal__info" aria-label="Información sobre comprobación de duplicados">
            <div className="duplicate-case-modal__info-icon" aria-hidden="true">i</div>
            <p>
              Esta comprobación utiliza el NHC de forma transitoria para detectar posibles duplicados.
              El NHC no se mostrará ni se incluirá en las exportaciones del estudio.
              No se almacenará en los recursos FHIR generados.
            </p>
          </section>

          {duplicateModalMessage && (
            <p className="duplicate-case-modal__message">{duplicateModalMessage}</p>
          )}
          {error && <p className="error-message">{error}</p>}

          {duplicateMatches.length > 0 && (
            <section className="duplicate-case-modal__section" aria-labelledby="duplicate-case-match-title">
              <h3 id="duplicate-case-match-title">Caso coincidente</h3>
              <div className="duplicate-case-modal__cards">
                {duplicateMatches.map((match, index) => {
                  const caseId = match.caseId || match.id;
                  const isSelected = String(selectedDuplicateCaseId) === String(caseId || "");
                  const identifier = getDuplicateCaseIdentifier(match);
                  const studyCodeLabel = getDuplicateCaseStudyCode(match);
                  const statusLabel = formatCodeStatusLabel(match?.codeStatus);

                  return (
                    <label
                      key={`${caseId || "case"}-${index}`}
                      className={`duplicate-case-card${isSelected ? " duplicate-case-card--selected" : ""}`}
                    >
                      <div className="duplicate-case-card__selector">
                        <input
                          type="radio"
                          name="duplicateCase"
                          value={caseId || ""}
                          checked={isSelected}
                          onChange={(event) => setSelectedDuplicateCaseId(event.target.value)}
                        />
                      </div>
                      <div className="duplicate-case-card__content">
                        <div className="duplicate-case-card__topline">
                          <div>
                            <div className="duplicate-case-card__eyebrow">Caso coincidente</div>
                            <div className="duplicate-case-card__title">{identifier}</div>
                          </div>
                          {studyCodeLabel && (
                            <span className="responses-review-chip responses-review-chip--neutral">
                              Código {studyCodeLabel}
                            </span>
                          )}
                        </div>

                        <div className="duplicate-case-card__headline">
                          {[match?.lateralityDisplay || match?.laterality, match?.anatomicalStructureDisplay || match?.anatomicalStructure]
                            .filter(Boolean)
                            .join(" · ") || "No disponible"}
                        </div>

                        <div className="duplicate-case-card__grid">
                          <div className="duplicate-case-card__field">
                            <span className="duplicate-case-card__label">Fecha</span>
                            <span className="duplicate-case-card__value">{getDuplicateCaseDate(match)}</span>
                          </div>
                          <div className="duplicate-case-card__field">
                            <span className="duplicate-case-card__label">Estado</span>
                            <span className="duplicate-case-card__value">{statusLabel}</span>
                          </div>
                          <div className="duplicate-case-card__field duplicate-case-card__field--wide">
                            <span className="duplicate-case-card__label">Centro / ámbito</span>
                            <span className="duplicate-case-card__value">{getDuplicateCaseCenterScope(match)}</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          <section className="duplicate-case-modal__section duplicate-case-modal__section--decision">
            <h3>¿Cómo desea continuar?</h3>
            <p>
              Si corresponde a la misma lesión, añada el registro como una nueva evaluación.
              Cree un caso independiente solo si se trata de una lesión o caso distinto.
            </p>
          </section>

          <footer className="duplicate-case-modal__actions">
            <button className="cancel duplicate-case-modal__action-tertiary" onClick={clearDuplicateModalState} disabled={saveInProgress}>
              Cancelar
            </button>
            <button className="continue duplicate-case-modal__action-secondary" onClick={() => handleDuplicateDecision("independent")} disabled={saveInProgress}>
              Crear caso independiente
            </button>
            <button className="save duplicate-case-modal__action-primary" onClick={() => handleDuplicateDecision("secondary")} disabled={saveInProgress}>
              Añadir como nueva evaluación
            </button>
          </footer>
        </div>
      </Modal>
      <Modal isOpen={isStudyCodeConflictOpen} onClose={cancelStudyCodeConflictModal}>
        <h2>Conflicto de código de estudio</h2>
        <p>{CASE_ERROR_MESSAGES.studyCodeConflict}</p>
        <p>
          El código de estudio es un dato administrativo. Puede corregirlo sin volver al cuestionario o guardar el caso como pendiente de código.
        </p>
        {studyCodeConflictError && <p className="error-message">{studyCodeConflictError}</p>}
        <button
          className="save"
          onClick={() => setStudyCodeConflictError("")}
          disabled={saveInProgress}
        >
          Corregir código de estudio
        </button>
        <div className="parts">
          <div className="tlabel">Nuevo código de estudio:</div>
          <div className="text">
            <input
              aria-label="Nuevo código de estudio"
              value={correctedStudyPatientCode}
              onChange={(event) => setCorrectedStudyPatientCode(event.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <button className="save" onClick={retrySaveWithCorrectedStudyCode} disabled={saveInProgress}>
          Reintentar guardado
        </button>
        <button className="continue" onClick={saveWithoutStudyCode} disabled={saveInProgress}>
          Guardar sin código y dejar pendiente
        </button>
        <button className="cancel" onClick={cancelStudyCodeConflictModal} disabled={saveInProgress}>
          Cancelar
        </button>
      </Modal>
	  </div>
  );
}

ResponsesProbability.propTypes = {
  responses: PropTypes.arrayOf(
    PropTypes.shape({
      resourceType: PropTypes.string,
      item: PropTypes.arrayOf(PropTypes.object).isRequired,
    })
  ).isRequired,
  event: PropTypes.func.isRequired,
  transientNhc: PropTypes.string.isRequired,
  onClearTransientNhc: PropTypes.func.isRequired,
  studyPatientCode: PropTypes.string,
  canUseStudyPatientCode: PropTypes.bool,
  careSetting: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      code: PropTypes.string,
      display: PropTypes.string,
    }),
  ]),
  studyUsageFlowId: PropTypes.string,
  onCaseSaved: PropTypes.func,
};

export default ResponsesProbability;
