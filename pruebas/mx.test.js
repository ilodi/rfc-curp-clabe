// Pruebas del núcleo: node pruebas/mx.test.js
const assert = require('assert');
const mx = require('../lib/mx');
let ok = 0;
const prueba = (nombre, fn) => { fn(); ok++; console.log('  ✓', nombre); };

// Ejemplos públicos conocidos
prueba('RFC del SAT (moral) es válido', () => assert.strictEqual(mx.analizarRfc('SAT970701NN3').valido, true));
prueba('RFC de BBVA Bancomer (moral) es válido', () => assert.strictEqual(mx.analizarRfc('BBA830831LJ2').valido, true));
prueba('RFC genérico público en general', () => assert.strictEqual(mx.analizar('XAXX010101000').persona, 'genérico'));
prueba('CURP de ejemplo de RENAPO es válida', () => {
  const r = mx.analizarCurp('HEGG560427MVZRRL04');
  assert.strictEqual(r.valido, true); assert.strictEqual(r.sexo, 'Mujer'); assert.strictEqual(r.estado, 'Veracruz');
  assert.strictEqual(r.fecha, '27 de abril de 1956');
});
prueba('RFC de prueba del SAT (físicas con y sin Ñ, y morales) son válidos', () => {
  for (const r of ['CACX7605101P8', 'FUNK671228PH6', 'IAÑL750210963', 'JUFA7608212V6', 'KAHO641101B39', 'KICR630120NX3',
    'MISC491214B86', 'RAQÑ7701212M3', 'WATM640917J45', 'WERX631016S30', 'XAMA620210DQ5', 'XIQB891116QE4',
    'EKU9003173C9', 'XIA190128J61']) assert.strictEqual(mx.analizarRfc(r).valido, true, r);
});
prueba('CURP con letra en la posición 17 es del 2000 en adelante', () => {
  const c = mx.generarCurp({ anio: 2011, aa: '11', mm: '03', dd: '13' }, 'H');
  assert.strictEqual(mx.analizarCurp(c).fecha, '13 de marzo de 2011');
});
prueba('CLABE de ejemplo de Banamex es válida', () => {
  const r = mx.analizarClabe('002010077777777771');
  assert.strictEqual(r.valido, true); assert.strictEqual(r.banco, 'Banco Nacional de México');
});

// Errores detectados
prueba('RFC con dígito equivocado', () => {
  const r = mx.analizarRfc('SAT970701NN4'); assert.strictEqual(r.valido, false); assert.strictEqual(r.digitoEsperado, '3');
});
prueba('CURP con dígito equivocado', () => assert.strictEqual(mx.analizarCurp('HEGG560427MVZRRL05').valido, false));
prueba('CLABE con dígito equivocado', () => {
  const r = mx.analizarClabe('002010077777777772'); assert.strictEqual(r.valido, false); assert.strictEqual(r.digitoEsperado, '1');
});
prueba('Texto que no es RFC (fecha imposible) se ignora', () => assert.strictEqual(mx.analizar('ABCD991399XY1'), null));
prueba('Minúsculas también se reconocen', () => assert.strictEqual(mx.analizar('sat970701nn3').valido, true));

// Generadores: 2000 de cada uno, todos válidos
prueba('Generadores producen datos válidos (2000 c/u)', () => {
  for (let i = 0; i < 2000; i++) {
    for (const v of [mx.generarRfc('física'), mx.generarRfc('moral'), mx.generarCurp(), mx.generarClabe()]) {
      const r = mx.analizar(v);
      assert.ok(r && r.valido, 'inválido: ' + v + ' ' + JSON.stringify(r && r.errores));
    }
  }
});
prueba('Persona de prueba: RFC y CURP coinciden', () => {
  const p = mx.personaPrueba();
  assert.strictEqual(p.rfc.slice(0, 10), p.curp.slice(0, 10));
  assert.ok(mx.analizar(p.rfc).valido && mx.analizar(p.curp).valido && mx.analizar(p.clabe).valido);
});
console.log(`\n${ok} pruebas pasaron`);
