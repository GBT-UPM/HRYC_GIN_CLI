import React, { useEffect, useState } from "react";
import AuthenticationService from '../services/AuthenticationService'
import ApiService from "../services/ApiService";
import { useNavigate } from "react-router-dom";
import { choose_hosp, getUser } from "../utils/Utils"
import { Form } from "react-bootstrap";
import Logo from "../assets/images/logoemma.png";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ORGANIZATION } from "../utils/Globals";
import ActivityService from "../services/ActivityService";
import { requestForToken } from '../firebase';
export default function SigninScreen(props) {


  const [isReadyForInstall, setIsReadyForInstall] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
 
  const [storeH, setStoreH] = useState(false);
  const [t] = useTranslation();
  const [loginError, setLoginError] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState("");


  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (event) => {
      // Prevent the mini-infobar from appearing on mobile.
      event.preventDefault();
      console.log("👍", "beforeinstallprompt", event);
      // Stash the event so it can be triggered later.
      window.deferredPrompt = event;
      // Remove the 'hidden' class from the install button container.
      setIsReadyForInstall(true);
    });


   
  }, []);

  async function downloadApp() {
    console.log("👍", "butInstall-clicked");
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) {
      // The deferred prompt isn't available.
      console.log("oops, no prompt event guardado en window");
      return;
    }
    // Show the install prompt.
    promptEvent.prompt();
    // Log the result
    const result = await promptEvent.userChoice;
    console.log("👍", "userChoice", result);
    // Reset the deferred prompt variable, since
    // prompt() can only be called once.
    window.deferredPrompt = null;
    // Hide the install button.
    setIsReadyForInstall(false);
  }



  let navigate = useNavigate();
  const handleSubmit = (event) => {
    event.preventDefault();

    if (user.trim().length === 0 || password.trim().length === 0) {
      setLoginErrorMessage(t('login.error.empty'))
    } else {
   
        AuthenticationService(user, password).then((res) => {
          if (res.ok) {
            console.log(res)
            requestForToken(user);
            navigate("pat", { replace: true,state: {
              username: user,
            } });
            /*ApiService('', 'GET', '/patients/' + user, JSON.parse('{}'))
              .then((response) => {
                console.log(response)
                navigate("pat");
              }).catch((e) => {
                console.warn("errro red");
                setLoginErrorMessage(t('login.error.net'))
              })*/
          }else{
            setLoginErrorMessage(t('login.error.user'))
          }
        


        }).catch((error) => {
            setLoginErrorMessage(t('login.error.net'))
            console.error(error);
          });
     
    }
  }

  const storeData = async (key, value) => {
    try {
      sessionStorage.setItem(key, value)
    } catch (e) {
      // saving error
    }
  }
  const localStoreData = async (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      // saving error
    }
  }
  const localGetData = async (key) => {
    try {
      console.log(key)
      var res = localStorage.getItem(key)
      return res
    } catch (e) {
      // saving error
    }
  }

  


  return (

    <>
      <div style={{ background: 'white' }}>
        <div style={{ background: '#b8c8f9', height: '150px', borderBottomLeftRadius: '30px' }}>

          <div>

          </div>
          <div style={{ textAlign: 'center' }}>
            <img height={150} src={Logo} alt=" logo" />

          </div>
        </div>
      </div>
      <div style={{ background: '#b8c8f9' }}>
        <div className="Auth-form-container" style={{ background: 'white', borderTopRightRadius: '30px' }}>



          <form style={{maxWidth:"70%"}} className="Auth-form" onSubmit={handleSubmit}>
            <div className="Auth-form-content">
              <div className="install">
                <h3 style={{ color: '#2c4062' }} className="Auth-form-title">{t('login.text9')}</h3>
                {isReadyForInstall && (
                  <button onClick={downloadApp} type="button" className="btn btn-info">{t('login.text5')}</button>

                )}
              </div>
              <div className="form-group mt-3">
                <label style={{ color: 'rgba(34, 34, 34, 0.5)' }}>{t('login.text1')}</label>

                <input
                  type="text"
                  className="form-control mt-1"
                  value={user}
                  placeholder={t('login.text1')}
                  onChange={(e) => setUser(e.target.value)} />
              </div>
              <div className="form-group mt-3">
                <label style={{ color: 'rgba(34, 34, 34, 0.5)' }}>{t('login.text2')}</label>
                <input
                  type="password"
                  value={password}
                  placeholder={t('login.text2')}
                  className="form-control mt-1"
                  onChange={(e) => setPassword(e.target.value)} />
              </div>
       
              
              {loginErrorMessage ? <span className="error_message">{loginErrorMessage}</span> : null}
              <div className="d-grid gap-2 mt-3">
                <button type="submit" className="btn btn_login">
                  {t('login.text3')}
                </button>

             <span className="sign_up">{t('login.text7')}  <Link to="/register" className="btn_sign_up" > {t('login.text8')}</Link></span>
             <span className="sign_up"><Link to="/restore" className="btn_sign_up" >forgot your password</Link></span>
              </div>
      

            </div>

          </form>
         
          {props.children}
        </div>
      </div></>
  )
}
