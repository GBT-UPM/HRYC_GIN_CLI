import Globals from "../utils/Globals";
const base64 = require('base-64');
import { fetchWrapper } from '../helpers/fetch-wrapper';



function authentication(identifier, password) {

    return fetchWrapper.post(Globals.BASE_URL+'/signin',{identifier,password})
    
}
function logout() {

}
function getPatient(identifier) {
console.log(Globals.BASE_URL+'/patients/'+identifier)
return fetchWrapper.get(Globals.BASE_URL+'/patients/'+identifier);
}
function getResponsesPatient(identifier) {
  console.log(Globals.BASE_URL+'/responses/patients/'+identifier)
  return fetchWrapper.get(Globals.BASE_URL+'/responses/patients/'+identifier);
  }
function updateInfoPatient(infoPatient) {
  return fetchWrapper.patch(Globals.BASE_URL+'/patients/info',infoPatient);
  }
function saveResponse(response) {
  return fetchWrapper.post(Globals.BASE_URL+'/response',response);
  }
export const PatientService = {

  authentication,
  logout,
  getPatient,
  getResponsesPatient,
  updateInfoPatient,
  saveResponse
};