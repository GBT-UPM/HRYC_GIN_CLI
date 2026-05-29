import { isHiddenQuestionnaireItem } from "./QuestionnaireForm";

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
});
