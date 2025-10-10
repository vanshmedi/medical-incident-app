import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, position: 'relative' }}>
      <div className="header-bar">
        <div className="logo-badge">MU</div>
        <div style={{ fontWeight: 700 }}>Manipal University</div>
      </div>
      <div style={{ display: 'grid', gap: 24, maxWidth: 1000, width: '100%', gridTemplateColumns: '1.2fr .8fr', alignItems: 'start' }}>
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Medical Incident Reporting</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Report and monitor device-related incidents efficiently.</p>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <input className="input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <div style={{ color: 'crimson' }}>{error}</div>}
            <button disabled={loading} type="submit">{loading ? 'Signing in…' : 'Sign In'}</button>
          </form>
        </div>
        <div className="card" style={{ borderLeft: '6px solid var(--accent)', display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0 }}>Demo Logins</h3>
          <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{`🧑‍💼 Admin Login\nEmail: admin@medical.com\nPassword: password123\n\n👩‍⚕️ Reporter Login\nEmail: reporter@medical.com\nPassword: password123`}</div>
        </div>
      </div>
    </div>
  );
}


