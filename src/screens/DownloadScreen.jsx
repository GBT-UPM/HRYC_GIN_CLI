import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
    Grid2,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import '../assets/css/ResponsesScreen.css';
import { useKeycloak } from '@react-keycloak/web';

import dq from "../assets/images/downloadQuestionnaires.png";
import du from "../assets/images/downloadUsers.png";
import ApiService from '../services/ApiService';
import { getAllowedCenters, isClinician, isSiteCoordinator, isStudyCoordinator } from '../utils/auth';


const DownloadScreen = () => {
    const { keycloak } = useKeycloak();
    const allowedCenters = useMemo(() => getAllowedCenters(keycloak), [keycloak]);
    const hasScientificExportAccess = isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak);
    const showScientificExports = hasScientificExportAccess && !isClinician(keycloak);
    const [selectedCenter, setSelectedCenter] = useState(allowedCenters[0] || "");

    useEffect(() => {
        if (allowedCenters.length > 0 && !allowedCenters.includes(selectedCenter)) {
            setSelectedCenter(allowedCenters[0]);
        }
    }, [allowedCenters, selectedCenter]);

    const buildScientificEndpoint = (path) => {
        if (isStudyCoordinator(keycloak)) {
            return path;
        }

        if (isSiteCoordinator(keycloak) && selectedCenter) {
            return `${path}?centerId=${encodeURIComponent(selectedCenter)}`;
        }

        return path;
    };

    const downloadEndpoint = async (endpoint, fallbackFilename) => {
        try {
            const response = await ApiService(keycloak.token, 'GET', endpoint, {});
            if (response.status === 200) {

                const disposition = response.headers.get("Content-Disposition");

                const filenameMatch = disposition && disposition.match(/filename="?([^"]+)"?/);
                const filename = filenameMatch ? filenameMatch[1] : fallbackFilename;

                const blob = await response.blob();

                // Crear un enlace temporal para descargar
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);



            } else {
                throw new Error(`Error en la respuesta: ${response.status}`);
            }
        } catch (error) {
            console.error("Error al descargar los registros del estudio:", error);

        }
    };

    const handleScientificDownload = (resource) => {
        const endpoint = resource === 'cases'
            ? buildScientificEndpoint('/app/exports/study-cases.csv')
            : buildScientificEndpoint('/app/exports/study-evaluations.csv');
        const fallbackFilename = resource === 'cases'
            ? 'study-cases.csv'
            : 'study-evaluations.csv';

        return downloadEndpoint(endpoint, fallbackFilename);
    };

    const handleLegacyDownload = (recurso) => {
        if (recurso === 'p') {
            return downloadEndpoint('/downloadexcel/patients', 'patients.xlsx');
        }

        return downloadEndpoint('/downloadexcel/downloadExcel', 'questionnaires.xlsx');

    };

    return (
        <Box sx={{ px: 4, py: 3 }}>
            <Typography variant="h4" gutterBottom>
                Descargas - Revisión Ginecológica
            </Typography>

            {showScientificExports ? (
                <Paper elevation={0} sx={{ mt: 3, p: 3, border: '1px solid #d8e1e8', borderRadius: 2 }}>
                    <Stack spacing={2}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="h5">Exportaciones científicas</Typography>
                                <Chip label={isStudyCoordinator(keycloak) ? 'Global' : 'Centro'} size="small" color="primary" variant="outlined" />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                                Dataset controlado del estudio basado en CaseRecord, CaseEvaluation e HistopathologyResult.
                            </Typography>
                        </Box>

                        {isSiteCoordinator(keycloak) && !isStudyCoordinator(keycloak) && allowedCenters.length > 1 ? (
                            <FormControl size="small" sx={{ maxWidth: 280 }}>
                                <InputLabel id="download-center-label">Centro</InputLabel>
                                <Select
                                    labelId="download-center-label"
                                    value={selectedCenter}
                                    label="Centro"
                                    onChange={(event) => setSelectedCenter(event.target.value)}
                                >
                                    {allowedCenters.map((center) => (
                                        <MenuItem key={center} value={center}>{center}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : null}

                        <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    disabled={isSiteCoordinator(keycloak) && !isStudyCoordinator(keycloak) && !selectedCenter}
                                    onClick={() => handleScientificDownload('cases')}
                                >
                                    Descargar casos del estudio (CSV)
                                </Button>
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    disabled={isSiteCoordinator(keycloak) && !isStudyCoordinator(keycloak) && !selectedCenter}
                                    onClick={() => handleScientificDownload('evaluations')}
                                >
                                    Descargar evaluaciones del estudio (CSV)
                                </Button>
                            </Grid2>
                        </Grid2>
                    </Stack>
                </Paper>
            ) : (
                <Alert severity="info" sx={{ mt: 3 }}>
                    Las exportaciones científicas del estudio están disponibles para coordinadores de centro y del estudio.
                </Alert>
            )}

            <Box sx={{ mt: 4 }}>
                <Alert severity="warning">
                    Exportación legacy no válida para el dataset científico del estudio.
                </Alert>
            </Box>

            <Grid2 marginTop={"24px"} container spacing={4} justifyContent="center" alignItems="center">

                {/* Imagen de Cuestionarios */}
                <Grid2
                    onClick={() => handleLegacyDownload('q')}
                    border={"1px solid"}
                    borderColor={"#d8e1e8"}
                    bgcolor={"#f7f9fb"}
                    borderRadius={"8px"}
                    size={{ xs: 12, sm: 6 }}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    sx={{ px: 4, py: 2 }}
                >
                    <Tooltip title="Descargar cuestionarios completados en formato CSV">
                        <Box
                            component="img"
                            src={dq}
                            alt="Descargar respuestas"
                            sx={{ maxWidth: '180px', height: 'auto', objectFit: 'contain', cursor: 'pointer' }}
                        />
                    </Tooltip>
                    <Typography variant="subtitle1" sx={{ mt: 2, textTransform: 'uppercase' }}>
                        Descargar cuestionarios legacy
                    </Typography>
                </Grid2>

                {/* Imagen de Resultados del estudio */}
                <Grid2
                    onClick={() => handleLegacyDownload('p')}
                    border={"1px solid"}
                    borderColor={"#d8e1e8"}
                    bgcolor={"#f7f9fb"}
                    borderRadius={"8px"}
                    size={{ xs: 12, sm: 6 }}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    sx={{ px: 4, py: 2 }}
                >
                    <Tooltip title="Descargar resultados y observaciones del estudio en formato CSV">
                        <Box
                            component="img"
                            src={du}
                            alt="Descargar resultados"
                            sx={{ maxWidth: '180px', height: 'auto', objectFit: 'contain', cursor: 'pointer' }}
                        />
                    </Tooltip>
                    <Typography variant="subtitle1" sx={{ mt: 2, textTransform: 'uppercase' }}>
                        Descargar pacientes legacy
                    </Typography>
                </Grid2>

            </Grid2>
        </Box>

    );
};

export default DownloadScreen;
