import {
  calculateEcoScore,
  calculateEcoScoreFromQuestionnaireResponse,
  ECO_SCORE_STATUS,
  normalizeEcoScoreText,
} from './ecoScore';

const qr = (answers) => ({
  item: Object.entries(answers).map(([linkId, value]) => ({
    linkId,
    answer: [{ valueCoding: { display: value } }],
  })),
});

const completeInputs = {
  hasMass: 'Sí',
  contour: 'Irregular',
  shadow: 'No',
  solidAreaPresent: 'Sí',
  solidAreaVascularization: 'Ninguno (score color 1)',
  papillaPresent: 'Sí',
  papillaVascularization: 'Moderada (score color 3)',
};

describe('ecoScore', () => {
  it('calculates the current ECO-SCORE formula with known values', () => {
    const result = calculateEcoScore(completeInputs);

    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(result.score).toBe('0.9763');
    expect(result.probability).toBeCloseTo(0.9763, 4);
    expect(result.text_score).toBe('La probabilidad de que la masa anexial sea maligna es de 97.63 %.');
  });

  it('normalizes Ninguno score labels', () => {
    const result = calculateEcoScore({
      ...completeInputs,
      solidAreaVascularization: 'Ninguno (score color 1)',
      papillaVascularization: 'Ninguno',
    });

    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(result.score).toBe('0.9518');
  });

  it('normalizes nula labels', () => {
    const result = calculateEcoScore({
      ...completeInputs,
      solidAreaVascularization: 'nula',
      papillaVascularization: 'Nula',
    });

    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(result.score).toBe('0.9518');
  });

  it('normalizes Moderado and Moderada labels', () => {
    const masculine = calculateEcoScore({
      ...completeInputs,
      solidAreaVascularization: 'Moderado',
      papillaVascularization: 'Moderado',
    });
    const feminine = calculateEcoScore({
      ...completeInputs,
      solidAreaVascularization: 'Moderada',
      papillaVascularization: 'Moderada',
    });

    expect(masculine.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(feminine.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(masculine.score).toBe(feminine.score);
  });

  it('returns NOT_APPLICABLE for no-mass questionnaires', () => {
    const result = calculateEcoScore({ hasMass: 'No' });

    expect(result.status).toBe(ECO_SCORE_STATUS.NOT_APPLICABLE);
    expect(result.probability).toBeNull();
  });

  it('returns CALCULATED for a questionnaire response with complete variables', () => {
    const result = calculateEcoScoreFromQuestionnaireResponse(qr({
      PAT_MA: 'Sí',
      MA_Q_CONTORNO: 'Irregular',
      MA_SA: 'No',
      MA_Q_AS: 'Sí',
      MA_Q_AS_VASC: 'Leve (score color 2)',
      MA_PAPS: 'Sí',
      MA_Q_P_VASC: 'Abundante (score color 4)',
    }));

    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(result.score).toBe('0.9763');
  });

  it('returns CALCULATED when MA_PROB is Sí and variables are complete', () => {
    const result = calculateEcoScore({
      ...completeInputs,
      probabilityRequested: 'Sí',
    });

    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(result.score).toBe('0.9763');
  });

  it('returns CALCULATED when MA_PROB is No and variables are complete', () => {
    const result = calculateEcoScore({
      ...completeInputs,
      probabilityRequested: 'No',
    });

    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(result.score).toBe('0.9763');
  });

  it('returns NOT_CALCULABLE when a required variable is missing', () => {
    const result = calculateEcoScore({
      ...completeInputs,
      shadow: '',
    });

    expect(result.status).toBe(ECO_SCORE_STATUS.NOT_CALCULABLE);
    expect(result.probability).toBeNull();
    expect(result.missingVariables).toContain('MA_SA');
  });

  it('handles absent papillas as clinically not applicable', () => {
    const result = calculateEcoScore({
      ...completeInputs,
      papillaPresent: 'No',
      papillaVascularization: '',
    });

    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(result.missingVariables).toHaveLength(0);
  });

  it('handles absent solid area as clinically not applicable', () => {
    const result = calculateEcoScore({
      ...completeInputs,
      solidAreaPresent: 'No',
      solidAreaVascularization: '',
    });

    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(result.missingVariables).toHaveLength(0);
  });

  it('does not return numeric probability for NOT_CALCULABLE', () => {
    const result = calculateEcoScore({ hasMass: 'Sí' });

    expect(result.status).toBe(ECO_SCORE_STATUS.NOT_CALCULABLE);
    expect(result.score).toBeNull();
    expect(result.probability).toBeNull();
  });

  it('does not let MA_PROB = No bypass missing variables', () => {
    const result = calculateEcoScore({
      hasMass: 'Sí',
      probabilityRequested: 'No',
      contour: 'Irregular',
      shadow: 'No',
      solidAreaPresent: 'Sí',
      solidAreaVascularization: '',
      papillaPresent: 'No',
      papillaVascularization: '',
    });

    expect(result.status).toBe(ECO_SCORE_STATUS.NOT_CALCULABLE);
    expect(result.missingVariables).toContain('MA_Q_AS_VASC');
  });

  it('does not emit NOT_REQUESTED when MA_PROB is No', () => {
    const result = calculateEcoScore({
      ...completeInputs,
      probabilityRequested: 'No',
    });

    expect(result.status).not.toBe(ECO_SCORE_STATUS.NOT_REQUESTED);
  });

  it('normalizes accents and casing', () => {
    expect(normalizeEcoScoreText('  ModerÁda  ')).toBe('moderada');
  });
});
