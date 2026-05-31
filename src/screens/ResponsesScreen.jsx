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
    MenuItem
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import '../assets/css/ResponsesScreen.css';
import { useKeycloak } from '@react-keycloak/web';
import ApiService from '../services/ApiService';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useObservationHistologyTemplate } from '../hooks/useObservationHistologyTemplate';
import { v4 as uuidv4 } from "uuid";
import { formatCodeStatusLabel, resolveDisplayStudyIdentifier, resolveStudyCodeDisplay } from '../utils/caseMetadata';
// Datos de ejemplo (pueden ser obtenidos de una API)
    const tipoMap = {
    'sólida': 'sólido',
    'quística': 'quístico',
    'sólido-quística': 'sólido-quístico'
  };

const ResponsesScreen = () => {
    const { keycloak, initialized } = useKeycloak();
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
    const [openModalHisto, setOpenHistoModal] = useState(false);
    const [pathologyReport, setPathologyReport] = useState('');
    const [histology, setHistology] = useState('');
    const [selectedRow, setSelectedRow] = useState(null);
    const { generateObservation } = useObservationHistologyTemplate();
    /*    const histologyOptions = {
            "Benigno": { code: "37310001", display: "Benign neoplasm (disorder)" },
            "Maligno": { code: "363346000", display: "Malignant neoplastic disease (disorder)" },
            "Desconocido / Incierto": { code: "70852002", display: "Neoplasm of uncertain or unknown behaviour (disorder)" }
        }; */
    const histologyOptions = {
    "Benigno": {
        code: "37310001",
        display: "Benigno"
    },
    "Borderline": {
        code: "448829000",
        display: "Tumor borderline"
    },
    "Maligno": {
        code: "363346000",
        display: "Maligno"
    },
    "Tumor no anexial": {
        code: "128241005",
        display: "Tumor no anexial"
    },
    "Desconocido / Incierto": {
        code: "70852002",
        display: "Desconocido / Incierto"
    }
    };

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
    const getCenter = (item) => item.centerId || item.center || item.centerName || getQuestionnaireValue(item.questionnaireResponse, "HOSPITAL_REF") || "—";
    const getLaterality = (item) => item.lateralityDisplay || item.laterality || getQuestionnaireValue(item.questionnaireResponse, "MA_LADO") || "—";

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
        try {
            const response = await ApiService(keycloak.token, 'GET', `/app/cases/evaluations`, {});
            if (response.status === 200) {
                const data = await response.json();
                setData(Array.isArray(data) ? data : []);
            } else {
                throw new Error(`Error en la respuesta: ${response.status}`);
            }
        } catch (error) {
            console.error("Error al obtener los datos del paciente:", error);
            setError("Error al obtener los datos del paciente.");
        }
    }, [keycloak.token, setData, setError]);
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
            getIdentifier(item),
            getStudyCode(item),
            getCodeStatus(item),
            getCenter(item),
            getLaterality(item),
            new Date(item.createdAt).toLocaleString()
        ].join(" ").toLowerCase().includes(search.toLowerCase())
    );

    // Ordenación de datos
    const sortedData = filteredData.sort((a, b) => {
        const getSortValue = (item, property) => {
            if (property === "identifier") return getIdentifier(item);
            if (property === "studyCode") return getStudyCode(item);
            if (property === "codeStatus") return getCodeStatus(item);
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
    const handleRowClick = async (item) => {
        try {
            const questionnaireResponse = await fetchQuestionnaireResponseByFhirId(item.questionnaireResponseFhirId);
            setSelectedQuestionnaire(questionnaireResponse);
            setOpenModal(true);
        } catch (error) {
            console.error("Error al obtener el cuestionario:", error);
        }
    };
    // Abrir modal de edición
    const handleEdit = (row) => {
        setSelectedRow(row);
        setHistology(row.histology || '');  // Cargar valor actual
        setPathologyReport(row.pathologyReport || '');
        setOpenHistoModal(true);
    };
    // Paginación de datos
    const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const generateId = () => {
        return uuidv4(); // Genera un UUID único
    };
    // Guardar cambios y cerrar modal
    const handleSaveChanges = async () => {

        const histologyData = histologyOptions[histology];
        const code = histologyData.code;
        const display = histologyData.display;
        const obsId = generateId();
        const questionnaireResponse = await fetchQuestionnaireResponseByFhirId(selectedRow.questionnaireResponseFhirId);
        const encounterReference = questionnaireResponse?.partOf?.[0]?.reference || questionnaireResponse?.encounter?.reference || '';
        const patientReference = questionnaireResponse?.subject?.reference || '';
        const encId = encounterReference.replace('Encounter/', '');
        const quesRId = questionnaireResponse?.id || selectedRow.questionnaireResponseFhirId;
        const patientId = patientReference.replace('Patient/', '');
        const text = histology;
        const note = pathologyReport;
        const Observation = generateObservation(obsId, encId, quesRId, patientId, code, display, text, note);
        //    const Observation= generateObservation(generateId(), selectedRow.encounterId, selectedRow.questionnaireResponse.id,selectedRow.patientId, code, display, histology, pathologyReport)
        try {
            const observation = await ApiService(keycloak.token, 'POST', `/fhir/Observation`, Observation);

            if (observation.status === 200) {
                await fetchQuestionnaire();
            }
            setOpenHistoModal(false);
        } catch (error) {
            console.error("Error al guardar la observación:", error);
        }
    };
    return (
        <Container className="container">

            <Typography variant="h4" gutterBottom>
                📋 Lista de Cuestionarios
            </Typography>
            {/* Campo de búsqueda */}
            <TextField
                label="Buscar por identificador, centro, lateralidad o ecografista"
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
                                    <TableCell>{getStudyCode(item)}</TableCell>
                                    <TableCell>{getCenter(item)}</TableCell>
                                    <TableCell>{getLaterality(item)}</TableCell>
                                    <TableCell>{!isNaN(parseFloat(item.risk))
                                                ? (parseFloat(item.risk) * 100).toFixed(2) + '%'
                                                : 'No procede'}
                                    </TableCell>
                                    <TableCell>{item.histology || 'Pendiente'}</TableCell>
                                    <TableCell>{item.observerInitials || '—' }</TableCell>
                                    <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</TableCell>
                                    <TableCell style={{ textAlign: 'right' }}>
                                    {!item.histology && item.questionnaireResponseFhirId && (
                                            <Tooltip title="Editar">
                                                <IconButton
                                                    color="secondary"
                                                    onClick={() => handleEdit(item)}
                                                >
                                                    <EditIcon></EditIcon>
                                                </IconButton>
                                            </Tooltip>
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
            {/* Modal para editar la histología */}
            <Modal open={openModalHisto} onClose={() => setOpenHistoModal(false)}>
                <Box className="modal-box">
                    <Typography variant="h6" gutterBottom>
                        Editar Histología
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel>Resultado Histológico</InputLabel>
                        <Select
                            value={histology}
                            onChange={(e) => setHistology(e.target.value)}
                        >
                            {Object.keys(histologyOptions).map((key) => (
                                <MenuItem key={key} value={key}>
                                    {histologyOptions[key].display}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Anatomía Patológica Definitiva"
                        multiline
                        rows={4}
                        fullWidth
                        variant="outlined"
                        value={pathologyReport}
                        onChange={(e) => setPathologyReport(e.target.value)}
                    />
                    <Typography
                        variant="body2"
                        color="error"
                        sx={{ mt: 1 }}
                    >
                        Una vez guardado, no será posible editar este campo.
                    </Typography>
                    <Button
                        variant="contained"
                        sx={{ mt: 2 }}
                        color="primary"
                        onClick={handleSaveChanges}
                    >
                        Guardar Cambios
                    </Button>
                    <Button
                        variant="outlined"
                        sx={{ mt: 2, ml: 2 }}
                        onClick={() => setOpenHistoModal(false)}
                    >
                        Cancelar
                    </Button>
                </Box>
            </Modal>
        </Container>
    );
};

export default ResponsesScreen;
