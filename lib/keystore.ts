export type StoredKey={addressBase58:string;addressHex:string;ciphertext:string;iv:string;salt:string;kdf:'PBKDF2';createdAt:number;};
const KEY='tron_simple_keystore_v1';

export async function savePrivateKey(password:string, pk:string, TronWeb:any){
  const enc=new TextEncoder(); const salt=crypto.getRandomValues(new Uint8Array(16)); const iv=crypto.getRandomValues(new Uint8Array(12));
  const keyM=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},keyM,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(pk));
  const base58=TronWeb.address.fromPrivateKey(pk); const hex=TronWeb.address.toHex(base58);
  const s:StoredKey={addressBase58:base58,addressHex:hex,ciphertext:btoa(String.fromCharCode(...new Uint8Array(ct))),iv:btoa(String.fromCharCode(...iv)),salt:btoa(String.fromCharCode(...salt)),kdf:'PBKDF2',createdAt:Date.now()};
  localStorage.setItem(KEY,JSON.stringify(s)); return s;
}
export function getStored():StoredKey|null{const raw=localStorage.getItem(KEY); if(!raw) return null; try{return JSON.parse(raw) as StoredKey;}catch{return null;}}
export async function unlock(password:string):Promise<string>{
  const raw=localStorage.getItem(KEY); if(!raw) throw new Error('No wallet stored'); const s=JSON.parse(raw) as StoredKey;
  const enc=new TextEncoder(); const salt=Uint8Array.from(atob(s.salt),c=>c.charCodeAt(0)); const iv=Uint8Array.from(atob(s.iv),c=>c.charCodeAt(0)); const ct=Uint8Array.from(atob(s.ciphertext),c=>c.charCodeAt(0));
  const keyM=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']); const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},keyM,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct); return new TextDecoder().decode(pt);
}
export function clearWallet(){localStorage.removeItem(KEY); localStorage.removeItem('tron_seed_v1');}

export async function saveMnemonic(password: string, mnemonic: string): Promise<void> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(mnemonic));
  const payload = { iv: btoa(String.fromCharCode(...iv)), salt: btoa(String.fromCharCode(...salt)), ciphertext: btoa(String.fromCharCode(...new Uint8Array(ct))) };
  localStorage.setItem('tron_seed_v1', JSON.stringify(payload));
}
export async function unlockMnemonic(password: string): Promise<string> {
  const raw = localStorage.getItem('tron_seed_v1'); if(!raw) throw new Error('No hay semilla guardada');
  const data = JSON.parse(raw); const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(data.salt), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(data.ciphertext), c => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}
