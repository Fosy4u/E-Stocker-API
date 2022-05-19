
// const firebase = require('firebase-admin')
// const { initializeApp, cert } = require('firebase-admin/app');
// const { getStorage } = require('firebase-admin/storage')
// const firebaseConfig = {
//   apiKey: "AIzaSyA3pyjjmcfR9MvxpFgJKPiPUcyR7ZoZzcE",
//   authDomain: "e-stocker.firebaseapp.com",
//   projectId: "e-stocker",
//   storageBucket: "e-stocker.appspot.com",
//   messagingSenderId: "950272336034",
//   appId: "1:950272336034:web:f8cfbb19e1e354b60f77fb",
//   measurementId: "G-5ND0VP2734",
// };

// // Initialize Firebase
// const firebaseDB = firebase.initializeApp(firebaseConfig);
// // const analytics = getAnalytics(firebaseDB);
// module.exports = firebaseDB;

const firebaseAdmin = require('firebase-admin');

// change the path of json file
const serviceAccount = require('../../e-stocker-firebase-adminsdk-zm0id-caf6fee4ec.json');

const admin = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
});
const storageRef = admin.storage().bucket(`gs://e-stocker.appspot.com`);
module.exports=storageRef

