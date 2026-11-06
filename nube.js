// Conexión con Firebase (Firestore). Las tareas se guardan en
// la colección "horarios", en un documento con el nombre de tu código.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Si no has pegado tu configuración, la nube queda desactivada
export const nubeDisponible = !firebaseConfig.apiKey.startsWith("PEGA");

let db = null;
if (nubeDisponible) {
  db = getFirestore(initializeApp(firebaseConfig));
}

// Avisa cada vez que cambian las tareas en la nube
export function escuchar(codigo, alCambiar, alFallar) {
  return onSnapshot(doc(db, "horarios", codigo), snap => {
    const datos = snap.exists() ? snap.data().tareas : null;
    alCambiar(datos, snap.metadata.hasPendingWrites);
  }, alFallar);
}

// Guarda la lista completa de tareas
export function guardar(codigo, tareas) {
  return setDoc(doc(db, "horarios", codigo), { tareas: tareas });
}
