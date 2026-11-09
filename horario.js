const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function aMinutos(hora) {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

// Lee todas las clases a partir de la tabla
const clases = [...document.querySelectorAll("td.clase")].map(td => ({
  td: td,
  dia: Number(td.dataset.dia),
  ini: aMinutos(td.dataset.ini),
  fin: aMinutos(td.dataset.fin),
  hora: td.dataset.ini,
  siglas: td.querySelector("strong").textContent,
  profe: td.querySelector("small").textContent,
  materia: td.querySelector("a").title,
  enlace: td.querySelector("a").href,
  color: td.classList[1]
}));

/* ---------- Ahora y Siguiente ---------- */
function formatoTiempo(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? h + " h " + m + " min" : m + " min";
}

function tarjeta(etiqueta, clase, detalle, progreso) {
  return `<small>${etiqueta}</small>
    <h2>${clase.materia}</h2>
    <p>${clase.profe} · ${detalle}</p>
    ${progreso === undefined ? "" : '<div class="barra"><i style="width:' + progreso + '%"></i></div>'}
    <a class="boton" href="${clase.enlace}" target="_blank" rel="noopener noreferrer">Abrir aula ${ico("flecha")}</a>`;
}

function buscarSiguiente(dia, minutos) {
  for (let i = 0; i < 7; i++) {
    const d = (dia + i) % 7;
    const delDia = clases.filter(c => c.dia === d && (i > 0 || c.ini > minutos))
                         .sort((a, b) => a.ini - b.ini);
    if (delDia.length > 0) return { clase: delDia[0], saltos: i };
  }
  return null;
}

function actualizar() {
  const ahora = new Date();
  const dia = ahora.getDay();
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();

  document.getElementById("fecha").textContent =
    mayuscula(ahora.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }));

  // Marcar día de hoy y clase actual en la tabla
  document.querySelectorAll("thead th").forEach((th, i) => th.classList.toggle("hoy", i === dia && dia >= 1 && dia <= 5));
  const actual = clases.find(c => c.dia === dia && minutos >= c.ini && minutos < c.fin);
  clases.forEach(c => c.td.classList.toggle("ahora", c === actual));

  const panelAhora = document.getElementById("ahora");
  const panelSig = document.getElementById("siguiente");

  if (actual) {
    panelAhora.className = "panel " + actual.color;
    panelAhora.innerHTML = tarjeta("Ahora", actual, "termina en " + formatoTiempo(actual.fin - minutos), Math.round((minutos - actual.ini) / (actual.fin - actual.ini) * 100));
  } else if (dia >= 1 && dia <= 5 && minutos >= 660 && minutos < 690) {
    panelAhora.className = "panel";
    panelAhora.innerHTML = `<small>Ahora</small><h2>${ico("cafe")} Recreo</h2><p>Vuelves a clase en ${formatoTiempo(690 - minutos)}</p>`;
  } else {
    panelAhora.className = "panel";
    panelAhora.innerHTML = `<small>Ahora</small><h2>Sin clase</h2><p>Disfruta el descanso</p>`;
  }

  const sig = buscarSiguiente(dia, minutos);
  if (sig) {
    let cuando;
    if (sig.saltos === 0) cuando = "empieza en " + formatoTiempo(sig.clase.ini - minutos);
    else if (sig.saltos === 1) cuando = "mañana a las " + sig.clase.hora;
    else cuando = DIAS[sig.clase.dia].toLowerCase() + " a las " + sig.clase.hora;
    panelSig.className = "panel " + sig.clase.color;
    panelSig.innerHTML = tarjeta("Siguiente", sig.clase, cuando);
  }
}

actualizar();
setInterval(actualizar, 30000);

/* ---------- Modo oscuro ---------- */
const botonTema = document.getElementById("tema");

function ponerTema(tema) {
  document.documentElement.dataset.tema = tema;
  botonTema.innerHTML = ico(tema === "oscuro" ? "sol" : "luna") + (tema === "oscuro" ? " Modo claro" : " Modo oscuro");
  localStorage.setItem("tema", tema);
}

