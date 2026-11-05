# Cambios

## 0.2.1 (5 de noviembre de 2026)
- Generador con botones: Insertar, Copiar y Generar otro.
- Reconoce los usos de CFDI de 4 caracteres (CP01, CN01).
- Autocompletar: unidades más usadas primero (H87, E48…), búsqueda por descripción y listas ordenadas.
- Menos falsos avisos: folios con fecha ya no se marcan como RFC y los números de 18 dígitos sin "clabe" no muestran nada.
- Mucho más rápido en archivos minificados; cada archivo se revisa por separado.
- Ajustes separados (explicar, avisos, catálogos), que se pueden cambiar por lenguaje.
- Reconoce PHP (=>), Go (:=) y FormaDePagoP; ya no rechaza RFC por palabras de la lista de RENAPO.
- Textos más claros y sin la bandera (en Windows se veía como "MX").

## 0.2.0
- Catálogos del SAT para CFDI 4.0: uso de CFDI, régimen fiscal, forma y método de pago, tipo de comprobante, 52,513 claves de producto o servicio, 2,418 unidades y 95,748 códigos postales.
- Al pasar el mouse explica cada clave; autocompleta al escribir; avisa si una clave no existe o si el UsoCFDI no corresponde al RegimenFiscalReceptor.

## 0.1.1
- Nuevo nombre: RFC CURP CLABE ("MX Dev Tools" ya existía en el Marketplace).

## 0.1.0
- Primera versión: explicar, validar y corregir RFC, CURP y CLABE al pasar el mouse; avisos en el código; generador de datos de prueba.
