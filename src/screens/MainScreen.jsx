import {
  Assignment,
  CalendarMonth,
  Close,
  Download,
  InfoOutlined,
  LocalHospital,
  MedicalInformation,
  People,
  PlaylistAddCheck,
  PostAdd,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid2,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/ApiService";
import {
  canRegisterQuestionnaire,
  canUseGlobalView,
  getAllowedCenters,
  getCentersDisplayLabel,
  getDefaultCenter,
  getPrimaryRoleLabel,
  isSiteCoordinator,
  isStudyCoordinator,
} from "../utils/auth";
import { CASE_EVALUATION_ERROR_MESSAGES } from "../services/caseEvaluationService";
import { DASHBOARD_ERROR_MESSAGES, getStudyDashboardStats } from "../services/studyDashboardService";

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

  const isAdnexalMass = (item) => {
    if (item.hasAdnexalMass === true)  return true;
    if (item.hasAdnexalMass === false) return false;
    // Legacy fallback: treat as mass unless both codes are NOT_APPLICABLE
    return item.lateralityCode !== 'NOT_APPLICABLE';
  };

  return {
    participants: getUniqueCount(
      safeEvaluations,
      (item) => item.studyParticipantId || item.studyPatientCode || item.patientCode
    ),
    encounters: getUniqueCount(safeEvaluations, (item) => item.encounterId),
    ultrasoundRecords: getUniqueCount(
      safeEvaluations,
      (item) => item.caseId || item.caseDisplayId
    ),
    adnexalMasses: getUniqueCount(
      safeEvaluations.filter(isAdnexalMass),
      (item) => item.caseId || item.caseDisplayId
    ),
  };
};

