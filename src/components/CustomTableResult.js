import React, { useState } from "react";
import { Col, Container, Row, Stack } from "react-bootstrap";

function CustomTableResult({ chartData, event  }) {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height
    };
  }
  function formatDate(date) {
  if (date != undefined){
   return  date.split('T', 1);
  }else{
    return null
  }
  }
  let index = 1
  let bacteria_name =""
  let show=true
  const listItems = chartData.map((item) => {
    if(bacteria_name != item.bacteria){
      show=true
      bacteria_name = item.bacteria
    }else{
      show=false
    }

    return (
      <div key={index++}>

        {show == true ? item.bacteria : null}
        <div onClick={e=>event(item.id)}  className="table_result">
          <Row>
            <Col xs={3} md={3}>
            <div className="table_result_param">internal</div>
              {item.internal}
            </Col>
            <Col  xs={5} md={5}>
            <div className="table_result_param">code</div>
              {item.code}
            </Col>
            <Col  xs={4} md={4}>
            <div className="table_result_param">date</div>
              {formatDate(item.observationDate)} 
            </Col>
          </Row>


        </div>
      </div>
    )
   
  }
  
  );
  return (
    <Container style={{ overflow: 'scroll',width:'100%' }}>


      <Stack direction="vertical" gap={3}>
        {listItems}
      </Stack>


    </Container>

  );
}

export default CustomTableResult;