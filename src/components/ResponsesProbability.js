import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import '../assets/css/ResponsesSummary.css';

import '../assets/css/ResponsesProbability.css';
import jsPDF from 'jspdf';
import LogoHRYC from "../assets/images/LogoHRYC.jpg";
import Logo12oct from "../assets/images/Logo12oct.jpg";

import Modal from "./Modal";

import { useKeycloak } from '@react-keycloak/web';
import { useEncounterTemplate } from "../hooks/useEncounterTemplate";
import { useObservationTemplate } from "../hooks/useObservationTemplate";
import { useImageStudyTemplate } from "../hooks/useImageStudyTemplate";
import ApiService from '../services/ApiService';
import { generateId } from '../screens/QuestionnaireScreen';
import { generatePeriod } from '../screens/QuestionnaireScreen';
import { useRiskAssessmentTemplate } from '../hooks/useRiskAssessmentTemplate';
import { usePatientTemplate } from '../hooks/usePatientTemplate';


const ResponsesProbability = ({ responses, event }) => {
  const [reports, setReports] = useState([]);
  const [observations, setObservations] = useState([]);
  //nuevo
  // eslint-disable-next-line no-unused-vars
  const [probality, setProbality] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [encounterId, setEncounterId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [includeProbability, setIncludeProbability] = useState(false);
  const [mass, setMass] = useState(false);
  const [sco, setSco] = useState(false);

  const { keycloak } = useKeycloak();
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  const { generateEncounter } = useEncounterTemplate();
  const { generateObservation } = useObservationTemplate();
  const { generateImagingStudy } = useImageStudyTemplate();
  const { generateRiskAssessment } = useRiskAssessmentTemplate();
  const { generatePatient } = usePatientTemplate();


  // Verifica si hay masa anexial
  // const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";
  // const calcularScore = responses[0]?.item?.some(resp => resp.linkId?.toLowerCase() === "MA_PROB".toLowerCase() && resp.answer?.[0]?.valueCoding?.display !== "No");

  //console.log("La variable calcularScore: " + calcularScore);
  //console.log(hasMassInReports)

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
  const generateReport = useCallback((res) => {

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
    const volumen = ((parseFloat(MA_M1) * parseFloat(MA_M2) * parseFloat(MA_M3) * 0.52)/1000);
    const MA_VOL = volumen < 0.01 ? volumen.toFixed(3) : volumen.toFixed(2); // Volumen en cm³
    const MA_SOL_CONTORNO = getValue('MA_SOL_CONTORNO');
    const MA_CONTENIDO = getValue('MA_CONTENIDO');
    const MA_CONTENIDO_OTRO = getValue('MA_CONTENIDO_OTRO'); // Otro contenido.
    const MA_SOL_VASC = getValue('MA_SOL_VASC');
    const MA_Q_CONTORNO = getValue('MA_Q_CONTORNO');
    const MA_Q_GROSOR = getValue('MA_Q_GROSOR');
    const MA_Q_VASC = getValue('MA_Q_VASC');
    const MA_PAPS = getValue('MA_PAPS');     //Presencia de papilas.
    const MA_Q_P = getValue('MA_Q_P');       // Número de papilas.
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
    //const MA_PROB = getValue('MA_PROB'); //¿Quiere calcular la probabilidad?


    //Calcular logit y probabilidad      
    const logit = calcularLogit(MA_Q_CONTORNO, MA_SA, MA_Q_AS_VASC, MA_Q_P_VASC);
    const probabilidad = calcularProbabilidad(logit);

    const RES_SCORE = probabilidad.toFixed(4);

    //Construcción del informe
    let report = '';

     if (PAT_MA === 'no') {   //Si NO hay masa anexial
      const OD_M1 = getValue('OD_M1');
      const OD_M2 = getValue('OD_M2');
      const OD_FOL = getValue('OD_FOL');
      const OI_M1 = getValue('OI_M1');
      const OI_M2 = getValue('OI_M2');
      const OI_FOL = getValue('OI_FOL');

      report += `Anejo derecho de ${OD_M1} x ${OD_M2} mm con ${OD_FOL} folículo/s.<br/>`;
      report += `Anejo izquierdo de ${OI_M1} x ${OI_M2} mm con ${OI_FOL} folículo/s.<br/>`;

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
          const contenido = MA_CONTENIDO === 'otro' ? MA_CONTENIDO_OTRO : MA_CONTENIDO;
          report += `${dependencia}, se objetiva formación de <b>${MA_M1} x ${MA_M2} x ${MA_M3} mm</b> <b>(${MA_VOL} cm³)</b> de aspecto <b>${MA_TIPO}</b> de contorno <b>${contorno}</b> y de contenido <b>${contenido}</b>.${vascularizacion_MA_SOL}<br/>`;
          
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
            report += `Presenta ascitis de tipo <b>${MA_ASC_TIPO}</b>.<br/>`;
          }
          if (MA_CARC === 'sí') {   //Carcinomatosis.
            report += 'Hay carcinomatosis.<br/>';
          }
          // if (MA_PROB === 'sí') {   // ¿Quiere calcular la probabilidad?
          //   report += `La probabilidad de que la masa anexial sea maligna es de <b>${RES_SCORE}</b>. <br/>`;
          // }
        }
    }
    return {
      text: report,
      score: RES_SCORE,
      text_score: `La probabilidad de que la masa anexial sea maligna es de ${(RES_SCORE ?? 0)* 100}%.`,
    };
  }, []);
  useEffect(() => {
    if (!responses || responses.length === 0) return;


    console.log("ENTRA");
    console.log("Respuestas:", responses);

    const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";
    const calcularScore = responses[0]?.item?.some(resp => resp.linkId?.toLowerCase() === "MA_PROB".toLowerCase() && resp.answer?.[0]?.valueCoding?.display !== "No");

    setMass(hasMassInReports);
    setSco(calcularScore);

    const generated = responses.map((r) => generateReport(r));
    setReports(generated);
  }, [responses, generateReport]);
  // Función para calcular logit(p)
  const calcularLogit = (contorno, sombra, vascAreaSolida, vascPapila) => {
    let logit = -3.625;

    //Cálculo coeficientes
    if (contorno === 'irregular') logit += 1.299;

    if (sombra === 'no') logit += 1.847;

    if (vascAreaSolida === 'ninguno (score color 1)' || vascAreaSolida === 'leve (score color 2)') logit += 2.209;
    else if (vascAreaSolida === 'moderado (score color 3)' || vascAreaSolida === 'abundante (score color 4)') logit += 2.967

    if (vascPapila === 'ninguno (score color 1)' || vascPapila === 'leve (score color 2)') logit += 1.253;
    else if (vascPapila === 'moderado (score color 3)' || vascPapila === 'abundante (score color 4)') logit += 1.988;

    return logit;
  }

  // Función para calcular la probabilidad.
  const calcularProbabilidad = (logit) => {
    return 1 / (1 + Math.exp(-logit));
  };

  // Función para generar el informe médico

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
  /**
   * Ejemplo de función que maneje el click del botón en cada reporte.
   * Podrías hacer lo que necesites (guardar, eliminar, etc.)
   */
  const handleSaveButtonClick = async (index) => {
    console.log(`Botón de guardado clicado`);
    try {
      console.log("Index: " + index);

      setProbality(true);

      //const firstResponse = responses[index];
      /* var specificAnswer = responses.item.find(answer => answer.linkId === "PAT_NHC");
       const patientId = specificAnswer?.answer?.[0]?.valueString || '';
       console.log("NHC paciente: " + patientId);
       specificAnswer = responses.item.find(answer => answer.linkId === "PAT_IND");
       const observation = specificAnswer?.answer?.[0]?.valueString || '';*/
      var response = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_NHC".toLowerCase());
      const nhc = response?.answer?.[0]?.valueString || '';
      console.log(response)
      response = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_NOMBRE".toLowerCase());
      const given = response?.answer?.[0]?.valueString || '';
      const family = "" //de momento no se pregunta
      response = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase());
      const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";

      let patientId = generateId();
      const Patient = generatePatient(patientId, nhc, family, given)
      // response = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_IND".toLowerCase());
      // const observationImagen = response?.answer?.[0]?.valueString || '';
      const patient = await ApiService(keycloak.token, 'POST', `/fhir/Patient/check-or-create`, Patient);
      if (patient.ok) {

        //patientId = pat.id;
        console.log("ID paciente: " + patientId);
        const encId = generateId();

        const imgStuId = generateId();
        const serieId = generateId();
        setEncounterId(encId);
        const practitioner = sessionStorage.getItem('practitioner');
        const practitionerName = sessionStorage.getItem('practitionerName');
        const Encounter = generateEncounter(encId, patientId, practitioner, practitionerName, generatePeriod());
        //const ObservationImagen = generateObservation(obsId, encId, patientId, imgStuId, observationImagen);
        const ImageStudy = generateImagingStudy(imgStuId, encId, patientId, serieId);

        const successfulResponses = [];


        const encounter = await ApiService(keycloak.token, 'POST', `/fhir/Encounter`, Encounter);
        if (encounter.status === 200) {

          //const observation = await ApiService(keycloak.token, 'POST', `/fhir/Observation`, ObservationImagen);
          //console.log("observation: " + observation.status)
          const imageStudy = await ApiService(keycloak.token, 'POST', `/fhir/ImagingStudy`, ImageStudy);
          console.log("imageStudy: " + imageStudy.status)


          let index = 0
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
              //let resId = 0
              if (response.ok) {
                const result = await response.json();
                console.log("Nuevo ID:", result.id);
                // resId = result.id;
                const obsId = generateId();
                const ObservationImagen = generateObservation(obsId, encId, patientId, imgStuId, observations[index]);
                await ApiService(keycloak.token, 'POST', `/fhir/Observation`, ObservationImagen);
                if (hasMassInReports) {
                  const riskId = generateId();
                  const RiskAssessment = generateRiskAssessment(riskId, encId, patientId, practitioner, reports[index].score, "", qResponse.id)
                  await ApiService(keycloak.token, 'POST', `/fhir/RiskAssessment`, RiskAssessment);
                }
                index++;
                successfulResponses.push(qResponse);
              } else {
                throw new Error(`Error en la respuesta: ${response.status}`);
              }

            } catch (error) {
              console.error("Error al guardar la respuesta:", error);
              setError("Error al guardar la respuesta.");
            }
          }
          index = 0
          // for (const report of reports) {
          //   const riskId = generateId();
          //   const RiskAssessment= generateRiskAssessment(riskId, encId, patientId, practitioner, report.score, "",observations[index])
          //   const risk = await ApiService(keycloak.token, 'POST', `/fhir/RiskAssessment`, RiskAssessment);
          //     console.log("risk: " + risk.status)
          //     index++;
          // }

          event();
        } else {
          throw new Error(`Error en el encounter: ${encounter.status}`);
        }

      }

    } catch (error) {
      console.error("Error al guardar el encounter:", error);
      setError("Error al guardar el encounter.");
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return isNaN(date) ? '' : date.toLocaleDateString('es-ES');
  };

  // const handlePrintButtonClick = () => {
  //   try {
  //     handleSaveButtonClick();
  //     console.log("Se han guardado los datos en la BD.")

  //     const getResponse = (key) => {
  //       const answer = responses[0].item.find(
  //         (resp) => resp.linkId.toLowerCase() === key.toLowerCase()
  //       )?.answer?.[0];

  //       return (
  //         answer?.valueString ||
  //         answer?.valueInteger ||
  //         answer?.valueDate ||
  //         answer?.valueCoding?.display ||
  //         ''
  //       );
  //     };

  //     //const getReport = (title) => reports.find((report) => report.title === title)?.text || '';
  //     const patientName = getResponse("PAT_NOMBRE");
  //     const patientNHC = getResponse("PAT_NHC");
  //     //const patientAge = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_EDAD".toLowerCase())?.answer?.[0]?.valueInteger || '';
  //     const patientAge = getResponse("PAT_EDAD");
  //     const patientFUR = getResponse("PAT_FUR");
  //     const indicacion = getResponse("PAT_IND");

  //     const doc = new jsPDF();  // Crea una nueva instancia de jsPDF

  //     //Encabezado: logo, hospital y servicio
  //     doc.addImage(LogoHRYC, "JPEG", 10, 10, 90, 15);
  //     doc.setFont("helvetica", "bold");
  //     //doc.setFontSize(16);
  //     //doc.text("Hospital Universitario Ramón y Cajal", 115, 20);
  //     doc.setFontSize(12);
  //     doc.text("Servicio de Ginecología y Obstetricia", 120, 20);

  //     /*doc.autoTable({
  //       startY: 40,
  //       head: [["Nombre", "NHC", "Fecha de nacimiento", "Fecha de Última Regla"]],
  //       body: [[patientName, patientNHC, birthDate(patientAge), patientFUR]],
  //       theme: 'grid'
  //     });*/

  //     //Datos de la paciente
  //     doc.setFontSize(12);
  //     doc.setFont("helvetica", "bold");
  //     doc.text("Datos de la paciente:", 10, 50);

  //     doc.setFontSize(11);
  //     doc.setFont("helvetica", "bold");
  //     doc.text("Nombre:", 15, 60);
  //     doc.setFont("helvetica", "normal");
  //     doc.text(patientName, 65, 60);

  //     doc.setFont("helvetica", "bold");
  //     doc.text("NHC:", 15, 70);
  //     doc.setFont("helvetica", "normal");
  //     doc.text(patientNHC, 65, 70);

  //     doc.setFont("helvetica", "bold");
  //     doc.text("Edad:", 15, 80);
  //     doc.setFont("helvetica", "normal");
  //     doc.text(patientAge.toString(), 65, 80);

  //     doc.setFont("helvetica", "bold");
  //     doc.text("FUR:", 15, 90);
  //     doc.setFont("helvetica", "normal");
  //     doc.text(formatDate(patientFUR), 65, 90);

  //     let yPosition = 100; // Posición inicial en Y para el primer bloque de texto

  //     //Sección del informe: indicación, descripción y conclusión
  //     const addSection = (title, text, massIndex = null) => {
  //       doc.setFontSize(12);
  //       doc.setFont("helvetica", "bold");
  //       doc.text(title, 10, yPosition);
  //       yPosition += 10; // Espacio entre el título y el texto

  //       //Si hay más de una masa anexial, se añade el título de la masa
  //       if (massIndex !== null) {
  //         doc.setFontSize(11);
  //         doc.setFont("helvetica", "bold");
  //         doc.text("Conclusión de la Masa Anexial " + (massIndex + 1), 15, yPosition);
  //         yPosition += 10;
  //       }

  //       doc.setFontSize(11);
  //       doc.setFont("helvetica", "normal");
  //       const textLines = doc.splitTextToSize(text, 180); // Ajusta el ancho según sea necesario  
  //       doc.text(textLines, 10, yPosition);
  //       yPosition += textLines.length * 4 + 10; // Actualiza la posición en Y para el siguiente bloque de texto
  //     };

  //     addSection("Indicación de la ecografía: ", indicacion);
  //     doc.setFontSize(12);
  //     doc.setFont("helvetica", "bold");
  //     doc.text("Descripción de la imagen: ", 10, yPosition);
  //     yPosition += 10;

  //     doc.setFontSize(11);
  //     doc.setFont("helvetica", "normal");
  //     reports.forEach((report, index) => {
  //       if (hasMassInReports) {
  //         doc.setFontSize(11);
  //         doc.setFont("helvetica", "bold");
  //         doc.text("Masa anexial " + (index + 1), 15, yPosition);
  //         yPosition += 10;
  //       }
  //       doc.setFont("helvetica", "normal");

  //       // Reemplaza <br> por saltos de línea
  //       const htmlConSaltos = report.text.replace(/<br\s*\/?>/gi, "\n");

  //       // Crea un elemento temporal para interpretar el HTML
  //       const tempDiv = document.createElement("div");
  //       tempDiv.innerHTML = htmlConSaltos;

  //       // Extrae el texto plano (ahora con saltos de línea donde estaban los <br>)
  //       let plainText = tempDiv.innerText;

  //       // Opcional: normaliza el texto (por ejemplo, eliminando múltiples saltos de línea consecutivos)
  //       const normalizedText = plainText.replace(/\n+/g, "\n").trim();

  //       // Usa splitTextToSize para dividir el texto en líneas según el ancho máximo
  //       const maxWidth = 180; // Ancho máximo en el PDF (ajusta según tus necesidades)
  //       const textLines = doc.splitTextToSize(normalizedText, maxWidth);
  //       doc.setFontSize(11);
  //       // Agrega el bloque de texto al PDF
  //       doc.text(textLines, 10, yPosition, { align: "left" });

  //       // Actualiza la posición en Y para el siguiente reporte
  //       yPosition += textLines.length * 4 + 10;
  //     });

  //     // Espacio para las conclusiones
  //     const validObservations = observations.filter((observation) => observation.trim().length > 0); // Filtra las observaciones vacías o nulas
  //     if (validObservations.length > 0) {
  //       doc.setFontSize(12);
  //       doc.setFont("helvetica", "bold");
  //       doc.text("Conclusiones del ecografista: ", 10, yPosition);
  //       yPosition += 10;

  //       validObservations.forEach((observation, index) => {
  //         if (validObservations.length > 1) {
  //           doc.setFontSize(11);
  //           doc.setFont("helvetica", "bold");
  //           doc.text("Conclusión de la Masa Anexial " + (index + 1), 15, yPosition);
  //           yPosition += 10;
  //         }
  //         doc.setFontSize(11);
  //         doc.setFont("helvetica", "normal");
  //         const textLines = doc.splitTextToSize(observation, 180); // Ajusta el ancho según sea necesario
  //         doc.text(textLines, 10, yPosition);
  //         yPosition += textLines.length + 10; // Actualiza la posición en Y para el siguiente bloque de texto
  //       });
  //     }

  //     //Pie de página: nombre del médico y fecha
  //     const today = new Date();
  //     doc.setFontSize(10);
  //     doc.setFont("helvetica", "italic");
  //     doc.text("Hospital Universitario Ramón y Cajal - Madrid", 10, 260);
  //     doc.text("Fecha: " + today.toLocaleDateString(), 150, 260);
  //     const practitionerName = sessionStorage.getItem('practitionerName');
  //     doc.text("Ecografista: " + practitionerName, 10, 270);

  //     // Guarda el PDF
  //     //doc.save("informe.pdf");
  //     // Configura el PDF para que se imprima automáticamente
  //     doc.autoPrint();
  //     window.open(doc.output("bloburl"), "_blank");  // Abre el PDF en una nueva pestaña

  //   } catch (error) {
  //     console.error("Error al guardar el encounter:", error);
  //     setError("Error al guardar el encounter.");
  //   }
  // };
  const handlePrintButtonClick = (includeProbability) => {
    try {
      handleSaveButtonClick(); 
      const hasMassInReports = responses[0].item.find((resp) => resp.linkId.toLowerCase() === "PAT_MA".toLowerCase()).answer[0].valueCoding.display !== "No";

      const getResponse = (key) => {
        const answer = responses[0].item.find(
          (resp) => resp.linkId.toLowerCase() === key.toLowerCase()
        )?.answer?.[0];
        
        console.log(`Respuesta para ${key}:`, answer);
        return (
          answer?.valueString ||
          answer?.valueInteger ||
          answer?.valueDate ||
          answer?.valueCoding?.display ||
          ''
        );
      };
  
      const checkAndAddPage = (doc, nextBlockHeight) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (yPosition + nextBlockHeight > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
      };
  
      const doc = new jsPDF();
  
      doc.addImage(LogoHRYC, "JPEG", 10, 10, 70, 15);
      doc.addImage(Logo12oct, "JPEG", 8, 30, 75, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Servicio de Ginecología y Obstetricia", 110, 30);
  
      const patientName = getResponse("PAT_NOMBRE");
      const patientNHC = getResponse("PAT_NHC");
      const patientAge = getResponse("PAT_EDAD");
      const patientFUR = getResponse("PAT_FUR");
      const indicacion = getResponse("PAT_IND");
      const indicacion_otro = getResponse("PAT_IND_OTRO");
      const hospital = getResponse("HOSPITAL_REF");
  
      let yPosition = 60;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      checkAndAddPage(doc, 10);
      doc.text("Datos de la paciente:", 10, yPosition);
      yPosition += 10;
  
      const addField = (label, value) => {
        checkAndAddPage(doc, 10);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(label, 15, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(value, 65, yPosition);
        yPosition += 10;
      };
  
      addField("Nombre:", patientName);
      addField("NHC:", patientNHC);
      //addField("Edad:", patientAge.toString());
      addField("FUR:", formatDate(patientFUR));
  
      const addSectionWithAutoBreak = (title, text) => {
        const textLines = text.trim() !== "" ? doc.splitTextToSize(text, 180) : [];
        const totalHeight = textLines.length * 5 + 10;
      
        // Añade salto de página solo si se va a imprimir algo más que el título
        checkAndAddPage(doc, totalHeight);
      
        // Imprime el título siempre
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(title, 10, yPosition);
        yPosition += 10;
      
        if (textLines.length > 0) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          doc.text(textLines, 10, yPosition);
          yPosition += textLines.length * 5 + 10;
        }
      };
  
      //addSectionWithAutoBreak("Indicación de la ecografía:", indicacion);
      let indicacionFinal = indicacion;
      if (indicacion === "1" && indicacion_otro.trim() !== "") {
        indicacionFinal = indicacion_otro.trim();
      }
      indicacionFinal = indicacionFinal.toLowerCase()
      const edadText = patientAge ? `${patientAge} años` : "de edad desconocida";
      const indicacionText = `Mujer de ${edadText} que acude a consulta de ecografía para valoración por ${indicacionFinal}.`;

      addSectionWithAutoBreak("Indicación de la ecografía:", indicacionText);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      checkAndAddPage(doc, 10);
      doc.text("Descripción de la imagen:", 10, yPosition);
      yPosition += 10;
  
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      reports.forEach((report, index) => {
        if (hasMassInReports) {
          checkAndAddPage(doc, 10);
          doc.setFont("helvetica", "bold");
          doc.text("Masa anexial " + (index + 1), 15, yPosition);
          yPosition += 10;
        }
  
        doc.setFont("helvetica", "normal");
        const htmlConSaltos = report.text.replace(/<br\s*\/?>/gi, "\n");
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlConSaltos;
        const plainText = tempDiv.innerText;
        const normalizedText = plainText.replace(/\n+/g, "\n").trim();
  
        const textLines = doc.splitTextToSize(normalizedText, 180);
        textLines.forEach((line) => {
          checkAndAddPage(doc, 6);
          doc.text(line, 10, yPosition);
          yPosition += 6;
        });

        if (includeProbability && report.text_score) {
          const scoreLines = doc.splitTextToSize(report.text_score, 180);
          scoreLines.forEach((line) => {
            checkAndAddPage(doc, 6);
            doc.text(line, 10, yPosition);
            yPosition += 6;
          });
        }
  
        yPosition += 4;
      });
  

      // Espacio para las conclusiones
      const validObservations = observations.filter((observation) => observation.trim().length > 0); // Filtra las observaciones vacías o nulas
  
      if (validObservations.length > 0) {
        addSectionWithAutoBreak("Conclusiones del ecografista:", "");
  
        validObservations.forEach((observation, index) => {
          if (validObservations.length > 1) {
            checkAndAddPage(doc, 10);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Conclusión de la Masa Anexial " + (index + 1), 15, yPosition);
            yPosition += 10;
          }
  
          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          console.log("Observation: " + observation);
          const text = observation;
          const textLines = doc.splitTextToSize(text, 180);
          textLines.forEach((line) => {
            checkAndAddPage(doc, 6);
            doc.text(line, 10, yPosition);
            yPosition += 6;
          });
          yPosition += 4;
        });
      }
  
      const today = new Date();
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(hospital, 10, 260);
      doc.text("Fecha: " + today.toLocaleDateString(), 150, 260);
      const practitionerName = sessionStorage.getItem('practitionerName');
      doc.text("Ecografista: " + practitionerName, 10, 270);
  
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");  // Abre el PDF en una nueva pestaña
    } catch (error) {
      console.error("Error al guardar el encounter:", error);
      setError("Error al guardar el encounter.");
    }
  };
  return (
    <div className="responses-summary">
      <h3>Informe Médico</h3>

      {/* Iterar sobre los reportes */}
      {reports.map((report, index) => (
        <div key={index} className="report-item">

          {/* Mostrar SÓLO si hay masa anexial */}
          {mass  && <h4>Masa anexial #{index + 1}</h4>}

          {/* SIEMPRE se muestra */}
          <div className="parts">
            <div className='tlabel'>Informe:</div>
            <div className='text' dangerouslySetInnerHTML={{ __html: report.text }} />
          </div>

          {/* Mostrar SÓLO si hay masa anexial
          {hasMassInReports && calcularScore && (
            <div className="parts">
              <span className='tlabel'>Probabilidad de malignidad: </span>
              <span className='text' dangerouslySetInnerHTML={{ __html: ((report.score ?? 0)* 100).toFixed(2) + '%' }} />
            </div>
          )} */}

          {/* Mostrar SÓLO si hay masa anexial
          {hasMassInReports && calcularScore && (
            <div className="parts">
              <span className='tlabel'>Probabilidad de malignidad: </span>
              <span className='text' dangerouslySetInnerHTML={{ __html: ((report.score ?? 0)* 100).toFixed(2) + '%' }} />
              <span 
                title='Probabilidad de malignidad orientativa calculada según datos ecográficos aportados y fórmula publicada en Rodríguez-Rubio C, Vegas-Viedma S, Del Olmo-Reillo M, Quintana-Zapata P, Sancho-Sauco J, Pablos-Antona MJ, Alcázar JL, Pelayo-Delgado I. ECO-SCORE: Development of a New Ultrasound Score for the Study of Cystic and Solid-Cystic Adnexal Masses Based on Imaging Characteristics. Biomedicines. 2025 Jan 29;13(2):317. doi: 10.3390/biomedicines13020317.'
                style={{ marginLeft: '6px', cursor:'help', color: '#555' }}
                >
                ℹ️
              </span>
            </div>
          )} */}

          {/* Mostrar SÓLO si hay masa anexial */}
          {mass && sco && (
            <div className="parts">
              <span className='tlabel'>Probabilidad de malignidad: </span>
              <span className='text' dangerouslySetInnerHTML={{ __html: ((report.score ?? 0)* 100).toFixed(2) + '%' }} />
              <p style={{ fontSize: '0.70em', color: '#555', marginTop: '5px' }}>
                <em>
                  (Rodríguez-Rubio C, Vegas-Viedma S, Del Olmo-Reillo M, Quintana-Zapata P, Sancho-Sauco J, Pablos-Antona MJ, Alcázar JL, Pelayo-Delgado I. ECO-SCORE: Development of a New Ultrasound Score for the Study of Cystic and Solid-Cystic Adnexal Masses Based on Imaging Characteristics. Biomedicines. 2025 Jan 29;13(2):317. doi: 10.3390/biomedicines13020317. PMID: 40002730; PMCID: PMC11852474)
                </em>
              </p>
            </div>
          )}

          {/* Campo de texto para observación */}
          <div className="parts">
            <div className='tlabel'>Conclusión del ecografista:</div>
            <div className='text'>
              <textarea rows="7" cols="75"
                style={{ padding: '8px' }}
                value={observations[index] || ""}
                onChange={(e) => handleObservationChange(index, e.target.value)}
              />
            </div>
          </div>


          {/* Botón para este reporte 
          <button onClick={() => handleReportButtonClick(index)}>
            Descarga Informe
          </button>
          */}
        </div>
      ))}

      {/* Botón final para volver 
      <button className="save-btn" onClick={event}>
        Volver al cuestionario
      </button>*/}
      <button className="save-btn" onClick={handleSaveButtonClick}>
        Guardar
      </button>
      {/* <button className="save-btn" onClick={handlePrintButtonClick}>
        Guardar e Imprimir
      </button> */}
      <button className="save-btn" onClick={() => {
        if (sco)  {
          setIsModalOpen(true);
        } else {
          handlePrintButtonClick(false);
        }
      }}
      >
        Guardar e Imprimir
      </button>
      {/* Modal para dar opción de incluir la probabilidad en el informe */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <h2>Confirmación</h2> 
      <p>¿Desea incluir la probabilidad de malignidad en el informe?</p>
      <button className="save" onClick={() => {
          handlePrintButtonClick(true);
          setIsModalOpen(false);
      }}>Sí
      </button>
      <button className="cancel" onClick={() => {
        handlePrintButtonClick(false);
        setIsModalOpen(false);
      }}>No
      </button>
    </Modal>
  </div>
  );
}

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
