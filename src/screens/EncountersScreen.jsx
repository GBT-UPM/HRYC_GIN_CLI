import React, { useState, useEffect, useCallback } from 'react';
import {
    Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TablePagination, TableSortLabel,
    TextField, Stack, Box, Button, Tooltip, IconButton,
    FormControl, InputLabel, Select, MenuItem, Alert, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Close } from '@mui/icons-material';
import StudyPageHeader from '../components/StudyPageHeader';
import '../assets/css/ResponsesScreen.css';
import { useKeycloak } from '@react-keycloak/web';
import ApiService from '../services/ApiService';
import { generateClinicalReportPdf } from '../utils/pdfReport';
import { formatCodeStatusLabel, resolveDisplayStudyIdentifier, resolveStudyCodeDisplay } from '../utils/caseMetadata';
import { formatCaseStatusLabel, formatEvaluationStatusLabel } from '../utils/caseStatus';
import { formatEvaluationTypeLabel } from '../utils/evaluationType';
import { canUseGlobalView, getAllowedCenters, getCentersDisplayLabel, getDefaultCenter, getPrimaryRoleLabel } from '../utils/auth';
import { getCaseEvaluations } from '../services/caseEvaluationService';

const getStatusChipSx = (label) => {
    const lc = (label || '').toLowerCase();
    if (['asignado', 'completada', 'disponible'].some(k => lc.includes(k)))
        return { backgroundColor: '#e6f4ea', color: '#1a4726', borderColor: '#a8d5b5' };
    if (['pendiente', 'revisión'].some(k => lc.includes(k)))
        return { backgroundColor: '#fff8e1', color: '#7a4800', borderColor: '#fce48a' };
    if (['conflicto', 'excluido', 'excluida', 'retirado'].some(k => lc.includes(k)))
        return { backgroundColor: '#fde8e8', color: '#7a1212', borderColor: '#f5b3b3' };
    if (['bloqueado', 'bloqueada', 'corregida'].some(k => lc.includes(k)))
        return { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' };
    return { backgroundColor: '#EAF1F6', color: '#1E3A5F', borderColor: '#b4cfe0' };
};

const TH_SX = {
    backgroundColor: '#EAF1F7',
    color: '#173B5F',
    fontWeight: 700,
    fontSize: '0.75rem',
    borderBottom: '2px solid #CBD5E1',
    py: 1.25,
    px: 1.5,
    whiteSpace: 'nowrap',
};

const SORT_LABEL_SX = {
    color: '#173B5F !important',
    '& .MuiTableSortLabel-icon': { color: '#173B5F !important' },
    '&.Mui-active': { color: '#1E3A5F !important' },
    '&.Mui-active .MuiTableSortLabel-icon': { color: '#1E3A5F !important' },
};

const ACTION_BTN_SX = {
    fontSize: '0.72rem',
    textTransform: 'none',
    borderColor: '#D9E2EC',
    color: '#1E3A5F',
    fontWeight: 600,
    py: 0.25,
    px: 1,
    minWidth: 0,
    '&:hover': { borderColor: '#2F5D7C', backgroundColor: '#F5F7FA' },
};

const DIALOG_PAPER_SX = {
    borderRadius: '12px',
    border: '1px solid #D6E0EA',
    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12)',
};

const DIALOG_TITLE_SX = {
    fontWeight: 800,
    color: '#1F2933',
    fontSize: '1.05rem',
    borderBottom: '1px solid #EEF2F6',
    pb: 1.5,
    pr: 6,
};

const DIALOG_CONTENT_SX = { px: 3, py: 2.5 };
const DIALOG_ACTIONS_SX = { px: 3, py: 1.5, borderTop: '1px solid #EEF2F6', gap: 1 };

const INFO_BOX_SX = {
    backgroundColor: '#eef4fa',
    border: '1px solid #c8daea',
    borderRadius: '8px',
    px: 1.75,
    py: 1.25,
    mt: 1.5,
    fontSize: '0.875rem',
    color: '#2c4a6e',
    lineHeight: 1.5,
};

const SECONDARY_BTN_SX = {
    textTransform: 'none',
    fontWeight: 600,
    borderColor: '#D9E2EC',
    color: '#1E3A5F',
    '&:hover': { borderColor: '#2F5D7C', backgroundColor: '#F5F7FA' },
};