const temaGuardado = localStorage.getItem("tema");
const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
ponerTema(temaGuardado || (prefiereOscuro ? "oscuro" : "claro"));

botonTema.addEventListener("click", () => {
  ponerTema(document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro");
});

/* ---------- Tareas pendientes (se guardan en el navegador) ---------- */
let tareas = [];

const selectMateria = document.getElementById("materia-tarea");
const listaTareas = document.getElementById("lista-tareas");

// Una opción por asignatura (sin repetir)
const unicas = {};
clases.forEach(c => { unicas[c.siglas] = c; });
Object.values(unicas).forEach(c => {
  selectMateria.innerHTML += `<option value="${c.siglas}">${c.materia}</option>`;
});

// Escapa el texto para que nunca se interprete como HTML
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = String(texto);
  return div.innerHTML;
}

// Valida cualquier lista de tareas (de localStorage o de la nube)
function limpiarTareas(datos) {
  if (!Array.isArray(datos)) return [];
  return datos.slice(0, 100)
    .filter(t => t && typeof t.texto === "string")
    .map(t => ({
      texto: t.texto.slice(0, 200),
      materia: unicas[t.materia] ? t.materia : "",
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(t.fecha) ? t.fecha : "",
      hecha: t.hecha === true
    }));
}

try {
  tareas = limpiarTareas(JSON.parse(localStorage.getItem("tareas") || "[]"));
} catch (e) {
  tareas = [];
}

function guardarTareas() {
  localStorage.setItem("tareas", JSON.stringify(tareas));
  if (nube && nube.nubeDisponible && codigoSync) {
    nube.guardar(codigoSync, tareas).catch(() => {
      avisoSync("alerta", "No se pudo guardar en la nube");
    });
  }
}

function pintarListaTareas() {
  if (tareas.length === 0) {
    listaTareas.innerHTML = `<li class="vacio">${ico("check")} No tienes tareas pendientes</li>`;
    return;
  }

  // Ordenar: sin hacer primero, y por fecha de entrega
  const orden = tareas.map((t, i) => ({ t, i })).sort((a, b) =>
    (a.t.hecha - b.t.hecha) || (a.t.fecha || "9999").localeCompare(b.t.fecha || "9999"));

  const hoy = new Date().toISOString().slice(0, 10);
  listaTareas.innerHTML = orden.map(({ t, i }) => {
    const urgente = t.fecha && t.fecha <= hoy && !t.hecha ? " urgente" : "";
    const fecha = t.fecha ? `<span class="fecha${urgente}">${t.fecha.split("-").reverse().join("/")}</span>` : "";
    return `<li class="${t.hecha ? "hecha" : ""}">
      <input type="checkbox" data-i="${i}" ${t.hecha ? "checked" : ""}>
      <span class="etiqueta ${t.materia}">${t.materia}</span>
      <span class="txt">${escapar(t.texto)}</span>
      ${fecha}
      <button data-borrar="${i}" title="Borrar">${ico("x")}</button>
    </li>`;
  }).join("");
}

function pintarTareas() {
  pintarListaTareas();
  document.dispatchEvent(new Event("tareas-cambiadas"));
}

document.getElementById("form-tarea").addEventListener("submit", e => {
  e.preventDefault();
  const texto = document.getElementById("texto-tarea");
  const fecha = document.getElementById("fecha-tarea");
  tareas.push({ texto: texto.value.trim(), materia: selectMateria.value, fecha: fecha.value, hecha: false });
  texto.value = "";
  fecha.value = "";
  guardarTareas();
  pintarTareas();
});

listaTareas.addEventListener("click", e => {
  if (e.target.dataset.borrar !== undefined) {
    tareas.splice(Number(e.target.dataset.borrar), 1);
  } else if (e.target.dataset.i !== undefined) {
    const t = tareas[Number(e.target.dataset.i)];
    t.hecha = !t.hecha;
  } else {
    return;
  }
  guardarTareas();
  pintarTareas();
});

pintarTareas();

