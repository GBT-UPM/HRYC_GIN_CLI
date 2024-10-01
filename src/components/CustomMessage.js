import React from "react";
import { Button, Modal } from "react-bootstrap";

function CustomMessage(props) {
  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          {props.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
           {props.message}
      </Modal.Body>
      <Modal.Footer>
        <Button className="btn btn_login" onClick={props.close}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
export default CustomMessage;