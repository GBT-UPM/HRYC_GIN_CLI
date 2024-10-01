import Globals from "../utils/Globals";
const CiService = async (username) => {

  const base64 = require('base-64');
  return fetch(Globals.BASE_URL + '/ci', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + base64.encode("admin:admin")
    },
    body: JSON.stringify({
      identifier: username,
    })
  });
}
export default CiService;