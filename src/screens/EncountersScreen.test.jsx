import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const mockEncountersPdfDoc = {
  addImage: jest.fn(),
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  setTextColor: jest.fn(),
  setDrawColor: jest.fn(),
  setFillColor: jest.fn(),
  roundedRect: jest.fn(),
  line: jest.fn(),
  text: jest.fn(),
  splitTextToSize: jest.fn((text) => [text]),
  addPage: jest.fn(),
  autoPrint: jest.fn(),
  output: jest.fn(() => 'blob:url'),
};

jest.mock('jspdf', () => ({
  __esModule: true,
  default: (() => {
    const MockJsPDF = jest.fn(function MockJsPDF() {});
    MockJsPDF.prototype.addImage     = (...args) => mockEncountersPdfDoc.addImage(...args);
    MockJsPDF.prototype.setFont      = (...args) => mockEncountersPdfDoc.setFont(...args);
    MockJsPDF.prototype.setFontSize  = (...args) => mockEncountersPdfDoc.setFontSize(...args);
    MockJsPDF.prototype.setTextColor = (...args) => mockEncountersPdfDoc.setTextColor(...args);
    MockJsPDF.prototype.setDrawColor = (...args) => mockEncountersPdfDoc.setDrawColor(...args);
    MockJsPDF.prototype.setFillColor = (...args) => mockEncountersPdfDoc.setFillColor(...args);
    MockJsPDF.prototype.roundedRect  = (...args) => mockEncountersPdfDoc.roundedRect(...args);
    MockJsPDF.prototype.line         = (...args) => mockEncountersPdfDoc.line(...args);
    MockJsPDF.prototype.text         = (...args) => mockEncountersPdfDoc.text(...args);
    MockJsPDF.prototype.splitTextToSize = (...args) => mockEncountersPdfDoc.splitTextToSize(...args);
    MockJsPDF.prototype.addPage      = (...args) => mockEncountersPdfDoc.addPage(...args);
    MockJsPDF.prototype.autoPrint    = (...args) => mockEncountersPdfDoc.autoPrint(...args);
    MockJsPDF.prototype.output       = (...args) => mockEncountersPdfDoc.output(...args);
    MockJsPDF.prototype.internal     = {
      pageSize: { getHeight: () => 297, getWidth: () => 210 },
    };
    return MockJsPDF;
  })(),
}));

describe('EncountersScreen', () => {
  beforeEach(() => {
    ApiService.mockReset();
    Object.values(mockEncountersPdfDoc).forEach((v) => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
    mockEncountersPdfDoc.splitTextToSize.mockImplementation((text) => [text]);
    mockEncountersPdfDoc.output.mockReturnValue('blob:url');
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

  it('shows updated probability dialog title and buttons when printing a case with mass', async () => {
    const caseRow = {
      caseId: 2,
      evaluationId: 10,
      caseDisplayId: 'H12O-C000002',
      evaluationDisplayId: 'H12O-C000002-E000010',
      evaluationType: 'PRIMARY',
      primaryEvaluation: true,
      centerId: 'H12O',
      codeStatus: 'CODE_ASSIGNED',
      caseStatus: 'OPEN',
      evaluationStatus: 'COMPLETED',
      studyPatientCode: 'SP-200',
      lateralityDisplay: 'Izquierdo',
      careSettingCode: 'INPATIENT',
      careSettingDisplay: 'Hospitalización',
      risk: null,
      histology: null,
      observerInitials: 'XYZ',
      createdAt: '2026-05-31T10:00:00',
      questionnaireResponseFhirId: 102,
    };

    ApiService.mockImplementation((token, method, endpoint) => {
      if (endpoint.includes('/app/cases/evaluations')) {
        return Promise.resolve({ status: 200, json: async () => ([caseRow]) });
      }
      if (endpoint.includes('/app/QuestionnaireResponse/')) {
        return Promise.resolve({
          status: 200,
          json: async () => ({
            item: [
              { linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'Sí' } }] },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    render(<EncountersScreen />);
    await waitFor(() => expect(screen.getByText('H12O-C000002-E000010')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Imprimir informe' }));

    expect(await screen.findByText('Incluir probabilidad en el informe')).toBeInTheDocument();
    expect(screen.getByText('Seleccione si desea que la probabilidad de malignidad calculada se incluya en el informe PDF.')).toBeInTheDocument();
    expect(screen.getByText(/Esta decisión afecta únicamente a la versión del informe/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No incluir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Incluir en informe' })).toBeInTheDocument();
    expect(screen.queryByText('Confirmación')).not.toBeInTheDocument();
    expect(screen.queryByText(/Desea incluir/)).not.toBeInTheDocument();
  });

  it('generates the professional PDF template when No incluir is clicked', async () => {
    const caseRow = {
      caseId: 3,
      evaluationId: 11,
      caseDisplayId: 'HURYC-C000003',
      evaluationDisplayId: 'HURYC-C000003-E000011',
      evaluationType: 'PRIMARY',
      primaryEvaluation: true,
      centerId: 'HURYC',
      codeStatus: 'CODE_ASSIGNED',
      caseStatus: 'OPEN',
      evaluationStatus: 'COMPLETED',
      studyPatientCode: 'HURYC-0003',
      lateralityDisplay: 'Derecho',
      careSettingCode: 'EMERGENCY',
      careSettingDisplay: 'Urgencias',
      risk: null,
      histology: null,
      observerInitials: 'ABC',
      createdAt: '2026-06-01T08:00:00',
      questionnaireResponseFhirId: 103,
    };

    ApiService.mockImplementation((token, method, endpoint) => {
      if (endpoint.includes('/app/cases/evaluations')) {
        return Promise.resolve({ status: 200, json: async () => ([caseRow]) });
      }
      if (endpoint.includes('/app/QuestionnaireResponse/')) {
        return Promise.resolve({
          status: 200,
          json: async () => ({
            item: [
              { linkId: 'PAT_MA',       answer: [{ valueCoding: { display: 'Sí' } }] },
              { linkId: 'HOSPITAL_REF', answer: [{ valueString: 'HURYC' }] },
              { linkId: 'PAT_EDAD',     answer: [{ valueInteger: 50 }] },
              { linkId: 'PAT_IND',      answer: [{ valueString: 'masa pélvica' }] },
              { linkId: 'MA_LADO',      answer: [{ valueCoding: { display: 'Derecho' } }] },
              { linkId: 'MA_ESTRUCTURA', answer: [{ valueCoding: { display: 'Ovario' } }] },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<EncountersScreen />);
    await waitFor(() => expect(screen.getByText('HURYC-C000003-E000011')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Imprimir informe' }));
    await screen.findByText('Incluir probabilidad en el informe');
    await userEvent.click(screen.getByRole('button', { name: 'No incluir' }));

    await waitFor(() => expect(window.open).toHaveBeenCalledWith('blob:url', '_blank'));

    const renderedText = mockEncountersPdfDoc.text.mock.calls.map((c) => String(c[0])).join(' ');
    expect(renderedText).toContain('Informe ecográfico de masa anexial');
    expect(renderedText).toContain('Hospital Universitario Ramón y Cajal');
    expect(renderedText).toContain('Servicio de Ginecología y Obstetricia');
    expect(renderedText).not.toContain('Rio Hortega');
    expect(renderedText).not.toContain('Río Hortega');
    expect(renderedText).not.toContain('nhc');
    expect(renderedText).not.toContain('patientPseudonym');
    expect(renderedText).not.toContain('hash');
    expect(renderedText).not.toContain('ECO-SCORE');

    window.open.mockRestore();
  });
});
