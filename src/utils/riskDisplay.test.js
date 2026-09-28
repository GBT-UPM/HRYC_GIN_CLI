import {
  formatPercentValue,
  formatProbabilityFromDecimal,
  formatRiskDisplay,
} from './riskDisplay';

describe('riskDisplay', () => {
  it('formats decimal probability values with two decimals', () => {
    expect(formatProbabilityFromDecimal(0.4593399848227177, { withSpace: true })).toBe('45.93 %');
    expect(formatProbabilityFromDecimal(0.84343347083615, { withSpace: true })).toBe('84.34 %');
  });

  it('formats direct percent values with two decimals', () => {
    expect(formatPercentValue(45.93399848227177, { withSpace: true })).toBe('45.93 %');
  });

  it('prefers probabilityPercent over decimal risk without multiplying twice', () => {
    expect(formatRiskDisplay({
      risk: '0.4593',
      ecoScoreProbabilityPercent: 45.93,
      hasAdnexalMass: true,
    })).toBe('45.93%');
  });
});
