import { render } from "@testing-library/react";
import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import CiService from "../services/CiService";
import CustomMessage from "../components/CustomMessage";


export default function BienScreen(props) {
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





  return (

      <div className="install-consent">
     hola
      </div>

  );


}