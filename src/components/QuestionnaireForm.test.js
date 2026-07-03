import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionnaireForm, { isHiddenQuestionnaireItem } from "./QuestionnaireForm";
import { maskNhc } from "../utils/privacy";

const questionnaire = {
  title: "Registro ginecológico",
  item: [
    {
      linkId: "HOSPITAL_REF",
      text: "Hospital",
      type: "string",
      required: true,
    },
  ],
};

const getHospitalInput = () => document.querySelector("#HOSPITAL_REF input");

const buildChoiceItem = ({ linkId, text, required = false, answerOptions, ...rest }) => ({
  linkId,
  text,
  type: "choice",
  required,
  answerOption: answerOptions.map(({ code, display }) => ({
    valueCoding: { code, display },
  })),
  ...rest,
});

const buildVisibilityQuestionnaire = ({ enableBehavior, includeMassProbability = false } = {}) => {
  const yesNoOptions = [
    { code: "yes", display: "Sí" },
    { code: "no", display: "No" },
  ];
  const typeOptions = [
    { code: "0", display: "Sólida" },
    { code: "1", display: "Quística" },
    { code: "2", display: "Sólido-quística" },
  ];

  if (includeMassProbability) {
    return {
      title: "Registro ginecológico",
      item: [
        buildChoiceItem({
          linkId: "PAT_MA",
          text: "¿Hay masa anexial?",
          answerOptions: yesNoOptions,
        }),
        buildChoiceItem({
          linkId: "MA_TIPO",
          text: "Tipo de masa",
          answerOptions: typeOptions,
          enableWhen: [
            {
              question: "PAT_MA",
              operator: "=",
              answerCoding: { code: "yes" },
            },
          ],
        }),
        buildChoiceItem({
          linkId: "MA_PROB",
          text: "Probabilidad",
          required: true,
          answerOptions: yesNoOptions,
          enableBehavior: "any",
          enableWhen: [
            {
              question: "MA_TIPO",
              operator: "=",
              answerCoding: { code: "1" },
            },
            {
              question: "MA_TIPO",
              operator: "=",
              answerCoding: { code: "2" },
            },
          ],
        }),
      ],
    };
  }

  return {
    title: "Visibilidad condicional",
    item: [
      buildChoiceItem({
        linkId: "COND_A",
        text: "Condición A",
        answerOptions: yesNoOptions,
      }),
      buildChoiceItem({
        linkId: "COND_B",
        text: "Condición B",
        answerOptions: yesNoOptions,
      }),
      buildChoiceItem({
        linkId: "TARGET",
        text: "Campo condicionado",
        answerOptions: yesNoOptions,
        enableWhen: [
          {
            question: "COND_A",
            operator: "=",
            answerCoding: { code: "yes" },
          },
          {
            question: "COND_B",
            operator: "=",
            answerCoding: { code: "yes" },
          },
        ],
        ...(enableBehavior ? { enableBehavior } : {}),
      }),
    ],
  };
};

const renderForm = (customQuestionnaire) =>
  render(
    <QuestionnaireForm
      questionnaire={customQuestionnaire}
      event={jest.fn()}
      eventContinue={jest.fn()}
      transientNhc="123456"
      onTransientNhcChange={jest.fn()}
    />
  );

const answerRadioQuestion = async (label, value) => {
  await userEvent.click(screen.getByLabelText(value, { selector: `input[name=\"${label}\"]` }));
};

