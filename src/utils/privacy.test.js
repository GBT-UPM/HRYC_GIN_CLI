import {
  removeSensitiveQuestionnaireItems,
  sanitizeQuestionnaireResponse,
} from "./privacy";

describe("privacy utilities", () => {
  it("removes PAT_NHC", () => {
    const result = removeSensitiveQuestionnaireItems([
      { linkId: "PAT_NHC", answer: [{ valueString: "123" }] },
      { linkId: "PAT_CODIGO", answer: [{ valueString: "STUDY-1" }] },
    ]);

    expect(result).toEqual([]);
  });

  it("removes PAT_NOMBRE", () => {
    const result = removeSensitiveQuestionnaireItems([
      { linkId: "PAT_NOMBRE", answer: [{ valueString: "Nombre" }] },
      { linkId: "PAT_EDAD", answer: [{ valueInteger: 40 }] },
    ]);

    expect(result).toEqual([
      { linkId: "PAT_EDAD", answer: [{ valueInteger: 40 }] },
    ]);
  });

  it("sanitizes recursively", () => {
    const result = removeSensitiveQuestionnaireItems([
      {
        linkId: "GROUP",
        item: [
          { linkId: "PAT_NHC", answer: [{ valueString: "123" }] },
          { linkId: "PAT_NOMBRE", answer: [{ valueString: "Nombre" }] },
          { linkId: "MA_LADO", answer: [{ valueCoding: { display: "Derecho" } }] },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        linkId: "GROUP",
        item: [
          { linkId: "MA_LADO", answer: [{ valueCoding: { display: "Derecho" } }] },
        ],
      },
    ]);
  });

  it("removes PAT_CODIGO", () => {
    const result = removeSensitiveQuestionnaireItems([
      { linkId: "PAT_CODIGO", answer: [{ valueString: "STUDY-1" }] },
      { linkId: "MA_LADO", answer: [{ valueCoding: { display: "Izquierdo" } }] },
    ]);

    expect(result).toEqual([
      { linkId: "MA_LADO", answer: [{ valueCoding: { display: "Izquierdo" } }] },
    ]);
  });

  it("keeps non-identifying clinical fields", () => {
    const items = [
      { linkId: "MA_LADO", answer: [{ valueCoding: { display: "Izquierdo" } }] },
      { linkId: "HOSPITAL_REF", answer: [{ valueString: "Hospital" }] },
      { linkId: "ECO_EXP_SIGLAS", answer: [{ valueString: "ABC" }] },
      { linkId: "PAT_EDAD", answer: [{ valueInteger: 40 }] },
      { linkId: "PAT_FUR", answer: [{ valueDate: "2026-01-01" }] },
    ];

    expect(removeSensitiveQuestionnaireItems(items)).toEqual(items);
  });

  it("returns a questionnaire response copy without sensitive items", () => {
    const questionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      item: [
        { linkId: "PAT_NHC", answer: [{ valueString: "123" }] },
        { linkId: "PAT_CODIGO", answer: [{ valueString: "STUDY-1" }] },
      ],
    };

    const result = sanitizeQuestionnaireResponse(questionnaireResponse);

    expect(result).toEqual({
      resourceType: "QuestionnaireResponse",
      status: "completed",
      item: [],
    });
    expect(result).not.toBe(questionnaireResponse);
  });

  it("normalizes legacy QuestionnaireResponse fields without changing clinical answers", () => {
    const result = sanitizeQuestionnaireResponse({
      resourceType: "QuestionnaireResponse",
      partOf: [{ reference: "Encounter/legacy-encounter" }],
      encounter: { reference: "Encounter/legacy-encounter" },
      item: [{
        linkId: "PAT_MA",
        questionText: "¿Hay alguna masa anexial?",
        answer: [{ valueCoding: { code: "0", display: "No" }, valueString: "0" }],
      }],
    });

    expect(result).toEqual({
      resourceType: "QuestionnaireResponse",
      encounter: { reference: "Encounter/legacy-encounter" },
      item: [{
        linkId: "PAT_MA",
        text: "¿Hay alguna masa anexial?",
        answer: [{ valueCoding: { code: "0", display: "No" } }],
      }],
    });
  });

  it("rejects divergent duplicate FHIR answer values instead of discarding clinical information", () => {
    expect(() => sanitizeQuestionnaireResponse({
      item: [{
        linkId: "PAT_MA",
        answer: [{ valueCoding: { code: "0", display: "No" }, valueString: "Sí" }],
      }],
    })).toThrow("valores FHIR incompatibles");
  });
});
