import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionnaireForm from './QuestionnaireForm';

// Exercise the packaged Questionnaire and the real React renderer, not a copy of its conditions.
const questionnaire = JSON.parse(fs.readFileSync(path.resolve(
  __dirname, '../../../HRYC_GIN_SER/src/main/resources/questionnaires/registro_ginecologico-v0.2.json'
), 'utf8').replace(/^\uFEFF/, ''));
const correctedIds = ['MA_CONTENIDO_OTRO', 'MA_Q_P_M2', 'MA_PS_M3', 'MA_HISTOP_SI'];
const allItems = (items) => items.flatMap((item) => [item, ...allItems(item.item || [])]);
const radio = async (id, code) => {
  const input = document.querySelector(`#${id} input[value="${code}"]`);
  expect(input).not.toBeNull();
  expect(input).toBeEnabled();
  await userEvent.click(input);
};
const expectVisible = (id, visible) => {
  const field = document.getElementById(id);
  if (visible) {
    expect(field).toBeInTheDocument();
    expect(field.querySelector('input, textarea')).toBeEnabled();
  } else {
    expect(field).not.toBeInTheDocument();
  }
};

describe('packaged Questionnaire que-12', () => {
  it.each(correctedIds)('%s explicitly requires all its clinical prerequisites', (id) => {
    expect(allItems(questionnaire.item).find((item) => item.linkId === id).enableBehavior).toBe('all');
  });

  it('satisfies que-12 for every item, including nested groups', () => {
    const missing = allItems(questionnaire.item)
      .filter((item) => (item.enableWhen || []).length >= 2 && !['all', 'any'].includes(item.enableBehavior))
      .map((item) => item.linkId);
    expect(missing).toEqual([]);
  });
});

describe.each(['explicit all', 'legacy omitted'])('clinical visibility preserved: %s', (variant) => {
  let onInteraction;
  beforeEach(() => {
    const resource = JSON.parse(JSON.stringify(questionnaire));
    if (variant === 'legacy omitted') {
      allItems(resource.item).filter((item) => correctedIds.includes(item.linkId))
        .forEach((item) => { delete item.enableBehavior; });
    }
    onInteraction = jest.fn();
    render(<QuestionnaireForm
      questionnaire={resource}
      event={jest.fn()} eventContinue={jest.fn()}
      transientNhc="SYNTHETIC-QUE12" onTransientNhcChange={jest.fn()}
      onQuestionnaireInteraction={onInteraction}
    />);
  });

  const expectCleared = (id) => {
    const answers = onInteraction.mock.calls.slice(-1)[0][0];
    expect(answers.some((answer) => answer.linkId === id)).toBe(false);
  };

  it('shows other content only with a mass AND content Other; clears it when hidden', async () => {
    expectVisible('MA_CONTENIDO_OTRO', false);
    await radio('PAT_MA', '0');
    expectVisible('MA_CONTENIDO_OTRO', false);
    await radio('PAT_MA', '1');
    expectVisible('MA_CONTENIDO_OTRO', false);
    const select = document.querySelector('#MA_CONTENIDO select');
    const nonOther = Array.from(select.options).find((option) => option.value && option.value !== '1');
    await userEvent.selectOptions(select, nonOther.value);
    expectVisible('MA_CONTENIDO_OTRO', false);
    await userEvent.selectOptions(select, '1');
    expectVisible('MA_CONTENIDO_OTRO', true);
    await userEvent.type(document.querySelector('#MA_CONTENIDO_OTRO textarea'), 'Synthetic content');
    await userEvent.selectOptions(select, nonOther.value);
    expectVisible('MA_CONTENIDO_OTRO', false);
    expectCleared('MA_CONTENIDO_OTRO');
    await userEvent.selectOptions(select, '1');
    expectVisible('MA_CONTENIDO_OTRO', true);
    await radio('PAT_MA', '0');
    expectVisible('MA_CONTENIDO_OTRO', false);
  });

  it('requires a mass, an answered non-solid type AND papillae for the second papilla measure', async () => {
    expectVisible('MA_Q_P_M2', false);
    await radio('PAT_MA', '1');
    expectVisible('MA_Q_P_M2', false);
    await userEvent.selectOptions(document.querySelector('#MA_TIPO select'), '0');
    expectVisible('MA_Q_P_M2', false);
    await userEvent.selectOptions(document.querySelector('#MA_TIPO select'), '1');
    expectVisible('MA_Q_P_M2', false);
    await radio('MA_PAPS', '0');
    expectVisible('MA_Q_P_M2', false);
    await radio('MA_PAPS', '1');
    expectVisible('MA_Q_P_M2', true);
    await userEvent.type(document.querySelector('#MA_Q_P_M2 input'), '5');
    await radio('MA_PAPS', '0');
    expectVisible('MA_Q_P_M2', false);
    expectCleared('MA_Q_P_M2');
    await userEvent.selectOptions(document.querySelector('#MA_TIPO select'), '2');
    await radio('MA_PAPS', '1');
    expectVisible('MA_Q_P_M2', true);
    await userEvent.selectOptions(document.querySelector('#MA_TIPO select'), '0');
    expectVisible('MA_Q_P_M2', false);
    await radio('PAT_MA', '0');
    expectVisible('MA_Q_P_M2', false);
  });

  it('requires a mass AND healthy ovarian parenchyma for the third parenchyma measure', async () => {
    expectVisible('MA_PS_M3', false);
    await radio('PAT_MA', '1');
    expectVisible('MA_PS_M3', false);
    await radio('MA_PS', '0');
    expectVisible('MA_PS_M3', false);
    await radio('MA_PS', '1');
    expectVisible('MA_PS_M3', true);
    await userEvent.type(document.querySelector('#MA_PS_M3 input'), '7');
    await radio('MA_PS', '0');
    expectVisible('MA_PS_M3', false);
    expectCleared('MA_PS_M3');
    await radio('MA_PS', '1');
    expectVisible('MA_PS_M3', true);
    await radio('PAT_MA', '0');
    expectVisible('MA_PS_M3', false);
  });

  it('requires a mass AND completed histopathology for the definitive histopathology text', async () => {
    expectVisible('MA_HISTOP_SI', false);
    await radio('PAT_MA', '1');
    expectVisible('MA_HISTOP_SI', false);
    await radio('MA_HISTOP', '0');
    expectVisible('MA_HISTOP_SI', false);
    await radio('MA_HISTOP', '1');
    expectVisible('MA_HISTOP_SI', true);
    await userEvent.type(document.querySelector('#MA_HISTOP_SI input'), 'Synthetic result');
    await radio('MA_HISTOP', '0');
    expectVisible('MA_HISTOP_SI', false);
    expectCleared('MA_HISTOP_SI');
    await radio('MA_HISTOP', '1');
    expectVisible('MA_HISTOP_SI', true);
    await radio('PAT_MA', '0');
    expectVisible('MA_HISTOP_SI', false);
  });
});
