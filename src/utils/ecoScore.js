import { formatProbabilityFromDecimal } from './riskDisplay';

export const ECO_SCORE_STATUS = {
  CALCULATED: 'CALCULATED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  NOT_CALCULABLE: 'NOT_CALCULABLE',
  NOT_REQUESTED: 'NOT_REQUESTED',
};

const LINK_IDS = {
  HAS_MASS: 'PAT_MA',
  CONTOUR: 'MA_Q_CONTORNO',
  SHADOW: 'MA_SA',
  SOLID_AREA_PRESENT: 'MA_Q_AS',
  SOLID_AREA_VASCULARIZATION: 'MA_Q_AS_VASC',
  PAPILLA_PRESENT: 'MA_PAPS',
  PAPILLA_VASCULARIZATION: 'MA_Q_P_VASC',
  PROBABILITY_REQUESTED: 'MA_PROB',
};

export const normalizeEcoScoreText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isBlank = (value) => normalizeEcoScoreText(value) === '';

const isYes = (value) => {
  const normalized = normalizeEcoScoreText(value);
  return normalized === 'si' || normalized === 'sí' || normalized === 'yes' || normalized === 'true' || normalized === '1';
};

const isNo = (value) => {
  const normalized = normalizeEcoScoreText(value);
  return normalized === 'no' || normalized === 'false' || normalized === '0';
};

const findItemByLinkId = (items, linkId) => {
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    if (normalizeEcoScoreText(item?.linkId) === normalizeEcoScoreText(linkId)) return item;
    const nested = findItemByLinkId(item?.item, linkId);
    if (nested) return nested;
  }
  return null;
};

const answerValue = (answer) => {
  if (!answer) return '';
  if (answer.valueCoding) return answer.valueCoding.display || answer.valueCoding.code || '';
  if (answer.valueString !== undefined) return answer.valueString;
  if (answer.valueBoolean !== undefined) return answer.valueBoolean ? 'Sí' : 'No';
  if (answer.valueInteger !== undefined) return String(answer.valueInteger);
  if (answer.valueDecimal !== undefined) return String(answer.valueDecimal);
  if (answer.valueDate !== undefined) return answer.valueDate;
  return '';
};

export const getQuestionnaireAnswerValue = (questionnaireResponse, linkId) => {
  const item = findItemByLinkId(questionnaireResponse?.item, linkId);
  return answerValue(item?.answer?.[0]);
};

const normalizeContour = (value) => {
  const normalized = normalizeEcoScoreText(value);
  if (normalized.includes('irregular')) return 'irregular';
  if (normalized.includes('regular')) return 'regular';
  return '';
};

const normalizeVascularizationScore = (value) => {
  const normalized = normalizeEcoScoreText(value);
  if (isBlank(normalized)) return null;
  if (normalized.includes('score color 1') || normalized.includes('ninguno') || normalized.includes('nula')) return 1;
  if (normalized.includes('score color 2') || normalized.includes('leve')) return 2;
  if (normalized.includes('score color 3') || normalized.includes('moderado') || normalized.includes('moderada')) return 3;
  if (normalized.includes('score color 4') || normalized.includes('abundante')) return 4;
  return null;
};

export const extractEcoScoreInputs = (questionnaireResponse) => ({
  hasMass: getQuestionnaireAnswerValue(questionnaireResponse, LINK_IDS.HAS_MASS),
  contour: getQuestionnaireAnswerValue(questionnaireResponse, LINK_IDS.CONTOUR),
  shadow: getQuestionnaireAnswerValue(questionnaireResponse, LINK_IDS.SHADOW),
  solidAreaPresent: getQuestionnaireAnswerValue(questionnaireResponse, LINK_IDS.SOLID_AREA_PRESENT),
  solidAreaVascularization: getQuestionnaireAnswerValue(questionnaireResponse, LINK_IDS.SOLID_AREA_VASCULARIZATION),
  papillaPresent: getQuestionnaireAnswerValue(questionnaireResponse, LINK_IDS.PAPILLA_PRESENT),
  papillaVascularization: getQuestionnaireAnswerValue(questionnaireResponse, LINK_IDS.PAPILLA_VASCULARIZATION),
  probabilityRequested: getQuestionnaireAnswerValue(questionnaireResponse, LINK_IDS.PROBABILITY_REQUESTED),
});