const PRIMARY_BTN_SX = {
    textTransform: 'none',
    fontWeight: 700,
    backgroundColor: '#1E3A5F',
    '&:hover': { backgroundColor: '#173050' },
};

const tipoMap = {
    'sólida': 'sólido',
    'quística': 'quístico',
    'sólido-quística': 'sólido-quístico'
};

const EncountersScreen = () => {
    const { keycloak, initialized } = useKeycloak();
    const allowedCenters = getAllowedCenters(keycloak);
    const isGlobalView = canUseGlobalView(keycloak);
    const shouldSelectCenter = !isGlobalView && allowedCenters.length > 1;
    const roleLabel = getPrimaryRoleLabel(keycloak);
    const centersLabel = getCentersDisplayLabel(keycloak);
    const [selectedCenter, setSelectedCenter] = useState(getDefaultCenter(keycloak));
    const [data, setData] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [orderBy, setOrderBy] = useState('createdAt');
    const [orderDirection, setOrderDirection] = useState('desc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    // eslint-disable-next-line no-unused-vars
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingPrintData, setPendingPrintData] = useState(null);
    const [infoOpen, setInfoOpen] = useState(false);

    const parseQuestionnaireResponses = (questionnaireResponse) => {
        try {
            const parsed = typeof questionnaireResponse === 'string'
                ? JSON.parse(questionnaireResponse)
                : questionnaireResponse;
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
            return [];
        }
    };

    const findItemByLinkId = (items, linkId) => {
        if (!Array.isArray(items)) return null;
        for (const item of items) {
            if (item.linkId === linkId) return item;
            const nested = findItemByLinkId(item.item, linkId);
            if (nested) return nested;
        }
        return null;
    };

    const getAnswerValue = (answer) => {
        if (answer.valueString) return answer.valueString;
        if (answer.valueDate) return new Date(answer.valueDate).toLocaleDateString();
        if (answer.valueInteger) return answer.valueInteger.toString();
        if (answer.valueDecimal) return answer.valueDecimal.toString();
        if (answer.valueBoolean) return answer.valueBoolean ? "Sí" : "No";
        if (answer.valueCoding) return answer.valueCoding.display || answer.valueCoding.code;
        return "No disponible";
    };

    const getQuestionnaireValue = (questionnaireResponse, linkId) => {
        const responses = parseQuestionnaireResponses(questionnaireResponse);
        for (const response of responses) {
            const item = findItemByLinkId(response?.item, linkId);
            if (item?.answer?.length > 0) {
                return getAnswerValue(item.answer[0]);
            }
        }
        return "";
    };

    const getIdentifier = (item) => resolveDisplayStudyIdentifier(item);
    const getStudyCode = (item) => resolveStudyCodeDisplay(item);
    const getCodeStatus = (item) => formatCodeStatusLabel(item.codeStatus);
    const getCaseStatus = (item) => formatCaseStatusLabel(item.caseStatus);
    const getEvaluationStatus = (item) => formatEvaluationStatusLabel(item.evaluationStatus);
    const getEvaluationType = (item) => formatEvaluationTypeLabel(item.evaluationType, item.primaryEvaluation, item.evaluationId);
    const getCenter = (item) => item.centerId || item.center || item.centerName || getQuestionnaireValue(item.questionnaireResponse, "HOSPITAL_REF") || "—";
    const getLaterality = (item) => item.lateralityDisplay || item.laterality || getQuestionnaireValue(item.questionnaireResponse, "MA_LADO") || "—";
    const getCareSetting = (item) => item.careSettingDisplay || "No especificado";

    const fetchQuestionnaireResponseByFhirId = useCallback(async (questionnaireResponseFhirId) => {
        if (!questionnaireResponseFhirId) {
            return null;
        }

        const response = await ApiService(keycloak.token, 'GET', `/app/QuestionnaireResponse/${questionnaireResponseFhirId}`, {});
        if (response.status !== 200) {
            throw new Error(`Error en la respuesta: ${response.status}`);
        }
        return response.json();
    }, [keycloak.token]);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return isNaN(date) ? '' : date.toLocaleDateString('es-ES');
    };
    const handlePrintButtonClick = (includeProbability, responses, observations, practitionerName, rowItem = {}) => {
        try {
            const generated = responses.map((r) => generateReport(r));
            const observationTexts = (observations || [])
                .map((o) => o?.text || o?.valueString || '')
                .filter((t) => t.length > 0);
            const studyIdentifier = resolveDisplayStudyIdentifier({
                ...rowItem,
                questionnaireResponse: responses,
            });

            generateClinicalReportPdf({
                responses,
                reports: generated,
                observations: observationTexts,
                includeProbability,
                centerIdHint: rowItem.centerId || '',
                practitionerName: practitionerName || '',
                careSettingDisplay: rowItem.careSettingDisplay || '',
                studyPatientCode: studyIdentifier || '',
            });
        } catch (error) {
            console.error('Error al generar el informe:', error);
            setError('Error al generar el informe.');
        }
    };
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
        const MA_Q_P = getValue('MA_Q_P');      // Número de papilas.
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


        //Calcular logit y probabilidad      
        const logit = calcularLogit(MA_Q_CONTORNO, MA_SA, MA_Q_AS_VASC, MA_Q_P_VASC);
        const probabilidad = calcularProbabilidad(logit);

        const RES_SCORE = probabilidad.toFixed(4);    //no sé si esto se mostraría en el informe o solo para información del médico.

        //Construcción del informe
        let report = '';


        if (PAT_MA === 'no') {                  //Si NO hay masa anexial
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
        } else {    //Si SÍ hay masa anexial
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

                //Información adicional para masas quísticas y sólido-quísticas.
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
    const calcularLogit = (contorno, sombra, vascAreaSolida, vascPapila) => {
        let logit = -3.625;

        //Cálculo coeficientes
        if (contorno === 'irregular') logit += 1.299;

        if (sombra === 'no') logit += 1.847;

        if (vascAreaSolida === 'nula (score color 1)' || vascAreaSolida === 'leve (score color 2)') logit += 2.209;
        else if (vascAreaSolida === 'moderada (score color 3)' || vascAreaSolida === 'abundante (score color 4)') logit += 2.967

        if (vascPapila === 'nula (score color 1)' || vascPapila === 'leve (score color 2)') logit += 1.253;
        else if (vascPapila === 'moderada (score color 3)' || vascPapila === 'abundante (score color 4)') logit += 1.988;

        return logit;
    }
    // Función para calcular la probabilidad.
    const calcularProbabilidad = (logit) => {
        return 1 / (1 + Math.exp(-logit));
    };
    const fetchQuestionnaire = useCallback(async () => {
        if (!keycloak.token) {
            return;
        }

        if (shouldSelectCenter && !selectedCenter) {
            setData([]);
            setError(null);
            return;
        }

        try {
            setError(null);
            const data = await getCaseEvaluations(
                keycloak.token,
                keycloak,
                selectedCenter,
                "No se pudieron cargar las citas."
            );
            setData(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al obtener los datos del paciente:", error);
            setData([]);
            setError(error.message || "No se pudieron cargar las citas.");
        }
    }, [keycloak, selectedCenter, setData, setError, shouldSelectCenter]);
    // Simula la carga de datos desde una API (reemplazar con fetch/axios en entorno real)
    useEffect(() => {
        if (initialized) {
            fetchQuestionnaire();
        }
    }, [initialized, fetchQuestionnaire]);


    // Función para ordenar la tabla
    const handleSortRequest = (property) => {
        const isAsc = orderBy === property && orderDirection === 'desc';
        setOrderDirection(isAsc ? 'asc' : 'desc');
        setOrderBy(property);
    };

    // Filtrado de datos basado en la búsqueda
    const filteredData = data.filter((item) =>
        [
            item.observerInitials,
            item.risk,
            item.histology,
            item.caseDisplayId,
            item.evaluationDisplayId,
            item.studyPatientCode,
            item.careSettingDisplay,
            item.caseStatus,
            item.evaluationStatus,
            item.evaluationType,
            getEvaluationType(item),
            getIdentifier(item),
            getStudyCode(item),
            getCodeStatus(item),
            getCaseStatus(item),
            getEvaluationStatus(item),
            getCenter(item),
            getLaterality(item),
            getCareSetting(item),
            new Date(item.createdAt).toLocaleString()
        ].join(" ").toLowerCase().includes(search.toLowerCase())
    );

    // Ordenación de datos
    const sortedData = filteredData.sort((a, b) => {
        const getSortValue = (item, property) => {
            if (property === "identifier") return getIdentifier(item);
            if (property === "studyCode") return getStudyCode(item);
            if (property === "codeStatus") return getCodeStatus(item);
            if (property === "caseStatus") return getCaseStatus(item);
            if (property === "evaluationStatus") return getEvaluationStatus(item);
            if (property === "evaluationType") return getEvaluationType(item);
            if (property === "center") return getCenter(item);
            if (property === "laterality") return getLaterality(item);
            return item[property] || "";
        };
        const firstValue = getSortValue(a, orderBy);
        const secondValue = getSortValue(b, orderBy);
        if (orderDirection === 'asc') {
            return firstValue < secondValue ? -1 : 1;
        } else {
            return firstValue > secondValue ? -1 : 1;
        }
    });
    // Función para abrir el modal con el detalle del cuestionario
    const handleRowClick = async (item, includeProbability) => {
        try {
            const questionnaireResponse = await fetchQuestionnaireResponseByFhirId(item.questionnaireResponseFhirId);
            if (!questionnaireResponse) {
                return;
            }

            setSelectedQuestionnaire(questionnaireResponse);
            const observations = item.histology ? [{ text: item.histology }] : [];
            handlePrintButtonClick(includeProbability, [questionnaireResponse], observations, item.observerInitials, item);
        } catch (error) {
            console.error("Error al obtener el cuestionario:", error);
        }
    };
    // Paginación de datos
    const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const visibleScopeLabel = isGlobalView
        ? "Vista global"
        : selectedCenter
            ? `Centro ${selectedCenter}`
            : "Centro pendiente";

    return (
        <Box sx={{ px: 0, py: 0 }}>
            {/* Encabezado institucional */}
            <StudyPageHeader
                title="Citas / encuentros"
                subtitle="Consulta de encuentros clínicos registrados y evaluaciones asociadas al estudio."
                visibleScopeLabel={visibleScopeLabel}
                roleLabel={roleLabel}
                centersLabel={centersLabel}
                recordCount={filteredData.length}
                onInfoClick={() => setInfoOpen(true)}
            />

            {/* Dialog Información de la vista */}
            <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: DIALOG_PAPER_SX }}>
                <DialogTitle sx={DIALOG_TITLE_SX}>
                    Información de la vista
                    <IconButton onClick={() => setInfoOpen(false)} size="small" aria-label="Cerrar" sx={{ position: "absolute", right: 12, top: 12, color: "#52616B" }}>
                        <Close fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ px: 2.5, py: 1.5 }}>
                    <Stack spacing={0}>
                        {[
                            ["Encuentros visibles", isGlobalView ? "Todos los centros (vista global)" : `Centro: ${selectedCenter || "pendiente"}`],
                            ["Relación encuentro-caso", "Cada encuentro corresponde a una evaluación ecográfica vinculada a un caso del estudio."],
                            ["Evaluación primaria", "Primera evaluación ecográfica registrada para el caso."],
                            ["Evaluación secundaria", "Evaluación adicional sobre el mismo caso (segundo observador)."],
                            ["Informe clínico", "La acción 'Informe' genera el informe ecográfico en PDF para impresión o descarga."],
                            ["Pseudonimización", "Los datos mostrados no incluyen identificativos del paciente."],
                        ].map(([label, value], index, arr) => (
                            <Box key={label} sx={{ py: 1.25, borderBottom: index < arr.length - 1 ? "1px solid #EEF2F6" : "none" }}>
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
            {shouldSelectCenter && (
                <FormControl sx={{ minWidth: 220, mb: 2 }}>
                    <InputLabel id="encounters-center-label">Centro</InputLabel>
                    <Select
                        labelId="encounters-center-label"
                        label="Centro"
                        value={selectedCenter}
                        onChange={(event) => setSelectedCenter(event.target.value)}
                    >
                        <MenuItem value="" disabled>Seleccione centro</MenuItem>
                        {allowedCenters.map((center) => (
                            <MenuItem key={center} value={center}>{center}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {/* Card de búsqueda */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #D9E2EC", borderRadius: 2, backgroundColor: "#FFFFFF" }}>
                <TextField
                    label="Buscar por caso, evaluación, código de estudio, centro, lateralidad, ámbito, tipo o ecografista"
                    variant="outlined"
                    fullWidth
                    size="small"
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ color: "#52616B", mr: 1, fontSize: "1.1rem" }} />,
                    }}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </Paper>

            {/* Card de tabla */}
            <Paper elevation={0} sx={{ border: "1px solid #D9E2EC", borderRadius: 2, backgroundColor: "#FFFFFF", overflow: "hidden" }}>
                <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'studyCode'} direction={orderDirection} onClick={() => handleSortRequest('studyCode')} sx={SORT_LABEL_SX}>
                                        Código de estudio
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'identifier'} direction={orderDirection} onClick={() => handleSortRequest('identifier')} sx={SORT_LABEL_SX}>
                                        Caso / Evaluación
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'evaluationType'} direction={orderDirection} onClick={() => handleSortRequest('evaluationType')} sx={SORT_LABEL_SX}>
                                        Tipo
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'center'} direction={orderDirection} onClick={() => handleSortRequest('center')} sx={SORT_LABEL_SX}>
                                        Centro / Ámbito
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'laterality'} direction={orderDirection} onClick={() => handleSortRequest('laterality')} sx={SORT_LABEL_SX}>
                                        Lateralidad
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'codeStatus'} direction={orderDirection} onClick={() => handleSortRequest('codeStatus')} sx={SORT_LABEL_SX}>
                                        Estado código
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'caseStatus'} direction={orderDirection} onClick={() => handleSortRequest('caseStatus')} sx={SORT_LABEL_SX}>
                                        Estado caso
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'evaluationStatus'} direction={orderDirection} onClick={() => handleSortRequest('evaluationStatus')} sx={SORT_LABEL_SX}>
                                        Estado evaluación
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'risk'} direction={orderDirection} onClick={() => handleSortRequest('risk')} sx={SORT_LABEL_SX}>
                                        Riesgo
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'createdAt'} direction={orderDirection} onClick={() => handleSortRequest('createdAt')} sx={SORT_LABEL_SX}>
                                        Fecha
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ ...TH_SX, textAlign: "right" }}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedData.map((item, index) => {
                                const codeLabel = getCodeStatus(item);
                                const caseLabel = getCaseStatus(item);
                                const evalLabel = getEvaluationStatus(item);
                                const typeLabel = getEvaluationType(item);
                                const riskDisplay = !isNaN(parseFloat(item.risk))
                                    ? (parseFloat(item.risk) * 100).toFixed(2) + '%'
                                    : 'No procede';

                                return (
                                    <TableRow
                                        key={index}
                                        hover
                                        sx={{
                                            '&:hover': { backgroundColor: '#F5F8FC' },
                                            '&:last-child td': { borderBottom: 0 },
                                        }}
                                    >
                                        {/* Código de estudio */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2933', lineHeight: 1.3 }}>
                                                {getStudyCode(item) || '—'}
                                            </Typography>
                                        </TableCell>

                                        {/* Caso / Evaluación */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2933', lineHeight: 1.3 }}>
                                                {item.caseDisplayId || getIdentifier(item) || '—'}
                                            </Typography>
                                            {item.evaluationDisplayId && (
                                                <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#52616B', lineHeight: 1.2, display: 'block' }}>
                                                    {item.evaluationDisplayId}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* Tipo */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            {typeLabel && typeLabel !== '—' ? (
                                                <Chip
                                                    label={typeLabel}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: '0.72rem',
                                                        fontWeight: 600,
                                                        backgroundColor: typeLabel === 'Primaria' ? '#EAF1F6' : '#F3F4F6',
                                                        color: typeLabel === 'Primaria' ? '#1E3A5F' : '#374151',
                                                        borderColor: typeLabel === 'Primaria' ? '#b4cfe0' : '#d1d5db',
                                                    }}
                                                />
                                            ) : (
                                                <Typography variant="caption" sx={{ color: '#52616B' }}>—</Typography>
                                            )}
                                        </TableCell>

                                        {/* Centro / Ámbito */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2933', lineHeight: 1.3 }}>
                                                {getCenter(item)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#52616B', lineHeight: 1.2, display: 'block' }}>
                                                {getCareSetting(item)}
                                            </Typography>
                                        </TableCell>

                                        {/* Lateralidad */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#1F2933', lineHeight: 1.3 }}>
                                                {getLaterality(item)}
                                            </Typography>
                                        </TableCell>

                                        {/* Estado código */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            {codeLabel && codeLabel !== '—' ? (
                                                <Chip label={codeLabel} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, ...getStatusChipSx(codeLabel) }} />
                                            ) : null}
                                        </TableCell>

                                        {/* Estado caso */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            {caseLabel && caseLabel !== '—' ? (
                                                <Chip label={caseLabel} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, ...getStatusChipSx(caseLabel) }} />
                                            ) : null}
                                        </TableCell>

                                        {/* Estado evaluación */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            {evalLabel && evalLabel !== '—' ? (
                                                <Chip label={evalLabel} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, ...getStatusChipSx(evalLabel) }} />
                                            ) : null}
                                        </TableCell>

                                        {/* Riesgo */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#1F2933', lineHeight: 1.3 }}>
                                                {riskDisplay}
                                            </Typography>
                                        </TableCell>

                                        {/* Fecha / Ecografista */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#1F2933', lineHeight: 1.3 }}>
                                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                                            </Typography>
                                            {item.observerInitials && (
                                                <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#52616B', lineHeight: 1.2, display: 'block' }}>
                                                    {item.observerInitials}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* Acciones */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <Tooltip title="Imprimir informe">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    aria-label="Imprimir informe"
                                                    sx={ACTION_BTN_SX}
                                                    onClick={async () => {
                                                        const questionnaireResponse = await fetchQuestionnaireResponseByFhirId(item.questionnaireResponseFhirId);
                                                        const patMaItem = findItemByLinkId(questionnaireResponse?.item, 'PAT_MA');
                                                        const answer = patMaItem?.answer?.[0];
                                                        const hasMass =
                                                            answer?.valueCoding?.display === "Sí" ||
                                                            answer?.valueString === "1" ||
                                                            answer?.valueCoding?.code === "1";

                                                        if (hasMass) {
                                                            setPendingPrintData({ rowItem: item });
                                                            setIsModalOpen(true);
                                                        } else {
                                                            handleRowClick(item, false);
                                                        }
                                                    }}
                                                >
                                                    Informe
                                                </Button>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                {/* Paginación integrada */}
                <Box sx={{ borderTop: "1px solid #D9E2EC" }}>
                    <TablePagination
                        component="div"
                        count={filteredData.length}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[5, 10, 25]}
                        onPageChange={(event, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(event) => {
                            setRowsPerPage(parseInt(event.target.value, 10));
                            setPage(0);
                        }}
                        sx={{ fontSize: '0.8rem' }}
                    />
                </Box>
            </Paper>

            {/* Dialog: confirmación de inclusión de probabilidad */}
            <Dialog
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: DIALOG_PAPER_SX }}
            >
                <DialogTitle sx={DIALOG_TITLE_SX}>
                    Incluir probabilidad en el informe
                    <IconButton
                        aria-label="close"
                        onClick={() => setIsModalOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 12, top: 12, color: '#52616B' }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={DIALOG_CONTENT_SX}>
                    <Typography sx={{ color: '#1F2933' }}>
                        Seleccione si desea que la probabilidad de malignidad calculada se incluya en el informe PDF.
                    </Typography>
                    <Box sx={INFO_BOX_SX}>
                        Esta decisión afecta únicamente a la versión del informe que se va a generar. No modifica las respuestas del cuestionario ni el cálculo realizado.
                    </Box>
                </DialogContent>
                <DialogActions sx={DIALOG_ACTIONS_SX}>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            handleRowClick(pendingPrintData.rowItem, false);
                            setPendingPrintData(null);
                            setIsModalOpen(false);
                        }}
                        sx={SECONDARY_BTN_SX}
                    >
                        No incluir
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            handleRowClick(pendingPrintData.rowItem, true);
                            setPendingPrintData(null);
                            setIsModalOpen(false);
                        }}
                        sx={PRIMARY_BTN_SX}
                    >
                        Incluir en informe
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EncountersScreen;
