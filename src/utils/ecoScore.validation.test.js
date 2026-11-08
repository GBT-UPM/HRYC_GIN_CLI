import fs from 'fs';
import path from 'path';
import golden from './__fixtures__/eco-score-golden36.json';
import { calculateEcoScore, calculateEcoScoreFromQuestionnaireResponse, ECO_SCORE_STATUS } from './ecoScore';
import { extractHasAdnexalMass } from './caseMetadata';

// Only labels/codes come from the questionnaire. Expected probabilities come
// exclusively from the checked-in Python Decimal oracle artifacts.
const questionnaire = JSON.parse(fs.readFileSync(path.resolve(
  __dirname, '../../../HRYC_GIN_SER/src/main/resources/questionnaires/registro_ginecologico-v0.2.json'
), 'utf8').replace(/^\uFEFF/, ''));
const items = new Map();
const visit = (list = []) => list.forEach((item) => {
  items.set(item.linkId, item);
  visit(item.item);
});
visit(questionnaire.item);
const coding = (id, index) => ({ ...items.get(id).answerOption[index].valueCoding });
const variants = (category) => category === 0 ? [0] : category === 1 ? [1, 2] : [3, 4];
const nominal = golden.flatMap((row) => variants(row.area).flatMap((areaDoppler) =>
  variants(row.papilla).map((papillaDoppler) => ({
    ...row, areaDoppler, papillaDoppler,
    nominalId: `${row.id}-D${areaDoppler}${papillaDoppler}`,
  }))));

const makeQr = (row) => {
  const values = {
    PAT_MA: coding('PAT_MA', 0),
    MA_TIPO: coding('MA_TIPO', row.areaDoppler || row.papillaDoppler ? 2 : 1),
    MA_Q_CONTORNO: coding('MA_Q_CONTORNO', row.irregular),
    MA_SA: coding('MA_SA', row.noShadow),
    MA_Q_AS: coding('MA_Q_AS', row.areaDoppler ? 0 : 1),
    MA_PAPS: coding('MA_PAPS', row.papillaDoppler ? 0 : 1),
  };
  if (row.areaDoppler) values.MA_Q_AS_VASC = coding('MA_Q_AS_VASC', row.areaDoppler - 1);
  if (row.papillaDoppler) values.MA_Q_P_VASC = coding('MA_Q_P_VASC', row.papillaDoppler - 1);
  return { resourceType: 'QuestionnaireResponse', item: [{ linkId: 'synthetic-group', item:
    Object.entries(values).map(([linkId, valueCoding]) => ({ linkId, answer: [{ valueCoding }] })) }] };
};

const labels = ['', 'Ninguno (score color 1)', 'Moderado (score color 3)'];
const inputsFor = (row) => ({
  hasMass: 'Sí', lesionType: row.area || row.papilla ? 'Sólido-quística' : 'Quística',
  contour: row.irregular ? 'Irregular' : 'Regular', shadow: row.noShadow ? 'No' : 'Sí',
  solidAreaPresent: row.area ? 'Sí' : 'No', solidAreaVascularization: labels[row.area],
  papillaPresent: row.papilla ? 'Sí' : 'No', papillaVascularization: labels[row.papilla],
});
const base = inputsFor(golden[0]);
const qrWith = (answers) => ({ item: Object.entries(answers).map(([linkId, answer]) => ({ linkId, answer: [answer] })) });
const codingAnswer = (display) => ({ valueCoding: { display } });
const validAnswers = {
  PAT_MA: codingAnswer('Sí'), MA_TIPO: codingAnswer('Quística'),
  MA_Q_CONTORNO: codingAnswer('Regular'), MA_SA: codingAnswer('Sí'),
  MA_Q_AS: codingAnswer('No'), MA_PAPS: codingAnswer('No'),
};

describe('independent published ECO-SCORE reference', () => {
  it('covers exactly 36 categories and 100 distinct nominal FHIR cases', () => {
    expect(golden).toHaveLength(36);
    expect(new Set(golden.map((row) => row.id)).size).toBe(36);
    expect(nominal).toHaveLength(100);
    expect(new Set(nominal.map((row) => row.nominalId)).size).toBe(100);
  });

  it.each(golden)('$id: mathematical probability and display rounding', (row) => {
    const result = calculateEcoScore(inputsFor(row));
    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(Math.abs(result.probability - Number(row.probability))).toBeLessThanOrEqual(1e-12);
    expect(result.score).toBe(row.score4);
    expect(result.text_score).toContain(`${row.percent2} %`);
  });

  it.each(nominal)('$nominalId: literal questionnaire options match independent reference', (row) => {
    const result = calculateEcoScoreFromQuestionnaireResponse(makeQr(row));
    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(Math.abs(result.probability - Number(row.probability))).toBeLessThanOrEqual(1e-12);
    expect(result.score).toBe(row.score4);
    expect(result.missingVariables).toEqual([]);
  });

  it.each(['MA_Q_AS_VASC', 'MA_Q_P_VASC'])('%s options preserve the four Doppler levels', (id) => {
    expect(items.get(id).answerOption).toHaveLength(4);
    items.get(id).answerOption.forEach((option, index) => {
      expect(option.valueCoding.display).toContain(`score color ${index + 1}`);
    });
  });
});

