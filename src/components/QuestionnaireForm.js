import React, { useState } from "react";
import '../assets/css/QuestionnaireForm.css';

import Modal from "./Modal";
import { mapCenterToCode } from "../utils/caseMetadata";
import {
  validateStudyPatientCode,
  STUDY_PARTICIPANT_ERROR_MESSAGES,
} from "../services/studyParticipantService";
import { CARE_SETTING_OPTIONS, normalizeCareSetting } from "../utils/careSetting";

export const HIDDEN_LINK_IDS = new Set(["PAT_CODIGO", "PAT_NHC", "PAT_NOMBRE"]);
export const isHiddenQuestionnaireItem = (linkId) => HIDDEN_LINK_IDS.has(linkId);
export const NHC_REQUIRED_MESSAGE = "Debe introducir el NHC para continuar.";

const QuestionnaireForm = ({
  questionnaire,
  event,
  eventContinue,
  token = "",
  transientNhc,
  onTransientNhcChange,
  studyPatientCode = "",
  onStudyPatientCodeChange = () => {},
  canEnterStudyPatientCode = false,
  careSettingCode = "UNKNOWN",
  onCareSettingChange = () => {},
  onDirtyChange = () => {},
}) => {
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState("");
  const [nhcError, setNhcError] = useState("");
  const [studyCodeError, setStudyCodeError] = useState("");
  const [requiredFieldsError, setRequiredFieldsError] = useState("");
  const [validatingStudyCode, setValidatingStudyCode] = useState(false);
  const [disabledFields, setDisabledFields] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Verifica si hay masa anexial
  const hasMass = answers.find(a => a.linkId === "PAT_MA")?.answer?.[0]?.valueCoding.display === "Sí" || false;

  /**
 * Recorre recursivamente el cuestionario (items e hijos) para
 * obtener todos los linkId habilitados dados los 'answers' actuales.
 * Si un ítem padre no está habilitado, tampoco lo estarán sus hijos.
 */
function getEnabledLinkIds(items, currentAnswers) {
  let enabledIds = [];

  for (const item of items) {
    // Verificamos si este ítem está habilitado con sus condiciones
    const thisItemEnabled = checkEnableWhen(item.enableWhen, currentAnswers);

    if (thisItemEnabled) {
      // Agregamos este linkId
      enabledIds.push(item.linkId);

      // Si el ítem es de tipo 'group', procesamos sus hijos
      if (item.type === "group" && item.item) {
        const childEnabledIds = getEnabledLinkIds(item.item, currentAnswers);
        enabledIds = [...enabledIds, ...childEnabledIds];
      }
    }
    // Si no está habilitado, no bajamos a sus hijos (no se agregan).
  }

  return enabledIds;
}

  const handleInputChange = (questionText,linkId, type, value,display) => {
    onDirtyChange(true);
    setAnswers((prevAnswers) => {
      const existingAnswerIndex = prevAnswers.findIndex(
        (answer) => answer.linkId === linkId
      );
  
      if (value === null || value === "") {
        if (existingAnswerIndex >= 0) {
          const updatedAnswers = [...prevAnswers];
          updatedAnswers.splice(existingAnswerIndex, 1);
          return updatedAnswers;
        }
        return prevAnswers;
      }
      const newAnswer = { questionText,linkId, answer: [] };

      switch (type) {
        case "choice":
        //newAnswer.answer = [{ valueCoding: { code: value, display: display } }];
         newAnswer.answer = value;
          break;
        case "date":
          newAnswer.answer = [{ valueDate: value }];
          break;
        case "decimal":
          newAnswer.answer = [{ valueDecimal: parseFloat(value) }];
          break;
        case "integer":
          newAnswer.answer = [{ valueInteger: parseInt(value, 10) }];
          break;
        case "string":
        case "text":
          newAnswer.answer = [{ valueString: value }];
          break;
        default:
          return prevAnswers;
      }

      let updatedAnswers = [];
      if (existingAnswerIndex >= 0) {
        updatedAnswers = [...prevAnswers];
        updatedAnswers[existingAnswerIndex] = newAnswer;
      } else {
        updatedAnswers = [...prevAnswers, newAnswer];
      }

      // --- Nuevo paso para limpiar respuestas de ítems no habilitados ---
      const enabledLinkIds = getEnabledLinkIds(questionnaire.item, updatedAnswers);
      const cleanedAnswers = updatedAnswers.filter((ans) =>
        enabledLinkIds.includes(ans.linkId) && !HIDDEN_LINK_IDS.has(ans.linkId)
      );

      return cleanedAnswers;
   
    });

    setRequiredFieldsError("");
   
  };
/**
 * Determina si un ítem (y su descendencia) está habilitado,
 * evaluando sus condiciones enableWhen y la habilitación del padre.
 */
function checkEnableWhen(enableWhen, currentAnswers) {
  if (!enableWhen) return true;

  return enableWhen.every((condition) => {
    const answer = currentAnswers.find((a) => a.linkId === condition.question);
    // Si no hay respuesta para la pregunta que condiciona, no se cumple
    if (!answer) return false;

    switch (condition.operator) {
      case "exists":
        return condition.answerBoolean
          ? answer !== undefined
          : answer === undefined;
      case "=":
        // ejemplo con answerCoding
        if (condition.answerCoding) {
          return (
            answer.answer &&
            Array.isArray(answer.answer) &&
            answer.answer.some(
              (ans) => ans.valueCoding?.code === condition.answerCoding.code
            )
          );
        }
        return false;
      case "!=":
        if (condition.answerCoding) {
          return (
            answer.answer &&
            Array.isArray(answer.answer) &&
            answer.answer.every(
              (ans) => ans.valueCoding?.code !== condition.answerCoding.code
            )
          );
        }
        return false;
      default:
        return false;
    }
  });
}

const getAnswerDisplayValue = (linkId) => {
  const answer = answers.find((a) => a.linkId === linkId)?.answer?.[0];
  return (
    answer?.valueCoding?.display ||
    answer?.valueCoding?.code ||
    answer?.valueString ||
    answer?.valueInteger?.toString() ||
    answer?.valueDecimal?.toString() ||
    answer?.valueDate ||
    ""
  );
};
  
/**
   * Ajustado para que reciba también 'answers'.
   * Se llama en tiempo de render para saber si mostrar o no el ítem.
   */
const isItemEnabled = (item) => {
  return checkEnableWhen(item.enableWhen, answers);
};

/**
 * Renderiza el input correspondiente dependiendo del tipo.
 */
const renderInput = (item) => {
  const initialValue = item.initial?.[0] || {};
  const isDisabled = disabledFields.includes(item.linkId);
  const currentAnswer = answers.find((a) => a.linkId === item.linkId);

  switch (item.type) {
    case "choice":
      const isDropDown =
        item.extension?.some(
          (ext) =>
            ext.url === "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl" &&
            ext.valueCodeableConcept?.coding?.some(
              (coding) => coding.code === "drop-down"
            )
        ) ?? false;

      // Preparar las opciones (valueString o valueCoding)
      const options = item.answerOption
        .map((option) => {
          if (option.valueString) {
            return { value: option.valueString, label: option.valueString };
          } else if (option.valueCoding) {
            return {
              value: option.valueCoding.code,
              label: option.valueCoding.display,
            };
          }
          return null;
        })
        .filter(Boolean);

      // 1) Dropdown
      if (isDropDown) {
        return (
          <select
            value={
              currentAnswer?.answer?.[0]?.valueString ||
              currentAnswer?.answer?.[0]?.valueCoding?.code ||
              initialValue?.valueString ||
              ""
            }
            onChange={(e) => {
              const selectedOption = e.target.options[e.target.selectedIndex];
              handleInputChange(
                item.text,
                item.linkId,
                item.type,
                [
                  {
                    valueString: e.target.value,
                    valueCoding: {
                      code: e.target.value,
                      display: selectedOption.text,
                    },
                  },
                ],
                selectedOption.text
              );
            }}
            disabled={isDisabled}
          >
            <option value="">Seleccione una opción</option>
            {options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }
      // 2) Checkboxes (si item.repeats = true)
      else if (item.repeats) {
        return (
          <div>
            {options.map((option, index) => {
              const isChecked =
                currentAnswer?.answer?.some(
                  (ans) =>
                    ans.valueString === option.value ||
                    ans.valueCoding?.code === option.value
                ) || false;
              return (
                <div key={index}>
                  <input
                    type="checkbox"
                    id={`${item.linkId}-${index}`}
                    value={option.value}
                    checked={isChecked}
                    onChange={(e) => {
                      const selectedOptions = currentAnswer?.answer || [];
                      const newSelectedOptions = e.target.checked
                        ? [
                            ...selectedOptions,
                            {
                              valueString: option.value,
                              valueCoding: { code: option.value },
                            },
                          ]
                        : selectedOptions.filter(
                            (ans) =>
                              ans.valueString !== option.value &&
                              ans.valueCoding?.code !== option.value
                          );
                      handleInputChange(
                        item.text,
                        item.linkId,
                        item.type,
                        newSelectedOptions,
                        option.label
                      );
                    }}
                    disabled={isDisabled}
                  />
                  <label htmlFor={`${item.linkId}-${index}`}>
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        );
      }
      // 3) Radio buttons
      else {
        return (
          <div className="panel-radio">
            {options.map((option, index) => {
              const isChecked =
                currentAnswer?.answer?.some(
                  (ans) =>
                    ans.valueString === option.value ||
                    ans.valueCoding?.code === option.value
                ) || false;
              return (
                <div className="radio-container" key={index}>
                  <input
                    type="radio"
                    id={`${item.linkId}-${index}`}
                    name={item.linkId}
                    value={option.value}
                    checked={isChecked}
                    onChange={() =>
                      handleInputChange(
                        item.text,
                        item.linkId,
                        item.type,
                        [
                          {
                            valueString: option.value,
                            valueCoding: {
                              code: option.value,
                              display: option.label,
                            },
                          },
                        ],
                        option.label
                      )
                    }
                    disabled={isDisabled}
                  />
                  <label htmlFor={`${item.linkId}-${index}`}>
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        );
      }

    case "date":
      return (
        <input
          type="date"
          value={
            currentAnswer?.answer?.[0]?.valueDate ||
            initialValue.valueDate ||
            ""
          }
          onChange={(e) =>
            handleInputChange(item.text, item.linkId, item.type, e.target.value)
          }
          disabled={isDisabled}
        />
      );
    case "decimal":
      const minValueDecimal = item.extension?.find(
        (ext) => ext.url === "http://hl7.org/fhir/StructureDefinition/minValue"
      )?.valueInteger;
      return (
        <input
          type="number"
          step="0.1"
          min={minValueDecimal !== undefined ? minValueDecimal : undefined} // Aplica el valor mínimo si está definido
          value={
            currentAnswer?.answer?.[0]?.valueDecimal ||
            initialValue.valueDecimal ||
            ""
          }
          onChange={(e) =>{
            const inputValue = parseFloat(e.target.value);
            if (minValueDecimal !== undefined && inputValue < minValueDecimal) {
              // Si el valor es menor que el mínimo, no actualizamos el estado
              return;
            }
            handleInputChange(item.text, item.linkId, item.type, e.target.value)
          }}
          disabled={isDisabled}
        />
      );
      case "integer":
        const minValueInteger = item.extension?.find(
          (ext) => ext.url === "http://hl7.org/fhir/StructureDefinition/minValue"
        )?.valueInteger;
      
        return (
          <input
            type="number"
            step="1"
            min={minValueInteger !== undefined ? minValueInteger : undefined} // Aplica el valor mínimo si está definido
            value={
              currentAnswer?.answer?.[0]?.valueInteger ||
              initialValue.valueInteger ||
              ""
            }
            onChange={(e) => {
              const inputValue = parseInt(e.target.value, 10);
              if (minValueInteger !== undefined && inputValue < minValueInteger) {
                // Si el valor es menor que el mínimo, no actualizamos el estado
                return;
              }
              handleInputChange(item.text, item.linkId, item.type, e.target.value);
            }}
            disabled={isDisabled}
          />
        );
    case "string":
      return (
        <input
          type="text"
          value={
            currentAnswer?.answer?.[0]?.valueString ||
            initialValue.valueString ||
            ""
          }
          onChange={(e) =>
            handleInputChange(item.text, item.linkId, item.type, e.target.value)
          }
          disabled={isDisabled}
        />
      );
    case "text":
      return (
        <textarea
          value={
            currentAnswer?.answer?.[0]?.valueString ||
            initialValue.valueString ||
            ""
          }
          onChange={(e) =>
            handleInputChange(item.text, item.linkId, item.type, e.target.value)
          }
          disabled={isDisabled}
        />
      );
    default:
      return null;
  }
};
  /**
   * Dado un listado de ítems (puede ser el root o un item.group),
   * retorna todos los que tengan required = true (y recursivamente sus hijos).
   */
  const getRequiredItems = (items) => {
    let requiredItems = [];
    items.forEach((item) => {
      if (item.required && !HIDDEN_LINK_IDS.has(item.linkId)) {
        requiredItems.push(item);
      }
      if (item.item && item.item.length > 0) {
        requiredItems = requiredItems.concat(getRequiredItems(item.item));
      }
    });
    return requiredItems;
  };

   /**
   * Valida los campos requeridos que estén habilitados.
   */
	   const validateRequiredFields = () => {
	    const requiredItems = getRequiredItems(questionnaire.item);
      if (!String(transientNhc || "").trim()) {
        setNhcError(NHC_REQUIRED_MESSAGE);
        setError(NHC_REQUIRED_MESSAGE);
        setRequiredFieldsError("");
        return false;
      }
      setNhcError("");

	    // Solo se requieren los ítems que verdaderamente estén habilitados
    const missingAnswers = requiredItems.filter((item) => {
      if (!isItemEnabled(item)) return false; // si no está habilitado, no se valida
      const answer = answers.find((a) => a.linkId === item.linkId);
      return !answer || !answer.answer || answer.answer.length === 0;
    });

    if (missingAnswers.length > 0) {
      const missingLabels = missingAnswers.map((item) => `- ${item.text || item.linkId}`);
      const message = `Los siguientes campos están sin rellenar:\n\n${missingLabels.join('\n')}`;
      setError(message);
      setRequiredFieldsError(message);
      return false;
    } else {
      setError(null);
      setRequiredFieldsError("");
      return true;
    }
  };

  const validateStudyCodeIfNeeded = async () => {
    const trimmedStudyCode = String(studyPatientCode || "").trim();

    if (!canEnterStudyPatientCode || !trimmedStudyCode) {
      setStudyCodeError("");
      return true;
    }

    const centerId = mapCenterToCode(getAnswerDisplayValue("HOSPITAL_REF"));
    if (!centerId) {
      const message = "No se pudo identificar el centro participante.";
      setStudyCodeError(message);
      setError(message);
      return false;
    }

    try {
      setValidatingStudyCode(true);
      setStudyCodeError("");
      const result = await validateStudyPatientCode(token, {
        centerId,
        nhc: String(transientNhc || "").trim(),
        studyPatientCode: trimmedStudyCode,
      });

      if (result.valid === false && result.reason === "CODE_ASSIGNED_TO_ANOTHER_PARTICIPANT") {
        setStudyCodeError(STUDY_PARTICIPANT_ERROR_MESSAGES.conflict);
        setError(STUDY_PARTICIPANT_ERROR_MESSAGES.conflict);
        return false;
      }

      if (result.valid === false) {
        setStudyCodeError(STUDY_PARTICIPANT_ERROR_MESSAGES.validateGeneric);
        setError(STUDY_PARTICIPANT_ERROR_MESSAGES.validateGeneric);
        return false;
      }

      return true;
    } catch (validationError) {
      const message = validationError.message || STUDY_PARTICIPANT_ERROR_MESSAGES.validateGeneric;
      setStudyCodeError(message);
      setError(message);
      return false;
    } finally {
      setValidatingStudyCode(false);
    }
  };

  const validate = async () => {
    if (!validateRequiredFields()) {
      return false;
    }

    return validateStudyCodeIfNeeded();
  };

  const handleNextClick = async () => {
    if (await validate()) {
      setIsModalOpen(true);
    }
  };

   const handleReset = () => {
    const preservedLinkIds = [
      "PAT_EDAD", // Edad
      "PAT_FUR", // FUR
      "PAT_IND", // Indicación ecografía
      "PAT_IND_OTRO", // Indicación ecografía otro
      "ECO_EXP_SIGLAS", // Siglas del ecografista
      "HOSPITAL_REF", // Hospital de referencia
      "ECO_EXP", // Ecografista experto
      "CENTRO_REF", // Centro de referencia
      "PAT_MA",  // ¿Hay alguna masa anexial?
      "MA_PROB" // Probabilidad
    ];

    setAnswers((prevAnswers) => {
      return prevAnswers.filter(answer => preservedLinkIds.includes(answer.linkId));
    });
    setDisabledFields(preservedLinkIds);
    setError(null);
  };
  const parseStyleString = (styleString) => {
    return styleString.split(';').reduce((styleObject, styleProperty) => {
      const [property, value] = styleProperty.split(':');
      if (property && value) {
        const camelCaseProperty = property.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styleObject[camelCaseProperty] = value.trim();
      }
      return styleObject;
    }, {});
  };
    /**
   * Renderiza un grupo (item.type === "group") y sus hijos.
   */
    const renderGroup = (itemGroup) => {
      return (
        <div key={itemGroup.linkId} className="questionnaire-group">
          <h3 className="questionnaire-group-title">{itemGroup.text}</h3>
          <div className="questionnaire-container-group">
            {itemGroup.item.map((child) => {
              const styleString =
                child._text?.extension?.find(
                  (ext) =>
                    ext.url === "http://hl7.org/fhir/StructureDefinition/rendering-style"
                )?.valueString || "";
              const style = parseStyleString(styleString);
  
              // Solo renderizamos si el ítem está habilitado
              if (!isItemEnabled(child) || HIDDEN_LINK_IDS.has(child.linkId)) return null;
  
              return child.type === "group" ? (
                renderGroup(child)
              ) : (
                <div
                  id={child.linkId}
                  key={child.linkId}
                  className="questionnaire-item"
                  style={style}
                >
                  <label>
                    {child.text}
                    {child.required && <span className="required-asterisk">*</span>}
                  </label>
                  {renderInput(child)}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

	  return (
	    <><h2 className="questionnaire-title">{questionnaire.title}</h2>
	    <div className="questionnaire-container">
        <div className="questionnaire-item">
          <label htmlFor="transient-nhc">
            NHC
            <span className="required-asterisk">*</span>
          </label>
          <input
            id="transient-nhc"
            type="text"
            value={transientNhc}
            onChange={(event) => {
              onTransientNhcChange(event.target.value);
              onDirtyChange(true);
              if (event.target.value.trim()) {
                setNhcError("");
                if (error === NHC_REQUIRED_MESSAGE) {
                  setError("");
                }
              }
            }}
            autoComplete="off"
            aria-invalid={Boolean(nhcError)}
            aria-describedby={nhcError ? "transient-nhc-error" : undefined}
          />
          {nhcError && (
            <p id="transient-nhc-error" className="error-message">
              {nhcError}
            </p>
          )}
          <small>
            El NHC se utilizará únicamente para comprobar si ya existe un caso registrado para esta paciente y lateralidad. No se almacenará en el recurso FHIR ni se incluirá en las exportaciones del estudio.
          </small>
	        </div>
	        <div className="questionnaire-item">
	          <label htmlFor="care-setting">
	            Ámbito asistencial
	            <span className="required-asterisk">*</span>
	          </label>
	          <select
	            id="care-setting"
	            value={normalizeCareSetting(careSettingCode).code}
	            onChange={(event) => {
	              const selected = normalizeCareSetting(event.target.value);
	              onCareSettingChange(selected);
	              onDirtyChange(true);
	            }}
	            required
	          >
	            {CARE_SETTING_OPTIONS.map((option) => (
	              <option key={option.code} value={option.code}>
	                {option.display}
	              </option>
	            ))}
	          </select>
	        </div>
	        {canEnterStudyPatientCode && (
          <div className="questionnaire-item">
            <label htmlFor="study-patient-code">Código de estudio</label>
            <input
              id="study-patient-code"
              type="text"
              value={studyPatientCode}
              onChange={(event) => {
                onStudyPatientCodeChange(event.target.value);
                onDirtyChange(true);
                setStudyCodeError("");
                if (error === STUDY_PARTICIPANT_ERROR_MESSAGES.conflict) {
                  setError("");
                }
              }}
              autoComplete="off"
              aria-invalid={Boolean(studyCodeError)}
              aria-describedby={studyCodeError ? "study-patient-code-error" : undefined}
            />
            {studyCodeError && (
              <p id="study-patient-code-error" className="error-message">
                {studyCodeError}
              </p>
            )}
            <small>
              Si dispone del código de estudio, puede introducirlo ahora. Si se deja vacío, el caso quedará pendiente de asignación de código.
            </small>
            {studyCodeError && (
              <small>
                Puede dejar el código vacío y el caso quedará pendiente de asignación.
              </small>
            )}
          </div>
        )}
	        {questionnaire.item.map((item) => {
          // Si no está habilitado, no lo mostramos
          if (!isItemEnabled(item) || HIDDEN_LINK_IDS.has(item.linkId)) return null;

          if (item.type === "group") {
            return renderGroup(item);
          } else {
            const styleString =
              item._text?.extension?.find(
                (ext) =>
                  ext.url === "http://hl7.org/fhir/StructureDefinition/rendering-style"
              )?.valueString || "";
            const style = parseStyleString(styleString);

            return (
              <div
                id={item.linkId}
                key={item.linkId}
                className="questionnaire-item"
                style={style}
              >
                <label>
                  {item.text}
                  {item.required && <span className="required-asterisk">*</span>}
                </label>
              {renderInput(item)}
              </div>
            );
          }
        })}
      </div>
      <button className="save-btn" onClick={handleNextClick} disabled={validatingStudyCode}>
        {validatingStudyCode ? "Validando..." : "Siguiente"}
      </button>
      {requiredFieldsError && (
        <div className="error-message">
          {requiredFieldsError.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}
      {/* <button className="save-btn" onClick={() => { if (validate()) { eventContinue(answers); handleReset(); } } }>Añadir masa anexial</button> */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2>Confirmación</h2>
        {error && (
          <div className="error-message">
            {error.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        )}
        {/*<p>{error && <div className="error-message">{error}</div>}</p>*/}

        {/* Mostrar solo si todos los campos están completos*/}
        {!error && (
          <>
            <p>Pulse <b>continuar</b> para elaborar el informe.</p>
            <p><b>Si continúa no podrá volver a este cuestionario.</b></p>
            <button className="save" onClick={() => { event(answers); setIsModalOpen(false); }}>Continuar</button>
            {/* Mostrar solo si hay masa anexial */}
            {hasMass && (
              <button className="continue" onClick={() => { eventContinue(answers); handleReset(); setIsModalOpen(false)} }>Añadir masa anexial</button>)}
              <button className="cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
          </>
        )}
      </Modal>
    </>
  );
};

export default QuestionnaireForm;
