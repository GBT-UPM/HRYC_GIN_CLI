import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TablePagination, TableSortLabel,
    TextField,
    Modal,
    Box,
    Button,
    Tooltip,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Chip
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import '../assets/css/ResponsesScreen.css';
import { useKeycloak } from '@react-keycloak/web';
import ApiService from '../services/ApiService';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { formatCodeStatusLabel, resolveDisplayStudyIdentifier, resolveStudyCodeDisplay } from '../utils/caseMetadata';
import { formatCaseStatusLabel, formatEvaluationStatusLabel } from '../utils/caseStatus';
import { formatEvaluationTypeLabel } from '../utils/evaluationType';
import { canUseGlobalView, getAllowedCenters, getDefaultCenter, isSiteCoordinator } from '../utils/auth';
import { getCaseEvaluations } from '../services/caseEvaluationService';
import { upsertHistopathology } from '../services/histopathologyService';
// Datos de ejemplo (pueden ser obtenidos de una API)
    const tipoMap = {
    'sólida': 'sólido',
    'quística': 'quístico',
    'sólido-quística': 'sólido-quístico'
  };

const ResponsesScreen = () => {
    const { keycloak, initialized } = useKeycloak();
    const allowedCenters = getAllowedCenters(keycloak);
    const isGlobalView = canUseGlobalView(keycloak);
    const shouldSelectCenter = !isGlobalView && allowedCenters.length > 1;
    const [selectedCenter, setSelectedCenter] = useState(getDefaultCenter(keycloak));
    const [data, setData] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [orderBy, setOrderBy] = useState('createdAt');
    const [orderDirection, setOrderDirection] = useState('desc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
    
    const [openModal, setOpenModal] = useState(false);
    const [histologyModalOpen, setHistologyModalOpen] = useState(false);
    const [selectedHistologyCase, setSelectedHistologyCase] = useState(null);
    const [histologyForm, setHistologyForm] = useState({
        status: 'PENDING',
        diagnosis: '',
        benignMalignant: '',
        tumorType: '',
        surgeryDate: '',
        pathologyDate: '',
        source: '',
        notes: '',
    });
    const [histologySaving, setHistologySaving] = useState(false);
    const [histologyError, setHistologyError] = useState('');
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
    const canManageHistopathology = (item) => (
        isSiteCoordinator(keycloak) &&
        allowedCenters.includes(String(item.centerId || '').trim().toUpperCase())
    );
    const hasStructuredHistology = (item) => Boolean(item.histologyStatus);
    const getHistopathologyActionLabel = (item) => (
        hasStructuredHistology(item) ? 'Actualizar histopatología del caso' : 'Registrar histopatología del caso'
    );
    const getRowActionKey = (item) => `${item.caseId || 'case'}:${item.evaluationId || 'legacy'}`;

    const openHistologyModal = (item) => {
        setSelectedHistologyCase(item);
        setHistologyForm({
            status: item.histologyStatus || 'PENDING',
            diagnosis: item.histologyDiagnosis || '',
            benignMalignant: item.benignMalignant || '',
            tumorType: item.tumorType || '',
            surgeryDate: item.surgeryDate || '',
            pathologyDate: item.pathologyDate || '',
            source: item.histologySource || '',
            notes: '',
        });
        setHistologyError('');
        setHistologyModalOpen(true);
    };

    const closeHistologyModal = () => {
        setHistologyModalOpen(false);
        setSelectedHistologyCase(null);
        setHistologyError('');
    };

    const handleHistologyFieldChange = (field) => (event) => {
        setHistologyForm((current) => ({
            ...current,
            [field]: event.target.value,
        }));
    };

    const handleSaveHistology = async () => {
        if (!selectedHistologyCase?.caseId) {
            return;
        }

        try {
            setHistologySaving(true);
            setHistologyError('');
            await upsertHistopathology(keycloak.token, selectedHistologyCase.caseId, {
                status: histologyForm.status,
                diagnosis: histologyForm.diagnosis,
                benignMalignant: histologyForm.benignMalignant || undefined,
                tumorType: histologyForm.tumorType,
                surgeryDate: histologyForm.surgeryDate || null,
                pathologyDate: histologyForm.pathologyDate || null,
                source: histologyForm.source,
                notes: histologyForm.notes,
            });
            closeHistologyModal();
            await fetchQuestionnaire();
        } catch (error) {
            setHistologyError(error.message || 'No se pudo registrar la histopatología.');
        } finally {
            setHistologySaving(false);
        }
    };

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

    const generateReport = () => {
        const getValue = (id) => {
            //const responses = JSON.parse(questionnaireResponse)
            const responses = selectedQuestionnaire.item

          const response = responses.find((resp) => resp.linkId.toLowerCase() === id.toLowerCase());
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
        const MA_PAPS = getValue('MA_PAPS');
        const MA_Q_P = getValue('MA_Q_P');
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
        
        const RES_SCORE = probabilidad.toFixed(4);
      
        //Construcción del informe
        let report = '';
        if (PAT_MA === 'no') {                  //Si NO hay masa anexial
          const OD_M1 = getValue('OD_M1');
          const OD_M2 = getValue('OD_M2');
          const OD_FOL = getValue('OD_FOL');
          const OI_M1 = getValue('OI_M1');
          const OI_M2 = getValue('OI_M2');
          const OI_FOL = getValue('OI_FOL');
  
          report += `<div>Anejo derecho de ${OD_M1} x ${OD_M2} mm con ${OD_FOL} folículo/s.</div>`;
          report += `<div>Anejo izquierdo de ${OI_M1} x ${OI_M2} mm con ${OI_FOL} folículo/s.</div>`;
        
          return report;
        } else {    //Si SÍ hay masa anexial
            const estructurasFemeninas = ['trompa'];
            if (['sólida', 'quística', 'sólido-quística'].includes(MA_TIPO)) {
                let dependencia = '';
                const contorno = MA_TIPO === 'sólida' ? MA_SOL_CONTORNO : MA_Q_CONTORNO;

                //Vascularización sólo para masas sólidas
                let vascularizacion_MA_SOL = '';
                if (MA_TIPO === 'sólida') {
                    vascularizacion_MA_SOL = MA_SOL_VASC === 'ninguno (score color 1)'
                        ? ' Es avascular.'
                        : ` Su grado de vascularización es ${MA_SOL_VASC  === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_SOL_VASC}.`;
                }
                if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {   //Estructura o lateralidad INDEFINIDAS
                    dependencia = 'De dependencia indefinida';
                } else {
                    const estructura = MA_ESTRUCTURA
                    const lado = estructurasFemeninas.includes(estructura) 
                        ? (MA_LADO === 'derecho' ? 'derecha' : MA_LADO === 'izquierdo' ? 'izquierda' : MA_LADO) : MA_LADO;
                    dependencia = `Dependiente de ${estructura} ${lado}`;
                }
                const contenido = MA_CONTENIDO === 'otro' ? MA_CONTENIDO_OTRO : MA_CONTENIDO;
                const tipoMasculino = tipoMap[MA_TIPO] || MA_TIPO;
                report += `<div>${dependencia}, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm (${MA_VOL} cm³) de aspecto ${tipoMasculino} de contorno ${contorno} y de contenido ${contenido}.${vascularizacion_MA_SOL}</div>`;

                // Información adicional para masas quísticas y sólido-quísticas 
                let vascularizacion_MA_Q = '';
                if (MA_TIPO === 'quística' || MA_TIPO === 'sólido-quística') {
                    vascularizacion_MA_Q = MA_Q_VASC === 'ninguno (score color 1)'
                        ? ' y es avascular'
                        : ` y su grado de vascularización es ${MA_Q_VASC === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_Q_VASC}`;
                    report += `<div>La pared mide ${MA_Q_GROSOR} mm ${vascularizacion_MA_Q}. El contorno es ${MA_Q_CONTORNO}.</div>`;
                    // Papilas
                    let vascularizacion_papila = '';
                    vascularizacion_papila = MA_Q_P_VASC === 'ninguno (score color 1)'
                        ? 'avascular'
                        : `con grado de vascularización ${MA_Q_P_VASC === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_Q_P_VASC}`;
                    if (MA_PAPS === 'sí') {    
                    report += `<div>Contiene ${MA_Q_P} papila/s, la mayor de ellas de ${MA_Q_P_M1} x ${MA_Q_P_M2} mm de morfología ${MA_Q_P_CONTORNO} y ${vascularizacion_papila}.</div>`;
                    }
                    // Tabiques
                    let vascularizacion_tabiques = '';
                    vascularizacion_tabiques = MA_Q_T_VASC === 'ninguno (score color 1)' 
                        ? ' y avasculares' 
                        : ` y su grado de vascularización es ${MA_Q_T_VASC === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_Q_T_VASC}`;
                    if (MA_Q_T === 'sí') {
                        report += `<div>Los tabiques son ${MA_Q_T_TIPO}, de grosor ${MA_Q_T_GROSOR} mm${vascularizacion_tabiques}. La formación tiene ${MA_Q_T_N} lóculo/s.</div>`;
                    }
                    // Área sólida
                    let vascularizacion_AS = '';
                    vascularizacion_AS= MA_Q_AS_VASC === 'ninguno (score color 1)' 
                        ? 'y es avascular' 
                        : `con grado de vascularización ${MA_Q_AS_VASC === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_Q_AS_VASC}`;
                    if (MA_Q_AS === 'sí') {
                        report += `<div>Contiene ${MA_Q_AS_N} porción/es sólida/s, la mayor de ellas tiene un tamaño de ${MA_Q_AS_M1} x ${MA_Q_AS_M2} x ${MA_Q_AS_M3} mm ${vascularizacion_AS}.</div>`;
                    }
                }
                // Esto no depende del tipo de masa anexial.
                if (MA_SA === 'sí') {   //Sombra acústica posterior.
                    report += `<div>Presenta sombra posterior.</div>`;
                }
                if (MA_PS === 'sí') {   //Parénquima ovárico sano.
                    report += `<div>Tiene parénquima ovárico sano, de tamaño ${MA_PS_M1} x ${MA_PS_M2} x ${MA_PS_M3} mm.</div>`;
                }
                if (MA_ASC === 'sí') {    //Ascitis.
                    report += `<div>Presenta ascitis  ${MA_ASC_TIPO}.</div>`;
                }
                if (MA_CARC === 'sí') {   //Carcinomatosis.
                    report += '<div>Hay carcinomatosis.</div>';
                }
            }
            report += `<div>La probabilidad de que la masa anexial sea maligna es de ${(RES_SCORE ?? 0)* 100}%.</div>`;
          }

          return report;
      };
      const calcularLogit = (contorno, sombra, vascAreaSolida, vascPapila) =>{
        let logit = -3.625;
  
        //Cálculo coeficientes
        if (contorno === 'irregular') logit += 1.299;
  
        if (sombra === 'no') logit += 1.847;
  
        if (vascAreaSolida === 'nula (score color 1)' || vascAreaSolida === 'leve (score color 2)') logit += 2.209;
        else if (vascAreaSolida === 'moderada (score color 3)' || vascAreaSolida === 'abundante (score color 4)') logit += 2.967
  
        if (vascPapila === 'nula (score color 1)' || vascPapila === 'leve (score color 2)') logit += 1.253;
        else if (vascPapila === 'moderada (score color 3)' || vascPapila === 'abundante (score color 4)') logit +=1.988;
  
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
                "No se pudieron cargar los cuestionarios."
            );
            setData(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al obtener los datos del paciente:", error);
            setData([]);
            setError(error.message || "No se pudieron cargar los cuestionarios.");
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
            item.histologyStatus,
            item.histologyDiagnosis,
            item.benignMalignant,
            item.tumorType,
            item.histologySource,
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
    const histopathologyActionRowsByCase = new Map();
    sortedData.forEach((item) => {
        if (!item.caseId) return;
        const current = histopathologyActionRowsByCase.get(item.caseId);
        if (!current || item.primaryEvaluation === true) {
            histopathologyActionRowsByCase.set(item.caseId, getRowActionKey(item));
        }
    });
    const shouldShowHistopathologyAction = (item) => (
        canManageHistopathology(item) &&
        item.caseId &&
        histopathologyActionRowsByCase.get(item.caseId) === getRowActionKey(item)
    );
    const shouldShowSharedHistologyText = (item) => (
        canManageHistopathology(item) &&
        item.caseId &&
        histopathologyActionRowsByCase.has(item.caseId) &&
        histopathologyActionRowsByCase.get(item.caseId) !== getRowActionKey(item)
    );
    // Función para abrir el modal con el detalle del cuestionario
    const handleRowClick = async (item) => {
        try {
            const questionnaireResponse = await fetchQuestionnaireResponseByFhirId(item.questionnaireResponseFhirId);
            setSelectedQuestionnaire(questionnaireResponse);
            setOpenModal(true);
        } catch (error) {
            console.error("Error al obtener el cuestionario:", error);
        }
    };
    // Paginación de datos
    const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    return (
        <Container className="container">

            <Typography variant="h4" gutterBottom>
                📋 Casos y evaluaciones
            </Typography>
            {shouldSelectCenter && (
                <FormControl sx={{ minWidth: 220, mt: 2 }}>
                    <InputLabel id="responses-center-label">Centro</InputLabel>
                    <Select
                        labelId="responses-center-label"
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
            {isGlobalView && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Vista global
                </Typography>
            )}
            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}
            {/* Campo de búsqueda */}
            <TextField
                label="Buscar por caso, evaluación, código de estudio, centro, lateralidad, ámbito, tipo o ecografista"
                variant="outlined"
                fullWidth
                sx={{ mt: 5 }}
                className="search-box"
                InputProps={{
                    startAdornment: <SearchIcon color="primary" sx={{ marginRight: 1 }} />
                }}
                onChange={(e) => setSearch(e.target.value)}
            />

            <TableContainer className="table-container" component={Paper} sx={{ marginTop: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow className="table-header">
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'identifier'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('identifier')}
                                >
                                    Caso / Evaluación
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'codeStatus'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('codeStatus')}
                                >
                                    Estado código
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'evaluationType'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('evaluationType')}
                                >
                                    Tipo
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'caseStatus'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('caseStatus')}
                                >
                                    Estado caso
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'evaluationStatus'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('evaluationStatus')}
                                >
                                    Estado evaluación
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'studyCode'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('studyCode')}
                                >
                                    Código de estudio
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'center'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('center')}
                                >
                                    Centro
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'laterality'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('laterality')}
                                >
                                    Lateralidad
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'careSettingDisplay'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('careSettingDisplay')}
                                >
                                    Ámbito asistencial
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'risk'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('risk')}
                                >
                                    Riesgo
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'histology'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('histology')}
                                >
                                    Histologia
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'observerInitials'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('observerInitials')}
                                >
                                    Ecografista
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'createdAt'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('createdAt')}
                                >
                                    Fecha de la cita
                                </TableSortLabel>
                            </TableCell>
                            <TableCell><span>Acciones</span></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedData.map((item, index) => {

                            return (
                                <TableRow
                                    className="table-row"
                                    key={index}
                                    hover

                                    style={{ cursor: 'pointer' }}
                                >
                                    <TableCell>{getIdentifier(item)}</TableCell>
                                    <TableCell>{getCodeStatus(item)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getEvaluationType(item)}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                borderColor: '#9bb7d7',
                                                color: '#315f86',
                                                backgroundColor: '#f3f8fc',
                                                fontWeight: 500,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>{getCaseStatus(item)}</TableCell>
                                    <TableCell>{getEvaluationStatus(item)}</TableCell>
                                    <TableCell>{getStudyCode(item)}</TableCell>
                                    <TableCell>{getCenter(item)}</TableCell>
                                    <TableCell>{getLaterality(item)}</TableCell>
                                    <TableCell>{getCareSetting(item)}</TableCell>
                                    <TableCell>{!isNaN(parseFloat(item.risk))
                                                ? (parseFloat(item.risk) * 100).toFixed(2) + '%'
                                                : 'No procede'}
                                    </TableCell>
	                                    <TableCell>{item.histology || 'Pendiente'}</TableCell>
	                                    <TableCell>{item.observerInitials || '—' }</TableCell>
	                                    <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</TableCell>
	                                    <TableCell style={{ textAlign: 'right' }}>
		                                        {shouldShowHistopathologyAction(item) && (
		                                            <Button
		                                                size="small"
		                                                variant="outlined"
		                                                onClick={() => openHistologyModal(item)}
		                                            >
		                                                {getHistopathologyActionLabel(item)}
		                                            </Button>
		                                        )}
	                                        {shouldShowSharedHistologyText(item) && (
	                                            <Typography variant="caption" color="text.secondary">
	                                                Histología compartida con el caso
	                                            </Typography>
	                                        )}
	                                        <Tooltip title="Ver Detalles">
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleRowClick(item)}
                                            >
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>
                                       
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Paginación */}
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
            />
            {/* Modal para mostrar el detalle del cuestionario */}
            <Modal open={openModal} onClose={() => setOpenModal(false)}>
                <Box className="modal-box" sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 700,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2
                }}>
                    <Typography variant="h6" gutterBottom>
                        Detalle del Cuestionario
                    </Typography>
                    {selectedQuestionnaire ? (
                        // <>
                        //     <Typography><b>ID:</b> {selectedQuestionnaire.id}</Typography>
                        //     <Typography><b>Estado:</b> {selectedQuestionnaire.status}</Typography>
                        //     <Typography variant="h6" sx={{ mt: 2 }}>Preguntas y Respuestas:</Typography>
                        //     <ul className="no-bullets">
                        //         {selectedQuestionnaire.item.map((question, i) => (
                        //             <li key={i}>
                        //                 <b>{question.questionText}:</b>{" "}
                        //                 {question.answer.map((ans, idx) => (
                        //                     <span key={idx}>{getAnswerValue(ans)} </span>
                        //                 ))}
                        //             </li>
                        //         ))}
                        //     </ul>
                        // </>
                        <span className='report' dangerouslySetInnerHTML={{ __html: generateReport() }} />
                        
                        //<pre style={{ backgroundColor: '#f0f0f0', padding: '10px' }}>{generateReport()}</pre>
                    ) : (
                        <Typography>No hay detalles disponibles</Typography>
                    )}
                    <Button variant="contained" sx={{ mt: 2 }} onClick={() => setOpenModal(false)}>
                        Cerrar
                    </Button>
                </Box>
            </Modal>
            <Modal open={histologyModalOpen} onClose={closeHistologyModal}>
                <Box className="modal-box">
                    <Typography variant="h6" gutterBottom>
                        {hasStructuredHistology(selectedHistologyCase || {}) ? 'Actualizar histopatología del caso' : 'Registrar histopatología del caso'}
                    </Typography>
                    {histologyError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {histologyError}
                        </Alert>
                    )}
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="histology-status-label">Estado histopatología</InputLabel>
                        <Select
                            labelId="histology-status-label"
                            label="Estado histopatología"
                            value={histologyForm.status}
                            onChange={handleHistologyFieldChange('status')}
                        >
                            <MenuItem value="PENDING">Pendiente</MenuItem>
                            <MenuItem value="AVAILABLE">Disponible</MenuItem>
                            <MenuItem value="NOT_APPLICABLE">No aplicable</MenuItem>
                            <MenuItem value="UNKNOWN">Desconocido</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Diagnóstico"
                        fullWidth
                        sx={{ mb: 2 }}
                        value={histologyForm.diagnosis}
                        onChange={handleHistologyFieldChange('diagnosis')}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="benign-malignant-label">Benigno / borderline / maligno</InputLabel>
                        <Select
                            labelId="benign-malignant-label"
                            label="Benigno / borderline / maligno"
                            value={histologyForm.benignMalignant}
                            onChange={handleHistologyFieldChange('benignMalignant')}
                        >
                            <MenuItem value="">No especificado</MenuItem>
                            <MenuItem value="BENIGN">Benigno</MenuItem>
                            <MenuItem value="BORDERLINE">Borderline</MenuItem>
                            <MenuItem value="MALIGNANT">Maligno</MenuItem>
                            <MenuItem value="UNKNOWN">Desconocido</MenuItem>
                            <MenuItem value="NOT_APPLICABLE">No aplicable</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Tipo tumoral"
                        fullWidth
                        sx={{ mb: 2 }}
                        value={histologyForm.tumorType}
                        onChange={handleHistologyFieldChange('tumorType')}
                    />
                    <TextField
                        label="Fecha cirugía"
                        type="date"
                        fullWidth
                        sx={{ mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                        value={histologyForm.surgeryDate}
                        onChange={handleHistologyFieldChange('surgeryDate')}
                    />
                    <TextField
                        label="Fecha anatomía patológica"
                        type="date"
                        fullWidth
                        sx={{ mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                        value={histologyForm.pathologyDate}
                        onChange={handleHistologyFieldChange('pathologyDate')}
                    />
                    <TextField
                        label="Fuente"
                        fullWidth
                        sx={{ mb: 2 }}
                        value={histologyForm.source}
                        onChange={handleHistologyFieldChange('source')}
                    />
                    <TextField
                        label="Notas"
                        multiline
                        rows={3}
                        fullWidth
                        sx={{ mb: 2 }}
                        value={histologyForm.notes}
                        onChange={handleHistologyFieldChange('notes')}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSaveHistology}
                        disabled={histologySaving}
                    >
                        Guardar
                    </Button>
                    <Button
                        variant="outlined"
                        sx={{ ml: 2 }}
                        onClick={closeHistologyModal}
                        disabled={histologySaving}
                    >
                        Cancelar
                    </Button>
                </Box>
            </Modal>
        </Container>
    );
};

export default ResponsesScreen;
