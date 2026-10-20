import { afterEach, describe, expect, it, vi } from 'vitest';
import { webReturnTarget } from '@/lib/web-return';
import { frontendConfig } from '@/config/frontend';

vi.mock('supertokens-auth-react/recipe/passwordless', () => ({ default: { init: vi.fn() } }));
vi.mock('supertokens-auth-react/recipe/session', () => ({ default: { init: vi.fn() } }));

const searchFor = (target: string) => `?${new URLSearchParams({ web_return: target })}`;

describe('forum web return', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('preserves the forum path and ordinary query without adding any credentials', () => {
        const target = 'https://forum.juvantia.org/topics/42?reply=12&query=hello%20world';
        expect(webReturnTarget(searchFor(target))).toBe(target);
        expect(webReturnTarget(searchFor('https://forum.juvantia.org'))).toBe('https://forum.juvantia.org/');
    });

    it.each([
        '', '/topics/42', '//forum.juvantia.org/topics/42',
        'http://forum.juvantia.org/', 'https://forum.juvantia.org:444/',
        'https://forum.juvantia.org.evil.example/', 'https://evil.forum.juvantia.org/',
        'https://evil.example/?next=https://forum.juvantia.org/',
        'https://auth.juvantia.org/', 'https://localhost:3000/',
        'https://forum.juvantia.org@evil.example/',
        'https://person@forum.juvantia.org/', 'https://person:password@forum.juvantia.org/',
        'https://@forum.juvantia.org/',
        'https://forum.juvantia.org/#reply', 'https://forum.juvantia.org/#',
        'javascript:alert(1)', 'data:text/html,unsafe',
        ' https://forum.juvantia.org/', 'https://forum.juvantia.org/\n',
        'https:\\forum.juvantia.org/', 'https://forum.juvantia.org/%0aevil',
        encodeURIComponent('https://forum.juvantia.org/topics/42'),
    ])('rejects an unsafe target: %s', (target) => {
        expect(webReturnTarget(searchFor(target))).toBeNull();
    });

    it.each(['token', 'access_token', 'accessToken', 'refresh_token', 'st-access-token', 'st-refresh-token', 'Authorization', 'TOKEN'])('rejects a credential query parameter %s', (name) => {
        expect(webReturnTarget(searchFor(`https://forum.juvantia.org/?${name}=sensitive`))).toBeNull();
    });

    it('rejects duplicate return parameters and absent destinations', () => {
        expect(webReturnTarget('?web_return=one&web_return=two')).toBeNull();
        expect(webReturnTarget('?unrelated=true')).toBeNull();
        expect(webReturnTarget(searchFor(`https://forum.juvantia.org/${'a'.repeat(4096)}`))).toBeNull();
    });

    it('keeps the validated destination through OTP success and central profile onboarding', async () => {
        const target = 'https://forum.juvantia.org/topics/42?page=2';
        vi.stubGlobal('window', { location: { search: searchFor(target) } });
        const config = frontendConfig();
        const home = await Reflect.apply(config.getRedirectionURL!, undefined, [{ action: 'SUCCESS' }]);
        expect(home.startsWith('/?web_return=')).toBe(true);
        expect(webReturnTarget(new URL(home, 'https://auth.juvantia.org').search)).toBe(target);
        expect(home).not.toContain('token');
    });

    it('returns to the profile normally for invalid destinations', async () => {
        vi.stubGlobal('window', { location: { search: searchFor('https://evil.example/') } });
        expect(await Reflect.apply(frontendConfig().getRedirectionURL!, undefined, [{ action: 'SUCCESS' }])).toBe('/');
        expect(webReturnTarget(searchFor('https://evil.example/'))).toBeNull();
    });

    it('retains an encoded forum destination inside SuperTokens redirectToPath', async () => {
        const target = 'https://forum.juvantia.org/topics/42?page=2&query=hello%20world';
        const home = `/?${new URLSearchParams({ web_return: target })}`;
        vi.stubGlobal('window', { location: { search: `?${new URLSearchParams({ redirectToPath: home })}` } });
        const result = await Reflect.apply(frontendConfig().getRedirectionURL!, undefined, [{ action: 'SUCCESS' }]);
        expect(webReturnTarget(new URL(result, 'https://auth.juvantia.org').search)).toBe(target);
    });
});
