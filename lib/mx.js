// RFC CURP CLABE: validar, explicar y generar RFC, CURP y CLABE.
// Algoritmos públicos: dígito verificador del RFC (SAT), de la CURP (RENAPO)
// y de la CLABE (Banxico). Sin dependencias y sin red: todo es local.
const path = require('path');
const fs = require('fs');

const CLABE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'datos', 'clabe.json'), 'utf8'));

const ESTADOS = {
  AS: 'Aguascalientes', BC: 'Baja California', BS: 'Baja California Sur', CC: 'Campeche',
  CL: 'Coahuila', CM: 'Colima', CS: 'Chiapas', CH: 'Chihuahua', DF: 'Ciudad de México',
  DG: 'Durango', GT: 'Guanajuato', GR: 'Guerrero', HG: 'Hidalgo', JC: 'Jalisco',
  MC: 'Estado de México', MN: 'Michoacán', MS: 'Morelos', NT: 'Nayarit', NL: 'Nuevo León',
  OC: 'Oaxaca', PL: 'Puebla', QT: 'Querétaro', QR: 'Quintana Roo', SP: 'San Luis Potosí',
  SL: 'Sinaloa', SR: 'Sonora', TC: 'Tabasco', TS: 'Tamaulipas', TL: 'Tlaxcala',
  VZ: 'Veracruz', YN: 'Yucatán', ZS: 'Zacatecas', NE: 'Nacido en el extranjero',
};

// Palabras que RENAPO y el SAT no usan como primeras 4 letras; el generador las evita.
const INCONVENIENTES = new Set(('BACA BAKA BUEI BUEY CACA CACO CAGA CAGO CAKA CAKO COGE COGI COJA COJE COJI COJO ' +
  'COLA CULO FALO FETO GETA GUEI GUEY JETA JOTO KACA KACO KAGA KAGO KAKA KAKO KOGE KOGI KOJA KOJE KOJI KOJO ' +
  'KOLA KULO LILO LOCA LOCO LOKA LOKO MAME MAMO MEAR MEAS MEON MIAR MION MOCO MOKO MULA MULO NACA NACO PEDA ' +
  'PEDO PENE PIPI PITO POPO PUTA PUTO QULO RATA ROBA ROBE ROBO RUIN SENO TETA VACA VAGA VAGO VAKA VUEI VUEY ' +
  'WUEI WUEY').split(' '));

const GENERICOS_RFC = {
  XAXX010101000: 'RFC genérico: público en general (ventas sin RFC del cliente)',
  XEXX010101000: 'RFC genérico: residente en el extranjero',
};

// ---------- utilidades ----------
function fechaValida(aa, mm, dd, siglo) {
  const anio = siglo + aa, d = new Date(Date.UTC(anio, mm - 1, dd));
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd;
}
// RFC: el año viene en 2 dígitos; si es mayor al año actual, es del siglo pasado.
function sigloRfc(aa) { return aa > new Date().getFullYear() % 100 ? 1900 : 2000; }
function fechaTexto(anio, mm, dd) {
  return `${dd} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'][mm - 1]} de ${anio}`;
}

// ---------- RFC ----------
const DICC_RFC = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';
function digitoRfc(base) { // base: 11 (moral) o 12 (física) caracteres, sin el dígito
  const b = base.length === 11 ? ' ' + base : base;
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const v = DICC_RFC.indexOf(b[i]);
    if (v < 0) return null;
    suma += v * (13 - i);
  }
  const r = suma % 11;
  return r === 0 ? '0' : (11 - r === 10 ? 'A' : String(11 - r));
}

function analizarRfc(texto) {
  const rfc = texto.toUpperCase();
  if (GENERICOS_RFC[rfc]) return { tipo: 'rfc', valor: rfc, valido: true, persona: 'genérico', nota: GENERICOS_RFC[rfc] };
  const m = /^([A-ZÑ&]{3,4})(\d{2})(\d{2})(\d{2})([A-Z\d]{2})([A\d])$/.exec(rfc);
  if (!m) return null;
  const persona = m[1].length === 4 ? 'física' : 'moral';
  const aa = +m[2], mm = +m[3], dd = +m[4], siglo = sigloRfc(aa);
  if (!fechaValida(aa, mm, dd, siglo)) return null; // no parece RFC
  const esperado = digitoRfc(rfc.slice(0, -1));
  const errores = [];
  if (esperado !== m[6]) errores.push(`El dígito verificador debería ser **${esperado}**, no ${m[6]}.`);
  if (persona === 'física' && INCONVENIENTES.has(m[1])) errores.push(`"${m[1]}" es una palabra que el SAT no asigna.`);
  return {
    tipo: 'rfc', valor: rfc, valido: errores.length === 0, errores, persona,
    fecha: fechaTexto(siglo + aa, mm, dd),
    homoclave: m[5] + m[6], digitoEsperado: esperado,
  };
}

// ---------- CURP ----------
const DICC_CURP = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
function digitoCurp(base17) {
  let suma = 0;
  for (let i = 0; i < 17; i++) {
    const v = DICC_CURP.indexOf(base17[i]);
    if (v < 0) return null;
    suma += v * (18 - i);
  }
  return String((10 - (suma % 10)) % 10);
}

