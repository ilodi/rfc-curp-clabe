# MX Dev Tools 🇲🇽

**RFC, CURP y CLABE en VS Code.** Pasa el mouse para ver qué significan, detecta los inválidos mientras escribes, corrige el dígito verificador con un clic y genera datos de prueba válidos. Todo funciona en tu equipo.

**Por qué existe:** si programas en México (facturación, ERPs, fintech, formularios de registro), validas RFC, CURP y CLABE todo el tiempo y buscas en Google o en el SAT qué significan. MX Dev Tools lo trae a tu editor.

## Qué hace

- **Pasa el mouse** sobre un RFC, CURP o CLABE en cualquier archivo (código, JSON, SQL, datos de prueba):
  - **RFC:** persona física o moral, fecha de nacimiento o de constitución, homoclave y si el dígito verificador es válido ✅/❌. Reconoce los RFC genéricos del SAT (`XAXX010101000`, `XEXX010101000`).
  - **CURP:** fecha de nacimiento, sexo, estado y dígito verificador.
  - **CLABE:** banco, plaza, número de cuenta y dígito de control. Catálogo de 138 bancos y fintech (Nu, Mercado Pago, Spin by OXXO, STP…).
- **Avisos:** los inválidos se subrayan mientras escribes. Un número de 18 dígitos solo se revisa como CLABE si antes, en la misma línea, dice "clabe"; así no marca IDs ni fechas.
- **Corrección rápida:** "Corregir dígito verificador" cambia el último carácter equivocado.
- **Datos de prueba:** *MX Dev Tools: Generar dato de prueba* (paleta de comandos o clic derecho) inserta un RFC, CURP o CLABE válido y ficticio (eliges el banco), o una persona de prueba completa en JSON, con RFC y CURP que coinciden.

## Privacidad

Los RFC, CURP y cuentas bancarias son datos personales. **Nada sale de tu equipo:** sin red y sin analítica.

## Ajustes

| Ajuste | Por defecto | Para qué |
|---|---|---|
| `mxDevTools.avisos` | `true` | Subraya los RFC, CURP y CLABE inválidos. |

## Notas

- Los algoritmos del dígito verificador son los públicos del SAT (RFC), RENAPO (CURP) y Banxico (CLABE), comprobados con ejemplos oficiales.
- Un dígito verificador válido significa que el valor está bien formado, no que exista ni a quién pertenece.
- Los datos generados son ficticios y solo para pruebas.
- Es una **versión preview**. Lo siguiente: catálogos del SAT para CFDI 4.0 y códigos postales.

## Apoya el proyecto

Gratis y de código abierto. Si te ahorra tiempo, invítame un café: **[paypal.me/lodidev](https://paypal.me/lodidev)** ☕ ¡Gracias!

Creado por **lodi** · [github.com/ilodi](https://github.com/ilodi) · Hecho en 🇲🇽 con ❤️

---

Catálogo de bancos tomado de [clabe-validator](https://github.com/center-key/clabe-validator) (MIT); ver `TERCEROS.md`.
