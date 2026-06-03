import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControlLabel,
    Grid2,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import '../assets/css/ResponsesScreen.css';
import { useKeycloak } from '@react-keycloak/web';

import ApiService from '../services/ApiService';
import { getAllowedCenters, isClinician, isSiteCoordinator, isStudyCoordinator } from '../utils/auth';

const SCIENTIFIC_EXPORT_CENTERS = ["", "HURYC", "H12O"];
const CODE_STATUS_OPTIONS = ["", "PENDING_CODE", "CODE_ASSIGNED", "CODE_CONFLICT"];
const CASE_STATUS_OPTIONS = ["", "OPEN", "READY_FOR_REVIEW", "LOCKED", "EXCLUDED", "WITHDRAWN"];
const EVALUATION_TYPE_OPTIONS = ["", "PRIMARY", "SECONDARY"];
const EVALUATION_STATUS_OPTIONS = ["", "COMPLETED", "CORRECTED", "LOCKED", "EXCLUDED"];
const CARE_SETTING_OPTIONS = ["", "EMERGENCY", "OUTPATIENT", "GYNE_ULTRASOUND", "INPATIENT", "OTHER", "UNKNOWN"];
const LATERALITY_OPTIONS = ["", "RIGHT", "LEFT", "UNDEFINED"];
const ANATOMICAL_STRUCTURE_OPTIONS = ["", "OVARY", "FALLOPIAN_TUBE", "PARAOVARY", "UNDEFINED"];
const HISTOLOGY_STATUS_OPTIONS = ["", "PENDING", "AVAILABLE", "NOT_AVAILABLE", "UNKNOWN"];
const BENIGN_MALIGNANT_OPTIONS = ["", "BENIGN", "BORDERLINE", "MALIGNANT", "UNKNOWN"];

