// Catálogos del SAT para CFDI 4.0: reconocer el campo, explicar la clave y validar.
// Datos: phpcfdi/resources-sat-catalogs (Unlicense). Los catálogos grandes se cargan solo al usarlos.
const path = require('path');
const fs = require('fs');

const leer = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'datos', f), 'utf8'));
const SAT = leer('sat.json');
let productos = null, cps = null;
const PRODUCTOS = () => productos || (productos = leer('sat-productos.json').productos);
const CPS = () => cps || (cps = leer('sat-cp.json'));

// Nombre del campo (XML del CFDI, JSON, código) → catálogo. Se busca justo antes del valor.
const CAMPOS = [
  { id: 'uso', nombre: 'Uso de CFDI', campo: 'uso_?cfdi', valor: '[A-Za-z]{1,2}\\d{2}' }, // G03, CP01, CN01
  { id: 'regimen', nombre: 'Régimen fiscal', campo: 'r[eé]gimen_?fiscal(?:_?receptor)?', valor: '\\d{3}' },
  { id: 'forma', nombre: 'Forma de pago', campo: 'forma_?(?:de_?)?pago(?:_?p)?', valor: '\\d{2}' }, // también FormaDePagoP (pagos 2.0)
  { id: 'metodo', nombre: 'Método de pago', campo: 'm[eé]todo_?(?:de_?)?pago', valor: '[A-Za-z]{3}' },
  { id: 'tipo', nombre: 'Tipo de comprobante', campo: 'tipo_?(?:de_?)?comprobante', valor: '[A-Za-z]' },
  { id: 'producto', nombre: 'Clave de producto o servicio', campo: 'clave_?prod_?serv', valor: '\\d{8}' },
  { id: 'unidad', nombre: 'Clave de unidad', campo: 'clave_?unidad', valor: '[A-Za-z0-9]{1,3}' },
  { id: 'cp', nombre: 'Código postal', campo: 'c[oó]digo_?postal|lugar_?expedici[oó]n|domicilio_?fiscal(?:_?receptor)?|\\bcp', valor: '\\d{5}' },
];
// Separador entre campo y valor: ":" "=" (JSON, XML, JS, Python), "=>" (PHP, Ruby) y ":=" (Go).
const SEP = '(?:=>|:=|[:=])';
for (const c of CAMPOS) {
  // campo, cierre opcional de comillas, := y apertura opcional de comillas, luego el valor
  c.re = new RegExp(`(?:${c.campo})["']?\\s*${SEP}\\s*["']?(${c.valor})(?![A-Za-z0-9])`, 'gi');
}

const lista = (o) => Object.keys(o);
function buscar(id, clave) {
  const k = id === 'uso' || id === 'metodo' || id === 'tipo' || id === 'unidad' ? clave.toUpperCase() : clave;
  if (id === 'uso') { const u = SAT.usos[k]; return u && { texto: u[0], fisica: u[1], moral: u[2], regimenes: u[3] }; }
  if (id === 'regimen') { const r = SAT.regimenes[k]; return r && { texto: r[0], fisica: r[1], moral: r[2] }; }
  if (id === 'forma') return SAT.formasPago[k] && { texto: SAT.formasPago[k] };
  if (id === 'metodo') return SAT.metodosPago[k] && { texto: SAT.metodosPago[k] };
  if (id === 'tipo') return SAT.tiposComprobante[k] && { texto: SAT.tiposComprobante[k] };
  if (id === 'unidad') return SAT.unidades[k] && { texto: SAT.unidades[k] };
  if (id === 'producto') return PRODUCTOS()[k] && { texto: PRODUCTOS()[k] };
  if (id === 'cp') {
    const d = CPS(), v = d.cp[k];
    if (!v) return null;
    const estado = d.estados[v.slice(0, 3)], municipio = d.municipios[v.slice(0, 6)];
    return { texto: [municipio, estado].filter(Boolean).join(', '), frontera: v.endsWith('*') };
  }
  return null;
}

// Todos los valores de catálogo en una línea: [{ campo, clave, inicio, fin, dato }]
function enLinea(texto) {
  const res = [];
  for (const c of CAMPOS) {
    c.re.lastIndex = 0;
    for (const m of texto.matchAll(c.re)) {
      const inicio = m.index + m[0].length - m[1].length;
      res.push({ campo: c, clave: m[1], inicio, fin: inicio + m[1].length, dato: buscar(c.id, m[1]),
        receptor: /receptor/i.test(m[0]) });
    }
  }
  return res;
}

// Si el cursor está donde va el valor de un campo de catálogo, devuelve ese campo y lo ya escrito.
function campoEnCursor(antes) {
  for (const c of CAMPOS) {
    const m = new RegExp(`(?:${c.campo})["']?\\s*${SEP}\\s*["']?([A-Za-z0-9]*)$`, 'i').exec(antes);
    if (m) return { campo: c, escrito: m[1] };
  }
  return null;
}

// Unidades más usadas al facturar: van primero en el autocompletado.
const UNIDADES_COMUNES = ['H87', 'E48', 'ACT', 'XUN', 'KGM', 'GRM', 'LTR', 'MTR', 'MTK', 'MTQ', 'HUR', 'DAY', 'MON',
  'E51', 'E54', 'KWH', 'A9', 'XBX', 'XPK', 'SET', 'PR'];
const sinAcentos = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Sugerencias para autocompletar: por inicio de clave o por palabras de la descripción.
// Devuelve { items, cortada } (como mucho 200 por vez; si se cortó, VS Code vuelve a pedir al escribir).
function sugerencias(id, escrito) {
  const fuente = { uso: SAT.usos, regimen: SAT.regimenes, forma: SAT.formasPago, metodo: SAT.metodosPago,
    tipo: SAT.tiposComprobante, unidad: SAT.unidades, producto: PRODUCTOS() }[id];
  if (!fuente) return { items: [], cortada: false };
  const e = escrito.toUpperCase(), palabra = sinAcentos(escrito);
  const texto = (k) => (Array.isArray(fuente[k]) ? fuente[k][0] : fuente[k]);
  let claves = lista(fuente).sort();
  if (id === 'unidad') claves = UNIDADES_COMUNES.filter((k) => fuente[k]).concat(claves.filter((k) => !UNIDADES_COMUNES.includes(k)));
  const items = [];
  for (const k of claves) {
    if (e && !k.toUpperCase().startsWith(e) && !(palabra.length >= 3 && sinAcentos(texto(k)).includes(palabra))) continue;
    if (items.length >= 200) return { items, cortada: true };
    items.push({ clave: k, texto: texto(k) });
  }
  return { items, cortada: false };
}

// Usos de CFDI que admite un régimen fiscal del receptor.
const usosDeRegimen = (regimen) => lista(SAT.usos).filter((u) => SAT.usos[u][3].includes(regimen));

module.exports = { CAMPOS, buscar, enLinea, campoEnCursor, sugerencias, usosDeRegimen, version: SAT.version };
