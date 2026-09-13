export interface UrlValidation {
  value: string | undefined
  error?: string
}

const SCHEME = /^([a-z][a-z0-9+.\-]*):/i
// A host that looks like a real domain, an IP, or localhost. Browsers happily
// percent-encode nonsense like "not a url at all" into a host, so `new URL`
// on its own is far too forgiving to use as validation.
const HOST = /^(localhost|(\d{1,3}\.){3}\d{1,3}|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)$/i

/**
 * Validates a user-typed product link. Blank is allowed; a bare domain gets an
 * `https://` prefix. Returns the normalised URL or a message explaining why not.
 */
export function validateUrl(raw: string): UrlValidation {
  const trimmed = raw.trim()
  if (trimmed === '') return { value: undefined }

  if (/\s/.test(trimmed)) {
    return { value: undefined, error: 'A link cannot contain spaces.' }
  }

  const scheme = SCHEME.exec(trimmed)?.[1]?.toLowerCase()
  if (scheme && scheme !== 'http' && scheme !== 'https') {
    return { value: undefined, error: 'Use a link starting with http:// or https://' }
  }

  const candidate = scheme ? trimmed : `https://${trimmed}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return { value: undefined, error: 'That does not look like a valid link.' }
  }

  if (!HOST.test(url.hostname)) {
    return { value: undefined, error: 'That does not look like a valid link.' }
  }

  return { value: url.toString() }
}