const DownloadScreen = () => {
    const { keycloak } = useKeycloak();
    const allowedCenters = useMemo(() => getAllowedCenters(keycloak), [keycloak]);
    const hasScientificExportAccess = isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak);
    const showScientificExports = hasScientificExportAccess && !isClinician(keycloak);
    const [scientificFilters, setScientificFilters] = useState({
        centerId: allowedCenters[0] || "",
        fromDate: "",
        toDate: "",
        codeStatus: "",
        caseStatus: "",
        evaluationType: "",
        evaluationStatus: "",
        careSettingCode: "",
        lateralityCode: "",
        anatomicalStructureCode: "",
        histologyStatus: "",
        benignMalignant: "",
        includePendingCode: false,
        includeExcluded: false,
    });

    useEffect(() => {
        if (isSiteCoordinator(keycloak) && !isStudyCoordinator(keycloak) && allowedCenters.length === 1) {
            setScientificFilters((current) => ({
                ...current,
                centerId: allowedCenters[0],
            }));
            return;
        }
        if (allowedCenters.length > 0 && scientificFilters.centerId && !allowedCenters.includes(scientificFilters.centerId) && !isStudyCoordinator(keycloak)) {
            setScientificFilters((current) => ({
                ...current,
                centerId: allowedCenters[0],
            }));
        }
    }, [allowedCenters, scientificFilters.centerId, keycloak]);

    const centerOptions = useMemo(() => {
        if (isStudyCoordinator(keycloak)) {
            return SCIENTIFIC_EXPORT_CENTERS;
        }
        if (allowedCenters.length === 1) {
            return allowedCenters;
        }
        return ["", ...allowedCenters];
    }, [allowedCenters, keycloak]);

    const updateScientificFilter = (field, value) => {
        setScientificFilters((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const buildScientificEndpoint = (path) => {
        const params = new URLSearchParams();
        const effectiveCenterId = isStudyCoordinator(keycloak)
            ? scientificFilters.centerId
            : (scientificFilters.centerId || allowedCenters[0] || "");

        if (effectiveCenterId) {
            params.set("centerId", effectiveCenterId);
        }
        [
            "fromDate",
            "toDate",
            "codeStatus",
            "caseStatus",
            "careSettingCode",
            "lateralityCode",
            "anatomicalStructureCode",
            "histologyStatus",
            "benignMalignant",
        ].forEach((field) => {
            if (scientificFilters[field]) {
                params.set(field, scientificFilters[field]);
            }
        });
        if (scientificFilters.includePendingCode) {
            params.set("includePendingCode", "true");
        }
        if (scientificFilters.includeExcluded) {
            params.set("includeExcluded", "true");
        }
        if (path.includes("study-evaluations.csv")) {
            if (scientificFilters.evaluationType) {
                params.set("evaluationType", scientificFilters.evaluationType);
            }
            if (scientificFilters.evaluationStatus) {
                params.set("evaluationStatus", scientificFilters.evaluationStatus);
            }
        }
        const queryString = params.toString();
        return queryString ? `${path}?${queryString}` : path;
    };

    const downloadEndpoint = async (endpoint, fallbackFilename) => {
        try {
            const response = await ApiService(keycloak.token, 'GET', endpoint, {});
            if (response.status === 200) {

                const disposition = response.headers.get("Content-Disposition");

                const filenameMatch = disposition && disposition.match(/filename="?([^"]+)"?/);
                const filename = filenameMatch ? filenameMatch[1] : fallbackFilename;

                const blob = await response.blob();

                // Crear un enlace temporal para descargar
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);



            } else {
                throw new Error(`Error en la respuesta: ${response.status}`);
            }
        } catch (error) {
            console.error("Error al descargar los registros del estudio:", error);

        }
    };

    const handleScientificDownload = (resource) => {
        const endpoint = resource === 'cases'
            ? buildScientificEndpoint('/app/exports/study-cases.csv')
            : buildScientificEndpoint('/app/exports/study-evaluations.csv');
        const fallbackFilename = resource === 'cases'
            ? 'study-cases.csv'
            : 'study-evaluations.csv';

        return downloadEndpoint(endpoint, fallbackFilename);
    };

    return (
        <Box sx={{ px: 4, py: 3 }}>
            <Typography variant="h4" gutterBottom>
                Descargas - Revisión Ginecológica
            </Typography>

            {showScientificExports ? (
                <Paper elevation={0} sx={{ mt: 3, p: 3, border: '1px solid #d8e1e8', borderRadius: 2 }}>
                    <Stack spacing={2}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="h5">Exportaciones científicas</Typography>
                                <Chip label={isStudyCoordinator(keycloak) ? 'Global' : 'Centro'} size="small" color="primary" variant="outlined" />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                                Dataset controlado del estudio basado en CaseRecord, CaseEvaluation e HistopathologyResult.
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                La exportación científica no incluye NHC, nombres, pseudónimos internos ni QuestionnaireResponse completo.
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>Filtros de exportación científica</Typography>
                            <Grid2 container spacing={2}>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-center">Centro</label>
                                    <select
                                        id="scientific-center"
                                        value={scientificFilters.centerId}
                                        onChange={(event) => updateScientificFilter("centerId", event.target.value)}
                                        disabled={isSiteCoordinator(keycloak) && !isStudyCoordinator(keycloak) && allowedCenters.length === 1}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {centerOptions.map((center) => (
                                            <option key={center || "global"} value={center}>
                                                {center || "Global"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-from-date">Fecha desde</label>
                                    <input
                                        id="scientific-from-date"
                                        type="date"
                                        value={scientificFilters.fromDate}
                                        onChange={(event) => updateScientificFilter("fromDate", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    />
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-to-date">Fecha hasta</label>
                                    <input
                                        id="scientific-to-date"
                                        type="date"
                                        value={scientificFilters.toDate}
                                        onChange={(event) => updateScientificFilter("toDate", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    />
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-code-status">Estado del código</label>
                                    <select
                                        id="scientific-code-status"
                                        value={scientificFilters.codeStatus}
                                        onChange={(event) => updateScientificFilter("codeStatus", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {CODE_STATUS_OPTIONS.map((option) => (
                                            <option key={option || "all"} value={option}>
                                                {option || "Todos"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-case-status">Estado del caso</label>
                                    <select
                                        id="scientific-case-status"
                                        value={scientificFilters.caseStatus}
                                        onChange={(event) => updateScientificFilter("caseStatus", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {CASE_STATUS_OPTIONS.map((option) => (
                                            <option key={option || "all"} value={option}>
                                                {option || "Todos"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-evaluation-type">Tipo de evaluación</label>
                                    <select
                                        id="scientific-evaluation-type"
                                        value={scientificFilters.evaluationType}
                                        onChange={(event) => updateScientificFilter("evaluationType", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {EVALUATION_TYPE_OPTIONS.map((option) => (
                                            <option key={option || "all"} value={option}>
                                                {option || "Todas"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-evaluation-status">Estado de evaluación</label>
                                    <select
                                        id="scientific-evaluation-status"
                                        value={scientificFilters.evaluationStatus}
                                        onChange={(event) => updateScientificFilter("evaluationStatus", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {EVALUATION_STATUS_OPTIONS.map((option) => (
                                            <option key={option || "all"} value={option}>
                                                {option || "Todos"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-care-setting">Ámbito asistencial</label>
                                    <select
                                        id="scientific-care-setting"
                                        value={scientificFilters.careSettingCode}
                                        onChange={(event) => updateScientificFilter("careSettingCode", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {CARE_SETTING_OPTIONS.map((option) => (
                                            <option key={option || "all"} value={option}>
                                                {option || "Todos"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-laterality">Lateralidad</label>
                                    <select
                                        id="scientific-laterality"
                                        value={scientificFilters.lateralityCode}
                                        onChange={(event) => updateScientificFilter("lateralityCode", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {LATERALITY_OPTIONS.map((option) => (
                                            <option key={option || "all"} value={option}>
                                                {option || "Todas"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-structure">Estructura anatómica</label>
                                    <select
                                        id="scientific-structure"
                                        value={scientificFilters.anatomicalStructureCode}
                                        onChange={(event) => updateScientificFilter("anatomicalStructureCode", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {ANATOMICAL_STRUCTURE_OPTIONS.map((option) => (
                                            <option key={option || "all"} value={option}>
                                                {option || "Todas"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-histology">Estado histopatología</label>
                                    <select
                                        id="scientific-histology"
                                        value={scientificFilters.histologyStatus}
                                        onChange={(event) => updateScientificFilter("histologyStatus", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {HISTOLOGY_STATUS_OPTIONS.map((option) => (
                                            <option key={option || "all"} value={option}>
                                                {option || "Todos"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 3 }}>
                                    <label htmlFor="scientific-benign-malignant">Benigno / borderline / maligno</label>
                                    <select
                                        id="scientific-benign-malignant"
                                        value={scientificFilters.benignMalignant}
                                        onChange={(event) => updateScientificFilter("benignMalignant", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        {BENIGN_MALIGNANT_OPTIONS.map((option) => (
                                            <option key={option || "all"} value={option}>
                                                {option || "Todos"}
                                            </option>
                                        ))}
                                    </select>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 6 }}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={scientificFilters.includePendingCode}
                                                onChange={(event) => updateScientificFilter("includePendingCode", event.target.checked)}
                                            />
                                        }
                                        label="Incluir casos pendientes de código"
                                    />
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 6 }}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={scientificFilters.includeExcluded}
                                                onChange={(event) => updateScientificFilter("includeExcluded", event.target.checked)}
                                            />
                                        }
                                        label="Incluir excluidos / retirados"
                                    />
                                </Grid2>
                            </Grid2>
                        </Box>

                        <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    disabled={isSiteCoordinator(keycloak) && !isStudyCoordinator(keycloak) && !(scientificFilters.centerId || allowedCenters[0])}
                                    onClick={() => handleScientificDownload('cases')}
                                >
                                    Descargar dataset por casos
                                </Button>
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    disabled={isSiteCoordinator(keycloak) && !isStudyCoordinator(keycloak) && !(scientificFilters.centerId || allowedCenters[0])}
                                    onClick={() => handleScientificDownload('evaluations')}
                                >
                                    Descargar dataset por evaluaciones
                                </Button>
                            </Grid2>
                        </Grid2>
                    </Stack>
                </Paper>
            ) : (
                <Alert severity="info" sx={{ mt: 3 }}>
                    Las exportaciones científicas del estudio están disponibles para coordinadores de centro y del estudio.
                </Alert>
            )}

        </Box>

    );
};

export default DownloadScreen;