/* ---------- Sincronización entre dispositivos (Firebase) ---------- */
const estado = document.getElementById("estado-sync");
const campoCodigo = document.getElementById("codigo-sync");
const botonConectar = document.getElementById("conectar");
let nube = null;
let codigoSync = localStorage.getItem("codigoSync");
let dejarDeEscuchar = null;

function conectar(codigo) {
  if (dejarDeEscuchar) dejarDeEscuchar();
  codigoSync = codigo;
  localStorage.setItem("codigoSync", codigo);
  estado.textContent = "Conectando...";

  dejarDeEscuchar = nube.escuchar(codigo, (datos, esLocal) => {
    avisoSync("nubeok", "Sincronizado");
    if (esLocal) return;              // es un cambio que acabo de hacer yo
    if (datos === null) {
      nube.guardar(codigo, tareas);   // código nuevo: subo lo que tengo
    } else {
      tareas = limpiarTareas(datos);  // gana lo que hay en la nube (ya validado)
      localStorage.setItem("tareas", JSON.stringify(tareas));
      pintarTareas();
    }
  }, () => {
    avisoSync("alerta", "Sin conexión con la nube");
  });
}

botonConectar.addEventListener("click", () => {
  const codigo = campoCodigo.value.trim();
  if (codigo.length < 16) {
    alert("El código debe tener al menos 16 caracteres.");
    return;
  }
  conectar(codigo);
});

// nube.js se carga aparte: si falla, el resto de la web sigue funcionando
import("./nube.js").then(modulo => {
  nube = modulo;
  if (!nube.nubeDisponible) {
    estado.textContent = "Solo en este dispositivo (falta configurar Firebase)";
    return;
  }
  iniciarClase();
  if (codigoSync) {
    campoCodigo.value = codigoSync;
    conectar(codigoSync);
  } else {
    estado.textContent = "Escribe un código para sincronizar";
  }
}).catch(() => {
  estado.textContent = "Solo en este dispositivo";
});

// Genera un código aleatorio y difícil de adivinar (24 caracteres)
document.getElementById("generar").addEventListener("click", () => {
  const letras = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  campoCodigo.value = [...bytes].map(b => letras[b % letras.length]).join("");
});

/* ---------- Calendario y avisos de clase ---------- */
const calGrid = document.getElementById("cal-grid");
const listaClase = document.getElementById("lista-clase");
const listaTitulo = document.getElementById("lista-titulo");
const formAdmin = document.getElementById("form-admin");
const acceso = document.getElementById("acceso");
const materiaAdmin = document.getElementById("materia-admin");
materiaAdmin.innerHTML = selectMateria.innerHTML;

let mesVista = new Date();
mesVista.setDate(1);
let eventosClase = [];
let diaSel = null;
let usuario = null;
let esAdmin = false;

const ISO = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const formatoFecha = f => f.split("-").reverse().join("/");

// Valida lo que llega de la nube antes de mostrarlo
function limpiarEventos(lista) {
  return lista
    .filter(e => (e.tipo === "tarea" || e.tipo === "examen") && typeof e.titulo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.fecha))
    .map(e => ({ id: e.id, tipo: e.tipo, titulo: e.titulo.slice(0, 100), materia: unicas[e.materia] ? e.materia : "", fecha: e.fecha }));
}

