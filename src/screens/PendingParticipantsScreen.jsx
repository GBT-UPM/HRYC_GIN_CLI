import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import PropTypes from "prop-types";
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
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import {
  canUseGlobalView,
  getAllowedCenters,
  getCentersDisplayLabel,
  getPrimaryRoleLabel,
  isSiteCoordinator,
} from "../utils/auth";
import StudyPageHeader from "../components/StudyPageHeader";
import {
  assignStudyPatientCode,
  getPendingStudyParticipants,
  STUDY_PARTICIPANT_ERROR_MESSAGES,
} from "../services/studyParticipantService";
import { formatCodeStatusLabel } from "../utils/caseMetadata";

const normalizeParticipants = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};

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

const DIALOG_PAPER_SX = {
  borderRadius: "12px",
  border: "1px solid #D6E0EA",
  boxShadow: "0 8px 32px rgba(15, 23, 42, 0.12)",
};

const DIALOG_TITLE_SX = {
  fontWeight: 800,
  color: "#1F2933",
  fontSize: "1.05rem",
  borderBottom: "1px solid #EEF2F6",
  pb: 1.5,
  pr: 6,
};

const DIALOG_CONTENT_SX = { px: 3, py: 2 };
const DIALOG_ACTIONS_SX = { px: 3, py: 1.5, borderTop: "1px solid #EEF2F6", gap: 1 };
const DETAIL_SECTION_SX = {
  border: "1px solid #E5EDF5",
  borderRadius: 2,
  backgroundColor: "#F8FBFD",
  px: 2,
  py: 1.75,
};
const DETAIL_LABEL_SX = {
  color: "#52616B",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};
const DETAIL_VALUE_SX = {
  color: "#1F2933",
  fontWeight: 600,
};

const SECONDARY_BTN_SX = {
  textTransform: "none",
  fontWeight: 600,
  borderColor: "#D9E2EC",
  color: "#1E3A5F",
  "&:hover": { borderColor: "#2F5D7C", backgroundColor: "#F5F7FA" },
};

const PRIMARY_BTN_SX = {
  textTransform: "none",
  fontWeight: 700,
  backgroundColor: "#1E3A5F",
  "&:hover": { backgroundColor: "#173050" },
};

const ASSIGN_BTN_SX = {
  fontSize: "0.72rem",
  textTransform: "none",
  borderColor: "#D9E2EC",
  color: "#1E3A5F",
  fontWeight: 600,
  py: 0.25,
  px: 1,
  minWidth: 0,
  "&:hover": { borderColor: "#2F5D7C", backgroundColor: "#F5F7FA" },
};

