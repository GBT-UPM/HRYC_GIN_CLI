import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Modal,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { getAllowedCenters, isSiteCoordinator } from "../utils/auth";
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

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90%", sm: 480 },
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
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

const PendingParticipantsScreen = () => {
  const { keycloak, initialized } = useKeycloak();
  const token = keycloak?.token;
  const allowedCenters = useMemo(() => getAllowedCenters(keycloak), [keycloak]);
  const canManageCodes = isSiteCoordinator(keycloak);

  const [selectedCenter, setSelectedCenter] = useState("");
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [nhc, setNhc] = useState("");
  const [studyPatientCode, setStudyPatientCode] = useState("");
  const [assigning, setAssigning] = useState(false);

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

  const openAssignModal = (participant) => {
    setSelectedParticipant(participant);
    setNhc("");
    setStudyPatientCode("");
    setError("");
    setMessage("");
  };

  const closeAssignModal = () => {
    setSelectedParticipant(null);
    setNhc("");
    setStudyPatientCode("");
  };

  const handleAssignCode = async (event) => {
    event.preventDefault();
    if (!selectedParticipant || !selectedCenter || !token) {
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
    } finally {
      setNhc("");
      setAssigning(false);
    }
  };

  if (initialized && !canManageCodes) {
    return (
      <Container className="container">
        <Alert severity="error">No autorizado</Alert>
      </Container>
    );
  }

  return (
    <Container className="container">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <AssignmentTurnedInIcon color="primary" />
        <Typography variant="h4">Participantes pendientes</Typography>
      </Box>

      {allowedCenters.length > 1 && (
        <FormControl sx={{ minWidth: 240, mb: 3 }}>
          <InputLabel id="center-select-label">Centro</InputLabel>
          <Select
            labelId="center-select-label"
            label="Centro"
            value={selectedCenter}
            onChange={(event) => setSelectedCenter(event.target.value)}
          >
            {allowedCenters.map((center) => (
              <MenuItem key={center} value={center}>
                {center}
              </MenuItem>
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Participante</TableCell>
              <TableCell>Centro</TableCell>
              <TableCell>Estado código</TableCell>
              <TableCell>Nº casos</TableCell>
              <TableCell>Caso</TableCell>
              <TableCell>Lateralidad</TableCell>
              <TableCell>Estructura anatómica</TableCell>
              <TableCell>Fecha creación</TableCell>
              <TableCell>Nº evaluaciones</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={10}>Cargando participantes pendientes...</TableCell>
              </TableRow>
            )}
            {!loading && participants.length === 0 && (
              <TableRow>
                <TableCell colSpan={10}>No hay participantes pendientes.</TableCell>
              </TableRow>
            )}
            {!loading &&
              participants.flatMap((participant) => {
                const linkedCases = getParticipantCases(participant);
                const casesToRender = linkedCases.length > 0 ? linkedCases : [null];
                const numberOfCases = participant.numberOfCases ?? linkedCases.length;

                return casesToRender.map((linkedCase, index) => (
                  <TableRow key={`${participant.studyParticipantId}-${linkedCase?.caseDisplayId || index}`}>
                    <TableCell>{participant.studyParticipantId}</TableCell>
                    <TableCell>{participant.centerId || selectedCenter}</TableCell>
                    <TableCell>{formatCodeStatusLabel(participant.codeStatus)}</TableCell>
                    <TableCell>{numberOfCases}</TableCell>
                    <TableCell>{linkedCase?.caseDisplayId || "—"}</TableCell>
                    <TableCell>{linkedCase?.lateralityDisplay || "—"}</TableCell>
                    <TableCell>{linkedCase?.anatomicalStructureDisplay || "—"}</TableCell>
                    <TableCell>{formatDate(linkedCase?.createdAt || participant.createdAt)}</TableCell>
                    <TableCell>{linkedCase?.numberOfEvaluations ?? "—"}</TableCell>
                    <TableCell>
                      {index === 0 && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => openAssignModal(participant)}
                        >
                          Asignar código
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ));
              })}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal open={Boolean(selectedParticipant)} onClose={closeAssignModal}>
        <Box component="form" sx={modalStyle} onSubmit={handleAssignCode}>
          <Typography variant="h6" gutterBottom>
            Asignar código
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
            <Button type="button" variant="outlined" onClick={closeAssignModal}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={assigning}>
              {assigning ? "Asignando..." : "Asignar código"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </Container>
  );
};

export default PendingParticipantsScreen;
