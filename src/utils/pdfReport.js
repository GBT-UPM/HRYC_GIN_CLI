import jsPDF from 'jspdf';
import LogoHRYC from '../assets/images/LogoHRYC.jpg';
import Logo12oct from '../assets/images/Logo12oct.jpg';
import { resolveCenterCode } from './fhirOrganizations';

const CENTER_BRANDS = {
  HURYC: {
    logo: LogoHRYC,
    shortName: 'HURYC',
    fullName: 'Hospital Universitario Ramón y Cajal',
    serviceName: 'Servicio de Ginecología y Obstetricia',
  },
  H12O: {
    logo: Logo12oct,
    shortName: 'H12O',
    fullName: 'Hospital Universitario 12 de Octubre',
    serviceName: 'Servicio de Ginecología y Obstetricia',
  },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return isNaN(date) ? '' : date.toLocaleDateString('es-ES');
};

/**
 * Generates the professional MIA clinical report PDF and opens it in a new tab.
 *
 * @param {Object}   params
 * @param {Array}    params.responses          QuestionnaireResponse array (first element used)
 * @param {Array}    params.reports            Pre-computed report objects [{text, score, text_score}]
 * @param {string[]} params.observations       Ecographer conclusions (plain-text strings)
 * @param {boolean}  params.includeProbability Whether to include ECO-SCORE probability
 * @param {string}   params.centerIdHint       Extra centerId hint (fallback when HOSPITAL_REF absent)
 * @param {string}   params.practitionerName   Ecographer name / initials
 * @param {string}   params.careSettingDisplay Care setting display name
 * @param {string}   params.studyPatientCode   Study code label (empty string → "Pendiente")
 */
