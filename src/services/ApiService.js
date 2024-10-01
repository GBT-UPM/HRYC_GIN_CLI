import { CreateParams } from "../utils/Utils"
import Globals from "../utils/Globals";
const ApiService = async (token, method, endPoint, body, h_value) => {
  return fetch(Globals.BASE_URL + endPoint, CreateParams(token, method, body));

}
export default ApiService;