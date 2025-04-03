import { Assessment, People } from "@mui/icons-material";
import { Box, Button, Grid2, Paper, Typography } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";

const WelcomeScreen = () => {
  const containerStyle = {
    padding:"20px",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f7f9fc",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  };

  const cardStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
    textAlign: "center",
    maxWidth: "400px",
    width: "100%"
  };

  const titleStyle = {
    fontSize: "24px",
    marginBottom: "10px"
  };

  const subtitleStyle = {
    fontSize: "16px",
    color: "#666",
    marginBottom: "20px"
  };

  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "16px",
    color: "#ffffff",
    backgroundColor: "#007ACC",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  };

  const handleStart = () => {
    // Lógica para comenzar o navegar a otra pantalla
    alert("Bienvenido, comenzamos la revisión ginecológica!");
  };

  const navigate = useNavigate();

  const handleNewPatientClick = () => {
    navigate('/questionnaire');
  };
  const handleResponsesClick = () => {
    navigate('/responses');
  };

  return (
    <div style={containerStyle}>
      <Typography variant="h4" gutterBottom>
        Panel de Control - Revisión Ginecológica
      </Typography>

      <Grid2 container spacing={3}>
        {/* Tarjeta Pacientes Activos */}
        <Grid2 item size={{ xs: 12, md: 4 }} >
          <Paper sx={{ padding: 3, textAlign: 'center' }}>
          <People fontSize="large" color="primary" />
            <Typography variant="h6">Pacientes Activos</Typography>
            <Typography variant="h4">125</Typography>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }} item >
          <Paper sx={{ padding: 3, textAlign: 'center' }}>
            <Assessment fontSize="large" color="success" />
            <Typography variant="h6">Citas Atendidas</Typography>
            <Typography variant="h4">200</Typography>
          </Paper>
        </Grid2>
        <Grid2 item size={{ xs: 12, md: 4 }}>
          <Paper sx={{ padding: 3, textAlign: 'center' }}>
            <Assessment fontSize="large" color="success" />
            <Typography variant="h6">Masas Anexiales identificadas</Typography>
            <Typography variant="h4">10</Typography>
          </Paper>
        </Grid2>
        <Grid2 item xs={12} md={4}>
          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6">Acciones Rápidas</Typography>
            <Box display="flex" flexDirection="column" gap={2} mt={2}>
              <Button onClick={handleNewPatientClick} variant="contained" color="primary">Iniciar Cuestionario</Button>
              <Button onClick={handleResponsesClick} variant="contained" color="secondary">Revisar Cuestionarios </Button>
            </Box>
          </Paper>
        </Grid2>
        </Grid2>
    </div>
  );
};

export default WelcomeScreen;
