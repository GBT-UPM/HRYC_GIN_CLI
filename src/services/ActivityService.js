import Globals from "../utils/Globals";
const ActivityService = async (_token,user,key,hospital) => {

console.log(_token)
console.log(user)
console.log(key)
console.log(hospital)
  switch(hospital) {
 
    case 'Hospital_1':
      return fetch(Globals.BASE_URL_Hospital_1+'/activities', {
                    method: 'POST',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/json',
                      'Authorization': 'Bearer '+_token
                    },
                    body: JSON.stringify({
                      user_id: user,
                      key:key
                    })
                  });
                  break;

  case 'Hospital_2':
  return fetch(Globals.BASE_URL_Hospital_2+'/activities', {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer '+_token
                },
                body: JSON.stringify({
                  user_id: user,
                  key:key
                })
              });
              break;

case 'Hospital_3':
return fetch(Globals.BASE_URL_Hospital_3+'/activities', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+_token
              },
              body: JSON.stringify({
                user_id: user,
                key:key
              })
            });
            break;


case 'Hospital_4':
return fetch(Globals.BASE_URL_Hospital_4+'/activities', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+_token
              },
              body: JSON.stringify({
                user_id: user,
                key:key
              })
            });
            break;


case 'Hospital_5':
return fetch(Globals.BASE_URL_Hospital_5+'/activities', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+_token
              },
              body: JSON.stringify({
                user_id: user,
                key:key
              })
            });
            break;
    
}}
export default ActivityService;