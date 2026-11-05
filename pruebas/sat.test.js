// Pruebas de los catálogos del SAT: node pruebas/sat.test.js
const assert = require('assert');
const sat = require('../lib/sat');
let ok = 0;
const prueba = (n, fn) => { fn(); ok++; console.log('  ✓', n); };
const en = (l) => sat.enLinea(l).map((r) => [r.campo.id, r.clave, r.dato ? r.dato.texto : null]);

prueba('XML del CFDI: Receptor', () => {
  const r = en('<cfdi:Receptor DomicilioFiscalReceptor="38000" RegimenFiscalReceptor="612" UsoCFDI="G03"/>');
  assert.deepStrictEqual(r.map((x) => x[0]).sort(), ['cp', 'regimen', 'uso']);
  assert.ok(r.find((x) => x[0] === 'cp')[2].startsWith('Celaya'));
});
prueba('JSON y código', () => {
  assert.strictEqual(en('{ "usoCfdi": "G03" }')[0][2], 'Gastos en general.');
  assert.strictEqual(en("uso_cfdi = 'g03'")[0][2], 'Gastos en general.');
  assert.strictEqual(en('formaPago: "03"')[0][2], 'Transferencia electrónica de fondos');
});
prueba('Clave inexistente queda sin dato', () => assert.strictEqual(en('UsoCFDI="G99"')[0][2], null));
prueba('Productos, unidades y método de pago', () => {
  assert.strictEqual(en('ClaveProdServ="43211503"')[0][2], 'Computadores notebook');
  assert.strictEqual(en('ClaveUnidad="H87"')[0][2], 'Pieza');
  assert.strictEqual(en('MetodoPago="PPD"')[0][2], 'Pago en parcialidades o diferido');
});
prueba('Régimen 616 (sin obligaciones) admite solo CP01, G02 y S01', () => assert.deepStrictEqual(sat.usosDeRegimen('616').sort(), ['CP01', 'G02', 'S01']));
prueba('Autocompletar: campo en el cursor y sugerencias', () => {
  const c = sat.campoEnCursor('<cfdi:Receptor UsoCFDI="G0');
  assert.strictEqual(c.campo.id, 'uso'); assert.strictEqual(c.escrito, 'G0');
  assert.deepStrictEqual(sat.sugerencias('uso', 'G0').map((s) => s.clave), ['G01', 'G02', 'G03']);
  assert.ok(sat.sugerencias('producto', '').length <= 200);
});
prueba('Un número cualquiera no se toma por código postal', () => assert.strictEqual(en('pedido = "38000"').length, 0));
console.log(`\n${ok} pruebas pasaron`);