const DETAIL_BTN_SX = {
  ...ASSIGN_BTN_SX,
  minWidth: 88,
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const getParticipantCases = (participant) => {
  if (Array.isArray(participant?.linkedCases)) {
    return participant.linkedCases;
  }

  if (Array.isArray(participant?.cases)) {
    return participant.cases;
  }

  return [];
};

const DetailItem = ({ label, value, secondaryValue }) => (
  <Box>
    <Typography variant="caption" sx={DETAIL_LABEL_SX}>
      {label}
    </Typography>
    <Typography variant="body2" sx={DETAIL_VALUE_SX}>
      {value}
    </Typography>
    {secondaryValue ? (
      <Typography variant="body2" sx={{ color: "#52616B", mt: 0.25 }}>
        {secondaryValue}
      </Typography>
    ) : null}
  </Box>
);

const PendingParticipantsScreen = () => {
  const { keycloak, initialized } = useKeycloak();
  const token = keycloak?.token;
  const allowedCenters = useMemo(() => getAllowedCenters(keycloak), [keycloak]);
  const canManageCodes = isSiteCoordinator(keycloak);
  const isGlobalView = canUseGlobalView(keycloak);
  const roleLabel = getPrimaryRoleLabel(keycloak);
  const centersLabel = getCentersDisplayLabel(keycloak);

  const [selectedCenter, setSelectedCenter] = useState("");
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState(null);
  const [nhc, setNhc] = useState("");
  const [studyPatientCode, setStudyPatientCode] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (allowedCenters.length === 1 && selectedCenter !== allowedCenters[0]) {
      setSelectedCenter(allowedCenters[0]);
    }
  }, [allowedCenters, selectedCenter]);

  const fetchPendingParticipants = useCallback(async () => {
    if (!token || !selectedCenter || !canManageCodes) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getPendingStudyParticipants(token, selectedCenter);
      setParticipants(normalizeParticipants(data));
    } catch (fetchError) {
      setParticipants([]);
      setError(fetchError.message || STUDY_PARTICIPANT_ERROR_MESSAGES.fetchGeneric);
    } finally {
      setLoading(false);
    }
  }, [token, selectedCenter, canManageCodes]);

  useEffect(() => {
    if (initialized) {
      fetchPendingParticipants();
    }
  }, [initialized, fetchPendingParticipants]);

  const openAssignModal = () => {
    setAssignOpen(true);
    setNhc("");
    setStudyPatientCode("");
    setError("");
    setMessage("");
  };

  const closeAssignModal = () => {
    setAssignOpen(false);
    setNhc("");
    setStudyPatientCode("");
  };

  const openDetailModal = (participant, linkedCase) => {
    setDetailEntry({ participant, linkedCase });
  };

  const closeDetailModal = () => {
    setDetailEntry(null);
  };

  const handleAssignCode = async (event) => {
    event.preventDefault();
    if (!assignOpen || !selectedCenter || !token) {
      return;
    }

    setAssigning(true);
    setError("");
    setMessage("");

    try {
      await assignStudyPatientCode(token, {
        centerId: selectedCenter,
        nhc,
        studyPatientCode,
      });
      setMessage("Código de estudio asignado correctamente.");
      closeAssignModal();
      await fetchPendingParticipants();
    } catch (assignError) {
      setError(assignError.message || STUDY_PARTICIPANT_ERROR_MESSAGES.assignGeneric);
      setNhc("");
    } finally {
      setAssigning(false);
    }
  };

  if (initialized && !canManageCodes) {
    return (
      <Box sx={{ px: 0, py: 0 }}>
        <Alert severity="error">No autorizado</Alert>
      </Box>
    );
  }

  const visibleScopeLabel = isGlobalView
    ? "Vista global"
    : selectedCenter
      ? `Centro ${selectedCenter}`
      : "Centro pendiente";

  return (
    <Box sx={{ px: 0, py: 0 }}>
      {/* Encabezado institucional */}
      <StudyPageHeader
        title="Participantes pendientes"
        subtitle="Casos registrados pendientes de asignación de código de estudio por el coordinador de centro."
        visibleScopeLabel={visibleScopeLabel}
        roleLabel={roleLabel}
        centersLabel={centersLabel}
        recordCount={participants.length}
        onInfoClick={() => setInfoOpen(true)}
      />

      {/* Dialog Información de la vista */}
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: DIALOG_PAPER_SX }}>
        <DialogTitle sx={DIALOG_TITLE_SX}>
          Información de la vista
          <IconButton onClick={() => setInfoOpen(false)} size="small" aria-label="Cerrar" sx={{ position: "absolute", right: 12, top: 12, color: "#52616B" }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2.5, py: 1.5 }}>
          <Stack spacing={0}>
            {[
              ["Participantes visibles", "Participantes con código de estudio pendiente de asignación en este centro."],
              ["Quién puede asignar", "Solo coordinadores de centro autorizados para el centro activo."],
              ["Código pendiente", "El participante ha sido registrado pero aún no tiene código de estudio asignado."],
              ["Código de estudio", "Sustituye al identificador local (NHC) para la seudonimización del participante."],
              ["NHC", "Se usa únicamente en el momento de asignación para localizar al participante. No se almacena ni se muestra."],
              ["Pseudonimización", "Los datos mostrados no incluyen identificativos directos del paciente."],
            ].map(([label, value], index, arr) => (
              <Box key={label} sx={{ py: 1.25, borderBottom: index < arr.length - 1 ? "1px solid #EEF2F6" : "none" }}>
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
          <Button onClick={() => setInfoOpen(false)} size="small" sx={{ textTransform: "none", color: "#1E3A5F", fontWeight: 700 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {allowedCenters.length > 1 && (
        <FormControl sx={{ minWidth: 240, mb: 2 }}>
          <InputLabel id="center-select-label">Centro</InputLabel>
          <Select
            labelId="center-select-label"
            label="Centro"
            value={selectedCenter}
            onChange={(event) => setSelectedCenter(event.target.value)}
          >
            {allowedCenters.map((center) => (
              <MenuItem key={center} value={center}>{center}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {allowedCenters.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No hay centros permitidos en el token.
        </Alert>
      )}

      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" sx={{ color: "#52616B" }}>
          La tabla queda como vista de revisión. La asignación principal se realiza mediante NHC transitorio.
        </Typography>
        <Button
          variant="contained"
          onClick={openAssignModal}
          disabled={!selectedCenter || !canManageCodes || assigning}
          sx={PRIMARY_BTN_SX}
        >
          Asignar código por NHC
        </Button>
      </Stack>

      {/* Card de tabla */}
      <Paper elevation={0} sx={{ border: "1px solid #D9E2EC", borderRadius: 2, backgroundColor: "#FFFFFF", overflow: "hidden" }}>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={TH_SX}>Participante</TableCell>
                <TableCell sx={TH_SX}>Caso</TableCell>
                <TableCell sx={TH_SX}>Centro</TableCell>
                <TableCell sx={TH_SX}>Lesión</TableCell>
                <TableCell sx={TH_SX}>Estado</TableCell>
                <TableCell sx={TH_SX}>Fecha</TableCell>
                <TableCell sx={{ ...TH_SX, textAlign: "right" }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 2, px: 2, color: "#52616B", fontSize: "0.85rem" }}>
                    Cargando participantes pendientes...
                  </TableCell>
                </TableRow>
              )}
              {!loading && participants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 3, px: 2, color: "#52616B", fontSize: "0.85rem", textAlign: "center" }}>
                    No hay participantes pendientes.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                participants.flatMap((participant) => {
                  const linkedCases = getParticipantCases(participant);
                  const casesToRender = linkedCases.length > 0 ? linkedCases : [null];
                  const numberOfCases = participant.numberOfCases ?? linkedCases.length;
                  const statusLabel = formatCodeStatusLabel(participant.codeStatus) || "Código pendiente";

                  return casesToRender.map((linkedCase, index) => (
                    <TableRow
                      key={`${participant.studyParticipantId}-${linkedCase?.caseDisplayId || index}`}
                      hover
                      sx={{ "&:hover": { backgroundColor: "#F5F8FC" }, "&:last-child td": { borderBottom: 0 } }}
                    >
                      {/* Participante */}
                      <TableCell sx={{ py: 1, px: 1.5, verticalAlign: "top" }}>
                        <Typography variant="body2" sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#1F2933", lineHeight: 1.3 }}>
                          {participant.studyParticipantId}
                        </Typography>
                      </TableCell>

                      {/* Caso */}
                      <TableCell sx={{ py: 1, px: 1.5, verticalAlign: "top" }}>
                        <Typography variant="body2" sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#1F2933", lineHeight: 1.3 }}>
                          {linkedCase?.caseDisplayId || "—"}
                        </Typography>
                        {linkedCase && (
                          <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#52616B", lineHeight: 1.2, display: "block" }}>
                            {`${numberOfCases} caso${numberOfCases !== 1 ? "s" : ""} · ${linkedCase.numberOfEvaluations ?? "—"} evaluación${(linkedCase.numberOfEvaluations ?? 0) !== 1 ? "es" : ""}`}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Centro */}
                      <TableCell sx={{ py: 1, px: 1.5, verticalAlign: "top" }}>
                        <Typography variant="body2" sx={{ fontSize: "0.82rem", color: "#1F2933", lineHeight: 1.3 }}>
                          {participant.centerId || selectedCenter}
                        </Typography>
                      </TableCell>

                      {/* Lesión */}
                      <TableCell sx={{ py: 1, px: 1.5, verticalAlign: "top" }}>
                        <Typography variant="body2" sx={{ fontSize: "0.82rem", color: "#1F2933", lineHeight: 1.3 }}>
                          {linkedCase?.lateralityDisplay || "—"}
                        </Typography>
                        {linkedCase?.anatomicalStructureDisplay && (
                          <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#52616B", lineHeight: 1.2, display: "block" }}>
                            {linkedCase.anatomicalStructureDisplay}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Estado */}
                      <TableCell sx={{ py: 1, px: 1.5, verticalAlign: "top" }}>
                        <Chip
                          label={statusLabel}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600, backgroundColor: "#fff8e1", color: "#7a4800", borderColor: "#fce48a" }}
                        />
                      </TableCell>

                      {/* Fecha */}
                      <TableCell sx={{ py: 1, px: 1.5, verticalAlign: "top" }}>
                        <Typography variant="body2" sx={{ fontSize: "0.82rem", color: "#1F2933", lineHeight: 1.3 }}>
                          {formatDate(linkedCase?.createdAt || participant.createdAt)}
                        </Typography>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell sx={{ py: 1, px: 1.5, verticalAlign: "top", textAlign: "right" }}>
                        {index === 0 && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openDetailModal(participant, linkedCase)}
                            sx={DETAIL_BTN_SX}
                          >
                            Ver detalle
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ));
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog: asignar código de estudio */}
      <Dialog
        open={assignOpen}
        onClose={closeAssignModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: DIALOG_PAPER_SX }}
      >
        <Box component="form" onSubmit={handleAssignCode}>
          <DialogTitle sx={DIALOG_TITLE_SX}>
            Asignar código de estudio
            <IconButton
              onClick={closeAssignModal}
              size="small"
              aria-label="Cerrar"
              sx={{ position: "absolute", right: 12, top: 12, color: "#52616B" }}
              disabled={assigning}
            >
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={DIALOG_CONTENT_SX}>
            <Typography variant="body2" sx={{ color: "#52616B", fontSize: "0.83rem", mb: 1 }}>
              El NHC se utilizará únicamente para localizar el participante seudonimizado. No se almacenará ni se mostrará.
            </Typography>
            <TextField
              label="NHC"
              value={nhc}
              onChange={(event) => setNhc(event.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="off"
              inputProps={{ "data-testid": "nhc-input" }}
            />
            <TextField
              label="Código de estudio"
              value={studyPatientCode}
              onChange={(event) => setStudyPatientCode(event.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="off"
            />
          </DialogContent>
          <DialogActions sx={DIALOG_ACTIONS_SX}>
            <Button type="button" variant="outlined" onClick={closeAssignModal} disabled={assigning} sx={SECONDARY_BTN_SX}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={assigning} sx={PRIMARY_BTN_SX}>
              {assigning ? "Asignando..." : "Asignar código"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(detailEntry)}
        onClose={closeDetailModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: DIALOG_PAPER_SX }}
      >
        <DialogTitle sx={DIALOG_TITLE_SX}>
          Detalle del participante pendiente
          <IconButton
            onClick={closeDetailModal}
            size="small"
            aria-label="Cerrar"
            sx={{ position: "absolute", right: 12, top: 12, color: "#52616B" }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={DIALOG_CONTENT_SX}>
          <Typography variant="body2" sx={{ color: "#52616B", fontSize: "0.84rem", mb: 1.5 }}>
            Información del caso pendiente de asignación de código de estudio.
          </Typography>
          <Stack spacing={1.5}>
            <Box sx={DETAIL_SECTION_SX}>
              <Typography variant="caption" sx={DETAIL_LABEL_SX}>
                Identificación del caso
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                <DetailItem
                  label="Participante"
                  value={detailEntry?.participant?.studyParticipantId || "—"}
                />
                <DetailItem
                  label="Caso"
                  value={detailEntry?.linkedCase?.caseDisplayId || "—"}
                />
                <DetailItem
                  label="Centro"
                  value={detailEntry?.participant?.centerId || selectedCenter || "—"}
                />
                <DetailItem
                  label="Fecha de creación"
                  value={formatDate(detailEntry?.linkedCase?.createdAt || detailEntry?.participant?.createdAt)}
                />
              </Stack>
            </Box>
            <Box sx={DETAIL_SECTION_SX}>
              <Typography variant="caption" sx={DETAIL_LABEL_SX}>
                Información clínica
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                <DetailItem
                  label="Lesión / lateralidad"
                  value={detailEntry?.linkedCase?.lateralityDisplay || "—"}
                  secondaryValue={detailEntry?.linkedCase?.anatomicalStructureDisplay || "—"}
                />
                <DetailItem
                  label="Estructura anatómica"
                  value={detailEntry?.linkedCase?.anatomicalStructureDisplay || "—"}
                />
                <DetailItem
                  label="Ámbito asistencial"
                  value={
                    detailEntry?.linkedCase?.careSettingDisplay ||
                    detailEntry?.linkedCase?.careSettingCode ||
                    "—"
                  }
                />
                <DetailItem
                  label="Número de casos"
                  value={detailEntry?.participant?.numberOfCases ?? getParticipantCases(detailEntry?.participant).length ?? "—"}
                />
                <DetailItem
                  label="Número de evaluaciones"
                  value={detailEntry?.linkedCase?.numberOfEvaluations ?? "—"}
                />
              </Stack>
            </Box>
            <Box sx={DETAIL_SECTION_SX}>
              <Typography variant="caption" sx={DETAIL_LABEL_SX}>
                Estado de asignación
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                <Box>
                  <Typography variant="caption" sx={DETAIL_LABEL_SX}>
                    Estado del código
                  </Typography>
                  <Box sx={{ mt: 0.75 }}>
                    <Chip
                      label={formatCodeStatusLabel(detailEntry?.participant?.codeStatus) || "Código pendiente"}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 24,
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        backgroundColor: "#fff8e1",
                        color: "#7a4800",
                        borderColor: "#fce48a",
                      }}
                    />
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={DIALOG_ACTIONS_SX}>
          <Button type="button" variant="outlined" onClick={closeDetailModal} sx={SECONDARY_BTN_SX}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

DetailItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  secondaryValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

DetailItem.defaultProps = {
  secondaryValue: null,
};

export default PendingParticipantsScreen;