// Avisos de la clase + tus tareas personales con fecha
function todosLosEventos() {
  const mias = tareas.filter(t => t.fecha && !t.hecha)
    .map(t => ({ id: null, tipo: "personal", titulo: t.texto, materia: t.materia, fecha: t.fecha }));
  return eventosClase.concat(mias).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function pintarCalendario() {
  const todos = todosLosEventos();
  const año = mesVista.getFullYear();
  const mes = mesVista.getMonth();
  const hoy = ISO(new Date());
  const huecos = (new Date(año, mes, 1).getDay() + 6) % 7;   // la semana empieza en lunes
  const dias = new Date(año, mes + 1, 0).getDate();

  document.getElementById("mes-titulo").textContent =
    mayuscula(mesVista.toLocaleDateString("es-ES", { month: "long", year: "numeric" }));

  let html = ["L", "M", "X", "J", "V", "S", "D"].map(d => `<div class="cal-nombre">${d}</div>`).join("");
  html += "<div></div>".repeat(huecos);
  for (let d = 1; d <= dias; d++) {
    const f = año + "-" + String(mes + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    const marcas = todos.filter(e => e.fecha === f).slice(0, 4)
      .map(e => `<i class="${e.tipo} ${e.materia}"></i>`).join("");
    html += `<button type="button" class="cal-celda${f === hoy ? " hoy" : ""}${f === diaSel ? " sel" : ""}" data-f="${f}">
      <span>${d}</span><div class="marcas">${marcas}</div></button>`;
  }
  calGrid.innerHTML = html;
}

function pintarListaClase() {
  const todos = todosLosEventos();
  let items;
  if (diaSel) {
    items = todos.filter(e => e.fecha === diaSel);
    listaTitulo.textContent = "Día " + formatoFecha(diaSel);
  } else {
    const hoy = ISO(new Date());
    items = todos.filter(e => e.fecha >= hoy).slice(0, 10);
    listaTitulo.textContent = "Próximos avisos";
  }
  if (items.length === 0) {
    listaClase.innerHTML = `<li class="vacio">${ico("check")} Nada para este periodo</li>`;
    return;
  }
  const nombres = { examen: ico("examen") + " Examen", tarea: ico("tarea") + " Tarea", personal: ico("usuario") + " Mía" };
  listaClase.innerHTML = items.map(e => `<li class="${e.tipo}">
    <span class="etiqueta ${e.materia}">${e.materia || "—"}</span>
    <span class="txt"><b>${nombres[e.tipo]}</b> ${escapar(e.titulo)}</span>
    <span class="fecha">${formatoFecha(e.fecha)}</span>
    ${esAdmin && e.id ? `<button data-id="${e.id}" title="Borrar">${ico("x")}</button>` : ""}
  </li>`).join("");
}

function pintarTodo() {
  pintarCalendario();
  pintarListaClase();
}

function pintarAcceso() {
  acceso.innerHTML = usuario
    ? `<span class="rol">${ico(esAdmin ? "escudo" : "usuario")} ${escapar(usuario.email)}${esAdmin ? " · administrador" : ""}</span> <button id="btn-salir" type="button">${ico("salir")} Salir</button>`
    : `<button id="btn-entrar" type="button">${ico("entrar")} Iniciar sesión</button>`;
  formAdmin.hidden = !esAdmin;
}

function iniciarClase() {
  nube.escucharClase(lista => {
    eventosClase = limpiarEventos(lista);
    pintarTodo();
  }, () => {});
  nube.alCambiarUsuario((user, admin) => {
    usuario = user;
    esAdmin = admin;
    pintarAcceso();
    pintarTodo();
    actualizarChat();
  });
}

document.addEventListener("tareas-cambiadas", pintarTodo);

document.getElementById("mes-ant").addEventListener("click", () => { mesVista.setMonth(mesVista.getMonth() - 1); pintarCalendario(); });
document.getElementById("mes-sig").addEventListener("click", () => { mesVista.setMonth(mesVista.getMonth() + 1); pintarCalendario(); });

calGrid.addEventListener("click", e => {
  const celda = e.target.closest(".cal-celda");
  if (!celda) return;
  diaSel = diaSel === celda.dataset.f ? null : celda.dataset.f;
  pintarTodo();
});

acceso.addEventListener("click", e => {
  if (e.target.id === "btn-entrar") nube.entrar().catch(() => alert("No se pudo iniciar sesión."));
  if (e.target.id === "btn-salir") nube.salir();
});

formAdmin.addEventListener("submit", e => {
  e.preventDefault();
  nube.crearEvento({
    tipo: document.getElementById("tipo-admin").value,
    titulo: document.getElementById("titulo-admin").value.trim(),
    materia: materiaAdmin.value,
    fecha: document.getElementById("fecha-admin").value
  }).then(() => formAdmin.reset())
    .catch(() => alert("No tienes permiso para crear avisos."));
});

listaClase.addEventListener("click", e => {
  const id = e.target.dataset.id;
  if (id && confirm("¿Borrar este aviso para toda la clase?")) nube.borrarEvento(id);
});

pintarTodo();

/* ---------- Detalles modernos ---------- */
function mayuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Las casillas de la tabla aparecen una detrás de otra
clases.forEach((c, i) => { c.td.style.animationDelay = (i * 45) + "ms"; });

/* ---------- Vista por día para el móvil ---------- */
const tabsDia = document.getElementById("tabs-dia");
const cartasDia = document.getElementById("cartas-dia");
const diaHoy = new Date().getDay();
let diaVista = diaHoy >= 1 && diaHoy <= 5 ? diaHoy : 1;

function marcarAhoraDia() {
  const n = new Date();
  const min = n.getHours() * 60 + n.getMinutes();
  cartasDia.querySelectorAll(".carta-dia").forEach(el => {
    el.classList.toggle("ahora", diaVista === n.getDay() && min >= Number(el.dataset.i) && min < Number(el.dataset.f));
  });
}

function pintarVistaDia() {
  tabsDia.innerHTML = ["L", "M", "X", "J", "V"].map((letra, i) =>
    `<button type="button" data-d="${i + 1}" class="${i + 1 === diaVista ? "activo" : ""} ${i + 1 === diaHoy ? "hoy" : ""}">${letra}</button>`
  ).join("");

  const delDia = clases.filter(c => c.dia === diaVista).sort((a, b) => a.ini - b.ini);
  let html = "";
  let hayRecreo = false;
  delDia.forEach((c, i) => {
    if (!hayRecreo && c.ini >= 690) {
      html += `<div class="carta-recreo">${ico("cafe")} 休憩 · Recreo · 11:00 – 11:30</div>`;
      hayRecreo = true;
    }
    html += `<div class="carta-dia" data-i="${c.ini}" data-f="${c.fin}" style="animation-delay:${i * 70}ms">
      <div class="h">${c.td.dataset.ini}<br>${c.td.dataset.fin}</div>
      <a class="${c.color}" href="${c.enlace}" target="_blank" rel="noopener noreferrer">
        <strong>${c.siglas}</strong><span>${escapar(c.materia)} · ${escapar(c.profe)}</span>
      </a></div>`;
  });
  cartasDia.innerHTML = html;
  marcarAhoraDia();
}

tabsDia.addEventListener("click", e => {
  if (e.target.dataset.d) {
    diaVista = Number(e.target.dataset.d);
    pintarVistaDia();
  }
});

pintarVistaDia();
setInterval(marcarAhoraDia, 30000);

/* ---------- Iconos (están definidos en index.html) ---------- */
function ico(nombre) {
  return '<svg class="ico" aria-hidden="true"><use href="#i-' + nombre + '"/></svg>';
}

function avisoSync(icono, texto) {
  estado.innerHTML = ico(icono) + " " + texto;
}

/* ---------- Comunidad: chat ---------- */
const chatMensajes = document.getElementById("chat-mensajes");
const chatBloqueo = document.getElementById("chat-bloqueo");
const chatZona = document.getElementById("chat-zona");
const chatForm = document.getElementById("chat-form");
const chatTexto = document.getElementById("chat-texto");

let dejarChat = null;
let ultimaLista = [];
let primeraCarga = true;
let bajarSiguiente = false;
let ultimoEnvio = 0;
const vistos = new Set();

function colorUsuario(uid) {
  let h = 0;
  for (const letra of uid) h = (h * 31 + letra.charCodeAt(0)) % 360;
  return h;
}

// Valida lo que llega de la nube antes de mostrarlo
function limpiarMensajes(lista) {
  return lista
    .filter(m => /^[A-Za-z0-9]{1,40}$/.test(m.id) && typeof m.uid === "string" && typeof m.nombre === "string"
      && typeof m.texto === "string" && m.fecha && typeof m.fecha.toDate === "function")
    .map(m => ({ id: m.id, uid: m.uid, nombre: m.nombre.slice(0, 40), texto: m.texto.slice(0, 500), fecha: m.fecha.toDate() }));
}

function horaMensaje(f) {
  const hora = f.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return f.toDateString() === new Date().toDateString()
    ? hora
    : f.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + " " + hora;
}

function pintarMensajes(lista) {
  ultimaLista = lista;
  const abajo = chatMensajes.scrollHeight - chatMensajes.scrollTop - chatMensajes.clientHeight < 80;
  const eraPrimera = primeraCarga;

  chatMensajes.innerHTML = lista.length === 0
    ? `<div class="vacio">${ico("mensaje")} Sé el primero en escribir</div>`
    : lista.map(m => {
        const mio = usuario && m.uid === usuario.uid;
        const nuevo = !eraPrimera && !vistos.has(m.id) ? " nuevo" : "";
        const borrar = (mio || esAdmin) ? `<button data-id="${m.id}" title="Borrar">${ico("x")}</button>` : "";
        return `<div class="msg${mio ? " mio" : ""}${nuevo}">
          ${mio ? "" : `<div class="avatar" style="--h:${colorUsuario(m.uid)}">${escapar(m.nombre.charAt(0).toUpperCase())}</div>`}
          <div class="burbuja">
            ${mio ? "" : `<b>${escapar(m.nombre)}</b>`}
            <p>${escapar(m.texto)}</p>
            <small>${horaMensaje(m.fecha)}${borrar}</small>
          </div></div>`;
      }).join("");

  lista.forEach(m => vistos.add(m.id));
  primeraCarga = false;
  if (abajo || eraPrimera || bajarSiguiente) {
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
    bajarSiguiente = false;
  }
}

// Se llama cada vez que alguien entra o sale
function actualizarChat() {
  const dentro = !!usuario;
  chatBloqueo.hidden = dentro;
  chatZona.hidden = !dentro;
  if (dentro && !dejarChat) {
    dejarChat = nube.escucharMensajes(l => pintarMensajes(limpiarMensajes(l)), () => {
      chatMensajes.innerHTML = `<div class="vacio">${ico("alerta")} No se pudo cargar el chat</div>`;
    });
  } else if (dentro) {
    pintarMensajes(ultimaLista);      // por si ha cambiado el permiso de administrador
  } else if (dejarChat) {
    dejarChat();
    dejarChat = null;
    chatMensajes.innerHTML = "";
    vistos.clear();
    primeraCarga = true;
  }
}

document.getElementById("chat-entrar").addEventListener("click", () => {
  if (!nube || !nube.nubeDisponible) {
    alert("El chat necesita la conexión con la nube.");
    return;
  }
  nube.entrar().catch(() => alert("No se pudo iniciar sesión."));
});

chatForm.addEventListener("submit", e => {
  e.preventDefault();
  const texto = chatTexto.value.trim();
  if (!texto || Date.now() - ultimoEnvio < 1500) return;   // máximo un mensaje cada 1,5 s
  ultimoEnvio = Date.now();
  chatTexto.value = "";
  bajarSiguiente = true;
  nube.enviarMensaje(texto).catch(() => {
    alert("No se pudo enviar el mensaje.");
    chatTexto.value = texto;
  });
});

chatMensajes.addEventListener("click", e => {
  const id = e.target.dataset.id;
  if (id && confirm("¿Borrar este mensaje?")) nube.borrarMensaje(id);
});

/* ---------- Menú: cada apartado es una "vista" ---------- */
const VISTAS = ["horario", "calendario", "tareas", "comunidad"];

function mostrarVista() {
  let nombre = location.hash.slice(1);
  if (!VISTAS.includes(nombre)) nombre = "horario";
  document.querySelectorAll(".vista").forEach(v => v.classList.toggle("activa", v.id === "v-" + nombre));
  document.querySelectorAll(".menu a").forEach(a => a.classList.toggle("activo", a.getAttribute("href") === "#" + nombre));
  if (nombre === "comunidad") chatMensajes.scrollTop = chatMensajes.scrollHeight;
}

window.addEventListener("hashchange", () => { mostrarVista(); window.scrollTo(0, 0); });
mostrarVista();
