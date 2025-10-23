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
    const tipoMap = {
      'sólida': 'sólido',
      'quística': 'quístico',
      'sólido-quística': 'sólido-quístico'
    };
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
        console.log(responses)
        if (response && response.answer.length > 0) {

          const answer = response.answer[0];

          // Determinar el tipo de valor presente en la respuesta
          if (answer.valueCoding && answer.valueCoding.display) {
            return answer.valueCoding.display.toLowerCase(); // Campo display de valueCoding
          } else if (answer.valueString) {
            return answer.valueString.toLowerCase(); // Campo valueString
          } else if (answer.valueInteger !== undefined) {
            return answer.valueInteger.toString(); // Campo valueInteger convertido a string
          } else if (answer.valueDate) {
            return answer.valueDate; // Campo valueDate como está (ya es un string)
            }
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
      const MA_CONTENIDO_OTRO = getValue('MA_CONTENIDO_OTRO');
      const MA_SOL_VASC = getValue('MA_SOL_VASC');
      const MA_Q_CONTORNO = getValue('MA_Q_CONTORNO');
      const MA_Q_GROSOR = getValue('MA_Q_GROSOR');
      const MA_Q_VASC = getValue('MA_Q_VASC');
      const MA_PAPS = getValue('MA_PAPS');
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
      //const RES_CONCL = getValue('RES_CONCL');

      //Calcular logit y probabilidad      
      const logit = calcularLogit(MA_Q_CONTORNO, MA_SA, MA_Q_AS_VASC, MA_Q_P_VASC);
      const probabilidad = calcularProbabilidad(logit);
      
      const RES_SCORE = probabilidad.toFixed(4);    //no sé si esto se mostraría en el informe o solo para información del médico.
    
      //Construcción del informe
      let report = '';

      if (PAT_MA === '0') {                  //Si NO hay masa anexial
        const OD_M1 = getValue('OD_M1');
        const OD_M2 = getValue('OD_M2');
        const OD_FOL = getValue('OD_FOL');
        const OI_M1 = getValue('OI_M1');
        const OI_M2 = getValue('OI_M2');
        const OI_FOL = getValue('OI_FOL');

        report += `Anejo derecho de ${OD_M1} x ${OD_M2} mm con ${OD_FOL} folículo/s.\n `;
        report += `Anejo izquierdo de ${OI_M1} x ${OI_M2} mm con ${OI_FOL} folículo/s.\n`;
        
        return {
          text: report
        };
      } else {  //Si SÍ hay masa anexial
          const estructurasFemeninas = ['trompa'];
          if (['sólida', 'quística', 'sólido-quística'].includes(MA_TIPO)) {
            let dependencia = '';
            const contorno = MA_TIPO === 'sólida' ? MA_SOL_CONTORNO : MA_Q_CONTORNO;

            // Vascularización sólo para masas sólidas
            let vascularizacion_MA_SOL = '';
            if (MA_TIPO === 'sólida') {
              vascularizacion_MA_SOL = MA_SOL_VASC === 'ninguno (score color 1)' 
                ? ' Es <b>avascular</b>.' 
                : ` Su grado de vascularización es <b>${MA_SOL_VASC}</b>.`;
            }
            if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {   //Estructura o lateralidad INDEFINIDAS
              dependencia = 'De dependencia <b>indefinida</b>';
            } else {
              const estructura = MA_ESTRUCTURA;
              const lado = estructurasFemeninas.includes(estructura) 
                ? (MA_LADO === 'derecho' ? 'derecha' : MA_LADO === 'izquierdo' ? 'izquierda' : MA_LADO) : MA_LADO;
              dependencia = `Dependiente de <b>${estructura}</b> <b>${lado}</b>`;
            }
            const contenido = MA_CONTENIDO === 'otro' ? MA_CONTENIDO_OTRO : {MA_CONTENIDO};
            const tipoMasculino = tipoMap[MA_TIPO] || MA_TIPO;
            report += `${dependencia}, se objetiva formación de <b>${MA_M1} x ${MA_M2} x ${MA_M3} mm</b> <b>(${MA_VOL} cm³)</b> de aspecto <b>${tipoMasculino}</b> de contorno <b>${contorno}</b> y de contenido <b>${contenido}</b>.${vascularizacion_MA_SOL}.<br/>`;

            // Información adicional para masas quísticas y sólido-quísticas
            let vascularizacion_MA_Q = '';	
            if (MA_TIPO === 'quística' || MA_TIPO === 'sólido-quística') {
              vascularizacion_MA_Q = MA_Q_VASC === 'ninguno (score color 1)' 
                ? ' y es <b>avascular</b>' 
                : ` y su grado de vascularización es <b>${MA_Q_VASC}</b>`;
              report += `La pared mide <b>${MA_Q_GROSOR} mm</b>${vascularizacion_MA_Q}. El contorno es <b>${MA_Q_CONTORNO}</b>.<br/>`;
              // Papilas
              let vascularizacion_papila = '';
              vascularizacion_papila = MA_Q_P_VASC === 'ninguno (score color 1)'
                ? '<b>avascular</b>'
                : `con grado de vascularización <b>${MA_Q_P_VASC}</b>`;
              if (MA_PAPS === 'sí') {    
                report += `Contiene <b>${MA_Q_P} papila/s</b>, la mayor de ellas de <b>${MA_Q_P_M1} x ${MA_Q_P_M2} mm</b> de morfología <b>${MA_Q_P_CONTORNO}</b> y ${vascularizacion_papila}</b>.<br/>`;
              }
              //Tabiques.
              let vascularizacion_tabiques = '';
              vascularizacion_tabiques= MA_Q_T_VASC === 'ninguno (score color 1)' 
                ? ' y <b>avasculares</b>' 
                : ` y su grado de vascularización es <b>${MA_Q_T_VASC}</b>`;
              if (MA_Q_T === 'sí') {      
                report += `Los tabiques son <b>${MA_Q_T_TIPO}</b>, de grosor <b>${MA_Q_T_GROSOR} mm</b>${vascularizacion_tabiques}</b>. La formación tiene <b>${MA_Q_T_N} lóculo/s</b>.<br/>`;
              }
              //Área sólida.
              let vascularizacion_AS = '';
              vascularizacion_AS= MA_Q_AS_VASC === 'ninguno (score color 1)' 
                ? 'y es <b>avascular</b>' 
                : `con grado de vascularización <b>${MA_Q_AS_VASC}</b>`;
              if (MA_Q_AS === 'sí') {   
                report += `Contiene <b>${MA_Q_AS_N} porción/es sólida/s</b>, la mayor de ellas tiene un tamaño de <b>${MA_Q_AS_M1} x ${MA_Q_AS_M2} x ${MA_Q_AS_M3} mm</b> ${vascularizacion_AS}.<br/>`;
              }
            }
            //Esto ya no depende del tipo de masa anexial.
            if (MA_SA === 'sí') {   //Sombra acústica posterior.
            report += `Presenta sombra posterior.<br/>`;
            }
            if (MA_PS === 'sí') {   //Parénquima ovárico sano.
              report += `Tiene parénquima ovárico sano, de tamaño <b>${MA_PS_M1} x ${MA_PS_M2} x ${MA_PS_M3} mm</b>.<br/>`;
            }
            if (MA_ASC === 'sí') {    //Ascitis.
              report += `Presenta ascitis <b>${MA_ASC_TIPO}</b>.<br/>`;
            }
            if (MA_CARC === 'sí') {   //Carcinomatosis.
              report += 'Hay carcinomatosis.<br/>';
            }
            //report += `La probabilidad de que la masa anexial sea maligna es de ${(RES_SCORE ?? 0)* 100}%. \n`;
        }
      }
        return {
          text: report,
          score: RES_SCORE,
          text_score: `La probabilidad de que la masa anexial sea maligna es de ${(RES_SCORE ?? 0)* 100}%.`,
        };
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