import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionnaireForm, { isHiddenQuestionnaireItem } from "./QuestionnaireForm";
import { maskNhc } from "../utils/privacy";
import { validateStudyPatientCode, STUDY_PARTICIPANT_ERROR_MESSAGES } from "../services/studyParticipantService";

jest.mock("../services/studyParticipantService", () => ({
  validateStudyPatientCode: jest.fn(),
  STUDY_PARTICIPANT_ERROR_MESSAGES: {
    forbidden: "No tiene permisos para gestionar códigos en este centro.",
    conflict: "El código de estudio ya está asignado a otra participante del mismo centro.",
    unauthorized: "Sesión caducada. Vuelva a iniciar sesión.",
    validateGeneric: "No se pudo validar el código de estudio.",
  },
}));

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

describe("QuestionnaireForm visibility rules", () => {
  beforeEach(() => {
    validateStudyPatientCode.mockReset();
    validateStudyPatientCode.mockResolvedValue({ valid: true, reason: null });
  });

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

  it("shows study code field for site coordinators", () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
        canEnterStudyPatientCode
      />
    );

    expect(screen.getByLabelText("Código de estudio")).toBeInTheDocument();
  });

  it("does not show study code field for clinicians", () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
        canEnterStudyPatientCode={false}
      />
    );

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

  it("confirmation masking reports NHC informed without exposing the value", () => {
    expect(maskNhc("123456")).toBe("NHC informado");
    expect(maskNhc("123456")).not.toContain("123456");
  });

  it("allows site coordinators to continue when study code is valid", async () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        token="token"
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
        studyPatientCode="HURYC-0001"
        canEnterStudyPatientCode
      />
    );

    await userEvent.type(getHospitalInput(), "HURYC");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText(/Pulse/)).toBeInTheDocument();
    expect(validateStudyPatientCode).toHaveBeenCalledWith("token", {
      centerId: "HURYC",
      nhc: "123456",
      studyPatientCode: "HURYC-0001",
    });
  });

  it("blocks early progress when study code belongs to another participant", async () => {
    validateStudyPatientCode.mockResolvedValue({
      valid: false,
      reason: "CODE_ASSIGNED_TO_ANOTHER_PARTICIPANT",
    });

    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        token="token"
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
        studyPatientCode="HURYC-0001"
        canEnterStudyPatientCode
      />
    );

    await userEvent.type(getHospitalInput(), "HURYC");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText(STUDY_PARTICIPANT_ERROR_MESSAGES.conflict)).toBeInTheDocument();
    expect(screen.getByText("Puede dejar el código vacío y el caso quedará pendiente de asignación.")).toBeInTheDocument();
    expect(screen.queryByText("Pulse")).not.toBeInTheDocument();
  });

  it("allows progress after clearing a conflicting study code", async () => {
    const onStudyPatientCodeChange = jest.fn();
    const { rerender } = render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        token="token"
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
        studyPatientCode="HURYC-0001"
        onStudyPatientCodeChange={onStudyPatientCodeChange}
        canEnterStudyPatientCode
      />
    );

    await userEvent.type(getHospitalInput(), "HURYC");
    await userEvent.clear(screen.getByLabelText("Código de estudio"));
    expect(onStudyPatientCodeChange).toHaveBeenLastCalledWith("");

    rerender(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        token="token"
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
        studyPatientCode=""
        onStudyPatientCodeChange={onStudyPatientCodeChange}
        canEnterStudyPatientCode
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText(/Pulse/)).toBeInTheDocument();
    expect(validateStudyPatientCode).not.toHaveBeenCalled();
  });

  it("does not validate study code for clinicians", async () => {
    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        token="token"
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
        studyPatientCode="HURYC-0001"
        canEnterStudyPatientCode={false}
      />
    );

    await userEvent.type(getHospitalInput(), "HURYC");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText(/Pulse/)).toBeInTheDocument();
    expect(validateStudyPatientCode).not.toHaveBeenCalled();
  });

  it("shows safe message when validate-study-code returns 403", async () => {
    validateStudyPatientCode.mockRejectedValue(new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.forbidden));

    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        token="token"
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
        studyPatientCode="HURYC-0001"
        canEnterStudyPatientCode
      />
    );

    await userEvent.type(getHospitalInput(), "HURYC");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText(STUDY_PARTICIPANT_ERROR_MESSAGES.forbidden)).toBeInTheDocument();
    expect(screen.getByDisplayValue("HURYC")).toBeInTheDocument();
  });

  it("shows validation error on network failure without losing form values", async () => {
    validateStudyPatientCode.mockRejectedValue(new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.validateGeneric));

    render(
      <QuestionnaireForm
        questionnaire={questionnaire}
        event={jest.fn()}
        eventContinue={jest.fn()}
        token="token"
        transientNhc="123456"
        onTransientNhcChange={jest.fn()}
        studyPatientCode="HURYC-0001"
        canEnterStudyPatientCode
      />
    );

    await userEvent.type(getHospitalInput(), "HURYC");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText(STUDY_PARTICIPANT_ERROR_MESSAGES.validateGeneric)).toBeInTheDocument();
    expect(screen.getByDisplayValue("HURYC")).toBeInTheDocument();
    expect(screen.getByDisplayValue("HURYC-0001")).toBeInTheDocument();
  });
});
