import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DownloadScreen from './DownloadScreen';
import ApiService from '../services/ApiService';

let mockKeycloak;

jest.mock('@react-keycloak/web', () => ({
  useKeycloak: () => ({
    keycloak: mockKeycloak,
    initialized: true,
  }),
}));

jest.mock('../services/ApiService', () => jest.fn());

const buildKeycloak = (roles, allowedCenters = []) => ({
  token: 'token',
  tokenParsed: {
    realm_access: { roles },
    allowed_centers: allowedCenters,
  },
});

const buildDownloadResponse = (filename = 'study-export.csv') => ({
  status: 200,
  headers: {
    get: () => `attachment; filename="${filename}"`,
  },
  blob: async () => new Blob(['csv']),
});

describe('DownloadScreen', () => {
  beforeEach(() => {
    ApiService.mockReset();
    mockKeycloak = buildKeycloak(['ROLE_SITE_COORDINATOR'], ['HURYC']);
    window.URL.createObjectURL = jest.fn(() => 'blob:download');
    window.URL.revokeObjectURL = jest.fn();
  });

  it('uses scientific endpoints for site coordinator exports and does not call legacy endpoints', async () => {
    ApiService
      .mockResolvedValueOnce(buildDownloadResponse('study-cases.csv'))
      .mockResolvedValueOnce(buildDownloadResponse('study-evaluations.csv'));

    render(<DownloadScreen />);

    expect(screen.getByText('Exportaciones científicas')).toBeInTheDocument();
    expect(screen.getByLabelText('Centro')).toBeInTheDocument();
    expect(screen.getByText('La exportación científica no incluye NHC, nombres, pseudónimos internos ni QuestionnaireResponse completo.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar dataset por casos' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-cases.csv?centerId=HURYC', {});
    });

    fireEvent.click(screen.getByRole('button', { name: 'Descargar dataset por evaluaciones' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-evaluations.csv?centerId=HURYC', {});
    });

    expect(screen.queryByText('Descargar cuestionarios legacy')).not.toBeInTheDocument();
    expect(screen.queryByText('Descargar pacientes legacy')).not.toBeInTheDocument();
  });

  it('shows global scientific exports for study coordinator', async () => {
    mockKeycloak = buildKeycloak(['ROLE_STUDY_COORDINATOR']);
    ApiService.mockResolvedValueOnce(buildDownloadResponse('study-cases.csv'));

    render(<DownloadScreen />);

    expect(screen.getAllByText('Global').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar dataset por casos' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-cases.csv', {});
    });
  });

  it('does not show scientific exports for clinician users', () => {
    mockKeycloak = buildKeycloak(['ROLE_CLINICIAN'], ['HURYC']);

    render(<DownloadScreen />);

    expect(screen.queryByText('Exportaciones científicas')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar dataset por casos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar dataset por evaluaciones' })).not.toBeInTheDocument();
    expect(screen.getByText('Las exportaciones científicas del estudio están disponibles para coordinadores de centro y del estudio.')).toBeInTheDocument();
  });

  it('adds date filters to the cases export URL', async () => {
    ApiService.mockResolvedValueOnce(buildDownloadResponse('study-cases.csv'));

    render(<DownloadScreen />);

    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '2026-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar dataset por casos' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith(
        'token',
        'GET',
        '/app/exports/study-cases.csv?centerId=HURYC&fromDate=2026-06-01&toDate=2026-06-30',
        {}
      );
    });
  });

  it('adds evaluationType to the evaluations export URL', async () => {
    mockKeycloak = buildKeycloak(['ROLE_STUDY_COORDINATOR']);
    ApiService.mockResolvedValueOnce(buildDownloadResponse('study-evaluations.csv'));

    render(<DownloadScreen />);

    fireEvent.change(screen.getByLabelText('Tipo de evaluación'), { target: { value: 'SECONDARY' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar dataset por evaluaciones' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith(
        'token',
        'GET',
        '/app/exports/study-evaluations.csv?evaluationType=SECONDARY',
        {}
      );
    });
  });
});
