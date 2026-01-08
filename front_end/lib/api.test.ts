import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi, getToken, machineApi, removeToken, setToken } from './api'

function makeJsonResponse(opts: {
  status: number
  body: any
  ok?: boolean
}) {
  const ok = opts.ok ?? (opts.status >= 200 && opts.status < 300)
  return {
    status: opts.status,
    ok,
    json: async () => opts.body,
  } as unknown as Response
}

describe('front_end/lib/api.ts', () => {
  const originalLocation = window.location

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()

    // Make window.location.href writable for tests (jsdom can be strict here)
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: false,
      configurable: true,
    })
  })

  it('manages token in localStorage', () => {
    expect(getToken()).toBeNull()
    setToken('abc')
    expect(getToken()).toBe('abc')
    removeToken()
    expect(getToken()).toBeNull()
  })

  it('adds Authorization header when token is present', async () => {
    setToken('jwt123')

    const fetchMock = vi.fn(async (_url: any, _init: any) =>
      makeJsonResponse({ status: 200, body: { status: 'success', access_token: 'x' } })
    )
    // @ts-expect-error test override
    globalThis.fetch = fetchMock

    await authApi.login({ username: 'u', password: 'p' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/api/front_end/user/login')
    expect(init?.headers?.Authorization).toBe('Bearer jwt123')
  })

  it('does not add Authorization header when token is missing', async () => {
    const fetchMock = vi.fn(async (_url: any, _init: any) =>
      makeJsonResponse({ status: 200, body: { status: 'success', access_token: 'x' } })
    )
    // @ts-expect-error test override
    globalThis.fetch = fetchMock

    await authApi.login({ username: 'u', password: 'p' })

    const [_url, init] = fetchMock.mock.calls[0]
    expect(init?.headers?.Authorization).toBeUndefined()
  })

  it('on 401 removes token, redirects to /login, and throws Unauthorized', async () => {
    setToken('jwt123')

    const fetchMock = vi.fn(async () => makeJsonResponse({ status: 401, body: { message: 'nope' }, ok: false }))
    // @ts-expect-error test override
    globalThis.fetch = fetchMock

    await expect(machineApi.listMachines()).rejects.toThrow('Unauthorized')
    expect(getToken()).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('on 403 throws the admin access error', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse({ status: 403, body: { message: 'forbidden' }, ok: false }))
    // @ts-expect-error test override
    globalThis.fetch = fetchMock

    await expect(machineApi.listMachines()).rejects.toThrow('Forbidden: Admin access required')
  })

  it('surfaces backend error message for non-OK responses', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse({ status: 400, body: { message: 'Bad thing' }, ok: false }))
    // @ts-expect-error test override
    globalThis.fetch = fetchMock

    await expect(authApi.register({ username: 'u', password: 'p' })).rejects.toThrow('Bad thing')
  })
})


