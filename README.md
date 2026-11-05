# RFC CURP CLABE 🇲🇽

**RFC, CURP, CLABE y catálogos del SAT en VS Code.** Pasa el mouse para ver qué significan, detecta los inválidos mientras escribes, corrige el dígito verificador con un clic y genera datos de prueba válidos. Todo funciona en tu equipo.

**Por qué existe:** si programas en México (facturación, ERPs, fintech, formularios de registro), validas RFC, CURP y CLABE todo el tiempo y buscas en Google o en el SAT qué significan. RFC CURP CLABE lo trae a tu editor.

## Qué hace

- **Pasa el mouse** sobre un RFC, CURP o CLABE en cualquier archivo (código, JSON, SQL, datos de prueba):
  - **RFC:** persona física o moral, fecha de nacimiento o de constitución, homoclave y si el dígito verificador es válido ✅/❌. Reconoce los RFC genéricos del SAT (`XAXX010101000`, `XEXX010101000`).
  - **CURP:** fecha de nacimiento, sexo, estado y dígito verificador.
  - **CLABE:** banco, plaza, número de cuenta y dígito de control. Catálogo de 138 bancos y fintech (Nu, Mercado Pago, Spin by OXXO, STP…).
- **Avisos:** los inválidos se subrayan mientras escribes. Un número de 18 dígitos solo se revisa como CLABE si antes, en la misma línea, dice "clabe"; así no marca IDs ni fechas.
- **Corrección rápida:** "Corregir dígito verificador" cambia el último carácter equivocado.
- **Datos de prueba:** *RFC CURP CLABE: Generar dato de prueba* (paleta de comandos o clic derecho) inserta un RFC, CURP o CLABE válido y ficticio (eliges el banco), o una persona de prueba completa en JSON, con RFC y CURP que coinciden.

## Catálogos del SAT (CFDI 4.0)

Reconoce el campo donde está cada clave, en el XML del CFDI, JSON o código (`UsoCFDI="G03"`, `"usoCfdi": "G03"`, `uso_cfdi = 'G03'`):

| Campo | Al pasar el mouse | Autocompleta |
|---|---|---|
| Uso de CFDI | Descripción, a quién aplica y qué regímenes del receptor lo admiten | ✅ |
| Régimen fiscal | Descripción, a quién aplica y qué usos de CFDI admite | ✅ |
| Forma y método de pago, tipo de comprobante | Descripción | ✅ |
| Clave de producto o servicio (52,513) | Descripción | ✅ |
| Clave de unidad (2,418) | Descripción | ✅ |
| Código postal (`LugarExpedicion`, `DomicilioFiscalReceptor`, `codigoPostal`…) | Municipio, estado y si es zona fronteriza | — |

Además avisa:
- si una clave **no está en el catálogo** vigente;
- si el **UsoCFDI no corresponde al RegimenFiscalReceptor**, el error clásico al timbrar. Por ejemplo: "El uso G03 no aplica al régimen 616. Usos válidos para 616: G02, S01, CP01".

Catálogos del SAT al 29 de octubre de 2026. Se actualizan con nuevas versiones de la extensión.

## Privacidad

Los RFC, CURP y cuentas bancarias son datos personales. **Nada sale de tu equipo:** sin red y sin analítica.

## Ajustes

| Ajuste | Por defecto | Para qué |
|---|---|---|
| `rfcCurpClabe.avisos` | `true` | Subraya los RFC, CURP y CLABE inválidos. |
| `rfcCurpClabe.catalogos` | `true` | Explica, autocompleta y valida las claves de los catálogos del SAT. |

## Notas

- Los algoritmos del dígito verificador son los públicos del SAT (RFC), RENAPO (CURP) y Banxico (CLABE), comprobados con ejemplos oficiales.
- Un dígito verificador válido significa que el valor está bien formado, no que exista ni a quién pertenece.
- Los datos generados son ficticios y solo para pruebas.
- Es una **versión preview**.

## Apoya el proyecto

Gratis y de código abierto. Si te ahorra tiempo, invítame un café: **[paypal.me/lodidev](https://paypal.me/lodidev)** ☕ ¡Gracias!

Creado por **lodi** · [github.com/ilodi](https://github.com/ilodi) · Hecho en 🇲🇽 con ❤️

---

Catálogo de bancos tomado de [clabe-validator](https://github.com/center-key/clabe-validator) (MIT) y catálogos del SAT de [phpcfdi/resources-sat-catalogs](https://github.com/phpcfdi/resources-sat-catalogs) (Unlicense); ver `TERCEROS.md`.
