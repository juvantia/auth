'use client';

import { useEffect, useRef, useState } from 'react';
import { SessionAuth, useSessionContext } from 'supertokens-auth-react/recipe/session';
import Session from 'supertokens-auth-react/recipe/session';
import { signOut } from 'supertokens-auth-react/recipe/passwordless';

import RedirectOverlay from '@/components/auth/RedirectOverlay';
import OnboardingForm from '@/components/auth/OnboardingForm';
import ProfileCard, { UserProfile } from '@/components/auth/ProfileCard';
import StatusDescriptionCard from '@/components/auth/StatusDescriptionCard';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="font-grotesk text-[11px] uppercase tracking-widest text-text-secondary/50 animate-pulse">
        Authenticating...
      </p>
    </div>
  );
}

function Dashboard() {
  const session = useSessionContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jwt, setJwt] = useState<string>('');
  const nativeHandoffStarted = useRef(false);

  // Onboarding state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      if (!session.loading && session.doesSessionExist) {
        try {
          const token = await Session.getAccessToken();
          if (token) setJwt(token);

          const res = await fetch('/api/user/profile', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            if (data.needsOnboarding) {
              setNeedsOnboarding(true);
              setName('');
              setUsername('');
              if (data.user) {
                setAvatarUrl(data.user.avatar_url || '');
              }
            } else {
              setProfile(data);
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
    }
    fetchProfile();
  }, [session]);

  const handleOnboardingSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (!name || !username) { setError('Please fill in all required fields.'); return; }
    if (username.length < 5) { setError('Username must be at least 5 characters long.'); return; }

    setIsSubmitting(true);
    setError('');

    try {
      if (!jwt) throw new Error('Authentication session missing. Please refresh the page.');

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, username, avatar_url: avatarUrl || undefined }),
      });

      if (res.ok) {
        const newProfile = await res.json();
        setProfile(newProfile);
        setNeedsOnboarding(false);
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Error occurred during account creation');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        if (needsOnboarding) {
          setAvatarUrl(dataUrl);
        } else {
          handleUpdateAvatar(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateName = async (newName: string) => {
    if (!profile || !newName.trim()) return;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name: newName, 
          username: profile.username, 
          avatar_url: profile.avatar_url 
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
      }
    } catch (err) {
      console.error("Name update failed", err);
    }
  };

  const handleUpdateAvatar = async (newUrl: string) => {
    if (!profile) return;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name: profile.name, 
          username: profile.username, 
          avatar_url: newUrl 
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
      }
    } catch (err) {
      console.error("Avatar update failed", err);
    }
  };

  const handleUpdateDesc = async (newDesc: string) => {
    if (!profile) return;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name: profile.name, 
          username: profile.username, 
          avatar_url: profile.avatar_url,
          status_description: newDesc
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
      }
    } catch (err) {
      console.error("Description update failed", err);
    }
  };

  useEffect(() => {
    if (profile && !needsOnboarding) {
      const urlParams = new URLSearchParams(window.location.search);
      const nativeRedirectUri = urlParams.get('native_redirect_uri');
      const nativeState = urlParams.get('state');
      const codeChallenge = urlParams.get('code_challenge');
      if (nativeRedirectUri && nativeState && codeChallenge && !nativeHandoffStarted.current) {
        nativeHandoffStarted.current = true;
        void fetch('/api/auth/native/authorize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ redirectUri: nativeRedirectUri, codeChallenge }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error('Native authorization failed.');
            const body = await response.json();
            if (!body?.success || typeof body.data?.code !== 'string') {
              throw new Error('Native authorization failed.');
            }
            const callback = new URL(nativeRedirectUri);
            callback.searchParams.set('code', body.data.code);
            callback.searchParams.set('state', nativeState);
            window.location.href = callback.toString();
          })
          .catch((error) => {
            console.error('Native authorization failed', error);
            nativeHandoffStarted.current = false;
          });
        return;
      }
      if (urlParams.get('popup') === 'true') {
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        const authRedirect = urlParams.get('auth_redirect');
        if (authRedirect) {
          const decodedUrl = decodeURIComponent(authRedirect);
          if (decodedUrl.startsWith('juvantia-cockpit://')) {
            if (!jwt) return;
            setTimeout(() => {
              try {
                const redirectUrl = new URL(decodedUrl);
                redirectUrl.searchParams.set('token', jwt);
                window.location.href = redirectUrl.toString();
              } catch (e) {
                console.error("URL parsing failed for redirect, using string fallback:", e);
                const separator = decodedUrl.includes('?') ? '&' : '?';
                window.location.href = `${decodedUrl}${separator}token=${jwt}`;
              }
            }, 1500);
          } else {
            setTimeout(() => {
              window.location.href = decodedUrl;
            }, 1500);
          }
        }
      }
    }
  }, [profile, needsOnboarding, jwt]);

  if (session.loading || isLoading) return <LoadingScreen />;

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isPopup = urlParams?.get('popup') === 'true';
  const hasAuthRedirect = urlParams?.get('auth_redirect') !== null;
  const isRedirecting = isPopup || hasAuthRedirect;
  const authRedirectValue = urlParams?.get('auth_redirect') || '';
  const isDeepLink = authRedirectValue.startsWith('juvantia-cockpit://');

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 bg-background">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <RedirectOverlay
          isRedirecting={Boolean(isRedirecting && profile && !needsOnboarding)}
          hasAuthRedirect={hasAuthRedirect}
          isDeepLink={isDeepLink}
          authRedirectValue={authRedirectValue}
          jwt={jwt}
        />

        <header className="flex items-center justify-between mb-2">
          <div className="flex flex-col gap-0.5">
            <h1
              className="text-xl font-normal uppercase tracking-[0.3em] bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
              style={{ fontFamily: 'var(--font-cinzel)' }}
            >
              Juvantia Auth
            </h1>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 font-grotesk text-[10px] uppercase tracking-widest text-error/60 hover:text-error border border-error/20 hover:border-error/50 px-3 py-1.5 transition-all duration-300 rounded-sm hover:shadow-[0_0_12px_rgba(255,71,87,0.2)]"
          >
            Sign Out
          </button>
        </header>

        {needsOnboarding ? (
          <OnboardingForm
            name={name}
            setName={setName}
            username={username}
            setUsername={setUsername}
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
            handleImageUpload={handleImageUpload}
            handleOnboardingSubmit={handleOnboardingSubmit}
            isSubmitting={isSubmitting}
            error={error}
          />
        ) : (
          profile && (
            <div className="flex flex-col gap-5">
              <ProfileCard
                profile={profile}
                handleImageUpload={handleImageUpload}
                onUpdateName={handleUpdateName}
              />
              <StatusDescriptionCard
                profile={profile}
                onUpdateDesc={handleUpdateDesc}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <SessionAuth>
      <Dashboard />
    </SessionAuth>
  );
}
