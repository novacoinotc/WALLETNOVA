# TRON Gas-Free Wallet — Completo (con Semilla, Backend y Relayer)

## Lo único que debes configurar en Vercel → Settings → Environment Variables
- `RELAYER_PRIVATE_KEY` → tu wallet que paga TRX/ENERGY.
- `FORWARDER_ADDRESS` → dirección (T...) del contrato forwarder (incluido en `/contracts`).
- (Opcional) `FLAT_FEE_USDT`, `DELEGATE_ENERGY_AMOUNT`, `TRON_FULLNODE`, `TRON_SOLIDITYNODE`, `USDT_ADDRESS`.

## Flujo para el cliente
- Crea **frase semilla (12 palabras)** compatible con Trust Wallet (ruta TRON `m/44'/195'/0'/0/0`).
- Wallet se guarda **cifrada con contraseña** en el navegador.
- Auto-registro y auto-activación (patrocinio + approve).
- Envío USDT **gas-free**; la comisión va a tu `feeVault`.

## Contrato forwarder
- `contracts/GaslessUSDTForwarderSimple.sol` — al desplegar define: `usdt`, `feeVault`, `flatFee`.
