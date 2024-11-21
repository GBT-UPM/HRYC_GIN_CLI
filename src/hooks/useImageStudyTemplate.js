import { ImagingStudyTemplate } from "../templetes/imagingStudyTemplate";

export const useImageStudyTemplate = () => {
  const generateImagingStudy = (imgStuId,encId, patientId, serieId) => {
    return {
      ...ImagingStudyTemplate,
      id: imgStuId,
      subject: {
        reference: `Patient/${patientId}`
      },
      encounter: {
        reference: `Encounter/${encId}`
      },
      started: new Date().toISOString(),
      series: [
        {
          uid: serieId,
          number: 1,
          modality: {
            system: "http://dicom.nema.org/resources/ontology/DCM",
            code: "US",
            display: "Ultrasound"
          },
          description: "Ecografía transvaginal"
        }
      ]
    };
  };

  return { generateImagingStudy };
};
