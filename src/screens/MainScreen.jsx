import {
  CalendarMonth,
  Close,
  LocalHospital,
  MedicalInformation,
  People,
  Add,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/ApiService";
import StudyPageHeader from "../components/StudyPageHeader";
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
import { CASE_EVALUATION_ERROR_MESSAGES, getCaseEvaluations } from "../services/caseEvaluationService";
import { DASHBOARD_ERROR_MESSAGES, getStudyDashboardStats } from "../services/studyDashboardService";
import { formatEvaluationStatusLabel } from "../utils/caseStatus";
import { formatEvaluationTypeLabel } from "../utils/evaluationType";

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

export const getRecentEvaluations = (evaluations = []) =>
  [...(Array.isArray(evaluations) ? evaluations : [])]
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
    .slice(0, 5);

const formatEvaluationDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("es-ES") : "—";
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
  const [recentEvaluations, setRecentEvaluations] = useState([]);
  const [recentError, setRecentError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      console.log("[MainScreen] waiting for keycloak token", keycloak);
      return;
    }

    let cancelled = false;
    setRecentEvaluations([]);
    setRecentError("");

    const fetchCounts = async () => {
      if (!isGlobalView && allowedCenters.length === 0) {
        setError(CASE_EVALUATION_ERROR_MESSAGES.missingCenter);
        setRecentEvaluations([]);
        return;
      }

      if (shouldSelectCenter && !selectedCenter) {
        setError("");
        setRecentEvaluations([]);
        return;
      }

      try {
        setError("");
        const stats = await getStudyDashboardStats(token, keycloak, selectedCenter);
        if (!cancelled) {
          setCounts({
            participants:      stats.participantsCount      ?? 0,
            encounters:        stats.encountersCount        ?? 0,
            ultrasoundRecords: stats.ultrasoundRecordsCount ?? 0,
            adnexalMasses:     stats.adnexalMassesCount     ?? 0,
          });
        }
      } catch (error) {
        console.error("Error al llamar al backend:", error);
        if (!cancelled) setError(error.message || DASHBOARD_ERROR_MESSAGES.generic);
        return;
      }
      if (cancelled) return;
      try {
        setRecentError("");
        const evaluations = await getCaseEvaluations(token, keycloak, selectedCenter);
        if (!cancelled) setRecentEvaluations(getRecentEvaluations(evaluations));
      } catch (error) {
        if (!cancelled) {
          setRecentEvaluations([]);
          setRecentError(error.message || CASE_EVALUATION_ERROR_MESSAGES.generic);
        }
      }
    };

    fetchCounts();
    return () => { cancelled = true; };
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
  const handleEvaluationClick = (item) => {
    navigate('/responses', { state: { caseSearch: item.evaluationDisplayId || item.caseDisplayId || item.studyPatientCode || "" } });
  };

  const visibleScopeLabel = isGlobalView
    ? "Vista global"
    : selectedCenter
      ? `Centro activo: ${selectedCenter}`
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
      <StudyPageHeader
        title="Panel principal del estudio MIA"
        subtitle="Validación externa multicéntrica del ECO-SCORE en masas anexiales. Registro estructurado de evaluaciones ecográficas y resultados ECO-SCORE."
        visibleScopeLabel={visibleScopeLabel}
        roleLabel={roleLabel}
        centersLabel={centersLabel}
        onInfoClick={() => setInfoOpen(true)}
        infoButtonLabel="Información del estudio"
      />
      {canUseQuestionnaireRegistration && (
        <Box className="home-primary-action">
          <Button variant="contained" startIcon={<Add />} onClick={handleNewPatientClick} disabled={!token}>
            Nuevo cuestionario
          </Button>
        </Box>
      )}

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
      <Grid2 className="home-kpi-grid" container spacing={2} alignItems="stretch" sx={{ mb: 2.5 }}>
        {metricCards.map(({ label, icon, count, subtext }, index) => (
          <Grid2 size={{ xs: 12, sm: 6, lg: 3 }} key={index} sx={{ display: "flex" }}>
            <Paper
              className="clinical-card home-kpi-card"
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

      <Paper className="clinical-table home-recent" elevation={0}>
        <Box className="home-recent-heading">
          <Typography component="h2" variant="h6">Últimos casos y evaluaciones</Typography>
        </Box>
        {recentError && <Alert severity="warning" sx={{ m: 2 }}>{recentError}</Alert>}
        {!recentError && recentEvaluations.length === 0 ? (
          <Typography className="home-recent-empty">Aún no hay evaluaciones registradas en esta vista.</Typography>
        ) : !recentError && (
          <TableContainer>
            <Table size="small" aria-label="Últimos casos y evaluaciones">
              <TableHead><TableRow>
                <TableCell>Código de estudio</TableCell>
                <TableCell>Caso / evaluación</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acción</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {recentEvaluations.map((item, index) => (
                  <TableRow key={item.evaluationId || item.evaluationDisplayId || index}>
                    <TableCell>{item.studyPatientCode || "Pendiente"}</TableCell>
                    <TableCell>{item.evaluationDisplayId || item.caseDisplayId || "—"}</TableCell>
                    <TableCell>{formatEvaluationDate(item.createdAt)}</TableCell>
                    <TableCell>{formatEvaluationTypeLabel(item.evaluationType, item.primaryEvaluation, item.evaluationId)}</TableCell>
                    <TableCell>{formatEvaluationStatusLabel(item.evaluationStatus)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => handleEvaluationClick(item)} aria-label={`Ver evaluación ${item.evaluationDisplayId || item.caseDisplayId || index + 1}`}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default WelcomeScreen;
