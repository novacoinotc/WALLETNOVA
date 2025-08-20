# TRON Gas-Free Wallet — Auto (sin TronLink)

Objetivo: que tus clientes **reciban y envíen USDT** sin TRX y pagando una **comisión fija en USDT**, con todo automatizado.

## ¿Cómo se usa?
1. Sube este ZIP a Vercel.
2. En **Environment Variables** pon:
   - `RELAYER_PRIVATE_KEY` = PK de tu relayer (con TRX staked)
   - `USDT_ADDRESS` = contrato USDT (por defecto puse el oficial mainnet)
   - `FORWARDER_ADDRESS` = dirección de tu contrato forwarder (incluido en /contracts para desplegar)
   - (Opcional) `FLAT_FEE_USDT`, `DELEGATE_ENERGY_AMOUNT` , `TRON_FULLNODE`, `TRON_SOLIDITYNODE`
3. Abre la app. El front **genera la wallet del cliente**, la **registra** en tu backend, y si hace falta **auto-activa** (approve sin TRX).
4. El cliente solo elige destino y monto → **Enviar USDT (Gas-Free)**.

Seguridad mínima incluida (no custodial): la PK se guarda **cifrada** en el navegador con contraseña.
