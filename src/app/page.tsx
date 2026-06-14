'use client';

import { useEffect, useState } from 'react';
import { SessionAuth, useSessionContext } from 'supertokens-auth-react/recipe/session';
import Session from 'supertokens-auth-react/recipe/session';
import { signOut } from 'supertokens-auth-react/recipe/passwordless';

interface UserProfile {
  _id: string;
  supertokens_id: string;
  name: string;
  username: string;
  email?: string;
  avatar_url?: string;
  smart_wallet_address?: string;
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const session = useSessionContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jwt, setJwt] = useState<string>('');

  // Onboarding form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

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

  // ─── Onboarding Submit ──────────────────────────────────────────────────────
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

  // ─── Image Upload ───────────────────────────────────────────────────────────
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

  const handleUpdateName = async () => {
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
        setIsEditingName(false);
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

  useEffect(() => {
    if (profile && !needsOnboarding) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('popup') === 'true') {
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        const authRedirect = urlParams.get('auth_redirect');
        if (authRedirect) {
          setTimeout(() => {
            window.location.href = decodeURIComponent(authRedirect);
          }, 1500);
        }
      }
    }
  }, [profile, needsOnboarding]);

  if (session.loading || isLoading) return <LoadingScreen />;

  const isPopup = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('popup') === 'true';
  const hasAuthRedirect = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth_redirect') !== null;
  const isRedirecting = isPopup || hasAuthRedirect;

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 bg-background">
      <div className="w-full max-w-sm flex flex-col gap-5">
        {isRedirecting && profile && !needsOnboarding && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,255,136,0.15)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="font-cinzel text-xl uppercase tracking-widest text-primary mb-2">Access Granted</h2>
            <p className="font-grotesk text-[11px] uppercase tracking-[0.2em] text-text-secondary/60">
              {hasAuthRedirect ? "Redirecting to Application..." : "Synchronizing with Services..."}
            </p>
          </div>
        )}
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
          <div className="flex flex-col gap-5">
            <div className="neon-card flex flex-col items-center gap-3 py-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-3xl font-bold text-surface-low border-4 border-surface-high overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl('')} />
                    : <span style={{ fontFamily: 'var(--font-cinzel)' }}>{name ? name.charAt(0).toUpperCase() : '?'}</span>
                  }
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-surface-high border border-border/30 rounded-full flex items-center justify-center cursor-pointer hover:border-primary/40 transition-all group shadow-lg">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  +
                </label>
              </div>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="neon-card flex flex-col gap-4">
              <div>
                <label className="neon-label">Full Name <span className="text-error">*</span></label>
                <input
                  type="text" required maxLength={32} value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="neon-input"
                  placeholder="YOUR NAME"
                />
              </div>

              <div>
                <label className="neon-label">Username <span className="text-error">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/60 font-grotesk font-bold text-sm">@</span>
                  <input
                    type="text" required maxLength={16} value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    className="neon-input pl-9"
                    style={{ textTransform: 'lowercase' }}
                    placeholder="username"
                  />
                </div>
              </div>

              {error && (
                <div className="border border-error/30 bg-error/5 px-4 py-3 rounded-sm font-inter text-[12px] text-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="neon-btn-primary w-full py-4 rounded-sm text-[12px] mt-2"
              >
                {isSubmitting ? 'Processing...' : 'Complete Setup'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="neon-card flex flex-col items-center gap-4 py-8 relative overflow-visible">
              <p className="absolute top-4 left-4 font-grotesk text-[9px] uppercase tracking-[0.2em] text-text-secondary/25">
                Profile
              </p>
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-3xl font-bold text-surface-low border-4 border-surface-high overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.15)]">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    : <span style={{ fontFamily: 'var(--font-cinzel)' }}>{profile?.name?.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-surface-high border border-border/30 rounded-full flex items-center justify-center cursor-pointer hover:border-primary/40 transition-all group shadow-lg">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  +
                </label>
              </div>
              <div className="flex flex-col items-center gap-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      maxLength={32}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="neon-input py-1 px-2 text-sm w-40 text-center"
                      placeholder="NAME"
                    />
                    <button
                      onClick={handleUpdateName}
                      className="px-2.5 py-1.5 border border-primary/40 hover:border-primary bg-primary/10 text-primary text-[10px] font-grotesk font-bold uppercase tracking-wider transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="px-2.5 py-1.5 border border-error/40 hover:border-error bg-error/10 text-error text-[10px] font-grotesk font-bold uppercase tracking-wider transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold uppercase tracking-widest text-[#E6F0EB]" style={{ fontFamily: 'var(--font-cinzel)' }}>
                      {profile?.name}
                    </h2>
                    <button
                      onClick={() => {
                        setNewName(profile?.name || '');
                        setIsEditingName(true);
                      }}
                      className="text-[9px] text-secondary/60 hover:text-secondary font-grotesk font-bold uppercase tracking-widest border border-secondary/20 hover:border-secondary/50 px-2 py-0.5"
                    >
                      Edit
                    </button>
                  </div>
                )}
                <p className="font-grotesk text-[13px] font-medium tracking-wider text-secondary">
                  @{profile?.username}
                </p>
              </div>
            </div>

            <div className="neon-card flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-secondary/60 rounded-full" />
                <h3 className="font-cinzel text-[11px] uppercase tracking-widest text-text-secondary/70">
                  Sign-In Method
                </h3>
              </div>
              <div className="flex items-center justify-between bg-surface-container border border-border/10 px-4 py-3 rounded-sm">
                <div>
                  <p className="font-grotesk text-[9px] uppercase tracking-widest text-text-secondary/40 mb-0.5">Email</p>
                  <p className="font-inter text-[13px] text-text-primary">{profile?.email}</p>
                </div>
                <span className="font-grotesk text-[8px] uppercase tracking-widest text-secondary border border-secondary/20 bg-secondary/5 px-2 py-0.5">
                  Active
                </span>
              </div>
            </div>
          </div>
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
