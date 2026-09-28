import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
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
  TextField,
  Typography,
} from "@mui/material";
import StudyPageHeader from "../components/StudyPageHeader";
import {
  getAllowedCenters,
  getCentersDisplayLabel,
  getPrimaryRoleLabel,
  isSiteCoordinator,
  isStudyCoordinator,
} from "../utils/auth";
import {
  getStudyAuditEvents,
  STUDY_AUDIT_ERROR_MESSAGES,
} from "../services/studyAuditService";

const ACTION_OPTIONS = [
  "",
  "ASSIGN_STUDY_CODE",
  "UPDATE_STUDY_CODE",
  "ASSIGN_STUDY_CODE_BY_NHC",
  "STUDY_CODE_CONFLICT",
  "CREATE_HISTOLOGY",
  "UPDATE_HISTOLOGY",
  "UPDATE_CASE_STATUS",
  "UPDATE_EVALUATION_STATUS",
  "CREATE_ECO_SCORE_RESULT",
  "UPDATE_ECO_SCORE_RESULT",
  "EXPORT_STUDY_CASES",
  "EXPORT_STUDY_EVALUATIONS",
];

const TH_SX = {
  backgroundColor: "#EAF1F7",
  color: "#173B5F",
  fontWeight: 700,
  fontSize: "0.75rem",
  borderBottom: "2px solid #CBD5E1",
  py: 1.25,
  px: 1.5,
  whiteSpace: "nowrap",
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const normalizeItems = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};

