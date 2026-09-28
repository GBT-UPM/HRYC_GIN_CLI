import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    Grid2,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import '../assets/css/ResponsesScreen.css';
import { useKeycloak } from '@react-keycloak/web';

import ApiService from '../services/ApiService';
import StudyPageHeader from '../components/StudyPageHeader';
import {
    getAllowedCenters,
    getCentersDisplayLabel,
    getPrimaryRoleLabel,
    isClinician,
    isSiteCoordinator,
    isStudyCoordinator,
} from '../utils/auth';

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

const SELECT_STYLE = {
    width: "100%",
    padding: "9px 10px",
    marginTop: "6px",
    border: "1px solid #D9E2EC",
    borderRadius: "8px",
    color: "#1F2933",
    background: "#FFFFFF",
};

const SECTION_SX = {
    p: { xs: 2, md: 2.5 },
    border: '1px solid #D9E2EC',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
};

const FIELD_LABEL_SX = {
    color: '#1F2933',
    fontSize: '0.82rem',
    fontWeight: 700,
};

const SectionTitle = ({ title, subtitle }) => (
    <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#1F2933', fontWeight: 800, fontSize: '1rem' }}>
            {title}
        </Typography>
        {subtitle ? (
            <Typography variant="body2" sx={{ color: '#52616B', mt: 0.25 }}>
                {subtitle}
            </Typography>
        ) : null}
    </Box>
);

const FilterGroup = ({ title, children }) => (
    <Paper className="clinical-filter-group" elevation={0} sx={{ p: 2, border: '1px solid #E4EBF1', borderRadius: 2, backgroundColor: '#FBFCFE', height: '100%' }}>
        <Typography variant="subtitle2" sx={{ color: '#1E3A5F', fontWeight: 800, mb: 1.5 }}>
            {title}
        </Typography>
        <Grid2 container spacing={2}>
            {children}
        </Grid2>
    </Paper>
);

