import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EncountersScreen from './EncountersScreen';
import ApiService from '../services/ApiService';

let mockKeycloak;
const searchLabel = 'Buscar por caso, evaluación, código de estudio, centro, lateralidad, ámbito, tipo o ecografista';

jest.mock('@react-keycloak/web', () => ({
  useKeycloak: () => ({
    keycloak: mockKeycloak,
    initialized: true,
  }),
}));

jest.mock('../services/ApiService', () => jest.fn());
jest.mock('jspdf', () => jest.fn().mockImplementation(() => ({
  addImage: jest.fn(),
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  text: jest.fn(),
  splitTextToSize: jest.fn(() => []),
  addPage: jest.fn(),
  autoPrint: jest.fn(),
  output: jest.fn(() => 'blob:url'),
  internal: { pageSize: { getHeight: () => 297 } },
})));

describe('EncountersScreen', () => {
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

  it('shows evaluationDisplayId and assigned code safely', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 2,
          evaluationId: 10,
          caseDisplayId: 'H12O-C000002',
          evaluationDisplayId: 'H12O-C000002-E000010',
          evaluationType: 'SECONDARY',
          primaryEvaluation: false,
          centerId: 'H12O',
          codeStatus: 'CODE_ASSIGNED',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          studyPatientCode: 'SP-200',
          lateralityDisplay: 'Izquierdo',
          careSettingCode: 'INPATIENT',
          careSettingDisplay: 'Hospitalización',
          risk: null,
          histology: 'Benigno',
          observerInitials: 'XYZ',
          createdAt: '2026-05-31T10:00:00',
          questionnaireResponseFhirId: 102,
        },
      ]),
    });

    render(<EncountersScreen />);

    await waitFor(() => {
      expect(screen.getByText('H12O-C000002-E000010')).toBeInTheDocument();
    });

    expect(screen.getByText('Código asignado')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Secundaria')).toBeInTheDocument();
    expect(screen.getByLabelText(searchLabel)).toBeInTheDocument();
    expect(screen.getByText('Estado caso')).toBeInTheDocument();
    expect(screen.getByText('Estado evaluación')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByText('Completada')).toBeInTheDocument();
    expect(screen.getByText('SP-200')).toBeInTheDocument();
    expect(screen.getByText('Hospitalización')).toBeInTheDocument();
    expect(screen.getByLabelText('Imprimir informe')).toBeInTheDocument();
    expect(screen.queryByText('Editar Histología')).not.toBeInTheDocument();
    expect(screen.queryByTestId('EditIcon')).not.toBeInTheDocument();
    expect(screen.queryByText('patientPseudonym')).not.toBeInTheDocument();
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
    expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/cases/evaluations?centerId=HURYC', {});
  });

  it('shows permissions message on 403 instead of a silent empty table', async () => {
    ApiService.mockResolvedValueOnce({ status: 403 });

    render(<EncountersScreen />);

    expect(await screen.findByText('No tiene permisos para consultar datos de este centro.')).toBeInTheDocument();
  });
});
