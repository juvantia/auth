'use client';

import { useEffect, useRef, useState } from 'react';
import { SessionAuth, useSessionContext } from 'supertokens-auth-react/recipe/session';
import Session from 'supertokens-auth-react/recipe/session';
import { signOut } from 'supertokens-auth-react/recipe/passwordless';

import VitrumRoot from '@/components/vitrum/VitrumRoot';
import type { KeyOutcome } from '@/components/vitrum/GlassKey';
import AccessScreen from '@/components/auth/AccessScreen';
import CitizenHeader from '@/components/auth/CitizenHeader';
import OnboardingForm from '@/components/auth/OnboardingForm';
import ProfileCard, { UserProfile } from '@/components/auth/ProfileCard';
import SignInMethodCard from '@/components/auth/SignInMethodCard';
import PhaleraCard from '@/components/auth/PhaleraCard';
import StatusDescriptionCard from '@/components/auth/StatusDescriptionCard';
import type { PhaleraSlot } from '@/contracts/phalera';

function Dashboard() {
  const session = useSessionContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jwt, setJwt] = useState<string>('');
  const nativeHandoffStarted = useRef(false);

  // Onboarding state
  const [name, setName] = useState('');
  const [statusDescription, setStatusDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invalidField, setInvalidField] = useState<'name' | 'status' | null>(null);
  const completedProfile = useRef<UserProfile | null>(null);

  // One plate is edited at a time.
  const [editing, setEditing] = useState<'name' | 'status' | null>(null);
  const [nativeHandoffFailed, setNativeHandoffFailed] = useState(false);

  // Phalera state
  const [phaleraSlots, setPhaleraSlots] = useState<Array<PhaleraSlot | null>>([]);
  const [isPhaleraLoading, setIsPhaleraLoading] = useState(false);

  const fetchPhaleraSlots = async () => {
    try {
      setIsPhaleraLoading(true);
      const res = await fetch('/api/user/phalera/slots', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.slots)) {
          setPhaleraSlots(data.slots);
        }
      }
    } catch (err) {
      console.error('Failed to fetch phalera slots', err);
    } finally {
      setIsPhaleraLoading(false);
    }
  };

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
                setStatusDescription(data.user.status_description || '');
              }
            } else {
              setProfile(data);
              void fetchPhaleraSlots();
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

  // COMPLETE SETUP: checked at once, then the key waits for the answer; the profile opens after its green flash.
  const handleOnboardingSubmit = (): KeyOutcome | Promise<KeyOutcome> => {
    if (isSubmitting) return 'invalid';
    if (!name.trim()) { setError('Please enter your callsign.'); setInvalidField('name'); return 'invalid'; }
    if (!statusDescription.trim()) { setError('Please enter your status description.'); setInvalidField('status'); return 'invalid'; }

    setIsSubmitting(true);
    setError('');
    setInvalidField(null);

    return (async (): Promise<KeyOutcome> => {
      try {
        if (!jwt) throw new Error('Authentication session missing. Please refresh the page.');

        const res = await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: name.trim(),
            status_description: statusDescription.trim(),
          }),
        });

        if (res.ok) {
          completedProfile.current = await res.json();
          return 'done';
        }
        const data = await res.json();
        throw new Error(data.message || 'Error occurred during account creation');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Network error');
        return 'failed';
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const finishOnboarding = () => {
    const newProfile = completedProfile.current;
    if (!newProfile) return;
    completedProfile.current = null;
    setProfile(newProfile);
    setNeedsOnboarding(false);
  };

  const handleUpdateName = async (newName: string): Promise<KeyOutcome> => {
    if (!profile || !newName.trim()) return 'invalid';
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name: newName.trim(),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        return 'done';
      }
      return 'failed';
    } catch (err) {
      console.error("Name update failed", err);
      return 'failed';
    }
  };

  const handleUpdateDesc = async (newDesc: string): Promise<KeyOutcome> => {
    if (!profile) return 'invalid';
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name: profile.name, 
          status_description: newDesc
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        return 'done';
      }
      return 'failed';
    } catch (err) {
      console.error("Description update failed", err);
      return 'failed';
    }
  };

  const handleSelectPhalera = async (phaleraId: string | null) => {
    if (!profile) return;
    const res = await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: profile.name,
        active_phalera_id: phaleraId,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfile(updated);
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to update active phalera');
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
            setNativeHandoffFailed(true);
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
              try {
                const redirectUrl = new URL(decodedUrl);
                if (jwt) redirectUrl.searchParams.set('token', jwt);
                window.location.href = redirectUrl.toString();
              } catch {
                const separator = decodedUrl.includes('?') ? '&' : '?';
                window.location.href = jwt ? `${decodedUrl}${separator}token=${jwt}` : decodedUrl;
              }
            }, 1500);
          }
        }
      }
    }
  }, [profile, needsOnboarding, jwt]);

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isPopup = urlParams?.get('popup') === 'true';
  const hasAuthRedirect = Boolean(urlParams?.has('auth_redirect'));
  const isNativeHandoff =
    Boolean(urlParams?.get('native_redirect_uri') && urlParams.get('state') && urlParams.get('code_challenge')) && !nativeHandoffFailed;
  const isRedirecting = isPopup || hasAuthRedirect || isNativeHandoff;
  const isAuthenticating = session.loading || isLoading;
  // One answer for every client that asked: ACCESS GRANTED. A citizen who came on their own gets the profile.
  const isGranted = !isAuthenticating && isRedirecting && Boolean(profile) && !needsOnboarding;

  if (session.loading || isLoading || isGranted) {
    return (
      <VitrumRoot moment screen="access">
        <AccessScreen granted={isGranted} />
      </VitrumRoot>
    );
  }

  const civitasId = profile?.supertokens_id || (session.doesSessionExist ? session.userId : '');
  const activePhalera = phaleraSlots.find((s) => s && s.id === profile?.active_phalera_id) ?? null;
  const signOutCitizen = () => {
    void signOut();
  };

  if (needsOnboarding) {
    return (
      <VitrumRoot moment={false} screen="onboarding">
        <OnboardingForm
          name={name}
          setName={setName}
          statusDescription={statusDescription}
          setStatusDescription={setStatusDescription}
          civitasId={civitasId}
          onSubmit={handleOnboardingSubmit}
          onDone={finishOnboarding}
          onSignOut={signOutCitizen}
          error={error}
          invalidField={invalidField}
        />
      </VitrumRoot>
    );
  }

  return (
    <VitrumRoot moment={false} screen="profile">
      <CitizenHeader onSignOut={signOutCitizen} />
      {profile && (
        <>
          <ProfileCard
            profile={profile}
            civitasId={civitasId}
            activePhalera={activePhalera}
            editing={editing === 'name'}
            locked={editing === 'status'}
            onEdit={() => setEditing('name')}
            onClose={() => setEditing(null)}
            onUpdateName={handleUpdateName}
          />
          <PhaleraCard
            slots={phaleraSlots}
            activePhaleraId={profile.active_phalera_id}
            onSelectPhalera={handleSelectPhalera}
            isLoading={isPhaleraLoading}
          />
          <StatusDescriptionCard
            profile={profile}
            editing={editing === 'status'}
            locked={editing === 'name'}
            onEdit={() => setEditing('status')}
            onClose={() => setEditing(null)}
            onUpdateDesc={handleUpdateDesc}
          />
          {/* The sign-in method comes from outside Civitas, so it lies last, beyond the border. */}
          <SignInMethodCard email={profile.email} />
        </>
      )}
    </VitrumRoot>
  );
}

export default function Home() {
  return (
    <SessionAuth>
      <Dashboard />
    </SessionAuth>
  );
}
