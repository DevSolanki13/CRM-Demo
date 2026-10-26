import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decryptToken, encryptToken } from '../backend/integrations/tokenEncryption.js';

describe('tokenEncryption service', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('encrypts and decrypts objects with 64-character hex key', () => {
    const hexKey = randomBytes(32).toString('hex');
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', hexKey);

    const payload = { access_token: 'secret-token-123', refresh_token: 'refresh-456' };
    const context = 'google:user-123';

    const encrypted = encryptToken(payload, context);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.startsWith('v1.')).toBe(true);
    expect(encrypted).not.toContain('secret-token-123');

    const decrypted = decryptToken(encrypted, context);
    expect(decrypted).toEqual(payload);
  });

  it('encrypts and decrypts with base64 32-byte key', () => {
    const base64Key = randomBytes(32).toString('base64');
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', base64Key);

    const payload = { token: 'alpha-beta' };
    const context = 'test-context';

    const encrypted = encryptToken(payload, context);
    const decrypted = decryptToken(encrypted, context);
    expect(decrypted).toEqual(payload);
  });

  it('throws 503 when INTEGRATION_ENCRYPTION_KEY is missing or invalid length', () => {
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', '');
    expect(() => encryptToken({ a: 1 }, 'ctx')).toThrow('Communication sync is not configured.');

    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', 'short-key');
    expect(() => encryptToken({ a: 1 }, 'ctx')).toThrow('Communication sync is not configured.');
  });

  it('rejects decryption when context (AAD) does not match', () => {
    const hexKey = randomBytes(32).toString('hex');
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', hexKey);

    const encrypted = encryptToken({ secure: 'data' }, 'google:user-1');
    expect(() => decryptToken(encrypted, 'google:user-2')).toThrow();
  });

  it('rejects tampered ciphertext, tags, or invalid format', () => {
    const hexKey = randomBytes(32).toString('hex');
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', hexKey);

    const encrypted = encryptToken({ secure: 'data' }, 'google:user-1');
    const parts = encrypted.split('.');

    // Tampered ciphertext
    const tamperedCipher = `${parts[0]}.${parts[1]}.${parts[2]}.AAAA`;
    expect(() => decryptToken(tamperedCipher, 'google:user-1')).toThrow();

    // Invalid format
    expect(() => decryptToken('invalid-format', 'google:user-1')).toThrow('Stored connection credentials are invalid');
    expect(() => decryptToken('v2.a.b.c', 'google:user-1')).toThrow('Stored connection credentials are invalid');
  });
});
