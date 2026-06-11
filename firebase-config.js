// firebase-config.js

// Suas chaves oficiais de configuração do Firebase (Loja Ebenezzer)
const firebaseConfig = {
  apiKey: "AIzaSyDahstFxVwu7SKGzjGk0C3D7B6iFM19D_A",
  authDomain: "loja-ebenezzer.firebaseapp.com",
  projectId: "loja-ebenezzer",
  storageBucket: "loja-ebenezzer.firebasestorage.app",
  messagingSenderId: "731576771947",
  appId: "1:731576771947:web:9fc98ad97061bf6416982e",
  measurementId: "G-D619YG9LJJ"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Inicializa o Firestore de forma global para ser acessado por app.js e admin.js
const db = firebase.firestore();