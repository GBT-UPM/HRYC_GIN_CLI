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
    expect(screen.getByText('Centro')).toBeInTheDocument();
    expect(screen.getByText('Exportación legacy no válida para el dataset científico del estudio.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar casos del estudio (CSV)' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-cases.csv?centerId=HURYC', {});
    });

    fireEvent.click(screen.getByRole('button', { name: 'Descargar evaluaciones del estudio (CSV)' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-evaluations.csv?centerId=HURYC', {});
    });

    const requestedEndpoints = ApiService.mock.calls.map((call) => call[2]);
    expect(requestedEndpoints).not.toContain('/downloadexcel/patients');
    expect(requestedEndpoints).not.toContain('/downloadexcel/downloadExcel');
    expect(requestedEndpoints).not.toContain('/downloadcsv/patients');
    expect(requestedEndpoints).not.toContain('/downloadcsv');
  });

  it('shows global scientific exports for study coordinator', async () => {
    mockKeycloak = buildKeycloak(['ROLE_STUDY_COORDINATOR']);
    ApiService.mockResolvedValueOnce(buildDownloadResponse('study-cases.csv'));

    render(<DownloadScreen />);

    expect(screen.getByText('Global')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar casos del estudio (CSV)' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-cases.csv', {});
    });
  });

  it('does not show scientific exports for clinician users', () => {
    mockKeycloak = buildKeycloak(['ROLE_CLINICIAN'], ['HURYC']);

    render(<DownloadScreen />);

    expect(screen.queryByText('Exportaciones científicas')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar casos del estudio (CSV)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar evaluaciones del estudio (CSV)' })).not.toBeInTheDocument();
    expect(screen.getByText('Las exportaciones científicas del estudio están disponibles para coordinadores de centro y del estudio.')).toBeInTheDocument();
  });
});
