'use client';

import './citizen.css';

interface SignInMethodCardProps {
  email?: string | null;
}

// The sign-in method is the one thing from outside Civitas. The land ends at a map border in the emblem's colours
// across the whole window (data-frontier), and the email lies beyond it on bare ground: no glass, nothing lit.
export default function SignInMethodCard({ email }: SignInMethodCardProps) {
  return (
    <>
      <div className="vt-frontier" data-frontier aria-hidden="true">
        <span className="vt-frontier-line" />
      </div>
      <section className="vt-outside" aria-label="Sign-in method, outside Civitas">
        <h2 className="vt-outside-title">Sign-in method</h2>
        <div className="vt-outside-value">
          <span className="vt-label">Email</span>
          <span className="vt-outside-email">{email || '—'}</span>
        </div>
      </section>
    </>
  );
}
