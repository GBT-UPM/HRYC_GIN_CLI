import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MainScreen, { buildDashboardCounts } from './MainScreen';
import ApiService from '../services/ApiService';

jest.mock('../services/ApiService', () => jest.fn());
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('MainScreen', () => {
  beforeEach(() => {
    ApiService.mockReset();
  });

  const expectCardCount = (label, expectedCount) => {
    const labelNode = screen.getByText(label);
    expect(labelNode.nextSibling).toHaveTextContent(String(expectedCount));
  };

  it('builds dashboard counts from case evaluations', () => {
    expect(buildDashboardCounts([
      {
        caseId: 1,
        studyPatientCode: 'SP-001',
        questionnaireResponseFhirId: 101,
      },
      {
        caseId: 1,
        studyPatientCode: 'SP-001',
        questionnaireResponseFhirId: 102,
      },
      {
        caseId: 2,
        studyPatientCode: 'SP-002',
        questionnaireResponseFhirId: 103,
      },
    ])).toEqual({
      Patient: 2,
      Encounter: 3,
      QuestionnaireResponse: 3,
      RiskAssessment: 2,
    });
  });

  it('shows registered cases on the dashboard', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 1,
          caseDisplayId: 'HURYC-C000001',
          studyPatientCode: 'SP-001',
          questionnaireResponseFhirId: 101,
        },
        {
          caseId: 1,
          caseDisplayId: 'HURYC-C000001',
          studyPatientCode: 'SP-001',
          questionnaireResponseFhirId: 102,
        },
        {
          caseId: 2,
          caseDisplayId: 'HURYC-C000002',
          studyPatientCode: 'SP-002',
          questionnaireResponseFhirId: 103,
        },
      ]),
    });

    render(
      <MainScreen
        keycloak={{ token: 'token' }}
        practitionerName="Dra. Test"
        isAdmin
      />
    );

    await waitFor(() => {
      expectCardCount('Pacientes Atendidas', 2);
    });

    expectCardCount('Citas Cursadas', 3);
    expectCardCount('Cuestionarios Realizados', 3);
    expectCardCount('Masas Anexiales', 2);
  });
});