describe("QuestionnaireForm visibility rules", () => {
  it("hides PAT_CODIGO so it is not required in the rendered questionnaire", () => {
    expect(isHiddenQuestionnaireItem("PAT_CODIGO")).toBe(true);
  });

  it("hides PAT_NHC and PAT_NOMBRE FHIR items", () => {
    expect(isHiddenQuestionnaireItem("PAT_NHC")).toBe(true);
    expect(isHiddenQuestionnaireItem("PAT_NOMBRE")).toBe(true);
  });

  it("does not hide clinical metadata needed by case creation", () => {
    expect(isHiddenQuestionnaireItem("HOSPITAL_REF")).toBe(false);
    expect(isHiddenQuestionnaireItem("MA_LADO")).toBe(false);
    expect(isHiddenQuestionnaireItem("ECO_EXP_SIGLAS")).toBe(false);
  });

  it("does not allow continuing without NHC", async () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc=""
        onTransientNhcChange={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Debe introducir el NHC para continuar.")).toBeInTheDocument();
    expect(screen.queryByText("Pulse")).not.toBeInTheDocument();
  });

  it("shows the missing required field message when a mandatory questionnaire answer is empty", async () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("No se puede continuar todavia")).toBeInTheDocument();
    expect(screen.getByText("Campos pendientes:")).toBeInTheDocument();
    expect(screen.queryByText("Pulse")).not.toBeInTheDocument();
  });

  it("shows an institutional alert with pending clinical fields before continuing", async () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("No se puede continuar todavia")).toBeInTheDocument();
    expect(screen.getByText("Revisa los campos obligatorios pendientes antes de avanzar.")).toBeInTheDocument();
    expect(screen.getByText("Campos pendientes:")).toBeInTheDocument();
    expect(screen.getAllByText("Hospital")).toHaveLength(2);
    expect(screen.queryByText("HOSPITAL_REF")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
  });

  it("shows automatic study code information without an editable field", () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
      />
    );

    expect(screen.getByText("Código de estudio")).toBeInTheDocument();
    expect(
      screen.getByText("El código de estudio se asignará automáticamente al guardar el primer registro de la paciente.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Código de estudio")).not.toBeInTheDocument();
  });

  it("shows care setting selector at the start of the form", () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText(/Ámbito asistencial/)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Urgencias" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "No especificado" })).toBeInTheDocument();
  });

  it("keeps the required indicator visible for mandatory labels without duplicating the label text", () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
      />
    );

    expect(screen.getAllByText("*")).not.toHaveLength(0);
    expect(screen.getAllByText("Hospital")).toHaveLength(1);
    expect(screen.getAllByText("NHC")).toHaveLength(1);
  });

  it("shows the visual section index and the institutional NHC help", () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText("Índice visual de secciones")).toBeInTheDocument();
    expect(screen.getByText("Contexto")).toBeInTheDocument();
    expect(screen.getByText("ECO-SCORE")).toBeInTheDocument();
    expect(screen.getByText("Dato transitorio")).toBeInTheDocument();
    expect(
      screen.getByText(
        "El NHC se utiliza únicamente para comprobaciones internas de pseudonimización y control de duplicados. No debe mostrarse ni incluirse en exportaciones."
      )
    ).toBeInTheDocument();
  });

  it("does not save NHC in localStorage or sessionStorage", async () => {
    jest.spyOn(window.localStorage.__proto__, "setItem");
    jest.spyOn(window.sessionStorage.__proto__, "setItem");

    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc=""
        onTransientNhcChange={jest.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText(/NHC/), "123456");

    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it("treats NHC as a real first interaction and notifies the parent callback", async () => {
    const onQuestionnaireInteraction = jest.fn();

    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc=""
        onTransientNhcChange={jest.fn()}
        onQuestionnaireInteraction={onQuestionnaireInteraction}
      />
    );

    await userEvent.type(screen.getByLabelText(/NHC/), "1");

    expect(onQuestionnaireInteraction).toHaveBeenCalledWith([], expect.objectContaining({
      linkId: "transient-nhc",
      type: "string",
    }));
  });

  it("confirmation masking reports NHC informed without exposing the value", () => {
    expect(maskNhc("123456")).toBe("NHC informado");
    expect(maskNhc("123456")).not.toContain("123456");
  });

  it("continues without validating a manual study code", async () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
      />
    );

    await userEvent.type(getHospitalInput(), "HURYC");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText(/Pulse/)).toBeInTheDocument();
  });

  it("keeps all-of semantics when enableBehavior is omitted", async () => {
    renderForm(buildVisibilityQuestionnaire());

    expect(screen.queryByText("Campo condicionado")).not.toBeInTheDocument();

    await answerRadioQuestion("COND_A", "Sí");
    expect(screen.queryByText("Campo condicionado")).not.toBeInTheDocument();

    await answerRadioQuestion("COND_B", "Sí");
    expect(screen.getByText("Campo condicionado")).toBeInTheDocument();
  });

  it('requires all conditions when enableBehavior is "all"', async () => {
    renderForm(buildVisibilityQuestionnaire({ enableBehavior: "all" }));

    await answerRadioQuestion("COND_A", "Sí");
    expect(screen.queryByText("Campo condicionado")).not.toBeInTheDocument();

    await answerRadioQuestion("COND_B", "Sí");
    expect(screen.getByText("Campo condicionado")).toBeInTheDocument();
  });

  it('shows the item when enableBehavior is "any" and one condition matches', async () => {
    renderForm(buildVisibilityQuestionnaire({ enableBehavior: "any" }));

    await answerRadioQuestion("COND_A", "Sí");

    expect(screen.getByText("Campo condicionado")).toBeInTheDocument();
  });

  it('keeps the item hidden when enableBehavior is "any" and no conditions match', async () => {
    renderForm(buildVisibilityQuestionnaire({ enableBehavior: "any" }));

    expect(screen.queryByText("Campo condicionado")).not.toBeInTheDocument();

    await answerRadioQuestion("COND_A", "No");
    await answerRadioQuestion("COND_B", "No");

    expect(screen.queryByText("Campo condicionado")).not.toBeInTheDocument();
  });

  it("does not show MA_PROB when PAT_MA is No", async () => {
    renderForm(buildVisibilityQuestionnaire({ includeMassProbability: true }));

    await answerRadioQuestion("PAT_MA", "No");

    expect(screen.queryByText("Probabilidad")).not.toBeInTheDocument();
  });

  it("does not show MA_PROB when PAT_MA is Sí and MA_TIPO is empty", async () => {
    renderForm(buildVisibilityQuestionnaire({ includeMassProbability: true }));

    await answerRadioQuestion("PAT_MA", "Sí");

    expect(screen.getByText("Tipo de masa")).toBeInTheDocument();
    expect(screen.queryByText("Probabilidad")).not.toBeInTheDocument();
  });

  it("shows MA_PROB when MA_TIPO is Quística", async () => {
    renderForm(buildVisibilityQuestionnaire({ includeMassProbability: true }));

    await answerRadioQuestion("PAT_MA", "Sí");
    await answerRadioQuestion("MA_TIPO", "Quística");

    expect(screen.getByText("Probabilidad")).toBeInTheDocument();
  });

  it("shows MA_PROB when MA_TIPO is Sólido-quística", async () => {
    renderForm(buildVisibilityQuestionnaire({ includeMassProbability: true }));

    await answerRadioQuestion("PAT_MA", "Sí");
    await answerRadioQuestion("MA_TIPO", "Sólido-quística");

    expect(screen.getByText("Probabilidad")).toBeInTheDocument();
  });

  it("does not show MA_PROB when MA_TIPO is Sólida", async () => {
    renderForm(buildVisibilityQuestionnaire({ includeMassProbability: true }));

    await answerRadioQuestion("PAT_MA", "Sí");
    await answerRadioQuestion("MA_TIPO", "Sólida");

    expect(screen.queryByText("Probabilidad")).not.toBeInTheDocument();
  });

  it("does not block validation when MA_PROB is hidden", async () => {
    renderForm(buildVisibilityQuestionnaire({ includeMassProbability: true }));

    await answerRadioQuestion("PAT_MA", "Sí");
    await answerRadioQuestion("MA_TIPO", "Sólida");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText(/Pulse/)).toBeInTheDocument();
    expect(screen.queryByText("No se puede continuar todavia")).not.toBeInTheDocument();
    expect(screen.queryByText("Probabilidad")).not.toBeInTheDocument();
  });

  it("blocks validation when MA_PROB is visible, required and unanswered", async () => {
    renderForm(buildVisibilityQuestionnaire({ includeMassProbability: true }));

    await answerRadioQuestion("PAT_MA", "Sí");
    await answerRadioQuestion("MA_TIPO", "Quística");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("No se puede continuar todavia")).toBeInTheDocument();
    expect(screen.getByText("Campos pendientes:")).toBeInTheDocument();
    expect(screen.getAllByText("Probabilidad")).not.toHaveLength(0);
    expect(screen.queryByText(/Pulse/)).not.toBeInTheDocument();
  });
});
