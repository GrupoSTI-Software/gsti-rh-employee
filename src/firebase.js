import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore'; // Ejemplo: si usas base de datos
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta los servicios que necesites
export const db = getFirestore(app);
export default app;
