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
import { Add, LockReset, PersonOff, PersonOutline, Refresh } from "@mui/icons-material";
import StudyPageHeader from "../components/StudyPageHeader";
import { getAllowedCenters, getCentersDisplayLabel, getPreferredUsername, getPrimaryRoleLabel, isSiteCoordinator } from "../utils/auth";
import {
  createManagedUser,
  listManagedUsers,
  MANAGED_USER_ERROR_MESSAGES,
  MANAGED_USER_ROLES,
  resetManagedUserPassword,
  updateManagedUserRole,
  updateManagedUserStatus,
} from "../services/managedUserService";

const headerCellSx = {
  backgroundColor: "#EAF1F7",
  color: "#173B5F",
  fontWeight: 700,
  fontSize: "0.78rem",
  borderBottom: "2px solid #CBD5E1",
  whiteSpace: "nowrap",
};

const ManagedUsersScreen = () => {
  const { keycloak } = useKeycloak();
  const token = keycloak?.token;
  const isCoordinator = isSiteCoordinator(keycloak);
  const allowedCenters = useMemo(() => getAllowedCenters(keycloak), [keycloak]);
  const currentUsername = getPreferredUsername(keycloak).toLowerCase();
  const [centerId, setCenterId] = useState(allowedCenters[0] || "");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [roleDraft, setRoleDraft] = useState("");
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [form, setForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "ROLE_CLINICIAN",
    temporaryPassword: "",
    confirmPassword: "",
  });

  const loadUsers = useCallback(async () => {
    if (!token || !isCoordinator || !centerId) return;
    setLoading(true);
    setError("");
    try {
      const data = await listManagedUsers(token, centerId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setUsers([]);
      setError(loadError.message || MANAGED_USER_ERROR_MESSAGES.fetch);
    } finally {
      setLoading(false);
    }
  }, [centerId, isCoordinator, token]);

  useEffect(() => {
    if (!centerId && allowedCenters.length) setCenterId(allowedCenters[0]);
  }, [allowedCenters, centerId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetCreateForm = () => setForm({
    username: "", firstName: "", lastName: "", email: "",
    role: "ROLE_CLINICIAN", temporaryPassword: "", confirmPassword: "",
  });

  const showSuccess = (message) => {
    setError("");
    setSuccess(message);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (form.temporaryPassword !== form.confirmPassword) {
      setError("Las contraseñas temporales no coinciden.");
      return;
    }
    setBusyUserId("new-user");
    setError("");
    try {
      await createManagedUser(token, {
        username: form.username.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || null,
        role: form.role,
        centerId,
        temporaryPassword: form.temporaryPassword,
      });
      resetCreateForm();
      setCreateOpen(false);
      showSuccess("Cuenta creada. Entregue la contraseña temporal por un canal aprobado; el usuario deberá cambiarla al entrar.");
      await loadUsers();
    } catch (createError) {
      setError(createError.message || MANAGED_USER_ERROR_MESSAGES.save);
    } finally {
      setBusyUserId("");
    }
  };

  const handleStatus = async (user) => {
    const action = user.enabled ? "desactivar" : "reactivar";
    if (!window.confirm(`¿Desea ${action} la cuenta de ${user.username}?`)) return;
    setBusyUserId(user.id);
    setError("");
    try {
      await updateManagedUserStatus(token, user.id, !user.enabled);
      showSuccess(`Cuenta ${user.enabled ? "desactivada" : "reactivada"}.`);
      await loadUsers();
    } catch (updateError) {
      setError(updateError.message || MANAGED_USER_ERROR_MESSAGES.save);
    } finally {
      setBusyUserId("");
    }
  };

  const handleRoleSave = async () => {
    if (!roleTarget || !roleDraft) return;
    setBusyUserId(roleTarget.id);
    setError("");
    try {
      await updateManagedUserRole(token, roleTarget.id, roleDraft);
      setRoleTarget(null);
      showSuccess("Rol actualizado.");
      await loadUsers();
    } catch (updateError) {
      setError(updateError.message || MANAGED_USER_ERROR_MESSAGES.save);
    } finally {
      setBusyUserId("");
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordTarget) return;
    if (passwordDraft.length < 12) {
      setError("La contraseña temporal debe tener al menos 12 caracteres.");
      return;
    }
    if (passwordDraft !== passwordConfirm) {
      setError("Las contraseñas temporales no coinciden.");
      return;
    }
    setBusyUserId(passwordTarget.id);
    setError("");
    try {
      await resetManagedUserPassword(token, passwordTarget.id, passwordDraft);
      setPasswordTarget(null);
      setPasswordDraft("");
      setPasswordConfirm("");
      showSuccess("Contraseña temporal actualizada. Comuníquela por un canal aprobado; deberá cambiarse en el siguiente acceso.");
    } catch (resetError) {
      setError(resetError.message || MANAGED_USER_ERROR_MESSAGES.save);
    } finally {
      setBusyUserId("");
    }
  };

  const roleLabel = (role) => MANAGED_USER_ROLES.find((item) => item.value === role)?.label || "Sin rol asignado";

  if (!isCoordinator) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: "1px solid #D9E2EC", borderRadius: 2, backgroundColor: "#fff" }}>
        <Typography variant="h5" sx={{ color: "#173B5F", fontWeight: 700, mb: 1 }}>Usuarios del centro</Typography>
        <Typography variant="body2" color="text.secondary">Esta función está disponible para coordinadores de centro.</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <StudyPageHeader
        title="Usuarios del centro"
        subtitle="Administre las cuentas de acceso del personal de esta instalación."
        visibleScopeLabel={`Centro ${centerId || "asignado"}`}
        roleLabel={getPrimaryRoleLabel(keycloak)}
        centersLabel={getCentersDisplayLabel(keycloak)}
        recordCount={users.length}
        onInfoClick={() => setInfoOpen(true)}
        infoButtonLabel="Información de la vista"
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      <Paper className="clinical-card" elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
          {allowedCenters.length > 1 ? (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="managed-users-center-label">Centro</InputLabel>
              <Select labelId="managed-users-center-label" label="Centro" value={centerId} onChange={(event) => setCenterId(event.target.value)}>
                {allowedCenters.map((center) => <MenuItem key={center} value={center}>{center}</MenuItem>)}
              </Select>
            </FormControl>
          ) : <Typography variant="body2" color="text.secondary">Centro: <strong>{centerId || "Sin centro asignado"}</strong></Typography>}
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadUsers} disabled={loading}>Actualizar</Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => { setSuccess(""); setCreateOpen(true); }}>Crear cuenta</Button>
          </Stack>
        </Stack>
      </Paper>

      <TableContainer component={Paper} className="clinical-table" elevation={0}>
        <Table size="small" aria-label="Usuarios del centro">
          <TableHead><TableRow>
            <TableCell sx={headerCellSx}>Usuario</TableCell>
            <TableCell sx={headerCellSx}>Nombre</TableCell>
            <TableCell sx={headerCellSx}>Correo</TableCell>
            <TableCell sx={headerCellSx}>Rol</TableCell>
            <TableCell sx={headerCellSx}>Estado</TableCell>
            <TableCell sx={headerCellSx} align="right">Acciones</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Cargando usuarios…</TableCell></TableRow>
              : users.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>{error ? "No se han podido cargar las cuentas." : "No hay cuentas asignadas a este centro."}</TableCell></TableRow>
                : users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: "#173B5F" }}>{user.username}</TableCell>
                    <TableCell>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>{roleLabel(user.role)}</TableCell>
                    <TableCell>
                      <Box component="span" sx={{ color: user.enabled ? "#24613b" : "#8a3b34", fontWeight: 600 }}>
                        {user.enabled ? "Activa" : "Desactivada"}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {user.username?.toLowerCase() === currentUsername ? <Typography variant="caption" color="text.secondary">Su cuenta</Typography> : (
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Button size="small" onClick={() => { setRoleTarget(user); setRoleDraft(user.role || "ROLE_CLINICIAN"); }} disabled={busyUserId === user.id}>Cambiar rol</Button>
                        <Button size="small" startIcon={<LockReset />} onClick={() => { setPasswordTarget(user); setPasswordDraft(""); setPasswordConfirm(""); }} disabled={busyUserId === user.id}>Contraseña</Button>
                        <Button size="small" color={user.enabled ? "error" : "success"} startIcon={user.enabled ? <PersonOff /> : <PersonOutline />} onClick={() => handleStatus(user)} disabled={busyUserId === user.id}>
                          {user.enabled ? "Desactivar" : "Reactivar"}
                        </Button>
                      </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => { if (busyUserId !== "new-user") { setCreateOpen(false); resetCreateForm(); } }} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Crear cuenta del centro</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Se creará en Keycloak con el centro {centerId}. La contraseña temporal se cambiará al primer acceso.</Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, sm: 6 }}><TextField autoFocus required fullWidth label="Nombre de usuario" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} inputProps={{ maxLength: 64, autoComplete: "off" }} /></Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}><FormControl fullWidth><InputLabel id="new-user-role-label">Rol</InputLabel><Select labelId="new-user-role-label" label="Rol" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{MANAGED_USER_ROLES.map((role) => <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>)}</Select></FormControl></Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}><TextField required fullWidth label="Nombre" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}><TextField required fullWidth label="Apellidos" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></Grid2>
              <Grid2 size={12}><TextField fullWidth type="email" label="Correo electrónico (opcional)" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}><TextField required fullWidth type="password" label="Contraseña temporal" value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} helperText="Al menos 12 caracteres" autoComplete="new-password" /></Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}><TextField required fullWidth type="password" label="Repita la contraseña" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} autoComplete="new-password" /></Grid2>
            </Grid2>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setCreateOpen(false); resetCreateForm(); }} disabled={busyUserId === "new-user"}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={busyUserId === "new-user"}>{busyUserId === "new-user" ? "Creando…" : "Crear cuenta"}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(roleTarget)} onClose={() => setRoleTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Cambiar rol</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Cuenta: {roleTarget?.username}</Typography>
          <FormControl fullWidth><InputLabel id="managed-user-role-label">Rol</InputLabel><Select labelId="managed-user-role-label" label="Rol" value={roleDraft} onChange={(event) => setRoleDraft(event.target.value)}>{MANAGED_USER_ROLES.map((role) => <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>)}</Select></FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setRoleTarget(null)}>Cancelar</Button><Button variant="contained" onClick={handleRoleSave} disabled={busyUserId === roleTarget?.id}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(passwordTarget)} onClose={() => setPasswordTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Restablecer contraseña</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Cuenta: {passwordTarget?.username}. El usuario deberá elegir una nueva contraseña al iniciar sesión.</Typography>
          <Stack spacing={2}>
            <TextField autoFocus fullWidth type="password" label="Nueva contraseña temporal" value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} helperText="Al menos 12 caracteres" autoComplete="new-password" />
            <TextField fullWidth type="password" label="Repita la contraseña" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setPasswordTarget(null)}>Cancelar</Button><Button variant="contained" onClick={handlePasswordReset} disabled={busyUserId === passwordTarget?.id}>Restablecer</Button></DialogActions>
      </Dialog>

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Gestión de usuarios del centro</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Las cuentas se guardan en el Keycloak de esta instalación. Puede gestionar las cuentas clínicas y de coordinación del centro, cambiar su rol, suspenderlas y establecer una contraseña temporal. Los roles globales y técnicos se administran en Keycloak. El usuario deberá cambiar cada contraseña temporal al iniciar sesión.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setInfoOpen(false)}>Cerrar</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManagedUsersScreen;
