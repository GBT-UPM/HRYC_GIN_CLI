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
  
    const generateMedicalReport = () => {
      if (injure === 'Sólido') {
        const variables = {
          organ: '',
          side: '',
          dimensions: '',
          contour: '',
          vascularization: '',
        };
  
        responses.forEach(response => {
          if (response.linkId === 'organ') variables.organ = response.answer[0].valueString;
          if (response.linkId === 'side') variables.side = response.answer[0].valueString;
          if (response.linkId === 'dimensions') variables.dimensions = response.answer[0].valueString;
          if (response.linkId === 'contour') variables.contour = response.answer[0].valueString;
          if (response.linkId === 'vascularization') variables.vascularization = response.answer[0].valueString;
        });
  
        return `Dependiente del ${variables.organ} ${variables.side} se objetiva formación de ${variables.dimensions} mm de aspecto sólido de contorno ${variables.contour}, intensamente vascularizado (score color ${variables.vascularization}).`;
      } else if (injure === 'quístico') {
        return 'El patio de mi casa es particular';
      } else if (injure === 'sólido-quístico') {
        return 'Este es un ejemplo de texto para el caso de una lesión sólida-quística.';
      }
      return 'No hay información disponible para el tipo de lesión especificado.';
    };

    return (
      <div className="responses-summary">
        <h3>Resumen de respuestas</h3>
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
        <h3>Informe ginecológico</h3>
        <p>{generateMedicalReport()}</p>
        <button className="save-btn" onClick={event}>Volver al cuestionario</button>
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
    injure: PropTypes.string.isRequired,
  };
  
  export default ResponsesSummary;