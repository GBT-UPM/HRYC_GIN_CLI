import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EncountersScreen from './EncountersScreen';
import ApiService from '../services/ApiService';

jest.mock('@react-keycloak/web', () => ({
  useKeycloak: () => ({
    keycloak: { token: 'token' },
    initialized: true,
  }),
}));

jest.mock('../services/ApiService', () => jest.fn());
jest.mock('../hooks/useObservationHistologyTemplate', () => ({
  useObservationHistologyTemplate: () => ({
    generateObservation: jest.fn(),
  }),
}));
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
          centerId: 'H12O',
          codeStatus: 'CODE_ASSIGNED',
          studyPatientCode: 'SP-200',
          lateralityDisplay: 'Izquierdo',
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
    expect(screen.getByText('SP-200')).toBeInTheDocument();
    expect(screen.getByLabelText('Imprimir informe')).toBeInTheDocument();
    expect(screen.queryByTestId('EditIcon')).not.toBeInTheDocument();
    expect(screen.queryByText('patientPseudonym')).not.toBeInTheDocument();
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
  });
});
