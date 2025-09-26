/**
 * Cryptographic utilities for ZarinPal contract signature encryption
 * Uses Web Crypto API with BETTER_AUTH_SECRET as the encryption key
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiEnv } from '@/api/types';

/**
 * Derive encryption key from BETTER_AUTH_SECRET
 * Following the same pattern as ZarinPal services - receive env from handler context
 */
async function getEncryptionKey(env: ApiEnv['Bindings']): Promise<CryptoKey> {
  const secret = env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'BETTER_AUTH_SECRET not configured',
    });
  }

  // Use Web Crypto API to derive a key from BETTER_AUTH_SECRET
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('zarinpal-signature-salt'), // Fixed salt for deterministic key
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt ZarinPal contract signature (200 chars or JWT token)
 * Following the same pattern as ZarinPal services - receive env from handler context
 */
export async function encryptSignature(signature: string, env: ApiEnv['Bindings']): Promise<{
  encrypted: string;
  hash: string;
}> {
  // Allow JWT tokens (starts with eyJ) or traditional 200-char signatures
  if (signature.length !== 200 && !signature.startsWith('eyJ')) {
    throw new Error('ZarinPal signature must be exactly 200 characters or a valid JWT token');
  }

  try {
    const key = await getEncryptionKey(env);
    const encoder = new TextEncoder();
    const data = encoder.encode(signature);

    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the signature
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Create hash for unique constraint and lookups
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      encrypted: btoa(String.fromCharCode(...combined)),
      hash,
    };
  } catch (error) {
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: `Failed to encrypt signature: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Decrypt ZarinPal contract signature
 * Following the same pattern as ZarinPal services - receive env from handler context
 */
export async function decryptSignature(encryptedSignature: string, env: ApiEnv['Bindings']): Promise<string> {
  try {
    const key = await getEncryptionKey(env);

    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedSignature)
        .split('')
        .map(char => char.charCodeAt(0)),
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted,
    );

    const decoder = new TextDecoder();
    const signature = decoder.decode(decrypted);

    // Allow JWT tokens (starts with eyJ) or traditional 200-char signatures
    if (signature.length !== 200 && !signature.startsWith('eyJ')) {
      throw new Error('Decrypted signature is not 200 characters or a valid JWT token');
    }

    return signature;
  } catch (error) {
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: `Failed to decrypt signature: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Create hash of signature for lookups
 */
export async function hashSignature(signature: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(signature);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
