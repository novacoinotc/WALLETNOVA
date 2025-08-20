# TRON Gas-Free USDT Wallet — Starter (Next.js + TronWeb)

MVP para envíos **gas-free** de USDT (TRC20) en TRON:
- Contrato `contracts/GaslessUSDTForwarder.sol` (verifica firma, ejecuta `transferFrom`, cobra tarifa fija).
- Relayer (API en Vercel) que patrocina gas con Energy.
- Delegación de Energy para `approve` inicial sin TRX.
- UI mínima (Conectar, Activar, Enviar).

## Pasos
1) Despliega el contrato en tu red (testnet/mainnet).
2) Configura variables en Vercel (`.env.example`).
3) Sube el ZIP y despliega.

**Nota:** Ajusta seguridad y firma EIP-712 según tu versión de TronLink.