function analizarCurp(texto) {
  const curp = texto.toUpperCase();
  const m = /^([A-Z][AEIOUX][A-Z]{2})(\d{2})(\d{2})(\d{2})([HMX])([A-Z]{2})([B-DF-HJ-NP-TV-Z]{3})([A-Z\d])(\d)$/.exec(curp);
  if (!m) return null;
  const aa = +m[2], mm = +m[3], dd = +m[4];
  const siglo = /\d/.test(m[8]) ? 1900 : 2000; // posición 17: dígito antes del 2000, letra desde el 2000
  if (!fechaValida(aa, mm, dd, siglo)) return null;
  const errores = [];
  if (!ESTADOS[m[6]]) errores.push(`"${m[6]}" no es una clave de estado válida.`);
  const esperado = digitoCurp(curp.slice(0, 17));
  if (esperado !== m[9]) errores.push(`El dígito verificador debería ser **${esperado}**, no ${m[9]}.`);
  if (INCONVENIENTES.has(m[1])) errores.push(`"${m[1]}" es una palabra que RENAPO no asigna.`);
  return {
    tipo: 'curp', valor: curp, valido: errores.length === 0, errores,
    fecha: fechaTexto(siglo + aa, mm, dd),
    sexo: { H: 'Hombre', M: 'Mujer', X: 'X' }[m[5]],
    estado: ESTADOS[m[6]] || m[6], digitoEsperado: esperado,
  };
}

// ---------- CLABE ----------
function digitoClabe(base17) {
  const pesos = [3, 7, 1];
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += (+base17[i] * pesos[i % 3]) % 10;
  return String((10 - (suma % 10)) % 10);
}

function analizarClabe(texto) {
  if (!/^\d{18}$/.test(texto)) return null;
  const banco = CLABE.bancos[texto.slice(0, 3)];
  const plazas = CLABE.plazas[texto.slice(3, 6)];
  const esperado = digitoClabe(texto);
  const errores = [];
  if (esperado !== texto[17]) errores.push(`El dígito de control debería ser **${esperado}**, no ${texto[17]}.`);
  if (!banco) errores.push(`El código de banco ${texto.slice(0, 3)} no está en el catálogo.`);
  return {
    tipo: 'clabe', valor: texto, valido: errores.length === 0, errores,
    banco: banco ? banco.nombre : null, codigoBanco: texto.slice(0, 3),
    plaza: plazas ? plazas.map((p) => p[0]).join(', ') : null, codigoPlaza: texto.slice(3, 6),
    cuenta: texto.slice(6, 17), digitoEsperado: esperado,
  };
}

function analizar(texto) {
  const t = String(texto).trim();
  if (/^\d{18}$/.test(t)) return analizarClabe(t);
  if (t.length === 18) return analizarCurp(t);
  if (t.length === 12 || t.length === 13) return analizarRfc(t);
  return null;
}

// ---------- generadores (datos ficticios para pruebas) ----------
const al = (s) => s[Math.floor(Math.random() * s.length)];
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', VOCALES = 'AEIOU', CONSONANTES = 'BCDFGHJKLMNPQRSTVWXYZ';
const pad = (n) => String(n).padStart(2, '0');
function fechaAlAzar(desde, hasta) {
  const anio = desde + Math.floor(Math.random() * (hasta - desde + 1));
  const mm = 1 + Math.floor(Math.random() * 12), dd = 1 + Math.floor(Math.random() * 28);
  return { anio, aa: pad(anio % 100), mm: pad(mm), dd: pad(dd) };
}
function iniciales() {
  let s;
  do s = al(CONSONANTES) + al(VOCALES) + al(LETRAS) + al(LETRAS); while (INCONVENIENTES.has(s));
  return s;
}

function generarRfc(persona = 'física', fecha) {
  const f = fecha || fechaAlAzar(persona === 'física' ? 1960 : 1990, persona === 'física' ? 2004 : 2020);
  const letras = persona === 'física' ? iniciales() : al(LETRAS) + al(LETRAS) + al(LETRAS);
  const base = letras + f.aa + f.mm + f.dd + al('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789') + al('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789');
  return base + digitoRfc(base);
}

function generarCurp(fecha, sexo) {
  const f = fecha || fechaAlAzar(1960, 2004);
  const estados = Object.keys(ESTADOS).filter((e) => e !== 'NE');
  const base = iniciales() + f.aa + f.mm + f.dd + (sexo || al('HM')) + al(estados) +
    al(CONSONANTES) + al(CONSONANTES) + al(CONSONANTES) + (f.anio < 2000 ? al('0123456789') : al(LETRAS));
  return base + digitoCurp(base);
}

function generarClabe(codigoBanco) {
  const bancos = Object.keys(CLABE.bancos).filter((c) => c !== '999');
  const banco = codigoBanco || al(bancos);
  const plaza = al(Object.keys(CLABE.plazas));
  let cuenta = '';
  for (let i = 0; i < 11; i++) cuenta += al('0123456789');
  const base = banco + plaza + cuenta;
  return base + digitoClabe(base);
}

// Persona ficticia con RFC y CURP que coinciden en fecha (y, si se quiere, en iniciales).
function personaPrueba() {
  const f = fechaAlAzar(1965, 2003), sexo = al('HM');
  const curp = generarCurp(f, sexo);
  const base = curp.slice(0, 10) + al('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789') + al('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789');
  const rfc = base + digitoRfc(base);
  const clabe = generarClabe();
  return {
    nota: 'Datos ficticios para pruebas (RFC CURP CLABE)',
    rfc, curp,
    fechaNacimiento: `${f.anio}-${f.mm}-${f.dd}`,
    sexo: sexo === 'H' ? 'Hombre' : 'Mujer',
    estado: ESTADOS[curp.slice(11, 13)],
    clabe, banco: CLABE.bancos[clabe.slice(0, 3)].nombre,
  };
}

module.exports = {
  analizar, analizarRfc, analizarCurp, analizarClabe,
  digitoRfc, digitoCurp, digitoClabe,
  generarRfc, generarCurp, generarClabe, personaPrueba,
  bancos: CLABE.bancos, ESTADOS,
};
