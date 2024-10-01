import React, { useState } from "react";
import { Button, Col, InputGroup, Modal, NavLink, Row } from "react-bootstrap";
import Select from 'react-select'
import { AGE, GENDER, SOURCE, PR, GPR, FOCUS, DIAGNOSTIC, ACQUISITION, BACTERIA, FILTER_BACTERIA, FILTER_GRUPO, FILTER_PR, FILTER_ACQUISITION, FILTER_SOURCE, FILTER_FOCUS, FILTER_DIAGNOSIS, FILTER_ANTIBIOGRAM, FILTER_MAIN, ANTIBIOTIC, SUBGPR, GRPANTIBIOTIC } from "../utils/Globals";
import i18n from 'i18next';
import { Box, Fab, FormControl, FormControlLabel, FormLabel, Input, Radio, RadioGroup, Slider, TextField } from "@mui/material";
import MuiInput from '@mui/material/';
import { styled } from '@mui/material/styles';
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaAcquisitionsIncorporated, FaBacteria, FaDiagnoses, FaProcedures, FaShieldVirus } from "react-icons/fa";
import { PiUserFocusDuotone } from "react-icons/pi";
import { ImTable2 } from "react-icons/im";
const pr = PR
const source = SOURCE
const gpr = GPR
const subgpr = SUBGPR
const focus = FOCUS
const diagnostic = DIAGNOSTIC
const acquisition = ACQUISITION
const bacteria = BACTERIA
const age = AGE
const gender = GENDER
const antibiotic =ANTIBIOTIC
const grpantibiotic =GRPANTIBIOTIC

function BpRadio(props) {
  return (
    <Radio
      disableRipple
      color="default"
      checkedIcon={<BpCheckedIcon />}
      icon={<BpIcon />}
      {...props}
    />
  );
}
const BpIcon = styled('span')(({ theme }) => ({
  borderRadius: '50%',
  width: 16,
  height: 16,
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 0 0 1px rgb(16 22 26 / 40%)'
      : 'inset 0 0 0 1px rgba(16,22,26,.2), inset 0 -1px 0 rgba(16,22,26,.1)',
  backgroundColor: theme.palette.mode === 'dark' ? '#394b59' : '#f5f8fa',
  backgroundImage:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg,hsla(0,0%,100%,.05),hsla(0,0%,100%,0))'
      : 'linear-gradient(180deg,hsla(0,0%,100%,.8),hsla(0,0%,100%,0))',
  '.Mui-focusVisible &': {
    outline: '2px auto rgba(19,124,189,.6)',
    outlineOffset: 2,
  },
  'input:hover ~ &': {
    backgroundColor: theme.palette.mode === 'dark' ? '#30404d' : '#ebf1f5',
  },
  'input:disabled ~ &': {
    boxShadow: 'none',
    background:
      theme.palette.mode === 'dark' ? 'rgba(57,75,89,.5)' : 'rgba(206,217,224,.5)',
  },
}));

const BpCheckedIcon = styled(BpIcon)({
  backgroundColor: '#137cbd',
  backgroundImage: 'linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0))',
  '&:before': {
    display: 'block',
    width: 16,
    height: 16,
    backgroundImage: 'radial-gradient(#fff,#fff 28%,transparent 32%)',
    content: '""',
  },
  'input:hover ~ &': {
    backgroundColor: '#106ba3',
  },
});

