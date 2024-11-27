import React, { useState } from "react";
import '../assets/css/QuestionnaireForm.css';
import ApiService from "../services/ApiService";
import Modal from "./Modal";

const QuestionnaireForm = ({ questionnaire,event,eventContinue }) => {
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState(null);
  const [disabledFields, setDisabledFields] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleInputChange = (text, linkId, type, value, display) => {
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
      const newAnswer = { text,linkId, answer: [] };

      switch (type) {
        case "choice":
          newAnswer.answer = [{ valueCoding: { code: value, display: display } }];
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
      console.log(answer.text)
      console.log(condition.operator)
      switch (condition.operator) {
        case "exists":
          return condition.answerBoolean
            ? answer !== undefined
            : answer === undefined;
        case "=":
          if (condition.answerCoding) {
            //console.log(answer)
           // console.log(Array.isArray(answer.answer))
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
            console.log("---")
            console.log(answer.answer[0].valueCoding.code)
            console.log(condition.answerCoding.code)
            console.log("---")
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
        return (
          <select
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueCoding?.code || initialValue.valueCoding?.code || ""}
            onChange={(e) => {
              const selectedOption = e.target.options[e.target.selectedIndex]; 
              handleInputChange(item.text, item.linkId, item.type, e.target.value,selectedOption.text)}}
              disabled={isDisabled}
          >
            <option value="">Seleccione una opción</option>
            {item.answerOption.map((option) => (
              <option key={option.valueCoding.code} value={option.valueCoding.code}>
                {option.valueCoding.display}
              </option>
            ))}
          </select>
        );
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
        console.log("-----: " + item.text);
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
      <div style={{display:"none"}} className="questionnaire-responses">
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
