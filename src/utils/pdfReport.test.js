import { generateClinicalReportPdf } from './pdfReport';

const mockDoc = {
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
    MockJsPDF.prototype.addImage      = (...args) => mockDoc.addImage(...args);
    MockJsPDF.prototype.setFont       = (...args) => mockDoc.setFont(...args);
    MockJsPDF.prototype.setFontSize   = (...args) => mockDoc.setFontSize(...args);
    MockJsPDF.prototype.setTextColor  = (...args) => mockDoc.setTextColor(...args);
    MockJsPDF.prototype.setDrawColor  = (...args) => mockDoc.setDrawColor(...args);
    MockJsPDF.prototype.setFillColor  = (...args) => mockDoc.setFillColor(...args);
    MockJsPDF.prototype.roundedRect   = (...args) => mockDoc.roundedRect(...args);
    MockJsPDF.prototype.line          = (...args) => mockDoc.line(...args);
    MockJsPDF.prototype.text          = (...args) => mockDoc.text(...args);
    MockJsPDF.prototype.splitTextToSize = (...args) => mockDoc.splitTextToSize(...args);
    MockJsPDF.prototype.addPage       = (...args) => mockDoc.addPage(...args);
    MockJsPDF.prototype.autoPrint     = (...args) => mockDoc.autoPrint(...args);
    MockJsPDF.prototype.output        = (...args) => mockDoc.output(...args);
    MockJsPDF.prototype.internal      = {
      pageSize: { getHeight: () => 297, getWidth: () => 210 },
    };
    return MockJsPDF;
  })(),
}));

jest.mock('../assets/images/LogoHRYC.jpg',  () => 'mock-logo-huryc');
jest.mock('../assets/images/Logo12oct.jpg', () => 'mock-logo-h12o');

const makeQR = (hospitalRef = 'HURYC') => ({
  item: [
    { linkId: 'PAT_MA',    answer: [{ valueCoding: { display: 'Sí' } }] },
    { linkId: 'HOSPITAL_REF', answer: [{ valueString: hospitalRef }] },
    { linkId: 'PAT_EDAD',  answer: [{ valueInteger: 45 }] },
    { linkId: 'PAT_IND',   answer: [{ valueString: 'dolor pélvico' }] },
    { linkId: 'ECO_EXP_SIGLAS', answer: [{ valueString: 'XYZ' }] },
  ],
});

const makeReport = (text = 'Descripción ecográfica de prueba') => ({
  text,
  score: 0.8,
  text_score: 'La probabilidad de que la masa anexial sea maligna es de 80%.',
});

const pdfText = () =>
  mockDoc.text.mock.calls.map((c) => String(c[0])).join(' ');

