import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey() {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY || '';
  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) throw Object.assign(new Error('Communication sync is not configured.'), { statusCode: 503 });
  return key;
}

export function encryptToken(value, context) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptToken(value, context) {
  const [version, nonce, tag, encrypted] = String(value || '').split('.');
  if (version !== 'v1' || !nonce || !tag || !encrypted) throw new Error('Stored connection credentials are invalid. Reconnect this account.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(nonce, 'base64url'));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8'));
}
