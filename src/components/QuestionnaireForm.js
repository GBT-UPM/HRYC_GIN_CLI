import React, { useState } from "react";
import '../assets/css/QuestionnaireForm.css';
import ApiService from "../services/ApiService";
import Modal from "./Modal";

const QuestionnaireForm = ({ questionnaire,event,eventContinue }) => {
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState(null);
  const [disabledFields, setDisabledFields] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInputChange = (questionText,linkId, type, value,display) => {
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
          //console.log(value)
          //console.log(display)
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

      if (existingAnswerIndex >= 0) {
        const updatedAnswers = [...prevAnswers];
        updatedAnswers[existingAnswerIndex] = newAnswer;
        return updatedAnswers;
      } else {
        return [...prevAnswers, newAnswer];
      }
   
    });
   
  };

  const checkEnableWhen = (enableWhen) => {
    if (!enableWhen) return true;

    return enableWhen.every((condition) => {
      const answer = answers.find(
        (answer) => answer.linkId === condition.question
      );
      if (!answer) return false;
      switch (condition.operator) {
        case "exists":
          return condition.answerBoolean
            ? answer !== undefined
            : answer === undefined;
        case "=":
          if (condition.answerCoding) {
            return (
              answer.answer &&
              Array.isArray(answer.answer) &&
              answer.answer.length > 0 &&
              answer.answer[0].valueCoding.code === condition.answerCoding.code
            );
          }
          return false;
        case "!=":
          if (condition.answerCoding) {
            return (
              answer.answer &&
              Array.isArray(answer.answer) &&
              answer.answer.length > 0 &&
              answer.answer[0].valueCoding.code !== condition.answerCoding.code
            );
          }
            return false;
        default:
          return false;
      }
    });
  };

  const renderInput = (item) => {
    const initialValue = item.initial?.[0] || {};
    const isDisabled = disabledFields.includes(item.linkId);
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
        // Extrae las opciones de respuesta, considerando `valueString` o `valueCoding.display`.
        const options = item.answerOption.map((option) => {
          if (option.valueString) {
            return { value: option.valueString, label: option.valueString };
          } else if (option.valueCoding) {
            return { value: option.valueCoding.code, label: option.valueCoding.display };
          }
          return null;
        }).filter(Boolean);
        if (isDropDown) {
          // Renderiza un dropdown.
          return (
            <select
              value={answers.find((a) => a.linkId === item.linkId)?.answer[0]?.valueString ||
                answers.find((a) => a.linkId === item.linkId)?.answer[0]?.valueCoding?.code ||
                initialValue?.valueString || ""}
              onChange={(e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                handleInputChange(item.text, item.linkId, item.type, [{ valueString: e.target.value, valueCoding: { code: e.target.value, display:selectedOption.text } }], selectedOption.text);
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
        }else if (item.repeats) {
          // Renderiza un grupo de checkboxes para opciones múltiples.
          return (
            <div>
              {options.map((option, index) => (
                <div key={index}>
                  <input
                    type="checkbox"
                    id={`${item.linkId}-${index}`}
                    value={option.value}
                    checked={answers
                      .find((a) => a.linkId === item.linkId)
                      ?.answer.some((ans) =>
                        ans.valueString === option.value || ans.valueCoding?.code === option.value
                      ) || false}
                    onChange={(e) => {
                      const selectedOptions = answers.find((a) => a.linkId === item.linkId)?.answer || [];
                      const newSelectedOptions = e.target.checked
                        ? [...selectedOptions, { valueString: option.value, valueCoding: { code: option.value } }]
                        : selectedOptions.filter((ans) =>
                            ans.valueString !== option.value && ans.valueCoding?.code !== option.value
                          );
                      handleInputChange(item.text, item.linkId, item.type, newSelectedOptions, option.label);
                    }}
                    disabled={isDisabled}
                  />
                  <label htmlFor={`${item.linkId}-${index}`}>{option.label}</label>
                </div>
              ))}
            </div>
          );
        } else {
          // Renderiza un grupo de botones de radio para una opción única.
          return (
            <div>
              {options.map((option, index) => (
                <div className="radio-container"  key={index}>
                  <input
                    type="radio"
                    id={`${item.linkId}-${index}`}
                    name={item.linkId}
                    value={option.value}
                    checked={answers
                      .find((a) => a.linkId === item.linkId)
                      ?.answer.some((ans) =>
                        ans.valueString === option.value || ans.valueCoding?.code === option.value
                      ) || false}
                    onChange={(e) =>
                      handleInputChange(item.text, item.linkId, item.type, [{ valueString: option.value, valueCoding: { code: option.value } }], option.label)
                    }
                    disabled={isDisabled}
                  />
                  <label htmlFor={`${item.linkId}-${index}`}>{option.label}</label>
                </div>
              ))}
            </div>
          );
        }
        /*if (item.repeats) {
          return (
            <div>
              {item.answerOption.map((option, index) => (
                <div key={index}>
                  <input
                    type="checkbox"
                    id={`${item.linkId}-${index}`}
                    value={option.valueString}
                    checked={answers.find((a) => a.linkId === item.linkId)?.answer.some((ans) => ans.valueString === option.valueString) || false}
                    onChange={(e) => {
                      const selectedOptions = answers.find((a) => a.linkId === item.linkId)?.answer || [];
                      const newSelectedOptions = e.target.checked
                        ? [...selectedOptions, { valueString: option.valueString }]
                        : selectedOptions.filter((ans) => ans.valueString !== option.valueString);
                      handleInputChange(item.text, item.linkId, item.type, newSelectedOptions, option.valueString);
                    }}
                    disabled={isDisabled}
                  />
                  <label htmlFor={`${item.linkId}-${index}`}>{option.valueString}</label>
                </div>
              ))}
            </div>
          );
        } else {
          return (
            <select
              value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueString || initialValue.valueString || ""}
              onChange={(e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                handleInputChange(item.text, item.linkId, item.type, e.target.value, selectedOption.text);
              }}
              disabled={isDisabled}
            >
              <option value="">Seleccione una opción</option>
              {item.answerOption.map((option, index) => (
                <option key={index} value={option.valueString}>
                  {option.valueString}
                </option>
              ))}
            </select>
          );
        }*/
      case "date":
        return (
          <input
            type="date"
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueDate || initialValue.valueDate || ""}
            onChange={(e) => handleInputChange(item.text,item.linkId, item.type, e.target.value)}
            disabled={isDisabled}
          />
        );
      case "decimal":
        return (
          <input
            type="number"
            step="0.1"
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueDecimal || initialValue.valueDecimal || ""}
            onChange={(e) => handleInputChange(item.text,item.linkId, item.type, e.target.value)}
            disabled={isDisabled}
          />
        );
      case "integer":
        return (
          <input
            type="number"
            step="1"
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueInteger || initialValue.valueInteger || ""}
            onChange={(e) => handleInputChange(item.text,item.linkId, item.type, e.target.value)}
            disabled={isDisabled}
          />
        );
      case "string":
        return (
          <input
            type="text"
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueString || initialValue.valueString || ""}
            onChange={(e) => handleInputChange(item.text,item.linkId, item.type, e.target.value)}
            disabled={isDisabled}
          />
        );
      case "text":
        return (
          <textarea
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueString || initialValue.valueString || ""}
            onChange={(e) => handleInputChange(item.text,item.linkId, item.type, e.target.value)}
            disabled={isDisabled}
          />
        );
      default:
        return null;
    }
  };
  const getRequiredItems = (items) => {
    let requiredItems = [];
    items.forEach(item => {
      if (item.required) {
        requiredItems.push(item);
      }
      if (item.item && item.item.length > 0) {
        requiredItems = requiredItems.concat(getRequiredItems(item.item));
      }
    });
    return requiredItems;
  };
  const validate = () => {
    // Validar campos requeridos
    const requiredItems = getRequiredItems(questionnaire.item);
    const missingAnswers = requiredItems.filter(item => {
      if (!checkEnableWhen(item.enableWhen)) return false;
      const answer = answers.find(a => a.linkId === item.linkId);
      return !answer || !answer.answer || answer.answer.length === 0;
    });

    if (missingAnswers.length > 0) {
      setError("Hay campos sin rellenar. ¿Continuar de todos modos?");
      return false;
    }else{
      setError(null);
      return true;
    }
  }
   const handleReset = () => {
    const preservedLinkIds = [
      "5800515049283", // Nombre
      "138324799523",  // NHC
      "3772124358948", // Edad
      "9825756855092", // FUR
      "4903966501003"  // ¿Hay alguna masa anexial?
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
  const renderGroup = (itemGroup) => {
    return (
      <div key={itemGroup.linkId} className="questionnaire-group">
        <h3 className="questionnaire-group-title">{itemGroup.text}</h3>
        <div className="questionnaire-container-group">
        {itemGroup.item.map((item) => {
          const styleString = item._text?.extension?.find(ext => ext.url === "http://hl7.org/fhir/StructureDefinition/rendering-style")?.valueString || "";
          const style = parseStyleString(styleString);
          if (!checkEnableWhen(item.enableWhen)) return null;
          return item.type === "group" ? (
            renderGroup(item)
          ) : (
            <div id={item.linkId} key={item.linkId} className="questionnaire-item" style={style}>
              <label>
                {item.text}
                {item.required && <span className="required-asterisk">*</span>}
              </label>
              {renderInput(item)}
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
      {questionnaire.item.map((item) => {
        if (!checkEnableWhen(item.enableWhen)) return null;
        if (item.type === "group" ) {
          return renderGroup(item);
        } else {
          const styleString = item._text?.extension?.find(ext => ext.url === "http://hl7.org/fhir/StructureDefinition/rendering-style")?.valueString || "";
          const style = parseStyleString(styleString);
  
          return (
            <div id={item.linkId} key={item.linkId} className="questionnaire-item" style={style}>
              <label>{item.text}
                {item.required && <span className="required-asterisk">*</span>}
              </label>
              {renderInput(item)}
            </div>
          );
        }
      })}
      </div>
      <div style={{display:"block"}} className="questionnaire-responses">
        <h3>Respuestas:</h3>
        <pre>{JSON.stringify({ resourceType: "QuestionnaireResponse", status: "completed", item: answers }, null, 2)}</pre>
      </div>
      <button className="save-btn" onClick={() => { validate(); setIsModalOpen(true) } }>Guardar Respuestas</button>
      {/* <button className="save-btn" onClick={() => { if (validate()) { eventContinue(answers); handleReset(); } } }>Añadir masa anexial</button> */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2>Confirmación</h2>
        <p>{error && <div className="error-message">{error}</div>}</p>
        <p>Puede <b>guardar</b> los resultados o <b>continuar</b> añadiendo más masas anexiales.</p>
        <button className="save" onClick={() => { if (validate()) { event(answers); setIsModalOpen(false); } }}>Guardar</button>
        <button className="continue" onClick={() => { if (validate()) { eventContinue(answers); handleReset(); setIsModalOpen(false)} } }>Continuar</button>
        <button className="cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
      </Modal>
    </>
  );
};

export default QuestionnaireForm;
