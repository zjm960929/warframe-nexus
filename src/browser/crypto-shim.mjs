import { md5 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/**
 * Minimal browser replacement for the two node:crypto hashes used by the
 * worldstate parser. The parser only needs md5/sha256 hex digests for object
 * ids and its no-data arbitration fallback id.
 */
export function createHash(algorithm) {
  const hash = String(algorithm).toLowerCase() === 'md5' ? md5 : sha256;
  const chunks = [];
  return {
    update(value) {
      chunks.push(typeof value === 'string' ? value : new TextDecoder().decode(value));
      return this;
    },
    digest() {
      return bytesToHex(hash(utf8ToBytes(chunks.join(''))));
    },
  };
}
