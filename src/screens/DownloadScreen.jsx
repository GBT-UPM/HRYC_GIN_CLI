import React from 'react';
import { Box, Typography, Tooltip, Grid2 } from '@mui/material';
import '../assets/css/ResponsesScreen.css';
import { useKeycloak } from '@react-keycloak/web';

import dq from "../assets/images/downloadQuestionnaires.png";
import du from "../assets/images/downloadUsers.png";
import ApiService from '../services/ApiService';


const DownloadScreen = () => {
    const { keycloak} = useKeycloak();
    const handleDownload = async (recurso) => {
        try {
            var response = null;
            if (recurso === 'p') {
                response = await ApiService(keycloak.token, 'GET', `/downloadexcel/patients`, {});
            } else {
                response = await ApiService(keycloak.token, 'GET', `/downloadexcel/downloadExcel`, {});
            }
            // const response = await ApiService(keycloak.token, 'GET', `/downloadcsv`, {});
            if (response.status === 200) {

                const disposition = response.headers.get("Content-Disposition");
                console.log("Content-Disposition:", disposition);

                const filenameMatch = disposition && disposition.match(/filename="?([^"]+)"?/);
                const filename = filenameMatch ? filenameMatch[1] : "questionnaire.csv";

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
            console.error("Error al obtener los datos del paciente:", error);

        }

    };
    return (
        <Box sx={{ px: 4, py: 3 }}>
            <Typography variant="h4" gutterBottom>
                Descargas - Revisión Ginecológica
            </Typography>

            <Grid2 marginTop={"40px"} container spacing={12} justifyContent="center" alignItems="center">

                {/* Imagen de Cuestionarios */}
                <Grid2
                    onClick={() => handleDownload('q')}
                    border={"5px solid"}
                    borderColor={"#5a9dbc1f"}
                    bgcolor={"#5a9dbc1f"}
                    borderRadius={"10px"}
                    item
                    xs={12}
                    sm={6}
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
                        Descargar cuestionarios
                    </Typography>
                </Grid2>

                {/* Imagen de Resultados Pacientes */}
                <Grid2
                    onClick={() => handleDownload('p')}
                    border={"5px solid"}
                    borderColor={"#5a9dbc1f"}
                    bgcolor={"#5a9dbc1f"}
                    borderRadius={"10px"}
                    item
                    xs={12}
                    sm={6}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    sx={{ px: 4, py: 2 }}
                >
                    <Tooltip title="Descargar resultados y observaciones por paciente en formato CSV">
                        <Box
                            component="img"
                            src={du}
                            alt="Descargar resultados"
                            sx={{ maxWidth: '180px', height: 'auto', objectFit: 'contain', cursor: 'pointer' }}
                        />
                    </Tooltip>
                    <Typography variant="subtitle1" sx={{ mt: 2, textTransform: 'uppercase' }}>
                        Descargar resultados de pacientes
                    </Typography>
                </Grid2>

            </Grid2>
        </Box>

    );
};

export default DownloadScreen;
