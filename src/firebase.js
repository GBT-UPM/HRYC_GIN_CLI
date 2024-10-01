
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore, collection, query, where, getDocs,setDoc,doc  } from "firebase/firestore";
import { initializeApp } from 'firebase/app';
var firebaseConfig = {
  apiKey: "AIzaSyClHA5NvCEF8gb7LVWV1CsJDZy4-Ty688E",
  authDomain: "emma-3e136.firebaseapp.com",
  projectId: "emma-3e136",
  storageBucket: "emma-3e136.appspot.com",
  messagingSenderId: "663967666688",
  appId: "1:663967666688:web:8cd84bc8cc1d95106abee5",
  measurementId: "G-VWYPB4FS7X"
};
initializeApp(firebaseConfig);
const messaging = getMessaging();
const db= getFirestore();
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("payload", payload)
      resolve(payload);
    });
  });

export const requestForToken = (userId) => {
  console.log("Requesting User Permission......");
  Notification.requestPermission().then((permission) => {

    if (permission === "granted") {
      return getToken(messaging, { vapidKey: 'BJrr-CkLteyfCN9VXK643CBAC3y3acSJwUCK-FVI5Yf5rwAydoG7J11OXBuwJHqHMJn06x6i7rX-dp7a8hDNjNE' }).then(async (currentToken) => {
        if (currentToken) {
          console.log('current token for client: ', currentToken);
          await setDoc(doc(db, "devices",currentToken ), {
            token: currentToken,
            userId:userId,
            profile:'patient'

          })
          // Track the token -> client mapping, by sending to backend server
          // show on the UI that permission is secured
        } else {
          console.log('No registration token available. Request permission to generate one.');
 
          // shows on the UI that permission is required 
        }
      }).catch((err) => {
        console.log('An error occurred while retrieving token. ', err);
        // catch error while creating client token
      });
    } else {

      console.log("User Permission Denied.");
    }
  });
}


