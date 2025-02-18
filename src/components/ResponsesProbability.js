import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import '../assets/css/ResponsesSummary.css';
import DOMPurify from 'dompurify';
import '../assets/css/ResponsesProbability.css';
import jsPDF from 'jspdf';
import LogoHRYC from "../assets/images/LogoHRYC.jpg";

import { useKeycloak } from '@react-keycloak/web';
import { useEncounterTemplate } from "../hooks/useEncounterTemplate";
import { useObservationTemplate } from "../hooks/useObservationTemplate";
import { useImageStudyTemplate } from "../hooks/useImageStudyTemplate";
import ApiService from '../services/ApiService';
import { generateId } from '../screens/QuestionnaireScreen';
import { generatePeriod } from '../screens/QuestionnaireScreen';


const ResponsesProbability = ({ responses, event }) => {
  const [reports, setReports] = useState([]);
  const [observations, setObservations] = useState([]);
  //nuevo
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
  const [probability, setProbality] = useState(false);
  const [encounterId, setEncounterId] = useState("");
  const [error, setError] = useState(null);
  const [allResponses, setAllResponses] = useState([]);
  const { keycloak, initialized } = useKeycloak();
  const [questionnaire, setQuestionnaire] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [practitioner, setPractitioner] = useState("");
  const [practitionerName, setPractitionerName] = useState("");
  const { generateEncounter } = useEncounterTemplate();
  const { generateObservation } = useObservationTemplate();
  const { generateImagingStudy } = useImageStudyTemplate();


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
    useEffect(() => {
    console.log("ENTRA");
    console.log("Respuestas:" + responses);

    for (const response of responses) {
      const repo = generateReport(response)
      setReports((prev) => [...prev, repo]);
    }

  }, []);
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
    const generateReport = (res) => {

      const getValue = (id) => {
        const response = res.item.find((resp) => resp.linkId.toLowerCase() === id.toLowerCase());
 
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

        report += `Anejo derecho de ${OD_M1} x ${OD_M2} mm con ${OD_FOL} folículo/s.<br/> `;
        report += `Anejo izquierdo de ${OI_M1} x ${OI_M2} mm con ${OI_FOL} folículo/s.<br/>`;
      
      } else {    //Si SÍ hay masa anexial
          if (MA_TIPO === 'sólida') {   //Masa anexial SÓLIDA
            if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {   //Estructura o lateralidad INDEFINIDAS
              report += `De dependencia <b>indefinida</b>, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm <b>(${MA_VOL} mm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${MA_SOL_CONTORNO}</b>, de contenido <b>${MA_CONTENIDO}</b> y vascularización <b>${MA_SOL_VASC}</b>.<br/>`; 
            } else {    
              report += `Dependiente de <b>${MA_ESTRUCTURA}</b> en lado <b>${MA_LADO}</b>, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm <b>(${MA_VOL} mm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${MA_SOL_CONTORNO}</b>, de contenido <b>${MA_CONTENIDO}</b> y vascularización <b>${MA_SOL_VASC}</b>.<br/>`;
            }
          } else if (MA_TIPO === 'quística' || MA_TIPO === 'sólido-quística') {   //Masa anexial QUÍSTICA o SÓLIDO-QUÍSTICA
            if (MA_ESTRUCTURA === 'indefinido' || MA_LADO === 'indefinido') {     //Estructura o lateralidad INDEFINIDAS
              report += `De dependencia <b>indefinida</b>, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm <b>(${MA_VOL} mm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${MA_Q_CONTORNO}</b> y de contenido <b>${MA_CONTENIDO}</b>.<br/>`;
            } else {
              report += `Dependiente de <b>${MA_ESTRUCTURA}</b> en lado <b>${MA_LADO}</b>, se objetiva formación de ${MA_M1} x ${MA_M2} x ${MA_M3} mm <b>(${MA_VOL} mm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${MA_Q_CONTORNO}</b> y de contenido <b>${MA_CONTENIDO}</b>.<br/>`;
            }
            
            report += `La pared mide <b>${MA_Q_GROSOR} mm</b> y su vascularización es <b>${MA_Q_VASC}</b>.<br/>`;

            if (MA_Q_CONTORNO === 'irregular') {    //Contorno irregular.
              report += `Contiene <b>${MA_Q_P} papila/s</b>, la mayor de ellas de <b>${MA_Q_P_M1} x ${MA_Q_P_M2} mm</b> de morfología <b>${MA_Q_P_CONTORNO}</b>, con vascularización <b>${MA_Q_P_VASC}</b>.<br/>`;
            }
            
            if (MA_Q_T === 'sí') {      //Presencia de tabiques.
              report += `Los tabiques son <b>${MA_Q_T_TIPO}</b>, de grosor <b>${MA_Q_T_GROSOR} mm</b> y vascularización <b>${MA_Q_T_VASC}</b>. La formación tiene <b>${MA_Q_T_N} lóculo/s</b>.<br/>`;
            }

            if (MA_Q_AS === 'sí') {   //Área sólida.
              report += `Contiene <b>${MA_Q_AS_N} porción/es sólida/s</b>, la mayor de ellas tiene un tamaño de <b>${MA_Q_AS_M1} x ${MA_Q_AS_M2} x ${MA_Q_AS_M3} mm</b> con vascularización <b>${MA_Q_AS_VASC}</b>.<br/>`;
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
            report += `Presenta ascitis de tipo <b>${MA_ASC_TIPO}</b>.<br/>`;
          }

          if (MA_CARC === 'sí') {   //Carcinomatosis.
            report += 'Hay carcinomatosis.<br/>';
          }

          //report += `La probabilidad de que la masa anexial sea maligna es de <b>${RES_SCORE}</b>. <br/>`;
        }

        return {
          text: report,
          score: RES_SCORE
        };
    };
  /**
   * Maneja el cambio de texto en la observación del reporte de índice `index`.
   */
    const handleObservationChange = (index, newValue) => {
      setObservations((prev) => {
        const updated = [...prev];
        updated[index] = newValue;
        return updated;
      });
      console.log("Conclusión: " + observations);
    };
    function MyComponent({ reportHtml }) {
      const sanitizedHtml = DOMPurify.sanitize(reportHtml);
      
      return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
    }
    /**
     * Ejemplo de función que maneje el click del botón en cada reporte.
     * Podrías hacer lo que necesites (guardar, eliminar, etc.)
     */
    const handleSaveButtonClick = async (index) => {
      console.log(`Botón de guardado clicado`);

      console.log("Index: " + index);

  
      setProbality(true);
  
      //const firstResponse = responses[index];
      var specificAnswer = responses.find(answer => answer.linkId === "PAT_NHC");
      const patientId = specificAnswer?.answer?.[0]?.valueString || '';
      console.log("NHC paciente: " + patientId);
      specificAnswer = responses.find(answer => answer.linkId === "PAT_IND");
      const observation = specificAnswer?.answer?.[0]?.valueString || '';
  
      const encId = generateId();
      const obsId = generateId();
      const imgStuId = generateId();
      const serieId = generateId();
      setEncounterId(encId);
      const Encounter = generateEncounter(encId, patientId, practitioner, practitionerName, generatePeriod());
      const Observation = generateObservation(obsId, encId, patientId, imgStuId, observation);
      const ImageStudy = generateImagingStudy(imgStuId, encId, patientId, serieId);
  
      const successfulResponses = [];
      try {
        const encounter = await ApiService(keycloak.token, 'POST', `/fhir/Encounter`, Encounter);
        if (encounter.status === 200) {
  
          const observation = await ApiService(keycloak.token, 'POST', `/fhir/Observation`, Observation);
          console.log("observation: " + observation.status)
          const imageStudy = await ApiService(keycloak.token, 'POST', `/fhir/ImagingStudy`, ImageStudy);
          console.log("imageStudy: " + imageStudy.status)
  
         
  
          for (const qResponse of responses) {
            // Aquí puedes procesar cada respuesta
            console.log("Response --------------")
            // Aquí puedes añador la lógica para enviar las respuestas a un servidor o guardarlas localmente 
            try {
              qResponse.partOf = [
                {
                  reference: `Encounter/${encId}`
                }
              ];
              const response = await ApiService(keycloak.token, 'POST', `/fhir/QuestionnaireResponse`, qResponse);
              if (response.status === 200) {
                console.log(response)
                successfulResponses.push(qResponse);
              } else {
                throw new Error(`Error en la respuesta: ${response.status}`);
              }
            } catch (error) {
              console.error("Error al guardar la respuesta:", error);
              setError("Error al guardar la respuesta.");
            }
          }
            event();
        } else {
          throw new Error(`Error en el encounter: ${encounter.status}`);
        }
      } catch (error) {
        console.error("Error al guardar el encounter:", error);
        setError("Error al guardar el encounter.");
      }
  
    };

    const handlePrintButtonClick = () => {
      var specificAnswer = responses.find(answer => answer.linkId === "PAT_NOMBRE");
      var response = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_NOMBRE".toLowerCase());
      console.log(response)
      const patientName = response?.answer?.[0]?.valueString || '';
      response = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_EDAD".toLowerCase());
      const patientAge = response?.answer?.[0]?.valueInteger || '';
      const doc = new jsPDF();
      doc.addImage(LogoHRYC, "JPEG", 10, 10,90,15);

      doc.text(patientName +" "+patientAge+" años", 10, 50);
      let yPosition = 60; // Posición inicial en Y para el primer bloque de texto
  
      reports.forEach((report, index) => {
        // Reemplaza <br> por saltos de línea
        const htmlConSaltos = report.text.replace(/<br\s*\/?>/gi, "\n");
  
        // Crea un elemento temporal para interpretar el HTML
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlConSaltos;
  
        // Extrae el texto plano (ahora con saltos de línea donde estaban los <br>)
        let plainText = tempDiv.innerText;
  
        // Opcional: normaliza el texto (por ejemplo, eliminando múltiples saltos de línea consecutivos)
        const normalizedText = plainText.replace(/\n+/g, "\n").trim();
  
        // Usa splitTextToSize para dividir el texto en líneas según el ancho máximo
        const maxWidth = 180; // Ancho máximo en el PDF (ajusta según tus necesidades)
        const textLines = doc.splitTextToSize(normalizedText, maxWidth);
        doc.setFontSize(13);
        // Agrega el bloque de texto al PDF
        doc.text(textLines, 10, yPosition);
  
        // Actualiza la posición en Y para el siguiente reporte
        yPosition += textLines.length * 10 + 10;
      });
  
      // Guarda el PDF
      //doc.save("informe.pdf");
        // Configura el PDF para que se imprima automáticamente
      doc.autoPrint();

      // Abre el PDF en una nueva ventana o pestaña para que se muestre el diálogo de impresión
      // Opción 1: Usando un URL de tipo blob
      window.open(doc.output('bloburl'), '_blank');

      // Opción 2: Usando dataURL (descomenta la siguiente línea y comenta la opción 1 si prefieres esta)
      // window.open(doc.output('dataurlnewwindow'), '_blank');
      };
    
    return (
      <div className="responses-summary">
      <h3>Informe Médico</h3>

      {/* Iterar sobre los reportes */}
      {reports.map((report, index) => (
        <div key={index} className="report-item">
          <h4>Masa anexial #{index + 1}</h4>

          {/* Ejemplo: mostrar alguna información del objeto `report` */}
          <div className="parts">
            <span className='tlabel'>Probabilidad de malignidad: </span><span className='text' dangerouslySetInnerHTML={{ __html: report.score }} />
          </div>
          <div className="parts">
            <div className='tlabel'>Informe:</div>
            <div className='text' dangerouslySetInnerHTML={{ __html: report.text }} />
          </div>
          {/* Campo de texto para observación */}
          <label className='tlabel'>
            Conclusión del ecografista:
            <input
              type="text"
              value={observations[index] || ""}
              onChange={(e) => handleObservationChange(index, e.target.value)}
            />
          </label>

          {/* Botón para este reporte 
          <button onClick={() => handleReportButtonClick(index)}>
            Descarga Informe
          </button>
          */}
        </div>
      ))}

      {/* Botón final para volver */}
      <button className="save-btn" onClick={event}>
        Volver al cuestionario
      </button>
      <button className="save-btn" onClick={handleSaveButtonClick}>
        Guardar
      </button>
      <button className="save-btn" onClick={handlePrintButtonClick}>
        Guardar e Imprimir
      </button>
    </div>
    );
  };
  
  ResponsesProbability.propTypes = {
    responses: PropTypes.arrayOf(
      PropTypes.shape({
        linkId: PropTypes.string.isRequired,
        answer: PropTypes.arrayOf(PropTypes.object).isRequired,
      })
    ).isRequired,
    event: PropTypes.func.isRequired,
  };
  
  export default ResponsesProbability;



