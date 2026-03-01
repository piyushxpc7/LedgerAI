import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { auth, ApiError } from './api'

declare const global: any

describe('LedgerAI API client', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('auth.login returns access token and user on success', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'test-token',
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'user@example.com',
          role: 'PARTNER',
          firm_id: 'firm-1',
        },
      }),
    })

    const res = await auth.login({ email: 'user@example.com', password: 'password123' })
    expect(res.access_token).toBe('test-token')
    expect(res.user.email).toBe('user@example.com')
  })

  it('auth.login throws ApiError on backend error response', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ detail: 'Invalid email or password' }),
    })

    await expect(
      auth.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

