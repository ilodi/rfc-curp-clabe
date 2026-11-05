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
  assert.deepStrictEqual(sat.sugerencias('uso', 'G0').items.map((s) => s.clave), ['G01', 'G02', 'G03']);
  const p = sat.sugerencias('producto', '');
  assert.ok(p.items.length === 200 && p.cortada);
});
prueba('Un número cualquiera no se toma por código postal', () => assert.strictEqual(en('pedido = "38000"').length, 0));
// --- Hallazgos de la auditoría (0.2.1) ---
prueba('Usos de 4 caracteres: CP01 y CN01', () => {
  assert.strictEqual(en('UsoCFDI="CP01"')[0][2], 'Pagos');
  assert.ok(en('UsoCFDI="CN01"')[0][2].startsWith('Nómina'));
  assert.ok(!sat.buscar('uso', 'CN01').regimenes.includes('601')); // CN01 no aplica a 601
});
prueba('Unidades: las comunes primero y búsqueda por descripción', () => {
  assert.strictEqual(sat.sugerencias('unidad', '').items[0].clave, 'H87');
  assert.ok(sat.sugerencias('unidad', 'H8').items.some((s) => s.clave === 'H87'));
  assert.ok(sat.sugerencias('unidad', 'pieza').items.some((s) => s.clave === 'H87'));
  assert.ok(sat.sugerencias('producto', 'computadores notebook').items.some((s) => s.clave === '43211503'));
});
prueba('Formas de pago ordenadas (01 antes que 99)', () => {
  const c = sat.sugerencias('forma', '').items.map((s) => s.clave);
  assert.strictEqual(c[0], '01');
});
prueba('PHP (=>), Go (:=) y FormaDePagoP', () => {
  assert.strictEqual(en("'UsoCFDI' => 'G03'")[0][2], 'Gastos en general.');
  assert.strictEqual(en('usoCFDI := "G03"')[0][2], 'Gastos en general.');
  assert.strictEqual(en('FormaDePagoP="03"')[0][2], 'Transferencia electrónica de fondos');
});
console.log(`\n${ok} pruebas pasaron`);
