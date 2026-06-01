import ApiService from "./ApiService";
import {
  assignStudyPatientCode,
  getPendingStudyParticipants,
  STUDY_PARTICIPANT_ERROR_MESSAGES,
  validateStudyPatientCode,
} from "./studyParticipantService";

jest.mock("./ApiService");

const okResponse = (body) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(body),
});

const errorResponse = (status) => ({
  ok: false,
  status,
  json: jest.fn(),
});

describe("studyParticipantService", () => {
  beforeEach(() => {
    ApiService.mockReset();
    jest.spyOn(window.localStorage.__proto__, "setItem");
    jest.spyOn(window.sessionStorage.__proto__, "setItem");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls pending participants endpoint", async () => {
    ApiService.mockResolvedValue(okResponse([{ studyParticipantId: 4 }]));

    const result = await getPendingStudyParticipants("token", "HURYC");

    expect(ApiService).toHaveBeenCalledWith(
      "token",
      "GET",
      "/app/study-participants/pending?centerId=HURYC",
      {}
    );
    expect(result).toEqual([{ studyParticipantId: 4 }]);
  });

  it("converts pending participants response items to an array", async () => {
    ApiService.mockResolvedValue(okResponse({ items: [{ studyParticipantId: 4 }] }));

    const result = await getPendingStudyParticipants("token", "HURYC");

    expect(result).toEqual([{ studyParticipantId: 4 }]);
  });

  it("returns an empty array for pending participants without items", async () => {
    ApiService.mockResolvedValue(okResponse({}));

    const result = await getPendingStudyParticipants("token", "HURYC");

    expect(result).toEqual([]);
  });

  it("calls assign-code endpoint", async () => {
    ApiService.mockResolvedValue(okResponse({ studyParticipantId: 4 }));

    await assignStudyPatientCode("token", {
      centerId: "HURYC",
      nhc: "123456",
      studyPatientCode: "HURYC-0001",
    });

    expect(ApiService).toHaveBeenCalledWith("token", "POST", "/app/study-participants/assign-code", {
      centerId: "HURYC",
      nhc: "123456",
      studyPatientCode: "HURYC-0001",
    });
  });

  it("calls validate-study-code endpoint", async () => {
    ApiService.mockResolvedValue(okResponse({ valid: true, reason: null }));

    const result = await validateStudyPatientCode("token", {
      centerId: "HURYC",
      nhc: "123456",
      studyPatientCode: "HURYC-0001",
    });

    expect(ApiService).toHaveBeenCalledWith("token", "POST", "/app/study-participants/validate-study-code", {
      centerId: "HURYC",
      nhc: "123456",
      studyPatientCode: "HURYC-0001",
    });
    expect(result).toEqual({ valid: true, reason: null });
  });

  it("does not use localStorage or sessionStorage when validating a code", async () => {
    ApiService.mockResolvedValue(okResponse({ valid: true, reason: null }));

    await validateStudyPatientCode("token", {
      centerId: "HURYC",
      nhc: "123456",
      studyPatientCode: "HURYC-0001",
    });

    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it("maps validate-study-code network errors to a safe message", async () => {
    ApiService.mockRejectedValue(new Error("Failed to fetch"));

    await expect(
      validateStudyPatientCode("token", {
        centerId: "HURYC",
        nhc: "123456",
        studyPatientCode: "HURYC-0001",
      })
    ).rejects.toThrow(STUDY_PARTICIPANT_ERROR_MESSAGES.validateGeneric);
  });

  it("does not use localStorage or sessionStorage when assigning a code", async () => {
    ApiService.mockResolvedValue(okResponse({ studyParticipantId: 4 }));

    await assignStudyPatientCode("token", {
      centerId: "HURYC",
      nhc: "123456",
      studyPatientCode: "HURYC-0001",
    });

    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it("maps 403 to safe message", async () => {
    ApiService.mockResolvedValue(errorResponse(403));

    await expect(
      assignStudyPatientCode("token", {
        centerId: "HURYC",
        nhc: "123456",
        studyPatientCode: "HURYC-0001",
      })
    ).rejects.toThrow(STUDY_PARTICIPANT_ERROR_MESSAGES.forbidden);
  });

  it("maps 409 to safe message", async () => {
    ApiService.mockResolvedValue(errorResponse(409));

    await expect(
      assignStudyPatientCode("token", {
        centerId: "HURYC",
        nhc: "123456",
        studyPatientCode: "HURYC-0001",
      })
    ).rejects.toThrow(STUDY_PARTICIPANT_ERROR_MESSAGES.conflict);
  });

  it("maps other assign errors to generic message", async () => {
    ApiService.mockResolvedValue(errorResponse(500));

    await expect(
      assignStudyPatientCode("token", {
        centerId: "HURYC",
        nhc: "123456",
        studyPatientCode: "HURYC-0001",
      })
    ).rejects.toThrow(STUDY_PARTICIPANT_ERROR_MESSAGES.assignGeneric);
  });
});
