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
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
    <Typography
      variant="h4"
      gutterBottom
      sx={{
        fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
        textAlign: { xs: 'center', sm: 'left' },
      }}
    >
      Panel de Control - Revisión Ginecológica
    </Typography>

      {/* Contenedor de estadísticas con separación */}

      <Grid2
        container
        spacing={{ xs: 2, sm: 3 }}
        alignItems="stretch"
        sx={{ mb: 4 }}
      >
        {[
          { label: 'Pacientes Atendidas', icon: <People fontSize="large" color="primary" />, count: counts.Patient, tooltip: 'Número total de pacientes registrados en el sistema.' },
          { label: 'Citas Cursadas', icon: <CalendarMonth fontSize="large" color="success" />, count: counts.Encounter, tooltip: 'Total de citas clínicas realizadas.' },
          { label: 'Cuestionarios Realizados', icon: <MedicalInformation fontSize="large" color="warning" />, count: counts.QuestionnaireResponse, tooltip: 'Informes completados durante las visitas.' },
          { label: 'Masas Anexiales', icon: <LocalHospital fontSize="large" color="error" />, count: counts.RiskAssessment, tooltip: 'Casos en los que se ha evaluado riesgo de masa anexial.' },
        ].map(({ label, icon, count, tooltip }, index) => (
          <Grid2
            item
            xs={12}
            sm={6}
            md={3}
            key={index}
            sx={{ display: 'flex' }}
          >
            <Tooltip title={tooltip} placement="top">
              <Paper
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: { xs: 2, sm: 3 },
                  textAlign: 'center',
                  borderRadius: 2,
                  boxShadow: 2,
                  transition: 'transform 0.2s ease',
                  '&:hover': { transform: 'translateY(-4px)' },
                  minHeight: { xs: 140, sm: 160, md: 180 },
                }}
              >
                {icon}
                <Typography
                  variant="h6"
                  sx={{
                    mt: 1,
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontSize: { xs: '1.6rem', sm: '2rem' } }}
                >
                  {count}
                </Typography>
              </Paper>
            </Tooltip>
          </Grid2>
        ))}
      </Grid2>


      {/* Acciones rápidas centradas debajo */}
<Grid2 container spacing={3} alignItems="stretch" flexWrap="wrap">
  <Grid2 item xs={12} md={12}>
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3,
      }}
    >
      {/* Bloque de acciones rápidas */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-start' },
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            textAlign: { xs: 'center', md: 'left' },
            mb: 1,
          }}
        >
          Acciones Rápidas
        </Typography>

        <Button
          onClick={handleNewPatientClick}
          variant="contained"
          color="primary"
          fullWidth={false}
          sx={{ width: { xs: '100%', sm: '80%', md: '65%' } }}
        >
          Iniciar Cuestionario
        </Button>

        <Button
          onClick={handleResponsesClick}
          variant="contained"
          sx={{
            backgroundColor: '#ed6c02',
            color: '#fff',
            '&:hover': { backgroundColor: '#bd5806' },
            width: { xs: '100%', sm: '80%', md: '65%' },
          }}
        >
          Revisar Cuestionarios
        </Button>

        <Button
          onClick={handleEncountersClick}
          variant="contained"
          sx={{
            backgroundColor: '#2e7d32',
            color: '#fff',
            '&:hover': { backgroundColor: '#236026' },
            width: { xs: '100%', sm: '80%', md: '65%' },
          }}
        >
          Revisar Citas
        </Button>
      </Box>

      {/* Imagen al lado derecho */}
      <Box
        component="img"
        src={doctora}
        alt="Doctora"
        sx={{
          flexShrink: 0,
          maxWidth: { xs: '60%', sm: '40%', md: '40%' },
          height: 'auto',
          objectFit: 'contain',
          borderRadius: 2,
          boxShadow: 0,
          mt: { xs: 3, md: 0 },
          marginRight: { xs: 'opx', sm: '10px', md: '40px' },  
        }}
      />
    </Paper>
  </Grid2>
</Grid2>



    </Box>
  );
};

export default WelcomeScreen;
