import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    fireEvent.mouseDown(screen.getByLabelText('Estado histopatología'));
    fireEvent.click(screen.getByText('Disponible'));
    fireEvent.change(screen.getByLabelText('Diagnóstico'), { target: { value: 'Cistoadenoma seroso' } });
    fireEvent.mouseDown(screen.getByLabelText('Benigno / borderline / maligno'));
    fireEvent.click(screen.getByText('Benigno'));
    fireEvent.change(screen.getByLabelText('Tipo tumoral'), { target: { value: 'Serous cystadenoma' } });
    fireEvent.change(screen.getByLabelText('Fecha cirugía'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('Fecha anatomía patológica'), { target: { value: '2026-06-10' } });
    fireEvent.change(screen.getByLabelText('Fuente'), { target: { value: 'Pathology report' } });
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'Texto opcional' } });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'POST', '/app/cases/1/histology', expect.objectContaining({
        status: 'AVAILABLE',
        diagnosis: 'Cistoadenoma seroso',
        benignMalignant: 'BENIGN',
        tumorType: 'Serous cystadenoma',
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

  it('shows permissions message on 403 instead of a silent empty table', async () => {
    ApiService.mockResolvedValueOnce({ status: 403 });

    render(<ResponsesScreen />);

    expect(await screen.findByText('No tiene permisos para consultar datos de este centro.')).toBeInTheDocument();
  });
});
