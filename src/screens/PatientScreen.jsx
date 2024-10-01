

import { useTranslation } from "react-i18next";
import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";
import { Col, Container, Row } from "react-bootstrap";
import { MdExitToApp } from "react-icons/md";
import { MdHelp } from "react-icons/md";
import { useEffect, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import MainScreen from "./MainScreen";
import CustomMessage from "../components/CustomMessage";
import ApiService from "../services/ApiService";
Chart.register(CategoryScale);


export default function PatientScreen() {
  const [modalShow, setModalShow] = useState(false);
  const [modalTitle, setModalTitle] = useState("Help!");
  const [modalMessage, setModalMessage] = useState("For any questions or queries, please contact us at the following email address: parcsanitari.appatb@sjd.es");
  const location = useLocation();
  const [username, setUsername] = useState(); 
  useEffect(() => {
    console.log("entra")


    if (location.state == null) {
      navigate("/", { replace: true });
    } else {
      let username = location.state.username;
      console.log(username)
      setUsername(username)
      /*ApiService('', 'GET', '/questionnaire/patient/' + username, JSON.parse('{}'))
              .then((response) => {
                if (response.status === 200) {
                  response.json().then((json) => {
                  console.log(json)
                  console.log(json.title)
                  let items = json.items;
                  
                  items.forEach((item) => {
                    console.log(item)
                    let ao =item.answerOption
                    console.log(ao)
                    let ao2 = JSON.parse(ao)["answerOption"];
                    console.log(ao2)
                 
                  });
                  })
                    .catch((error) => {
                      console.error(error);
                    })
                } else {
        
                }
         
            }).catch((e) => {
              console.warn("errro red");
   
            })*/
  }


  }, []);

  function handleClose(s) {
    setModalShow(false)

  };
  
  let navigate = useNavigate();
  const [selected, setSelected] = useState(1);
  const filterHome = (id) => {
    console.log(id)
    setSelected(id)
  }

  const [t] = useTranslation();
  function exit(){
    navigate("/", { replace: true });
  }
  return (
    <Container className="App">

      <div className="header" style={{ marginBottom: '10px' }}>
      <span onClick={() => setModalShow(true)} className="arrowLeft"><MdHelp /> </span>
        <span>EMMA </span>
      <span onClick={() => exit()} className="arrowRight"><MdExitToApp /> </span>
      </div>
      {/*
      <Row style={{ marginTop: '5%', width: '90%', marginLeft: 'auto', marginRight: 'auto' }}>
        <Col id="fil1" onClick={() => filterHome(1)} className={selected == 1 ? 'homeFilter_select' : 'homeFilter'}><span className="">Main</span></Col>
        <Col id="fil2" onClick={() => filterHome(2)} className={selected == 2 ? 'homeFilter_select' : 'homeFilter'}><span className="">Bacteria</span></Col>
        <Col id="fil3" onClick={() => filterHome(3)} className={selected == 3 ? 'homeFilter_select' : 'homeFilter'}><span className="">Antibiotic</span></Col>
      </Row>
    */}
      {selected == 1 ? <MainScreen username={username}/> : null}
      <CustomMessage show={modalShow} title={modalTitle} message={modalMessage} close={handleClose} />
    </Container>

  );

}