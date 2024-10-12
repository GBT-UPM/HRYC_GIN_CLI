import { Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css"
import './App.css';
import { SigninScreen, PatientScreen, QuestionnairesScreen, SignupScreen, RestoreScreen } from "./screens/index";
import 'bootstrap/dist/css/bootstrap.min.css';


import i18n from "./i18n"

import HomeScreen from "./screens/MainScreen";



function App() {


  return (
    <>{/*<Notification />*/}
    <Routes>
      <Route path="/" element={<HomeScreen />} />
    </Routes></>

    
      
  );
}

export default App;