const StudyAuditScreen = () => {
  const { keycloak, initialized } = useKeycloak();
  const token = keycloak?.token;
  const allowedCenters = useMemo(() => getAllowedCenters(keycloak), [keycloak]);
  const siteCoordinator = isSiteCoordinator(keycloak);
  const studyCoordinator = isStudyCoordinator(keycloak);
  const hasAccess = siteCoordinator || studyCoordinator;
  const roleLabel = getPrimaryRoleLabel(keycloak);
  const centersLabel = getCentersDisplayLabel(keycloak);

  const [filters, setFilters] = useState({
    centerId: "",
    action: "",
    fromDate: "",
    toDate: "",
    resourceId: "",
  });
  const [page, setPage] = useState(0);
  const [limit] = useState(25);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (siteCoordinator && !studyCoordinator && allowedCenters.length === 1) {
      setFilters((current) => ({
        ...current,
        centerId: allowedCenters[0],
      }));
    }
  }, [allowedCenters, siteCoordinator, studyCoordinator]);

  const loadAudit = useCallback(async () => {
    if (!initialized || !token || !hasAccess) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getStudyAuditEvents(token, {
        filters,
        allowedCenters,
        studyCoordinator,
        siteCoordinator,
        page,
        limit,
      });
      setEvents(normalizeItems(data));
      setTotal(Number(data?.total ?? normalizeItems(data).length));
    } catch (fetchError) {
      setEvents([]);
      setTotal(0);
      setError(fetchError.message || STUDY_AUDIT_ERROR_MESSAGES.fetchGeneric);
    } finally {
      setLoading(false);
    }
  }, [allowedCenters, filters, hasAccess, initialized, limit, page, siteCoordinator, studyCoordinator, token]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value;
    setPage(0);
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setPage(0);
    setFilters({
      centerId: siteCoordinator && !studyCoordinator && allowedCenters.length === 1 ? allowedCenters[0] : "",
      action: "",
      fromDate: "",
      toDate: "",
      resourceId: "",
    });
  };

  const hasPreviousPage = page > 0;
  const hasNextPage = (page + 1) * limit < total;
  const visibleScopeLabel = studyCoordinator
    ? filters.centerId
      ? `Centro ${filters.centerId}`
      : "Vista global"
    : `Centro ${filters.centerId || allowedCenters[0] || "asignado"}`;

  if (!hasAccess) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: "1px solid #D9E2EC", borderRadius: 2, backgroundColor: "#FFFFFF" }}>
        <Typography variant="h5" sx={{ color: "#1F2933", fontWeight: 800, mb: 1 }}>
          Trazabilidad del estudio
        </Typography>
        <Typography variant="body2" sx={{ color: "#52616B" }}>
          Las vistas de trazabilidad del estudio están disponibles para coordinadores de centro y coordinadores del estudio.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <StudyPageHeader
        title="Trazabilidad del estudio"
        subtitle="Consulta de eventos relevantes del estudio: códigos, histopatología, estados, ECO-SCORE y exportaciones."
        visibleScopeLabel={visibleScopeLabel}
        roleLabel={roleLabel}
        centersLabel={centersLabel}
        recordCount={total}
        onInfoClick={() => setInfoOpen(true)}
        infoButtonLabel="Criterios de trazabilidad"
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Se muestran los eventos relevantes del estudio asociados explícitamente a los centros permitidos.
      </Alert>

      <Paper className="clinical-filter-panel" elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: "1px solid #D9E2EC", borderRadius: 2, backgroundColor: "#FFFFFF", mb: 2 }}>
        <Grid2 container spacing={2}>
          {studyCoordinator ? (
            <Grid2 size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="study-audit-center-label">Centro</InputLabel>
                <Select
                  labelId="study-audit-center-label"
                  label="Centro"
                  value={filters.centerId}
                  onChange={handleFilterChange("centerId")}
                >
                  <MenuItem value="">Todos los centros</MenuItem>
                  {allowedCenters.map((center) => (
                    <MenuItem key={center} value={center}>
                      {center}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
          ) : null}
          <Grid2 size={{ xs: 12, md: studyCoordinator ? 3 : 4 }}>
            <FormControl fullWidth>
              <InputLabel id="study-audit-action-label">Acción</InputLabel>
              <Select
                labelId="study-audit-action-label"
                label="Acción"
                value={filters.action}
                onChange={handleFilterChange("action")}
              >
                <MenuItem value="">Todas</MenuItem>
                {ACTION_OPTIONS.filter(Boolean).map((action) => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 2 }}>
            <TextField
              label="Fecha desde"
              type="date"
              value={filters.fromDate}
              onChange={handleFilterChange("fromDate")}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 2 }}>
            <TextField
              label="Fecha hasta"
              type="date"
              value={filters.toDate}
              onChange={handleFilterChange("toDate")}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: studyCoordinator ? 2 : 4 }}>
            <TextField
              label="Caso / evaluación"
              placeholder="HURYC-C000032"
              value={filters.resourceId}
              onChange={handleFilterChange("resourceId")}
              fullWidth
            />
          </Grid2>
        </Grid2>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={loadAudit}
            disabled={loading}
            sx={{ textTransform: "none", fontWeight: 700, backgroundColor: "#1E3A5F", "&:hover": { backgroundColor: "#173050" } }}
          >
            Aplicar filtros
          </Button>
          <Button
            variant="outlined"
            onClick={clearFilters}
            sx={{ textTransform: "none", fontWeight: 600, borderColor: "#D9E2EC", color: "#1E3A5F" }}
          >
            Limpiar filtros
          </Button>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper className="clinical-table" elevation={0} sx={{ border: "1px solid #D9E2EC", borderRadius: 2, backgroundColor: "#FFFFFF", overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={TH_SX}>Fecha/hora</TableCell>
                <TableCell sx={TH_SX}>Centro</TableCell>
                <TableCell sx={TH_SX}>Acción</TableCell>
                <TableCell sx={TH_SX}>Recurso</TableCell>
                <TableCell sx={TH_SX}>Detalle</TableCell>
                <TableCell sx={TH_SX}>Realizado por</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{formatDate(event.timestamp)}</TableCell>
                  <TableCell>{event.centerId || "—"}</TableCell>
                  <TableCell>{event.actionDisplay || event.action || "—"}</TableCell>
                  <TableCell>{event.resourceDisplayId || event.resourceType || "—"}</TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>{event.details || "—"}</TableCell>
                  <TableCell>{event.performedBy || "—"}</TableCell>
                </TableRow>
              ))}
              {!loading && events.length === 0 ? (
                <TableRow>
                  <TableCell className="clinical-empty-state" colSpan={6}>
                    <Typography variant="body2" sx={{ color: "#52616B", textAlign: "center" }}>
                      No hay eventos relevantes para los filtros seleccionados.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 4 }}>
                    <Typography variant="body2" sx={{ color: "#52616B", textAlign: "center" }}>
                      Cargando trazabilidad del estudio...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ px: 2, py: 1.5, justifyContent: "space-between", alignItems: { sm: "center" } }}>
          <Typography variant="body2" sx={{ color: "#52616B" }}>
            Página {page + 1}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              disabled={!hasPreviousPage || loading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              sx={{ textTransform: "none" }}
            >
              Anterior
            </Button>
            <Button
              variant="outlined"
              disabled={!hasNextPage || loading}
              onClick={() => setPage((current) => current + 1)}
              sx={{ textTransform: "none" }}
            >
              Siguiente
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Alcance de la trazabilidad</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: "#52616B", lineHeight: 1.6 }}>
            Esta vista muestra solo eventos relevantes del estudio para coordinación: códigos de estudio, cambios de estado, histopatología, ECO-SCORE y exportaciones.
            No se exponen NHC, pseudónimos, hashes, cuestionarios completos ni contenido FHIR completo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)} sx={{ textTransform: "none" }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudyAuditScreen;
