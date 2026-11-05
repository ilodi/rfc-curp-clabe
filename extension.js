// MX Dev Tools: RFC, CURP y CLABE en VS Code. Todo local: nada sale de tu equipo.
const vscode = require('vscode');
const mx = require('./lib/mx');

// Candidatos dentro del texto (sin pegarse a otras letras o números).
const PATRON = /(?<![A-Za-z0-9Ññ&])(?:[A-Za-zÑñ&]{3,4}\d{6}[A-Za-z\d]{3}|[A-Za-z]{4}\d{6}[HMXhmx][A-Za-z]{5}[A-Za-z\d]\d|\d{18})(?![A-Za-z0-9Ññ])/g;
const UN_PATRON = new RegExp(PATRON.source); // para getWordRangeAtPosition (sin bandera g)
const NOMBRES = { rfc: 'RFC', curp: 'CURP', clabe: 'CLABE' };
const FEM = { rfc: false, curp: true, clabe: true }; // la CURP, la CLABE
const estado = (r) => r.valido ? (FEM[r.tipo] ? 'válida' : 'válido') : (FEM[r.tipo] ? 'inválida' : 'inválido');

function explicar(r) {
  const filas = [];
  if (r.tipo === 'rfc') {
    filas.push(['Tipo', r.persona === 'genérico' ? 'Genérico' : `Persona ${r.persona}`]);
    if (r.nota) filas.push(['Uso', r.nota]);
    if (r.fecha) filas.push([r.persona === 'moral' ? 'Fecha de constitución' : 'Fecha de nacimiento', r.fecha]);
    if (r.homoclave) filas.push(['Homoclave', r.homoclave]);
  }
  if (r.tipo === 'curp') {
    filas.push(['Fecha de nacimiento', r.fecha], ['Sexo', r.sexo], ['Estado', r.estado]);
  }
  if (r.tipo === 'clabe') {
    filas.push(['Banco', r.banco ? `${r.banco} (${r.codigoBanco})` : `Desconocido (${r.codigoBanco})`]);
    filas.push(['Plaza', r.plaza ? `${r.plaza} (${r.codigoPlaza})` : r.codigoPlaza], ['Cuenta', r.cuenta]);
  }
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**🇲🇽 ${NOMBRES[r.tipo]} ${r.valido ? '✅' : '❌'} ${estado(r)}**\n\n`);
  md.appendMarkdown('| | |\n|---|---|\n' + filas.map(([a, b]) => `| ${a} | ${b} |`).join('\n') + '\n');
  if (!r.valido) md.appendMarkdown('\n' + r.errores.map((e) => `- ${e}`).join('\n'));
  return md;
}

function activate(context) {
  const config = () => vscode.workspace.getConfiguration('mxDevTools');

  // ---- Pasar el mouse ----
  context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: '*' }, {
    provideHover(doc, pos) {
      const rango = doc.getWordRangeAtPosition(pos, UN_PATRON);
      if (!rango) return;
      const r = mx.analizar(doc.getText(rango));
      return r ? new vscode.Hover(explicar(r), rango) : undefined;
    },
  }));

  // ---- Avisos (subrayado) ----
  const avisos = vscode.languages.createDiagnosticCollection('mxDevTools');
  context.subscriptions.push(avisos);
  function revisar(doc) {
    if (!config().get('avisos') || doc.getText().length > 1e6 || doc.uri.scheme === 'output') { avisos.delete(doc.uri); return; }
    const lista = [], texto = doc.getText();
    for (const m of texto.matchAll(PATRON)) {
      const valor = m[0];
      // Un número de 18 dígitos puede ser cualquier cosa: solo se revisa como CLABE si antes, en la misma línea, dice "clabe".
      if (/^\d{18}$/.test(valor)) {
        const pos = doc.positionAt(m.index);
        if (!/clabe/i.test(doc.lineAt(pos.line).text.slice(0, pos.character))) continue;
      }
      const r = mx.analizar(valor);
      if (!r || r.valido) continue;
      const rango = new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + valor.length));
      const d = new vscode.Diagnostic(rango, `${NOMBRES[r.tipo]} ${estado(r)}: ${r.errores.join(' ').replace(/\*\*/g, '')}`,
        vscode.DiagnosticSeverity.Warning);
      d.source = 'MX Dev Tools';
      // Corrección rápida solo si cambiar el último dígito lo deja válido.
      const corregido = mx.analizar(valor.slice(0, -1) + r.digitoEsperado);
      d.code = r.digitoEsperado && corregido && corregido.valido ? 'digito:' + r.digitoEsperado : 'otro';
      lista.push(d);
    }
    avisos.set(doc.uri, lista);
  }
  let espera;
  const programar = (doc) => { clearTimeout(espera); espera = setTimeout(() => revisar(doc), 400); };
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(revisar),
    vscode.workspace.onDidChangeTextDocument((e) => programar(e.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => avisos.delete(doc.uri)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('mxDevTools')) vscode.workspace.textDocuments.forEach(revisar);
    }),
  );
  vscode.workspace.textDocuments.forEach(revisar);

  // ---- Corrección rápida del dígito verificador ----
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: '*' }, {
    provideCodeActions(doc, _rango, ctx) {
      return ctx.diagnostics.filter((d) => d.source === 'MX Dev Tools' && String(d.code).startsWith('digito:')).map((d) => {
        const digito = String(d.code).slice(7);
        const valor = doc.getText(d.range);
        const accion = new vscode.CodeAction(`Corregir dígito verificador → ${valor.slice(0, -1)}${digito}`, vscode.CodeActionKind.QuickFix);
        accion.edit = new vscode.WorkspaceEdit();
        accion.edit.replace(doc.uri, new vscode.Range(d.range.end.translate(0, -1), d.range.end), digito);
        accion.diagnostics = [d];
        accion.isPreferred = true;
        return accion;
      });
    },
  }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));

  // ---- Generar datos de prueba ----
  context.subscriptions.push(vscode.commands.registerCommand('mxDevTools.generar', async () => {
    const opciones = [
      { label: '$(person) RFC de persona física', id: 'rfcF' },
      { label: '$(organization) RFC de persona moral', id: 'rfcM' },
      { label: '$(account) CURP', id: 'curp' },
      { label: '$(credit-card) CLABE', id: 'clabe', detail: 'Elige el banco o déjalo al azar' },
      { label: '$(json) Persona de prueba (JSON)', id: 'persona', detail: 'RFC y CURP que coinciden, más una CLABE' },
    ];
    const e = await vscode.window.showQuickPick(opciones, { placeHolder: 'Datos ficticios para pruebas: ¿qué generamos?' });
    if (!e) return;
    let texto;
    if (e.id === 'rfcF') texto = mx.generarRfc('física');
    if (e.id === 'rfcM') texto = mx.generarRfc('moral');
    if (e.id === 'curp') texto = mx.generarCurp();
    if (e.id === 'clabe') {
      const bancos = [{ label: 'Al azar', codigo: undefined }].concat(Object.entries(mx.bancos)
        .filter(([c]) => c !== '999').map(([codigo, b]) => ({ label: b.nombre, description: codigo, codigo })));
      const b = await vscode.window.showQuickPick(bancos, { placeHolder: 'Banco de la CLABE', matchOnDescription: true });
      if (!b) return;
      texto = mx.generarClabe(b.codigo);
    }
    if (e.id === 'persona') texto = JSON.stringify(mx.personaPrueba(), null, 2);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await editor.edit((ed) => editor.selections.forEach((s) => ed.replace(s, texto)));
    } else {
      await vscode.env.clipboard.writeText(texto);
      vscode.window.showInformationMessage(`🇲🇽 Copiado al portapapeles: ${texto.split('\n')[0]}${texto.includes('\n') ? '…' : ''}`);
    }
  }));
}

function deactivate() {}
module.exports = { activate, deactivate };
