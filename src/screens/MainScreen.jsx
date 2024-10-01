
import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";
import { Button, Card, Col, Row } from "react-bootstrap";
import ApiService from "../services/ApiService";
import QuestionPanel from "../components/QuestionPanel";
import { useState } from "react";
import Panel from "../components/Panel";
import { TiPuzzleOutline } from "react-icons/ti";
import { SiReacthookform } from "react-icons/si";
import { GiMultipleTargets } from "react-icons/gi";
import { VscGraph } from "react-icons/vsc";
import deporte from "../assets/images/deporte.jpg";
import nutricion from "../assets/images/nutricion.jpg";
import meditacion from "../assets/images/meditacion.jpg";
import { Fab } from "@mui/material";
import PieChart from "../components/PieChart";

import {faker} from "@faker-js/faker";
import { LineChart } from "../components";
import CustomTipsList from "../components/CustomTipsList";
Chart.register(CategoryScale);



export default function MainScreen(props) {
  const [questionnaire, setQuestionnaire] = useState();
  const [showQuestionnaire,setShowQuestionnaire] = useState(false);
  const [showTips,setShowTips] = useState(false);
  const [showTipsList,setShowTipsList] = useState(false);
  const [tipsList,setTipsList] = useState([]);
  const [showCharts,setShowCharts] = useState(false);
  const [responses, setResponses] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartDataLine, setChartDataLine] = useState([]);


  const data = {
    labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
    datasets: [
      {
        label: '# of Votes',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 206, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(255, 159, 64, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  const labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

   const dataline = {
    labels,
    datasets: [
      {
        label: 'Dataset 1',
        data: labels.map(() => faker.datatype.number({ min: -1000, max: 1000 })),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Dataset 2',
        data: labels.map(() => faker.datatype.number({ min: -1000, max: 1000 })),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };


  const goToQuestionnaire = () => {


    ApiService('', 'GET', '/questionnaire/patient/' + props.username, JSON.parse('{}'))
      .then((response) => {
        if (response.status === 200) {
          response.json().then((ques) => {

            console.log(ques)
            setQuestionnaire(ques);
            setShowQuestionnaire(true)
            let items = ques.items;

            items.forEach((item) => {
  
              console.log(item)  
      console.log(item.repeats)


 
    
            });
          })
            .catch((error) => {
              console.error(error);
            })
        } else {

        }
      }).catch((e) => {
        console.warn("errro red");

      })
  }
  const goToTips = (type) => {
   setShowQuestionnaire(false)
   setShowTips(true)
   setShowCharts(false)
  }
  const goToTipsScreem= (type) => {
    ApiService('', 'GET', '/tips/type/' + type, JSON.parse('{}'))
    .then((response) => {
      if (response.status === 200) {
        response.json().then((tips) => {
        console.log(tips)
        setShowTipsList(true)
        setTipsList(tips)
        })
          .catch((error) => {
            console.error(error);
          })
      } else {

      }
    }).catch((e) => {
      console.warn("errro red");

    })
   }
  const goToCharts = (type) => {
    setShowQuestionnaire(false)
    setShowTips(false)
    setShowCharts(true)
    setChartData(data)
    setChartDataLine(dataline)
   }
  const onComplete = () => {
    var identifier=questionnaire.identifier;
    var r_identifier = identifier.slice(0, 3)+ "R" + identifier.slice(3);
    console.log("------- ----------- -------")
    console.log(r_identifier)
    const response = {
      "identifier": r_identifier,
      "questionnaire": identifier,
      "status": "completed",
      "patient":props.username,
      "item":responses
    };
    console.log(response)
    ApiService('', 'POST', '/response',response )
      .then((res) => {
       console.log(res)
       setShowQuestionnaire(false)
      }).catch((e) => {
        console.warn("errro red");

      })
  }
  const onCancel = () => {
    setResponses([]);
    setShowQuestionnaire(false)
  }
  const generateMenuTips = () => {
    return (
      <><Row style={{marginTop:20}}>
          <Col xs={1} md={1}></Col>
        <Col xs={10} md={10}>
          <Card className="">
          <Card.Img onClick={() => goToTipsScreem('sport')} variant="top" src={deporte} />
          </Card>
        </Col>

      </Row><Row style={{marginTop:20}}>
      <Col xs={1} md={1}></Col>
        <Col xs={10} md={10}>
          <Card className="">
          <Card.Img onClick={() => goToTipsScreem('nutrition')} variant="top" src={nutricion} />
          </Card>
        </Col>

        </Row><Row style={{marginTop:20}}>
        <Col xs={1} md={1}></Col>
        <Col xs={10} md={10}>
          <Card className="">
          <Card.Img onClick={() => goToTipsScreem('meditation')} variant="top" src={meditacion} />
          </Card>
        </Col>

        </Row></>
    );
  }
  const generateQuestions = () => {
    const prueba = questionnaire?.items.sort((a, b) => a.id - b.id)
    const data = prueba.map((item, index) => {

      if (item.type === "display") {
        return (
          <>

            {item.hasOwnProperty("item") && item.item.map((item, index) => {
              let isResponseEmpty = false;

              return (
                <Panel isResponseEmpty={isResponseEmpty}>
                  <QuestionPanel
                    linkId={item.linkId}
                    question={item.text}
                    questionNumber={1}
                    options={item.answerOption != null ? JSON.parse(item.answerOption).answerOption : []}
                    enable={item.enableWhen != null ? JSON.parse(item.enableWhen).enableWhen : []}
                    type={item.type_}
                    id={index}
                    updateResponses={updateResponses}
                    responses={responses}
                    isResponseEmpty={isResponseEmpty}
                    isDisabled={false}
                    repeats={item.repeats}
                  />
                </Panel>
              );
            })}
          </>
        );
      } else {

        return (
          <Panel >
            <QuestionPanel
              linkId={item.linkId}
              question={item.text}
              questionNumber={2}
              options={item.answerOption != null ? JSON.parse(item.answerOption).answerOption : []}
              enable={item.enableWhen != null ? JSON.parse(item.enableWhen).enableWhen : []}
              type={item.type_}
              id={index}
              updateResponses={updateResponses}
              responses={responses}
              isDisabled={false}
              repeats={item.repeats ? true:false}
            />
          </Panel>
        );
      }
    });
    return data;
  };
  const updateResponses = (code, questionNumber, type, linkId, display, rep) => {

    let existingResponsesArray = [...responses];
    let arrayObject = {};
    arrayObject = {
      linkId,
      value: display,
      code
    };
    if (rep) {
      let index = existingResponsesArray.findIndex(item => item.linkId === linkId && item.code === code);
      if (index !== -1) {
        let temp = existingResponsesArray.splice(index, index);
        console.log(temp)
      } else {
        existingResponsesArray.push(arrayObject);
      }
    } else {
      // Find the index of the item in the array
      let index = existingResponsesArray.findIndex(item => item.linkId === linkId);

      // If the item is found, update it
      if (index !== -1) {
        existingResponsesArray[index] = arrayObject;
      }
      else {
        existingResponsesArray.push(arrayObject);
      }
    }
    setResponses(existingResponsesArray);
  }
  return (
    <><span></span>
      {!showQuestionnaire && !showTips && !showCharts ?
        <><Row>
          <Col className="bienvenida">
            <p style={{fontSize:20}}>Bienvenidx {props.username}</p>
        <span>  

          <p>Su participación es fundamental para avanzar en el conocimiento y tratamiento de la endometriosis.</p>
          <p>¡Gracias por ser parte de este paso hacia un mejor manejo de la endometriosis</p>
          </span> </Col>
        </Row>
          <Row>
            <Col xs={6} md={6} onClick={() => goToQuestionnaire()}>
            <Card className="homeSection2 clinical">
              <Card.Body>
                <SiReacthookform size={35} />
                <Card.Title className="homeTitle">Cuestionarios</Card.Title>
              </Card.Body>
            </Card>
            </Col>
            <Col xs={6} md={6} onClick={() => goToTips()}>
            <Card className="homeSection2 micro">
              <Card.Body>
                <GiMultipleTargets size={35} />
                <Card.Title className="homeTitle">Consejos</Card.Title>
              </Card.Body>
            </Card>
            </Col>
          </Row>
          <Row style={{marginTop:20}}>
            <Col xs={6} md={6} onClick={() => goToQuestionnaire()}>
            <Card className="homeSection2 game">
              <Card.Body>
                <TiPuzzleOutline size={35} />
                <Card.Title className="homeTitle">Configuración</Card.Title>
              </Card.Body>
            </Card>
            </Col>
            <Col xs={6} md={6} onClick={() => goToCharts()}>
            <Card className="homeSection2 grap">
              <Card.Body>
                <VscGraph size={35} />
                <Card.Title className="homeTitle">Mis datos</Card.Title>
              </Card.Body>
            </Card>
            </Col>
          </Row>
          </>
        : null}
      {showQuestionnaire ?
        <Row>
          <div style={{marginTop:20}}>
          {generateQuestions()}
          </div>
          <Row style={{marginTop:20}}>
            <Col xs={6} md={6}>
            <Fab style={{ width: "100%", fontSize:"12px" }}  onClick={() => onComplete()} variant="extended" size="medium" className="micro">Guardar </Fab>
        
            </Col>
            <Col xs={6} md={6}>
            <Fab style={{ width: "100%", fontSize:"12px" }}  onClick={() => onCancel()} variant="extended" size="medium" className="micro">Cancelar </Fab>
            </Col>
          </Row>
        </Row>
        : null}
        {showTips ?
        <>
        {showTipsList ?
         <>
       
         
         <Row>
              <Col xs={8} md={8}></Col>
              <Col xs={2} md={2}>
              <Fab onClick={() => { setShowTipsList(false) } }>atrás</Fab>
              </Col>
            </Row><Row>
                <div style={{ marginTop: 20 }}>
                <CustomTipsList chartData={tipsList}></CustomTipsList>
                </div>

              </Row>
         
         
         </>
        :
        <><Row>
              <Col xs={8} md={8}></Col>
              <Col xs={2} md={2}>
                <Fab onClick={() => { setShowQuestionnaire(false); setShowTips(false); } }>inicio</Fab>
              </Col>
            </Row><Row>
                <div style={{ marginTop: 20 }}>
                  {generateMenuTips()}
                </div>

              </Row></>
           }
        </>
        : null}
          {showCharts ?
        <><Row>
            <Col xs={8} md={8}></Col>
          <Col xs={2} md={2}>
          <Fab  onClick={() => {setShowQuestionnaire(false);setShowCharts(false)}} >inicio</Fab>
          </Col>
          </Row><Row>
          <div style={{ marginTop: 20 }}>
            <PieChart chartData={chartData} ></PieChart>
         <LineChart chartData={chartDataLine}></LineChart>
          </div>

        </Row></>
        : null}
    </>

  )
}
