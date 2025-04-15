// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqSiZUnH8sV0dcZUyDStTJPik3IBulz7I",
  authDomain: "moscassag.firebaseapp.com",
  projectId: "moscassag",
  storageBucket: "moscassag.firebasestorage.app",
  messagingSenderId: "427818028876",
  appId: "1:427818028876:web:56a1d499780a5103da89e9"
};

// Initialize Firebase
const appMoscasSAG = initializeApp(firebaseConfig);
export default appMoscasSAG