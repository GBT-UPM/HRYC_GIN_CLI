import React from 'react';
import PropTypes from 'prop-types';
import '../assets/css/ResponsesSummary.css';

const ResponsesSummary = ({ responses,event }) => {
    const renderAnswer = (answer) => {
      if (answer.valueCoding) {
        return `${answer.valueCoding.display} (${answer.valueCoding.code})`;
      }
      if (answer.valueDecimal !== undefined) {
        return answer.valueDecimal;
      }
      if (answer.valueString) {
        return answer.valueString;
      }
      if (answer.valueDate) {
        return answer.valueDate;
      }
      // Añadir más tipos de respuesta según sea necesario
      return JSON.stringify(answer);
    };
  
    return (
      <div className="responses-summary">
        <h3>Resumen de Respuestas</h3>
        <ul>
          {responses.map((response, index) => (
            <li key={index}>
             {/*} <strong>{response.linkId}:</strong> {*/}
              <strong>{response.text}:</strong> 
              {response.answer.map((ans, i) => (
                <span key={i}>{renderAnswer(ans)}</span>
              ))}
            </li>
          ))}
        </ul>
        <button className="save-btn" onClick={event}>Volver Cuestionario</button>
      </div>
    );
  };
  
  ResponsesSummary.propTypes = {
    responses: PropTypes.arrayOf(
      PropTypes.shape({
        linkId: PropTypes.string.isRequired,
        answer: PropTypes.arrayOf(PropTypes.object).isRequired,
      })
    ).isRequired,
  };
  
  export default ResponsesSummary;