import { People, CalendarMonth, MedicalInformation, LocalHospital } from "@mui/icons-material";
import { Box, Button, Grid2, Paper, Tooltip, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/ApiService";
import doctora from "../assets/images/doctora.png";
const WelcomeScreen = ({ keycloak, practitionerName, isAdmin }) => {

  const [counts, setCounts] = useState({
    Patient: 0,
    Encounter: 0,
    Condition: 0,
  });
  useEffect(() => {
    console.log("ENTRA");
    console.log(keycloak.token);
    if (!keycloak || !keycloak.token) return;
    const fetchCounts = async () => {
      try {
        if (!keycloak || !keycloak.token) return; // 🛑 Salir si no está listo
        const response = await ApiService(keycloak.token, 'GET', `/fhir/count-all-types`, {});
        if (response.status === 200) {
          const data = await response.json();
          console.log("Datos recibidos:", data);
          setCounts(data);
        } else {
          console.warn("Error al obtener conteos:", response.status);
        }
      } catch (error) {
        console.error("Error al llamar al backend:", error);
      }
    };

    fetchCounts();
  }, [keycloak]);


  const navigate = useNavigate();

  const handleNewPatientClick = async () => {
    console.log("Iniciar nuevo cuestionario");
       try {
            const body = {
              action: "START_QUESTIONNAIRE",
              details: "Usuario inició cuestionario",
              durationMs: 0
            }
            const  res = await ApiService(keycloak.token, 'POST', `/audit/register`, body);
            console.log("observation: " + res.status)
        } catch (error) {
            console.error("Error al auditar el inicio de cuestionario:", error);
        }
    navigate('/questionnaire');
  };
  const handleResponsesClick = () => {
    navigate('/responses');
  };
  const handleEncountersClick = () => {
    navigate('/encounters');
  };

  return (
    <Box sx={{ px: 4, py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Panel de Control - Revisión Ginecológica
      </Typography>

      {/* Contenedor de estadísticas con separación */}

      <Grid2
        container
        spacing={3}
        alignItems="stretch" // <- clave para que cada tarjeta tenga la misma altura
        sx={{ mb: 4 }}
      >
        {[
          { label: 'Pacientes Atendidas', icon: <People fontSize="large" color="primary" />, count: counts.Patient, tooltip: 'Número total de pacientes registrados en el sistema.' },
          { label: 'Citas Cursadas', icon: <CalendarMonth fontSize="large" color="success" />, count: counts.Encounter, tooltip: 'Total de citas clínicos realizadas.' },
          { label: 'Cuestionarios Realizados', icon: <MedicalInformation fontSize="large" color="warning" />, count: counts.QuestionnaireResponse, tooltip: 'Informes completados durante las visitas.' },
          { label: 'Masas Anexiales', icon: <LocalHospital fontSize="large" color="error" />, count: counts.RiskAssessment, tooltip: 'Casos en los que se ha evaluado riesgo de masa anexial.' },
        ].map(({ label, icon, count,tooltip }, index) => (
          <Grid2 item xs={12} sm={6} md={4} key={index} sx={{ display: 'flex' }}>
            <Tooltip title={tooltip} placement="top">
              <Paper
                sx={{
                  flex: 1, // <- ocupa todo el espacio dentro del grid
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 3,
                  textAlign: 'center',
                  minWidth: '200px',
                  minHeight: 180, // puedes ajustar esta altura según tu gusto
                }}
              >
                {icon}
                <Typography variant="h6" sx={{ mt: 1 }}>{label}</Typography>
                <Typography variant="h4">{count}</Typography>
              </Paper>
            </Tooltip>
          </Grid2>
        ))}
      </Grid2>


      {/* Acciones rápidas centradas debajo */}
      <Grid2
        container
        spacing={3}
        alignItems="flex-start"
        wrap="nowrap"
      >
        {/* Columna: Acciones Rápidas */}
        <Grid2 item xs={12} sm={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6">Acciones Rápidas</Typography>
            <Box display="flex" flexDirection="column" gap={2} mt={2}>
              <Button onClick={handleNewPatientClick} variant="contained" color="primary">Iniciar Cuestionario</Button>
              <Button onClick={handleResponsesClick} variant="contained" sx={{
                backgroundColor: '#ed6c02', // color personalizado
                color: '#fff',              // color del texto
                '&:hover': {
                  backgroundColor: '#bd5806', // color al pasar el cursor
                },
              }}>Revisar Cuestionarios </Button>
              <Button onClick={handleEncountersClick} variant="contained" sx={{
                backgroundColor: '#2e7d32', // color personalizado
                color: '#fff',              // color del texto
                '&:hover': {
                  backgroundColor: '#236026', // color al pasar el cursor
                },
              }}>Revisar Citas </Button>
            </Box>

          </Paper>
        </Grid2>

        {/* Columna: Imagen de doctora (oculta en xs) */}
        <Grid2
          item
          sm={6}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
          justifyContent="center"
          alignItems="flex-start"

        >
          <Box
            component="img"
            src={doctora}
            alt="Doctora"
            sx={{ maxWidth: '60%', height: 'auto', objectFit: 'contain' }}
          />
        </Grid2>
      </Grid2>


    </Box>
  );
};

export default WelcomeScreen;
