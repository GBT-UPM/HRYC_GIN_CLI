import { People, CalendarMonth, MedicalInformation, LocalHospital } from "@mui/icons-material";
import { Alert, Box, Button, FormControl, Grid2, InputLabel, MenuItem, Paper, Select, Tooltip, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/ApiService";
import doctora from "../assets/images/doctora.png";
import { canUseGlobalView, getAllowedCenters, getDefaultCenter } from "../utils/auth";
import { CASE_EVALUATION_ERROR_MESSAGES, getCaseEvaluations } from "../services/caseEvaluationService";

const getUniqueCount = (items, selector) => {
  const values = new Set();

  items.forEach((item) => {
    const value = selector(item);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      values.add(String(value));
    }
  });

  return values.size;
};

export const buildDashboardCounts = (evaluations = []) => {
  const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];

  return {
    Patient: getUniqueCount(
      safeEvaluations,
      (item) => item.studyPatientCode || item.patientCode || item.patientId || item.caseId || item.caseDisplayId
    ),
    Encounter: safeEvaluations.length,
    QuestionnaireResponse: safeEvaluations.filter((item) => item.questionnaireResponseFhirId).length,
    RiskAssessment: getUniqueCount(
      safeEvaluations,
      (item) => item.caseId || item.caseDisplayId || item.studyPatientCode || item.patientCode
    ),
  };
};

const WelcomeScreen = ({ keycloak, practitionerName, isAdmin }) => {
  const token = keycloak?.token;
  const allowedCenters = getAllowedCenters(keycloak);
  const isGlobalView = canUseGlobalView(keycloak);
  const shouldSelectCenter = !isGlobalView && allowedCenters.length > 1;

  const [counts, setCounts] = useState({
    Patient: 0,
    Encounter: 0,
    QuestionnaireResponse: 0,
    RiskAssessment: 0,
  });
  const [selectedCenter, setSelectedCenter] = useState(getDefaultCenter(keycloak));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      console.log("[MainScreen] waiting for keycloak token", keycloak);
      return;
    }

    const fetchCounts = async () => {
      if (!isGlobalView && allowedCenters.length === 0) {
        setError(CASE_EVALUATION_ERROR_MESSAGES.missingCenter);
        return;
      }

      if (shouldSelectCenter && !selectedCenter) {
        setError("");
        return;
      }

      try {
        setError("");
        const data = await getCaseEvaluations(
          token,
          keycloak,
          selectedCenter,
          "No se pudieron cargar los datos del panel."
        );
        const nextCounts = buildDashboardCounts(data);
        setCounts(nextCounts);
      } catch (error) {
        console.error("Error al llamar al backend:", error);
        setError(error.message || "No se pudieron cargar los datos del panel.");
      }
    };

    fetchCounts();
  }, [token, keycloak, selectedCenter, isGlobalView, allowedCenters.length, shouldSelectCenter]);


  const navigate = useNavigate();

  const handleNewPatientClick = async () => {
    console.log("Iniciar nuevo cuestionario");
    if (!token) {
      console.warn("[MainScreen] No se puede iniciar cuestionario: token no disponible", {
        initialized: Boolean(keycloak),
        authenticated: keycloak?.authenticated,
        hasToken: Boolean(token),
        keycloakRealm: process.env.REACT_APP_KEYCLOAK_REALM,
        keycloakClientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID,
      });
      return;
    }

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

      {shouldSelectCenter && (
        <FormControl sx={{ minWidth: 220, mb: 2 }}>
          <InputLabel id="dashboard-center-label">Centro</InputLabel>
          <Select
            labelId="dashboard-center-label"
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vista global
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
          { label: 'Casos y evaluaciones', icon: <MedicalInformation fontSize="large" color="warning" />, count: counts.QuestionnaireResponse, tooltip: 'Evaluaciones registradas en casos del estudio.' },
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
          disabled={!token}
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
          Revisar casos y evaluaciones
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
