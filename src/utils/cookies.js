/** Minimal cookie helpers for persisting small UI preferences. */

export function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : null
}

export function setCookie(name, value, days = 365) {
    const maxAge = days * 24 * 60 * 60
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};samesite=lax`
}
