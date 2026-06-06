import { upsertEcoScoreResult, ECO_SCORE_RESULT_ERROR_MESSAGES } from "./ecoScoreResultService";
import ApiService from "./ApiService";

jest.mock("./ApiService", () => jest.fn());

describe("ecoScoreResultService", () => {
  beforeEach(() => {
    ApiService.mockReset();
  });

  it("posts ECO-SCORE payload to the evaluation endpoint", async () => {
    ApiService.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 9, status: "CALCULATED" }),
    });

    const payload = { status: "CALCULATED", probability: 0.84 };
    const result = await upsertEcoScoreResult("token", 14, payload);

    expect(ApiService).toHaveBeenCalledWith(
      "token",
      "POST",
      "/app/case-evaluations/14/eco-score",
      payload
    );
    expect(result).toEqual({ id: 9, status: "CALCULATED" });
  });

  it("maps invalid payload errors to a safe validation message", async () => {
    ApiService.mockResolvedValue({ ok: false, status: 400 });

    await expect(upsertEcoScoreResult("token", 14, {})).rejects.toThrow(
      ECO_SCORE_RESULT_ERROR_MESSAGES.invalid
    );
  });
});