const AdvancedSection = ({ id, title, subtitle, open, onToggle, children }) => (
    <Paper className="clinical-filter-panel" elevation={0} sx={SECTION_SX}>
        <Button
            type="button"
            fullWidth
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={id}
            sx={{
                justifyContent: 'space-between',
                px: 0,
                py: 0,
                textTransform: 'none',
                color: '#1F2933',
                fontWeight: 800,
                '&:hover': { backgroundColor: 'transparent' },
            }}
        >
            <Box sx={{ textAlign: 'left' }}>
                <Typography component="span" sx={{ display: 'block', fontWeight: 800, fontSize: '1rem' }}>
                    {title}
                </Typography>
                {subtitle ? (
                    <Typography component="span" sx={{ display: 'block', color: '#52616B', fontWeight: 500, fontSize: '0.85rem', mt: 0.25 }}>
                        {subtitle}
                    </Typography>
                ) : null}
            </Box>
            <Chip label={open ? 'Ocultar' : 'Expandir'} size="small" variant="outlined" sx={{ fontWeight: 700, color: '#1E3A5F', borderColor: '#D9E2EC' }} />
        </Button>
        {open ? (
            <Box id={id} sx={{ pt: 2 }}>
                <Divider sx={{ mb: 2, borderColor: '#E4EBF1' }} />
                {children}
            </Box>
        ) : null}
    </Paper>
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
    const roleLabel = getPrimaryRoleLabel(keycloak);
    const centersLabel = getCentersDisplayLabel(keycloak);
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
    const [infoOpen, setInfoOpen] = useState(false);

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
    const pendingCodeExcludedByCurrentFilters =
        scientificFilters.codeStatus !== "PENDING_CODE" && scientificFilters.includePendingCode !== true;
    const visibleScopeLabel = studyCoordinator
        ? "Vista global"
        : scientificFilters.centerId
            ? `Centro ${scientificFilters.centerId}`
            : "Centro pendiente";

    return (
        <Box sx={{ px: 0, py: 0, minHeight: '100%' }}>
            {showScientificExports ? (
                <Stack spacing={2}>
                    <StudyPageHeader
                        title="Exportaciones científicas"
                        subtitle="Descarga de datasets del estudio en formatos CSV y Excel para análisis científico."
                        visibleScopeLabel={visibleScopeLabel}
                        roleLabel={roleLabel}
                        centersLabel={centersLabel}
                        extraChips={['Datos pseudonimizados']}
                        onInfoClick={() => setInfoOpen(true)}
                        infoButtonLabel="Información de la exportación"
                    />

                    <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth>
                        <DialogTitle sx={{ color: '#1F2933', fontWeight: 800, pr: 6 }}>
                            Información de la exportación
                            <IconButton onClick={() => setInfoOpen(false)} size="small" aria-label="Cerrar" sx={{ position: 'absolute', right: 12, top: 12 }}>
                                <Close fontSize="small" />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={1.5}>
                                <Typography variant="body2">El dataset por casos contiene una fila por caso o registro ecográfico.</Typography>
                                <Typography variant="body2">El dataset por evaluaciones contiene una fila por evaluación ecográfica y es útil para análisis interobservador.</Typography>
                                <Typography variant="body2">Las exportaciones científicas excluyen identificadores clínicos directos, pseudónimos internos, hashes y formularios FHIR completos.</Typography>
                                <Typography variant="body2">Solo se exportan variables aprobadas como no sensibles.</Typography>
                                <Typography variant="body2">Los filtros avanzados permiten limitar los registros incluidos sin cambiar los datos originales.</Typography>
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setInfoOpen(false)} sx={{ textTransform: 'none', color: '#1E3A5F', fontWeight: 700 }}>
                                Cerrar
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Paper className="clinical-filter-panel" elevation={0} sx={SECTION_SX}>
                        <SectionTitle
                            title="Configuración básica de la exportación"
                            subtitle="Defina el alcance temporal, centro y preset de columnas antes de descargar."
                        />
                        <Alert
                            severity="info"
                            sx={{
                                mb: 2,
                                border: '1px solid #C8DAEA',
                                backgroundColor: '#EEF4FA',
                                color: '#2C4A6E',
                            }}
                        >
                            Las exportaciones científicas excluyen identificadores clínicos directos, nombres, pseudónimos internos, hashes y formularios FHIR completos. Solo se exportan variables aprobadas para análisis.
                        </Alert>
                        {pendingCodeExcludedByCurrentFilters ? (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Los registros pendientes de código no se incluyen con la configuración actual. Si desea incluir registros pendientes de código, active la opción “Incluir casos pendientes de código” en filtros avanzados.
                            </Alert>
                        ) : null}
                        <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 12, md: 3 }}>
                                <Typography component="label" htmlFor="scientific-center" sx={FIELD_LABEL_SX}>Centro</Typography>
                                <select
                                    id="scientific-center"
                                    value={scientificFilters.centerId}
                                    onChange={(event) => updateScientificFilter("centerId", event.target.value)}
                                    disabled={isSiteCoordinator(keycloak) && !isStudyCoordinator(keycloak) && allowedCenters.length === 1}
                                    style={SELECT_STYLE}
                                >
                                    {centerOptions.map((center) => (
                                        <option key={center || "global"} value={center}>
                                            {center || "Todos los centros"}
                                        </option>
                                    ))}
                                </select>
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 3 }}>
                                <Typography component="label" htmlFor="scientific-from-date" sx={FIELD_LABEL_SX}>Fecha desde</Typography>
                                <input
                                    id="scientific-from-date"
                                    type="date"
                                    value={scientificFilters.fromDate}
                                    onChange={(event) => updateScientificFilter("fromDate", event.target.value)}
                                    style={SELECT_STYLE}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 3 }}>
                                <Typography component="label" htmlFor="scientific-to-date" sx={FIELD_LABEL_SX}>Fecha hasta</Typography>
                                <input
                                    id="scientific-to-date"
                                    type="date"
                                    value={scientificFilters.toDate}
                                    onChange={(event) => updateScientificFilter("toDate", event.target.value)}
                                    style={SELECT_STYLE}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 3 }}>
                                <Typography component="label" htmlFor="scientific-preset" sx={FIELD_LABEL_SX}>Preset de columnas</Typography>
                                <select
                                    id="scientific-preset"
                                    value={scientificFilters.preset}
                                    onChange={(event) => updateScientificFilter("preset", event.target.value)}
                                    style={SELECT_STYLE}
                                >
                                    <option value="">Sin preset / columnas por defecto</option>
                                    {exportPresets.map((preset) => (
                                        <option key={preset.code} value={preset.code}>
                                            {preset.label}
                                        </option>
                                    ))}
                                </select>
                                <Typography variant="caption" sx={{ color: '#52616B', display: 'block', mt: 0.75 }}>
                                    Se recomienda el dataset principal del estudio para el análisis habitual. Use otros presets solo para análisis específicos.
                                </Typography>
                                {advancedModeActive ? (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        Modo avanzado activo: revise los filtros y columnas antes de descargar.
                                    </Alert>
                                ) : null}
                            </Grid2>
                        </Grid2>
                    </Paper>

                    <Paper elevation={0} sx={SECTION_SX}>
                        <SectionTitle title="Exportaciones disponibles" subtitle="Seleccione el dataset y formato de descarga." />
                        <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <Paper elevation={0} sx={{ p: 2, height: '100%', border: '1px solid #E4EBF1', borderRadius: 2, backgroundColor: '#FBFCFE' }}>
                                    <Stack spacing={1.5}>
                                        <Box>
                                            <Typography variant="h6" sx={{ color: '#1F2933', fontWeight: 800, fontSize: '1rem' }}>
                                                Dataset por casos
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#52616B', mt: 0.5 }}>
                                                Una fila por caso o registro ecográfico. Recomendado para el análisis principal del estudio.
                                            </Typography>
                                        </Box>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                aria-label="Descargar Excel por casos"
                                                disabled={centerScopedExportDisabled || !presetAllowsExportType("CASES")}
                                                onClick={() => handleScientificDownload('cases', 'xlsx')}
                                                sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#1E3A5F', '&:hover': { backgroundColor: '#173050' } }}
                                            >
                                                Descargar Excel
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                aria-label="Descargar CSV por casos"
                                                disabled={centerScopedExportDisabled || !presetAllowsExportType("CASES")}
                                                onClick={() => handleScientificDownload('cases', 'csv')}
                                                sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#D9E2EC', color: '#1E3A5F' }}
                                            >
                                                Descargar CSV
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <Paper elevation={0} sx={{ p: 2, height: '100%', border: '1px solid #E4EBF1', borderRadius: 2, backgroundColor: '#FBFCFE' }}>
                                    <Stack spacing={1.5}>
                                        <Box>
                                            <Typography variant="h6" sx={{ color: '#1F2933', fontWeight: 800, fontSize: '1rem' }}>
                                                Dataset por evaluaciones
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#52616B', mt: 0.5 }}>
                                                Una fila por evaluación ecográfica. Útil para análisis interobservador y revisión de evaluaciones primarias/secundarias.
                                            </Typography>
                                        </Box>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                aria-label="Descargar Excel por evaluaciones/interobservador"
                                                disabled={centerScopedExportDisabled || !presetAllowsExportType("EVALUATIONS")}
                                                onClick={() => handleScientificDownload('evaluations', 'xlsx')}
                                                sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#1E3A5F', '&:hover': { backgroundColor: '#173050' } }}
                                            >
                                                Descargar Excel
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                aria-label="Descargar CSV por evaluaciones/interobservador"
                                                disabled={centerScopedExportDisabled || !presetAllowsExportType("EVALUATIONS")}
                                                onClick={() => handleScientificDownload('evaluations', 'csv')}
                                                sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#D9E2EC', color: '#1E3A5F' }}
                                            >
                                                Descargar CSV
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Grid2>
                        </Grid2>
                    </Paper>

                    <AdvancedSection
                        id="scientific-advanced-filters"
                        title="Filtros avanzados"
                        subtitle="Filtre los registros que desea incluir en la exportación."
                        open={advancedFiltersOpen}
                        onToggle={() => setAdvancedFiltersOpen((current) => !current)}
                    >
                        <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <FilterGroup title="Estado y flujo">
                                    <Grid2 size={{ xs: 12, md: 6 }}>
                                        <Typography component="label" htmlFor="scientific-code-status" sx={FIELD_LABEL_SX}>Estado del código</Typography>
                                        <select id="scientific-code-status" value={scientificFilters.codeStatus} onChange={(event) => updateScientificFilter("codeStatus", event.target.value)} style={SELECT_STYLE}>
                                            {CODE_STATUS_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "Todos"}</option>)}
                                        </select>
                                    </Grid2>
                                    <Grid2 size={{ xs: 12, md: 6 }}>
                                        <Typography component="label" htmlFor="scientific-case-status" sx={FIELD_LABEL_SX}>Estado del caso</Typography>
                                        <select id="scientific-case-status" value={scientificFilters.caseStatus} onChange={(event) => updateScientificFilter("caseStatus", event.target.value)} style={SELECT_STYLE}>
                                            {CASE_STATUS_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "Todos"}</option>)}
                                        </select>
                                    </Grid2>
                                    <Grid2 size={{ xs: 12, md: 6 }}>
                                        <Typography component="label" htmlFor="scientific-evaluation-status" sx={FIELD_LABEL_SX}>Estado de evaluación</Typography>
                                        <select id="scientific-evaluation-status" value={scientificFilters.evaluationStatus} onChange={(event) => updateScientificFilter("evaluationStatus", event.target.value)} style={SELECT_STYLE}>
                                            {EVALUATION_STATUS_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "Todos"}</option>)}
                                        </select>
                                    </Grid2>
                                    <Grid2 size={{ xs: 12, md: 6 }}>
                                        <Typography component="label" htmlFor="scientific-evaluation-type" sx={FIELD_LABEL_SX}>Tipo de evaluación</Typography>
                                        <select id="scientific-evaluation-type" value={scientificFilters.evaluationType} onChange={(event) => updateScientificFilter("evaluationType", event.target.value)} style={SELECT_STYLE}>
                                            {EVALUATION_TYPE_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "Todas"}</option>)}
                                        </select>
                                    </Grid2>
                                </FilterGroup>
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <FilterGroup title="Contexto clínico">
                                    <Grid2 size={{ xs: 12, md: 4 }}>
                                        <Typography component="label" htmlFor="scientific-care-setting" sx={FIELD_LABEL_SX}>Ámbito asistencial</Typography>
                                        <select id="scientific-care-setting" value={scientificFilters.careSettingCode} onChange={(event) => updateScientificFilter("careSettingCode", event.target.value)} style={SELECT_STYLE}>
                                            {CARE_SETTING_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "Todos"}</option>)}
                                        </select>
                                    </Grid2>
                                    <Grid2 size={{ xs: 12, md: 4 }}>
                                        <Typography component="label" htmlFor="scientific-laterality" sx={FIELD_LABEL_SX}>Lateralidad</Typography>
                                        <select id="scientific-laterality" value={scientificFilters.lateralityCode} onChange={(event) => updateScientificFilter("lateralityCode", event.target.value)} style={SELECT_STYLE}>
                                            {LATERALITY_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "Todas"}</option>)}
                                        </select>
                                    </Grid2>
                                    <Grid2 size={{ xs: 12, md: 4 }}>
                                        <Typography component="label" htmlFor="scientific-structure" sx={FIELD_LABEL_SX}>Estructura anatómica</Typography>
                                        <select id="scientific-structure" value={scientificFilters.anatomicalStructureCode} onChange={(event) => updateScientificFilter("anatomicalStructureCode", event.target.value)} style={SELECT_STYLE}>
                                            {ANATOMICAL_STRUCTURE_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "Todas"}</option>)}
                                        </select>
                                    </Grid2>
                                </FilterGroup>
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <FilterGroup title="Histopatología">
                                    <Grid2 size={{ xs: 12, md: 6 }}>
                                        <Typography component="label" htmlFor="scientific-histology" sx={FIELD_LABEL_SX}>Estado histopatología</Typography>
                                        <select id="scientific-histology" value={scientificFilters.histologyStatus} onChange={(event) => updateScientificFilter("histologyStatus", event.target.value)} style={SELECT_STYLE}>
                                            {HISTOLOGY_STATUS_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "Todos"}</option>)}
                                        </select>
                                    </Grid2>
                                    <Grid2 size={{ xs: 12, md: 6 }}>
                                        <Typography component="label" htmlFor="scientific-benign-malignant" sx={FIELD_LABEL_SX}>Benigno / borderline / maligno</Typography>
                                        <select id="scientific-benign-malignant" value={scientificFilters.benignMalignant} onChange={(event) => updateScientificFilter("benignMalignant", event.target.value)} style={SELECT_STYLE}>
                                            {BENIGN_MALIGNANT_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "Todos"}</option>)}
                                        </select>
                                    </Grid2>
                                </FilterGroup>
                            </Grid2>
                            <Grid2 size={{ xs: 12, md: 6 }}>
                                <FilterGroup title="Inclusiones especiales">
                                    <Grid2 size={{ xs: 12 }}>
                                        <FormControlLabel control={<Checkbox checked={scientificFilters.includePendingCode} onChange={(event) => updateScientificFilter("includePendingCode", event.target.checked)} />} label="Incluir casos pendientes de código" />
                                    </Grid2>
                                    <Grid2 size={{ xs: 12 }}>
                                        <FormControlLabel control={<Checkbox checked={scientificFilters.includeExcluded} onChange={(event) => updateScientificFilter("includeExcluded", event.target.checked)} />} label="Incluir excluidos / retirados" />
                                    </Grid2>
                                </FilterGroup>
                            </Grid2>
                        </Grid2>
                    </AdvancedSection>

                    <AdvancedSection
                        id="scientific-column-customization"
                        title="Selección de variables exportables"
                        subtitle="Opción avanzada. Solo se muestran variables aprobadas como exportables."
                        open={columnCustomizationOpen}
                        onToggle={() => setColumnCustomizationOpen((current) => !current)}
                    >
                        <Stack spacing={2}>
                            <Alert severity="info" sx={{ border: '1px solid #C8DAEA', backgroundColor: '#EEF4FA', color: '#2C4A6E' }}>
                                No se pueden seleccionar identificadores clínicos directos, nombres, pseudónimos internos ni campos sensibles.
                            </Alert>
                            {!scientificFilters.preset ? (
                                <Alert severity="info">
                                    Modo avanzado activo: se usarán las columnas seleccionadas o las columnas por defecto si no selecciona ninguna.
                                </Alert>
                            ) : null}
                            <Grid2 container spacing={2}>
                                <Grid2 size={{ xs: 12, md: 6 }}>
                                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #E4EBF1', borderRadius: 2, backgroundColor: '#FBFCFE' }}>
                                        <Typography component="label" htmlFor="scientific-case-columns" sx={FIELD_LABEL_SX}>Columnas del dataset por casos</Typography>
                                        <select
                                            id="scientific-case-columns"
                                            multiple
                                            value={scientificFilters.caseColumns}
                                            onChange={(event) => updateSelectedColumns("caseColumns", event.target.selectedOptions)}
                                            disabled={Boolean(scientificFilters.preset)}
                                            style={{ ...SELECT_STYLE, minHeight: "132px" }}
                                        >
                                            {exportVariables.CASES.map((variable) => (
                                                <option key={variable.columnName} value={variable.columnName}>
                                                    {variable.label || variable.columnName}
                                                </option>
                                            ))}
                                        </select>
                                    </Paper>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 6 }}>
                                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #E4EBF1', borderRadius: 2, backgroundColor: '#FBFCFE' }}>
                                        <Typography component="label" htmlFor="scientific-evaluation-columns" sx={FIELD_LABEL_SX}>Columnas del dataset por evaluaciones</Typography>
                                        <select
                                            id="scientific-evaluation-columns"
                                            multiple
                                            value={scientificFilters.evaluationColumns}
                                            onChange={(event) => updateSelectedColumns("evaluationColumns", event.target.selectedOptions)}
                                            disabled={Boolean(scientificFilters.preset)}
                                            style={{ ...SELECT_STYLE, minHeight: "132px" }}
                                        >
                                            {exportVariables.EVALUATIONS.map((variable) => (
                                                <option key={variable.columnName} value={variable.columnName}>
                                                    {variable.label || variable.columnName}
                                                </option>
                                            ))}
                                        </select>
                                    </Paper>
                                </Grid2>
                            </Grid2>
                        </Stack>
                    </AdvancedSection>
                </Stack>
            ) : (
                <Alert severity="info" sx={{ mt: 3 }}>
                    Las exportaciones científicas del estudio están disponibles para coordinadores de centro y del estudio.
                </Alert>
            )}
        </Box>
    );
};

export default DownloadScreen;
