import React, { useState } from "react";
import { Accordion, Col, Container, ProgressBar, Row, Stack } from "react-bootstrap";
import i18n from 'i18next';
import { ImMakeGroup } from "react-icons/im";
import { FaBacteria } from "react-icons/fa";

function CustomGroupTable({ chartData }) {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height
    };
  }
  let index = 1
  let bacteria_name = ""
  let show = true
  const listItems = chartData.map((item) => {
    if (bacteria_name != item.bacteria) {
      show = true
      bacteria_name = item.bacteria
    } else {
      show = false
    }

    return (
      <div key={index++}>

        {show == true ? item.bacteria : null}
        <div className="table_antibiotic">
          <span className="table_antibiotic_name">{item.antibiotic}</span>
          <Row>
            <Col xs={6} md={6}>
              <span className="table_antibiotic_sensible">{i18n.t('antibiogram.table1')}</span>
              <ProgressBar striped variant="success" now={item.percentageS} />
            </Col>
            <Col style={{ textAlign: "center" }} xs={3} md={3}>
              {item.numberS}
            </Col>
            <Col style={{ textAlign: "right" }} xs={3} md={3}>
              {item.percentageS} %
            </Col>
          </Row>
          <Row>
            <Col xs={6} md={6}>
              <span className="table_antibiotic_intermedio">{i18n.t('antibiogram.table2')}</span>
              <ProgressBar striped variant="warning" now={item.percentageI} />
            </Col>
            <Col style={{ textAlign: "center" }} xs={3} md={3}>
              {item.numberI}
            </Col>
            <Col style={{ textAlign: "right" }} xs={3} md={3}>
              {item.percentageI} %
            </Col>
          </Row>
          <Row>
            <Col xs={6} md={6}>
              <span className="table_antibiotic_resistente">{i18n.t('antibiogram.table3')}</span>
              <ProgressBar striped variant="danger" now={item.percentageR} />
            </Col>
            <Col style={{ textAlign: "center" }} xs={3} md={3}>
              {item.numberR}
            </Col>
            <Col style={{ textAlign: "right" }} xs={3} md={3}>
              {item.percentageR} %
            </Col>
          </Row>
        </div>
      </div>
    )

  }
  );
  function ListAntibiotics(anti) {
    console.log(anti)
    let index = 4444
    anti.forEach((item) => {
      return (
        <div key={index++}>

          {show == true ? item.bacteria : null}
          <div className="table_antibiotic">
            <span className="table_antibiotic_name">{item.antibiotic}</span>
            <Row>
              <Col xs={6} md={6}>
                <span className="table_antibiotic_sensible">{i18n.t('antibiogram.table1')}</span>
                <ProgressBar striped variant="success" now={item.percentageS} />
              </Col>
              <Col style={{ textAlign: "center" }} xs={3} md={3}>
                {item.numberS}
              </Col>
              <Col style={{ textAlign: "right" }} xs={3} md={3}>
                {item.percentageS} %
              </Col>
            </Row>
            <Row>
              <Col xs={6} md={6}>
                <span className="table_antibiotic_intermedio">{i18n.t('antibiogram.table2')}</span>
                <ProgressBar striped variant="warning" now={item.percentageI} />
              </Col>
              <Col style={{ textAlign: "center" }} xs={3} md={3}>
                {item.numberI}
              </Col>
              <Col style={{ textAlign: "right" }} xs={3} md={3}>
                {item.percentageI} %
              </Col>
            </Row>
            <Row>
              <Col xs={6} md={6}>
                <span className="table_antibiotic_resistente">{i18n.t('antibiogram.table3')}</span>
                <ProgressBar striped variant="danger" now={item.percentageR} />
              </Col>
              <Col style={{ textAlign: "center" }} xs={3} md={3}>
                {item.numberR}
              </Col>
              <Col style={{ textAlign: "right" }} xs={3} md={3}>
                {item.percentageR} %
              </Col>
            </Row>
          </div>
        </div>
      )
    });
  
  }
  const accordionItems = chartData.map((item) => {

    let index = 1
    let index2 = 1
    //let a=ListAntibiotics(item.antibiotics)
    return (


      <Accordion defaultActiveKey="2" flush>

        <Accordion.Item eventKey={index++}>
          <Accordion.Header className="gHeader">  <ImMakeGroup size={18} /><span className="name">{item.group}</span> <span className="num">{item.num} %</span></Accordion.Header>
          <Accordion.Body>

            <Accordion defaultActiveKey="2" flush>

              {item.bacteria != undefined ? item.bacteria.map((item) => {
                return (
                  <>
                    <Accordion.Item eventKey={index2++}>
                      <Accordion.Header className="bHeader"><FaBacteria size={18} /><span className="name">{item.bacteria}</span> <span className="num">{item.num} %</span></Accordion.Header>
                      <Accordion.Body>
                        {item.antibiotics != undefined ? item.antibiotics.map((item2) => {
                          return (
                            <>
                          {/*}
                              <Row className="bodyItem">
                                <Col className="bodyName" xs={6} md={4}>
                                  {item2.antibiotic} 
                                </Col>
                                <Col className="itemNumber" xs={2} md={2}>
                                  <span className="numberList table_antibiotic_sensible">{item2.numberS}</span>
                                </Col>
                                <Col xs={2} md={2}>
                                  <span className="numberList table_antibiotic_intermedio">{item2.numberI} </span>
                                </Col>
                                <Col xs={2} md={2}>
                                  <span className="numberList table_antibiotic_resistente">{item2.numberR} </span>
                                </Col>
                              </Row>
                          {*/}
                          
                          <div className="table_antibiotic">
                          <span className="bodyName">{item2.antibiotic} ({item2.numberS+item2.numberI+item2.numberR})</span>
                         {item2.percentageR >= 20 ?  <span className="table_r_t">Resistant </span>
                         :
                         item2.percentageI < 20 ? <span className="table_s_t">Sensitive</span>
                         :
                         item2.percentageI >= 20 ?<span className="table_i_t">Intermediate</span>:null
                         
                         }
                         
               
     
     
                          <Row>
                                  <Row>
                                    <Col xs={4} md={4}>
                                    {item2.percentageS} %
                                    </Col>
                                    <Col style={{ textAlign: "center",color:"#d9a407" }} xs={4} md={4}>
                                    {item2.percentageI} %
                                    </Col>
                                    <Col style={{ textAlign: "right",color:"red" }} xs={4} md={4}>
                                    {item2.percentageR} %
                                    </Col>
                                  </Row>
                                  <Row>
                                    <ProgressBar>
                                      <ProgressBar striped variant="success" now={item2.percentageS} key={1} />
                                      <ProgressBar variant="warning" now={item2.percentageI} key={2} />
                                      <ProgressBar striped variant="danger" now={item2.percentageR} key={3} />
                                    </ProgressBar>
                                  </Row>
                  {/*}
                              <Col xs={6} md={6}>
                                <span className="table_antibiotic_sensible">{i18n.t('antibiogram.table1')}</span>
                                <ProgressBar striped variant="success" now={item2.percentageS} />
                              </Col>
                              <Col style={{ textAlign: "center" }} xs={3} md={3}>
                                {item2.numberS}
                              </Col>
                              <Col style={{ textAlign: "right" }} xs={3} md={3}>
                                {item2.percentageS} %
                              </Col>
                            </Row><Row>
                                <Col xs={6} md={6}>
                                  <span className="table_antibiotic_intermedio">{i18n.t('antibiogram.table2')}</span>
                                  <ProgressBar striped variant="warning" now={item2.percentageI} />
                                </Col>
                                <Col style={{ textAlign: "center" }} xs={3} md={3}>
                                  {item2.numberI}
                                </Col>
                                <Col style={{ textAlign: "right" }} xs={3} md={3}>
                                  {item2.percentageI} %
                                </Col>
                              </Row><Row>
                                <Col xs={6} md={6}>
                                  <span className="table_antibiotic_resistente">{i18n.t('antibiogram.table3')}</span>
                                  <ProgressBar striped variant="danger" now={item2.percentageR} />
                                </Col>
                                <Col style={{ textAlign: "center" }} xs={3} md={3}>
                                  {item2.numberR}
                                </Col>
                                <Col style={{ textAlign: "right" }} xs={3} md={3}>
                                  {item2.percentageR} %
                                </Col>
                                   {*/}
                              </Row>
                          
                        </div>
                        
                         </> );
                        }) : null}
                        {/*item.antibiotics.map((x)=>{<span>x.bacteria</span>})*/}
                      </Accordion.Body>
                    </Accordion.Item>
                  </>
                )
              }) : null}

            </Accordion>
          </Accordion.Body>
        </Accordion.Item>

      </Accordion>

    )

  }
  );

  return (
    <Container style={{ overflow: 'scroll', width: '100%',paddingTop:"20px" }}>

      {/*
      <Stack direction="vertical" gap={3}>
        {listItems}
      </Stack>

  */}
      {accordionItems}
    </Container>

  );
}

export default CustomGroupTable;