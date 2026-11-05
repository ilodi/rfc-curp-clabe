// RFC CURP CLABE: RFC, CURP, CLABE y catálogos del SAT en VS Code. Todo local: nada sale de tu equipo.
const vscode = require('vscode');
const mx = require('./lib/mx');
const sat = require('./lib/sat');

// Candidatos dentro del texto (sin pegarse a otras letras o números).
const PATRON = /(?<![A-Za-z0-9Ññ&])(?:[A-Za-zÑñ&]{3,4}\d{6}[A-Za-z\d]{3}|[A-Za-z]{4}\d{6}[HMXhmx][A-Za-z]{5}[A-Za-z\d]\d|\d{18})(?![A-Za-z0-9Ññ])/g;
const UN_PATRON = new RegExp(PATRON.source); // para getWordRangeAtPosition (sin bandera g)
const NOMBRES = { rfc: 'RFC', curp: 'CURP', clabe: 'CLABE' };
const FEM = { rfc: false, curp: true, clabe: true }; // la CURP, la CLABE
const estado = (r) => r.valido ? (FEM[r.tipo] ? 'válida' : 'válido') : (FEM[r.tipo] ? 'inválida' : 'inválido');
const ESQUEMAS = new Set(['file', 'untitled']); // no revisar Output, diffs de git, etc.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const VERSION_SAT = ((v) => `${+v[2]} de ${MESES[+v[1] - 1]} de ${v[0]}`)(sat.version.split('-'));

// ¿Aparece la palabra justo antes (40 caracteres) del valor? Ventana corta: rápido aun en archivos minificados.
function hayContexto(lineaTexto, col, palabra) {
  return palabra.test(lineaTexto.slice(Math.max(0, col - 40), col));
}
// Un RFC de 12 caracteres tiene la misma forma que muchos folios (FAC241104001): solo se avisa con "rfc" cerca.
// Un número de 18 dígitos puede ser cualquier ID: solo se trata como CLABE con "clabe" cerca.
function merecAviso(r, lineaTexto, col) {
  if (r.tipo === 'clabe') return hayContexto(lineaTexto, col, /clabe/i);
  if (r.tipo === 'rfc' && r.persona === 'moral') return hayContexto(lineaTexto, col, /rfc/i);
  return true;
}

