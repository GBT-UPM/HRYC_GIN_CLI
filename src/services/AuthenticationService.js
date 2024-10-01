import Globals from "../utils/Globals";
const AuthenticationService = async (username, password) => {
  const base64 = require('base-64');
  return fetch(Globals.BASE_URL + '/signin', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + base64.encode("admin:admin")
    },
    body: JSON.stringify({
      identifier: username,
      password: password
    })
  });


}


export default AuthenticationService;