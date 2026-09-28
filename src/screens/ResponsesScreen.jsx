import React, { useState, useEffect, useCallback } from 'react';
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
    FormControl,
    FormControlLabel,
    FormGroup,
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
    TablePagination,
    TableRow,
    TableSortLabel,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import '../assets/css/ResponsesScreen.css';
import { useKeycloak } from '@react-keycloak/web';
import ApiService from '../services/ApiService';
import { formatCodeStatusLabel, resolveDisplayStudyIdentifier, resolveStudyCodeDisplay } from '../utils/caseMetadata';
import {
    CASE_EVALUATION_STATUS,
    CASE_RECORD_STATUS,
    formatCaseStatusLabel,
    formatEvaluationStatusLabel,
    normalizeCaseStatus,
    normalizeEvaluationStatus,
} from '../utils/caseStatus';
import { formatEvaluationTypeLabel } from '../utils/evaluationType';
import { getCareSettingDisplay } from '../utils/careSetting';
import {
    canUseGlobalView,
    getAllowedCenters,
    getCentersDisplayLabel,
    getDefaultCenter,
    getPrimaryRoleLabel,
    isSiteCoordinator,
    isStudyCoordinator,
} from '../utils/auth';
import { searchCasesByNhc } from '../services/caseService';
import { getCaseEvaluations } from '../services/caseEvaluationService';
import { CASE_STATUS_ERROR_MESSAGES, updateCaseStatus, updateEvaluationStatus } from '../services/caseStatusService';
import { upsertHistopathology } from '../services/histopathologyService';
import StudyPageHeader from '../components/StudyPageHeader';
import { calculateEcoScoreFromQuestionnaireResponse, ECO_SCORE_STATUS } from '../utils/ecoScore';
import { formatRiskDisplay } from '../utils/riskDisplay';
import {
    NO_SURGERY_REASONS,
    PATHOLOGY_RESULTS,
    SURGERY_OPTIONS,
    SURGICAL_PROCEDURES,
    TUMOR_TYPES,
    isOtherTumorType,
} from '../constants/histopathology';

const tipoMap = {
    'sólida': 'sólido',
    'quística': 'quístico',
    'sólido-quística': 'sólido-quístico'
};

const getStatusChipSx = (label) => {
    const lc = (label || '').toLowerCase();
    if (['asignado', 'completada', 'disponible'].some(k => lc.includes(k))) {
        return { backgroundColor: '#edf7e8', color: 'var(--color-success)', borderColor: '#b9d8a8' };
    }
    if (['pendiente', 'revisión'].some(k => lc.includes(k))) {
        return { backgroundColor: '#fff5dc', color: '#765600', borderColor: '#e8cf8e' };
    }
    if (['conflicto', 'excluido', 'excluida', 'retirado'].some(k => lc.includes(k))) {
        return { backgroundColor: '#ffeded', color: 'var(--color-error)', borderColor: '#edb8b8' };
    }
    if (['bloqueado', 'bloqueada', 'corregida'].some(k => lc.includes(k))) {
        return { backgroundColor: 'var(--color-surface-variant)', color: 'var(--color-on-surface-variant)', borderColor: 'var(--color-outline-variant)' };
    }
    return { backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', borderColor: '#aebde2' };
};

const TH_SX = {
    backgroundColor: '#EAF1F7',
    color: '#173B5F',
    fontWeight: 700,
    fontSize: '0.75rem',
    borderBottom: '2px solid #CBD5E1',
    py: 1.25,
    px: 1.5,
    whiteSpace: 'nowrap',
};

const SORT_LABEL_SX = {
    color: '#173B5F !important',
    '& .MuiTableSortLabel-icon': { color: '#173B5F !important' },
    '&.Mui-active': { color: '#1E3A5F !important' },
    '&.Mui-active .MuiTableSortLabel-icon': { color: '#1E3A5F !important' },
};

const ACTION_BTN_SX = {
    fontSize: '0.72rem',
    textTransform: 'none',
    borderColor: '#D9E2EC',
    color: '#1E3A5F',
    fontWeight: 600,
    py: 0.25,
    px: 1,
    minWidth: 0,
    '&:hover': { borderColor: '#2F5D7C', backgroundColor: '#F5F7FA' },
};

const DIALOG_PAPER_SX = {
    borderRadius: '12px',
    border: '1px solid #D6E0EA',
    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12)',
};

const DIALOG_TITLE_SX = {
    fontWeight: 800,
    color: '#1F2933',
    fontSize: '1.05rem',
    borderBottom: '1px solid #EEF2F6',
    pb: 1.5,
    pr: 6,
};

const DIALOG_CONTENT_SX = {
    px: 3,
    py: 2.5,
};

const DIALOG_ACTIONS_SX = {
    px: 3,
    py: 1.5,
    borderTop: '1px solid #EEF2F6',
    gap: 1,
};

const SECTION_LABEL_SX = {
    display: 'block',
    color: '#52616B',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontSize: '0.68rem',
    mb: 1.25,
};

const PRIMARY_BTN_SX = {
    textTransform: 'none',
    fontWeight: 700,
    backgroundColor: '#1E3A5F',
    '&:hover': { backgroundColor: '#173050' },
};

const SECONDARY_BTN_SX = {
    textTransform: 'none',
    fontWeight: 600,
    borderColor: '#D9E2EC',
    color: '#1E3A5F',
    '&:hover': { borderColor: '#2F5D7C', backgroundColor: '#F5F7FA' },
};

const CASE_SEARCH_SECTION_SX = {
    border: '1px solid #D9E2EC',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    p: { xs: 1.75, sm: 2 },
};

const CASE_SEARCH_RESULT_TH_SX = {
    ...TH_SX,
    backgroundColor: '#EEF5FA',
    borderBottom: '1px solid #D6E0EA',
    py: 1,
};

const CASE_SEARCH_PRIMARY_BTN_SX = {
    ...PRIMARY_BTN_SX,
    color: '#FFFFFF',
    border: '1px solid #1E3A5F',
    boxShadow: 'none',
    '&:hover': {
        backgroundColor: '#173050',
        borderColor: '#173050',
        boxShadow: 'none',
    },
    '&:focus-visible': {
        outline: '3px solid #BFD7EA',
        outlineOffset: 2,
    },
    '&.Mui-disabled': {
        backgroundColor: '#E6ECF2',
        borderColor: '#CDD6E0',
        color: '#6B7C8F',
    },
};

const CASE_SEARCH_SECONDARY_BTN_SX = {
    textTransform: 'none',
    fontWeight: 700,
    backgroundColor: '#FFFFFF',
    borderColor: '#BFD7EA',
    color: '#1E3A5F',
    '&:hover': {
        backgroundColor: '#F0F7FC',
        borderColor: '#2F5D7C',
        color: '#1E3A5F',
    },
    '&:focus-visible': {
        outline: '3px solid #BFD7EA',
        outlineOffset: 2,
    },
    '&.Mui-disabled': {
        backgroundColor: '#F4F7FA',
        borderColor: '#D9E2EC',
        color: '#7B8794',
    },
};

const CASE_SEARCH_NEUTRAL_BTN_SX = {
    textTransform: 'none',
    fontWeight: 600,
    backgroundColor: '#FFFFFF',
    borderColor: '#D9E2EC',
    color: '#3E4C59',
    '&:hover': {
        backgroundColor: '#F5F7FA',
        borderColor: '#CBD5E1',
        color: '#1F2933',
    },
    '&:focus-visible': {
        outline: '3px solid #D9E2EC',
        outlineOffset: 2,
    },
    '&.Mui-disabled': {
        backgroundColor: '#F5F7FA',
        borderColor: '#E1E8F0',
        color: '#9AA5B1',
    },
};

