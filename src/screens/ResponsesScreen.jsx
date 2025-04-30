import React, { useState, useEffect } from 'react';
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
// Datos de ejemplo (pueden ser obtenidos de una API)


const ResponsesScreen = () => {
    const { keycloak, initialized } = useKeycloak();
    const [data, setData] = useState([]);
    const [setError] = useState(null);
    const [search, setSearch] = useState('');
    const [orderBy, setOrderBy] = useState('encounterPeriodStart');
    const [orderDirection, setOrderDirection] = useState('asc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
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
    const fetchQuestionnaire = async () => {
        try {
            const response = await ApiService(keycloak.token, 'GET', `/app/QuestionnaireResponse`, {});
            if (response.status === 200) {
                const data = await response.json();
                console.log(data)
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
    };
    // Simula la carga de datos desde una API (reemplazar con fetch/axios en entorno real)
    useEffect(() => {
        fetchQuestionnaire();

    }, [initialized]); // Ejecutar el efecto solo cuando Keycloak esté inicializado


    // Función para ordenar la tabla
    const handleSortRequest = (property) => {
        const isAsc = orderBy === property && orderDirection === 'asc';
        setOrderDirection(isAsc ? 'desc' : 'asc');
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
    const handleRowClick = (questionnaireResponse) => {
        setSelectedQuestionnaire(JSON.parse(questionnaireResponse));
        setOpenModal(true);
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
        const obsId=generateId();
        const encId=selectedRow.encounterId;
        const quesRId=JSON.parse(selectedRow.questionnaireResponse).id;
        const patientId=selectedRow.patientId;
        const text=histology;
        const note=pathologyReport;
        const Observation= generateObservation(obsId, encId, quesRId, patientId, code, display, text, note);
    //    const Observation= generateObservation(generateId(), selectedRow.encounterId, selectedRow.questionnaireResponse.id,selectedRow.patientId, code, display, histology, pathologyReport)
        try {
            const observation = await ApiService(keycloak.token, 'POST', `/fhir/Observation`, Observation);
            console.log("observation: "+ observation.status)

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
            <Typography variant="h4" className="title">
                📋 Lista de Cuestionarios Médicos
            </Typography>

            {/* Campo de búsqueda */}
            <TextField
                label="Buscar por paciente o tipo de encuentro"
                variant="outlined"
                fullWidth
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
                                    active={orderBy === 'patientId'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('patientId')}
                                >
                                    ID del Paciente
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
                                    active={orderBy === 'questionnaireResponse'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('questionnaireResponse')}
                                >
                                    Histologia
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'encounterText'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('encounterText')}
                                >
                                    Tipo de Encuentro
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'encounterPeriodStart'}
                                    direction={orderDirection}
                                    onClick={() => handleSortRequest('encounterPeriodStart')}
                                >
                                    Fecha del Encuentro
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
                            return (
                                <TableRow
                                    className="table-row"
                                    key={index}
                                    hover
                                    
                                    style={{ cursor: 'pointer' }}
                                >
                                    <TableCell>{item.patientId}</TableCell>
                                   <TableCell>{item.risk}</TableCell> 
                                    <TableCell>{
                                       observation !==null ? observation.valueCodeableConcept.text : "Pendiente"
                                    }</TableCell> 
                                    <TableCell>{item.encounterText}</TableCell>
                                    <TableCell>{new Date(item.encounterPeriodStart).toLocaleString()}</TableCell>
                                    <TableCell style={{ textAlign: 'center' }}>
                                        <Tooltip title="Ver Detalles">
                                            <IconButton 
                                                color="primary" 
                                                onClick={() => handleRowClick(item.questionnaireResponse)}
                                            >
                                              <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Editar">
                                            <IconButton 
                                                color="secondary" 
                                                onClick={() => handleEdit(item)}
                                            >
                                                <EditIcon></EditIcon>
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
                    width: 400,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2
                }}>
                    <Typography variant="h6" gutterBottom>
                        Detalle del Cuestionario
                    </Typography>
                    {selectedQuestionnaire ? (
                        <>
                            <Typography><b>ID:</b> {selectedQuestionnaire.id}</Typography>
                            <Typography><b>Estado:</b> {selectedQuestionnaire.status}</Typography>
                            <Typography variant="h6" sx={{ mt: 2 }}>Preguntas y Respuestas:</Typography>
                            <ul className="no-bullets">
                                {selectedQuestionnaire.item.map((question, i) => (
                                    <li key={i}>
                                        <b>{question.questionText}:</b>{" "}
                                        {question.answer.map((ans, idx) => (
                                            <span key={idx}>{getAnswerValue(ans)} </span>
                                        ))}
                                    </li>
                                ))}
                            </ul>
                        </>
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

export default ResponsesScreen;
