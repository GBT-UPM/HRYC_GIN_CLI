import { CreateParams } from "../utils/Utils"
import Globals from "../utils/Globals";
const ApiService = async (token, method, endPoint, body, h_value) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[ApiService] request", {
      method,
      url: Globals.BASE_URL + endPoint,
      hasToken: Boolean(token),
      tokenPrefix: token ? token.slice(0, 12) : "",
    });
  }

  return fetch(Globals.BASE_URL + endPoint, CreateParams(token, method, body));

}
export default ApiService;
