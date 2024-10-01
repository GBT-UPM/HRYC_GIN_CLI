import React, { useState } from "react";
import { Accordion, Col, Container, ProgressBar, Row, Stack } from "react-bootstrap";
import i18n from 'i18next';

function CustomTable({ chartData }) {
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
  function ListAntibiotics(anti){
    console.log(anti)
    let index=4444
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
console.log(item.antibiotics)
let index = 1
//let a=ListAntibiotics(item.antibiotics)
    return (


<Accordion defaultActiveKey="2" flush>
      <Accordion.Item eventKey={index++}>
        <Accordion.Header>{item.bacteria}</Accordion.Header>
        <Accordion.Body>
        {item.antibiotics !=undefined ? item.antibiotics.map((item) => {
          return (
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
          ) 
        }):null}
       {/*item.antibiotics.map((x)=>{<span>x.bacteria</span>})*/}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>

    )

  }
  );

  return (
    <Container style={{ overflow: 'scroll', width: '100%' }}>

      {/*
      <Stack direction="vertical" gap={3}>
        {listItems}
      </Stack>

  */}
{accordionItems}
    </Container>

  );
}

export default CustomTable;