const vascularizationContribution = (score, lowContribution, highContribution) => {
  if (score === 1 || score === 2) return lowContribution;
  if (score === 3 || score === 4) return highContribution;
  return 0;
};

export const calculateEcoScore = (inputs = {}) => {
  if (isNo(inputs.hasMass)) {
    return {
      status: ECO_SCORE_STATUS.NOT_APPLICABLE,
      probability: null,
      score: null,
      text_score: '',
      missingVariables: [],
    };
  }

  if (!isYes(inputs.hasMass)) {
    return {
      status: ECO_SCORE_STATUS.NOT_CALCULABLE,
      probability: null,
      score: null,
      text_score: '',
      missingVariables: [LINK_IDS.HAS_MASS],
    };
  }

  const missingVariables = [];
  const contour = normalizeContour(inputs.contour);
  if (!contour) missingVariables.push(LINK_IDS.CONTOUR);

  const shadow = normalizeEcoScoreText(inputs.shadow);
  if (!isYes(shadow) && !isNo(shadow)) missingVariables.push(LINK_IDS.SHADOW);

  const solidAreaScore = normalizeVascularizationScore(inputs.solidAreaVascularization);
  const solidAreaRequired = isYes(inputs.solidAreaPresent) || (!isNo(inputs.solidAreaPresent) && !isBlank(inputs.solidAreaVascularization));
  if (solidAreaRequired && solidAreaScore === null) missingVariables.push(LINK_IDS.SOLID_AREA_VASCULARIZATION);
  if (!isYes(inputs.solidAreaPresent) && !isNo(inputs.solidAreaPresent) && isBlank(inputs.solidAreaVascularization)) {
    missingVariables.push(LINK_IDS.SOLID_AREA_PRESENT);
  }

  const papillaScore = normalizeVascularizationScore(inputs.papillaVascularization);
  const papillaRequired = isYes(inputs.papillaPresent) || (!isNo(inputs.papillaPresent) && !isBlank(inputs.papillaVascularization));
  if (papillaRequired && papillaScore === null) missingVariables.push(LINK_IDS.PAPILLA_VASCULARIZATION);
  if (!isYes(inputs.papillaPresent) && !isNo(inputs.papillaPresent) && isBlank(inputs.papillaVascularization)) {
    missingVariables.push(LINK_IDS.PAPILLA_PRESENT);
  }

  if (missingVariables.length > 0) {
    return {
      status: ECO_SCORE_STATUS.NOT_CALCULABLE,
      probability: null,
      score: null,
      text_score: '',
      missingVariables,
    };
  }

  let logit = -3.625;
  if (contour === 'irregular') logit += 1.299;
  if (isNo(shadow)) logit += 1.847;
  if (solidAreaRequired) logit += vascularizationContribution(solidAreaScore, 2.209, 2.967);
  if (papillaRequired) logit += vascularizationContribution(papillaScore, 1.253, 1.988);

  const probability = 1 / (1 + Math.exp(-logit));
  const score = probability.toFixed(4);

  return {
    status: ECO_SCORE_STATUS.CALCULATED,
    probability,
    score,
    text_score: `La probabilidad de que la masa anexial sea maligna es de ${formatProbabilityFromDecimal(probability, { withSpace: true })}.`,
    missingVariables: [],
  };
};

export const calculateEcoScoreFromQuestionnaireResponse = (questionnaireResponse) =>
  calculateEcoScore(extractEcoScoreInputs(questionnaireResponse));

export const getEcoScoreStatus = (questionnaireResponse) =>
  calculateEcoScoreFromQuestionnaireResponse(questionnaireResponse).status;
