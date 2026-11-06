import { describe, expect, it } from 'vitest'
import { decrypt, encrypt, maskKey } from '../../apps/backend/src/lib/crypto'

const KEY = '00'.repeat(32)

describe('AES-GCM helpers', () => {
  it('round-trips plaintext', async () => {
    const cipher = await encrypt('sk-test-secret', KEY)
    expect(cipher).not.toContain('sk-test-secret')
    await expect(decrypt(cipher, KEY)).resolves.toBe('sk-test-secret')
  })

  it('rejects a different key', async () => {
    const cipher = await encrypt('secret', KEY)
    await expect(decrypt(cipher, '11'.repeat(32))).rejects.toBeTruthy()
  })

  it('rejects malformed ciphertext', async () => {
    await expect(decrypt('not-a-ciphertext', KEY)).rejects.toThrow('Invalid ciphertext format')
  })

  it('masks all but the edges of a key', () => {
    expect(maskKey('sk-1234567890abcdef')).toBe('sk-1****cdef')
    expect(maskKey('short')).toBe('****')
  })
})
