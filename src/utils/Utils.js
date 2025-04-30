

export function CreateParams(token,method,body) {
    if (method==='POST'){
        let data = {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }
        };
        return data;
      }else{
        let data = {
          method: 'GET',
          mode:"cors",
          headers: {
            Accept: 'application/json',
            
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }
        };
        return data;
      }
}

export function HelloTester() {

}

export const GBFilter = [
  {
    id: 1,
    type:'grp_bacteria',
    title: 'GRAM NEGATIVO',
    checked: false,
  }, {
    id: 2,
    type:'grp_bacteria',
    title: 'Hongo levaduriforme',
    checked: false,
  },
  {
    id: 3,
    type:'grp_bacteria',
    title: 'Desconocido',
    checked: false,
  }, {
    id: 4,
    type:'grp_bacteria',
    title: 'Gram positivo',
    checked: false,
  }, {
    id: 5,
    type:'grp_bacteria',
    title: 'Anaerobio',
    checked: false,
  }
  
  
  
]
export const choose_hosp = [

  { 
    label: "Parc Sanitari Sant Joan de Déu (PSSJD)", value: "Hospital_1" 
  },
  {
    label: "Hospital Universitari de la Santa Creu i Sant Pau (HUSCSP)", value: "Hospital_2" 
  }, 
  {
    label: "Hospital Universitario Sant Joan (HUSJ)", value: "Hospital_3" 
  }, 
  {
    label: "Hospital Universitari Arnau de Vilanova (HUAV)", value: "Hospital_4" 
  }
]
export const choose_service = [
  { label: "Cirugía Cardíaca y Vascular", value: "2"},
  { label: "Cirugía del Aparato Digestivo", value: "3"},
  { label: "Cirugía general", value: "4"},
  { label: "Cirugía Maxilofacial", value: "5"},
  { label: "Cirugía Oncológica", value: "6"},
  { label: "Cirugía Pediátrica", value: "7"},
  { label: "Cirugía plástica y reconstructiva", value: "8"},
  { label: "Cirugía Torácica", value: "9"},
  { label: "Cirugía Vascular", value: "10"},
  { label: "Dermatología", value: "11"},
  { label: "Endocrinología", value: "12"},
  { label: "Enfermedades infecciosas", value: "13"},
  { label: "Estomatología/Odontología", value: "14"},
  { label: "Gastroenterología", value: "15"},
  { label: "Geriatría", value: "16"},
  { label: "Ginecología", value: "17"},
  { label: "Hematología", value: "18"},
  { label: "Hepatología", value: "19"},
  { label: "Medicina interna", value: "20"},
  { label: "Nefrología", value: "21"},
  { label: "Neonatología", value: "22"},
  { label: "Neumología", value: "23"},
  { label: "Neurocirugía", value: "24"},
  { label: "Neurología", value: "25"},
  { label: "Obstetricia", value: "26"},
  { label: "Oftalmología", value: "27"},
  { label: "Oncología", value: "28"},
  { label: "Otorrinolaringología", value: "29"},
  { label: "Pediatría", value: "30"},
  { label: "Psiquiatría", value: "31"},
  { label: "Quemados", value: "32"},
  { label: "Rehanilitación", value: "33"},
  { label: "Reumatología", value: "34"},
  { label: "Traumatología y Ortopedia", value: "35"},
  { label: "UCI", value: "36"},
  { label: "UCI pediátrica", value: "37"},
  { label: "Urología", value: "38"},
  { label: "Otras especialidades no listadas", value: "39"},
  { label: "Urgencias", value: "40"}
]
export function addFilter(filter,type,value) {


  let filter_no_column= filter.filter(item => item.column !== type);
  if(value !=='todos' && value !== null){
    filter_no_column.push({ column: type, optionValue: value});
  }
  return filter_no_column;
}
export function getFilter(column,value) {
  let filter = []
    value.forEach((element) => {
      filter.push({ column: column, optionValue: element.value })
    })
  return filter;
}
export function getItemsFilter(column,value) {
  let filter = []
    value.forEach((element) => {
      filter.push({ column: column, optionValue: element.label })
    })
  return filter;
}
export function parseDate(objectDate) {

  let day = objectDate.getDate();
  console.log(day); // 23
  
  let month = objectDate.getMonth();
  console.log(month + 1); // 8
  
  let year = objectDate.getFullYear();
  console.log(year); // 2022

  return day+"/"+(month+1)+"/"+year
}

export function getUser(email,hospital) {

  let email_array = email.split('@')
  if(email_array.length===2){
    let username = email.split('@')[0];
    let organization = email.split('@')[1];
     if(organization===hospital){
      return username;
     }else{
      return null;
     }
  }else{
    return null;
  }
  
}