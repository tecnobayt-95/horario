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

function tarjeta(etiqueta, clase, detalle) {
  return `<small>${etiqueta}</small>
    <h2>${clase.materia}</h2>
    <p>${clase.profe} · ${detalle}</p>
    <a class="boton" href="${clase.enlace}" target="_blank">Abrir aula</a>`;
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
    ahora.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  // Marcar día de hoy y clase actual en la tabla
  document.querySelectorAll("thead th").forEach((th, i) => th.classList.toggle("hoy", i === dia));
  const actual = clases.find(c => c.dia === dia && minutos >= c.ini && minutos < c.fin);
  clases.forEach(c => c.td.classList.toggle("ahora", c === actual));

  const panelAhora = document.getElementById("ahora");
  const panelSig = document.getElementById("siguiente");

  if (actual) {
    panelAhora.className = "panel " + actual.color;
    panelAhora.innerHTML = tarjeta("Ahora", actual, "termina en " + formatoTiempo(actual.fin - minutos));
  } else if (dia >= 1 && dia <= 5 && minutos >= 660 && minutos < 690) {
    panelAhora.className = "panel";
    panelAhora.innerHTML = `<small>Ahora</small><h2>☕ Recreo</h2><p>Vuelves a clase en ${formatoTiempo(690 - minutos)}</p>`;
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
  botonTema.textContent = tema === "oscuro" ? "☀️ Modo claro" : "🌙 Modo oscuro";
  localStorage.setItem("tema", tema);
}

const temaGuardado = localStorage.getItem("tema");
const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
ponerTema(temaGuardado || (prefiereOscuro ? "oscuro" : "claro"));

botonTema.addEventListener("click", () => {
  ponerTema(document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro");
});

/* ---------- Tareas pendientes (se guardan en el navegador) ---------- */
let tareas = JSON.parse(localStorage.getItem("tareas") || "[]");

const selectMateria = document.getElementById("materia-tarea");
const listaTareas = document.getElementById("lista-tareas");

// Una opción por asignatura (sin repetir)
const unicas = {};
clases.forEach(c => { unicas[c.siglas] = c; });
Object.values(unicas).forEach(c => {
  selectMateria.innerHTML += `<option value="${c.siglas}">${c.materia}</option>`;
});

function guardarTareas() {
  localStorage.setItem("tareas", JSON.stringify(tareas));
}

function pintarTareas() {
  if (tareas.length === 0) {
    listaTareas.innerHTML = `<li class="vacio">No tienes tareas pendientes 🎉</li>`;
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
      <span class="txt">${t.texto}</span>
      ${fecha}
      <button data-borrar="${i}" title="Borrar">✕</button>
    </li>`;
  }).join("");
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
