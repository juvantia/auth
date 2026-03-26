'use client';

import { useEffect, useState } from 'react';
import { SessionAuth, useSessionContext } from 'supertokens-auth-react/recipe/session';
import Session from 'supertokens-auth-react/recipe/session';
import { signOut } from 'supertokens-auth-react/recipe/passwordless';
import { getSmartAccountClient } from '@/lib/alchemy';

interface UserProfile {
    _id: string;
    supertokens_id: string;
    name: string;
    username: string;
    email?: string;
    avatar_url?: string;
    smart_wallet_address?: string;
}

function Dashboard() {
    const session = useSessionContext();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [jwt, setJwt] = useState<string>('');
    const [isCreatingWallet, setIsCreatingWallet] = useState(false);
    const [walletStatus, setWalletStatus] = useState(''); // Tracking status for "hidden" creation

    // Form states
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchProfile() {
            if (!session.loading && session.doesSessionExist) {
                try {
                    // Всегда получаем токен при входе, он пригодится для создания кошелька
                    const token = await Session.getAccessToken();
                    if (token) setJwt(token);

                    const res = await fetch('/api/user/profile', {
                        credentials: 'include'
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.needsOnboarding) {
                            setNeedsOnboarding(true);
                            // Предзаполнение полей, если запись в базе уже частично была
                            if (data.user) {
                                setName(data.user.name || '');
                                setUsername(data.user.username || '');
                                setAvatarUrl(data.user.avatar_url || '');
                            }
                        } else {
                            setProfile(data);
                        }
                    } else {
                        console.error("Failed to fetch profile");
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

    const handleOnboardingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setWalletStatus('Initializing secure key storage...');

        try {
            if (!jwt) {
                throw new Error("Authentication session missing. Please refresh the page.");
            }

            // 1. Создаем кошелек (вызовет системное окно Passkey)
            setWalletStatus('Create your Passkey in the browser popup...');
            const client = await getSmartAccountClient({
                createNew: true,
                username: username || "Juvantia_User"
            });

            if (!client) {
                throw new Error("Could not initialize your wallet. Please check if your browser supports Passkeys.");
            }

            const address = await client.getAddress();
            setWalletStatus('Saving your secure profile...');

            // 2. Сохраняем всё одним махом на бэкенд
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    name, 
                    username, 
                    avatar_url: avatarUrl || undefined,
                    smart_wallet_address: address 
                })
            });

            if (res.ok) {
                const newProfile = await res.json();
                setProfile(newProfile);
                setNeedsOnboarding(false);
            } else {
                const data = await res.json();
                throw new Error(data.message || 'Error occurred during onboarding');
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setIsSubmitting(false);
            setWalletStatus('');
        }
    };

    const handleCreateWallet = async () => {
        // Резервный метод на случай, если кошелек не создался при онбординге
        if (!jwt) {
            alert("No JWT token available. Please try signing out and signing back in.");
            return;
        }
        setIsCreatingWallet(true);
        try {
            const client = await getSmartAccountClient({
                createNew: true,
                username: profile?.username || "Juvantia_User"
            });
            if (client) {
                const address = await client.getAddress();
                
                const res = await fetch('/api/user/wallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ smart_wallet_address: address })
                });

                if (res.ok) {
                    setProfile(prev => prev ? { ...prev, smart_wallet_address: address } : null);
                    alert("✅ Wallet successfully created!");
                }
            }
        } catch (err: any) {
            console.error(err);
            alert("Wallet creation failed: " + err.message);
        } finally {
            setIsCreatingWallet(false);
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
                setAvatarUrl(dataUrl);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    if (session.loading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-zinc-500">Loading your profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {needsOnboarding ? (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="max-w-md w-full">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00FF88] to-[#00D4FF] bg-clip-text text-transparent mb-2" style={{ fontFamily: 'var(--font-cinzel)' }}>
                                Juvantia Auth
                            </h1>
                            <p className="text-zinc-400">Complete your profile to continue</p>
                        </div>

                        <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-[#00FF88]/5">
                            <div className="flex flex-col items-center justify-center mb-6">
                                <div className="relative w-24 h-24 mb-3">
                                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#00FF88] to-[#00D4FF] flex items-center justify-center text-3xl font-bold text-black border-4 border-zinc-800 overflow-hidden">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl('')} />
                                        ) : (
                                            <span>{name ? name.charAt(0).toUpperCase() : '?'}</span>
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors shadow-lg group">
                                        <span className="text-sm">📷</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <p className="text-xs text-zinc-500">Click camera icon to upload</p>
                            </div>

                            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" required maxLength={32} value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88] transition-colors"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Username <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">@</span>
                                        <input
                                            type="text" required maxLength={16} value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                            className="w-full bg-black border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-[#00FF88] transition-colors"
                                            placeholder="johndoe"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                {walletStatus && (
                                    <div className="flex items-center gap-2 text-[#00FF88] text-xs font-medium animate-pulse px-1">
                                        <div className="w-2 h-2 rounded-full bg-[#00FF88]"></div>
                                        {walletStatus}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-[#00FF88] to-[#00D4FF] hover:opacity-90 text-black font-bold py-3 rounded-xl transition-all mt-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Processing...' : 'Create Profile & Wallet →'}
                                </button>
                            </button>
                            <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest mt-4">
                                Secure Non-Custodial Setup via Passkeys
                            </p>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="p-8">
                    <div className="max-w-4xl mx-auto">
                        <header className="flex justify-between items-center mb-12">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00FF88] to-[#00D4FF] bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-cinzel)' }}>
                                Juvantia Auth
                            </h1>
                            <button 
                                onClick={() => signOut()}
                                className="px-4 py-2 bg-zinc-900 shadow-lg shadow-[#00FF88]/5 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all"
                            >
                                Sign Out
                            </button>
                        </header>

                        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl backdrop-blur-sm shadow-xl shadow-[#00FF88]/5">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-tr from-[#00FF88] to-[#00D4FF] rounded-full flex items-center justify-center text-xl font-bold text-black overflow-hidden border-2 border-zinc-800">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            profile?.name?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{profile?.name}</h2>
                                        <p className="text-zinc-500">@{profile?.username}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-zinc-800">
                                    <div>
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Email Address</p>
                                        <p className="text-sm font-medium text-zinc-300 bg-black/50 p-3 rounded-lg border border-zinc-800">{profile?.email}</p>
                                    </div>
                                    
                                    {jwt && (
                                        <div>
                                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Cloud Session Token</p>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="text" readOnly value={jwt}
                                                    className="text-sm font-mono text-zinc-500 bg-black/50 p-3 rounded-lg border border-zinc-800 flex-1 outline-none truncate"
                                                />
                                                <button 
                                                    onClick={() => { navigator.clipboard.writeText(jwt); alert("Copied!"); }}
                                                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-xs"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl backdrop-blur-sm flex flex-col justify-center items-center text-center shadow-xl shadow-[#00D4FF]/5">
                                <div className="w-12 h-12 bg-[#00FF88]/10 text-[#00FF88] rounded-full flex items-center justify-center mb-4 border border-[#00FF88]/20">
                                    <span className="text-xl">🛡️</span>
                                </div>
                                <h2 className="text-xl font-semibold mb-2 text-white">Smart Account</h2>
                                <p className="text-zinc-400 text-xs mx-auto mb-6">
                                    Managed by Alchemy ERC-4337 Stack. Transaction gas is fully sponsored.
                                </p>
                                
                                {profile?.smart_wallet_address ? (
                                    <div className="w-full text-left bg-black/50 p-4 rounded-xl border border-zinc-800 break-all text-xs text-[#00FF88] font-mono shadow-inner">
                                        {profile.smart_wallet_address}
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleCreateWallet} disabled={isCreatingWallet}
                                        className="px-6 py-3 bg-[#00FF88] text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {isCreatingWallet ? 'Creating...' : 'Initialize Wallet'}
                                    </button>
                                )}
                            </div>
                        </main>
                    </div>
                </div>
            )}
            <div id="turnkey-iframe-container" style={{ display: 'none' }}></div>
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
