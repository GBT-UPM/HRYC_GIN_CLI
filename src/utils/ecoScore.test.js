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

  it('normalizes accents and casing', () => {
    expect(normalizeEcoScoreText('  ModerÁda  ')).toBe('moderada');
  });
});