const WelcomeScreen = ({ keycloak, practitionerName, isAdmin }) => {
  const token = keycloak?.token;
  const allowedCenters = getAllowedCenters(keycloak);
  const isGlobalView = canUseGlobalView(keycloak);
  const roleLabel = getPrimaryRoleLabel(keycloak);
  const centersLabel = getCentersDisplayLabel(keycloak);
  const canUseQuestionnaireRegistration = canRegisterQuestionnaire(keycloak);
  const canManagePendingParticipants = isSiteCoordinator(keycloak);
  const canExportScientificData = isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak);
  const shouldSelectCenter = !isGlobalView && allowedCenters.length > 1;

  const [counts, setCounts] = useState({
    participants: 0,
    encounters: 0,
    ultrasoundRecords: 0,
    adnexalMasses: 0,
  });
  const [selectedCenter, setSelectedCenter] = useState(getDefaultCenter(keycloak));
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

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
        const stats = await getStudyDashboardStats(token, keycloak, selectedCenter);
        setCounts({
          participants:      stats.participantsCount      ?? 0,
          encounters:        stats.encountersCount        ?? 0,
          ultrasoundRecords: stats.ultrasoundRecordsCount ?? 0,
          adnexalMasses:     stats.adnexalMassesCount     ?? 0,
        });
      } catch (error) {
        console.error("Error al llamar al backend:", error);
        setError(error.message || DASHBOARD_ERROR_MESSAGES.generic);
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
      };
      const res = await ApiService(keycloak.token, 'POST', `/audit/register`, body);
      console.log("observation: " + res.status);
    } catch (error) {
      console.error("Error al auditar el inicio de cuestionario:", error);
    }
    navigate('/questionnaire');
  };
  const handleResponsesClick = () => { navigate('/responses'); };
  const handleEncountersClick = () => { navigate('/encounters'); };
  const handlePendingParticipantsClick = () => { navigate('/study-participants/pending'); };
  const handleExportsClick = () => { navigate('/download'); };

  const visibleScopeLabel = isGlobalView
    ? "Vista global"
    : selectedCenter
      ? `Centro ${selectedCenter}`
      : "Centro pendiente";

  const metricCards = [
    {
      label: "Pacientes incluidas",
      subtext: "Participantes únicas registradas",
      icon: <People fontSize="small" />,
      count: counts.participants,
    },
    {
      label: "Encuentros registrados",
      subtext: "Citas/ecografías con registro",
      icon: <CalendarMonth fontSize="small" />,
      count: counts.encounters,
    },
    {
      label: "Registros ecográficos",
      subtext: "Con o sin masa anexial",
      icon: <MedicalInformation fontSize="small" />,
      count: counts.ultrasoundRecords,
    },
    {
      label: "Masas anexiales detectadas",
      subtext: "Solo registros con masa",
      icon: <LocalHospital fontSize="small" />,
      count: counts.adnexalMasses,
    },
  ];

  const actionCards = [
    ...(canUseQuestionnaireRegistration
      ? [{
        title: "Nuevo cuestionario",
        text: "Registrar un nuevo caso ecográfico estructurado.",
        button: "Iniciar",
        icon: <PostAdd fontSize="small" />,
        onClick: handleNewPatientClick,
        disabled: !token,
      }]
      : []),
    {
      title: "Casos y evaluaciones",
      text: "Consultar ECO-SCORE, evaluaciones e histopatología.",
      button: "Revisar",
      icon: <Assignment fontSize="small" />,
      onClick: handleResponsesClick,
    },
    {
      title: "Citas / encuentros",
      text: "Consultar encuentros clínicos asociados al estudio.",
      button: "Ver citas",
      icon: <CalendarMonth fontSize="small" />,
      onClick: handleEncountersClick,
    },
    ...(canManagePendingParticipants
      ? [{
        title: "Participantes pendientes",
        text: "Asignar códigos de estudio y revisar pendientes.",
        button: "Gestionar",
        icon: <PlaylistAddCheck fontSize="small" />,
        onClick: handlePendingParticipantsClick,
      }]
      : []),
    ...(canExportScientificData
      ? [{
        title: "Exportaciones científicas",
        text: "Descargar datasets CSV/XLSX para análisis.",
        button: "Exportar",
        icon: <Download fontSize="small" />,
        onClick: handleExportsClick,
      }]
      : []),
  ];

  const studyInfoRows = [
    ["Vista actual", visibleScopeLabel],
    ["Centros incluidos", centersLabel],
    ["Rol activo", roleLabel],
    ["Exportaciones disponibles", canExportScientificData ? "CSV, XLSX" : "No disponibles para este rol"],
    ["Datos identificativos", "No incluidos en exportación científica"],
    ["Histopatología", "Gestionada desde «Casos y evaluaciones»"],
    ["Código de estudio", "Asignado automáticamente al guardar"],
  ];

  return (
    <Box sx={{ px: 0, py: 0 }}>
      {/* Bloque superior compacto */}
      <Paper
        className="study-page-header"
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 2,
          border: "1px solid #D9E2EC",
          borderRadius: 2,
          backgroundColor: "#FFFFFF",
        }}
      >
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: "#1F2933",
                  fontSize: { xs: "1.25rem", sm: "1.45rem", md: "1.6rem" },
                  fontWeight: 800,
                  letterSpacing: 0,
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                Panel principal del estudio MIA
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#52616B", fontSize: "0.875rem", lineHeight: 1.4 }}
              >
                Validación externa multicéntrica del ECO-SCORE en masas anexiales
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<InfoOutlined sx={{ fontSize: "1rem !important" }} />}
              onClick={() => setInfoOpen(true)}
              aria-label="Información del estudio"
              sx={{
                borderColor: "#D9E2EC",
                color: "#52616B",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                flexShrink: 0,
                whiteSpace: "nowrap",
                py: 0.5,
                "&:hover": { borderColor: "#2F5D7C", color: "#1E3A5F", backgroundColor: "#F5F7FA" },
              }}
            >
              Información del estudio
            </Button>
          </Box>

          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            <Chip
              label={visibleScopeLabel}
              size="small"
              variant="outlined"
              sx={{ borderColor: "#2F5D7C", color: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem" }}
            />
            <Chip label={roleLabel} size="small" variant="outlined" sx={{ fontSize: "0.75rem" }} />
            <Chip label={`Centros: ${centersLabel}`} size="small" variant="outlined" sx={{ fontSize: "0.75rem" }} />
          </Stack>
        </Stack>
      </Paper>

      {/* Dialog Información del estudio */}
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: "#1F2933", pr: 6, pb: 1.5 }}>
          Información del estudio
          <IconButton
            onClick={() => setInfoOpen(false)}
            size="small"
            aria-label="Cerrar"
            sx={{ position: "absolute", right: 12, top: 12, color: "#52616B" }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2.5, py: 1.5 }}>
          <Stack spacing={0}>
            {studyInfoRows.map(([label, value], index) => (
              <Box
                key={label}
                sx={{
                  py: 1.25,
                  borderBottom: index < studyInfoRows.length - 1 ? "1px solid #EEF2F6" : "none",
                }}
              >
                <Typography variant="caption" sx={{ color: "#52616B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ color: "#1F2933", fontWeight: 600, mt: 0.25 }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.25 }}>
          <Button
            onClick={() => setInfoOpen(false)}
            size="small"
            sx={{ textTransform: "none", color: "#1E3A5F", fontWeight: 700 }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tarjetas de métricas */}
      <Grid2 container spacing={2} alignItems="stretch" sx={{ mb: 2.5 }}>
        {metricCards.map(({ label, icon, count, subtext }, index) => (
          <Grid2 size={{ xs: 12, sm: 6, lg: 3 }} key={index} sx={{ display: "flex" }}>
            <Paper
              className="clinical-card"
              elevation={0}
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                p: 2,
                borderRadius: 2,
                border: "1px solid #D9E2EC",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                backgroundColor: "#FFFFFF",
                minHeight: 88,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1E3A5F",
                  backgroundColor: "#EAF1F6",
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "#52616B", fontWeight: 700, fontSize: "0.8rem" }}>
                  {label}
                </Typography>
                <Typography
                  sx={{ color: "#1F2933", fontWeight: 800, fontSize: "1.75rem", lineHeight: 1.1, my: 0.25 }}
                >
                  {count}
                </Typography>
                <Typography variant="caption" sx={{ color: "#52616B", fontSize: "0.72rem" }}>
                  {subtext}
                </Typography>
              </Box>
            </Paper>
          </Grid2>
        ))}
      </Grid2>

      {/* Acciones principales */}
      <Stack spacing={1.5}>
        <Typography variant="h6" sx={{ color: "#1F2933", fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.01em" }}>
          Acciones principales
        </Typography>
        <Grid2 container spacing={2}>
          {actionCards.map((action) => (
            <Grid2 key={action.title} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: "flex" }}>
              <Paper
                className="clinical-card"
                elevation={0}
                sx={{
                  p: 2,
                  border: "1px solid #D9E2EC",
                  borderRadius: 2,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  minHeight: 148,
                  width: "100%",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  "&:hover": {
                    borderColor: "#2F5D7C",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#1E3A5F" }}>
                  {action.icon}
                  <Typography variant="body1" sx={{ fontWeight: 800, fontSize: "0.9rem", color: "#1F2933" }}>
                    {action.title}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: "#52616B", flex: 1, fontSize: "0.82rem", lineHeight: 1.45 }}>
                  {action.text}
                </Typography>
                <Button
                  onClick={action.onClick}
                  variant="contained"
                  disabled={action.disabled}
                  size="small"
                  sx={{
                    alignSelf: "flex-start",
                    backgroundColor: "#1E3A5F",
                    borderRadius: 1,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    "&:hover": { backgroundColor: "#2F5D7C" },
                  }}
                >
                  {action.button}
                </Button>
              </Paper>
            </Grid2>
          ))}
        </Grid2>
      </Stack>
    </Box>
  );
};

export default WelcomeScreen;
