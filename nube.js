// Conexión con Firebase: tareas personales, avisos de clase y acceso de administradores
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp, addDoc, deleteDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export const nubeDisponible = !firebaseConfig.apiKey.startsWith("PEGA");

let db = null;
let auth = null;
if (nubeDisponible) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

/* ----- Tareas personales (cajón con tu código secreto) ----- */
export function escuchar(codigo, alCambiar, alFallar) {
  return onSnapshot(doc(db, "horarios", codigo), snap => {
    alCambiar(snap.exists() ? snap.data().tareas : null, snap.metadata.hasPendingWrites);
  }, alFallar);
}

export function guardar(codigo, tareas) {
  return setDoc(doc(db, "horarios", codigo), { tareas: tareas });
}

/* ----- Avisos de clase (todos leen, solo los administradores escriben) ----- */
export function escucharClase(alCambiar, alFallar) {
  const consulta = query(collection(db, "clase"), orderBy("fecha"));
  return onSnapshot(consulta, snap => {
    alCambiar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, alFallar);
}

export const crearEvento = evento => addDoc(collection(db, "clase"), evento);
export const borrarEvento = id => deleteDoc(doc(db, "clase", id));

/* ----- Acceso con Google ----- */
export const entrar = () => signInWithPopup(auth, new GoogleAuthProvider());
export const salir = () => signOut(auth);

// Avisa al entrar o salir un usuario y dice si es administrador
// (la lista está en Firestore: config/admins → emails)
export function alCambiarUsuario(callback) {
  return onAuthStateChanged(auth, async usuario => {
    let admin = false;
    if (usuario) {
      try {
        const lista = await getDoc(doc(db, "config", "admins"));
        admin = lista.exists() && (lista.data().emails || []).includes(usuario.email);
      } catch (e) { /* sin permiso: no es admin */ }
    }
    callback(usuario, admin);
  });
}

/* ----- Comunidad: chat (hay que haber iniciado sesión) ----- */
export function escucharMensajes(alCambiar, alFallar) {
  const consulta = query(collection(db, "mensajes"), orderBy("fecha", "desc"), limit(100));
  return onSnapshot(consulta, snap => {
    alCambiar(snap.docs
      .map(d => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))
      .reverse());
  }, alFallar);
}

export function enviarMensaje(texto) {
  const u = auth.currentUser;
  return addDoc(collection(db, "mensajes"), {
    uid: u.uid,
    nombre: (u.displayName || "Alumno").slice(0, 40),
    texto: texto,
    fecha: serverTimestamp()
  });
}

export const borrarMensaje = id => deleteDoc(doc(db, "mensajes", id));
