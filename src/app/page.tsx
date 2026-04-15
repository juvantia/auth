'use client';

import { useEffect, useState } from 'react';
import { SessionAuth, useSessionContext } from 'supertokens-auth-react/recipe/session';
import Session from 'supertokens-auth-react/recipe/session';
import { signOut } from 'supertokens-auth-react/recipe/passwordless';
import { getKernelClient } from '@/lib/zerodev';

interface UserProfile {
  _id: string;
  supertokens_id: string;
  name: string;
  username: string;
  email?: string;
  avatar_url?: string;
  smart_wallet_address?: string;
  passkeys?: string[];
}

// ─── Utility: abbreviate passkey public key for display ───────────────────────
function abbreviateKey(key: string, len = 8): string {
  if (!key || key.length <= len * 2) return key;
  return `${key.slice(0, len)}···${key.slice(-len)}`;
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
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [walletStatus, setWalletStatus] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Onboarding form states
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
              if (data.user) {
                setName(data.user.name || '');
                setUsername(data.user.username || '');
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

    setIsSubmitting(true);
    setError('');
    setWalletStatus('Initializing secure account...');

    try {
      if (!jwt) throw new Error('Authentication session missing. Please refresh the page.');

      setWalletStatus('Creating your security key...');
      const kernelResult = await getKernelClient({ username, createNew: true });
      if (!kernelResult) throw new Error("Could not initialize your account. Please check if your browser supports Passkeys.");

      const { client: kernelClient, pubKey } = kernelResult;
      const address = kernelClient.account.address;

      setWalletStatus('Finalizing your account...');
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, username, avatar_url: avatarUrl || undefined, smart_wallet_address: address, passkey: pubKey }),
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
      if (err.name === 'NotAllowedError' || err.message?.includes('NotAllowedError') || err.message?.includes('user activation')) {
        setError('Account setup requires a Passkey. Please try again.');
      } else {
        setError(err.message || 'Network error');
      }
    } finally {
      setIsSubmitting(false);
      setWalletStatus('');
    }
  };

  // ─── Add New Device ─────────────────────────────────────────────────────────
  const handleAddNewDevice = async () => {
    if (!profile?.username || isAddingDevice) return;
    setIsAddingDevice(true);
    setError('');

    try {
      const kernelResult = await getKernelClient({ username: profile.username, createNew: true });
      if (!kernelResult) throw new Error("Could not register new device. Check Passkey support in your browser.");

      const { pubKey } = kernelResult;
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: profile.name, username: profile.username, passkey: pubKey }),
      });

      if (res.ok) {
        const updatedProfile = await res.json();
        setProfile(updatedProfile);
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Error while saving the new device');
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.message?.includes('NotAllowedError')) return;
      setError('Device registration failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsAddingDevice(false);
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
          // Update existing profile
          handleUpdateAvatar(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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

  // ─── Copy passkey ───────────────────────────────────────────────────────────
  const handleCopyKey = (key: string, idx: number) => {
    navigator.clipboard.writeText(key);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  useEffect(() => {
    if (profile && !needsOnboarding) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('popup') === 'true') {
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    }
  }, [profile, needsOnboarding]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (session.loading || isLoading) return <LoadingScreen />;

  const isPopup = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('popup') === 'true';

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 bg-background">
      {/* ── Mobile Shell ── */}
      <div className="w-full max-w-sm flex flex-col gap-5">

        {isPopup && profile && !needsOnboarding && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,255,136,0.15)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="font-cinzel text-xl uppercase tracking-widest text-primary mb-2">Access Granted</h2>
            <p className="font-grotesk text-[11px] uppercase tracking-[0.2em] text-text-secondary/60">
              Synchronizing with Forum...
            </p>
            <p className="font-grotesk text-[9px] uppercase tracking-widest text-text-secondary/30 mt-12">
              This window will close automatically
            </p>
          </div>
        )}
        {/* ── Header ─────────────────────────────────────────────────────────── */}
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
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </header>

        {needsOnboarding ? (
          /* ══════════════════════════════════════════════════════════════════════
             ONBOARDING FLOW
          ══════════════════════════════════════════════════════════════════════ */
          <div className="flex flex-col gap-5">
            {/* Avatar */}
            <div className="neon-card flex flex-col items-center gap-3 py-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-3xl font-bold text-surface-low border-4 border-surface-high overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl('')} />
                    : <span style={{ fontFamily: 'var(--font-cinzel)' }}>{name ? name.charAt(0).toUpperCase() : '?'}</span>
                  }
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-surface-high border border-border/30 rounded-full flex items-center justify-center cursor-pointer hover:border-primary/40 transition-all group shadow-lg">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary group-hover:text-primary transition-colors">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
              <p className="font-grotesk text-[9px] uppercase tracking-widest text-text-secondary/40">
                Tap to upload avatar
              </p>
            </div>

            {/* Form */}
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
                    placeholder="USERNAME"
                  />
                </div>
              </div>

              {/* Passkey info block */}
              <div className="mt-2 border border-primary/15 bg-primary/5 rounded-sm p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    {/* Fingerprint icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
                      <path d="M5 19.5C5.5 18 6 15 6 12c0-1.7.7-3.5 2-4.7" />
                      <path d="M17.8 21.8c-.5-2.6-1-5-2.8-7" />
                      <path d="M10.9 4a10 10 0 0 1 8.1 5" />
                      <path d="M12 12a3 3 0 0 0-3 3c0 2 0 3.5-.5 5" />
                      <path d="M14 20c.5-1.5.5-3.5.5-5 0-.9-.1-1.8-.4-2.5" />
                      <path d="M12 9a3 3 0 0 1 3 3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-cinzel text-[11px] uppercase tracking-widest text-text-primary">Passkey Security</h3>
                    <p className="font-grotesk text-[9px] uppercase tracking-wider text-primary/60 mt-0.5">Biometric · Hardware Key · Device Auth</p>
                  </div>
                </div>
                <p className="font-inter text-[11px] text-text-secondary/60 leading-relaxed">
                  Your account is protected by a Passkey — your device's biometric authentication. No passwords, no seed phrases.
                </p>
                <div className="font-grotesk text-[9px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 py-1.5 px-3 text-center">
                  All fees sponsored by Juvantia
                </div>
              </div>

              {error && (
                <div className="border border-error/30 bg-error/5 px-4 py-3 rounded-sm font-inter text-[12px] text-error">
                  {error}
                </div>
              )}

              {walletStatus && (
                <div className="flex items-center gap-2 text-primary font-grotesk text-[10px] uppercase tracking-widest animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {walletStatus}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="neon-btn-primary w-full py-4 rounded-sm text-[12px] mt-2"
              >
                {isSubmitting ? walletStatus || 'Processing...' : 'Complete Setup'}
              </button>

              <p className="font-grotesk text-[9px] uppercase tracking-widest text-text-secondary/30 text-center">
                Secure Account Initialization
              </p>
            </form>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════
             PROFILE DASHBOARD
          ══════════════════════════════════════════════════════════════════════ */
          <div className="flex flex-col gap-5">

            {/* ── Profile Card ─────────────────────────────────────────────── */}
            <div className="neon-card flex flex-col items-center gap-4 py-8 relative overflow-visible">
              {/* Top ghost label */}
              <p className="absolute top-4 left-4 font-grotesk text-[9px] uppercase tracking-[0.2em] text-text-secondary/25">
                Profile
              </p>

              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-3xl font-bold text-surface-low border-4 border-surface-high overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.15)]">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    : <span style={{ fontFamily: 'var(--font-cinzel)' }}>{profile?.name?.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-surface-high border border-border/30 rounded-full flex items-center justify-center cursor-pointer hover:border-primary/40 transition-all group shadow-lg">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary group-hover:text-primary transition-colors">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              {/* Name */}
              <div className="flex flex-col items-center gap-1">
                <h2
                  className="text-xl font-semibold uppercase tracking-widest text-[#E6F0EB]"
                  style={{ fontFamily: 'var(--font-cinzel)' }}
                >
                  {profile?.name}
                </h2>
                <p className="font-grotesk text-[13px] font-medium tracking-wider text-secondary">
                  @{profile?.username}
                </p>
              </div>
            </div>

            {/* ── Sign-In Method ────────────────────────────────────────────── */}
            <div className="neon-card flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-secondary/60 rounded-full" />
                <h3 className="font-cinzel text-[11px] uppercase tracking-widest text-text-secondary/70">
                  Sign-In Method
                </h3>
              </div>

              <div className="flex items-center justify-between bg-surface-container border border-border/10 px-4 py-3 rounded-sm">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-sm bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-grotesk text-[9px] uppercase tracking-widest text-text-secondary/40 mb-0.5">Email</p>
                    <p className="font-inter text-[13px] text-text-primary">{profile?.email}</p>
                  </div>
                </div>
                <span className="font-grotesk text-[8px] uppercase tracking-widest text-secondary border border-secondary/20 bg-secondary/5 px-2 py-0.5">
                  Active
                </span>
              </div>
            </div>

            {/* ── Secure Account (Wallet) ────────────────────────────────────── */}
            <div className="neon-card flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-primary/60 rounded-full" />
                <h3 className="font-cinzel text-[11px] uppercase tracking-widest text-text-secondary/70">
                  Secure Account
                </h3>
              </div>

              {/* Status row */}
              <div className="flex items-center justify-between bg-surface-container border border-border/10 px-4 py-3 rounded-sm">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    {/* Shield icon */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-grotesk text-[9px] uppercase tracking-widest text-text-secondary/40 mb-0.5">Built-in Wallet</p>
                    <p className="font-inter text-[13px] text-text-primary">Protected by your Passkeys</p>
                  </div>
                </div>
                <span className="font-grotesk text-[8px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2 py-0.5">
                  {profile?.smart_wallet_address ? 'Ready' : 'Pending'}
                </span>
              </div>

              {/* Info block */}
              <div className="flex flex-col gap-1 font-inter text-[12px] text-text-secondary/50 leading-relaxed px-1">
                <p>
                  To view your balance or manage stablecoins, visit{' '}
                  <a href="https://city.juvantia.org" className="text-secondary font-grotesk font-bold tracking-wider hover:underline">City</a>.
                </p>
              </div>
            </div>

            {/* ── Passkeys / Linked Devices ─────────────────────────────────── */}
            <div className="neon-card flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-primary/60 rounded-full" />
                <h3 className="font-cinzel text-[11px] uppercase tracking-widest text-text-secondary/70">
                  Linked Devices
                </h3>
              </div>

              <p className="font-inter text-[12px] text-text-secondary/50 leading-relaxed px-1">
                Your account is accessible from the devices below. Each device holds a unique security key — your Passkey. Adding a device means it can sign in and authorize transactions.
              </p>

              {/* Device list */}
              <div className="flex flex-col gap-2">
                {profile?.passkeys && profile.passkeys.length > 0 ? (
                  profile.passkeys.map((pk, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-surface-container border border-border/10 px-4 py-3 rounded-sm group hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          {/* Device / phone icon */}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                            <line x1="12" y1="18" x2="12.01" y2="18" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-grotesk text-[10px] uppercase tracking-wider text-text-primary font-medium">
                            Device #{idx + 1}
                          </p>
                          <p className="font-mono text-[9px] text-text-secondary/40 mt-0.5">
                            {abbreviateKey(pk)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyKey(pk, idx)}
                          className="text-text-secondary/30 hover:text-primary transition-colors duration-200"
                          title="Copy public key"
                        >
                          {copiedIdx === idx ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                        <span className="font-grotesk text-[8px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2 py-0.5">
                          Active
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="font-inter text-[12px] text-text-secondary/30 italic px-1">
                    No devices recorded.
                  </p>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="border border-error/30 bg-error/5 px-4 py-3 rounded-sm font-inter text-[12px] text-error">
                  {error}
                </div>
              )}

              {/* Add Device Button */}
              <button
                onClick={handleAddNewDevice}
                disabled={isAddingDevice}
                className="w-full mt-1 py-3.5 border border-dashed border-border/25 rounded-sm font-grotesk text-[10px] uppercase tracking-widest text-text-secondary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isAddingDevice ? (
                  <>
                    <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                    Registering Device...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Link New Device
                  </>
                )}
              </button>
            </div>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-center py-4">
              <p className="font-grotesk text-[9px] uppercase tracking-[0.2em] text-text-secondary/20">
                Juvantia Auth · Security Center
              </p>
            </div>

          </div>
        )}
      </div>

      {/* Hidden SuperTokens iframe container */}
      <div id="turnkey-iframe-container" style={{ display: 'none' }} />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <SessionAuth>
      <Dashboard />
    </SessionAuth>
  );
}
