import React, { useState } from "react";
import { Accordion, Button, Col, Container, Modal, ProgressBar, Row, Stack, Table } from "react-bootstrap";
import i18n from 'i18next';
import { ImMakeGroup } from "react-icons/im";
import { FaBacteria } from "react-icons/fa";
import CustomMessage from "../components/CustomMessage";
import { GiInfo } from "react-icons/gi";
function CustomMatrix({ chartData,event }) {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const [show, setShow] = useState(false);

  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height
    };
  }

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const matrixItems = chartData.antibiograms.map((item) => {
    return (
      <div> <span className="matrix_row" >{item.bacteria}</span>
        {item.antibiotics.map((item2) => {
          if (item2 != undefined) {
            if (item2.percentageS >= 75) {

              return (

                <span className="matrix_s"></span>
              )
            } else if (item2.percentageS > 25 && item2.percentageS < 75) {
              return (

                <span className="matrix_i"></span>
              )
            } else {
              return (

                <span className="matrix_r"></span>
              )
            }
          } else {
            return (
              <span className="matrix_none"></span>
            )
          }
        })
        }
      </div>

    )

  }

  );
  const matrixAntibiotic = chartData.antibiotics.map((item) => {
    return (
      <span className="matrix_column">{item.name}</span>
    )
  }
  );

 
  function matrixGrpHeader() {

    return(
     chartData.antibiotics.map((item) => {
      
   <th>ddd {item.name }</th>
      
    })

    )
  }
  const matrixHeader = chartData.antibiotics.map((item) => {
    return (
      <th><span className="matrix_column_t"> {item.name}</span></th>
    )
  }
  );
  var grpName="";
  const matrixBody = chartData.antibiograms.map((item) => {
  
console.log(grpName)
    if(grpName!==item.group){
      grpName=item.group
      return(

        <><tr className="row_group"><td></td><td colSpan="100%"><span className="grouplabel">{grpName}</span></td></tr><tr><td className="matrix_row_t sticky-col first-col"><span onClick={e => event(item)}>{item.bacteria}</span></td>
          {item.antibiotics.map((item2) => {
            if (item2 != undefined) {
              if (item2.percentageR >= 20) {

                return (

                  <td className="matrix_r_t"></td>
                );
              } else if (item2.percentageI < 20) {
                return (

                  <td className="matrix_s_t"></td>
                );
              } else {
                return (

                  <td className="matrix_i_t"></td>
                );
              }
            } else {
              return (
                <td className="matrix_none_t"></td>
              );
            }
          })}
        </tr></>
      )

    }else{
    return (
  
      <tr><td className="matrix_row_t sticky-col first-col" ><span onClick={e => event(item)} >{item.bacteria}</span></td>
        {item.antibiotics.map((item2) => {
          if (item2 != undefined) {
            if (item2.percentageR >= 20) {

              return (

                <td className="matrix_r_t"></td>
              );
            } else if (item2.percentageI < 20) {
              return (

                <td className="matrix_s_t"></td>
              );
            } else {
              return (

                <td className="matrix_i_t"></td>
              );
            }
          } else {
            return (
              <td className="matrix_none_t"></td>
            );
          }
        })
        }
      </tr>

    )
      }

  }

  );
  return (
    <Container style={{ overflow: 'scroll', width: '100%', paddingTop: "20px", paddingLeft: "0px" }}>
      {/*} <div>
      <span className="matrix_row" ></span>
        {matrixAntibiotic}
      </div>
      {matrixItems}
       {*/}
   
      <div className="matrix">

          <Table style={{ width: "max-content" }} bordered hover size="sm"> 
            <thead>
            <tr>
              <th className="sticky-col first-col"></th>
              <th className="subheader"  colspan="10"><span >Penicilinas</span></th>
              <th className="subheader" colspan="10"><span >Cefalosporinas</span></th>
              <th className="subheader" colspan="3"><span >Quinolonas</span></th>
              <th className="subheader" colspan="3"><span >Aminoglucosidos</span></th>
              <th className="subheader"  colspan="3"><span >Macrolidos</span></th>
              <th className="subheader"  colspan="1"><span>Lincosamidas</span></th>
              <th className="subheader"  colspan="1"><span>Tigeciclina</span></th>
              <th className="subheader"  colspan="1"><span>Tetraciclinas</span></th>
              <th className="subheader"  colspan="3"><span>Gluco-Lipopetidos</span></th>
              <th className="subheader"  colspan="1"><span >Oxazolidonas</span></th>
              <th className="subheader"  colspan="1"><span >Polimixinas</span></th>
              <th className="subheader"  colspan="8"><span>Otros Antibioticos</span></th>
              <th className="subheader"  colspan="3"><span>Azoles</span></th>
              <th className="subheader"  colspan="4"><span>Equinocandinas</span></th>
              <th className="subheader"  colspan="1"><span>Polienos</span></th>
              <th className="subheader"  colspan="1"><span>Otros Antifungicos</span></th>

            </tr>
              <tr><th className="sticky-col first-col" ><span style={{color:"#d7aa22"}}  onClick={handleShow}><GiInfo  size={35} /></span></th>{matrixHeader}</tr></thead>
            <tbody>{matrixBody}</tbody>
          </Table>

      </div>

      <Modal show={show} onHide={handleClose}
       aria-labelledby="contained-modal-title-vcenter"
       centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Antibiotic info</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{fontSize:"12px",width:"100%",marginLeft:"15px"}}>
        <Row style={{marginBottom:"3px"}}>
          <Col style={{background:"green",borderRadius:"5px"}}  xs={1} md={1}><span style={{color:"white"}} >S</span></Col><Col  xs={11} md={11}>Sensitive</Col>
        </Row>
        <Row   style={{marginBottom:"3px"}}>
          <Col style={{background:"#93a0c6",borderRadius:"5px"}} xs={1} md={1} ><span style={{color:"white"}}>I</span></Col><Col xs={11} md={11}>Sensitive but in incremental dose</Col>
        </Row>
        <Row>
          <Col style={{background:"red",borderRadius:"5px"}} xs={1} md={1}><span style={{color:"white"}}>R</span></Col><Col xs={11} md={11}>Resistant</Col>
        </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Acept
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>

  );
}

export default CustomMatrix;