export const generateClinicalReportPdf = ({
  responses = [],
  reports = [],
  observations = [],
  includeProbability = false,
  centerIdHint = '',
  practitionerName = '',
  careSettingDisplay = '',
  studyPatientCode = '',
}) => {
  const firstQR = responses[0];
  if (!firstQR) return;

  const getResponse = (key) => {
    const answer = firstQR.item?.find(
      (resp) => resp.linkId?.toLowerCase() === key.toLowerCase()
    )?.answer?.[0];
    return (
      answer?.valueString ||
      answer?.valueInteger ||
      answer?.valueDate ||
      answer?.valueCoding?.display ||
      ''
    );
  };

  const hasMassInReports =
    firstQR.item?.find((resp) => resp.linkId?.toLowerCase() === 'pat_ma')
      ?.answer?.[0]?.valueCoding?.display !== 'No';

  const patientAge    = getResponse('PAT_EDAD');
  const patientFUR    = getResponse('PAT_FUR');
  const indicacion    = getResponse('PAT_IND');
  const indicacionOtro = getResponse('PAT_IND_OTRO');
  const hospitalFromQR = getResponse('HOSPITAL_REF');
  const sonographerInitials = getResponse('ECO_EXP_SIGLAS');

  const resolvedCode = resolveCenterCode(hospitalFromQR || centerIdHint);
  const centerBrand = CENTER_BRANDS[resolvedCode] || {
    logo: null,
    shortName: resolvedCode || '—',
    fullName: 'Centro no especificado',
    serviceName: 'Servicio de Ginecología y Obstetricia',
  };

  const doc = new jsPDF();
  const pageHeight = doc.internal?.pageSize?.getHeight?.() || 297;
  const pageWidth  = doc.internal?.pageSize?.getWidth?.()  || 210;
  const marginX    = 18;
  const contentWidth = pageWidth - marginX * 2;
  const footerY    = pageHeight - 12;
  const today      = new Date();
  let yPosition    = 18;
  let pageNumber   = 1;

  const drawFooter = () => {
    doc.setDrawColor(217, 226, 236);
    doc.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(82, 97, 107);
    doc.text(centerBrand.shortName, marginX, footerY);
    doc.text(
      `Generado el ${today.toLocaleDateString('es-ES')} ${today.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );
    doc.text(
      `Documento generado automáticamente por la plataforma MIA. Pág. ${pageNumber}`,
      pageWidth - marginX,
      footerY,
      { align: 'right' }
    );
  };

  const addPage = () => {
    drawFooter();
    doc.addPage();
    pageNumber += 1;
    yPosition = 18;
  };

  const ensureSpace = (nextBlockHeight) => {
    if (yPosition + nextBlockHeight > footerY - 10) addPage();
  };

  const writeLabelValue = (label, value, x, y, width = 72) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(82, 97, 107);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(31, 41, 51);
    const lines = doc.splitTextToSize(String(value), width);
    doc.text(lines, x, y + 6);
    return lines.length;
  };

  const addSectionTitle = (title, subtitle = '') => {
    ensureSpace(subtitle ? 24 : 16);
    doc.setDrawColor(217, 226, 236);
    doc.line(marginX, yPosition, pageWidth - marginX, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text(title, marginX, yPosition);
    yPosition += 6;
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(82, 97, 107);
      const subtitleLines = doc.splitTextToSize(subtitle, contentWidth);
      doc.text(subtitleLines, marginX, yPosition);
      yPosition += subtitleLines.length * 5 + 3;
    }
  };

  // ── Cabecera ────────────────────────────────────────────────────────────────
  if (centerBrand.logo) {
    doc.addImage(centerBrand.logo, 'JPEG', marginX, yPosition, 42, 12);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(31, 41, 51);
  doc.text(centerBrand.fullName, pageWidth - marginX, yPosition + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(82, 97, 107);
  doc.text('Servicio de Ginecología y Obstetricia', pageWidth - marginX, yPosition + 11, { align: 'right' });
  yPosition += 20;

  doc.setDrawColor(217, 226, 236);
  doc.line(marginX, yPosition, pageWidth - marginX, yPosition);
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text('Informe ecográfico de masa anexial', marginX, yPosition);
  yPosition += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(82, 97, 107);
  doc.text('Informe clínico estructurado generado por MIA', marginX, yPosition);
  yPosition += 10;

  // ── Bloque de metadatos ─────────────────────────────────────────────────────
  const metadataRows = [
    ['Fecha del informe',  today.toLocaleDateString('es-ES')],
    ['Edad',              patientAge ? `${patientAge} años` : 'No disponible'],
    ['FUR',              formatDate(patientFUR) || 'No disponible'],
    ['Hospital participante', centerBrand.shortName],
    ['Ámbito asistencial', careSettingDisplay || 'No disponible'],
    ['Ecografista',       sonographerInitials || practitionerName || 'No disponible'],
    ['Código de estudio', studyPatientCode || 'Pendiente'],
  ];

  const metadataHeight = 14 + Math.ceil(metadataRows.length / 2) * 16;
  ensureSpace(metadataHeight);
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(217, 226, 236);
  doc.roundedRect(marginX, yPosition, contentWidth, metadataHeight, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text('Datos del informe', marginX + 6, yPosition + 9);
  let rowY = yPosition + 18;
  metadataRows.forEach(([label, value], index) => {
    const columnX = index % 2 === 0 ? marginX + 6 : marginX + contentWidth / 2 + 2;
    const lineCount = writeLabelValue(label, value, columnX, rowY, contentWidth / 2 - 12);
    if (index % 2 === 1) {
      rowY += Math.max(lineCount, 1) * 6 + 10;
    }
  });
  yPosition += metadataHeight + 10;

  // ── Indicación ──────────────────────────────────────────────────────────────
  let indicacionFinal = indicacion;
  if (indicacion === '1' && String(indicacionOtro || '').trim() !== '') {
    indicacionFinal = String(indicacionOtro).trim();
  }
  indicacionFinal = String(indicacionFinal || '').toLowerCase();
  const edadText = patientAge ? `${patientAge} años` : 'de edad desconocida';
  const indicacionText = `Mujer de ${edadText} que acude a consulta de ecografía para valoración por ${indicacionFinal}.`;

  addSectionTitle('Indicación de la ecografía');
  ensureSpace(20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(31, 41, 51);
  const indicationLines = doc.splitTextToSize(indicacionText, contentWidth);
  doc.text(indicationLines, marginX, yPosition);
  yPosition += indicationLines.length * 5 + 8;

  // ── Descripción ecográfica ──────────────────────────────────────────────────
  addSectionTitle('Descripción ecográfica');

  reports.forEach((report, index) => {
    const htmlConSaltos = String(report?.text || '').replace(/<br\s*\/?>/gi, '\n');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlConSaltos;
    const plainText = String(tempDiv.innerText ?? tempDiv.textContent ?? '');
    const normalizedText = plainText.replace(/\n+/g, '\n').trim();
    const textLines  = doc.splitTextToSize(normalizedText, contentWidth - 14);
    const scoreLines = includeProbability && report.text_score
      ? doc.splitTextToSize(report.text_score, contentWidth - 14)
      : [];
    const blockHeight = 18 + textLines.length * 5 + (scoreLines.length ? scoreLines.length * 5 + 10 : 0);
    ensureSpace(blockHeight);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(217, 226, 236);
    doc.roundedRect(marginX, yPosition, contentWidth, blockHeight, 3, 3, 'FD');
    let blockY = yPosition + 9;
    if (hasMassInReports) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 95);
      doc.text(`Masa anexial ${index + 1}`, marginX + 7, blockY);
      blockY += 9;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(31, 41, 51);
    doc.text(textLines, marginX + 7, blockY);
    blockY += textLines.length * 5 + 4;
    if (scoreLines.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 58, 95);
      doc.text('ECO-SCORE', marginX + 7, blockY);
      blockY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 51);
      doc.text(scoreLines, marginX + 7, blockY);
    }
    yPosition += blockHeight + 8;
  });

  // ── Conclusiones del ecografista ────────────────────────────────────────────
  const validObservations = observations.filter((o) => String(o || '').trim().length > 0);
  if (validObservations.length > 0) {
    addSectionTitle('Conclusiones del ecografista');
    validObservations.forEach((observation, index) => {
      const textLines   = doc.splitTextToSize(String(observation), contentWidth - 14);
      const blockHeight = (validObservations.length > 1 ? 17 : 10) + textLines.length * 5 + 8;
      ensureSpace(blockHeight);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(217, 226, 236);
      doc.roundedRect(marginX, yPosition, contentWidth, blockHeight, 3, 3, 'FD');
      let blockY = yPosition + 9;
      if (validObservations.length > 1) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text(`Masa anexial ${index + 1}`, marginX + 7, blockY);
        blockY += 8;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 51);
      doc.text(textLines, marginX + 7, blockY);
      yPosition += blockHeight + 8;
    });
  }

  drawFooter();
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
