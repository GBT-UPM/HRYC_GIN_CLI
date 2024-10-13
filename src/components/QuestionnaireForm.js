import React, { useState } from "react";

// Componente para renderizar el cuestionario basado en FHIR
const QuestionnaireForm = ({ questionnaire }) => {
  const [answers, setAnswers] = useState({});

  const handleInputChange = (linkId, value) => {
    setAnswers({
      ...answers,
      [linkId]: value,
    });
  };

  // Función para renderizar los diferentes tipos de inputs
  const renderInput = (item) => {
    switch (item.type) {
      case "choice":
        return (
          <select
            value={answers[item.linkId] || ""}
            onChange={(e) => handleInputChange(item.linkId, e.target.value)}
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
            value={answers[item.linkId] || ""}
            onChange={(e) => handleInputChange(item.linkId, e.target.value)}
          />
        );
      case "decimal":
        return (
          <input
            type="number"
            step="0.1"
            value={answers[item.linkId] || ""}
            onChange={(e) => handleInputChange(item.linkId, e.target.value)}
          />
        );
      case "text":
        return (
          <input
            type="text"
            value={answers[item.linkId] || ""}
            onChange={(e) => handleInputChange(item.linkId, e.target.value)}
          />
        );
      default:
        return null;
    }
  };

  // Función para renderizar grupos de preguntas
  const renderGroup = (itemGroup) => {
    return (
      <div key={itemGroup.linkId}>
        <h3>{itemGroup.text}</h3>
        {itemGroup.item.map((item) => (
          <div key={item.linkId}>
            <label>{item.text}</label>
            {renderInput(item)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h2>{questionnaire.title}</h2>
      {questionnaire.item.map((item) => {
        if (item.type === "group") {
          return renderGroup(item);
        } else {
          return (
            <div key={item.linkId}>
              <label>{item.text}</label>
              {renderInput(item)}
            </div>
          );
        }
      })}
      <div>
        <h3>Respuestas:</h3>
        <pre>{JSON.stringify(answers, null, 2)}</pre>
      </div>
    </div>
  );
};

export default QuestionnaireForm;
