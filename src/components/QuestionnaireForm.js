import React, { useState } from "react";
import '../assets/css/QuestionnaireForm.css';
import ApiService from "../services/ApiService";

const QuestionnaireForm = ({ questionnaire,event,answersF }) => {
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState(null);
  const handleInputChange = (text,linkId, type, value,display) => {
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
      switch (condition.operator) {
        case "exists":
          return condition.answerBoolean
            ? answer !== undefined
            : answer === undefined;
        case "=":
          if (condition.answerCoding) {
            console.log(answer)
            console.log(Array.isArray(answer.answer))
            return (
              answer.answer &&
              Array.isArray(answer.answer) &&
              answer.answer.length > 0 &&
              answer.answer[0].valueCoding.code === condition.answerCoding.code
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

    switch (item.type) {
      case "choice":
        return (
          <select
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueCoding?.code || initialValue.valueCoding?.code || ""}
            onChange={(e) => {
              const selectedOption = e.target.options[e.target.selectedIndex]; 
              handleInputChange(item.text, item.linkId, item.type, e.target.value,selectedOption.text)}}
          >
            <option value="">Select an option</option>
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
          />
        );
      case "decimal":
        return (
          <input
            type="number"
            step="0.1"
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueDecimal || initialValue.valueDecimal || ""}
            onChange={(e) => handleInputChange(item.text,item.linkId, item.type, e.target.value)}
          />
        );
      case "integer":
        return (
          <input
            type="number"
            step="1"
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueInteger || initialValue.valueInteger || ""}
            onChange={(e) => handleInputChange(item.text,item.linkId, item.type, e.target.value)}
          />
        );
      case "string":
      case "text":
        return (
          <input
            type="text"
            value={answers.find((a) => a.linkId === item.linkId)?.answer[0].valueString || initialValue.valueString || ""}
            onChange={(e) => handleInputChange(item.text,item.linkId, item.type, e.target.value)}
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
      setError("Por favor, complete todos los campos requeridos.");
      return false;
    }else{
      return true;
    }
  }

  const renderGroup = (itemGroup) => {
 //   if (!checkEnableWhen(itemGroup.enableWhen)) return null;
    return (
      <div key={itemGroup.linkId} className="questionnaire-group">
        <h3 className="questionnaire-group-title">{itemGroup.text}</h3>
        {itemGroup.item.map((item) => (
          <div key={item.linkId} className="questionnaire-item">
            <label>
              {item.text}
              {item.required && <span className="required-asterisk">*</span>}
            </label>
            
            {renderInput(item)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="questionnaire-container">
      <h2 className="questionnaire-title">{questionnaire.title}</h2>
      
      {questionnaire.item.map((item) => {
       if (!checkEnableWhen(item.enableWhen)) return null;
        if (item.type === "group") {
          return renderGroup(item);
        } else {
          return (
            <div key={item.linkId} className="questionnaire-item">
              <label>{item.text}</label>
              {item.required && <span className="required-asterisk">*</span>}
              {renderInput(item)}
            </div>
          );
        }
      })}
       {error && <div className="error-message">{error}</div>}
      <div className="questionnaire-responses">
        <h3>Respuestas:</h3>
        <pre>{JSON.stringify({ resourceType: "QuestionnaireResponse", status: "completed", item: answers }, null, 2)}</pre>
      </div>
      <button className="save-btn" onClick={()=>{if(validate()){event(answers)}}}>Guardar Respuestas</button>
    </div>
  );
};

export default QuestionnaireForm;
