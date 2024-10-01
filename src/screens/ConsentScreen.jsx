import { render } from "@testing-library/react";
import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import CiService from "../services/CiService";
import CustomMessage from "../components/CustomMessage";
export default function ConsentScreen(props) {
  const [position, setPosition] = useState(1);
  const [acept, setAcept] = useState(false);
  const [username, setUsername] = useState("");
  const [hospital, setHospital] = useState("");
  const [t] = useTranslation();
  const [modalShow, setModalShow] = useState(false);
  const [modalTitle, setModalTitle] = useState(t('consent.message.text1'));
  const [modalMessage, setModalMessage] = useState(t('consent.message.text2'));


  const location = useLocation();
  let navigate = useNavigate();

  useEffect(() => {
    console.log("entra")


    if (location.state == null) {
      navigate("/", { replace: true });
    } else {
      let username = location.state.username;
      let hospital = location.state.hospital
      console.log(username)
      setUsername(username)
      setHospital(hospital)
    }


  }, []);
  const slice1 = () => {
    return (
      <div className="form-group mt-3">
        <label>Querido/a Sr./Sra. {username}</label>
        <div>
          Le proponemos participar en el proyecto/estudio: DESARROLLO DE UNA PLATAFORMA DIGITAL NACIONAL DE REGISTRO DE BACTERIEMIAS (AppATB) PARA MEJORAR LA PRESCRIPCIÓN ANTIBIÓTICA AL ADECUARLA AL ECOSISTEMA MICROBIANO DE CADA CENTRO HOSPITALARIO.
          <br></br>
          Antes de confirmar su participación en el estudio, es importante que entienda en qué consiste. Por favor, lea con atención este documento.
        </div>
        <br></br>
        <label>OBJECTIVOS DEL ESTUDIO.</label>
        <div>
          1.Evaluar el nivel de implantación y utilización de AppATB por parte de los médicos prescriptores de los hospitales del estudio.
          <br></br>
          2. Evaluar el grado de satisfacción frente a AppATB por parte de los médicos prescriptores y equipos PROA de los hospitales del estudio.
        </div>
        <br></br>
        <label>PROCEDIMENTO Y DURACIÓN</label>
        <div>
          Si usted accede a colaborar en el presente estudio, debe saber que los datos de uso de la aplicación podrán
          ser registrados para analizar el desempeño de AppATB. Dicha información será registrada de forma totalmente anónima y será utilizada para analizar el grado de implantación y nivel de utilización de AppATB.
          <br></br>
          Durante el estudio, le será ofrecido participar anónimamente en encuestas de satisfacción sobre AppATB.
          Esta participación será totalmente voluntaria.
          <br></br>
          Fases del estudio:
          <br></br>
          Fase de implantación de AppATB (3 meses): durante esta fase se le informará/formará en el uso de AppATB.
          <br></br>
          Fase de estudio (12 meses): fase en la que se desarrollará el presente estudio.
        </div>
        <br></br>
        <label>BENEFICIOS Y RIESGOS</label>
        <div>
          AppATB es una herramienta electrónica multiplataforma de ayuda a la prescripción empírica antimicrobiana que está constantemente actualizada. AppATB le muestra los patrones de sensibilidad de los agentes etiológicos de las infecciones que cursan con bacteriemia. La información mostrada está basada en los datos de su propio hospital, lo que le ofrece una información fidedigna y ajustada a la realidad de su centro.
          <br></br>
          AppATB es una herramienta de consulta que le ofrecerá mayor grado de información en el momento de la prescripción empírica de antimicrobianos, pero no le sugerirá de manera activa tratamiento alguno.
          <br></br>
          La utilización de AppATB no comprende ningún riesgo para usted, ni para sus pacientes.
        </div>
        <br></br>
        <label>CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS PERSONALES</label>
        <div>
          Se garantiza la confidencialidad de los datos personales. Los resultados del estudio se almacenarán, cumpliendo los plazos de conservación legales, en archivos creados específicamente para este fin y estarán protegidos con las medidas de seguridad exigidas en la legislación vigente. Ningún dato personal que permita su identificación será accesible a ninguna persona, ni podrán ser divulgados por ningún medio, conservando en todo momento la confidencialidad. Los resultados obtenidos podrán ser consultados por los y las investigadoras del estudio y ser presentados en congresos nacionales e internacionales, así como publicados en revistas científicas, sin que consten los datos personales de los y las participantes. Si usted desea, y una vez finalizado el estudio, le informaremos sobre los resultados obtenidos y el significado científico.
          <br></br>
          En cualquier momento podrá ejercer sus derechos de Acceso, Rectificación, Cancelación/Supresión, Oposición (derechos ARCO) y cualquier otro derecho reconocido en los términos y condiciones establecidos por la legislación vigente en materia de Protección de Datos (LOPD-GDD 3/2018, Reglamento General de Protección de datos de la Unión Europea, RGPD-UE, 679/2016), como por ejemplo solicitar sus datos personales, rectificarlos si fuera necesario, así como revocar la autorización de inclusión en el estudio. 
          <br></br>
          Para ejercer estos derechos debe dirigirse, personalmente o por escrito, al Investigador/a Principal o en la Unidad de Atención al Usuario del Centro, indicando claramente su petición y adjuntando copia del documento identificador (DNI/NIE). Dirección del Centro: Parc Sanitari Sant Joan de Deu (PSSJD), Dr. Antoni Pujadas 42, 08830 Sant Boi de Llobregat. El Responsable de Tratamiento (Actividades de Tratamiento del área de "BÚSQUEDA") es PSSJD. En caso de disconformidad con el tratamiento de sus datos o en el ejercicio de sus derechos puede dirigirse por escrito al Delegado de Protección de Datos de PSSJD (ParcSanitari.DPD@sjd.es) en la dirección indicada antes o reclamar directamente ante las Autoridades de Control (Autoritat Catalana de Protecció de Dades: http://apdcat.gencat.cat/ca/contacte/ o Agencia de Protección de Datos , https://www.aepd.es/reglamento/derechos/).
          <br></br>
          Este documento y los datos recogidos y generados durante el estudio se conservarán bajo la custodia de PSSJD por un periodo no inferior a 10 años. Este estudio no genera decisiones automatizadas ni generación de perfiles, ni conlleva transferencia internacional de los datos personales, recogidos y generados, fuera del ámbito de protección legal de la Unión Europea.
        </div>
        <br></br>
        <label>PREGUNTAS / INFORMACIÓN</label>
        <div>
          Si desea hacer una pregunta o aclarar algún tema relacionado con el estudio, o si precisa ayuda por cualquier problema de salud relacionado con el estudio, por favor, no dude en ponerse en contacto con el investigador/a principal del estudio.
          <br></br>          <br></br>
          Dr. Vicens Diaz de Brito.
          Teléfono: 608385924
          E-mail: ParcSanitari.servei.infeccions@sjd.es
          <br></br>
          Los investigadores le agradecen su inestimable colaboración.
          <br></br>          <br></br>
          Proyecto/Estudio de investigación DESARROLLO DE UNA PLATAFORMA DIGITAL NACIONAL DE REGISTRO DE BACTERIEMIAS (AppATB) PARA MEJORAR LA PRESCRIPCIÓN ANTIBIÓTICA AL ADECUARLA AL ECOSISTEMA MICROBIANO DE CADA CENTRO HOSPITALARIO.
        </div>
        <br></br>
        <label>ACEPTO A PARTICIPAR EN EL ESTUDIO</label>
        <div>
          <Form>

            <div key={`reverse-radio`} className="mb-3">
              <Form.Check

                label="Si"
                name="group1"
                type={"radio"}
                id={`reverse-radio-1`}
                onChange={handleAcept}

              />
              <Form.Check

                label="No"
                name="group1"
                type={"radio"}
                id={`reverse-radio-2`}
                onChange={handleDecline}
              />

            </div>

          </Form>
        </div>
      </div>
    )
  }
  const slice2 = () => {
    return (
      <div className="form-group mt-3">
        <label>dos</label>
      </div>
    )
  }
  const slice3 = () => {
    return (
      <div className="form-group mt-3">
        <label>tres</label>
      </div>
    )
  }
  const handleAcept = (event) => {
    setAcept(true)
  }
  const handleDecline = (event) => {
    setAcept(false)
  }

  const handleNext = (event) => {
    let temp = position
    let temp2 = temp + 1


    CiService(username)
      .then(async (response) => {
        if (response.ok) {
       //   setPosition(temp2)
          setModalShow(true)
         // navigate("/", { replace: true });
        } else {
          const data = await response.json();
     
        }
      })
      .catch((error) => {

        console.error(error);
      });

  }
  const handleBack = (event) => {
    let temp = position
    let temp2 = temp - 1
    setPosition(temp2)
    navigate("/", { replace: true });


  }

  const handleClose = (event) => {
    setModalShow(false)
    navigate("/", { replace: true });

  }


  return (
    <>
      <div className="install-consent">
        <h3 style={{ color: '#2c4062' }} className="Auth-form-title">Welcome to EMMA</h3>

      </div>
      <div className="body_consent">
        {position == 1 ? slice1() : null}
        {position == 2 ? slice2() : null}
        {position == 3 ? slice3() : null}

        {acept ?
          <button style={{ float: "right", marginRight: "15px",marginBottom:"20px" }}
            onClick={handleNext}
            type="submit" className="btn btn_consent">
            {t('consent.button.text2')}
          </button> : null}

        {
        <button style={{ marginLeft: "15px",marginBottom:"20px" }} 
        onClick={handleBack}
         type="submit" className="btn btn_consent">
          {t('consent.button.text1')}
        </button>
      }
      </div>
      <CustomMessage show={modalShow} title={modalTitle} message={modalMessage} close={handleClose} />
    </>
  );


}