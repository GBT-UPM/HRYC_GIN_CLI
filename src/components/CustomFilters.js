import React from "react";
import { Button, Modal } from "react-bootstrap";
import Select from 'react-select'
import { SOURCE, PR, GPR, FOCUS, DIAGNOSTIC, ACQUISITION, BACTERIA, FILTER_BACTERIA, FILTER_GRUPO, FILTER_PR, FILTER_ACQUISITION, FILTER_SOURCE, FILTER_FOCUS, FILTER_DIAGNOSIS, FILTER_ANTIBIOGRAM } from "../utils/Globals";
import i18n from 'i18next';


const pr = PR
const source = SOURCE
const gpr = GPR
const focus = FOCUS
const diagnostic = DIAGNOSTIC
const acquisition = ACQUISITION
const bacteria = BACTERIA
function CustomFilters(props) {
  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          {props.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {(props.type != FILTER_BACTERIA && props.type != FILTER_GRUPO) ?
          <><label>{i18n.t('filter.bacteria')}</label><Select
            defaultValue={props.defaultbacteria}
            isMulti
            name="colors"
            options={bacteria}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangebacteria}
            isSearchable={true} /></>

          : null}
        {(props.type != FILTER_GRUPO  && props.type != FILTER_ANTIBIOGRAM) ?
          <><label>{i18n.t('filter.gpr')}</label><Select
            defaultValue={props.defaultgpr}
            isMulti
            name="colors"
            options={gpr}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangegpr}
            isSearchable={false} /></>

          : null}

        {(props.type != FILTER_PR && props.type != FILTER_ANTIBIOGRAM) ?
          <><label>{i18n.t('filter.pr')}</label><Select
            defaultValue={props.defaultpr}
            isMulti
            name="colors"
            options={pr}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangepr}
            isSearchable={false} /></>
          : null}
        {(props.type != FILTER_ACQUISITION  && props.type != FILTER_ANTIBIOGRAM) ?
          <><label>{i18n.t('filter.acquisition')}</label><Select
            defaultValue={props.defaultacquisition}
            isMulti
            name="colors"
            options={acquisition}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangeacquisition}
            isSearchable={false} /></>
          : null}
        {(props.type != FILTER_SOURCE  && props.type != FILTER_ANTIBIOGRAM) ?
          <><label>{i18n.t('filter.source')}</label><Select
            defaultValue={props.defaultsource}
            isMulti
            name="colors"
            options={source}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangesource}
            isSearchable={false} /></>
          : null}
        {(props.type != FILTER_FOCUS  && props.type != FILTER_ANTIBIOGRAM) ?
          <><label>{i18n.t('filter.focus')}</label><Select
            defaultValue={props.defaultfocus}
            isMulti
            name="colors"
            options={focus}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangefocus}
            isSearchable={false} /></>
          : null}
        {(props.type != FILTER_DIAGNOSIS  && props.type != FILTER_ANTIBIOGRAM) ?
          <><label>{i18n.t('filter.diagnostic')}</label><Select
            defaultValue={props.defaultdiagnostic}
            isMulti
            name="colors"
            options={diagnostic}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangediagnostic}
            isSearchable={false} /></>
          : null}

      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.handlesearch}>{i18n.t('filter.buttom')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
export default CustomFilters;