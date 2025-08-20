# TRON Gas-Free Wallet — Súper Simple

## Qué debes hacer tú
1. Subir a Vercel este proyecto.
2. En **Environment Variables** agrega SOLO:
   - `RELAYER_PRIVATE_KEY` = tu clave privada (wallet que paga el TRX).
   - `FORWARDER_ADDRESS` = contrato forwarder que cobra la comisión.
   - (Opcional) `FLAT_FEE_USDT`, `TRON_FULLNODE`, `TRON_SOLIDITYNODE`.

> USDT oficial en TRON ya está preconfigurado en el backend.

## Flujo del cliente
- La app crea su wallet (cifrada con contraseña en su navegador).
- El backend patrocina ENERGY y aprueba USDT automáticamente.
- El cliente envía USDT y tu sistema cobra una comisión fija.


## ¿A dónde van los USDT cobrados?
- Van a **`feeVault`**, la dirección que pones al **desplegar el contrato** `GaslessUSDTForwarderSimple.sol`.
- Si luego quieres cambiarla, usa la función `setFeeVault(newVault)` (llamada on-chain desde tu cuenta).
- La comisión fija se define en `flatFee` (puedes cambiarla con `setFee`).

## Copia de seguridad de la wallet (cliente)
En la pantalla verás:
- **Mostrar clave privada** (con confirmación)
- **Descargar respaldo cifrado (.json)** para guardar/recuperar la wallet más adelante.


## Frase semilla (Trust Wallet)
- Al crear la wallet puedes generar **12 palabras** (BIP39) y se deriva la clave TRON en la ruta `m/44'/195'/0'/0/0`.
- Con esas 12 palabras podrás **importar en Trust Wallet** y ver **la misma dirección**.