const ResponsesScreen = () => {
    const { keycloak, initialized } = useKeycloak();
    const allowedCenters = getAllowedCenters(keycloak);
    const isGlobalView = canUseGlobalView(keycloak);
    const shouldSelectCenter = !isGlobalView && allowedCenters.length > 1;
    const roleLabel = getPrimaryRoleLabel(keycloak);
    const centersLabel = getCentersDisplayLabel(keycloak);

    const [selectedCenter, setSelectedCenter] = useState(getDefaultCenter(keycloak));
    const [data, setData] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [orderBy, setOrderBy] = useState('createdAt');
    const [orderDirection, setOrderDirection] = useState('desc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
    const [selectedEvaluationItem, setSelectedEvaluationItem] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [histologyModalOpen, setHistologyModalOpen] = useState(false);
    const [selectedHistologyCase, setSelectedHistologyCase] = useState(null);
    const [histologyForm, setHistologyForm] = useState({
        status: 'PENDING',
        diagnosis: '',
        surgeryPerformed: 'UNKNOWN',
        noSurgeryReason: '',
        noSurgeryReasonOther: '',
        surgicalProcedures: [],
        otherSurgicalProcedure: '',
        finalPathologyResult: 'PENDING',
        tumorType: '',
        tumorTypeOther: '',
        surgeryDate: '',
        pathologyDate: '',
        source: '',
        notes: '',
    });
    const [histologySaving, setHistologySaving] = useState(false);
    const [histologyError, setHistologyError] = useState('');
    const [caseSearchOpen, setCaseSearchOpen] = useState(false);
    const [caseSearchForm, setCaseSearchForm] = useState({
        centerId: getDefaultCenter(keycloak),
        nhc: '',
    });
    const [caseSearchLoading, setCaseSearchLoading] = useState(false);
    const [caseSearchError, setCaseSearchError] = useState('');
    const [caseSearchResult, setCaseSearchResult] = useState(null);
    const [selectedSearchCaseId, setSelectedSearchCaseId] = useState('');
    const [infoOpen, setInfoOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [pendingStatusAction, setPendingStatusAction] = useState(null);
    const [statusReason, setStatusReason] = useState('');
    const [statusActionError, setStatusActionError] = useState('');
    const [statusActionSaving, setStatusActionSaving] = useState(false);

    const formatConsentConfirmationDate = (value) => {
        if (!value) {
            return "No disponible";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "No disponible";
        }
        return date.toLocaleString("es-ES");
    };

    const parseQuestionnaireResponses = (questionnaireResponse) => {
        try {
            const parsed = typeof questionnaireResponse === 'string'
                ? JSON.parse(questionnaireResponse)
                : questionnaireResponse;
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
            return [];
        }
    };

    const findItemByLinkId = (items, linkId) => {
        if (!Array.isArray(items)) return null;
        for (const item of items) {
            if (item.linkId === linkId) return item;
            const nested = findItemByLinkId(item.item, linkId);
            if (nested) return nested;
        }
        return null;
    };

    const getAnswerValue = (answer) => {
        if (answer.valueString) return answer.valueString;
        if (answer.valueDate) return new Date(answer.valueDate).toLocaleDateString();
        if (answer.valueInteger) return answer.valueInteger.toString();
        if (answer.valueDecimal) return answer.valueDecimal.toString();
        if (answer.valueBoolean) return answer.valueBoolean ? "Sí" : "No";
        if (answer.valueCoding) return answer.valueCoding.display || answer.valueCoding.code;
        return "No disponible";
    };

    const getQuestionnaireValue = (questionnaireResponse, linkId) => {
        const responses = parseQuestionnaireResponses(questionnaireResponse);
        for (const response of responses) {
            const item = findItemByLinkId(response?.item, linkId);
            if (item?.answer?.length > 0) {
                return getAnswerValue(item.answer[0]);
            }
        }
        return "";
    };

    const getIdentifier = (item) => resolveDisplayStudyIdentifier(item);
    const getStudyCode = (item) => resolveStudyCodeDisplay(item);
    const getCodeStatus = (item) => formatCodeStatusLabel(item.codeStatus);
    const getCaseStatus = (item) => formatCaseStatusLabel(item.caseStatus);
    const getEvaluationStatus = (item) => formatEvaluationStatusLabel(item.evaluationStatus);
    const getEvaluationType = (item) => formatEvaluationTypeLabel(item.evaluationType, item.primaryEvaluation, item.evaluationId);
    const getCenter = (item) => item.centerId || item.center || item.centerName || getQuestionnaireValue(item.questionnaireResponse, "HOSPITAL_REF") || "—";
    const getLaterality = (item) => item.lateralityDisplay || item.laterality || getQuestionnaireValue(item.questionnaireResponse, "MA_LADO") || "—";
    const getCareSetting = (item) => {
        if (item.careSettingDisplay) {
            return item.careSettingDisplay;
        }
        if (item.careSettingCode) {
            return getCareSettingDisplay(item.careSettingCode);
        }
        if (item.caseCareSettingDisplay) {
            return item.caseCareSettingDisplay;
        }
        if (item.caseCareSettingCode) {
            return getCareSettingDisplay(item.caseCareSettingCode);
        }
        return "No especificado";
    };
    const canManageHistopathology = (item) => (
        isSiteCoordinator(keycloak) &&
        allowedCenters.includes(String(item.centerId || '').trim().toUpperCase())
    );
    const canManageAdministrativeStatus = (item) => (
        (isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak)) &&
        allowedCenters.includes(String(item.centerId || '').trim().toUpperCase())
    );
    const canSearchCasesByNhc = (
        (isSiteCoordinator(keycloak) || isStudyCoordinator(keycloak)) &&
        allowedCenters.length > 0
    );
    const hasStructuredHistology = (item) => Boolean(item.histologyStatus);
    const isHistologyApplicable = (item) => {
        if (item.hasAdnexalMass === false) {
            return false;
        }
        if (item.lateralityCode === 'NOT_APPLICABLE') {
            return false;
        }
        if (item.anatomicalStructureCode === 'NOT_APPLICABLE') {
            return false;
        }
        return true;
    };
    const getHistopathologyActionLabel = () => 'Histología';
    const getHistopathologyActionTooltip = (item) => (
        hasStructuredHistology(item) ? 'Actualizar histopatología del caso' : 'Registrar histopatología del caso'
    );
    const getRowActionKey = (item) => `${item.caseId || 'case'}:${item.evaluationId || 'legacy'}`;
    const getCaseAdministrativeActions = (item) => {
        const status = normalizeCaseStatus(item?.caseStatus);
        if (![CASE_RECORD_STATUS.OPEN, CASE_RECORD_STATUS.READY_FOR_REVIEW].includes(status)) {
            return [];
        }
        return [
            { scope: 'case', targetStatus: CASE_RECORD_STATUS.EXCLUDED, label: 'Excluir caso', targetLabel: 'Excluido' },
            { scope: 'case', targetStatus: CASE_RECORD_STATUS.WITHDRAWN, label: 'Retirar caso', targetLabel: 'Retirado' },
            { scope: 'case', targetStatus: CASE_RECORD_STATUS.LOCKED, label: 'Bloquear caso', targetLabel: 'Bloqueado' },
        ];
    };
    const getEvaluationAdministrativeActions = (item) => {
        const status = normalizeEvaluationStatus(item?.evaluationStatus);
        if (![CASE_EVALUATION_STATUS.COMPLETED, CASE_EVALUATION_STATUS.CORRECTED].includes(status)) {
            return [];
        }
        return [
            { scope: 'evaluation', targetStatus: CASE_EVALUATION_STATUS.EXCLUDED, label: 'Excluir evaluación', targetLabel: 'Excluida' },
            { scope: 'evaluation', targetStatus: CASE_EVALUATION_STATUS.LOCKED, label: 'Bloquear evaluación', targetLabel: 'Bloqueada' },
        ];
    };

    const openHistologyModal = (item) => {
        setSelectedHistologyCase(item);
        setHistologyForm({
            status: item.histologyStatus || 'PENDING',
            diagnosis: item.histologyDiagnosis || '',
            surgeryPerformed: item.surgeryPerformed || 'UNKNOWN',
            noSurgeryReason: item.noSurgeryReason || '',
            noSurgeryReasonOther: item.noSurgeryReasonOther || '',
            surgicalProcedures: Array.isArray(item.surgicalProcedures) ? item.surgicalProcedures : [],
            otherSurgicalProcedure: item.otherSurgicalProcedure || '',
            finalPathologyResult: item.finalPathologyResult || item.benignMalignant || 'PENDING',
            tumorType: item.tumorType || '',
            tumorTypeOther: item.tumorTypeOther || '',
            surgeryDate: item.surgeryDate || '',
            pathologyDate: item.pathologyDate || '',
            source: item.histologySource || '',
            notes: item.pathologyNotes || '',
        });
        setHistologyError('');
        setHistologyModalOpen(true);
    };

    const closeHistologyModal = () => {
        setHistologyModalOpen(false);
        setSelectedHistologyCase(null);
        setHistologyError('');
    };

    const openCaseSearchModal = () => {
        setCaseSearchForm({
            centerId: selectedCenter || getDefaultCenter(keycloak) || allowedCenters[0] || '',
            nhc: '',
        });
        setCaseSearchError('');
        setCaseSearchResult(null);
        setSelectedSearchCaseId('');
        setCaseSearchOpen(true);
    };

    const closeCaseSearchModal = () => {
        if (caseSearchLoading) {
            return;
        }
        setCaseSearchOpen(false);
        setCaseSearchForm((current) => ({ ...current, nhc: '' }));
        setCaseSearchError('');
        setCaseSearchResult(null);
        setSelectedSearchCaseId('');
    };

    const handleCaseSearchFieldChange = (field) => (event) => {
        setCaseSearchForm((current) => ({
            ...current,
            [field]: event.target.value,
        }));
    };

    const toHistologyCaseFromSearch = (caseItem) => ({
        ...caseItem,
        centerId: caseSearchResult?.centerId || caseSearchForm.centerId,
        studyPatientCode: caseSearchResult?.studyPatientCode || null,
        codeStatus: caseSearchResult?.studyPatientCode ? 'CODE_ASSIGNED' : 'PENDING_CODE',
        histologyStatus: caseItem.histologyStatus || 'PENDING',
        primaryEvaluation: true,
        hasAdnexalMass: true,
    });

    const getSelectedSearchCase = () => {
        const cases = caseSearchResult?.cases || [];
        if (cases.length === 1) {
            return cases[0];
        }
        return cases.find((item) => String(item.caseId) === String(selectedSearchCaseId));
    };

    const handleSearchCasesByNhc = async () => {
        try {
            setCaseSearchLoading(true);
            setCaseSearchError('');
            setCaseSearchResult(null);
            setSelectedSearchCaseId('');
            const result = await searchCasesByNhc(keycloak.token, {
                centerId: caseSearchForm.centerId,
                nhc: caseSearchForm.nhc,
            });
            setCaseSearchResult(result);
            if ((result?.cases || []).length === 1) {
                setSelectedSearchCaseId(String(result.cases[0].caseId));
            }
        } catch (error) {
            setCaseSearchError(error.message || 'No se pudo buscar el caso para histopatología.');
        } finally {
            setCaseSearchForm((current) => ({ ...current, nhc: '' }));
            setCaseSearchLoading(false);
        }
    };

    const handleOpenHistologyFromSearch = () => {
        const selectedCase = getSelectedSearchCase();
        if (!selectedCase) {
            return;
        }
        setCaseSearchOpen(false);
        setCaseSearchForm((current) => ({ ...current, nhc: '' }));
        setCaseSearchError('');
        openHistologyModal(toHistologyCaseFromSearch(selectedCase));
    };

    const openStatusDialog = (action) => {
        setPendingStatusAction(action);
        setStatusReason('');
        setStatusActionError('');
        setStatusDialogOpen(true);
    };

    const closeStatusDialog = () => {
        if (statusActionSaving) {
            return;
        }
        setStatusDialogOpen(false);
        setPendingStatusAction(null);
        setStatusReason('');
        setStatusActionError('');
    };

    const handleHistologyFieldChange = (field) => (event) => {
        const value = event.target.value;
        setHistologyForm((current) => ({
            ...current,
            [field]: value,
            ...(field === 'status' && value !== 'AVAILABLE' ? {
                finalPathologyResult: 'PENDING', tumorType: '', tumorTypeOther: '', diagnosis: '', pathologyDate: '',
            } : {}),
            ...(field === 'surgeryPerformed' && value !== 'NO' ? { noSurgeryReason: '', noSurgeryReasonOther: '' } : {}),
            ...(field === 'surgeryPerformed' && value !== 'YES' ? { surgicalProcedures: [], otherSurgicalProcedure: '' } : {}),
            ...(field === 'finalPathologyResult' ? { tumorType: '', tumorTypeOther: '' } : {}),
        }));
    };

    const handleSurgicalProcedureChange = (procedure) => (event) => {
        setHistologyForm((current) => ({
            ...current,
            surgicalProcedures: event.target.checked
                ? [...current.surgicalProcedures, procedure]
                : current.surgicalProcedures.filter((value) => value !== procedure),
            ...(!event.target.checked && procedure === 'OTHER' ? { otherSurgicalProcedure: '' } : {}),
        }));
    };

    const validateHistologyForm = () => {
        if (histologyForm.surgeryPerformed === 'NO' && !histologyForm.noSurgeryReason) return 'Seleccione la situación sin cirugía.';
        if (histologyForm.noSurgeryReason === 'OTHER' && !histologyForm.noSurgeryReasonOther.trim()) return 'Especifique el otro motivo sin cirugía.';
        if (histologyForm.surgicalProcedures.includes('OTHER') && !histologyForm.otherSurgicalProcedure.trim()) return 'Especifique el otro procedimiento.';
        if (histologyForm.status === 'AVAILABLE' && histologyForm.finalPathologyResult === 'PENDING') return 'Seleccione el resultado anatomopatológico final.';
        if (histologyForm.status === 'AVAILABLE' && !histologyForm.tumorType) return 'Seleccione el tipo tumoral.';
        if (isOtherTumorType(histologyForm.tumorType) && !histologyForm.tumorTypeOther.trim()) return 'Especifique el tipo tumoral.';
        return '';
    };

    const handleSaveHistology = async () => {
        if (!selectedHistologyCase?.caseId) {
            return;
        }
        const validationError = validateHistologyForm();
        if (validationError) {
            setHistologyError(validationError);
            return;
        }
        try {
            setHistologySaving(true);
            setHistologyError('');
            await upsertHistopathology(keycloak.token, selectedHistologyCase.caseId, {
                status: histologyForm.status,
                diagnosis: histologyForm.status === 'AVAILABLE' ? histologyForm.diagnosis : '',
                surgeryPerformed: histologyForm.surgeryPerformed,
                noSurgeryReason: histologyForm.noSurgeryReason || null,
                noSurgeryReasonOther: histologyForm.noSurgeryReasonOther || null,
                surgicalProcedures: histologyForm.surgicalProcedures,
                otherSurgicalProcedure: histologyForm.otherSurgicalProcedure || null,
                finalPathologyResult: histologyForm.status === 'AVAILABLE' ? histologyForm.finalPathologyResult : 'PENDING',
                tumorType: histologyForm.status === 'AVAILABLE' ? histologyForm.tumorType : '',
                tumorTypeOther: histologyForm.status === 'AVAILABLE' ? histologyForm.tumorTypeOther || null : null,
                surgeryDate: histologyForm.surgeryDate || null,
                pathologyDate: histologyForm.status === 'AVAILABLE' ? histologyForm.pathologyDate || null : null,
                source: histologyForm.status === 'UNKNOWN' ? '' : histologyForm.source,
                notes: histologyForm.notes,
            });
            closeHistologyModal();
            await fetchQuestionnaire();
        } catch (error) {
            setHistologyError(error.message || 'No se pudo registrar la histopatología.');
        } finally {
            setHistologySaving(false);
        }
    };

    const fetchQuestionnaireResponseByFhirId = useCallback(async (questionnaireResponseFhirId) => {
        if (!questionnaireResponseFhirId) {
            return null;
        }
        const response = await ApiService(keycloak.token, 'GET', `/app/QuestionnaireResponse/${questionnaireResponseFhirId}`, {});
        if (response.status !== 200) {
            throw new Error(`Error en la respuesta: ${response.status}`);
        }
        return response.json();
    }, [keycloak.token]);

    const generateReport = () => {
        const getValue = (id) => {
            const responses = selectedQuestionnaire.item;
            const response = responses.find((resp) => resp.linkId.toLowerCase() === id.toLowerCase());
            if (response && response.answer.length > 0) {
                const answer = response.answer[0];
                if (answer.valueCoding && answer.valueCoding.display) {
                    return answer.valueCoding.display.toLowerCase();
                } else if (answer.valueString) {
                    return answer.valueString.toLowerCase();
                } else if (answer.valueInteger !== undefined) {
                    return answer.valueInteger.toString();
                } else if (answer.valueDate) {
                    return answer.valueDate;
                } else if (answer.valueDecimal) {
                    return answer.valueDecimal.toString();
                }
            }
            return '';
        };

        const PAT_MA = getValue('PAT_MA');
        const MA_TIPO = getValue('MA_TIPO');
        const MA_ESTRUCTURA = getValue('MA_ESTRUCTURA');
        const MA_LADO = getValue('MA_LADO');
        const MA_M1 = getValue('MA_M1');
        const MA_M2 = getValue('MA_M2');
        const MA_M3 = getValue('MA_M3');
        const volumen = ((parseFloat(MA_M1) * parseFloat(MA_M2) * parseFloat(MA_M3) * 0.52) / 1000);
        const MA_VOL = volumen < 0.01 ? volumen.toFixed(3) : volumen.toFixed(2);
        const MA_SOL_CONTORNO = getValue('MA_SOL_CONTORNO');
        const MA_CONTENIDO = getValue('MA_CONTENIDO');
        const MA_CONTENIDO_OTRO = getValue('MA_CONTENIDO_OTRO');
        const MA_SOL_VASC = getValue('MA_SOL_VASC');
        const MA_Q_CONTORNO = getValue('MA_Q_CONTORNO');
        const MA_Q_GROSOR = getValue('MA_Q_GROSOR');
        const MA_Q_VASC = getValue('MA_Q_VASC');
        const MA_PAPS = getValue('MA_PAPS');
        const MA_Q_P = getValue('MA_Q_P');
        const MA_Q_P_M1 = getValue('MA_Q_P_M1');
        const MA_Q_P_M2 = getValue('MA_Q_P_M2');
        const MA_Q_P_CONTORNO = getValue('MA_Q_P_CONTORNO');
        const MA_Q_P_VASC = getValue('MA_Q_P_VASC');
        const MA_Q_T = getValue('MA_Q_T');
        const MA_Q_T_TIPO = getValue('MA_Q_T_TIPO');
        const MA_Q_T_GROSOR = getValue('MA_Q_T_GROSOR');
        const MA_Q_T_VASC = getValue('MA_Q_T_VASC');
        const MA_Q_T_N = getValue('MA_Q_T_N');
        const MA_Q_AS = getValue('MA_Q_AS');
        const MA_Q_AS_N = getValue('MA_Q_AS_N');
        const MA_Q_AS_M1 = getValue('MA_Q_AS_M1');
        const MA_Q_AS_M2 = getValue('MA_Q_AS_M2');
        const MA_Q_AS_M3 = getValue('MA_Q_AS_M3');
        const MA_Q_AS_VASC = getValue('MA_Q_AS_VASC');
        const MA_SA = getValue('MA_SA');
        const MA_PS = getValue('MA_PS');
        const MA_PS_M1 = getValue('MA_PS_M1');
        const MA_PS_M2 = getValue('MA_PS_M2');
        const MA_PS_M3 = getValue('MA_PS_M3');
        const MA_ASC = getValue('MA_ASC');
        const MA_ASC_TIPO = getValue('MA_ASC_TIPO');
        const MA_CARC = getValue('MA_CARC');

        const ecoScore = calculateEcoScoreFromQuestionnaireResponse(selectedQuestionnaire);

        let report = '';
        if (PAT_MA === 'no') {
            const OD_M1 = getValue('OD_M1');
            const OD_M2 = getValue('OD_M2');
            const OD_FOL = getValue('OD_FOL');
            const OI_M1 = getValue('OI_M1');
            const OI_M2 = getValue('OI_M2');
            const OI_FOL = getValue('OI_FOL');
            report += `<div>Anejo derecho de ${OD_M1} x ${OD_M2} mm con ${OD_FOL} folículo/s.</div>`;
            report += `<div>Anejo izquierdo de ${OI_M1} x ${OI_M2} mm con ${OI_FOL} folículo/s.</div>`;
            return report;
        } else {
            const estructurasFemeninas = ['trompa'];
            if (['sólida', 'quística', 'sólido-quística'].includes(MA_TIPO)) {
                let dependencia = '';
                const contorno = MA_TIPO === 'sólida' ? MA_SOL_CONTORNO : MA_Q_CONTORNO;
                let vascularizacion_MA_SOL = '';
                if (MA_TIPO === 'sólida') {
                    vascularizacion_MA_SOL = MA_SOL_VASC === 'ninguno (score color 1)'
                        ? ' Es avascular.'
                        : ` Su grado de vascularización es ${MA_SOL_VASC === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_SOL_VASC}.`;
                }
                if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {
                    dependencia = 'De dependencia indefinida';
                } else {
                    const estructura = MA_ESTRUCTURA;
                    const lado = estructurasFemeninas.includes(estructura)
                        ? (MA_LADO === 'derecho' ? 'derecha' : MA_LADO === 'izquierdo' ? 'izquierda' : MA_LADO) : MA_LADO;
                    dependencia = `Dependiente de ${estructura} ${lado}`;
                }
                const contenido = MA_CONTENIDO === 'otro' ? MA_CONTENIDO_OTRO : MA_CONTENIDO;
                const tipoMasculino = tipoMap[MA_TIPO] || MA_TIPO;
                report += `<div>${dependencia}, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm (${MA_VOL} cm³) de aspecto ${tipoMasculino} de contorno ${contorno} y de contenido ${contenido}.${vascularizacion_MA_SOL}</div>`;
                let vascularizacion_MA_Q = '';
                if (MA_TIPO === 'quística' || MA_TIPO === 'sólido-quística') {
                    vascularizacion_MA_Q = MA_Q_VASC === 'ninguno (score color 1)'
                        ? ' y es avascular'
                        : ` y su grado de vascularización es ${MA_Q_VASC === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_Q_VASC}`;
                    report += `<div>La pared mide ${MA_Q_GROSOR} mm ${vascularizacion_MA_Q}. El contorno es ${MA_Q_CONTORNO}.</div>`;
                    let vascularizacion_papila = '';
                    vascularizacion_papila = MA_Q_P_VASC === 'ninguno (score color 1)'
                        ? 'avascular'
                        : `con grado de vascularización ${MA_Q_P_VASC === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_Q_P_VASC}`;
                    if (MA_PAPS === 'sí') {
                        report += `<div>Contiene ${MA_Q_P} papila/s, la mayor de ellas de ${MA_Q_P_M1} x ${MA_Q_P_M2} mm de morfología ${MA_Q_P_CONTORNO} y ${vascularizacion_papila}.</div>`;
                    }
                    let vascularizacion_tabiques = '';
                    vascularizacion_tabiques = MA_Q_T_VASC === 'ninguno (score color 1)'
                        ? ' y avasculares'
                        : ` y su grado de vascularización es ${MA_Q_T_VASC === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_Q_T_VASC}`;
                    if (MA_Q_T === 'sí') {
                        report += `<div>Los tabiques son ${MA_Q_T_TIPO}, de grosor ${MA_Q_T_GROSOR} mm${vascularizacion_tabiques}. La formación tiene ${MA_Q_T_N} lóculo/s.</div>`;
                    }
                    let vascularizacion_AS = '';
                    vascularizacion_AS = MA_Q_AS_VASC === 'ninguno (score color 1)'
                        ? 'y es avascular'
                        : `con grado de vascularización ${MA_Q_AS_VASC === 'moderada (score color 3)' ? 'moderado (score color 3)' : MA_Q_AS_VASC}`;
                    if (MA_Q_AS === 'sí') {
                        report += `<div>Contiene ${MA_Q_AS_N} porción/es sólida/s, la mayor de ellas tiene un tamaño de ${MA_Q_AS_M1} x ${MA_Q_AS_M2} x ${MA_Q_AS_M3} mm ${vascularizacion_AS}.</div>`;
                    }
                }
                if (MA_SA === 'sí') {
                    report += `<div>Presenta sombra posterior.</div>`;
                }
                if (MA_PS === 'sí') {
                    report += `<div>Tiene parénquima ovárico sano, de tamaño ${MA_PS_M1} x ${MA_PS_M2} x ${MA_PS_M3} mm.</div>`;
                }
                if (MA_ASC === 'sí') {
                    report += `<div>Presenta ascitis  ${MA_ASC_TIPO}.</div>`;
                }
                if (MA_CARC === 'sí') {
                    report += '<div>Hay carcinomatosis.</div>';
                }
            }
            if (ecoScore.status === ECO_SCORE_STATUS.CALCULATED) {
                report += `<div>${ecoScore.text_score}</div>`;
            }
        }
        return report;
    };

    const fetchQuestionnaire = useCallback(async () => {
        if (!keycloak.token) {
            return;
        }
        if (shouldSelectCenter && !selectedCenter) {
            setData([]);
            setError(null);
            return;
        }
        try {
            setError(null);
            const data = await getCaseEvaluations(
                keycloak.token,
                keycloak,
                selectedCenter,
                "No se pudieron cargar los cuestionarios."
            );
            setData(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al obtener los datos del paciente:", error);
            setData([]);
            setError(error.message || "No se pudieron cargar los cuestionarios.");
        }
    }, [keycloak, selectedCenter, setData, setError, shouldSelectCenter]);

    useEffect(() => {
        if (initialized) {
            fetchQuestionnaire();
        }
    }, [initialized, fetchQuestionnaire]);

    const handleSortRequest = (property) => {
        const isAsc = orderBy === property && orderDirection === 'desc';
        setOrderDirection(isAsc ? 'asc' : 'desc');
        setOrderBy(property);
    };

    const filteredData = data.filter((item) =>
        [
            item.observerInitials,
            item.risk,
            item.histology,
            item.histologyStatus,
            item.histologyDiagnosis,
            item.benignMalignant,
            item.tumorType,
            item.histologySource,
            item.caseDisplayId,
            item.evaluationDisplayId,
            item.studyPatientCode,
            item.careSettingDisplay,
            item.caseStatus,
            item.evaluationStatus,
            item.evaluationType,
            getEvaluationType(item),
            getIdentifier(item),
            getStudyCode(item),
            getCodeStatus(item),
            getCaseStatus(item),
            getEvaluationStatus(item),
            getCenter(item),
            getLaterality(item),
            getCareSetting(item),
            new Date(item.createdAt).toLocaleString()
        ].join(" ").toLowerCase().includes(search.toLowerCase())
    );

    const sortedData = filteredData.sort((a, b) => {
        const getSortValue = (item, property) => {
            if (property === "identifier") return getIdentifier(item);
            if (property === "studyCode") return getStudyCode(item);
            if (property === "codeStatus") return getCodeStatus(item);
            if (property === "caseStatus") return getCaseStatus(item);
            if (property === "evaluationStatus") return getEvaluationStatus(item);
            if (property === "evaluationType") return getEvaluationType(item);
            if (property === "center") return getCenter(item);
            if (property === "laterality") return getLaterality(item);
            return item[property] || "";
        };
        const firstValue = getSortValue(a, orderBy);
        const secondValue = getSortValue(b, orderBy);
        if (orderDirection === 'asc') {
            return firstValue < secondValue ? -1 : 1;
        } else {
            return firstValue > secondValue ? -1 : 1;
        }
    });

    const histopathologyActionRowsByCase = new Map();
    sortedData.forEach((item) => {
        if (!item.caseId) return;
        const current = histopathologyActionRowsByCase.get(item.caseId);
        if (!current || item.primaryEvaluation === true) {
            histopathologyActionRowsByCase.set(item.caseId, getRowActionKey(item));
        }
    });
    const shouldShowHistopathologyAction = (item) => (
        canManageHistopathology(item) &&
        isHistologyApplicable(item) &&
        item.caseId &&
        histopathologyActionRowsByCase.get(item.caseId) === getRowActionKey(item)
    );
    const shouldShowSharedHistologyText = (item) => (
        canManageHistopathology(item) &&
        isHistologyApplicable(item) &&
        item.caseId &&
        histopathologyActionRowsByCase.has(item.caseId) &&
        histopathologyActionRowsByCase.get(item.caseId) !== getRowActionKey(item)
    );
    const getHistologyChipProps = (item) => {
        if (!isHistologyApplicable(item)) {
            return { label: 'No procede', sx: { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' } };
        }
        if (shouldShowSharedHistologyText(item)) {
            return { label: 'Compartida con caso', sx: { backgroundColor: '#EAF1F6', color: '#1E3A5F', borderColor: '#b4cfe0' } };
        }
        const s = item.histologyStatus;
        if (s === 'AVAILABLE') {
            return { label: 'Histología registrada', sx: { backgroundColor: '#e6f4ea', color: '#1a4726', borderColor: '#a8d5b5' } };
        }
        if (s === 'NOT_APPLICABLE') {
            return { label: 'No procede', sx: { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' } };
        }
        if (s === 'UNKNOWN') {
            return { label: 'No disponible', sx: { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' } };
        }
        return { label: 'Histología pendiente', sx: { backgroundColor: '#fff8e1', color: '#7a4800', borderColor: '#fce48a' } };
    };

    const closeEvaluationModal = () => {
        setOpenModal(false);
        setSelectedEvaluationItem(null);
        closeStatusDialog();
    };

    const handleRowClick = async (item) => {
        try {
            const questionnaireResponse = await fetchQuestionnaireResponseByFhirId(item.questionnaireResponseFhirId);
            setSelectedQuestionnaire(questionnaireResponse);
            setSelectedEvaluationItem(item);
            setOpenModal(true);
        } catch (error) {
            console.error("Error al obtener el cuestionario:", error);
        }
    };

    const handleConfirmStatusChange = async () => {
        if (!pendingStatusAction?.item?.caseId) {
            return;
        }
        const trimmedReason = String(statusReason || '').trim();
        if (!trimmedReason) {
            return;
        }

        try {
            setStatusActionSaving(true);
            setStatusActionError('');
            let response;
            if (pendingStatusAction.scope === 'case') {
                response = await updateCaseStatus(keycloak.token, pendingStatusAction.item.caseId, {
                    targetStatus: pendingStatusAction.targetStatus,
                    reason: trimmedReason,
                });
                setSelectedEvaluationItem((current) => current ? { ...current, caseStatus: response.newStatus } : current);
            } else {
                response = await updateEvaluationStatus(
                    keycloak.token,
                    pendingStatusAction.item.caseId,
                    pendingStatusAction.item.evaluationId,
                    {
                        targetStatus: pendingStatusAction.targetStatus,
                        reason: trimmedReason,
                    }
                );
                setSelectedEvaluationItem((current) => current ? { ...current, evaluationStatus: response.newStatus } : current);
            }
            closeStatusDialog();
            await fetchQuestionnaire();
        } catch (error) {
            setStatusActionError(error.message || CASE_STATUS_ERROR_MESSAGES.network);
        } finally {
            setStatusActionSaving(false);
        }
    };

    const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const visibleScopeLabel = isGlobalView
        ? "Vista global"
        : selectedCenter
            ? `Centro ${selectedCenter}`
            : "Centro pendiente";

    return (
        <Box sx={{ px: 0, py: 0 }}>
            {/* Encabezado institucional */}
            <StudyPageHeader
                title="Casos y evaluaciones"
                subtitle="Consulta de casos registrados, evaluaciones primarias/secundarias, ECO-SCORE e histopatología asociada al estudio."
                visibleScopeLabel={visibleScopeLabel}
                roleLabel={roleLabel}
                centersLabel={centersLabel}
                recordCount={filteredData.length}
                onInfoClick={() => setInfoOpen(true)}
            />

            {/* Dialog Información de la vista */}
            <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, color: "#1F2933", pr: 6, pb: 1.5 }}>
                    Información de la vista
                    <IconButton onClick={() => setInfoOpen(false)} size="small" aria-label="Cerrar" sx={{ position: "absolute", right: 12, top: 12, color: "#52616B" }}>
                        <Close fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ px: 2.5, py: 1.5 }}>
                    <Stack spacing={0}>
                        {[
                            ["Casos visibles", isGlobalView ? "Todos los centros (vista global)" : `Centros: ${centersLabel}`],
                            ["Evaluación primaria", "Primera evaluación ecográfica registrada para el caso."],
                            ["Evaluación secundaria", "Evaluación adicional sobre el mismo caso (segundo observador)."],
                            ["Código pendiente", "Estado legacy o incidencia; los nuevos registros deberían recibir código automáticamente."],
                            ["Código asignado", "El caso tiene código de estudio asignado automáticamente por centro y participante."],
                            ["Estado abierto", "Caso activo en seguimiento clínico."],
                            ["Evaluación completada", "El formulario ecográfico del caso está registrado."],
                            ["Histopatología", "Se registra desde este listado, asociada al caso. Solo coordinadores de centro autorizados."],
                            ["Pseudonimización", "Los datos mostrados no incluyen identificativos del paciente."],
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

            {shouldSelectCenter && (
                <FormControl sx={{ minWidth: 220, mb: 2 }}>
                    <InputLabel id="responses-center-label">Centro</InputLabel>
                    <Select
                        labelId="responses-center-label"
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

            {canSearchCasesByNhc && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                    <Button
                        variant="outlined"
                        onClick={openCaseSearchModal}
                        startIcon={<SearchIcon />}
                        sx={SECONDARY_BTN_SX}
                    >
                        Buscar caso por NHC
                    </Button>
                </Box>
            )}

            {/* Card de búsqueda */}
            <Paper className="clinical-search" elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #D9E2EC", borderRadius: 2, backgroundColor: "#FFFFFF" }}>
                <TextField
                    label="Búsqueda"
                    variant="outlined"
                    fullWidth
                    size="small"
                    placeholder="Buscar por código de estudio, caso, evaluación, centro, lateralidad, ámbito, tipo o ecografista…"
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ color: "#52616B", mr: 1, fontSize: "1.1rem" }} />,
                    }}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </Paper>

            {/* Card de tabla */}
            <Paper className="clinical-table" elevation={0} sx={{ border: "1px solid #D9E2EC", borderRadius: 2, backgroundColor: "#FFFFFF", overflow: "hidden" }}>
                <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {/* 1. Código de estudio */}
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'studyCode'} direction={orderDirection} onClick={() => handleSortRequest('studyCode')} sx={SORT_LABEL_SX}>
                                        Código de estudio
                                    </TableSortLabel>
                                </TableCell>
                                {/* 2. Caso / Evaluación */}
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'identifier'} direction={orderDirection} onClick={() => handleSortRequest('identifier')} sx={SORT_LABEL_SX}>
                                        Caso / Evaluación
                                    </TableSortLabel>
                                </TableCell>
                                {/* 3. Tipo */}
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'evaluationType'} direction={orderDirection} onClick={() => handleSortRequest('evaluationType')} sx={SORT_LABEL_SX}>
                                        Tipo
                                    </TableSortLabel>
                                </TableCell>
                                {/* 4. Centro / Ámbito */}
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'center'} direction={orderDirection} onClick={() => handleSortRequest('center')} sx={SORT_LABEL_SX}>
                                        Centro / Ámbito
                                    </TableSortLabel>
                                </TableCell>
                                {/* 5. Lesión */}
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'laterality'} direction={orderDirection} onClick={() => handleSortRequest('laterality')} sx={SORT_LABEL_SX}>
                                        Lesión
                                    </TableSortLabel>
                                </TableCell>
                                {/* 6. Estado (agrupado: código + caso + evaluación) */}
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'caseStatus'} direction={orderDirection} onClick={() => handleSortRequest('caseStatus')} sx={SORT_LABEL_SX}>
                                        Estado
                                    </TableSortLabel>
                                </TableCell>
                                {/* 7. Riesgo / Histología */}
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'risk'} direction={orderDirection} onClick={() => handleSortRequest('risk')} sx={SORT_LABEL_SX}>
                                        Riesgo / Histología
                                    </TableSortLabel>
                                </TableCell>
                                {/* 8. Ecografista / Fecha */}
                                <TableCell sx={TH_SX}>
                                    <TableSortLabel active={orderBy === 'createdAt'} direction={orderDirection} onClick={() => handleSortRequest('createdAt')} sx={SORT_LABEL_SX}>
                                        Fecha
                                    </TableSortLabel>
                                </TableCell>
                                {/* 9. Acciones */}
                                <TableCell sx={{ ...TH_SX, textAlign: "right" }}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedData.length === 0 && (
                                <TableRow>
                                    <TableCell className="clinical-empty-state" colSpan={9}>
                                        No hay casos o evaluaciones para los criterios seleccionados.
                                    </TableCell>
                                </TableRow>
                            )}
                            {paginatedData.map((item, index) => {
                                const codeLabel = getCodeStatus(item);
                                const caseLabel = getCaseStatus(item);
                                const evalLabel = getEvaluationStatus(item);
                                const riskDisplay = formatRiskDisplay(item);
                                const histologyChip = getHistologyChipProps(item);

                                return (
                                    <TableRow
                                        key={index}
                                        hover
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': { backgroundColor: '#F5F8FC' },
                                            '&:last-child td': { borderBottom: 0 },
                                        }}
                                    >
                                        {/* Código de estudio */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography className="clinical-identifier" variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2933', lineHeight: 1.3 }}>
                                                {getStudyCode(item) || '—'}
                                            </Typography>
                                        </TableCell>

                                        {/* Caso / Evaluación */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography className="clinical-identifier" variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2933', lineHeight: 1.3 }}>
                                                {item.caseDisplayId || getIdentifier(item) || '—'}
                                            </Typography>
                                            {item.evaluationDisplayId && (
                                                <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#52616B', lineHeight: 1.2, display: 'block' }}>
                                                    {item.evaluationDisplayId}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* Tipo */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            {(() => {
                                                const typeLabel = getEvaluationType(item);
                                                if (!typeLabel || typeLabel === '—') return <Typography variant="caption" sx={{ color: '#52616B' }}>—</Typography>;
                                                const isPrimary = typeLabel === 'Primaria';
                                                return (
                                                    <Chip
                                                        label={typeLabel}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{
                                                            height: 22,
                                                            fontSize: '0.72rem',
                                                            fontWeight: 600,
                                                            backgroundColor: isPrimary ? '#EAF1F6' : '#F3F4F6',
                                                            color: isPrimary ? '#1E3A5F' : '#374151',
                                                            borderColor: isPrimary ? '#b4cfe0' : '#d1d5db',
                                                        }}
                                                    />
                                                );
                                            })()}
                                        </TableCell>

                                        {/* Centro / Ámbito */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2933', lineHeight: 1.3 }}>
                                                {getCenter(item)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#52616B', lineHeight: 1.2, display: 'block' }}>
                                                {getCareSetting(item)}
                                            </Typography>
                                        </TableCell>

                                        {/* Lesión */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#1F2933', lineHeight: 1.3 }}>
                                                {[getLaterality(item), item.anatomicalStructureDisplay].filter(Boolean).join(' · ') || '—'}
                                            </Typography>
                                        </TableCell>

                                        {/* Estado (agrupado) */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Stack spacing={0.5} alignItems="flex-start">
                                                {[codeLabel, caseLabel, evalLabel].map((label, i) =>
                                                    label && label !== '—' ? (
                                                        <Chip
                                                            key={i}
                                                            label={label}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 600,
                                                                ...getStatusChipSx(label),
                                                            }}
                                                        />
                                                    ) : null
                                                )}
                                            </Stack>
                                        </TableCell>

                                        {/* Riesgo / Histología */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2933', lineHeight: 1.3 }}>
                                                {riskDisplay}
                                            </Typography>
                                            <Chip
                                                label={histologyChip.label}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    mt: 0.5,
                                                    ...histologyChip.sx,
                                                }}
                                            />
                                        </TableCell>

                                        {/* Ecografista / Fecha */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#1F2933', lineHeight: 1.3 }}>
                                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                                            </Typography>
                                            {item.observerInitials && (
                                                <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#52616B', lineHeight: 1.2, display: 'block' }}>
                                                    {item.observerInitials}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* Acciones */}
                                        <TableCell sx={{ py: 1, px: 1.5, verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                <Tooltip title="Ver detalle de la evaluación">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => handleRowClick(item)}
                                                        sx={ACTION_BTN_SX}
                                                    >
                                                        Ver
                                                    </Button>
                                                </Tooltip>
                                                {shouldShowHistopathologyAction(item) && (
                                                    <Tooltip title={getHistopathologyActionTooltip(item)}>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => openHistologyModal(item)}
                                                            sx={ACTION_BTN_SX}
                                                        >
                                                            {getHistopathologyActionLabel()}
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                {/* Paginación integrada en la card */}
                <Box sx={{ borderTop: "1px solid #D9E2EC" }}>
                    <TablePagination
                        component="div"
                        count={filteredData.length}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[5, 10, 25]}
                        onPageChange={(event, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(event) => {
                            setRowsPerPage(parseInt(event.target.value, 10));
                            setPage(0);
                        }}
                        sx={{ fontSize: '0.8rem' }}
                    />
                </Box>
            </Paper>

            <Dialog
                open={caseSearchOpen}
                onClose={closeCaseSearchModal}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: DIALOG_PAPER_SX }}
            >
                <DialogTitle sx={DIALOG_TITLE_SX}>
                    <Box>
                        <Typography component="span" sx={{ display: 'block', fontWeight: 800, color: '#1F2933', fontSize: '1.05rem' }}>
                            Buscar caso para histopatología
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#52616B', fontWeight: 500, mt: 0.5, maxWidth: 680 }}>
                            Localice los casos asociados a una paciente para completar o revisar la información histopatológica.
                        </Typography>
                    </Box>

                    {histologyForm.status === 'NOT_APPLICABLE' && histologyForm.surgeryPerformed === 'YES' && (
                        <Alert severity="warning" sx={{ mb: 3 }}>
                            Se ha indicado cirugía con histopatología no aplicable. Revise el estado antes de guardar.
                        </Alert>
                    )}
                    <IconButton
                        onClick={closeCaseSearchModal}
                        size="small"
                        aria-label="Cerrar"
                        sx={{ position: 'absolute', right: 12, top: 12, color: '#52616B' }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={DIALOG_CONTENT_SX}>
                    <Stack spacing={2}>
                        <Alert
                            severity="info"
                            sx={{
                                border: '1px solid #BFD7EA',
                                backgroundColor: '#F0F7FC',
                                color: '#1E3A5F',
                                '& .MuiAlert-icon': { color: '#2F5D7C' },
                            }}
                        >
                            El NHC se utilizará únicamente para localizar los casos asociados a la paciente. No se almacenará, no se mostrará y no se incluirá en exportaciones.
                        </Alert>
                        <Box sx={CASE_SEARCH_SECTION_SX}>
                            <Typography sx={SECTION_LABEL_SX}>Datos de búsqueda</Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel id="case-search-center-label">Centro</InputLabel>
                                    <Select
                                        labelId="case-search-center-label"
                                        label="Centro"
                                        value={caseSearchForm.centerId}
                                        onChange={handleCaseSearchFieldChange('centerId')}
                                    >
                                        {allowedCenters.map((center) => (
                                            <MenuItem key={center} value={center}>{center}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="NHC"
                                    placeholder="Introduzca NHC"
                                    value={caseSearchForm.nhc}
                                    onChange={handleCaseSearchFieldChange('nhc')}
                                    size="small"
                                    fullWidth
                                    autoComplete="off"
                                />
                                <Button
                                    variant={caseSearchResult ? 'outlined' : 'contained'}
                                    onClick={handleSearchCasesByNhc}
                                    disabled={caseSearchLoading || !caseSearchForm.centerId || !caseSearchForm.nhc.trim()}
                                    data-testid={caseSearchResult ? 'case-search-new-search-button' : 'case-search-submit-button'}
                                    sx={{
                                        ...(caseSearchResult ? CASE_SEARCH_SECONDARY_BTN_SX : CASE_SEARCH_PRIMARY_BTN_SX),
                                        minWidth: { xs: '100%', sm: 120 },
                                        height: 40,
                                    }}
                                >
                                    {caseSearchResult ? 'Nueva búsqueda' : 'Buscar'}
                                </Button>
                            </Stack>
                        </Box>
                        {caseSearchError && (
                            <Alert severity="warning">
                                No se pudo completar la búsqueda. Revise los datos introducidos o inténtelo de nuevo.
                            </Alert>
                        )}
                        {caseSearchResult && (
                            <Box sx={{ ...CASE_SEARCH_SECTION_SX, overflow: 'hidden' }}>
                                <Box sx={{ mb: 1.5 }}>
                                    <Typography sx={SECTION_LABEL_SX}>Resultado de la búsqueda</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#1F2933' }}>
                                        {caseSearchResult.numberOfCases === 1
                                            ? '1 caso encontrado'
                                            : `${caseSearchResult.numberOfCases} casos encontrados. Seleccione un caso para registrar la histopatología.`}
                                    </Typography>
                                    {caseSearchResult.cases?.length > 0 && (
                                        <Typography variant="body2" sx={{ color: '#52616B', mt: 0.5 }}>
                                            Revise lateralidad, estructura y fecha antes de registrar histología.
                                        </Typography>
                                    )}
                                </Box>
                                {caseSearchResult.cases?.length > 0 ? (
                                    <TableContainer sx={{ border: '1px solid #E1E8F0', borderRadius: 1, overflowX: 'auto' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={CASE_SEARCH_RESULT_TH_SX}>Código de estudio</TableCell>
                                                    <TableCell sx={CASE_SEARCH_RESULT_TH_SX}>Caso</TableCell>
                                                    <TableCell sx={CASE_SEARCH_RESULT_TH_SX}>Lesión</TableCell>
                                                    <TableCell sx={CASE_SEARCH_RESULT_TH_SX}>Ámbito</TableCell>
                                                    <TableCell sx={CASE_SEARCH_RESULT_TH_SX}>Fecha</TableCell>
                                                    <TableCell sx={CASE_SEARCH_RESULT_TH_SX}>Histología</TableCell>
                                                    <TableCell sx={CASE_SEARCH_RESULT_TH_SX}>Evaluaciones</TableCell>
                                                    <TableCell sx={CASE_SEARCH_RESULT_TH_SX} align="right">Acción</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {caseSearchResult.cases.map((item) => {
                                                    const selected = String(selectedSearchCaseId) === String(item.caseId);
                                                    const histologyChip = getHistologyChipProps(toHistologyCaseFromSearch(item));
                                                    return (
                                                        <TableRow
                                                            key={item.caseId}
                                                            hover
                                                            selected={selected}
                                                            onClick={() => setSelectedSearchCaseId(String(item.caseId))}
                                                            sx={{
                                                                cursor: 'pointer',
                                                                backgroundColor: selected ? '#F0F7FC' : 'inherit',
                                                                boxShadow: selected ? 'inset 3px 0 0 #2F5D7C' : 'none',
                                                                '& td': { py: 1.15, px: 1.5, borderBottomColor: '#EEF2F6' },
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <Chip
                                                                    label={caseSearchResult.studyPatientCode || 'Sin código'}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{ fontSize: '0.72rem', borderColor: '#BFD7EA', color: '#1E3A5F', backgroundColor: '#F8FBFD' }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>{item.caseDisplayId || '—'}</TableCell>
                                                            <TableCell>{[item.lateralityDisplay, item.anatomicalStructureDisplay].filter(Boolean).join(' · ') || '—'}</TableCell>
                                                            <TableCell>{item.careSettingDisplay || getCareSettingDisplay(item.careSettingCode)}</TableCell>
                                                            <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={histologyChip.label === 'Compartida con caso' ? 'Histología disponible en otro caso' : histologyChip.label}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{ fontSize: '0.72rem', ...histologyChip.sx }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>{item.numberOfEvaluations ?? 0}</TableCell>
                                                            <TableCell align="right">
                                                                <Button
                                                                    size="small"
                                                                    variant={selected ? 'contained' : 'outlined'}
                                                                    sx={selected ? { ...CASE_SEARCH_PRIMARY_BTN_SX, py: 0.35, px: 1.25 } : ACTION_BTN_SX}
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        setSelectedSearchCaseId(String(item.caseId));
                                                                    }}
                                                                >
                                                                    {selected ? 'Seleccionado' : 'Seleccionar'}
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Box sx={{ px: 2, py: 2, border: '1px dashed #CBD5E1', borderRadius: 1, backgroundColor: '#F8FAFC' }}>
                                        <Typography variant="body2" sx={{ color: '#52616B', fontWeight: 600 }}>
                                            No se encontraron casos asociados al NHC introducido en este centro.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={DIALOG_ACTIONS_SX}>
                    <Button
                        variant="outlined"
                        onClick={closeCaseSearchModal}
                        disabled={caseSearchLoading}
                        data-testid="case-search-cancel-button"
                        sx={CASE_SEARCH_NEUTRAL_BTN_SX}
                    >
                        Cancelar
                    </Button>
                    {!caseSearchResult && (
                        <Button
                            variant="contained"
                            onClick={handleSearchCasesByNhc}
                            disabled={caseSearchLoading || !caseSearchForm.centerId || !caseSearchForm.nhc.trim()}
                            data-testid="case-search-footer-submit-button"
                            sx={CASE_SEARCH_PRIMARY_BTN_SX}
                        >
                            Buscar
                        </Button>
                    )}
                    {caseSearchResult?.cases?.length > 0 && (
                        <Button
                            variant="contained"
                            onClick={handleOpenHistologyFromSearch}
                            disabled={!getSelectedSearchCase() || !canManageHistopathology(toHistologyCaseFromSearch(getSelectedSearchCase()))}
                            data-testid="case-search-register-histology-button"
                            sx={CASE_SEARCH_PRIMARY_BTN_SX}
                        >
                            Registrar histología
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Dialog: resumen de evaluación ecográfica */}
            <Dialog
                className="clinical-dialog"
                open={openModal}
                onClose={closeEvaluationModal}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: DIALOG_PAPER_SX }}
            >
                <DialogTitle sx={DIALOG_TITLE_SX}>
                    Resumen de evaluación ecográfica
                    <IconButton
                        onClick={closeEvaluationModal}
                        size="small"
                        aria-label="Cerrar"
                        sx={{ position: 'absolute', right: 12, top: 12, color: '#52616B' }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                    {selectedEvaluationItem && (
                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                            {selectedEvaluationItem.caseDisplayId && (
                                <Chip
                                    label={`Caso ${selectedEvaluationItem.caseDisplayId}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.72rem', borderColor: '#D9E2EC', color: '#52616B' }}
                                />
                            )}
                            {selectedEvaluationItem.evaluationDisplayId && (
                                <Chip
                                    label={selectedEvaluationItem.evaluationDisplayId}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.72rem', borderColor: '#D9E2EC', color: '#52616B' }}
                                />
                            )}
                            {getEvaluationType(selectedEvaluationItem) && getEvaluationType(selectedEvaluationItem) !== '—' && (
                                <Chip
                                    label={getEvaluationType(selectedEvaluationItem)}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.72rem', borderColor: '#b4cfe0', color: '#1E3A5F', backgroundColor: '#EAF1F6' }}
                                />
                            )}
                            {getCenter(selectedEvaluationItem) && getCenter(selectedEvaluationItem) !== '—' && (
                                <Chip
                                    label={getCenter(selectedEvaluationItem)}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.72rem', borderColor: '#D9E2EC', color: '#52616B' }}
                                />
                            )}
                        </Stack>
                    )}
                </DialogTitle>
                <DialogContent dividers sx={{ ...DIALOG_CONTENT_SX, maxHeight: '65vh', overflowY: 'auto' }}>
                    {selectedQuestionnaire ? (
                        <>
                            <Typography variant="caption" sx={SECTION_LABEL_SX}>
                                Hallazgos ecográficos
                            </Typography>
                            <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1, p: 2, border: '1px solid #EEF2F6' }}>
                                <span className="report" dangerouslySetInnerHTML={{ __html: generateReport() }} />
                            </Box>
                            {selectedEvaluationItem && (
                                <>
                                    <Typography variant="caption" sx={{ ...SECTION_LABEL_SX, mt: 2.5, display: 'block' }}>
                                        Contexto del estudio
                                    </Typography>
                                    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1, p: 2, border: '1px solid #EEF2F6' }}>
                                        <Stack spacing={1.25}>
                                            <Box>
                                                <Typography variant="body2" sx={{ color: '#52616B', fontWeight: 600 }}>
                                                    Participacion en estudio
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#1F2933' }}>
                                                    {selectedEvaluationItem.studyConsentConfirmed ? 'Confirmada' : 'No disponible'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="body2" sx={{ color: '#52616B', fontWeight: 600 }}>
                                                    Version consentimiento
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#1F2933' }}>
                                                    {selectedEvaluationItem.consentVersion || 'No disponible'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="body2" sx={{ color: '#52616B', fontWeight: 600 }}>
                                                    Fecha confirmacion
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#1F2933' }}>
                                                    {formatConsentConfirmationDate(selectedEvaluationItem.consentConfirmedAt)}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </>
                            )}
                            {selectedEvaluationItem && canManageAdministrativeStatus(selectedEvaluationItem) && (
                                <>
                                    <Typography variant="caption" sx={{ ...SECTION_LABEL_SX, mt: 2.5, display: 'block' }}>
                                        Gestión administrativa
                                    </Typography>
                                    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1, p: 2, border: '1px solid #EEF2F6' }}>
                                        <Stack spacing={1.5}>
                                            <Box>
                                                <Typography variant="body2" sx={{ color: '#52616B', fontWeight: 600 }}>
                                                    Estado actual del caso
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#1F2933' }}>
                                                    {formatCaseStatusLabel(selectedEvaluationItem.caseStatus)}
                                                </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                                {getCaseAdministrativeActions(selectedEvaluationItem).map((action) => (
                                                    <Button
                                                        key={action.targetStatus}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={ACTION_BTN_SX}
                                                        onClick={() => openStatusDialog({ ...action, item: selectedEvaluationItem })}
                                                    >
                                                        {action.label}
                                                    </Button>
                                                ))}
                                            </Stack>
                                            <Box>
                                                <Typography variant="body2" sx={{ color: '#52616B', fontWeight: 600 }}>
                                                    Estado actual de la evaluación
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#1F2933' }}>
                                                    {formatEvaluationStatusLabel(selectedEvaluationItem.evaluationStatus)}
                                                </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                                {getEvaluationAdministrativeActions(selectedEvaluationItem).map((action) => (
                                                    <Button
                                                        key={action.targetStatus}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={ACTION_BTN_SX}
                                                        onClick={() => openStatusDialog({ ...action, item: selectedEvaluationItem })}
                                                    >
                                                        {action.label}
                                                    </Button>
                                                ))}
                                            </Stack>
                                        </Stack>
                                    </Box>
                                </>
                            )}
                        </>
                    ) : (
                        <Typography variant="body2" sx={{ color: '#52616B' }}>
                            No hay detalles disponibles.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={DIALOG_ACTIONS_SX}>
                    <Button variant="outlined" onClick={closeEvaluationModal} sx={SECONDARY_BTN_SX}>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={statusDialogOpen}
                onClose={closeStatusDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: DIALOG_PAPER_SX }}
            >
                <DialogTitle sx={DIALOG_TITLE_SX}>
                    Confirmar cambio de estado
                </DialogTitle>
                <DialogContent dividers sx={DIALOG_CONTENT_SX}>
                    <Typography variant="body2" sx={{ color: '#52616B', mb: 2 }}>
                        {pendingStatusAction
                            ? `Va a cambiar el estado del ${pendingStatusAction.scope === 'case' ? 'caso' : 'evaluación'} a '${pendingStatusAction.targetLabel}'. Esta acción quedará auditada.`
                            : ''}
                    </Typography>
                    <TextField
                        label="Motivo del cambio *"
                        value={statusReason}
                        onChange={(event) => setStatusReason(event.target.value)}
                        fullWidth
                        multiline
                        minRows={3}
                        disabled={statusActionSaving}
                    />
                    {statusActionError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {statusActionError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={DIALOG_ACTIONS_SX}>
                    <Button variant="outlined" onClick={closeStatusDialog} sx={SECONDARY_BTN_SX} disabled={statusActionSaving}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmStatusChange}
                        sx={PRIMARY_BTN_SX}
                        disabled={statusActionSaving || String(statusReason || '').trim().length === 0}
                    >
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: histopatología */}
            <Dialog
                open={histologyModalOpen}
                onClose={closeHistologyModal}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: DIALOG_PAPER_SX }}
            >
                <DialogTitle sx={DIALOG_TITLE_SX}>
                    {hasStructuredHistology(selectedHistologyCase || {})
                        ? 'Actualizar histopatología del caso'
                        : 'Registrar histopatología del caso'}
                    <Typography variant="body2" sx={{ color: '#52616B', fontWeight: 400, fontSize: '0.83rem', mt: 0.25 }}>
                        Actualización del resultado anatomopatológico definitivo.
                    </Typography>
                    {selectedHistologyCase?.caseDisplayId && (
                        <Box sx={{ mt: 1 }}>
                            <Chip
                                label={`Caso ${selectedHistologyCase.caseDisplayId}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.72rem', borderColor: '#D9E2EC', color: '#52616B' }}
                            />
                        </Box>
                    )}
                    <IconButton
                        onClick={closeHistologyModal}
                        size="small"
                        aria-label="Cerrar"
                        sx={{ position: 'absolute', right: 12, top: 12, color: '#52616B' }}
                        disabled={histologySaving}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ ...DIALOG_CONTENT_SX, maxHeight: '70vh', overflowY: 'auto' }}>
                    {histologyError && (
                        <Alert severity="error" sx={{ mb: 2.5 }}>
                            {histologyError}
                        </Alert>
                    )}

                    <Typography variant="caption" sx={SECTION_LABEL_SX}>Cirugía</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel id="histology-status-label">Estado histopatología</InputLabel>
                            <Select
                                labelId="histology-status-label"
                                label="Estado histopatología"
                                value={histologyForm.status}
                                onChange={handleHistologyFieldChange('status')}
                            >
                                <MenuItem value="PENDING">Pendiente</MenuItem>
                                <MenuItem value="AVAILABLE">Disponible</MenuItem>
                                <MenuItem value="NOT_APPLICABLE">No aplicable</MenuItem>
                                <MenuItem value="UNKNOWN">Desconocido</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel id="surgery-performed-label">¿Se ha realizado cirugía?</InputLabel>
                            <Select
                                labelId="surgery-performed-label"
                                label="¿Se ha realizado cirugía?"
                                value={histologyForm.surgeryPerformed}
                                onChange={handleHistologyFieldChange('surgeryPerformed')}
                            >
                                {SURGERY_OPTIONS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Box>

                    {histologyForm.surgeryPerformed === 'NO' && (
                        <Box sx={{ mb: 3 }}>
                            <FormControl fullWidth>
                                <InputLabel id="no-surgery-reason-label">Situación sin cirugía</InputLabel>
                                <Select labelId="no-surgery-reason-label" label="Situación sin cirugía" value={histologyForm.noSurgeryReason} onChange={handleHistologyFieldChange('noSurgeryReason')}>
                                    {NO_SURGERY_REASONS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                                </Select>
                            </FormControl>
                            {histologyForm.noSurgeryReason === 'OTHER' && (
                                <TextField label="Especificar otro motivo" fullWidth sx={{ mt: 2 }} value={histologyForm.noSurgeryReasonOther} onChange={handleHistologyFieldChange('noSurgeryReasonOther')} />
                            )}
                        </Box>
                    )}

                    {histologyForm.surgeryPerformed === 'YES' && (
                        <Box sx={{ mb: 3 }}>
                            <TextField
                                label="Fecha cirugía"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={histologyForm.surgeryDate}
                                onChange={handleHistologyFieldChange('surgeryDate')}
                                sx={{ mb: 2 }}
                            />
                            <Typography variant="caption" sx={SECTION_LABEL_SX}>Procedimientos realizados</Typography>
                            <FormGroup sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5 }}>
                                {SURGICAL_PROCEDURES.map(([value, label]) => (
                                    <FormControlLabel key={value} control={<Checkbox checked={histologyForm.surgicalProcedures.includes(value)} onChange={handleSurgicalProcedureChange(value)} />} label={label} />
                                ))}
                            </FormGroup>
                            {histologyForm.surgicalProcedures.includes('OTHER') && (
                                <TextField label="Especificar otro procedimiento" fullWidth sx={{ mt: 2 }} value={histologyForm.otherSurgicalProcedure} onChange={handleHistologyFieldChange('otherSurgicalProcedure')} />
                            )}
                        </Box>
                    )}

                    {histologyForm.status === 'AVAILABLE' && (
                        <>
                            <Typography variant="caption" sx={SECTION_LABEL_SX}>Resultado anatomopatológico final</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                                <FormControl fullWidth>
                                    <InputLabel id="final-pathology-result-label">Resultado anatomopatológico final</InputLabel>
                                    <Select labelId="final-pathology-result-label" label="Resultado anatomopatológico final" value={histologyForm.finalPathologyResult} onChange={handleHistologyFieldChange('finalPathologyResult')}>
                                        {PATHOLOGY_RESULTS.filter(([value]) => value !== 'PENDING').map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth disabled={histologyForm.finalPathologyResult === 'PENDING'}>
                                    <InputLabel id="tumor-type-label">Tipo tumoral</InputLabel>
                                    <Select labelId="tumor-type-label" label="Tipo tumoral" value={histologyForm.tumorType} onChange={handleHistologyFieldChange('tumorType')}>
                                        {(TUMOR_TYPES[histologyForm.finalPathologyResult] || []).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField label="Diagnóstico definitivo" fullWidth value={histologyForm.diagnosis} onChange={handleHistologyFieldChange('diagnosis')} />
                                <TextField label="Fecha anatomía patológica" type="date" fullWidth InputLabelProps={{ shrink: true }} value={histologyForm.pathologyDate} onChange={handleHistologyFieldChange('pathologyDate')} />
                                {isOtherTumorType(histologyForm.tumorType) && (
                                    <TextField label="Especificar tipo tumoral" fullWidth value={histologyForm.tumorTypeOther} onChange={handleHistologyFieldChange('tumorTypeOther')} />
                                )}
                            </Box>
                        </>
                    )}

                    {/* Sección 4: Información adicional */}
                    <Typography variant="caption" sx={SECTION_LABEL_SX}>Información adicional</Typography>
                    {histologyForm.status !== 'UNKNOWN' && (
                        <TextField label="Fuente" fullWidth sx={{ mb: 2 }} value={histologyForm.source} onChange={handleHistologyFieldChange('source')} />
                    )}
                    <TextField
                        label="Notas"
                        multiline
                        rows={3}
                        fullWidth
                        value={histologyForm.notes}
                        onChange={handleHistologyFieldChange('notes')}
                    />
                </DialogContent>
                <DialogActions sx={DIALOG_ACTIONS_SX}>
                    <Button
                        variant="outlined"
                        onClick={closeHistologyModal}
                        disabled={histologySaving}
                        sx={SECONDARY_BTN_SX}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveHistology}
                        disabled={histologySaving}
                        sx={PRIMARY_BTN_SX}
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ResponsesScreen;
