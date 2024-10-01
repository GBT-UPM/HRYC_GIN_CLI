import React from "react";
import { Button } from "react-bootstrap";
import Select from 'react-select'
import { SOURCE, PR, GPR, FOCUS, DIAGNOSTIC, ACQUISITION} from "../utils/Globals";
import i18n from 'i18next';


const pr = PR
const source = SOURCE
const gpr = GPR
const focus = FOCUS
const diagnostic = DIAGNOSTIC
const acquisition = ACQUISITION

function CustomForm(props) {
  return (
 <div>

       
          <label>{i18n.t('filter.gpr')}</label><Select
            defaultValue={props.defaultgpr}
            name="colors"
            options={gpr}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangegpr}
            isSearchable={false} />


     
          <label>{i18n.t('filter.pr')}</label><Select
            defaultValue={props.defaultpr}
            name="colors"
            options={pr}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangepr}
            isSearchable={false} />

        <label>{i18n.t('filter.acquisition')}</label><Select
            defaultValue={props.defaultacquisition}
            name="colors"
            options={acquisition}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangeacquisition}
            isSearchable={false} />

        <label>{i18n.t('filter.source')}</label><Select
            defaultValue={props.defaultsource}
            name="colors"
            options={source}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangesource}
            isSearchable={false} />

        <label>{i18n.t('filter.focus')}</label><Select
            defaultValue={props.defaultfocus}
            name="colors"
            options={focus}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangefocus}
            isSearchable={false} />

      <label>{i18n.t('filter.diagnostic')}</label><Select
            defaultValue={props.defaultdiagnostic}
            name="colors"
            options={diagnostic}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={props.onChangediagnostic}
            isSearchable={false} />
    <Button onClick={props.handlesearch}>{i18n.t('filter.buttom')}</Button>
</div>

  );
}
export default CustomForm;