function CustomPrescFilters(props, event) {
  return (
    <div >
      {(props.type == FILTER_MAIN) ?
        <>
        <Row style={{ marginTop: "20px" }}>
            <label>Age</label>
            <Col style={{ position: "relative" }} className="itemName" xs={9} md={9}>
              <Box >
                <Slider
                  style={{ position: "absolute", top: "10px" }}
                  getAriaLabel={() => 'Age range'}
                  value={props.defaultage}
                  onChange={props.onChangeage}
                  valueLabelDisplay="auto"
                  color="secondary"
                  sx={{
                  }}
                />
              </Box>
            </Col>
            <Col className="itemName" xs={3} md={3}>
              <p><span className="range">min: </span><label>{props.rangeminage}</label></p>
              <p><span className="range">max: </span> <label>{props.rangemaxage}</label></p>
            </Col>
          </Row>
          <Row className="section" style={{ marginTop: "0px" }}>
{/*}
            <Col className="itemName" xs={3} md={3}>
              <label>{i18n.t('filter.text11')}</label><Select
                defaultValue={props.defaultminage}
                name="min"
                options={age}
                className="basic-multi-select"
                classNamePrefix="select"
                onChange={props.selagemin}
                isSearchable={true} />
            </Col>
            <Col className="itemName" xs={3} md={3}>
              <label>{i18n.t('filter.text12')}</label><Select
                defaultValue={props.defaultmaxage}
                name="max"
                options={[...new Array(100)].map((each, index) => ({ label: index + 1, value: index + 1 }))}
                className="basic-multi-select"
                classNamePrefix="select"
                onChange={props.selagemax}
                isSearchable={true} />
            </Col>{*/}
            <Col className="itemName" xs={6} md={6}>
              <label>{i18n.t('filter.text13')}</label>
              <Select
                defaultValue={props.defaultsex}
                isMulti
                name="sex"
                options={gender}
                className="basic-multi-select"
                classNamePrefix="select"
                onChange={props.onChangesex}
                isSearchable={false} />
            </Col>

          </Row>

          <Row className="section" style={{ marginTop: "10px" }}>
            <label style={{ "fontStyle": "italic" }}>Dates</label>
            <Col className="itemName" xs={6} md={6}>
              <ReactDatePicker className=".itemName"
                id="start"
                selected={props.startdate}
                onChange={props.selstartdate}
                selectsStart
                startDate={props.startdate}
                endDate={props.enddate}
                dateFormat="MM/yyyy"
                showMonthYearPicker
              />
            </Col>
            <Col className="itemName" xs={6} md={6}>
              <ReactDatePicker
                style={{ width: "30px" }}
                selected={props.enddate}
                onChange={props.selenddate}
                selectsEnd
                startDate={props.enddate}
                endDate={props.enddate}
                minDate={props.startdate}
                dateFormat="MM/yyyy"
                showMonthYearPicker
                readonly
              />
            </Col>
          </Row>
          <div className="section" >

            <Row style={{ marginTop: "10px" }}>
            <Col className="itemName" xs={6} md={6}>
                <label>{i18n.t('filter.gpr')}</label><Select
                  defaultValue={props.defaultgpr}
                  isMulti
                  name="colors"
                  options={props.optionsgrp}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangegpr}
                  isSearchable={false} />
              </Col>
              <Col className="itemName" xs={6} md={6}>
                <label>{i18n.t('filter.subgpr')}</label><Select
                  defaultValue={props.defaultsubgpr}
                  isMulti
                  name="colors"
                  options={props.optionssubgrp}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangesubgpr}
                  isSearchable={true} />
              </Col>
            </Row>
            <Row style={{ marginTop: "10px" }}>
            <Col className="itemName" xs={6} md={6}>
                <label>{i18n.t('filter.subgpr')} 2</label><Select
                  defaultValue={props.defaultsubgpr2}
                  isMulti
                  name="colors"
                  options={props.optionssubgrp2}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangesubgpr2}
                  isSearchable={true} />
              </Col>
              <Col className="itemName" xs={6} md={6}>
                <label>{i18n.t('filter.bacteria')}</label><Select
                  defaultValue={props.defaultbacteria}
                  isMulti
                  name="colors"
                  options={props.optionsbacteria}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangebacteria}
                  isSearchable={true} />
              </Col>
            </Row>
            <Row style={{ marginTop: "10px" }}>

              <Col className="itemName" xs={6} md={6}>
                <label>{i18n.t('filter.pr')}</label><Select
                  defaultValue={props.defaultresistence}
                  isMulti
                  name="colors"
                  options={pr}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangeresistence}
                  isSearchable={true} />
              </Col>
            </Row>
          </div>
          <div className="section" >
            <Row style={{ marginTop: "10px" }}>
              <Col className="itemName" xs={6} md={6}>
                <label>{i18n.t('filter.acquisition')}</label><Select
                  defaultValue={props.defaultacquisition}
                  isMulti
                  name="colors"
                  options={acquisition}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangeacquisition}
                  isSearchable={false} />
              </Col>
              <Col className="itemName" xs={6} md={6}>
                <label>Source</label><Select
                  defaultValue={props.defaultsource}
                  isMulti
                  name="colors"
                  options={source}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangesource}
                  isSearchable={false} />
              </Col>
            </Row>
            <Row style={{ marginTop: "20px" }}>
              <Col className="itemName" xs={6} md={6}>
                <label>{i18n.t('filter.focus')}</label><Select
                  defaultValue={props.defaultfocus}
                  isMulti
                  name="colors"
                  options={props.optionsfocus}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangefocus}
                  isSearchable={true} />
              </Col>
              <Col className="itemName" xs={6} md={6}>
                <label>{i18n.t('filter.diagnostic')}</label><Select
                  defaultValue={props.defaultdiagnostic}
                  isMulti
                  name="colors"
                  options={props.optionsdiagnostic}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangediagnostic}
                  isSearchable={true} />
              </Col>

            </Row>
          </div>
          <div className="section" >
            <Row style={{ marginTop: "20px" }}>
              <Col className="itemName" xs={6} md={6}>
                <label>Antibiotic groups</label><Select
                  defaultValue={props.defaultgrpantibiotic}
                  isMulti
                  name="colors"
                  options={grpantibiotic}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangegrpantibiotic}
                  isSearchable={true} />
              </Col>
              <Col className="itemName" xs={6} md={6}>
                <label>Antibiotic subgroup</label><Select
                  defaultValue={props.defaultsubgrpantibiotic}
                  isMulti
                  name="colors"
                  options={props.optionssubgrpantibiotic}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangesubgrpantibiotic}
                  isSearchable={true} />
              </Col>

            </Row>
            <Row style={{ marginTop: "20px" }}>
              <Col className="itemName" xs={6} md={6}>
                <label>Antibiotic</label><Select
                  defaultValue={props.defaultantibiotic}
                  isMulti
                  name="colors"
                  options={props.optionsantibiotic}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={props.onChangeantibiotic}
                  isSearchable={true} />
              </Col>

            </Row>
          </div>
          <Row style={{ marginTop: "10px" }}>
            <Col className="itemName" xs={4} md={4}>
              <Fab style={{ width: "100%", fontSize:"12px" }} onClick={() => props.goTo("bacteria")} variant="extended" size="medium" className="micro">
                Bacteria
              </Fab>
            </Col>
            <Col className="itemName" xs={4} md={4}>
              <Fab style={{ width: "100%", fontSize:"12px"  }} onClick={() => props.goTo("group")} variant="extended" size="medium" className="micro">
                Groups
              </Fab>
            </Col>
            <Col className="itemName" xs={4} md={4}>
              <Fab style={{ width: "100%", fontSize:"12px"  }} onClick={() => props.goTo("subgroup")} variant="extended" size="medium" className="micro">
                SubGroups
              </Fab>
            </Col>
           
          </Row>
          <Row style={{ marginTop: "10px" }}>
          <Col className="itemName" xs={4} md={4}>
              <Fab style={{ width: "100%", fontSize:"12px"  }} onClick={() => props.goTo("subgroup2")} variant="extended" size="medium" className="micro">
                SubGroups 2
              </Fab>
            </Col>
          <Col className="itemName" xs={4} md={4}>
              <Fab style={{ width: "100%", fontSize:"12px"  }} onClick={() => props.goTo("resistance")} variant="extended" size="medium" className="micro">
                Resistence
              </Fab>
            </Col>
            </Row>
          <Row style={{ marginTop: "10px" }}>
            <Col className="itemName" xs={4} md={4}>

              <Fab style={{ width: "100%", fontSize: "12px" }} onClick={() => props.goTo("acquisition")} variant="extended" size="medium" className="clinical">
                {i18n.t('clinical.section1.title')}
              </Fab>
            </Col>
            <Col className="itemName" xs={4} md={4}>

              <Fab style={{ width: "100%", fontSize: "12px" }} onClick={() => props.goTo("source")} variant="extended" size="medium" className="clinical">
                {i18n.t('clinical.section2.title')}
              </Fab>
            </Col>
            <Col className="itemName" xs={4} md={4}>

              <Fab style={{ width: "100%", fontSize: "12px" }} onClick={() => props.goTo("focus")} variant="extended" size="medium" className="clinical">
                {i18n.t('clinical.section3.title')}
              </Fab>
            </Col>
          </Row>
          <Row style={{ marginTop: "10px",marginBottom:"20px" }}>
       
            <Col className="itemName" xs={4} md={4}>

              <Fab style={{ width: "100%",fontSize: "12px"  }} onClick={() => props.goTo("diagnostic")} variant="extended" size="medium" className="clinical">
               {i18n.t('clinical.section4.title')}
              </Fab>
            </Col>
            <Col className="itemName" xs={8} md={8}>

            <Fab style={{ width: "100%",fontSize: "12px" }} onClick={() => props.gotToMatrix()} variant="extended" size="medium" className="other">
              Bacteria/Antibiotic
            </Fab>
            </Col>
          </Row>

          {/*}
          <Row style={{ marginTop: "10px" }}>
            <Col className="itemName" xs={6} md={6}>
              <Fab style={{ width: "100%" }} onClick={() => props.goTo("bacteria")} variant="extended" size="medium" className="micro">
                <FaBacteria style={{ marginRight: "5px" }} size={15} />Bacteria
              </Fab>
            </Col>
            <Col className="itemName" xs={6} md={6}>
              <Fab style={{ width: "100%" }} onClick={() => props.goTo("group")} variant="extended" size="medium" className="micro">
                <FaBacteria style={{ marginRight: "5px" }} size={15} />Groups
              </Fab>

            </Col>
          </Row>
          <Row style={{ marginTop: "10px" }}>
            <Col className="itemName" xs={6} md={6}>

              <Fab style={{ width: "100%" }} onClick={() => props.goTo("resistance")} variant="extended" size="medium" className="micro">
                <FaShieldVirus style={{ marginRight: "5px" }} size={15} />{i18n.t('microbiology.section3.title')}
              </Fab>
            </Col>

          </Row>
          <Row style={{ marginTop: "10px" }}>
            <Col className="itemName" xs={6} md={6}>

              <Fab style={{ width: "100%" }} onClick={() => props.goTo("acquisition")} variant="extended" size="medium" className="clinical">
                <FaAcquisitionsIncorporated style={{ marginRight: "5px" }} size={15} />{i18n.t('clinical.section1.title')}
              </Fab>
            </Col>
            <Col className="itemName" xs={6} md={6}>

              <Fab style={{ width: "100%" }} onClick={() => props.goTo("source")} variant="extended" size="medium" className="clinical">
                <FaProcedures style={{ marginRight: "5px" }} size={15} />{i18n.t('clinical.section2.title')}
              </Fab>
            </Col>
          </Row>
          <Row style={{ marginTop: "10px" }}>
            <Col className="itemName" xs={6} md={6}>

              <Fab style={{ width: "100%" }} onClick={() => props.goTo("focus")} variant="extended" size="medium" className="clinical">
                <PiUserFocusDuotone style={{ marginRight: "5px" }} size={15} />{i18n.t('clinical.section3.title')}
              </Fab>
            </Col>
            <Col className="itemName" xs={6} md={6}>

              <Fab style={{ width: "100%" }} onClick={() => props.goTo("diagnostic")} variant="extended" size="medium" className="clinical">
                <FaDiagnoses style={{ marginRight: "5px" }} size={15} />{i18n.t('clinical.section4.title')}
              </Fab>
            </Col>
          </Row>
         
          <Row style={{ marginTop: "10px" }}>
            <Col className="itemName" xs={6} md={6}>

              <Fab style={{ width: "100%" }} onClick={() => props.gotToMatrix()} variant="extended" size="medium" className="clinical">
                <ImTable2 style={{ marginRight: "5px" }} size={15} />Bacteria/Aantibiotic
              </Fab>
            </Col>
          </Row>    {*/}
        </>
        : null}

    </div>
      
  );
}
export default CustomPrescFilters;