describe('invalid/incomplete inputs and non-applicable cases', () => {
  it.each(['hasMass', 'contour', 'shadow', 'solidAreaPresent', 'papillaPresent'])(
    'missing %s has no numeric result', (field) => {
      const result = calculateEcoScore({ ...base, [field]: '' });
      expect(result.status).toBe(ECO_SCORE_STATUS.NOT_CALCULABLE);
      expect(result.probability).toBeNull();
      expect(result.score).toBeNull();
      expect(result.missingVariables.length).toBeGreaterThan(0);
    });
  it.each([
    ['solidAreaPresent', 'solidAreaVascularization', 'MA_Q_AS_VASC'],
    ['papillaPresent', 'papillaVascularization', 'MA_Q_P_VASC'],
  ])('present %s requires valid vascularization', (presence, vascular, missing) => {
    ['', 'desconocida', '1', '5'].forEach((value) => {
      const result = calculateEcoScore({ ...base, [presence]: 'Sí', [vascular]: value });
      expect(result.status).toBe(ECO_SCORE_STATUS.NOT_CALCULABLE);
      expect(result.probability).toBeNull();
      expect(result.missingVariables).toContain(missing);
    });
  });
  it.each(['No', '0', 'false'])('no mass (%s) is not applicable despite residual predictors', (hasMass) => {
    const result = calculateEcoScore({ ...inputsFor(golden[35]), hasMass });
    expect(result.status).toBe(ECO_SCORE_STATUS.NOT_APPLICABLE);
    expect(result.probability).toBeNull();
  });
  it.each(['Sólida', '0'])('solid lesion (%s) is not applicable', (lesionType) => {
    expect(calculateEcoScore({ ...base, lesionType }).status).toBe(ECO_SCORE_STATUS.NOT_APPLICABLE);
  });
});

// Characterization, NOT endorsement: these assertions preserve observed behavior
// until the clinical/input contract is approved. See validation/eco-score/README.md.
describe('potential problems: current behavior characterization', () => {
  it.each(['', 'desconocido'])('currently calculates with lesionType=%s', (lesionType) => {
    expect(calculateEcoScore({ ...base, lesionType }).status).toBe(ECO_SCORE_STATUS.CALCULATED);
  });
  it.each([
    ['solidAreaPresent', 'solidAreaVascularization', 'area', 'papilla'],
    ['papillaPresent', 'papillaVascularization', 'papilla', 'area'],
  ])('currently infers %s from vascularization and ignores contradictory residual flow', (presence, vascular, category) => {
    const inferred = calculateEcoScore({ ...base, [presence]: '', [vascular]: labels[2] });
    const expected = golden.find((row) => !row.irregular && !row.noShadow
      && row[category] === 2 && row[category === 'area' ? 'papilla' : 'area'] === 0);
    expect(inferred.status).toBe(ECO_SCORE_STATUS.CALCULATED);
    expect(inferred.score).toBe(expected.score4);
    expect(calculateEcoScore({ ...base, [presence]: 'No', [vascular]: labels[2] }).score).toBe(golden[0].score4);
  });
  it('currently accepts a misleading contour substring', () => {
    expect(calculateEcoScore({ ...base, contour: 'no regular' }).score).toBe(golden[0].score4);
  });
  it('currently cannot decode code-only contour 1 although the questionnaire defines it', () => {
    const result = calculateEcoScoreFromQuestionnaireResponse(qrWith({
      ...validAnswers, MA_Q_CONTORNO: { valueCoding: { code: '1' } },
    }));
    expect(result.status).toBe(ECO_SCORE_STATUS.NOT_CALCULABLE);
    expect(result.missingVariables).toContain('MA_Q_CONTORNO');
  });
  it('currently prioritizes display over a conflicting code', () => {
    const result = calculateEcoScoreFromQuestionnaireResponse(qrWith({
      ...validAnswers, PAT_MA: { valueCoding: { code: '0', display: 'Sí' } },
    }));
    expect(result.status).toBe(ECO_SCORE_STATUS.CALCULATED);
  });
  it('currently uses the first duplicate item and first answer', () => {
    const qr = qrWith(validAnswers);
    qr.item.unshift({ linkId: 'PAT_MA', answer: [codingAnswer('No'), codingAnswer('Sí')] });
    expect(calculateEcoScoreFromQuestionnaireResponse(qr).status).toBe(ECO_SCORE_STATUS.NOT_APPLICABLE);
  });
  it('currently does not traverse answer.item', () => {
    const qr = { item: [{ linkId: 'group', answer: [{ item: qrWith(validAnswers).item }] }] };
    expect(calculateEcoScoreFromQuestionnaireResponse(qr).missingVariables).toContain('PAT_MA');
  });
  it.each([{ valueCoding: { code: '0' } }, { valueBoolean: false }])(
    'currently disagrees with case metadata on a negative non-display mass answer: %j', (answer) => {
      const qr = qrWith({ ...validAnswers, PAT_MA: answer });
      expect(calculateEcoScoreFromQuestionnaireResponse(qr).status).toBe(ECO_SCORE_STATUS.NOT_APPLICABLE);
      expect(extractHasAdnexalMass(qr)).toBe(true);
    });
});
