import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore'; // Ejemplo: si usas base de datos
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_ID",
    appId: "TU_APP_ID"
  };
  
  // Inicializa Firebase
  const app = initializeApp(firebaseConfig);
  
  // Exporta los servicios que necesites
  export const db = getFirestore(app);
  export default app;
