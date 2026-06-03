import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DownloadScreen, { buildScientificExportEndpoint } from './DownloadScreen';
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

const requestedExportEndpoints = () =>
  ApiService.mock.calls
    .map((call) => call[2])
    .filter((endpoint) => endpoint.startsWith('/app/exports/study-'));

const waitForDefaultPreset = async () => {
  await screen.findByText('Dataset principal del estudio');
  await waitFor(() => {
    expect(screen.getByLabelText('Preset de columnas')).toHaveValue('MAIN_STUDY');
  });
};

describe('DownloadScreen', () => {
  beforeEach(() => {
    ApiService.mockReset();
    mockKeycloak = buildKeycloak(['ROLE_SITE_COORDINATOR'], ['HURYC']);
    window.URL.createObjectURL = jest.fn(() => 'blob:download');
    window.URL.revokeObjectURL = jest.fn();
    window.HTMLAnchorElement.prototype.click = jest.fn();
    ApiService.mockImplementation((token, method, endpoint) => {
      if (endpoint === '/app/exports/presets') {
        return Promise.resolve({
          status: 200,
          json: async () => ([
            {
              code: 'MAIN_STUDY',
              label: 'Dataset principal del estudio',
              allowedExportTypes: ['CASES', 'EVALUATIONS'],
            },
            {
              code: 'INTEROBSERVER',
              label: 'Dataset interobservador',
              allowedExportTypes: ['EVALUATIONS'],
            },
          ]),
        });
      }
      if (endpoint === '/app/exports/variables?exportType=CASES') {
        return Promise.resolve({
          status: 200,
          json: async () => ([
            { columnName: 'patient_age', label: 'Edad' },
            { columnName: 'lesion_type', label: 'Tipo de lesión' },
          ]),
        });
      }
      if (endpoint === '/app/exports/variables?exportType=EVALUATIONS') {
        return Promise.resolve({
          status: 200,
          json: async () => ([
            { columnName: 'lesion_type', label: 'Tipo de lesión' },
            { columnName: 'observer_initials_questionnaire', label: 'Siglas explorador' },
          ]),
        });
      }
      return Promise.resolve(buildDownloadResponse('study-export.csv'));
    });
  });

  it('uses scientific endpoints for site coordinator exports and does not call legacy endpoints', async () => {
    render(<DownloadScreen />);

    expect(screen.getByText('Exportaciones científicas')).toBeInTheDocument();
    expect(screen.getByLabelText('Centro')).toBeInTheDocument();
    expect(screen.getByText('Esta sección permite descargar los datos del estudio en formato Excel o CSV para análisis. La exportación no incluye NHC, nombres, pseudónimos internos ni el QuestionnaireResponse completo.')).toBeInTheDocument();
    expect(screen.getByText('Una fila por masa/caso. Recomendado para el análisis principal del estudio.')).toBeInTheDocument();
    expect(screen.getByText('Una fila por evaluación ecográfica. Útil para análisis interobservador.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Columnas dataset por casos')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Estado del código')).not.toBeInTheDocument();

    await waitForDefaultPreset();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel por casos' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-cases.xlsx?centerId=HURYC&preset=MAIN_STUDY', {});
    });

    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel por evaluaciones/interobservador' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-evaluations.xlsx?centerId=HURYC&preset=MAIN_STUDY', {});
    });

    fireEvent.click(screen.getByRole('button', { name: 'Descargar CSV por casos' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-cases.csv?centerId=HURYC&preset=MAIN_STUDY', {});
    });

    expect(screen.queryByText('Descargar cuestionarios legacy')).not.toBeInTheDocument();
    expect(screen.queryByText('Descargar pacientes legacy')).not.toBeInTheDocument();
    const requestedEndpoints = ApiService.mock.calls.map((call) => call[2]);
    expect(requestedEndpoints).not.toContain('/downloadexcel/patients');
    expect(requestedEndpoints).not.toContain('/downloadexcel/downloadExcel');
    expect(requestedEndpoints).not.toContain('/downloadcsv/patients');
    expect(requestedEndpoints).not.toContain('/downloadcsv');
  });

  it('downloads global cases for study coordinator without centerId or empty filters', async () => {
    mockKeycloak = buildKeycloak(['ROLE_STUDY_COORDINATOR'], ['HURYC']);

    render(<DownloadScreen />);

    expect(screen.getAllByText('Todos los centros').length).toBeGreaterThan(0);
    await waitForDefaultPreset();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel por casos' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-cases.xlsx?preset=MAIN_STUDY', {});
    });

    const endpoint = requestedExportEndpoints()[0];
    expect(endpoint).not.toContain('centerId=');
    expect(endpoint).not.toContain('centerId=GLOBAL');
    expect(endpoint).not.toContain('centerId=ALL');
    expect(endpoint).not.toContain('fromDate=');
    expect(endpoint).not.toContain('toDate=');
    expect(endpoint).not.toContain('codeStatus=');
    expect(endpoint).not.toContain('caseStatus=');
    expect(endpoint).not.toContain('includePendingCode=');
  });

  it('does not show scientific exports for clinician users', () => {
    mockKeycloak = buildKeycloak(['ROLE_CLINICIAN'], ['HURYC']);

    render(<DownloadScreen />);

    expect(screen.queryByText('Exportaciones científicas')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar Excel por casos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar Excel por evaluaciones/interobservador' })).not.toBeInTheDocument();
    expect(screen.getByText('Las exportaciones científicas del estudio están disponibles para coordinadores de centro y del estudio.')).toBeInTheDocument();
  });

  it('adds date filters to the cases export URL', async () => {
    render(<DownloadScreen />);
    await waitForDefaultPreset();

    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '2026-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel por casos' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith(
        'token',
        'GET',
        '/app/exports/study-cases.xlsx?centerId=HURYC&fromDate=2026-06-01&toDate=2026-06-30&preset=MAIN_STUDY',
        {}
      );
    });
  });

  it('does not send fromDate, toDate or false booleans when the user does not fill them', async () => {
    mockKeycloak = buildKeycloak(['ROLE_STUDY_COORDINATOR']);

    render(<DownloadScreen />);
    await waitForDefaultPreset();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel por evaluaciones/interobservador' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/study-evaluations.xlsx?preset=MAIN_STUDY', {});
    });

    const endpoint = requestedExportEndpoints()[0];
    expect(endpoint).not.toContain('fromDate=');
    expect(endpoint).not.toContain('toDate=');
    expect(endpoint).not.toContain('includePendingCode=');
    expect(endpoint).not.toContain('includeExcluded=');
  });

  it('sends includePendingCode only when the checkbox is checked', async () => {
    render(<DownloadScreen />);
    await waitForDefaultPreset();

    fireEvent.click(screen.getByRole('button', { name: /Filtros avanzados/ }));
    fireEvent.click(screen.getByLabelText('Incluir casos pendientes de código'));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel por casos' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith(
        'token',
        'GET',
        '/app/exports/study-cases.xlsx?centerId=HURYC&includePendingCode=true&preset=MAIN_STUDY',
        {}
      );
    });
  });

  it('adds evaluationType to the evaluations export URL', async () => {
    mockKeycloak = buildKeycloak(['ROLE_STUDY_COORDINATOR']);

    render(<DownloadScreen />);
    await waitForDefaultPreset();

    fireEvent.click(screen.getByRole('button', { name: /Filtros avanzados/ }));
    fireEvent.change(screen.getByLabelText('Tipo de evaluación'), { target: { value: 'SECONDARY' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel por evaluaciones/interobservador' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith(
        'token',
        'GET',
        '/app/exports/study-evaluations.xlsx?evaluationType=SECONDARY&preset=MAIN_STUDY',
        {}
      );
    });
  });

  it('loads presets and exportable variables from controlled backend endpoints', async () => {
    render(<DownloadScreen />);

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/presets', {});
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/variables?exportType=CASES', {});
      expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/exports/variables?exportType=EVALUATIONS', {});
    });
  });

  it('sends selected preset without arbitrary columns', async () => {
    render(<DownloadScreen />);

    await waitForDefaultPreset();
    fireEvent.change(screen.getByLabelText('Preset de columnas'), { target: { value: 'MAIN_STUDY' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel por casos' }));

    await waitFor(() => {
      expect(ApiService).toHaveBeenCalledWith(
        'token',
        'GET',
        '/app/exports/study-cases.xlsx?centerId=HURYC&preset=MAIN_STUDY',
        {}
      );
    });
  });

  it('does not show long column lists until the user opens column customization', async () => {
    render(<DownloadScreen />);
    await waitForDefaultPreset();

    expect(screen.queryByLabelText('Columnas dataset por casos')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Columnas dataset por evaluaciones')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Personalizar columnas/ }));

    expect(screen.getByLabelText('Columnas dataset por casos')).toBeInTheDocument();
    expect(screen.getByLabelText('Columnas dataset por evaluaciones')).toBeInTheDocument();
    expect(screen.getByText('Opción avanzada. Solo se muestran variables aprobadas como exportables. No se pueden seleccionar NHC, nombres, pseudónimos internos ni campos sensibles.')).toBeInTheDocument();
  });

  it('shows detailed filters only after opening advanced filters', async () => {
    render(<DownloadScreen />);
    await waitForDefaultPreset();

    expect(screen.queryByLabelText('Estado del código')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tipo de evaluación')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Filtros avanzados/ }));

    expect(screen.getByLabelText('Estado del código')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado del caso')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de evaluación')).toBeInTheDocument();
    expect(screen.getByLabelText('Ámbito asistencial')).toBeInTheDocument();
    expect(screen.getByLabelText('Incluir excluidos / retirados')).toBeInTheDocument();
  });

  it('shows advanced mode when the user selects no preset', async () => {
    render(<DownloadScreen />);
    await waitForDefaultPreset();

    fireEvent.change(screen.getByLabelText('Preset de columnas'), { target: { value: '' } });

    expect(screen.getByText('Modo avanzado activo: revise los filtros y columnas antes de descargar.')).toBeInTheDocument();
  });

  it('builds study coordinator endpoints without GLOBAL, ALL or blank center values', () => {
    expect(buildScientificExportEndpoint({
      path: '/app/exports/study-cases.csv',
      filters: { centerId: '', codeStatus: '', fromDate: '', toDate: '' },
      allowedCenters: ['HURYC'],
      studyCoordinator: true,
      siteCoordinator: false,
    })).toBe('/app/exports/study-cases.csv');

    expect(buildScientificExportEndpoint({
      path: '/app/exports/study-cases.csv',
      filters: { centerId: 'GLOBAL' },
      allowedCenters: ['HURYC'],
      studyCoordinator: true,
      siteCoordinator: false,
    })).toBe('/app/exports/study-cases.csv');

    expect(buildScientificExportEndpoint({
      path: '/app/exports/study-cases.csv',
      filters: { centerId: 'ALL' },
      allowedCenters: ['HURYC'],
      studyCoordinator: true,
      siteCoordinator: false,
    })).toBe('/app/exports/study-cases.csv');
  });

  it('builds endpoints with only real filter values', () => {
    expect(buildScientificExportEndpoint({
      path: '/app/exports/study-evaluations.csv',
      filters: {
        centerId: 'HURYC',
        fromDate: '',
        toDate: undefined,
        codeStatus: 'ALL',
        evaluationType: 'SECONDARY',
        includePendingCode: false,
        includeExcluded: true,
      },
      allowedCenters: [],
      studyCoordinator: true,
      siteCoordinator: false,
    })).toBe('/app/exports/study-evaluations.csv?centerId=HURYC&includeExcluded=true&evaluationType=SECONDARY');
  });

  it('builds endpoints with selected whitelisted column names', () => {
    expect(buildScientificExportEndpoint({
      path: '/app/exports/study-cases.csv',
      filters: {
        centerId: 'HURYC',
        columns: ['patient_age', 'lesion_type'],
      },
      allowedCenters: [],
      studyCoordinator: true,
      siteCoordinator: false,
    })).toBe('/app/exports/study-cases.csv?centerId=HURYC&columns=patient_age%2Clesion_type');
  });
});
