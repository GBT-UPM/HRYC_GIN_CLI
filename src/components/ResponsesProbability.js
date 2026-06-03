import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import '../assets/css/ResponsesSummary.css';

import '../assets/css/ResponsesProbability.css';
import jsPDF from 'jspdf';
import LogoHRYC from "../assets/images/LogoHRYC.jpg";
import Logo12oct from "../assets/images/Logo12oct.jpg";

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
import { formatDuplicateCaseSummary, validateCaseMetadata } from '../utils/caseMetadata';
import { DEFAULT_CARE_SETTING, normalizeCareSetting } from '../utils/careSetting';
import {
  addSecondaryEvaluation,
  checkDuplicateCase,
  createCase,
  CASE_ERROR_MESSAGES,
} from '../services/caseService';

  const tipoMap = {
    'sólida': 'sólido',
    'quística': 'quístico',
    'sólido-quística': 'sólido-quístico'
  };

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


    //Calcular logit y probabilidad      
    const logit = calcularLogit(MA_Q_CONTORNO, MA_SA, MA_Q_AS_VASC, MA_Q_P_VASC);
    const probabilidad = calcularProbabilidad(logit);

    const RES_SCORE = probabilidad.toFixed(4);

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
        text: report
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
          // if (MA_PROB === 'sí') {   // ¿Quiere calcular la probabilidad?
          //   report += `La probabilidad de que la masa anexial sea maligna es de <b>${RES_SCORE}</b>. <br/>`;
          // }
        }
    }
    return {
      text: report,
      score: RES_SCORE,
      text_score: `La probabilidad de que la masa anexial sea maligna es de ${(RES_SCORE ?? 0)* 100}%.`,
    };
  }, []);
  useEffect(() => {
    if (!responses || responses.length === 0) return;


    const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";
    const calcularScore = responses[0]?.item?.some(resp => resp.linkId?.toLowerCase() === "MA_PROB".toLowerCase() && resp.answer?.[0]?.valueCoding?.display !== "No");

    setMass(hasMassInReports);
    setSco(calcularScore);

    const generated = responses.map((r) => generateReport(r));
    setReports(generated);
  }, [responses, generateReport]);
  // Función para calcular logit(p)
  const calcularLogit = (contorno, sombra, vascAreaSolida, vascPapila) => {
    let logit = -3.625;

    //Cálculo coeficientes
    if (contorno === 'irregular') logit += 1.299;

    if (sombra === 'no') logit += 1.847;

    if (vascAreaSolida === 'ninguno (score color 1)' || vascAreaSolida === 'leve (score color 2)') logit += 2.209;
    else if (vascAreaSolida === 'moderado (score color 3)' || vascAreaSolida === 'abundante (score color 4)') logit += 2.967

    if (vascPapila === 'ninguno (score color 1)' || vascPapila === 'leve (score color 2)') logit += 1.253;
    else if (vascPapila === 'moderado (score color 3)' || vascPapila === 'abundante (score color 4)') logit += 1.988;

    return logit;
  }

  // Función para calcular la probabilidad.
  const calcularProbabilidad = (logit) => {
    return 1 / (1 + Math.exp(-logit));
  };

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
      const { hasMassInReports, patientId, encId, imgStuId } = context;
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
                questionnaireResponse: sanitizedQuestionnaireResponse,
                encounterId: encId,
                observerInitials: preparedResponse.metadata.observerInitials,
                studyPatientCode: requestStudyPatientCode || undefined,
                careSettingCode: normalizedCareSetting.code,
                careSettingDisplay: normalizedCareSetting.display,
              });

          const questionnaireResponseId = caseResponse.questionnaireResponseFhirId;
          if (!questionnaireResponseId) {
            throw new Error("El backend no devolvió questionnaireResponseFhirId.");
          }

          const obsId = generateId();
          const ObservationImagen = generateObservation(obsId, encId, patientId, imgStuId, observations[index]);
          await ApiService(keycloak.token, 'POST', `/fhir/Observation`, ObservationImagen);
          if (hasMassInReports) {
            const riskId = generateId();
            const RiskAssessment = generateRiskAssessment(riskId, encId, patientId, null, reports[index].score, "", questionnaireResponseId)
            await ApiService(keycloak.token, 'POST', `/fhir/RiskAssessment`, RiskAssessment);
          }
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
        generatePdf(options.includeProbability);
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return isNaN(date) ? '' : date.toLocaleDateString('es-ES');
  };

  const generatePdf = (includeProbability) => {
    try {
      const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";

      const getResponse = (key) => {
        const answer = responses[0].item.find(
          (resp) => resp.linkId.toLowerCase() === key.toLowerCase()
        )?.answer?.[0];

        return (
          answer?.valueString ||
          answer?.valueInteger ||
          answer?.valueDate ||
          answer?.valueCoding?.display ||
          ''
        );
      };
  
      const checkAndAddPage = (doc, nextBlockHeight) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (yPosition + nextBlockHeight > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
      };
  
      const doc = new jsPDF();
  
      // Tamaño más pequeño
      const width = 55;   // ancho en mm
      const height = 10;  // alto en mm

      // Coordenadas Y iguales → quedan alineados en horizontal
      doc.addImage(LogoHRYC, "JPEG", 10, 10, width, height);
      doc.addImage(Logo12oct, "JPEG", 70, 10, width, height);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Servicio de Ginecología y Obstetricia", 10, 35);
  
      const patientAge = getResponse("PAT_EDAD");
      const patientFUR = getResponse("PAT_FUR");
      const indicacion = getResponse("PAT_IND");
      const indicacion_otro = getResponse("PAT_IND_OTRO");
      const hospital = getResponse("HOSPITAL_REF");
      const sonographerInitials = getResponse("ECO_EXP_SIGLAS");
  
      let yPosition = 50;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      checkAndAddPage(doc, 10);
      doc.text("Datos del estudio:", 10, yPosition);
      yPosition += 10;
  
      const addField = (label, value) => {
        if (value === undefined || value === null || value === "") return;
        checkAndAddPage(doc, 10);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(label, 15, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), 65, yPosition);
        yPosition += 10;
      };
  
      addField("Edad:", patientAge ? `${patientAge} años` : "");
      addField("FUR:", formatDate(patientFUR));
      addField("Hospital:", hospital);
      addField("Ecografista:", sonographerInitials);
  
      const addSectionWithAutoBreak = (title, text) => {
        const textLines = text.trim() !== "" ? doc.splitTextToSize(text, 180) : [];
        const totalHeight = textLines.length * 5 + 10;
      
        // Añade salto de página solo si se va a imprimir algo más que el título
        checkAndAddPage(doc, totalHeight);
      
        // Imprime el título siempre
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(title, 10, yPosition);
        yPosition += 10;
      
        if (textLines.length > 0) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          doc.text(textLines, 10, yPosition);
          yPosition += textLines.length * 5 + 10;
        }
      };
  
      //addSectionWithAutoBreak("Indicación de la ecografía:", indicacion);
      let indicacionFinal = indicacion;
      if (indicacion === "1" && indicacion_otro.trim() !== "") {
        indicacionFinal = indicacion_otro.trim();
      }
      indicacionFinal = String(indicacionFinal || "").toLowerCase()
      const edadText = patientAge ? `${patientAge} años` : "de edad desconocida";
      const indicacionText = `Mujer de ${edadText} que acude a consulta de ecografía para valoración por ${indicacionFinal}.`;

      addSectionWithAutoBreak("Indicación de la ecografía:", indicacionText);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      checkAndAddPage(doc, 10);
      doc.text("Descripción de la imagen:", 10, yPosition);
      yPosition += 10;
  
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      reports.forEach((report, index) => {
        if (hasMassInReports) {
          checkAndAddPage(doc, 10);
          doc.setFont("helvetica", "bold");
          doc.text("Masa anexial " + (index + 1), 15, yPosition);
          yPosition += 10;
        }
  
        doc.setFont("helvetica", "normal");
        const htmlConSaltos = report.text.replace(/<br\s*\/?>/gi, "\n");
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlConSaltos;
        const plainText = tempDiv.innerText;
        const normalizedText = plainText.replace(/\n+/g, "\n").trim();
  
        const textLines = doc.splitTextToSize(normalizedText, 180);
        textLines.forEach((line) => {
          checkAndAddPage(doc, 6);
          doc.text(line, 10, yPosition);
          yPosition += 6;
        });

        if (includeProbability && report.text_score) {
          const scoreLines = doc.splitTextToSize(report.text_score, 180);
          scoreLines.forEach((line) => {
            checkAndAddPage(doc, 6);
            doc.text(line, 10, yPosition);
            yPosition += 6;
          });
        }
  
        yPosition += 4;
      });
  

      // Espacio para las conclusiones
      const validObservations = observations.filter((observation) => observation.trim().length > 0); // Filtra las observaciones vacías o nulas
  
      if (validObservations.length > 0) {
        addSectionWithAutoBreak("Conclusiones del ecografista:", "");
  
        validObservations.forEach((observation, index) => {
          if (validObservations.length > 1) {
            checkAndAddPage(doc, 10);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Conclusión de la Masa Anexial " + (index + 1), 15, yPosition);
            yPosition += 10;
          }
  
          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          const text = observation;
          const textLines = doc.splitTextToSize(text, 180);
          textLines.forEach((line) => {
            checkAndAddPage(doc, 6);
            doc.text(line, 10, yPosition);
            yPosition += 6;
          });
          yPosition += 4;
        });
      }
  
      const today = new Date();
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(hospital, 10, 260);
      doc.text("Fecha: " + today.toLocaleDateString(), 150, 260);
      const practitionerName = sessionStorage.getItem('practitionerName');
      doc.text("Ecografista: " + (sonographerInitials || practitionerName || ""), 10, 270);
  
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");  // Abre el PDF en una nueva pestaña
    } catch (error) {
      console.error("Error al guardar el encounter:", error);
      setError("Error al guardar el encounter.");
    }
  };
  return (
    <div className="responses-summary">
      <h3>Informe Médico</h3>

      {/* Iterar sobre los reportes */}
      {reports.map((report, index) => (
        <div key={index} className="report-item">

          {/* Mostrar SÓLO si hay masa anexial */}
          {mass  && <h4>Masa anexial #{index + 1}</h4>}

          {/* SIEMPRE se muestra */}
          <div className="parts">
            <div className='tlabel'>Informe:</div>
            <div className='text' dangerouslySetInnerHTML={{ __html: report.text }} />
          </div>

          {/* Mostrar SÓLO si hay masa anexial
          {hasMassInReports && calcularScore && (
            <div className="parts">
              <span className='tlabel'>Probabilidad de malignidad: </span>
              <span className='text' dangerouslySetInnerHTML={{ __html: ((report.score ?? 0)* 100).toFixed(2) + '%' }} />
            </div>
          )} */}

          {/* Mostrar SÓLO si hay masa anexial
          {hasMassInReports && calcularScore && (
            <div className="parts">
              <span className='tlabel'>Probabilidad de malignidad: </span>
              <span className='text' dangerouslySetInnerHTML={{ __html: ((report.score ?? 0)* 100).toFixed(2) + '%' }} />
              <span 
                title='Probabilidad de malignidad orientativa calculada según datos ecográficos aportados y fórmula publicada en Rodríguez-Rubio C, Vegas-Viedma S, Del Olmo-Reillo M, Quintana-Zapata P, Sancho-Sauco J, Pablos-Antona MJ, Alcázar JL, Pelayo-Delgado I. ECO-SCORE: Development of a New Ultrasound Score for the Study of Cystic and Solid-Cystic Adnexal Masses Based on Imaging Characteristics. Biomedicines. 2025 Jan 29;13(2):317. doi: 10.3390/biomedicines13020317.'
                style={{ marginLeft: '6px', cursor:'help', color: '#555' }}
                >
                ℹ️
              </span>
            </div>
          )} */}

          {/* Mostrar SÓLO si hay masa anexial */}
          {mass && sco && (
            <div className="parts">
              <span className='tlabel'>Probabilidad de malignidad: </span>
              <span className='text' dangerouslySetInnerHTML={{ __html: ((report.score ?? 0)* 100).toFixed(2) + '%' }} />
              <p style={{ fontSize: '0.70em', color: '#555', marginTop: '5px' }}>
                <em>
                  (Rodríguez-Rubio C, Vegas-Viedma S, Del Olmo-Reillo M, Quintana-Zapata P, Sancho-Sauco J, Pablos-Antona MJ, Alcázar JL, Pelayo-Delgado I. ECO-SCORE: Development of a New Ultrasound Score for the Study of Cystic and Solid-Cystic Adnexal Masses Based on Imaging Characteristics. Biomedicines. 2025 Jan 29;13(2):317. doi: 10.3390/biomedicines13020317. PMID: 40002730; PMCID: PMC11852474)
                </em>
              </p>
            </div>
          )}

          {/* Campo de texto para observación */}
          <div className="parts">
            <div className='tlabel'>Conclusión del ecografista:</div>
            <div className='text'>
              <textarea rows="7" cols="75"
                style={{ padding: '8px' }}
                value={observations[index] || ""}
                onChange={(e) => handleObservationChange(index, e.target.value)}
              />
            </div>
          </div>


          {/* Botón para este reporte 
          <button onClick={() => handleReportButtonClick(index)}>
            Descarga Informe
          </button>
          */}
        </div>
      ))}

	      {/* Botón final para volver 
	      <button className="save-btn" onClick={event}>
	        Volver al cuestionario
	      </button>*/}
      {saveMessage && <p className="success-message">{saveMessage}</p>}
      {error && <p className="error-message">{error}</p>}
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
      {/* Modal para dar opción de incluir la probabilidad en el informe */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <h2>Confirmación</h2> 
      <p>¿Desea incluir la probabilidad de malignidad en el informe?</p>
      <button className="save" onClick={() => {
          setIsModalOpen(false);
          beginCaseSave({ shouldPrint: true, includeProbability: true });
      }}>Sí
      </button>
      <button className="cancel" onClick={() => {
        setIsModalOpen(false);
        beginCaseSave({ shouldPrint: true, includeProbability: false });
      }}>No
      </button>
    </Modal>
      <Modal isOpen={isSaveConfirmationOpen} onClose={() => setIsSaveConfirmationOpen(false)}>
        <h2>Confirmar guardado</h2>
        {(() => {
          const metadata = pendingSaveRequest?.preparedResponses?.[0]?.metadata || {};
          const codeLabel =
            canUseStudyPatientCode && String(studyPatientCode || "").trim()
              ? String(studyPatientCode).trim()
              : "Pendiente";

          return (
            <>
              <p>
                Al guardar, se comprobará si existe un caso previo para esta paciente, lateralidad y estructura. El NHC no se almacenará en el recurso FHIR ni se incluirá en las exportaciones del estudio.
              </p>
              <ul>
                <li><b>Centro:</b> {metadata.centerId || "No disponible"}</li>
                <li><b>NHC:</b> {maskNhc(pendingSaveRequest?.nhc)}</li>
	                <li><b>Código de estudio:</b> {codeLabel}</li>
	                <li><b>Ámbito asistencial:</b> {normalizedCareSetting.display}</li>
	                <li><b>Lateralidad:</b> {metadata.lateralityDisplay || "No disponible"}</li>
                <li><b>Estructura anatómica:</b> {metadata.anatomicalStructureDisplay || "No disponible"}</li>
                <li><b>Siglas ecografista:</b> {metadata.observerInitials || "No disponible"}</li>
                <li><b>Número de masas:</b> {pendingSaveRequest?.preparedResponses?.length || 0}</li>
              </ul>
              <button className="cancel" onClick={() => setIsSaveConfirmationOpen(false)} disabled={saveInProgress}>
                Cancelar
              </button>
              <button className="save" onClick={confirmCaseSave} disabled={saveInProgress}>
                Guardar
              </button>
            </>
          );
        })()}
      </Modal>
      <Modal isOpen={isDuplicateModalOpen} onClose={clearDuplicateModalState}>
        <h2>Posible caso ya registrado</h2>
        <p>
          Ya existe un caso registrado para esta paciente con la misma lateralidad y estructura anatómica. Indique si esta exploración corresponde a una nueva evaluación del caso existente o a un caso independiente.
        </p>
        {duplicateModalMessage && <p>{duplicateModalMessage}</p>}
        {error && <p className="error-message">{error}</p>}
        {duplicateMatches.length > 0 && (
          <div>
            {duplicateMatches.map((match, index) => {
              const caseId = match.caseId || match.id;
              return (
                <label key={`${caseId || "case"}-${index}`} style={{ display: "block", marginBottom: "8px" }}>
                  <input
                    type="radio"
                    name="duplicateCase"
                    value={caseId || ""}
                    checked={String(selectedDuplicateCaseId) === String(caseId || "")}
                    onChange={(event) => setSelectedDuplicateCaseId(event.target.value)}
                  />
                  {" "}
                  {formatDuplicateCaseSummary(match)}
                </label>
              );
            })}
          </div>
        )}
        <button className="save" onClick={() => handleDuplicateDecision("secondary")} disabled={saveInProgress}>
          Añadir como nueva evaluación
        </button>
        <button className="continue" onClick={() => handleDuplicateDecision("independent")} disabled={saveInProgress}>
          Crear caso independiente
        </button>
        <button className="cancel" onClick={clearDuplicateModalState} disabled={saveInProgress}>
          Cancelar
        </button>
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
  onCaseSaved: PropTypes.func,
};

export default ResponsesProbability;
