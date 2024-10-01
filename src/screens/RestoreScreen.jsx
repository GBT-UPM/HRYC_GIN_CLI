import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import Logo from "../assets/images/logoemma.png";
import { choose_hosp, getUser } from "../utils/Utils"
import { Link, useNavigate } from "react-router-dom";
import SignUpService from "../services/SignUpService";
import { ORGANIZATION } from "../utils/Globals";
import RestoreService from "../services/RestoreService";
import CustomMessage from "../components/CustomMessage";

export default function RestoreScreen(props) {
  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hospital, setHospital] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState("");
  const [t] = useTranslation();
  let navigate = useNavigate();
  const [modalShow, setModalShow] = useState(false);
  const [modalTitle, setModalTitle] = useState(t('restore.text1'));
  const [modalMessage, setModalMessage] = useState(t('restore.text3'));
  const handleSubmit = (event) => {
    event.preventDefault();
    setLoginErrorMessage("")



    if (email.trim().length > 0) {
      var username = email
      if (username != null) {
        if (password.trim().length > 4 && confirm.trim().length > 4) {
          if (password === confirm) {

            RestoreService(username, password)
              .then(async (response) => {
                if (response.ok) {
                  // navigate("consent", { replace: true });
                  //   navigate("/");
                  setModalShow(true)
                } else {
                  const data = await response.json();
                  console.log(data)
                  setLoginErrorMessage(data.message)

                }
              })
              .catch((error) => {
                setLoginErrorMessage(t('login.error.net'))
                console.error(error);
              });



          } else {
            setLoginErrorMessage(t('signup.error.confirm'))
          }
        } else {
          setLoginErrorMessage(t('signup.error.empty'))
        }
      } else {
        setLoginErrorMessage(t('signup.error.email-organization') + " @")
      }
    } else {
      setLoginErrorMessage(t('signup.error.email'))
    }



  }
  const handleEmail = (event) => {
    setEmail(event.target.value)
  }
  const handlePassword = (event) => {
    setPassword(event.target.value)
  }
  const handleConfirm = (event) => {
    setConfirm(event.target.value)
  }
  function handleClose(s) {
    setModalShow(false)
    navigate("/");

  };
  const selectHospital = () => {
    return (

      <div className="form-group mt-3">
        <label style={{ color: 'rgba(34, 34, 34, 0.5)' }}>{t('login.text4')}</label>
        <Form.Select value={hospital}
          onChange={(e) => {
            setHospital(e.target.value)
            var result = ORGANIZATION.filter(obj => obj.label == e.target.value);
            if (result.length > 0) {
              setPlaceholder("e.g username@" + result[0].value)
            } else {
              setPlaceholder("e.g username@hospital.com")
            }
          }} aria-label="Default select example">
          <option value="">{t('login.text4')}</option>
          {choose_hosp.map(opt => (
            <option value={opt.value}>{opt.label}</option>
          ))}
        </Form.Select>
      </div>

    )


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



          <form style={{ maxWidth: "70%" }} className="Auth-form" onSubmit={handleSubmit}>
            <div className="Auth-form-content">
              <div className="install-sign-up">
                <h3 style={{ color: '#2c4062' }} className="Auth-form-title">{t('restore.text1')}</h3>

              </div>
              {/*selectHospital()*/}
              <div className="form-group mt-3">
                <label style={{ color: 'rgba(34, 34, 34, 0.5)' }}>{t('signup.text1')}</label>

                <input
                  type="text"
                  className="form-control mt-1"
                  value={email}
                  placeholder={placeholder}
                  onChange={handleEmail} />
              </div>
              <div className="form-group mt-3">
                <label style={{ color: 'rgba(34, 34, 34, 0.5)' }}>{t('signup.text3')}</label>
                <input
                  type="password"
                  value={password}
                  placeholder={t('login.text2')}
                  className="form-control mt-1"
                  onChange={handlePassword} />
              </div>
              <div className="form-group mt-3">
                <label style={{ color: 'rgba(34, 34, 34, 0.5)' }}>{t('signup.text4')}</label>
                <input
                  type="password"
                  value={confirm}
                  placeholder={t('login.text2')}
                  className="form-control mt-1"
                  onChange={handleConfirm} />
              </div>

              <div className="d-grid gap-2 mt-3">

                {loginErrorMessage ? <span className="error_message">{loginErrorMessage}</span> : null}

                <button type="submit" className="btn btn_login">
                  {t('restore.text2')}
                </button>
                <span className="sign_up">{t('signup.text6')}  <Link to="/" className="btn_sign_up" > {t('signup.text7')}</Link></span>
              </div>


            </div>

          </form>

          {props.children}
        </div>
      </div>
      <CustomMessage show={modalShow} title={modalTitle} message={modalMessage} close={handleClose} />
    </>
  )
}