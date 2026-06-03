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

const AdvancedSection = ({ id, title, open, onToggle, children }) => (
    <Box sx={{ border: '1px solid #d8e1e8', borderRadius: 1 }}>
        <Button
            type="button"
            fullWidth
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={id}
            sx={{
                justifyContent: 'space-between',
                px: 2,
                py: 1.25,
                textTransform: 'none',
                color: 'text.primary',
                fontWeight: 600,
            }}
        >
            <span>{title}</span>
            <span aria-hidden="true">{open ? 'Cerrar' : 'Abrir'}</span>
        </Button>
        {open ? (
            <Box id={id} sx={{ px: 2, pb: 2 }}>
                {children}
            </Box>
        ) : null}
    </Box>
);

const isRealFilterValue = (value) => {
    if (value === null || value === undefined) {
        return false;
    }

    const normalizedValue = String(value).trim();
    return normalizedValue !== ""
        && normalizedValue.toUpperCase() !== "ALL"
        && normalizedValue.toUpperCase() !== "GLOBAL"
        && normalizedValue.toUpperCase() !== "TODOS"
        && normalizedValue.toUpperCase() !== "TODAS";
};

export const buildScientificExportEndpoint = ({
    path,
    filters,
    allowedCenters,
    studyCoordinator,
    siteCoordinator,
}) => {
    const params = new URLSearchParams();
    const currentFilters = filters || {};
    const currentAllowedCenters = Array.isArray(allowedCenters) ? allowedCenters : [];

    const addParam = (name, value) => {
        if (isRealFilterValue(value)) {
            params.set(name, String(value).trim());
        }
    };

    if (siteCoordinator && !studyCoordinator) {
        addParam("centerId", currentFilters.centerId || currentAllowedCenters[0]);
    } else if (studyCoordinator) {
        addParam("centerId", currentFilters.centerId);
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
    ].forEach((field) => addParam(field, currentFilters[field]));

    if (currentFilters.includePendingCode === true) {
        params.set("includePendingCode", "true");
    }
    if (currentFilters.includeExcluded === true) {
        params.set("includeExcluded", "true");
    }
    if (path.includes("study-evaluations")) {
        addParam("evaluationType", currentFilters.evaluationType);
        addParam("evaluationStatus", currentFilters.evaluationStatus);
    }
    addParam("preset", currentFilters.preset);
    if (Array.isArray(currentFilters.columns) && currentFilters.columns.length > 0) {
        const requestedColumns = currentFilters.columns.filter(isRealFilterValue).join(",");
        addParam("columns", requestedColumns);
    } else {
        addParam("columns", currentFilters.columns);
    }

    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
};

