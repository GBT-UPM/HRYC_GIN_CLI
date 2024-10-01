import { Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css"
import './App.css';
import { SigninScreen, PatientScreen, QuestionnairesScreen, SignupScreen, RestoreScreen } from "./screens/index";
import 'bootstrap/dist/css/bootstrap.min.css';


import i18n from "./i18n"
import ConsentScreen from "./screens/ConsentScreen";
import BienScreen from "./screens/BienScreen";
import HomeScreen from "./screens/HomeScreen";



function App() {


  return (
    <>{/*<Notification />*/}
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/pat" element={<PatientScreen />} />
      <Route path="/register" element={<SignupScreen />} />
      <Route path="/restore" element={<RestoreScreen />} />
      <Route path="/consent" element={<ConsentScreen />} />
      <Route path="/bien" element={<BienScreen />} />
    </Routes></>

    
      
  );
}

export default App;
