import Globals from "../utils/Globals";
const SignUpService = async (username, password) => {

  const base64 = require('base-64');
  return fetch(Globals.BASE_URL + '/signup', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + base64.encode("admin:admin")
    },
    body: JSON.stringify({
      identifier: username,
      password: password,
      clinic:1,
    })
  });

}


export default SignUpService;