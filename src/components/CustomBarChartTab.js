import React, { useState } from "react";
import { Col, Row, Stack, Tab, Tabs } from "react-bootstrap";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLabel, VictoryZoomContainer } from 'victory';
import i18n from 'i18next';

function CustomBarChartTab({ chartData, event }) {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height
    };
  }
  let index = 1
  const listItems = chartData.map((item) =>

    <Row onClick={e => event(item.code)} style={{ "borderBottom": "1px solid #adb5bd", "position": "relative", "width": "100%" }}>
      <Col className="itemName" xs={6} md={4}>
        {item.name != null ? item.name : "Unknown"}  <span style={{ color: '#b7ab00' }}> ({item.code})</span>
      </Col>
      <Col className="itemNumber" xs={2} md={3}>
        <span className="numberList">{item.number}</span>
      </Col>
      <Col xs={3} md={3}>
        <span className="itemPercentage">{item.percentage} %</span>
      </Col>
    </Row>

  );
  function Item({ chartData }) {
    return <Row style={{ "borderBottom": "1px solid #adb5bd" }}>
      <Col className="itemName" xs={6} md={4}>
        {chartData.name} ({chartData.code})
      </Col>
      <Col className="itemNumber" xs={3} md={4}>
        {chartData.number}
      </Col>
      <Col xs={3} md={4}>
        <span className="itemPercentage">{chartData.percentage}</span>
      </Col>
    </Row>
  }

  return (
    <div>
      <div>
        {/*<h4>Bacterias</h4>*/}
        <Tabs
          defaultActiveKey="graphic"
          id="uncontrolled-tab-example"
          className="mb-3"
        >
          <Tab eventKey="graphic" title={i18n.t('tab1.text1')}>
            <VictoryChart height={windowDimensions.height * 0.6} width={windowDimensions.width}
              padding={{ top: 10, bottom: 60, left: 40, right: 40 }}
              containerComponent={<VictoryZoomContainer style={{ borderColor: '#ffffff', borderRadius: 20, borderWidth: 2 }} responsive={true} width={windowDimensions.width}
                zoomDomain={{ x: [0, 10] }} />}
            >

              <VictoryBar
                data={chartData}
                // data accessor for x values
                x="code"
                // data accessor for y values
                y="number"
                barWidth={10}
                style={{ data: { fill: "#192f6a", strokeWidth: 10 } }}

              />
              <VictoryAxis dependentAxis
                style={{
                  axis: { stroke: 'gray', strokeWidth: 2 },
                  tickLabels: { fill: 'gray', fontSize: 16, padding: 3, },
                  ticks: {},
                  grid: { stroke: 'darkgray', strokeWidth: 1 }
                }} />
              <VictoryAxis
                style={{
                  axis: { stroke: 'gray', strokeWidth: 2 },
                  tickLabels: { fill: 'gray', fontSize: 12, padding: 30, angle: -45 },
                  ticks: {},
                  grid: { stroke: 'darkgray', strokeWidth: 0 }
                }}
                tickLabelComponent={<VictoryLabel verticalAnchor='middle' />}
              />

            </VictoryChart>
          </Tab>
          <Tab eventKey="data" title={i18n.t('tab1.text2')} >
            <Stack style={{ height: windowDimensions.height * 0.9, overflow: 'scroll' }} direction="vertical" gap={3}>
              {listItems}
            </Stack>
          </Tab>
        </Tabs>
      </div>






    </div>

  );
}

export default CustomBarChartTab;