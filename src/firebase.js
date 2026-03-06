import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore'; // Ejemplo: si usas base de datos
const firebaseConfig = {
  apiKey: "AIzaSyDGud8T2cntLMqxuPfIm6qiRcpdbx8x_WA",
  authDomain: "gsti-rh-employee-5e1a7.firebaseapp.com",
  projectId: "gsti-rh-employee-5e1a7",
  storageBucket: "gsti-rh-employee-5e1a7.firebasestorage.app",
  messagingSenderId: "567590699861",
  appId: "1:567590699861:web:d38d20db26383c05be65dc"
  };
  
  // Inicializa Firebase
  const app = initializeApp(firebaseConfig);
  
  // Exporta los servicios que necesites
  export const db = getFirestore(app);
  export default app;
