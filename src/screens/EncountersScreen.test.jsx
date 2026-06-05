import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EncountersScreen from './EncountersScreen';
import ApiService from '../services/ApiService';

let mockKeycloak;
const searchLabel = 'Buscar por código de estudio, fecha, centro, ámbito, lesión o ecografista…';
const calculableEcoScoreItems = [
  { linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'Sí' } }] },
  { linkId: 'MA_Q_CONTORNO', answer: [{ valueCoding: { display: 'Regular' } }] },
  { linkId: 'MA_SA', answer: [{ valueCoding: { display: 'No' } }] },
  { linkId: 'MA_Q_AS', answer: [{ valueCoding: { display: 'No' } }] },
  { linkId: 'MA_PAPS', answer: [{ valueCoding: { display: 'No' } }] },
];

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

  it('shows one encounter row and keeps evaluation details in the expandable section', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 2,
          evaluationId: 10,
          encounterId: 'enc-10',
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
      expect(screen.getByText(/Encuentro enc-10/)).toBeInTheDocument();
    });

    expect(screen.getByText('Código asignado')).toBeInTheDocument();
    expect(screen.getByText('Fecha / encuentro')).toBeInTheDocument();
    expect(screen.getByText('Resumen del encuentro')).toBeInTheDocument();
    expect(screen.getByText('1 masa detectada; 1 evaluación secundaria')).toBeInTheDocument();
    expect(screen.getByText('Izquierdo')).toBeInTheDocument();
    expect(screen.getByLabelText(searchLabel)).toBeInTheDocument();
    expect(screen.getByText('Completada')).toBeInTheDocument();
    expect(screen.getByText('SP-200')).toBeInTheDocument();
    expect(screen.getByText('Hospitalización')).toBeInTheDocument();
    expect(screen.getByLabelText('Imprimir informe')).toBeInTheDocument();
    expect(screen.queryByText('H12O-C000002-E000010')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));

    expect(screen.getByText('Casos y evaluaciones del encuentro')).toBeInTheDocument();
    expect(screen.getByText('H12O-C000002')).toBeInTheDocument();
    expect(screen.getByText('H12O-C000002-E000010')).toBeInTheDocument();
    expect(screen.getByText('Secundaria')).toBeInTheDocument();
    expect(screen.getAllByText('Hospitalización')).toHaveLength(2);
    expect(screen.getByText('Compartida con caso')).toBeInTheDocument();
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

  it('groups two masses from the same encounter into a single row with expandable details', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 20,
          evaluationId: 22,
          encounterId: '337442cb-927a-45d1-a5c4-6f5502689e7a',
          caseDisplayId: 'HURYC-C000020',
          evaluationDisplayId: 'HURYC-C000020-E000022',
          evaluationType: 'PRIMARY',
          primaryEvaluation: true,
          centerId: 'HURYC',
          codeStatus: 'CODE_ASSIGNED',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          studyPatientCode: 'HURYC-0001',
          lateralityDisplay: 'Derecho',
          anatomicalStructureDisplay: 'Ovario',
          careSettingDisplay: 'Urgencias',
          hasAdnexalMass: true,
          observerInitials: 'ABC',
          createdAt: '2026-06-05T10:00:00',
          questionnaireResponseFhirId: 201,
        },
        {
          caseId: 21,
          evaluationId: 23,
          encounterId: '337442cb-927a-45d1-a5c4-6f5502689e7a',
          caseDisplayId: 'HURYC-C000021',
          evaluationDisplayId: 'HURYC-C000021-E000023',
          evaluationType: 'PRIMARY',
          primaryEvaluation: true,
          centerId: 'HURYC',
          codeStatus: 'CODE_ASSIGNED',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          studyPatientCode: 'HURYC-0001',
          lateralityDisplay: 'Izquierdo',
          anatomicalStructureDisplay: 'Ovario',
          careSettingDisplay: 'Urgencias',
          hasAdnexalMass: true,
          observerInitials: 'ABC',
          createdAt: '2026-06-05T10:00:00',
          questionnaireResponseFhirId: 202,
        },
      ]),
    });

    render(<EncountersScreen />);

    expect(await screen.findByText('Encuentro 337442cb…')).toBeInTheDocument();
    expect(screen.queryByText('337442cb-927a-45d1-a5c4-6f5502689e7a')).not.toBeInTheDocument();
    expect(screen.getByText('2 masas detectadas')).toBeInTheDocument();
    expect(screen.getByText('Derecho · Ovario')).toBeInTheDocument();
    expect(screen.getByText('Izquierdo · Ovario')).toBeInTheDocument();
    expect(screen.getByText('2 primarias')).toBeInTheDocument();
    expect(screen.getByText('1 registros')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Imprimir informe')).toHaveLength(1);
    expect(screen.queryByText('HURYC-C000020-E000022')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));

    expect(screen.getByText('HURYC-C000020-E000022')).toBeInTheDocument();
    expect(screen.getByText('HURYC-C000021-E000023')).toBeInTheDocument();
    expect(screen.getAllByText('Derecho · Ovario').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Izquierdo · Ovario').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps two different encounters as two rows and searches associated detail fields', async () => {
    ApiService.mockResolvedValueOnce({
      status: 200,
      json: async () => ([
        {
          caseId: 30,
          evaluationId: 31,
          encounterId: 'enc-primary',
          caseDisplayId: 'HURYC-C000030',
          evaluationDisplayId: 'HURYC-C000030-E000031',
          evaluationType: 'PRIMARY',
          primaryEvaluation: true,
          centerId: 'HURYC',
          codeStatus: 'CODE_ASSIGNED',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          studyPatientCode: 'HURYC-0002',
          lateralityDisplay: 'Derecho',
          anatomicalStructureDisplay: 'Ovario',
          careSettingDisplay: 'Urgencias',
          hasAdnexalMass: true,
          observerInitials: 'AAA',
          createdAt: '2026-06-04T10:00:00',
          questionnaireResponseFhirId: 301,
        },
        {
          caseId: 30,
          evaluationId: 32,
          encounterId: 'enc-secondary',
          caseDisplayId: 'HURYC-C000030',
          evaluationDisplayId: 'HURYC-C000030-E000032',
          evaluationType: 'SECONDARY',
          primaryEvaluation: false,
          centerId: 'HURYC',
          codeStatus: 'CODE_ASSIGNED',
          caseStatus: 'OPEN',
          evaluationStatus: 'COMPLETED',
          studyPatientCode: 'HURYC-0002',
          lateralityDisplay: 'Derecho',
          anatomicalStructureDisplay: 'Ovario',
          careSettingDisplay: 'Unidad ecográfica',
          hasAdnexalMass: true,
          observerInitials: 'BBB',
          createdAt: '2026-06-05T10:00:00',
          questionnaireResponseFhirId: 302,
        },
      ]),
    });

    render(<EncountersScreen />);

    expect(await screen.findByText(/Encuentro enc-prim/)).toBeInTheDocument();
    expect(screen.getByText(/Encuentro enc-seco/)).toBeInTheDocument();
    expect(screen.getByText('2 registros')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(searchLabel), 'secundaria');

    expect(screen.queryByText(/Encuentro enc-prim/)).not.toBeInTheDocument();
    expect(screen.getByText(/Encuentro enc-seco/)).toBeInTheDocument();
  });

  it('shows no-mass encounters as Sin masa anexial and prints without probability prompt', async () => {
    const noMassRow = {
      caseId: 40,
      evaluationId: 41,
      encounterId: 'enc-no-mass',
      caseDisplayId: 'HURYC-C000040',
      evaluationDisplayId: 'HURYC-C000040-E000041',
      evaluationType: 'PRIMARY',
      primaryEvaluation: true,
      centerId: 'HURYC',
      codeStatus: 'CODE_ASSIGNED',
      caseStatus: 'OPEN',
      evaluationStatus: 'COMPLETED',
      studyPatientCode: 'HURYC-0004',
      careSettingDisplay: 'Consulta',
      hasAdnexalMass: false,
      observerInitials: 'ABC',
      createdAt: '2026-06-05T10:00:00',
      questionnaireResponseFhirId: 401,
    };

    ApiService.mockImplementation((token, method, endpoint) => {
      if (endpoint.includes('/app/cases/evaluations')) {
        return Promise.resolve({ status: 200, json: async () => ([noMassRow]) });
      }
      if (endpoint.includes('/app/QuestionnaireResponse/401')) {
        return Promise.resolve({
          status: 200,
          json: async () => ({
            item: [
              { linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'No' } }] },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<EncountersScreen />);

    expect(await screen.findByText(/Encuentro enc-no-m/)).toBeInTheDocument();
    expect(screen.getAllByText('Sin masa anexial')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));

    expect(screen.getByText('No aplicable')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Editar Histología')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Imprimir informe' }));

    await waitFor(() => expect(window.open).toHaveBeenCalledWith('blob:url', '_blank'));
    expect(screen.queryByText('Incluir probabilidad en el informe')).not.toBeInTheDocument();
    expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/QuestionnaireResponse/401', {});

    window.open.mockRestore();
  });

  it('prints a single encounter PDF after loading all questionnaire responses from that encounter', async () => {
    const rows = [
      {
        caseId: 50,
        evaluationId: 51,
        encounterId: 'enc-report',
        caseDisplayId: 'HURYC-C000050',
        evaluationDisplayId: 'HURYC-C000050-E000051',
        evaluationType: 'PRIMARY',
        primaryEvaluation: true,
        centerId: 'HURYC',
        codeStatus: 'CODE_ASSIGNED',
        caseStatus: 'OPEN',
        evaluationStatus: 'COMPLETED',
        studyPatientCode: 'HURYC-0050',
        lateralityDisplay: 'Derecho',
        anatomicalStructureDisplay: 'Ovario',
        careSettingDisplay: 'Urgencias',
        hasAdnexalMass: true,
        observerInitials: 'ABC',
        createdAt: '2026-06-05T10:00:00',
        questionnaireResponseFhirId: 501,
      },
      {
        caseId: 51,
        evaluationId: 52,
        encounterId: 'enc-report',
        caseDisplayId: 'HURYC-C000051',
        evaluationDisplayId: 'HURYC-C000051-E000052',
        evaluationType: 'PRIMARY',
        primaryEvaluation: true,
        centerId: 'HURYC',
        codeStatus: 'CODE_ASSIGNED',
        caseStatus: 'OPEN',
        evaluationStatus: 'COMPLETED',
        studyPatientCode: 'HURYC-0050',
        lateralityDisplay: 'Izquierdo',
        anatomicalStructureDisplay: 'Ovario',
        careSettingDisplay: 'Urgencias',
        hasAdnexalMass: true,
        observerInitials: 'ABC',
        createdAt: '2026-06-05T10:00:00',
        questionnaireResponseFhirId: 502,
      },
    ];

    ApiService.mockImplementation((token, method, endpoint) => {
      if (endpoint.includes('/app/cases/evaluations')) {
        return Promise.resolve({ status: 200, json: async () => rows });
      }
      if (endpoint.includes('/app/QuestionnaireResponse/501') || endpoint.includes('/app/QuestionnaireResponse/502')) {
        return Promise.resolve({
          status: 200,
          json: async () => ({
            item: [
              ...calculableEcoScoreItems,
              { linkId: 'MA_LADO', answer: [{ valueCoding: { display: 'Derecho' } }] },
              { linkId: 'MA_ESTRUCTURA', answer: [{ valueCoding: { display: 'Ovario' } }] },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<EncountersScreen />);
    expect(await screen.findByText(/Encuentro enc-repo/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Imprimir informe' }));

    expect(await screen.findByText('Incluir probabilidad en el informe')).toBeInTheDocument();
    expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/QuestionnaireResponse/501', {});
    expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/QuestionnaireResponse/502', {});

    await userEvent.click(screen.getByRole('button', { name: 'No incluir' }));

    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('patientPseudonym')).not.toBeInTheDocument();
    expect(screen.queryByText('hash')).not.toBeInTheDocument();

    window.open.mockRestore();
  });

  it('prints a secondary encounter from its own questionnaire response', async () => {
    const secondaryRow = {
      caseId: 60,
      evaluationId: 62,
      encounterId: 'enc-secondary-print',
      caseDisplayId: 'HURYC-C000060',
      evaluationDisplayId: 'HURYC-C000060-E000062',
      evaluationType: 'SECONDARY',
      primaryEvaluation: false,
      centerId: 'HURYC',
      codeStatus: 'CODE_ASSIGNED',
      caseStatus: 'OPEN',
      evaluationStatus: 'COMPLETED',
      studyPatientCode: 'HURYC-0060',
      careSettingDisplay: 'Unidad ecográfica',
      hasAdnexalMass: false,
      observerInitials: 'SEC',
      createdAt: '2026-06-05T11:00:00',
      questionnaireResponseFhirId: 602,
    };

    ApiService.mockImplementation((token, method, endpoint) => {
      if (endpoint.includes('/app/cases/evaluations')) {
        return Promise.resolve({ status: 200, json: async () => ([secondaryRow]) });
      }
      if (endpoint.includes('/app/QuestionnaireResponse/602')) {
        return Promise.resolve({
          status: 200,
          json: async () => ({
            item: [
              { linkId: 'PAT_MA', answer: [{ valueCoding: { display: 'No' } }] },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<EncountersScreen />);
    expect(await screen.findByText(/Encuentro enc-seco/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Imprimir informe' }));

    await waitFor(() => expect(window.open).toHaveBeenCalledWith('blob:url', '_blank'));
    expect(ApiService).toHaveBeenCalledWith('token', 'GET', '/app/QuestionnaireResponse/602', {});
    expect(ApiService).not.toHaveBeenCalledWith('token', 'GET', '/app/QuestionnaireResponse/601', {});

    window.open.mockRestore();
  });

  it('shows updated probability dialog title and buttons when printing a case with mass', async () => {
    const caseRow = {
      caseId: 2,
      evaluationId: 10,
      encounterId: 'enc-10',
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
              ...calculableEcoScoreItems,
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    render(<EncountersScreen />);
    await waitFor(() => expect(screen.getByText(/Encuentro enc-10/)).toBeInTheDocument());

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
      encounterId: 'enc-11',
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
              ...calculableEcoScoreItems,
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
    await waitFor(() => expect(screen.getByText(/Encuentro enc-11/)).toBeInTheDocument());

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