function explicar(r) {
  const filas = [];
  if (r.tipo === 'rfc') {
    filas.push(['Tipo', r.persona === 'genérico' ? 'RFC genérico del SAT' : `Persona ${r.persona}`]);
    if (r.nota) filas.push(['Uso', r.nota]);
    if (r.fecha) filas.push([r.persona === 'moral' ? 'Fecha de constitución' : 'Fecha de nacimiento', r.fecha]);
    if (r.homoclave) filas.push(['Homoclave', r.homoclave]);
  }
  if (r.tipo === 'curp') filas.push(['Fecha de nacimiento', r.fecha], ['Sexo', r.sexo], ['Estado', r.estado]);
  if (r.tipo === 'clabe') {
    filas.push(['Banco', r.banco ? `${r.banco} (${r.codigoBanco})` : `Desconocido (${r.codigoBanco})`]);
    filas.push(['Plaza', r.plaza ? `${r.plaza} (${r.codigoPlaza})` : r.codigoPlaza], ['Cuenta', r.cuenta]);
  }
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${NOMBRES[r.tipo]} ${r.valido ? '✅' : '❌'} ${estado(r)}**\n\n`);
  md.appendMarkdown('| Dato | Valor |\n|---|---|\n' + filas.map(([a, b]) => `| ${a} | ${b} |`).join('\n') + '\n');
  if (!r.valido) md.appendMarkdown('\n' + r.errores.map((e) => `- ${e[0].toUpperCase()}${e.slice(1)}`).join('\n'));
  return md;
}

// Explicación de una clave de catálogo del SAT.
function explicarSat(r) {
  const md = new vscode.MarkdownString();
  const c = r.campo, d = r.dato;
  if (!d) {
    md.appendMarkdown(`**${c.nombre} ❌ ${r.clave}**\n\nNo está en el catálogo vigente del SAT.`);
  } else {
    md.appendMarkdown(`**${c.nombre} ${r.clave}**\n\n${d.texto}`);
    if (c.id === 'producto' && r.clave === '01010101') md.appendMarkdown('\n\n_Clave genérica del SAT para cuando no hay una más específica._');
    if (d.fisica !== undefined) md.appendMarkdown(`\n\nAplica a: ${[d.fisica && 'persona física', d.moral && 'persona moral'].filter(Boolean).join(' y ') || '—'}`);
    if (d.regimenes) md.appendMarkdown(`\n\nRegímenes del receptor que lo admiten: ${d.regimenes.join(', ')}`);
    if (c.id === 'regimen') md.appendMarkdown(`\n\nUsos de CFDI que admite como receptor: ${sat.usosDeRegimen(r.clave).join(', ')}`);
    if (d.frontera) md.appendMarkdown('\n\nRegión fronteriza: puede aplicar el estímulo fiscal de IVA (si el contribuyente está inscrito en el padrón).');
  }
  md.appendMarkdown(`\n\n_Catálogos del SAT (CFDI 4.0) al ${VERSION_SAT}._`);
  return md;
}

// Genera un dato de prueba del tipo pedido.
function generarDato(id, codigoBanco) {
  if (id === 'rfcF') return mx.generarRfc('física');
  if (id === 'rfcM') return mx.generarRfc('moral');
  if (id === 'curp') return mx.generarCurp();
  if (id === 'clabe') return mx.generarClabe(codigoBanco);
  return JSON.stringify(mx.personaPrueba(), null, 2);
}

function activate(context) {
  // Ajustes con el documento como alcance: se pueden cambiar por lenguaje ("[csv]": {...}).
  const config = (doc) => vscode.workspace.getConfiguration('rfcCurpClabe', doc);

  // ---- Pasar el mouse ----
  context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: '*' }, {
    provideHover(doc, pos) {
      const linea = doc.lineAt(pos.line).text;
      if (config(doc).get('catalogos')) {
        const r = sat.enLinea(linea).find((x) => pos.character >= x.inicio && pos.character <= x.fin);
        if (r) return new vscode.Hover(explicarSat(r), new vscode.Range(pos.line, r.inicio, pos.line, r.fin));
      }
      if (!config(doc).get('explicar')) return;
      const rango = doc.getWordRangeAtPosition(pos, UN_PATRON);
      if (!rango) return;
      const r = mx.analizar(doc.getText(rango));
      if (!r) return;
      // Un número de 18 dígitos sin "clabe" cerca solo se explica si de verdad parece CLABE (válida y de un banco conocido).
      if (r.tipo === 'clabe' && !hayContexto(linea, rango.start.character, /clabe/i) && !(r.valido && r.banco)) return;
      return new vscode.Hover(explicar(r), rango);
    },
  }));

  // ---- Avisos (subrayado) ----
  const avisos = vscode.languages.createDiagnosticCollection('rfcCurpClabe');
  context.subscriptions.push(avisos);
  const nuevoAviso = (rango, msg) => {
    const d = new vscode.Diagnostic(rango, msg, vscode.DiagnosticSeverity.Warning);
    d.source = 'RFC CURP CLABE';
    return d;
  };

  function revisar(doc) {
    if (!ESQUEMAS.has(doc.uri.scheme) || doc.getText().length > 1e6) { avisos.delete(doc.uri); return; }
    const lista = [];
    if (config(doc).get('avisos')) lista.push(...avisosIds(doc));
    if (config(doc).get('catalogos')) lista.push(...avisosSat(doc));
    avisos.set(doc.uri, lista);
  }

  // RFC, CURP y CLABE inválidos.
  function avisosIds(doc) {
    const res = [];
    for (const m of doc.getText().matchAll(PATRON)) {
      const valor = m[0], r = mx.analizar(valor);
      if (!r || r.valido) continue;
      const pos = doc.positionAt(m.index);
      if (!merecAviso(r, doc.lineAt(pos.line).text, pos.character)) continue;
      const d = nuevoAviso(new vscode.Range(pos, doc.positionAt(m.index + valor.length)),
        `${NOMBRES[r.tipo]} ${estado(r)}: ${r.errores.join(' ').replace(/\*\*/g, '')}`);
      // Corrección rápida solo si cambiar el último carácter lo deja válido.
      const corregido = r.digitoEsperado && mx.analizar(valor.slice(0, -1) + r.digitoEsperado);
      d.code = corregido && corregido.valido ? 'digito' : 'otro';
      res.push(d);
    }
    return res;
  }

  // Claves que no están en el catálogo, y UsoCFDI que no corresponde al RegimenFiscalReceptor.
  function avisosSat(doc) {
    const res = [], usos = [], regimenes = new Map(); // regímenes del receptor por línea
    for (let i = 0; i < doc.lineCount; i++) {
      for (const r of sat.enLinea(doc.lineAt(i).text)) {
        if (!r.dato) res.push(nuevoAviso(new vscode.Range(i, r.inicio, i, r.fin), `${r.clave} no está en el catálogo del SAT (${r.campo.nombre.toLowerCase()}).`));
        else if (r.campo.id === 'uso') usos.push({ linea: i, r });
        else if (r.campo.id === 'regimen' && r.receptor) regimenes.set(i, r);
      }
    }
    // El régimen del receptor de la misma línea o, si en el archivo hay un solo uso y un solo régimen, ese.
    const unico = usos.length === 1 && regimenes.size === 1 ? [...regimenes.values()][0] : null;
    for (const u of usos) {
      const reg = regimenes.get(u.linea) || unico;
      if (!reg || !reg.dato || u.r.dato.regimenes.includes(reg.clave)) continue;
      res.push(nuevoAviso(new vscode.Range(u.linea, u.r.inicio, u.linea, u.r.fin),
        `El uso de CFDI ${u.r.clave.toUpperCase()} no aplica al régimen ${reg.clave} del receptor. ` +
        `Usos válidos para ${reg.clave}: ${sat.usosDeRegimen(reg.clave).join(', ')}.`));
    }
    return res;
  }

  // Un temporizador por documento: editar uno no cancela la revisión de otro.
  const esperas = new Map();
  const programar = (doc) => {
    if (!ESQUEMAS.has(doc.uri.scheme)) return;
    const k = doc.uri.toString();
    clearTimeout(esperas.get(k));
    esperas.set(k, setTimeout(() => { esperas.delete(k); revisar(doc); }, 400));
  };
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(revisar),
    vscode.workspace.onDidChangeTextDocument((e) => programar(e.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => { avisos.delete(doc.uri); clearTimeout(esperas.get(doc.uri.toString())); }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('rfcCurpClabe')) vscode.workspace.textDocuments.forEach(revisar);
    }),
    { dispose: () => esperas.forEach(clearTimeout) },
  );
  vscode.workspace.textDocuments.forEach(revisar);

  // ---- Autocompletar claves del SAT (por clave o por palabras de la descripción) ----
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: '*' }, {
    provideCompletionItems(doc, pos) {
      if (!config(doc).get('catalogos')) return;
      const enCursor = sat.campoEnCursor(doc.lineAt(pos.line).text.slice(0, pos.character));
      if (!enCursor || enCursor.campo.id === 'cp') return;
      const desde = pos.translate(0, -enCursor.escrito.length);
      const { items, cortada } = sat.sugerencias(enCursor.campo.id, enCursor.escrito);
      const lista = items.map((s, i) => {
        const it = new vscode.CompletionItem({ label: s.clave, description: s.texto }, vscode.CompletionItemKind.EnumMember);
        it.detail = `${enCursor.campo.nombre} (SAT)`;
        it.range = new vscode.Range(desde, pos);
        it.filterText = `${s.clave} ${s.texto}`;
        it.sortText = String(i).padStart(4, '0');
        return it;
      });
      return new vscode.CompletionList(lista, cortada);
    },
  }, '"', "'", '=', ':'));

  // ---- Corrección rápida del dígito verificador (se recalcula con el texto actual) ----
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: '*' }, {
    provideCodeActions(doc, _rango, ctx) {
      const acciones = [];
      for (const d of ctx.diagnostics) {
        if (d.source !== 'RFC CURP CLABE' || d.code !== 'digito') continue;
        const valor = doc.getText(d.range), r = mx.analizar(valor);
        if (!r || r.valido || !r.digitoEsperado) continue;
        const nuevo = valor.slice(0, -1) + r.digitoEsperado, ok = mx.analizar(nuevo);
        if (!ok || !ok.valido) continue;
        const accion = new vscode.CodeAction(`Corregir dígito verificador → ${nuevo}`, vscode.CodeActionKind.QuickFix);
        accion.edit = new vscode.WorkspaceEdit();
        accion.edit.replace(doc.uri, d.range, nuevo);
        accion.diagnostics = [d];
        accion.isPreferred = true;
        acciones.push(accion);
      }
      return acciones;
    },
  }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));

  // ---- Generar datos de prueba, con Insertar / Copiar / Generar otro ----
  context.subscriptions.push(vscode.commands.registerCommand('rfcCurpClabe.generar', async () => {
    const opciones = [
      { label: '$(person) RFC de persona física', id: 'rfcF', nombre: 'RFC de persona física' },
      { label: '$(organization) RFC de persona moral', id: 'rfcM', nombre: 'RFC de persona moral' },
      { label: '$(account) CURP', id: 'curp', nombre: 'CURP' },
      { label: '$(credit-card) CLABE', id: 'clabe', nombre: 'CLABE', detail: 'Elige el banco o déjalo al azar' },
      { label: '$(json) Persona de prueba (JSON)', id: 'persona', nombre: 'Persona de prueba', detail: 'RFC y CURP que coinciden, fecha, sexo, estado y una CLABE' },
    ];
    const e = await vscode.window.showQuickPick(opciones, { placeHolder: 'Datos aleatorios para pruebas: ¿qué generamos?' });
    if (!e) return;
    let codigoBanco;
    if (e.id === 'clabe') {
      const bancos = [{ label: 'Al azar', codigo: undefined }].concat(Object.entries(mx.bancos)
        .filter(([c]) => c !== '999').map(([codigo, b]) => ({ label: b.nombre, description: codigo, codigo })));
      const b = await vscode.window.showQuickPick(bancos, { placeHolder: 'Banco de la CLABE', matchOnDescription: true });
      if (!b) return;
      codigoBanco = b.codigo;
    }
    const editor = vscode.window.activeTextEditor;
    const editable = editor && !editor.document.isClosed;
    let texto = generarDato(e.id, codigoBanco);
    for (;;) {
      const muestra = e.id === 'persona' ? `RFC ${JSON.parse(texto).rfc}` : texto;
      const botones = (editable ? ['Insertar'] : []).concat(['Copiar', 'Generar otro']);
      const r = await vscode.window.showInformationMessage(`${e.nombre}: ${muestra}`, ...botones);
      if (r === 'Insertar') await editor.edit((ed) => editor.selections.forEach((s) => ed.replace(s, texto)));
      if (r === 'Copiar') {
        await vscode.env.clipboard.writeText(texto);
        vscode.window.setStatusBarMessage(`$(check) Copiado: ${muestra}`, 3000);
      }
      if (r !== 'Generar otro') return;
      texto = generarDato(e.id, codigoBanco);
    }
  }));
}

function deactivate() {}
module.exports = { activate, deactivate };
