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

import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshop';
import { useObservationHistologyTemplate } from '../hooks/useObservationHistologyTemplate';
import { v4 as uuidv4 } from "uuid";
import jsPDF from 'jspdf';
import LogoHRYC from "../assets/images/LogoHRYC.jpg";
import Logo12oct from "../assets/images/Logo12oct.jpg";
// Datos de ejemplo (pueden ser obtenidos de una API)


const EncountersScreen = () => {
    const { keycloak, initialized } = useKeycloak();
    const [data, setData] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [orderBy, setOrderBy] = useState('encounterPeriodStart');
    const [orderDirection, setOrderDirection] = useState('desc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    // eslint-disable-next-line no-unused-vars
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [openModalHisto, setOpenHistoModal] = useState(false);
    const [pathologyReport, setPathologyReport] = useState('');
    const [histology, setHistology] = useState('');
    const [selectedRow, setSelectedRow] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingPrintData, setPendingPrintData] = useState(null);
    const { generateObservation } = useObservationHistologyTemplate();
    /*    const histologyOptions = {
            "Benigno": { code: "37310001", display: "Benign neoplasm (disorder)" },
            "Maligno": { code: "363346000", display: "Malignant neoplastic disease (disorder)" },
            "Desconocido / Incierto": { code: "70852002", display: "Neoplasm of uncertain or unknown behaviour (disorder)" }
        }; */
    const histologyOptions = {
        "Benigno": { code: "37310001", display: "Benigno" },
        "Maligno": { code: "363346000", display: "Maligno" },
        "Desconocido / Incierto": { code: "70852002", display: "Desconocido / Incierto" }
    };
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return isNaN(date) ? '' : date.toLocaleDateString('es-ES');
    };
    const handlePrintButtonClick = (includeProbability, responses, observations, practitionerName) => {
        try {
            console.log("include Prbability: ", includeProbability);
            const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";
            console.log("hasMassInReports", hasMassInReports);

            const generated = responses.map((r) => generateReport(r));

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

            doc.addImage(LogoHRYC, "JPEG", 10, 10, 70, 15);
            doc.addImage(Logo12oct, "JPEG", 10, 80, 70, 15);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("Servicio de Ginecología y Obstetricia", 120, 20);

            const hospital = getResponse("HOSPITAL_REF");
            const patientName = getResponse("PAT_NOMBRE");
            const patientNHC = getResponse("PAT_NHC");
            const patientAge = getResponse("PAT_EDAD");
            const patientFUR = getResponse("PAT_FUR");
            const indicacion = getResponse("PAT_IND");
            const indicacion_otro = getResponse("PAT_IND_OTRO");

            let yPosition = 50;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            checkAndAddPage(doc, 10);
            doc.text("Datos de la paciente:", 10, yPosition);
            yPosition += 10;

            const addField = (label, value) => {
                checkAndAddPage(doc, 10);
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text(label, 15, yPosition);
                doc.setFont("helvetica", "normal");
                doc.text(value, 65, yPosition);
                yPosition += 10;
            };

            addField("Nombre:", patientName);
            addField("NHC:", patientNHC);
            //addField("Edad:", patientAge.toString());
            addField("FUR:", formatDate(patientFUR));

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
            indicacionFinal = indicacionFinal.toLowerCase()
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
            generated.forEach((report, index) => {
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

            const validObservations = observations;
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
                    const text = observation.text || observation.valueString || "";
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
            // doc.text("Hospital Universitario Ramón y Cajal - Madrid", 10, 260);
            doc.text(hospital, 10, 260);
            doc.text("Fecha: " + today.toLocaleDateString(), 150, 260);
            //const practitionerName = sessionStorage.getItem('practitionerName');
            doc.text("Ecografista: " + practitionerName, 10, 270);

            doc.autoPrint();
            window.open(doc.output("bloburl"), "_blank");
        } catch (error) {
            console.error("Error al guardar el encounter:", error);
            setError("Error al guardar el encounter.");
        }
    };
    const generateReport = useCallback((res) => {

        const getValue = (id) => {
            console.log("ID", id)
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
                report += `${dependencia}, se objetiva formación de <b>${MA_M1} x ${MA_M2} x ${MA_M3} mm</b> <b>(${MA_VOL} cm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${contorno}</b> y de contenido <b>${contenido}</b>.${vascularizacion_MA_SOL}<br/>`;
                
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
                    report += `Presenta ascitis de tipo <b>${MA_ASC_TIPO}</b>.<br/>`;
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
        try {
            const response = await ApiService(keycloak.token, 'GET', `/app/Encounter`, {});
            if (response.status === 200) {
                const data = await response.json();
                console.log(data);
                if (data && data.length > 0) {
                    setData(data);
                }
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
        item.practitionerName.toLowerCase().includes(search.toLowerCase()) ||
        item.patientIdentifier.toLowerCase().includes(search.toLowerCase()) ||
        item.patientName.toLowerCase().includes(search.toLowerCase()) ||
        item.risk.toLowerCase().includes(search.toLowerCase()) ||
        new Date(item.encounterPeriodStart).toLocaleString().includes(search.toLowerCase())
    );

    // Ordenación de datos
    const sortedData = filteredData.sort((a, b) => {
        if (orderDirection === 'asc') {
            return a[orderBy] < b[orderBy] ? -1 : 1;
        } else {
            return a[orderBy] > b[orderBy] ? -1 : 1;
        }
    });
    // Función para abrir el modal con el detalle del cuestionario
    const handleRowClick = (questionnaireResponse, observations, practitionerName, includeProbability) => {
        console.log("questionnaireResponse", JSON.parse(questionnaireResponse))
        setSelectedQuestionnaire(JSON.parse(questionnaireResponse));
        handlePrintButtonClick(includeProbability, JSON.parse(questionnaireResponse), JSON.parse(observations),practitionerName);
        //  setOpenModal(true);
    };
    // Abrir modal de edición
    const handleEdit = (row) => {
        setSelectedRow(row);
        setHistology(row.histology || '');  // Cargar valor actual
        setPathologyReport(row.pathologyReport || '');
        setOpenHistoModal(true);
    };
    // Función para obtener el valor de la respuesta de acuerdo al tipo
    const getAnswerValue = (answer) => {
        if (answer.valueString) return answer.valueString;
        if (answer.valueDate) return new Date(answer.valueDate).toLocaleDateString();
        if (answer.valueInteger) return answer.valueInteger.toString();
        if (answer.valueDecimal) return answer.valueDecimal.toString();
        if (answer.valueBoolean) return answer.valueBoolean ? "Sí" : "No";
        if (answer.valueCoding) return answer.valueCoding.code;
        return "No disponible";
    };
    // Paginación de datos
    const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const generateId = () => {
        return uuidv4(); // Genera un UUID único
    };
    // Guardar cambios y cerrar modal
    const handleSaveChanges = async () => {
        console.log(histology)
        console.log(pathologyReport)
        console.log(selectedRow.encounterId)
        console.log(selectedRow.patientId)
        console.log(JSON.parse(selectedRow.questionnaireResponse).id)

        const histologyData = histologyOptions[histology];
        const code = histologyData.code;
        const display = histologyData.display;
        const obsId = generateId();
        const encId = selectedRow.encounterId;
        const quesRId = JSON.parse(selectedRow.questionnaireResponse).id;
        const patientId = selectedRow.patientId;
        const text = histology;
        const note = pathologyReport;
        const Observation = generateObservation(obsId, encId, quesRId, patientId, code, display, text, note);
        //    const Observation= generateObservation(generateId(), selectedRow.encounterId, selectedRow.questionnaireResponse.id,selectedRow.patientId, code, display, histology, pathologyReport)
        try {
            const observation = await ApiService(keycloak.token, 'POST', `/fhir/Observation`, Observation);
            console.log("observation: " + observation.status)

            if (observation.status === 200) {
                await fetchQuestionnaire();
            }
            // console.log(updatedData);
            setOpenHistoModal(false);
        } catch (error) {
            console.error("Error al guardar la observación:", error);
        }
    };
    return (
        <Container className="container">

            <Typography variant="h4" gutterBottom>
                📋 Lista de Citas Cursadas
            </Typography>
            {/* Campo de búsqueda */}
            <TextField
                label="Buscar por paciente o ecografista"
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
                        <TableRow className="table-header2">
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'patientIdentifier'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('patientIdentifier')}
                                >
                                    NHC
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'patientName'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('patientName')}
                                >
                                    Nombre
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
                                    active={orderBy === 'encounterText'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('encounterText')}
                                >
                                    Ecografista
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'encounterPeriodStart'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('encounterPeriodStart')}
                                >
                                    Fecha de la cita
                                </TableSortLabel>
                            </TableCell>
                            <TableCell><span>Acciones</span></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedData.map((item, index) => {
                            //const questionnaireResponse = JSON.parse(item.questionnaireResponse);
                            console.log(item.observation)
                            const observation = item.observation && item.observation !== ""
                                ? JSON.parse(item.observation)
                                : null;

                            //Función para obtener el valor de la respuesta de acuerdo al linkId
                            const getAnswerByLinkId = (questionnaireResponse, linkId) => {
                                const responses = JSON.parse(questionnaireResponse)
                                if (!responses || !Array.isArray(responses.item)) return null;
                                const qItem = responses.item.find(i => i.linkId === linkId);
                                if (!qItem || !Array.isArray(qItem.answer) || qItem.answer.length === 0) return null;
                                return getAnswerValue(qItem.answer[0]);
                            };
                            const hasMass = getAnswerByLinkId(item.questionnaireResponse, "PAT_MA") === "Sí";
                            // console.log("hasMass en encounters = " + hasMass)
                            // console.log("getAnswerByLinkId: " + getAnswerByLinkId(item.questionnaireResponse, "PAT_MA"))
                            return (
                                <TableRow
                                    className="table-row"
                                    key={index}
                                    hover

                                    style={{ cursor: 'pointer' }}
                                >
                                    <TableCell>{item.patientIdentifier}</TableCell>
                                    <TableCell>{item.patientName}</TableCell>
                                    <TableCell>
                                        {(() => {
                                            let parsed = [];
                                            try {
                                                if (!item.risk || item.risk === "" || item.risk === "{}") {
                                                    return "No procede";
                                                }

                                                const riskData = typeof item.risk === 'string' ? JSON.parse(item.risk) : item.risk;
                                                parsed = Array.isArray(riskData) ? riskData : [riskData];
                                            } catch (e) {
                                                console.error("Error al parsear item.risk:", e);
                                                return "No procede";
                                            }

                                            const probabilities = parsed
                                                .map(r => parseFloat(r?.prediction?.[0]?.probabilityDecimal))
                                                .filter(p => !isNaN(p));

                                            return probabilities.length > 0
                                                ? probabilities.map(p => (p * 100).toFixed(2) + '%').join(' - ')
                                                : "No procede";
                                        })()}
                                    </TableCell>
                                    <TableCell>{item.practitionerName || '—'}</TableCell>
                                    <TableCell>{new Date(item.encounterPeriodStart).toLocaleString()}</TableCell>
                                    <TableCell style={{ textAlign: 'right' }}>
                                        {hasMass && observation === null && (
                                            <Tooltip title="Editar">
                                                <IconButton
                                                    color="secondary"
                                                    onClick={() => handleEdit(item)}
                                                >
                                                    <EditIcon></EditIcon>
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Imprimir informe">
                                            <IconButton
                                                color="primary"
                                                // Abrir modal para dar posibilidad de incluir probabilidad en el informe
                                                onClick={() => {
                                                    const parsedArray = typeof item.questionnaireResponse === 'string'
                                                     ? JSON.parse(item.questionnaireResponse) : item.questionnaireResponse;
                                                    const parsedResponse = parsedArray[0];
                                                    const patMaItem = parsedResponse?.item?.find((r) => r.linkId === 'PAT_MA');
                                                    let hasMass = false;
                                                    if (patMaItem?.answer?.[0]) {
                                                        const answer = patMaItem.answer[0];
                                                        hasMass = 
                                                            (answer.valueCoding?.display === "Sí") ||
                                                            (answer.valueString === "1") ||
                                                            (answer.valueCoding?.code === "1");
                                                    }
                                                    console.log("hasMass en encounters = " + hasMass)

                                                    if (hasMass) {
                                                        setPendingPrintData({
                                                            responses: item.questionnaireResponse,
                                                            observations: item.observation,
                                                            practitionerName: item.practitionerName
                                                        });
                                                        setIsModalOpen(true);
                                                    } else {
                                                        handleRowClick(item.questionnaireResponse, item.observation, item.practitionerName, false);
                                                    }
                                                }}
                                            >
                                                <LocalPrintshopIcon />
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
                        <InputLabel>Estado Histológico</InputLabel>
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
            {/* Modal para imprimir el informe */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <Box sx={{ p: 4, backgroundColor: 'white', borderRadius: 2, maxWidth: 400, mx: 'auto', my: '20%' }}>
                    <Typography variant="h6" gutterBottom>
                        Confirmación
                    </Typography>
                    <Typography sx={{ mt: 2}}>
                        ¿Desea incluir la probabilidad de malignidad en el informe?
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button variant="contained" color="primary"
                            onClick={() => {
                                handleRowClick(
                                    pendingPrintData.responses,
                                    pendingPrintData.observations,
                                    pendingPrintData.practitionerName,
                                    true
                                );
                                setPendingPrintData(null);
                                setIsModalOpen(false);
                            }}
                        >
                            Sí
                        </Button>
                        <Button variant="outlined" color="secondary" 
                            onClick={() => {
                                handleRowClick(
                                    pendingPrintData.responses,
                                    pendingPrintData.observations,
                                    pendingPrintData.practitionerName,
                                    false
                                );
                                setPendingPrintData(null);
                                setIsModalOpen(false);
                            }}
                        >
                            No
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </Container>
    );
};

export default EncountersScreen;
