import Globals from "../utils/Globals";
const RegisterService = async (jsonFilter,_token, hospital) => {

console.log(hospital)

  switch(hospital) {
 
    case 'Hospital_1':
      return fetch(Globals.BASE_URL_Hospital_1+'/register', {
                    method: 'POST',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/json',
                      'Authorization': 'Bearer '+_token
                    },
                    body: JSON.stringify(
                      {
                        result: jsonFilter.result,
                        groupBacteria: jsonFilter.groupBacteria,
                        pattern: jsonFilter.pattern,
                        focus: jsonFilter.focus,
                        source: jsonFilter.source,
                        diagnostic: jsonFilter.diagnostic,
                        acquisition: jsonFilter.acquisition,
                        reason: jsonFilter.reason,
                        empiricAntibiotic: jsonFilter.empiric
                    })
                  });
                  break;

  case 'Hospital_2':
  return fetch(Globals.BASE_URL_Hospital_2+'/register', {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer '+_token
                },
                body: JSON.stringify( {
                  result: jsonFilter.result,
                  groupBacteria: jsonFilter.groupBacteria,
                  pattern: jsonFilter.pattern,
                  focus: jsonFilter.focus,
                  source: jsonFilter.source,
                  diagnostic: jsonFilter.diagnostic,
                  reason: jsonFilter.reason,
                  acquisition: jsonFilter.acquisition
              })
              });
              break;

case 'Hospital_3':
return fetch(Globals.BASE_URL_Hospital_3+'/register', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+_token
              },
              body: JSON.stringify( {
                result: jsonFilter.result,
                groupBacteria: jsonFilter.groupBacteria,
                pattern: jsonFilter.pattern,
                focus: jsonFilter.focus,
                source: jsonFilter.source,
                diagnostic: jsonFilter.diagnostic,
                reason: jsonFilter.reason,
                acquisition: jsonFilter.acquisition
            })
            });
            break;


case 'Hospital_4':
return fetch(Globals.BASE_URL_Hospital_4+'/register', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+_token
              },
              body: JSON.stringify( {
                result: jsonFilter.result,
                groupBacteria: jsonFilter.groupBacteria,
                pattern: jsonFilter.pattern,
                focus: jsonFilter.focus,
                source: jsonFilter.source,
                diagnostic: jsonFilter.diagnostic,
                reason: jsonFilter.reason,
                acquisition: jsonFilter.acquisition
            })
            });
            break;


case 'Hospital_5':
return fetch(Globals.BASE_URL_Hospital_5+'/register', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+_token
              },
              body: JSON.stringify( {
                result: jsonFilter.result,
                groupBacteria: jsonFilter.groupBacteria,
                pattern: jsonFilter.pattern,
                focus: jsonFilter.focus,
                source: jsonFilter.source,
                diagnostic: jsonFilter.diagnostic,
                reason: jsonFilter.reason,
                acquisition: jsonFilter.acquisition
            })
            });
            break;
    
}}
export default RegisterService;