export type StoredKey = {
  addressBase58: string;
  addressHex: string;
  ciphertext: string; // base64
  iv: string;        // base64
  salt: string;      // base64
  kdf: 'PBKDF2';
  createdAt: number;
};
const KEY_NAME = 'tron_auto_keystore_v1';

export async function createWallet(password: string, TronWeb: any) {
  const acct = await TronWeb.utils.accounts.generateAccount();
  return savePrivateKey(password, acct.privateKey, TronWeb);
}

export async function savePrivateKey(password: string, privateKey: string, TronWeb: any) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(privateKey));
  const addressBase58 = TronWeb.address.fromPrivateKey(privateKey);
  const addressHex = TronWeb.address.toHex(addressBase58);
  const stored: StoredKey = {
    addressBase58, addressHex,
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ct))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
    kdf: 'PBKDF2', createdAt: Date.now(),
  };
  localStorage.setItem(KEY_NAME, JSON.stringify(stored));
  return stored;
}

export function getStored(): StoredKey | null {
  const raw = localStorage.getItem(KEY_NAME);
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredKey; } catch { return null; }
}

export async function unlock(password: string): Promise<string> {
  const stored = getStored();
  if (!stored) throw new Error('No wallet stored');
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(stored.salt), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(stored.iv), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(stored.ciphertext), c => c.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
  const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  const pk = new TextDecoder().decode(ptBuf);
  return pk;
}

export function clearWallet() {
  localStorage.removeItem(KEY_NAME);
}
