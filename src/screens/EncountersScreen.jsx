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
    const [rowsPerPage, setRowsPerPage] = useState(5);
    // eslint-disable-next-line no-unused-vars
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
        "Benigno": { code: "37310001", display: "Benigno" },
        "Maligno": { code: "363346000", display: "Maligno" },
        "Desconocido / Incierto": { code: "70852002", display: "Desconocido / Incierto" }
    };
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return isNaN(date) ? '' : date.toLocaleDateString('es-ES');
    };
    const handlePrintButtonClick = (responses, observations) => {
        try {
            console.log("pasa")

            console.log(responses)
            const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";
            console.log("hasMassInReports", hasMassInReports)
            const generated = responses.map((r) => generateReport(r));

            console.log(generated)

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

            //const getReport = (title) => reports.find((report) => report.title === title)?.text || '';


            const patientName = getResponse("PAT_NOMBRE");
            const patientNHC = getResponse("PAT_NHC");
            //const patientAge = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_EDAD".toLowerCase())?.answer?.[0]?.valueInteger || '';
            const patientAge = getResponse("PAT_EDAD");
            const patientFUR = getResponse("PAT_FUR");
            const indicacion = getResponse("PAT_IND");

            const doc = new jsPDF();  // Crea una nueva instancia de jsPDF

            //Encabezado: logo, hospital y servicio
            doc.addImage(LogoHRYC, "JPEG", 10, 10, 90, 15);
            doc.setFont("helvetica", "bold");
            //doc.setFontSize(16);
            //doc.text("Hospital Universitario Ramón y Cajal", 115, 20);
            doc.setFontSize(12);
            doc.text("Servicio de Ginecología y Obstetricia", 120, 20);

            /*doc.autoTable({
              startY: 40,
              head: [["Nombre", "NHC", "Fecha de nacimiento", "Fecha de Última Regla"]],
              body: [[patientName, patientNHC, birthDate(patientAge), patientFUR]],
              theme: 'grid'
            });*/

            //Datos de la paciente
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Datos de la paciente:", 10, 50);

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Nombre:", 15, 60);
            doc.setFont("helvetica", "normal");
            doc.text(patientName, 65, 60);

            doc.setFont("helvetica", "bold");
            doc.text("NHC:", 15, 70);
            doc.setFont("helvetica", "normal");
            doc.text(patientNHC, 65, 70);

            doc.setFont("helvetica", "bold");
            doc.text("Edad:", 15, 80);
            doc.setFont("helvetica", "normal");
            doc.text(patientAge.toString(), 65, 80);

            doc.setFont("helvetica", "bold");
            doc.text("FUR:", 15, 90);
            doc.setFont("helvetica", "normal");
            doc.text(formatDate(patientFUR), 65, 90);

            let yPosition = 100; // Posición inicial en Y para el primer bloque de texto

            //Sección del informe: indicación, descripción y conclusión
            const addSection = (title, text, massIndex = null) => {
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(title, 10, yPosition);
                yPosition += 10; // Espacio entre el título y el texto

                //Si hay más de una masa anexial, se añade el título de la masa
                if (massIndex !== null) {
                    doc.setFontSize(11);
                    doc.setFont("helvetica", "bold");
                    doc.text("Conclusión de la Masa Anexial " + (massIndex + 1), 15, yPosition);
                    yPosition += 10;
                }

                doc.setFontSize(11);
                doc.setFont("helvetica", "normal");
                const textLines = doc.splitTextToSize(text, 180); // Ajusta el ancho según sea necesario  
                doc.text(textLines, 10, yPosition);
                yPosition += textLines.length * 4 + 10; // Actualiza la posición en Y para el siguiente bloque de texto
            };

            addSection("Indicación de la ecografía: ", indicacion);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Descripción de la imagen: ", 10, yPosition);
            yPosition += 10;

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            generated.forEach((report, index) => {
                if (hasMassInReports) {
                    doc.setFontSize(11);
                    doc.setFont("helvetica", "bold");
                    doc.text("Masa anexial " + (index + 1), 15, yPosition);
                    yPosition += 10;
                }
                doc.setFont("helvetica", "normal");

                // Reemplaza <br> por saltos de línea
                const htmlConSaltos = report.text.replace(/<br\s*\/?>/gi, "\n");

                // Crea un elemento temporal para interpretar el HTML
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = htmlConSaltos;

                // Extrae el texto plano (ahora con saltos de línea donde estaban los <br>)
                let plainText = tempDiv.innerText;

                // Opcional: normaliza el texto (por ejemplo, eliminando múltiples saltos de línea consecutivos)
                const normalizedText = plainText.replace(/\n+/g, "\n").trim();

                // Usa splitTextToSize para dividir el texto en líneas según el ancho máximo
                const maxWidth = 180; // Ancho máximo en el PDF (ajusta según tus necesidades)
                const textLines = doc.splitTextToSize(normalizedText, maxWidth);
                doc.setFontSize(11);
                // Agrega el bloque de texto al PDF
                doc.text(textLines, 10, yPosition, { align: "left" });

                // Actualiza la posición en Y para el siguiente reporte
                yPosition += textLines.length * 4 + 10;
            });

            // Espacio para las conclusiones
            console.log("observations", observations)
            const validObservations = observations
            //const validObservations = observations.filter((observation) => observation.trim().length > 0); // Filtra las observaciones vacías o nulas
            if (validObservations.length > 0) {
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("Conclusiones del ecografista: ", 10, yPosition);
                yPosition += 10;

                validObservations.forEach((observation, index) => {
                    if (validObservations.length > 1) {
                        doc.setFontSize(11);
                        doc.setFont("helvetica", "bold");
                        doc.text("Conclusión de la Masa Anexial " + (index + 1), 15, yPosition);
                        yPosition += 10;
                    }
                    doc.setFontSize(11);
                    doc.setFont("helvetica", "normal");

                    const text = observation.text || observation.valueString || "";
                    const textLines = doc.splitTextToSize(text, 180);
                    //const textLines = doc.splitTextToSize(observation, 180); // Ajusta el ancho según sea necesario
                    doc.text(textLines, 10, yPosition);
                    yPosition += textLines.length + 10; // Actualiza la posición en Y para el siguiente bloque de texto
                });
            }

            //Pie de página: nombre del médico y fecha
            const today = new Date();
            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.text("Hospital Universitario Ramón y Cajal - Madrid", 10, 260);
            doc.text("Fecha: " + today.toLocaleDateString(), 150, 260);
            //  doc.text("Ecografista: " + practitioner, 10, 270);

            // Guarda el PDF
            //doc.save("informe.pdf");
            // Configura el PDF para que se imprima automáticamente
            doc.autoPrint();
            window.open(doc.output("bloburl"), "_blank");  // Abre el PDF en una nueva pestaña

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
        const MA_VOL = (parseFloat(MA_M1) * parseFloat(MA_M2) * parseFloat(MA_M3) * 0.52).toFixed(2);
        const MA_SOL_CONTORNO = getValue('MA_SOL_CONTORNO');
        const MA_CONTENIDO = getValue('MA_CONTENIDO');
        const MA_SOL_VASC = getValue('MA_SOL_VASC');
        const MA_Q_CONTORNO = getValue('MA_Q_CONTORNO');
        const MA_Q_GROSOR = getValue('MA_Q_GROSOR');
        const MA_Q_VASC = getValue('MA_Q_VASC');
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
            if (MA_TIPO === 'sólida') {   //Masa anexial SÓLIDA
                if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {   //Estructura o lateralidad INDEFINIDAS
                    report += `De dependencia <b>indefinida</b>, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm <b>(${MA_VOL} mm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${MA_SOL_CONTORNO}</b>, de contenido <b>${MA_CONTENIDO}</b> y vascularización <b>${MA_SOL_VASC}</b>.<br/>`;
                } else {
                    report += `Dependiente de <b>${MA_ESTRUCTURA}</b> en lado <b>${MA_LADO}</b>, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm <b>(${MA_VOL} mm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${MA_SOL_CONTORNO}</b>, de contenido <b>${MA_CONTENIDO}</b> y vascularización <b>${MA_SOL_VASC}</b>.<br/>`;
                }
            } else if (MA_TIPO === 'quística' || MA_TIPO === 'sólido-quística') {   //Masa anexial QUÍSTICA o SÓLIDO-QUÍSTICA
                if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {     //Estructura o lateralidad INDEFINIDAS
                    report += `De dependencia <b>indefinida</b>, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm <b>(${MA_VOL} mm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${MA_Q_CONTORNO}</b> y de contenido <b>${MA_CONTENIDO}</b>.<br/>`;
                } else {
                    report += `Dependiente de <b>${MA_ESTRUCTURA}</b> en lado <b>${MA_LADO}</b>, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm <b>(${MA_VOL} mm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${MA_Q_CONTORNO}</b> y de contenido <b>${MA_CONTENIDO}</b>.<br/>`;
                }

                report += `La pared mide <b>${MA_Q_GROSOR} mm</b> y su vascularización es <b>${MA_Q_VASC}</b>.<br/>`;

                if (MA_Q_CONTORNO === 'irregular') {    //Contorno irregular.
                    report += `Contiene <b>${MA_Q_P} papila/s</b>, la mayor de ellas de <b>${MA_Q_P_M1} x ${MA_Q_P_M2} mm</b> de morfología <b>${MA_Q_P_CONTORNO}</b>, con vascularización <b>${MA_Q_P_VASC}</b>.<br/>`;
                }

                if (MA_Q_T === 'sí') {      //Presencia de tabiques.
                    report += `Los tabiques son <b>${MA_Q_T_TIPO}</b>, de grosor <b>${MA_Q_T_GROSOR} mm</b> y vascularización <b>${MA_Q_T_VASC}</b>. La formación tiene <b>${MA_Q_T_N} lóculo/s</b>.<br/>`;
                }

                if (MA_Q_AS === 'sí') {   //Área sólida.
                    report += `Contiene <b>${MA_Q_AS_N} porción/es sólida/s</b>, la mayor de ellas tiene un tamaño de <b>${MA_Q_AS_M1} x ${MA_Q_AS_M2} x ${MA_Q_AS_M3} mm</b> con vascularización <b>${MA_Q_AS_VASC}</b>.<br/>`;
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

            //report += `La probabilidad de que la masa anexial sea maligna es de <b>${RES_SCORE}</b>. <br/>`;
        }

        return {
            text: report,
            score: RES_SCORE
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
        item.encounterText.toLowerCase().includes(search.toLowerCase()) ||
        item.patientId.toLowerCase().includes(search.toLowerCase())
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
    const handleRowClick = (questionnaireResponse, observations) => {
        console.log("questionnaireResponse", JSON.parse(questionnaireResponse))
        setSelectedQuestionnaire(JSON.parse(questionnaireResponse));
        handlePrintButtonClick(JSON.parse(questionnaireResponse), JSON.parse(observations));
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
                📋 Lista de Citas cursadas
            </Typography>
            {/* Campo de búsqueda */}
            <TextField
                label="Buscar por paciente o tipo de encuentro"
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
                                    Tipo de Cita
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
                            const hasMass = getAnswerByLinkId(item.questionnaireResponse, "PAT_MA") === "1";
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
                                        const riskData = typeof item.risk === 'string' ? JSON.parse(item.risk) : item.risk;
                                        parsed = Array.isArray(riskData) ? riskData : [riskData];
                                        } catch (e) {
                                        console.error("Error al parsear item.risk:", e);
                                        }

                                        return parsed
                                        .map(r => parseFloat(r?.prediction?.[0]?.probabilityDecimal))
                                        .filter(p => !isNaN(p))
                                        .map(p => (p * 100).toFixed(2) + '%')
                                        .join(' - ');
                                    })()}
                                    </TableCell>
                                    <TableCell>{item.encounterText}</TableCell>
                                    <TableCell>{new Date(item.encounterPeriodStart).toLocaleString()}</TableCell>
                                    <TableCell style={{ textAlign: 'center' }}>
                                        <Tooltip title="Ver Detalles">
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleRowClick(item.questionnaireResponse, item.observation)}
                                            >
                                                <LocalPrintshopIcon />
                                            </IconButton>
                                        </Tooltip>
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
        </Container>
    );
};

export default EncountersScreen;
