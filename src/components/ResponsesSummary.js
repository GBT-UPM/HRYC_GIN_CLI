import React from 'react';
import PropTypes from 'prop-types';
import '../assets/css/ResponsesSummary.css';

const ResponsesSummary = ({ responses, event }) => {
    /* // Función para renderizar las respuestas 
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
    }; */

    // Función para calcular logit(p)
    const calcularLogit = (contorno, sombra, vascAreaSolida, vascPapila) =>{
      let logit = -3.625;

      //Cálculo coeficientes
      if (contorno === 'irregular') logit += 1.299;

      if (sombra === 'no') logit += 1.847;

      if (vascAreaSolida === 'nula (score color 1)' || vascAreaSolida === 'leve (score color 2)') logit += 2.209;
      else if (vascAreaSolida === 'moderada (score color 3)' || vascAreaSolida === 'abundante (score color 4)') logit += 2.967

      if (vascPapila === 'nula (score color 1)' || vascPapila === 'leve (score color 2)') logit += 1.253;
      else if (vascPapila === 'moderada (score color 3)' || vascPapila === 'abundante (score color 4)') logit +=1.988;

      return logit;
    }

    // Función para calcular la probabilidad.
    const calcularProbabilidad = (logit) => {
      return 1 / (1 + Math.exp(-logit));
    };

    // Función para generar el informe médico
    const generateReport = () => {
      const getValue = (id) => {
        const response = responses.find((resp) => resp.linkId.toLowerCase() === id.toLowerCase());
        if (response && response.answer.length > 0) {
          const value = response.answer[0].valueCoding.display || '';   //Acceso al campo display. PROBLEMA: las preguntas de texto libre (como la conclusión) no tienen campo display
          return value.toLowerCase();  // Convierto el valor a minúsculas
        }
        return '';  //Si no encuentra nada.
      };

      const PAT_MA = getValue('PAT_MA');
      const MA_TIPO = getValue('MA_TIPO');
      const MA_ESTRUCTURA = getValue('MA_ESTRUCTURA');
      const MA_LADO = getValue('MA_LADO');
      const MA_M1 = getValue('MA_M1');
      const MA_M2 = getValue('MA_M2');
      const MA_M3 = getValue('MA_M3');
      const MA_VOL = (parseFloat(MA_M1) * parseFloat(MA_M2) * parseFloat(MA_M3) * 0.52).toFixed(2);
      const MA_SOL_CONTORNO = getValue('MA_SOL_CONTORNO');
      const MA_CONTENIDO = getValue('MA_CONTENIDO');
      const MA_SOL_VASC = getValue('MA_SOL_VASC');
      const MA_Q_CONTORNO = getValue('MA_Q_CONTORNO');
      const MA_Q_GROSOR = getValue('MA_Q_GROSOR');
      const MA_Q_VASC = getValue('MA_Q_VASC');
      const MA_Q_P = getValue('MA_Q_P');
      const MA_Q_P_M1 = getValue('MA_Q_P_M1');
      const MA_Q_P_M2 = getValue('MA_Q_P_M2');
      const MA_Q_P_CONTORNO = getValue('MA_Q_P_CONTORNO');
      const MA_Q_P_VASC = getValue('MA_Q_P_VASC');
      const MA_Q_T = getValue('MA_Q_T');
      const MA_Q_T_TIPO = getValue('MA_Q_T_TIPO');
      const MA_Q_T_GROSOR = getValue('MA_Q_T_GROSOR');
      const MA_Q_T_VASC = getValue('MA_Q_T_VASC');
      const MA_Q_T_N = getValue('MA_Q_T_N');
      const MA_Q_AS = getValue('MA_Q_AS');
      const MA_Q_AS_N = getValue('MA_Q_AS_N');
      const MA_Q_AS_M1 = getValue('MA_Q_AS_M1');
      const MA_Q_AS_M2 = getValue('MA_Q_AS_M2');
      const MA_Q_AS_M3 = getValue('MA_Q_AS_M3');
      const MA_Q_AS_VASC = getValue('MA_Q_AS_VASC');
      const MA_SA = getValue('MA_SA');
      const MA_PS = getValue('MA_PS');
      const MA_PS_M1 = getValue('MA_PS_M1');
      const MA_PS_M2 = getValue('MA_PS_M2');
      const MA_PS_M3 = getValue('MA_PS_M3');
      const MA_ASC = getValue('MA_ASC');
      const MA_ASC_TIPO = getValue('MA_ASC_TIPO');
      const MA_CARC = getValue('MA_CARC');
      const RES_CONCL = getValue('RES_CONCL');

      //Calcular logit y probabilidad      
      const logit = calcularLogit(MA_Q_CONTORNO, MA_SA, MA_Q_AS_VASC, MA_Q_P_VASC);
      const probabilidad = calcularProbabilidad(logit);
      
      const RES_SCORE = probabilidad.toFixed(4);    //no sé si esto se mostraría en el informe o solo para información del médico.
    
      //Construcción del informe
      let report = '';

      if (PAT_MA === 'no') {                  //Si NO hay masa anexial
        const OD_M1 = getValue('OD_M1');
        const OD_M2 = getValue('OD_M2');
        const OD_FOL = getValue('OD_FOL');
        const OI_M1 = getValue('OI_M1');
        const OI_M2 = getValue('OI_M2');
        const OI_FOL = getValue('OI_FOL');

        report += `Anejo derecho de ${OD_M1} x ${OD_M2} mm con ${OD_FOL}.\n `;
        report += `Anejo izquierdo de ${OI_M1} x ${OI_M2} mm con ${OI_FOL}.\n`;
      
      } else {    //Si SÍ hay masa anexial
          if (MA_TIPO === 'sólida') {   //Masa anexial SÓLIDA
            if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {   //Estructura o lateralidad INDEFINIDAS
              report += `De dependencia indefinida, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm (${MA_VOL} mm³) de aspecto ${MA_TIPO} de contorno ${MA_SOL_CONTORNO}, de contenido ${MA_CONTENIDO} y vascularización ${MA_SOL_VASC}.\n`; 
            } else {    
              report += `Dependiente de ${MA_ESTRUCTURA} ${MA_LADO}, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm (${MA_VOL} mm³) de aspecto ${MA_TIPO} de contorno ${MA_SOL_CONTORNO}, de contenido ${MA_CONTENIDO} y vascularización ${MA_SOL_VASC}.\n`;
            }
          } else if (MA_TIPO === 'quística' || MA_TIPO === 'sólido_quística') {   //Masa anexial QUÍSTICA o SÓLIDO-QUÍSTICA
            if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {     //Estructura o lateralidad INDEFINIDAS
              report += `De dependencia indefinida, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm (${MA_VOL} mm³) de aspecto ${MA_TIPO} de contorno ${MA_Q_CONTORNO} y de contenido ${MA_CONTENIDO}.\n`;
            } else {
              report += `Dependiente de ${MA_ESTRUCTURA} ${MA_LADO}, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm (${MA_VOL} mm³) de aspecto ${MA_TIPO} de contorno ${MA_SOL_CONTORNO} y de contenido ${MA_CONTENIDO}.\n`;
            }
            
            report += `La pared mide ${MA_Q_GROSOR} y su vascularización es ${MA_Q_VASC}.\n`;

            if (MA_Q_CONTORNO === 'irregular') {    //Contorno irregular.
              report += `Contiene ${MA_Q_P} papila/s, la mayor de ellas de ${MA_Q_P_M1} x ${MA_Q_P_M2} mm de morfología ${MA_Q_P_CONTORNO}, con vascularización ${MA_Q_P_VASC}.\n`;
            }
            
            if (MA_Q_T === 'sí') {      //Presencia de tabiques.
              report += `Los tabiques son ${MA_Q_T_TIPO}, de grosor ${MA_Q_T_GROSOR} y vascularización ${MA_Q_T_VASC}. La formación tiene ${MA_Q_T_N} lóculos.\n`;
            }

            if (MA_Q_AS === 'sí') {   //Área sólida.
              report += `Contiene ${MA_Q_AS_N} porción/es sólida/s, la mayor de ellas tiene un tamaño de ${MA_Q_AS_M1} x ${MA_Q_AS_M2} x ${MA_Q_AS_M3} mm con vascularización ${MA_Q_AS_VASC}.\n`;
            }
          }
          //Esto ya no depende del tipo de masa anexial.

          if (MA_SA === 'sí') {   //Sombra acústica posterior.
            report += `Presenta sombra posterior.\n`;
          }

          if (MA_PS === 'sí') {   //Parénquima ovárico sano.
            report += `Tiene parénquima ovárico sano, de tamaño ${MA_PS_M1} x ${MA_PS_M2} x ${MA_PS_M3} mm.\n`;      
          }

          if (MA_ASC === 'sí') {    //Ascitis.
            report += `Presenta ascitis de tipo ${MA_ASC_TIPO}.\n`;
          }

          if (MA_CARC === 'sí') {   //Carcinomatosis.
            report += 'Hay carcinomatosis.\n';
          }

          report += `La probabilidad de que la masa anexial sea maligna es de ${RES_SCORE}. \n ${RES_CONCL}`;
        }

        return report;
    };

    return (
      <div className="responses-summary">
        <h3>Informe Médico</h3>
        <pre>{generateReport()}</pre>
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
    event: PropTypes.func.isRequired,
  };
  
  export default ResponsesSummary;