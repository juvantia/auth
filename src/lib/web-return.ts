const FORUM_ORIGIN = 'https://forum.juvantia.org';
const CREDENTIAL_PARAMETER = /^(?:token|access[_-]?token|refresh[_-]?token|st-access-token|st-refresh-token|authorization)$/i;

/** Validates a cookie-based forum return without transporting session credentials. */
export function webReturnTarget(search: string): string | null {
    const params = new URLSearchParams(search);
    const values = params.getAll('web_return');
    if (values.length !== 1) return null;
    const value = values[0];
    if (!value || value.length > 4096 || /[\u0000-\u0020\u007f\\#]/.test(value) || /%0[0-9a-f]|%1[0-9a-f]|%7f/i.test(value)) return null;
    try {
        const target = new URL(value);
        if (target.origin !== FORUM_ORIGIN || target.protocol !== 'https:' || target.username || target.password || /^https:\/\/[^/?#]*@/i.test(value)) return null;
        for (const name of target.searchParams.keys()) {
            if (CREDENTIAL_PARAMETER.test(name)) return null;
        }
        return target.href;
    } catch {
        return null;
    }
}
