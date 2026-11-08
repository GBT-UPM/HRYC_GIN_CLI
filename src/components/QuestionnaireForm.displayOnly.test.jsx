import fs from 'fs';
import path from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionnaireForm from './QuestionnaireForm';

const source = JSON.parse(fs.readFileSync(path.resolve(
  __dirname, '../../../HRYC_GIN_SER/src/main/resources/questionnaires/registro_ginecologico-v0.2.json'
), 'utf8').replace(/^\uFEFF/, ''));
const findItem = (items, id) => {
  for (const item of items || []) {
    if (item.linkId === id) return item;
    const found = findItem(item.item, id);
    if (found) return found;
  }
  return null;
};
const targets = ['MA_LADO', 'MA_ESTRUCTURA'].map((id) => {
  const { enableWhen, enableBehavior, ...item } = findItem(source.item, id);
  return item;
});

describe('questionnaire display-only choice regression', () => {
  it.each(targets)('$linkId retains every option and emits the selected display', async (item) => {
    const onQuestionnaireInteraction = jest.fn();
    const onContinue = jest.fn();
    render(<QuestionnaireForm
      questionnaire={{ title: 'Synthetic selector regression', item: targets }}
      event={onContinue} eventContinue={jest.fn()}
      transientNhc="SYNTHETIC-ONLY" onTransientNhcChange={jest.fn()}
      onQuestionnaireInteraction={onQuestionnaireInteraction}
    />);
    const select = document.querySelector(`#${item.linkId} select`);
    expect(select).not.toBeNull();
    for (const option of item.answerOption) {
      const display = option.valueCoding.display;
      const chosen = Array.from(select.options).find((o) => o.text === display);
      expect(chosen.value).not.toBe('');
      await userEvent.selectOptions(select, chosen);
      expect(select.selectedOptions[0].text).toBe(display);
      await waitFor(() => {
        const answers = onQuestionnaireInteraction.mock.calls.slice(-1)[0][0];
        const answer = answers.find((a) => a.linkId === item.linkId).answer[0];
        expect(answers.find((a) => a.linkId === item.linkId).text).toBe(item.text);
        expect(answers.find((a) => a.linkId === item.linkId).questionText).toBeUndefined();
        expect(answer.valueCoding.display).toBe(display);
        expect(answer.valueCoding.code).toBe(display);
        expect(answer.valueString).toBeUndefined();
      });
    }
    const other = targets.find((target) => target.linkId !== item.linkId);
    const otherSelect = document.querySelector(`#${other.linkId} select`);
    await userEvent.selectOptions(otherSelect, other.answerOption[0].valueCoding.display);
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar', exact: true }));
    const submitted = onContinue.mock.calls[0][0];
    expect(submitted.find((a) => a.linkId === item.linkId).answer[0].valueCoding.display).toBe('Indefinido');
  });

  it('changing structure does not clear the chosen location', async () => {
    render(<QuestionnaireForm
      questionnaire={{ title: 'Synthetic selector regression', item: targets }}
      event={jest.fn()} eventContinue={jest.fn()}
      transientNhc="SYNTHETIC-ONLY" onTransientNhcChange={jest.fn()}
    />);
    const side = document.querySelector('#MA_LADO select');
    const structure = document.querySelector('#MA_ESTRUCTURA select');
    await userEvent.selectOptions(side, 'Izquierdo');
    await userEvent.selectOptions(structure, 'Ovario');
    await userEvent.selectOptions(structure, 'Trompa');
    expect(side).toHaveValue('Izquierdo');
    expect(structure).toHaveValue('Trompa');
  });
});
