import { describe, expect, it } from 'vitest'
import { validateUrl } from '@/lib/url'

describe('validateUrl', () => {
  it('treats blank input as "no link"', () => {
    expect(validateUrl('')).toEqual({ value: undefined })
    expect(validateUrl('   ')).toEqual({ value: undefined })
  })

  it('accepts full and bare links, adding https to a bare domain', () => {
    expect(validateUrl('https://shop.ae/p?q=1').value).toBe('https://shop.ae/p?q=1')
    expect(validateUrl('http://noon.com/x').value).toBe('http://noon.com/x')
    expect(validateUrl('amazon.ae/dp/B01').value).toBe('https://amazon.ae/dp/B01')
    expect(validateUrl('  sharafdg.com  ').value).toBe('https://sharafdg.com/')
  })

  it('rejects prose that browsers would otherwise percent-encode into a host', () => {
    // Chromium turns this into https://not%20a%20url%20at%20all/ rather than throwing.
    expect(validateUrl('not a url at all').error).toBeTruthy()
    expect(validateUrl('https://a b c').error).toBeTruthy()
  })

  it('rejects a host that is not a domain', () => {
    expect(validateUrl('hello').error).toBeTruthy()
    expect(validateUrl('https://localhost').error).toBeUndefined()
  })

  it('rejects non-web schemes', () => {
    expect(validateUrl('javascript:alert(1)').error).toMatch(/http:\/\/ or https:\/\//)
    expect(validateUrl('ftp://example.com').error).toMatch(/http:\/\/ or https:\/\//)
    expect(validateUrl('data:text/html,hi').error).toMatch(/http:\/\/ or https:\/\//)
  })
})
