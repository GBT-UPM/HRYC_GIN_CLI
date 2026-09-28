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
    const labelNode = screen.getAllByText(label)[0];
    expect(labelNode.nextSibling).toHaveTextContent(String(expectedCount));
  };

  it('builds dashboard counts from case evaluations', () => {
    expect(buildDashboardCounts([
      {
        caseId: 1,
        studyPatientCode: 'SP-001',
        studyParticipantId: 'PART-A',
        encounterId: 'enc-1',
        hasAdnexalMass: true,
        questionnaireResponseFhirId: 101,
      },
      {
        caseId: 1,
        studyPatientCode: 'SP-001',
        studyParticipantId: 'PART-A',
        encounterId: 'enc-1',
        hasAdnexalMass: true,
        questionnaireResponseFhirId: 102,
      },
      {
        caseId: 2,
        studyPatientCode: 'SP-002',
        studyParticipantId: 'PART-B',
        encounterId: 'enc-2',
        hasAdnexalMass: true,
        questionnaireResponseFhirId: 103,
      },
    ])).toEqual({
      participants: 2,
      encounters: 2,
      ultrasoundRecords: 2,
      adnexalMasses: 2,
    });
  });

  it('no-mass case counts for participants/encounters/records but not adnexal masses', () => {
    expect(buildDashboardCounts([
      {
        caseId: 3,
        studyPatientCode: 'SP-003',
        studyParticipantId: 'PART-C',
        encounterId: 'enc-3',
        hasAdnexalMass: false,
        questionnaireResponseFhirId: 104,
      },
    ])).toEqual({
      participants: 1,
      encounters: 1,
      ultrasoundRecords: 1,
      adnexalMasses: 0,
    });
  });

  it('counts participants uniquely by studyParticipantId regardless of case count', () => {
    expect(buildDashboardCounts([
      { caseId: 10, studyParticipantId: 'PART-X', encounterId: 'enc-a', hasAdnexalMass: true },
      { caseId: 11, studyParticipantId: 'PART-X', encounterId: 'enc-a', hasAdnexalMass: true },
      { caseId: 12, studyParticipantId: 'PART-Y', encounterId: 'enc-b', hasAdnexalMass: false },
    ])).toMatchObject({
      participants: 2,
      encounters: 2,
      ultrasoundRecords: 3,
      adnexalMasses: 2,
    });
  });

  it('shows registered cases on the dashboard', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        participantsCount:      2,
        encountersCount:        2,
        ultrasoundRecordsCount: 2,
        adnexalMassesCount:     2,
      }),
    });

    render(
      <MainScreen
        keycloak={{
          token: 'token',
          tokenParsed: {
            realm_access: { roles: ['ROLE_SITE_COORDINATOR'] },
            allowed_centers: ['HURYC'],
          },
        }}
        practitionerName="Dra. Test"
        isAdmin
      />
    );

    await waitFor(() => {
      expectCardCount('Pacientes incluidas', 2);
    });

    expectCardCount('Encuentros registrados', 2);
    expectCardCount('Registros ecográficos', 2);
    expect(screen.getByText('Acciones principales')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revisar' })).toBeInTheDocument();
    expectCardCount('Masas anexiales detectadas', 2);
    expect(screen.getByRole('button', { name: /información del estudio/i })).toBeInTheDocument();
    expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/study-dashboard/stats?centerId=HURYC', {});
  });

  it('uses global stats endpoint for study coordinators', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ participantsCount: 0, encountersCount: 0, ultrasoundRecordsCount: 0, adnexalMassesCount: 0 }),
    });

    render(
      <MainScreen
        keycloak={{
          token: 'token',
          tokenParsed: {
            realm_access: { roles: ['ROLE_STUDY_COORDINATOR'] },
          },
        }}
        practitionerName="Dra. Test"
        isAdmin
      />
    );

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/study-dashboard/stats', {});
    });

    expect(screen.queryByText('Nuevo cuestionario')).not.toBeInTheDocument();
    expect(screen.getByText('Casos y evaluaciones')).toBeInTheDocument();
    expect(screen.getByText('Citas / encuentros')).toBeInTheDocument();
    expect(screen.getByText('Exportaciones científicas')).toBeInTheDocument();
  });

  it('shows questionnaire registration card for clinicians', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ participantsCount: 0, encountersCount: 0, ultrasoundRecordsCount: 0, adnexalMassesCount: 0 }),
    });

    render(
      <MainScreen
        keycloak={{
          token: 'token',
          tokenParsed: {
            realm_access: { roles: ['ROLE_CLINICIAN'] },
            allowed_centers: ['HURYC'],
          },
        }}
        practitionerName="Dra. Test"
        isAdmin={false}
      />
    );

    expect(await screen.findByText('Nuevo cuestionario')).toBeInTheDocument();
  });

  it('shows questionnaire registration card for site coordinators', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ participantsCount: 0, encountersCount: 0, ultrasoundRecordsCount: 0, adnexalMassesCount: 0 }),
    });

    render(
      <MainScreen
        keycloak={{
          token: 'token',
          tokenParsed: {
            realm_access: { roles: ['ROLE_SITE_COORDINATOR'] },
            allowed_centers: ['HURYC'],
          },
        }}
        practitionerName="Dra. Test"
        isAdmin={false}
      />
    );

    expect(await screen.findByText('Nuevo cuestionario')).toBeInTheDocument();
  });

  it('shows questionnaire registration for mixed study coordinator and clinician users', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ participantsCount: 0, encountersCount: 0, ultrasoundRecordsCount: 0, adnexalMassesCount: 0 }),
    });

    render(
      <MainScreen
        keycloak={{
          token: 'token',
          tokenParsed: {
            realm_access: { roles: ['ROLE_STUDY_COORDINATOR', 'ROLE_CLINICIAN'] },
            allowed_centers: ['HURYC'],
          },
        }}
        practitionerName="Dra. Test"
        isAdmin={false}
      />
    );

    expect(await screen.findByText('Nuevo cuestionario')).toBeInTheDocument();
  });

  it('does not show questionnaire registration for admin-only users', async () => {
    render(
      <MainScreen
        keycloak={{
          token: 'token',
          tokenParsed: {
            realm_access: { roles: ['ROLE_ADMIN'] },
            allowed_centers: ['HURYC'],
          },
        }}
        practitionerName="Dra. Test"
        isAdmin={false}
      />
    );

    expect(await screen.findByText('Usuario sin centro asignado.')).toBeInTheDocument();
    expect(ApiService).not.toHaveBeenCalled();
    expect(screen.queryByText('Nuevo cuestionario')).not.toBeInTheDocument();
    expect(screen.getByText('Casos y evaluaciones')).toBeInTheDocument();
  });

  it('shows missing center message and does not query global endpoint', async () => {
    render(
      <MainScreen
        keycloak={{
          token: 'token',
          tokenParsed: {
            realm_access: { roles: ['ROLE_SITE_COORDINATOR'] },
            allowed_centers: [],
          },
        }}
        practitionerName="Dra. Test"
        isAdmin
      />
    );

    expect(await screen.findByText('Usuario sin centro asignado.')).toBeInTheDocument();
    expect(ApiService).not.toHaveBeenCalled();
  });

  it('shows permissions message on 403 from stats endpoint', async () => {
    ApiService.mockResolvedValueOnce({ status: 403 });

    render(
      <MainScreen
        keycloak={{
          token: 'token',
          tokenParsed: {
            realm_access: { roles: ['ROLE_SITE_COORDINATOR'] },
            allowed_centers: ['HURYC'],
          },
        }}
        practitionerName="Dra. Test"
        isAdmin
      />
    );

    expect(await screen.findByText('No tiene permisos para consultar datos de este centro.')).toBeInTheDocument();
  });
});
