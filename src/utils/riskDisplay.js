const isFiniteNumber = (value) => Number.isFinite(Number.parseFloat(value));

const percentSuffix = (withSpace) => (withSpace ? ' %' : '%');

export const formatPercentValue = (percent, options = {}) => {
  const { withSpace = false } = options;

  if (!isFiniteNumber(percent)) {
    return '';
  }

  return `${Number.parseFloat(percent).toFixed(2)}${percentSuffix(withSpace)}`;
};

export const formatProbabilityFromDecimal = (probability, options = {}) => {
  if (!isFiniteNumber(probability)) {
    return '';
  }

  return formatPercentValue(Number.parseFloat(probability) * 100, options);
};

export const formatRiskDisplay = (item, options = {}) => {
  if (isFiniteNumber(item?.ecoScoreProbabilityPercent)) {
    return formatPercentValue(item.ecoScoreProbabilityPercent, options);
  }

  if (isFiniteNumber(item?.risk)) {
    return formatProbabilityFromDecimal(item.risk, options);
  }

  return item?.hasAdnexalMass === false ? 'No procede' : 'No calculado';
};
