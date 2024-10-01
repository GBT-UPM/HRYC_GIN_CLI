importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

 //the Firebase config object 
 const firebaseConfig = {
  apiKey: "AIzaSyClHA5NvCEF8gb7LVWV1CsJDZy4-Ty688E",
  authDomain: "emma-3e136.firebaseapp.com",
  projectId: "emma-3e136",
  storageBucket: "emma-3e136.appspot.com",
  messagingSenderId: "663967666688",
  appId: "1:663967666688:web:8cd84bc8cc1d95106abee5",
  measurementId: "G-VWYPB4FS7X"

};


firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();


messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };
  self.registration.showNotification(notificationTitle,
    notificationOptions);

});

  self.addEventListener("notificationclick", (event) => {
    console.log("On notification click: ", event);
    
    if (event.action) {
      clients.openWindow(event.action)
    
    }
    event.notification.close()
 
  });