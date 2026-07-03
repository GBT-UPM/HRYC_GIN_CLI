import React from 'react';
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import ResponsesScreen from './ResponsesScreen';
import ApiService from '../services/ApiService';

let mockKeycloak;
const searchLabel = 'Búsqueda';

jest.mock('@react-keycloak/web', () => ({
  useKeycloak: () => ({
    keycloak: mockKeycloak,
    initialized: true,
  }),
}));

jest.mock('../services/ApiService', () => jest.fn());

describe('ResponsesScreen', () => {
  beforeEach(() => {
    ApiService.mockReset();
    mockKeycloak = {
      token: 'token',
      tokenParsed: {
        realm_access: { roles: ['ROLE_SITE_COORDINATOR'] },
        allowed_centers: ['HURYC'],
      },
    };
  });

  it('shows evaluationDisplayId and pending code without sensitive fields', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 1,
          evaluationId: 9,
          caseDisplayId: 'HURYC-C000001',
          evaluationDisplayId: 'HURYC-C000001-E000009',
          evaluationType: 'PRIMARY',
          primaryEvaluation: true,
          centerId: 'HURYC',
          codeStatus: 'PENDING_CODE',
          caseStatus: 'ACTIVE',
          evaluationStatus: null,
          studyPatientCode: null,
          lateralityDisplay: 'Derecho',
          careSettingCode: 'OUTPATIENT',
          careSettingDisplay: 'Consulta externa',
          risk: '0.12',
          histology: null,
          observerInitials: 'ABC',
          createdAt: '2026-05-31T09:00:00',
          questionnaireResponseFhirId: 101,
        },
      ]),
    });

    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(screen.getByText('HURYC-C000001-E000009')).toBeInTheDocument();
    });

    expect(screen.getByText('Código pendiente')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Primaria')).toBeInTheDocument();
    expect(screen.getByText('Casos y evaluaciones')).toBeInTheDocument();
    expect(screen.getByLabelText(searchLabel)).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByText('Completada')).toBeInTheDocument();
    expect(screen.getByText('Consulta externa')).toBeInTheDocument();
    expect(screen.getAllByText('Histología pendiente').length).toBeGreaterThan(0);
    expect(screen.queryByText('Editar Histología')).not.toBeInTheDocument();
    expect(screen.queryByTestId('EditIcon')).not.toBeInTheDocument();
    expect(screen.getByText('Histología')).toBeInTheDocument();
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
    expect(screen.queryByText('secret-pseudonym')).not.toBeInTheDocument();
    expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/cases/evaluations?centerId=HURYC', {});
  });

  it('shows secondary evaluations as a soft badge and finds them by search', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 1,
          evaluationId: 9,
          caseDisplayId: 'HURYC-C000001',
          evaluationDisplayId: 'HURYC-C000001-E000009',
          evaluationType: 'PRIMARY',
          primaryEvaluation: true,
          centerId: 'HURYC',
          codeStatus: 'PENDING_CODE',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          studyPatientCode: null,
          lateralityDisplay: 'Derecho',
          careSettingDisplay: 'Consulta externa',
          risk: '0.12',
          histology: null,
          observerInitials: 'ABC',
          createdAt: '2026-05-31T09:00:00',
          questionnaireResponseFhirId: 101,
        },
        {
          caseId: 1,
          evaluationId: 10,
          caseDisplayId: 'HURYC-C000001',
          evaluationDisplayId: 'HURYC-C000001-E000010',
          evaluationType: 'SECONDARY',
          primaryEvaluation: false,
          centerId: 'HURYC',
          codeStatus: 'PENDING_CODE',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          studyPatientCode: null,
          lateralityDisplay: 'Derecho',
          careSettingDisplay: 'Consulta externa',
          risk: '0.13',
          histology: null,
          observerInitials: 'DEF',
          createdAt: '2026-06-01T09:00:00',
          questionnaireResponseFhirId: 102,
        },
      ]),
    });

    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(screen.getByText('HURYC-C000001-E000010')).toBeInTheDocument();
    });

    expect(screen.getByText('Primaria')).toBeInTheDocument();
    const secondaryBadge = screen.getByText('Secundaria');
    expect(secondaryBadge).toBeInTheDocument();
    expect(secondaryBadge.closest('tr')).not.toHaveClass('error');
    expect(secondaryBadge.closest('.MuiChip-root')).not.toHaveClass('MuiChip-colorError');
    expect(screen.getAllByText('Histología')).toHaveLength(1);
    expect(screen.getByText('Compartida con caso')).toBeInTheDocument();

    const searchInput = screen.getByLabelText(searchLabel);

    fireEvent.change(searchInput, { target: { value: 'primaria' } });
    expect(screen.getByText('HURYC-C000001-E000009')).toBeInTheDocument();
    expect(screen.queryByText('HURYC-C000001-E000010')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'PRIMARY' } });
    expect(screen.getByText('HURYC-C000001-E000009')).toBeInTheDocument();
    expect(screen.queryByText('HURYC-C000001-E000010')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'secundaria' } });
    expect(screen.getByText('HURYC-C000001-E000010')).toBeInTheDocument();
    expect(screen.queryByText('HURYC-C000001-E000009')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'SECONDARY' } });
    expect(screen.getByText('HURYC-C000001-E000010')).toBeInTheDocument();
    expect(screen.queryByText('HURYC-C000001-E000009')).not.toBeInTheDocument();
  });

  it('treats no-mass records as histology not applicable and hides the action', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 2,
          evaluationId: 12,
          caseDisplayId: 'HURYC-C000002',
          evaluationDisplayId: 'HURYC-C000002-E000012',
          evaluationType: 'PRIMARY',
          primaryEvaluation: true,
          centerId: 'HURYC',
          codeStatus: 'PENDING_CODE',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          hasAdnexalMass: false,
          lateralityCode: 'NOT_APPLICABLE',
          lateralityDisplay: 'No aplica',
          anatomicalStructureCode: 'NOT_APPLICABLE',
          anatomicalStructureDisplay: 'No aplica',
          careSettingCode: 'EMERGENCY',
          careSettingDisplay: 'Urgencias',
          risk: null,
          histology: null,
          histologyStatus: null,
          observerInitials: 'ABC',
          createdAt: '2026-05-31T09:00:00',
          questionnaireResponseFhirId: 103,
        },
      ]),
    });

    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(screen.getByText('HURYC-C000002-E000012')).toBeInTheDocument();
    });

    expect(screen.getAllByText('No procede').length).toBeGreaterThan(0);
    expect(screen.queryByText('Histología pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Histología')).not.toBeInTheDocument();
    expect(screen.getByText('Ver')).toBeInTheDocument();
  });

  it('falls back to careSettingCode when careSettingDisplay is missing', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 1,
          evaluationId: 9,
          caseDisplayId: 'HURYC-C000001',
          evaluationDisplayId: 'HURYC-C000001-E000009',
          evaluationType: 'PRIMARY',
          primaryEvaluation: true,
          centerId: 'HURYC',
          codeStatus: 'PENDING_CODE',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          careSettingCode: 'EMERGENCY',
          careSettingDisplay: 'Urgencias',
          lateralityDisplay: 'Derecho',
          risk: '0.12',
          histology: null,
          observerInitials: 'ABC',
          createdAt: '2026-05-31T09:00:00',
          questionnaireResponseFhirId: 101,
        },
        {
          caseId: 1,
          evaluationId: 10,
          caseDisplayId: 'HURYC-C000001',
          evaluationDisplayId: 'HURYC-C000001-E000010',
          evaluationType: 'SECONDARY',
          primaryEvaluation: false,
          centerId: 'HURYC',
          codeStatus: 'PENDING_CODE',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          careSettingCode: 'OUTPATIENT',
          careSettingDisplay: '',
          lateralityDisplay: 'Derecho',
          risk: '0.13',
          histology: null,
          observerInitials: 'DEF',
          createdAt: '2026-06-01T09:00:00',
          questionnaireResponseFhirId: 102,
        },
      ]),
    });

    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(screen.getByText('HURYC-C000001-E000010')).toBeInTheDocument();
    });

    expect(screen.getByText('Urgencias')).toBeInTheDocument();
    expect(screen.getByText('Consulta externa')).toBeInTheDocument();
  });

  it('shows ECO-SCORE decimal risk as percentage without multiplying a percentage twice', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 3,
          evaluationId: 13,
          caseDisplayId: 'HURYC-C000003',
          evaluationDisplayId: 'HURYC-C000003-E000013',
          evaluationType: 'SECONDARY',
          primaryEvaluation: false,
          centerId: 'HURYC',
          codeStatus: 'CODE_ASSIGNED',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          hasAdnexalMass: true,
          lateralityDisplay: 'Derecho',
          careSettingDisplay: 'Urgencias',
          risk: '0.4593',
          ecoScoreProbabilityPercent: 45.93,
          histology: null,
          observerInitials: 'ABC',
          createdAt: '2026-06-01T09:00:00',
          questionnaireResponseFhirId: 104,
        },
      ]),
    });

    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(screen.getByText('HURYC-C000003-E000013')).toBeInTheDocument();
    });

    expect(screen.getByText('45.93%')).toBeInTheDocument();
    expect(screen.queryByText('4593.00%')).not.toBeInTheDocument();
  });

  it('shows rounded ECO-SCORE probability in the evaluation summary modal', async () => {
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([
          {
            caseId: 4,
            evaluationId: 14,
            caseDisplayId: 'HURYC-C000004',
            evaluationDisplayId: 'HURYC-C000004-E000014',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            codeStatus: 'CODE_ASSIGNED',
            caseStatus: 'OPEN',
            evaluationStatus: 'COMPLETED',
            hasAdnexalMass: true,
            lateralityDisplay: 'Derecho',
            careSettingDisplay: 'Urgencias',
            risk: '0.9763',
            histology: null,
            observerInitials: 'ABC',
            createdAt: '2026-06-01T09:00:00',
            questionnaireResponseFhirId: 105,
          },
        ]),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          item: [
            { linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'Sí' } }] },
            { linkId: 'MA_TIPO', answer: [{ valueCoding: { display: 'Sólido-quística' } }] },
            { linkId: 'MA_ESTRUCTURA', answer: [{ valueCoding: { display: 'Ovario' } }] },
            { linkId: 'MA_LADO', answer: [{ valueCoding: { display: 'Derecho' } }] },
            { linkId: 'MA_M1', answer: [{ valueDecimal: 10 }] },
            { linkId: 'MA_M2', answer: [{ valueDecimal: 20 }] },
            { linkId: 'MA_M3', answer: [{ valueDecimal: 30 }] },
            { linkId: 'MA_CONTENIDO', answer: [{ valueCoding: { display: 'Líquido' } }] },
            { linkId: 'MA_Q_CONTORNO', answer: [{ valueCoding: { display: 'Irregular' } }] },
            { linkId: 'MA_Q_GROSOR', answer: [{ valueDecimal: 2 }] },
            { linkId: 'MA_Q_VASC', answer: [{ valueCoding: { display: 'Leve (score color 2)' } }] },
            { linkId: 'MA_PAPS', answer: [{ valueCoding: { display: 'Sí' } }] },
            { linkId: 'MA_Q_P', answer: [{ valueInteger: 1 }] },
            { linkId: 'MA_Q_P_M1', answer: [{ valueDecimal: 5 }] },
            { linkId: 'MA_Q_P_M2', answer: [{ valueDecimal: 3 }] },
            { linkId: 'MA_Q_P_CONTORNO', answer: [{ valueCoding: { display: 'Regular' } }] },
            { linkId: 'MA_Q_P_VASC', answer: [{ valueCoding: { display: 'Abundante (score color 4)' } }] },
            { linkId: 'MA_Q_AS', answer: [{ valueCoding: { display: 'Sí' } }] },
            { linkId: 'MA_Q_AS_N', answer: [{ valueInteger: 1 }] },
            { linkId: 'MA_Q_AS_M1', answer: [{ valueDecimal: 4 }] },
            { linkId: 'MA_Q_AS_M2', answer: [{ valueDecimal: 3 }] },
            { linkId: 'MA_Q_AS_M3', answer: [{ valueDecimal: 2 }] },
            { linkId: 'MA_Q_AS_VASC', answer: [{ valueCoding: { display: 'Leve (score color 2)' } }] },
            { linkId: 'MA_SA', answer: [{ valueCoding: { display: 'No' } }] },
          ],
        }),
      });

    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(screen.getByText('HURYC-C000004-E000014')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Ver'));

    await waitFor(() => {
      expect(screen.getByText('Resumen de evaluación ecográfica')).toBeInTheDocument();
    });

    expect(screen.getByText(/La probabilidad de que la masa anexial sea maligna es de 97\.63 %\./)).toBeInTheDocument();
    expect(screen.queryByText(/97\.629/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/4593\.00%/)).not.toBeInTheDocument();
  });

  it('shows study participation metadata in the evaluation summary modal', async () => {
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([
          {
            caseId: 4,
            evaluationId: 14,
            caseDisplayId: 'HURYC-C000004',
            evaluationDisplayId: 'HURYC-C000004-E000014',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            codeStatus: 'CODE_ASSIGNED',
            caseStatus: 'OPEN',
            evaluationStatus: 'COMPLETED',
            hasAdnexalMass: true,
            lateralityDisplay: 'Derecho',
            anatomicalStructureDisplay: 'Ovario',
            studyConsentConfirmed: true,
            consentVersion: 'MIA_STUDY_CONSENT_V1',
            consentConfirmedAt: '2026-06-07T08:30:00',
            createdAt: '2026-06-01T09:00:00',
            questionnaireResponseFhirId: 105,
          },
        ]),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          item: [
            { linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'Sí' } }] },
            { linkId: 'MA_TIPO', answer: [{ valueCoding: { display: 'Sólida' } }] },
            { linkId: 'MA_ESTRUCTURA', answer: [{ valueCoding: { display: 'Ovario' } }] },
            { linkId: 'MA_LADO', answer: [{ valueCoding: { display: 'Derecho' } }] },
            { linkId: 'MA_M1', answer: [{ valueDecimal: 10 }] },
            { linkId: 'MA_M2', answer: [{ valueDecimal: 20 }] },
            { linkId: 'MA_M3', answer: [{ valueDecimal: 30 }] },
            { linkId: 'MA_CONTENIDO', answer: [{ valueCoding: { display: 'Líquido' } }] },
            { linkId: 'MA_SOL_CONTORNO', answer: [{ valueCoding: { display: 'Regular' } }] },
            { linkId: 'MA_SOL_VASC', answer: [{ valueCoding: { display: 'Ninguno (score color 1)' } }] },
          ],
        }),
      });

    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(screen.getByText('HURYC-C000004-E000014')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Ver'));

    await waitFor(() => {
      expect(screen.getByText('Resumen de evaluación ecográfica')).toBeInTheDocument();
    });

    expect(screen.getByText('Participacion en estudio')).toBeInTheDocument();
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Version consentimiento')).toBeInTheDocument();
    expect(screen.getByText('MIA_STUDY_CONSENT_V1')).toBeInTheDocument();
    expect(screen.getByText('Fecha confirmacion')).toBeInTheDocument();
  });

  it('submits histopathology through the controlled case endpoint', async () => {
    ApiService
	      .mockResolvedValueOnce({
	        status: 200,
	        json: async () => ([
	          {
            caseId: 1,
            evaluationId: 9,
            caseDisplayId: 'HURYC-C000001',
            evaluationDisplayId: 'HURYC-C000001-E000009',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            codeStatus: 'PENDING_CODE',
            caseStatus: 'OPEN',
            evaluationStatus: 'COMPLETED',
            studyPatientCode: null,
            lateralityDisplay: 'Derecho',
            careSettingDisplay: 'Consulta externa',
            risk: '0.12',
            histology: 'Pendiente',
            histologyStatus: null,
            observerInitials: 'ABC',
            createdAt: '2026-05-31T09:00:00',
	            questionnaireResponseFhirId: 101,
	          },
	          {
	            caseId: 1,
	            evaluationId: 10,
	            caseDisplayId: 'HURYC-C000001',
	            evaluationDisplayId: 'HURYC-C000001-E000010',
	            evaluationType: 'SECONDARY',
	            primaryEvaluation: false,
	            centerId: 'HURYC',
	            codeStatus: 'PENDING_CODE',
	            caseStatus: 'OPEN',
	            evaluationStatus: 'COMPLETED',
	            studyPatientCode: null,
	            lateralityDisplay: 'Derecho',
	            careSettingDisplay: 'Consulta externa',
	            risk: '0.13',
	            histology: 'Pendiente',
	            histologyStatus: null,
	            observerInitials: 'DEF',
	            createdAt: '2026-06-01T09:00:00',
	            questionnaireResponseFhirId: 102,
	          },
	        ]),
	      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          caseId: 1,
          histologyStatus: 'AVAILABLE',
          histology: 'Benigno - Cistoadenoma seroso',
          histologyDiagnosis: 'Cistoadenoma seroso',
          benignMalignant: 'BENIGN',
        }),
      })
	      .mockResolvedValueOnce({
	        status: 200,
	        json: async () => ([
	          {
            caseId: 1,
            evaluationId: 9,
            caseDisplayId: 'HURYC-C000001',
            evaluationDisplayId: 'HURYC-C000001-E000009',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            codeStatus: 'PENDING_CODE',
            caseStatus: 'OPEN',
            evaluationStatus: 'COMPLETED',
            histology: 'Benigno - Cistoadenoma seroso',
            histologyStatus: 'AVAILABLE',
            histologyDiagnosis: 'Cistoadenoma seroso',
            benignMalignant: 'BENIGN',
            observerInitials: 'ABC',
	            createdAt: '2026-05-31T09:00:00',
	            questionnaireResponseFhirId: 101,
	          },
	          {
	            caseId: 1,
	            evaluationId: 10,
	            caseDisplayId: 'HURYC-C000001',
	            evaluationDisplayId: 'HURYC-C000001-E000010',
	            evaluationType: 'SECONDARY',
	            primaryEvaluation: false,
	            centerId: 'HURYC',
	            codeStatus: 'PENDING_CODE',
	            caseStatus: 'OPEN',
	            evaluationStatus: 'COMPLETED',
	            histology: 'Benigno - Cistoadenoma seroso',
	            histologyStatus: 'AVAILABLE',
	            histologyDiagnosis: 'Cistoadenoma seroso',
	            benignMalignant: 'BENIGN',
	            observerInitials: 'DEF',
	            createdAt: '2026-06-01T09:00:00',
	            questionnaireResponseFhirId: 102,
	          },
	        ]),
	      });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByText('Histología'));
    expect(screen.queryByLabelText('Resultado anatomopatológico final')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Diagnóstico definitivo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Fecha anatomía patológica')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('Estado histopatología'));
    fireEvent.click(screen.getByText('Disponible'));
    expect(screen.getByLabelText('Resultado anatomopatológico final')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('¿Se ha realizado cirugía?'));
    fireEvent.click(screen.getByText('Sí'));
    fireEvent.click(screen.getByLabelText('Quistectomía unilateral'));
    fireEvent.change(screen.getByLabelText('Diagnóstico definitivo'), { target: { value: 'Cistoadenoma seroso' } });
    fireEvent.mouseDown(screen.getByLabelText('Resultado anatomopatológico final'));
    fireEvent.click(screen.getByText('Benigno'));
    fireEvent.mouseDown(screen.getByLabelText('Tipo tumoral'));
    fireEvent.click(screen.getByText('Cistadenoma seroso'));
    fireEvent.change(screen.getByLabelText('Fecha cirugía'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('Fecha anatomía patológica'), { target: { value: '2026-06-10' } });
    fireEvent.change(screen.getByLabelText('Fuente'), { target: { value: 'Pathology report' } });
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'Texto opcional' } });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'POST', '/app/cases/1/histology', expect.objectContaining({
        status: 'AVAILABLE',
        diagnosis: 'Cistoadenoma seroso',
        surgeryPerformed: 'YES',
        surgicalProcedures: ['UNILATERAL_CYSTECTOMY'],
        finalPathologyResult: 'BENIGN',
        tumorType: 'SEROUS_CYSTADENOMA',
        surgeryDate: '2026-06-01',
        pathologyDate: '2026-06-10',
        source: 'Pathology report',
      }));
    });

    expect(ApiService.mock.calls.some((call) => call[2] === '/fhir/Observation')).toBe(false);
    expect(await screen.findByText('Histología registrada')).toBeInTheDocument();
    expect(screen.getByText('Histología')).toBeInTheDocument();
    expect(screen.getByText('Compartida con caso')).toBeInTheDocument();
  });

  it('does not show histopathology write action to clinicians or study coordinators', async () => {
    ApiService.mockResolvedValue({
      status: 200,
      json: async () => ([
        {
          caseId: 1,
          evaluationId: 9,
          caseDisplayId: 'HURYC-C000001',
          evaluationDisplayId: 'HURYC-C000001-E000009',
          evaluationType: 'PRIMARY',
          primaryEvaluation: true,
          centerId: 'HURYC',
          codeStatus: 'PENDING_CODE',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          histology: 'Pendiente',
          observerInitials: 'ABC',
          createdAt: '2026-05-31T09:00:00',
        },
      ]),
    });

    mockKeycloak.tokenParsed.realm_access.roles = ['ROLE_CLINICIAN'];
    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(screen.getByText('HURYC-C000001-E000009')).toBeInTheDocument();
    });
    expect(screen.queryByText('Histología')).not.toBeInTheDocument();

    ApiService.mockClear();
    ApiService.mockResolvedValue({
      status: 200,
      json: async () => ([
        {
          caseId: 1,
          evaluationId: 9,
          caseDisplayId: 'HURYC-C000001',
          evaluationDisplayId: 'HURYC-C000001-E000009',
          evaluationType: 'PRIMARY',
          primaryEvaluation: true,
          centerId: 'HURYC',
          codeStatus: 'PENDING_CODE',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          histology: 'Pendiente',
          observerInitials: 'ABC',
          createdAt: '2026-05-31T09:00:00',
        },
      ]),
    });
    mockKeycloak.tokenParsed.realm_access.roles = ['ROLE_STUDY_COORDINATOR'];
    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(screen.getAllByText('HURYC-C000001-E000009').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Histología')).not.toBeInTheDocument();
  });

  it('shows safe 403 message when histopathology write is rejected', async () => {
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([
          {
            caseId: 1,
            evaluationId: 9,
            caseDisplayId: 'HURYC-C000001',
            evaluationDisplayId: 'HURYC-C000001-E000009',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            codeStatus: 'PENDING_CODE',
            caseStatus: 'OPEN',
            evaluationStatus: 'COMPLETED',
            histology: 'Pendiente',
            observerInitials: 'ABC',
            createdAt: '2026-05-31T09:00:00',
          },
        ]),
      })
      .mockResolvedValueOnce({ ok: false, status: 403 });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByText('Histología'));
    fireEvent.click(screen.getByText('Guardar'));

    expect(await screen.findByText('No tiene permisos para registrar histopatología en este centro.')).toBeInTheDocument();
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
    expect(screen.queryByText('patientPseudonym')).not.toBeInTheDocument();
  });

  it('shows the safe NHC search modal only to authorized coordinators', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([]),
    });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Buscar caso por NHC' }));

    expect(screen.getByText('Buscar caso para histopatología')).toBeInTheDocument();
    expect(screen.getByText('Localice los casos asociados a una paciente para completar o revisar la información histopatológica.')).toBeInTheDocument();
    expect(screen.getByText('El NHC se utilizará únicamente para localizar los casos asociados a la paciente. No se almacenará, no se mostrará y no se incluirá en exportaciones.')).toBeInTheDocument();
    expect(screen.getByText('Datos de búsqueda')).toBeInTheDocument();
    expect(screen.getByTestId('case-search-cancel-button')).toHaveClass('MuiButton-outlined');
    expect(screen.getByTestId('case-search-submit-button')).toHaveClass('MuiButton-contained');
    expect(screen.getByTestId('case-search-footer-submit-button')).toHaveClass('MuiButton-contained');

    ApiService.mockReset();
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([]),
    });
    mockKeycloak.tokenParsed.realm_access.roles = ['ROLE_CLINICIAN'];
    render(<ResponsesScreen />);

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/cases/evaluations?centerId=HURYC', {});
    });
    expect(screen.queryByRole('button', { name: 'Buscar caso por NHC' })).not.toBeInTheDocument();
  });

  it('searches cases by NHC with POST body and clears the NHC after success', async () => {
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          found: true,
          studyParticipantId: 14,
          studyPatientCode: 'HURYC-0001',
          centerId: 'HURYC',
          numberOfCases: 1,
          cases: [
            {
              caseId: 33,
              caseDisplayId: 'HURYC-C000033',
              caseStatus: 'OPEN',
              lateralityDisplay: 'Derecho',
              anatomicalStructureDisplay: 'Ovario',
              careSettingCode: 'EMERGENCY',
              careSettingDisplay: 'Urgencias',
              createdAt: '2026-06-08T10:30:00',
              histologyStatus: 'PENDING',
              histologyDiagnosis: null,
              numberOfEvaluations: 1,
            },
          ],
        }),
      });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Buscar caso por NHC' }));
    fireEvent.change(screen.getByLabelText('NHC'), { target: { value: '123456' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Buscar' })[0]);

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'POST', '/app/cases/search-by-nhc', {
        centerId: 'HURYC',
        nhc: '123456',
      });
    });

    expect(await screen.findByText('HURYC-C000033')).toBeInTheDocument();
    expect(screen.getByText('Resultado de la búsqueda')).toBeInTheDocument();
    expect(screen.getByText('1 caso encontrado')).toBeInTheDocument();
    expect(screen.getByTestId('case-search-new-search-button')).toHaveClass('MuiButton-outlined');
    expect(screen.getByTestId('case-search-new-search-button')).toBeDisabled();
    expect(screen.getByTestId('case-search-register-histology-button')).toHaveClass('MuiButton-contained');
    expect(screen.getByTestId('case-search-register-histology-button')).not.toBeDisabled();
    expect(ApiService.mock.calls[1][2]).not.toContain('123456');
    expect(screen.getByLabelText('NHC')).toHaveValue('');
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
    expect(screen.queryByText('patientPseudonym')).not.toBeInTheDocument();
    expect(screen.queryByText('hash')).not.toBeInTheDocument();
  });

  it('clears NHC on close and does not include it in error messages', async () => {
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([]),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Buscar caso por NHC' }));
    fireEvent.change(screen.getByLabelText('NHC'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Buscar caso para histopatología'));
    fireEvent.click(screen.getByRole('button', { name: 'Buscar caso por NHC' }));

    expect(screen.getByLabelText('NHC')).toHaveValue('');

    fireEvent.change(screen.getByLabelText('NHC'), { target: { value: '123456' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Buscar' })[0]);

    expect(await screen.findByText('No se pudo completar la búsqueda. Revise los datos introducidos o inténtelo de nuevo.')).toBeInTheDocument();
    expect(screen.getByLabelText('NHC')).toHaveValue('');
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
  });

  it('requires selecting one of multiple NHC search results before opening histology for the right case', async () => {
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          found: true,
          studyParticipantId: 14,
          studyPatientCode: 'HURYC-0001',
          centerId: 'HURYC',
          numberOfCases: 2,
          cases: [
            {
              caseId: 33,
              caseDisplayId: 'HURYC-C000033',
              caseStatus: 'OPEN',
              lateralityDisplay: 'Derecho',
              anatomicalStructureDisplay: 'Ovario',
              careSettingCode: 'EMERGENCY',
              careSettingDisplay: 'Urgencias',
              createdAt: '2026-06-08T10:30:00',
              histologyStatus: 'PENDING',
              numberOfEvaluations: 1,
            },
            {
              caseId: 34,
              caseDisplayId: 'HURYC-C000034',
              caseStatus: 'OPEN',
              lateralityDisplay: 'Izquierdo',
              anatomicalStructureDisplay: 'Trompa',
              careSettingCode: 'OUTPATIENT',
              careSettingDisplay: 'Consulta externa',
              createdAt: '2026-06-09T10:30:00',
              histologyStatus: 'PENDING',
              numberOfEvaluations: 2,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          caseId: 34,
          histologyStatus: 'AVAILABLE',
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([]),
      });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Buscar caso por NHC' }));
    fireEvent.change(screen.getByLabelText('NHC'), { target: { value: '123456' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Buscar' })[0]);

    await screen.findByText('HURYC-C000034');
    expect(screen.getByText('2 casos encontrados. Seleccione un caso para registrar la histopatología.')).toBeInTheDocument();
    const registerButton = screen.getByRole('button', { name: 'Registrar histología' });
    expect(registerButton).toHaveClass('MuiButton-contained');
    expect(registerButton).toBeDisabled();

    fireEvent.click(screen.getByText('HURYC-C000034'));
    expect(registerButton).not.toBeDisabled();
    fireEvent.click(registerButton);

    expect(await screen.findByLabelText('Estado histopatología')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'POST', '/app/cases/34/histology', expect.any(Object));
    });
  });

  it('shows permissions message on 403 instead of a silent empty table', async () => {
    ApiService.mockResolvedValueOnce({ status: 403 });

    render(<ResponsesScreen />);

    expect(await screen.findByText('No tiene permisos para consultar datos de este centro.')).toBeInTheDocument();
  });

  it('does not show administrative management for clinicians', async () => {
    mockKeycloak.tokenParsed.realm_access.roles = ['ROLE_CLINICIAN'];
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([
          {
            caseId: 20,
            evaluationId: 21,
            caseDisplayId: 'HURYC-C000020',
            evaluationDisplayId: 'HURYC-C000020-E000021',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            caseStatus: 'OPEN',
            evaluationStatus: 'COMPLETED',
            createdAt: '2026-06-01T09:00:00',
            questionnaireResponseFhirId: 220,
          },
        ]),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ item: [{ linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'No' } }] }] }),
      });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByText('Ver'));

    await waitFor(() => {
      expect(screen.getByText('Resumen de evaluación ecográfica')).toBeInTheDocument();
    });

    expect(screen.queryByText('Gestión administrativa')).not.toBeInTheDocument();
  });

  it('shows administrative actions for site coordinators and requires a reason', async () => {
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([
          {
            caseId: 30,
            evaluationId: 31,
            caseDisplayId: 'HURYC-C000030',
            evaluationDisplayId: 'HURYC-C000030-E000031',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            caseStatus: 'OPEN',
            evaluationStatus: 'COMPLETED',
            createdAt: '2026-06-01T09:00:00',
            questionnaireResponseFhirId: 230,
          },
        ]),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ item: [{ linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'No' } }] }] }),
      });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByText('Ver'));

    await waitFor(() => {
      expect(screen.getByText('Gestión administrativa')).toBeInTheDocument();
    });

    expect(screen.getByText('Excluir caso')).toBeInTheDocument();
    expect(screen.getByText('Retirar caso')).toBeInTheDocument();
    expect(screen.getByText('Bloquear evaluación')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Excluir caso'));

    expect(screen.getByText('Confirmar cambio de estado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('calls the case status endpoint and refreshes the list after excluding a case', async () => {
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([
          {
            caseId: 40,
            evaluationId: 41,
            caseDisplayId: 'HURYC-C000040',
            evaluationDisplayId: 'HURYC-C000040-E000041',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            caseStatus: 'OPEN',
            evaluationStatus: 'COMPLETED',
            createdAt: '2026-06-01T09:00:00',
            questionnaireResponseFhirId: 240,
          },
        ]),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ item: [{ linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'No' } }] }] }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          caseId: 40,
          previousStatus: 'OPEN',
          newStatus: 'EXCLUDED',
          reason: 'Caso excluido por no cumplir criterios.',
          updated: true,
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([
          {
            caseId: 40,
            evaluationId: 41,
            caseDisplayId: 'HURYC-C000040',
            evaluationDisplayId: 'HURYC-C000040-E000041',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            caseStatus: 'EXCLUDED',
            evaluationStatus: 'COMPLETED',
            createdAt: '2026-06-01T09:00:00',
            questionnaireResponseFhirId: 240,
          },
        ]),
      });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByText('Ver'));
    await screen.findByText('Gestión administrativa');
    fireEvent.click(screen.getByText('Excluir caso'));
    fireEvent.change(screen.getByLabelText('Motivo del cambio *'), { target: { value: 'Caso excluido por no cumplir criterios.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith(
        'token',
        'POST',
        '/app/cases/40/status',
        {
          targetStatus: 'EXCLUDED',
          reason: 'Caso excluido por no cumplir criterios.',
        }
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('Excluido').length).toBeGreaterThan(0);
    });
  });

  it('shows a safe 403 message when administrative status change is rejected', async () => {
    ApiService
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ([
          {
            caseId: 50,
            evaluationId: 51,
            caseDisplayId: 'HURYC-C000050',
            evaluationDisplayId: 'HURYC-C000050-E000051',
            evaluationType: 'PRIMARY',
            primaryEvaluation: true,
            centerId: 'HURYC',
            caseStatus: 'OPEN',
            evaluationStatus: 'COMPLETED',
            createdAt: '2026-06-01T09:00:00',
            questionnaireResponseFhirId: 250,
          },
        ]),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ item: [{ linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'No' } }] }] }),
      })
      .mockResolvedValueOnce({ status: 403 });

    render(<ResponsesScreen />);

    fireEvent.click(await screen.findByText('Ver'));
    await screen.findByText('Gestión administrativa');
    fireEvent.click(screen.getByText('Bloquear evaluación'));
    fireEvent.change(screen.getByLabelText('Motivo del cambio *'), { target: { value: 'Bloqueo por revisión administrativa.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('No tiene permisos para cambiar este estado.')).toBeInTheDocument();
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
    expect(screen.queryByText('patientPseudonym')).not.toBeInTheDocument();
    expect(screen.queryByText('hash')).not.toBeInTheDocument();
  });
});