const DownloadScreen = () => {
    const { keycloak } = useKeycloak();
    const allowedCenters = useMemo(() => getAllowedCenters(keycloak), [keycloak]);
    const studyCoordinator = isStudyCoordinator(keycloak);
    const siteCoordinator = isSiteCoordinator(keycloak);
    const hasScientificExportAccess = isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak);
    const showScientificExports = hasScientificExportAccess && !isClinician(keycloak);
    const [scientificFilters, setScientificFilters] = useState({
        centerId: "",
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
        preset: "",
        caseColumns: [],
        evaluationColumns: [],
    });
    const [exportPresets, setExportPresets] = useState([]);
    const [exportVariables, setExportVariables] = useState({ CASES: [], EVALUATIONS: [] });
    const [defaultPresetInitialized, setDefaultPresetInitialized] = useState(false);
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [columnCustomizationOpen, setColumnCustomizationOpen] = useState(false);

    useEffect(() => {
        if (siteCoordinator && !studyCoordinator && allowedCenters.length === 1) {
            setScientificFilters((current) => ({
                ...current,
                centerId: allowedCenters[0],
            }));
            return;
        }
        if (allowedCenters.length > 0 && scientificFilters.centerId && !allowedCenters.includes(scientificFilters.centerId) && !studyCoordinator) {
            setScientificFilters((current) => ({
                ...current,
                centerId: allowedCenters[0],
            }));
        }
    }, [allowedCenters, scientificFilters.centerId, siteCoordinator, studyCoordinator]);

    useEffect(() => {
        if (!showScientificExports || !keycloak?.token) {
            return;
        }

        const loadExportMetadata = async () => {
            try {
                const [presetsResponse, caseVariablesResponse, evaluationVariablesResponse] = await Promise.all([
                    ApiService(keycloak.token, 'GET', '/app/exports/presets', {}),
                    ApiService(keycloak.token, 'GET', '/app/exports/variables?exportType=CASES', {}),
                    ApiService(keycloak.token, 'GET', '/app/exports/variables?exportType=EVALUATIONS', {}),
                ]);

                if (presetsResponse.status === 200) {
                    setExportPresets(await presetsResponse.json());
                }
                if (caseVariablesResponse.status === 200) {
                    const caseVariables = await caseVariablesResponse.json();
                    setExportVariables((current) => ({ ...current, CASES: caseVariables }));
                }
                if (evaluationVariablesResponse.status === 200) {
                    const evaluationVariables = await evaluationVariablesResponse.json();
                    setExportVariables((current) => ({ ...current, EVALUATIONS: evaluationVariables }));
                }
            } catch (error) {
                console.error("Error al cargar metadatos de exportación científica:", error);
            }
        };

        loadExportMetadata();
    }, [keycloak?.token, showScientificExports]);

    useEffect(() => {
        if (defaultPresetInitialized || exportPresets.length === 0) {
            return;
        }
        const mainStudyPreset = exportPresets.find((preset) => preset.code === "MAIN_STUDY");
        if (mainStudyPreset) {
            setScientificFilters((current) => ({
                ...current,
                preset: current.preset || mainStudyPreset.code,
            }));
        }
        setDefaultPresetInitialized(true);
    }, [defaultPresetInitialized, exportPresets]);

    const centerOptions = useMemo(() => {
        if (studyCoordinator) {
            return SCIENTIFIC_EXPORT_CENTERS;
        }
        if (allowedCenters.length === 1) {
            return allowedCenters;
        }
        return ["", ...allowedCenters];
    }, [allowedCenters, studyCoordinator]);

    const updateScientificFilter = (field, value) => {
        setScientificFilters((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const buildScientificEndpoint = (path, exportType) => {
        const selectedColumns = exportType === "CASES"
            ? scientificFilters.caseColumns
            : scientificFilters.evaluationColumns;
        return buildScientificExportEndpoint({
            path,
            filters: {
                ...scientificFilters,
                columns: scientificFilters.preset ? [] : selectedColumns,
            },
            allowedCenters,
            studyCoordinator,
            siteCoordinator,
        });
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

    const handleScientificDownload = (resource, format = 'xlsx') => {
        const extension = format === 'csv' ? 'csv' : 'xlsx';
        const endpoint = resource === 'cases'
            ? buildScientificEndpoint(`/app/exports/study-cases.${extension}`, 'CASES')
            : buildScientificEndpoint(`/app/exports/study-evaluations.${extension}`, 'EVALUATIONS');
        const fallbackFilename = resource === 'cases'
            ? `study-cases.${extension}`
            : `study-evaluations.${extension}`;

        return downloadEndpoint(endpoint, fallbackFilename);
    };

    const updateSelectedColumns = (field, selectedOptions) => {
        updateScientificFilter(field, Array.from(selectedOptions).map((option) => option.value));
    };

    const selectedPreset = exportPresets.find((preset) => preset.code === scientificFilters.preset);
    const presetAllowsExportType = (exportType) =>
        !selectedPreset || selectedPreset.allowedExportTypes?.includes(exportType);
    const centerScopedExportDisabled = siteCoordinator && !studyCoordinator && !(scientificFilters.centerId || allowedCenters[0]);
    const advancedModeActive = !scientificFilters.preset || columnCustomizationOpen;

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
                                Esta sección permite descargar los datos del estudio en formato Excel o CSV para análisis. La exportación no incluye NHC, nombres, pseudónimos internos ni el QuestionnaireResponse completo.
                            </Typography>
                        </Box>

                        <Box>
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
                                                {center || "Todos los centros"}
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
                                    <label htmlFor="scientific-preset">Preset de columnas</label>
                                    <select
                                        id="scientific-preset"
                                        value={scientificFilters.preset}
                                        onChange={(event) => updateScientificFilter("preset", event.target.value)}
                                        style={{ width: "100%", padding: "8px", marginTop: "4px" }}
                                    >
                                        <option value="">Sin preset / columnas por defecto</option>
                                        {exportPresets.map((preset) => (
                                            <option key={preset.code} value={preset.code}>
                                                {preset.label}
                                            </option>
                                        ))}
                                    </select>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                                        Para el análisis habitual se recomienda Dataset principal del estudio. Use otras opciones solo si necesita análisis específicos.
                                    </Typography>
                                    {advancedModeActive ? (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            Modo avanzado activo: revise los filtros y columnas antes de descargar.
                                        </Alert>
                                    ) : null}
                                </Grid2>
                            </Grid2>
                        </Box>

                        <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <Stack spacing={1}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        disabled={centerScopedExportDisabled || !presetAllowsExportType("CASES")}
                                        onClick={() => handleScientificDownload('cases', 'xlsx')}
                                    >
                                        Descargar Excel por casos
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        disabled={centerScopedExportDisabled || !presetAllowsExportType("CASES")}
                                        onClick={() => handleScientificDownload('cases', 'csv')}
                                    >
                                        Descargar CSV por casos
                                    </Button>
                                    <Typography variant="body2" color="text.secondary">
                                        Una fila por masa/caso. Recomendado para el análisis principal del estudio.
                                    </Typography>
                                </Stack>
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <Stack spacing={1}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        disabled={centerScopedExportDisabled || !presetAllowsExportType("EVALUATIONS")}
                                        onClick={() => handleScientificDownload('evaluations', 'xlsx')}
                                    >
                                        Descargar Excel por evaluaciones/interobservador
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        disabled={centerScopedExportDisabled || !presetAllowsExportType("EVALUATIONS")}
                                        onClick={() => handleScientificDownload('evaluations', 'csv')}
                                    >
                                        Descargar CSV por evaluaciones/interobservador
                                    </Button>
                                    <Typography variant="body2" color="text.secondary">
                                        Una fila por evaluación ecográfica. Útil para análisis interobservador.
                                    </Typography>
                                </Stack>
                            </Grid2>
                        </Grid2>

                        <AdvancedSection
                            id="scientific-advanced-filters"
                            title="Filtros avanzados"
                            open={advancedFiltersOpen}
                            onToggle={() => setAdvancedFiltersOpen((current) => !current)}
                        >
                            <Grid2 container spacing={2}>
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
                        </AdvancedSection>

                        <AdvancedSection
                            id="scientific-column-customization"
                            title="Personalizar columnas"
                            open={columnCustomizationOpen}
                            onToggle={() => setColumnCustomizationOpen((current) => !current)}
                        >
                            <Stack spacing={2}>
                                <Typography variant="body2" color="text.secondary">
                                    Opción avanzada. Solo se muestran variables aprobadas como exportables. No se pueden seleccionar NHC, nombres, pseudónimos internos ni campos sensibles.
                                </Typography>
                                {!scientificFilters.preset ? (
                                    <Alert severity="info">
                                        Modo avanzado activo: se usarán las columnas seleccionadas o las columnas por defecto si no selecciona ninguna.
                                    </Alert>
                                ) : null}
                                <Grid2 container spacing={2}>
                                    <Grid2 size={{ xs: 12, md: 6 }}>
                                    <label htmlFor="scientific-case-columns">Columnas dataset por casos</label>
                                    <select
                                        id="scientific-case-columns"
                                        multiple
                                        value={scientificFilters.caseColumns}
                                        onChange={(event) => updateSelectedColumns("caseColumns", event.target.selectedOptions)}
                                        disabled={Boolean(scientificFilters.preset)}
                                        style={{ width: "100%", minHeight: "120px", padding: "8px", marginTop: "4px" }}
                                    >
                                        {exportVariables.CASES.map((variable) => (
                                            <option key={variable.columnName} value={variable.columnName}>
                                                {variable.label || variable.columnName}
                                            </option>
                                        ))}
                                    </select>
                                    </Grid2>
                                    <Grid2 size={{ xs: 12, md: 6 }}>
                                    <label htmlFor="scientific-evaluation-columns">Columnas dataset por evaluaciones</label>
                                    <select
                                        id="scientific-evaluation-columns"
                                        multiple
                                        value={scientificFilters.evaluationColumns}
                                        onChange={(event) => updateSelectedColumns("evaluationColumns", event.target.selectedOptions)}
                                        disabled={Boolean(scientificFilters.preset)}
                                        style={{ width: "100%", minHeight: "120px", padding: "8px", marginTop: "4px" }}
                                    >
                                        {exportVariables.EVALUATIONS.map((variable) => (
                                            <option key={variable.columnName} value={variable.columnName}>
                                                {variable.label || variable.columnName}
                                            </option>
                                        ))}
                                    </select>
                                    </Grid2>
                                </Grid2>
                            </Stack>
                        </AdvancedSection>
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
