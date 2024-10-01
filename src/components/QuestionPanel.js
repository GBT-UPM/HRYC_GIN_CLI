import { Box, Slider, ThemeProvider, createTheme} from "@mui/material";
import { purple } from "@mui/material/colors";
import { useState } from "react";
import { Form } from "react-bootstrap";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Unstable_NumberInput as NumberInput } from '@mui/base/Unstable_NumberInput';

export default function QuestionPanel({
  id,
  questionNumber,
  question,
  type,
  options = [],
  enable,
  updateResponses,
  responses,
  isResponseEmpty = false,
  linkId,
  isDisabled = true,
  repeats,

}) {

  const theme = createTheme({
    palette: {
      primary: {
        main: purple[500],
      },
      secondary: {
        main: '#b692e1',
      },
    },
  });
 
  const [ startDate, setStartDate] = useState();
  const [value, setValue] = useState();
  const checkChoiceResponse = (code) => {
    let index = responses.findIndex(item => (item.linkId === linkId && item.code === code));
    return index !== -1;
  }
  const checkEnabled = () => {

    if (enable.length > 0) {
      let code = enable[0].answerCoding.code;
      let linkId = enable[0].question
      let index = responses.findIndex(item => (item.linkId === linkId && item.code === code));

      return index !== -1;
    } else {
      return true;
    }
    //let index = responses.findIndex(item => (item.linkId === linkId && item.code === code));
  }
  const handleChoice = (event, code, display,rep) => {

    event.preventDefault();
    if (!isDisabled) {
      updateResponses(code, questionNumber, "choice", linkId, display,rep);
    }
  }
  const handleChoice2 = (event) => {

   console.log(event.target.value,type)
   event.preventDefault();
    if (!isDisabled) {
      updateResponses(event.target.value.toString(), questionNumber, type, linkId, event.target.value.toString(),false);
    }
  }

  return (
    <>
    <div  style={checkEnabled() ? {display:'contents' }:{display:'none'}}>
      {type === "display" ?
      <h1 className="questionTextDisplay">{question}</h1>
      :<h1 className="questionText">{question}</h1>}
      {type === "TEXT" && (
        <input
          type="text"
          placeholder="Your answer"
          className="textInput"
          disabled={isDisabled}
          onChange={(e) => updateResponses(e.value, questionNumber, "TEXT", linkId)}></input>
      )}
      {repeats ?
      type === "choice" &&
      options.map((item, index) => {
        const display = item.valueCoding.display;
        const code = item.valueCoding.code;
        console.log("repeats")
        return (
          <label
            className={checkChoiceResponse(code) ? "f--green container" : "container"}
            onClick={(e) => handleChoice(e, code, display,repeats)}>
            {display}
            <input type="radio" name={linkId} checked={checkChoiceResponse(code)} disabled={isDisabled} />
        <span
              className={
                checkChoiceResponse(code) ? " checkmark2 checkmark2-after" : "checkmark2"
              }></span>
       
              {/*} 
            {
              checkChoiceResponse(code) ? 
              <span className="checkmark2">
                <span className="checkmark2-after"></span>
              </span>
              :
              <span className="checkmark2"></span>
            }
       {*/}
          </label>
        );
      })
      :
      type === "choice" &&
        options.map((item, index) => {
          const display = item.valueCoding.display;
          const code = item.valueCoding.code;
          return (
            <label
              className={checkChoiceResponse(code) ? "f--green container" : "container"}
              onClick={(e) => handleChoice(e, code, display,repeats)}>
              {display}
              <input type="radio" name={linkId} checked={checkChoiceResponse(code)} disabled={isDisabled} />
              <span
                className={
                  isResponseEmpty ? "checkmark--red checkmark" : "checkmark"
                }></span>
            </label>
          );
        })
    
    }
      

      {type === "integer" ?
      <ThemeProvider theme={theme}>
          <Slider onChange={(e) => handleChoice2(e,"choice")} defaultValue={0} step={1} marks min={0} max={10} 
           valueLabelDisplay="auto"
          sx={{

            color: 'primary.main',
            background:'linear-gradient(to right, #d3eec0, #ec5872)',
        
          }}/>
          </ThemeProvider>
        : null
      }
      {type === "decimal" ?

           /* <Slider onChange={(e) => handleChoice2(e, "choice")} defaultValue={0} step={1} marks min={0} max={10} 
            valueLabelDisplay="auto"
            sx={{

              color: 'secondary.main',
              background:'#e7e7ec',
          
            }}
            />*/
            <input className="decimal" name="myInput" />
   
        : null
      }  
          {type === "date" ?

              <ReactDatePicker className="textInput2"
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                dateFormat="MM/yyyy"
                showMonthYearPicker
              />

            : null
            } 
      {/*}
      {type === "choice" && options.length >=10 &&
        options.map((item, index) => {
          const display = item.valueCoding.display;
          const code = item.valueCoding.code;

          return (
            <div
              className={checkChoiceResponse(code) ? "f--green container2" : "container2"}
              onClick={(e) => handleChoice(e, code, display)}>
              {display}
              <input type="radio" name={linkId} checked={checkChoiceResponse(code)} disabled={isDisabled} />
              <span
                className={
                  isResponseEmpty ? "checkmark--red checkmark" : "checkmark"
                }></span>
            </div>
          );
        })}
 

      {type === "text" && (
        <div className="w--100">
          <div className="multi-text__wrapper">
            <div>a.</div>
            <input
              value={getTextAnswer(1)}
              type="text"
              disabled={isDisabled}
              placeholder="Your answer"
              className="textInput"
              onInput={(e) =>
                updateResponses(e.target.value, questionNumber, "text", linkId, null, 1)
              }></input>
          </div>
          <div className="multi-text__wrapper">
            <div>b.</div>
            <input
              value={getTextAnswer(2)}
              type="text"
              disabled={isDisabled}
              placeholder="Your answer"
              className="textInput"
              onInput={(e) =>
                updateResponses(e.target.value, questionNumber, "text", linkId, null, 2)
              }></input>
          </div>
          <div className="multi-text__wrapper">
            <div>c.</div>
            <input
              value={getTextAnswer(3)}
              type="text"
              disabled={isDisabled}
              placeholder="Your answer"
              className="textInput"
              onInput={(e) =>
                updateResponses(e.target.value, questionNumber, "text", linkId, null, 3)
              }></input>
          </div>
        </div>
      )}
         {*/}
         </div>
    </>
  );
}
