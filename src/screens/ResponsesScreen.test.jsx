import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ResponsesScreen from './ResponsesScreen';
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

describe('ResponsesScreen', () => {
  beforeEach(() => {
    ApiService.mockReset();
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
          centerId: 'HURYC',
          codeStatus: 'PENDING_CODE',
          studyPatientCode: null,
          lateralityDisplay: 'Derecho',
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
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
    expect(screen.queryByText('secret-pseudonym')).not.toBeInTheDocument();
  });
});