describe('generateClinicalReportPdf', () => {
  beforeEach(() => {
    Object.values(mockDoc).forEach((v) => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
    mockDoc.splitTextToSize.mockImplementation((text) => [text]);
    mockDoc.output.mockReturnValue('blob:url');
    jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    window.open.mockRestore();
  });

  it('uses HURYC logo and correct hospital name for HURYC center', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('HURYC')],
      reports:            [makeReport()],
      observations:       ['Conclusión de prueba'],
      includeProbability: false,
      centerIdHint:       'HURYC',
      practitionerName:   'Dr. Test',
      careSettingDisplay: 'Urgencias',
      studyPatientCode:   'HURYC-0001',
    });

    expect(pdfText()).toContain('Hospital Universitario Ramón y Cajal');
    expect(pdfText()).not.toContain('Rio Hortega');
    expect(pdfText()).not.toContain('Río Hortega');
    expect(mockDoc.addImage).toHaveBeenCalledWith(
      'mock-logo-huryc', 'JPEG',
      expect.any(Number), expect.any(Number),
      expect.any(Number), expect.any(Number)
    );
    expect(mockDoc.addImage).not.toHaveBeenCalledWith(
      'mock-logo-h12o', expect.anything(),
      expect.anything(), expect.anything(),
      expect.anything(), expect.anything()
    );
  });

  it('uses H12O logo and correct hospital name for H12O center', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('H12O')],
      reports:            [makeReport()],
      observations:       [],
      includeProbability: false,
      centerIdHint:       'H12O',
      practitionerName:   'Dr. Test',
      careSettingDisplay: 'Consulta',
      studyPatientCode:   'H12O-0001',
    });

    expect(pdfText()).toContain('Hospital Universitario 12 de Octubre');
    expect(pdfText()).not.toContain('Rio Hortega');
    expect(pdfText()).not.toContain('Río Hortega');
    expect(mockDoc.addImage).toHaveBeenCalledWith(
      'mock-logo-h12o', 'JPEG',
      expect.any(Number), expect.any(Number),
      expect.any(Number), expect.any(Number)
    );
    expect(mockDoc.addImage).not.toHaveBeenCalledWith(
      'mock-logo-huryc', expect.anything(),
      expect.anything(), expect.anything(),
      expect.anything(), expect.anything()
    );
  });

  it('uses safe text fallback and no logo for an unknown center', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('UNKNOWN_CENTER')],
      reports:            [makeReport()],
      observations:       [],
      includeProbability: false,
      centerIdHint:       'UNKNOWN_CENTER',
    });

    expect(pdfText()).toContain('Centro no especificado');
    expect(pdfText()).not.toContain('Rio Hortega');
    expect(pdfText()).not.toContain('Río Hortega');
    expect(mockDoc.addImage).not.toHaveBeenCalled();
  });

  it('does not mix logo of one center with name of another', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('HURYC')],
      reports:            [makeReport()],
      observations:       [],
      includeProbability: false,
      centerIdHint:       'HURYC',
    });

    const usesHurycLogo = mockDoc.addImage.mock.calls.some((c) => c[0] === 'mock-logo-huryc');
    const usesH12oLogo  = mockDoc.addImage.mock.calls.some((c) => c[0] === 'mock-logo-h12o');
    expect(usesHurycLogo).toBe(true);
    expect(usesH12oLogo).toBe(false);
    expect(pdfText()).toContain('Hospital Universitario Ramón y Cajal');
    expect(pdfText()).not.toContain('Hospital Universitario 12 de Octubre');
  });

  it('includes ECO-SCORE when includeProbability is true', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('HURYC')],
      reports:            [makeReport()],
      observations:       [],
      includeProbability: true,
      centerIdHint:       'HURYC',
    });

    expect(pdfText()).toContain('ECO-SCORE');
    expect(pdfText()).toContain('La probabilidad de que la masa anexial sea maligna');
  });

  it('does not include ECO-SCORE when includeProbability is false', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('HURYC')],
      reports:            [makeReport()],
      observations:       [],
      includeProbability: false,
      centerIdHint:       'HURYC',
    });

    expect(pdfText()).not.toContain('ECO-SCORE');
    expect(pdfText()).not.toContain('La probabilidad de que la masa anexial sea maligna');
  });

  it('contains the professional clinical report title and service', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('HURYC')],
      reports:            [makeReport()],
      observations:       ['Conclusión del ecografista'],
      includeProbability: false,
      centerIdHint:       'HURYC',
      practitionerName:   'Dr. Test',
      careSettingDisplay: 'Urgencias',
      studyPatientCode:   'HURYC-0001',
    });

    expect(pdfText()).toContain('Informe ecográfico de masa anexial');
    expect(pdfText()).toContain('Servicio de Ginecología y Obstetricia');
    expect(pdfText()).toContain('Informe clínico estructurado generado por MIA');
  });

  it('renders ecographic description from reports', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('HURYC')],
      reports:            [makeReport('Mi descripción específica')],
      observations:       [],
      includeProbability: false,
      centerIdHint:       'HURYC',
    });

    expect(pdfText()).toContain('Mi descripción específica');
    expect(pdfText()).toContain('Descripción ecográfica');
  });

  it('renders ecographer conclusions', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('HURYC')],
      reports:            [makeReport()],
      observations:       ['Mi conclusión clínica'],
      includeProbability: false,
      centerIdHint:       'HURYC',
    });

    expect(pdfText()).toContain('Mi conclusión clínica');
    expect(pdfText()).toContain('Conclusiones del ecografista');
  });

  it('does not include NHC, patientPseudonym or hash in any field', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('HURYC')],
      reports:            [makeReport()],
      observations:       ['Conclusión'],
      includeProbability: false,
      centerIdHint:       'HURYC',
      studyPatientCode:   'HURYC-0001',
    });

    const text = pdfText().toLowerCase();
    expect(text).not.toContain('nhc');
    expect(text).not.toContain('patientpseudonym');
    expect(text).not.toContain('hash');
  });

  it('opens the PDF in a new tab', () => {
    generateClinicalReportPdf({
      responses:          [makeQR('HURYC')],
      reports:            [makeReport()],
      observations:       [],
      includeProbability: false,
      centerIdHint:       'HURYC',
    });

    expect(window.open).toHaveBeenCalledWith('blob:url', '_blank');
    expect(mockDoc.autoPrint).toHaveBeenCalled();
  });

  it('does nothing when no responses are provided', () => {
    generateClinicalReportPdf({ responses: [] });

    expect(mockDoc.text).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
  });
});
