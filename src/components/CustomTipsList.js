import React, { useState } from "react";
import { Card, Col, Container, Row, Stack } from "react-bootstrap";

function CustomTipsList({ chartData }) {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height
    };
  }
  let index = 1
  console.log(chartData)
  let listItems = null;
  if (chartData !== undefined) {
    console.log("entra")
    listItems = chartData.map((item) =>
      <Card className="tip">
        {item.image != null ?
          <Card.Img variant="top" src={item.image} />
          : null}
        <Card.Body>
          <Card.Title style={{ color: "#040d50" }}>{item.title}</Card.Title>
          <Card.Text style={{ fontSize: "12px", lineHeight: "2", textAlign: "justify", marginBottom: "0px" }}>
            {item.text}
          </Card.Text>
          {item.link != null ?
            <Card.Link href={item.link}>enlace</Card.Link>
            : null}
        </Card.Body>
      </Card>
    );
  }
  return (
    <Container height={windowDimensions.height * 0.5} style={{ overflow: 'scroll' }}>

      {listItems !== undefined ? listItems : null}

    </Container>

  );
}

export default CustomTipsList;