import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

type ReportRow = {
  id: string;
  created_at: string;
  reporter_id: string;
  incident_date: string | null;
  incident_time: string | null;
  patient_id: string | null;
  device_id: string | null;
  concerned_department: string | null;
};

type Profile = { id: string; full_name: string | null; email: string | null };

export default function AdminDashboard() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof ReportRow>('created_at');
  const [asc, setAsc] = useState(false);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [emailsById, setEmailsById] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('reports')
        .select('id, created_at, reporter_id, incident_date, incident_time, patient_id, device_id, concerned_department')
        .order('created_at', { ascending: false });
      if (error) {
        // eslint-disable-next-line no-console
        console.error('AdminDashboard fetch error', error);
        setError(error.message);
      }
      const reports = data ?? [];
      setRows(reports);

      // Fetch reporter profiles (email/name). This expects a public.profiles table mirroring auth users.
      try {
        const reporterIds = Array.from(new Set(reports.map(r => r.reporter_id).filter(Boolean)));
        if (reporterIds.length > 0) {
          const { data: profs, error: pErr } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', reporterIds);
          if (pErr) {
            // eslint-disable-next-line no-console
            console.warn('Profiles fetch failed; falling back to reporter_id', pErr.message);
          } else if (profs) {
            const map: Record<string, Profile> = {};
            for (const p of profs as any[]) {
              map[p.id] = { id: p.id, full_name: p.full_name ?? null, email: p.email ?? null };
            }
            setProfilesById(map);
          }
          // Try to fetch emails from auth via RPC (requires server SQL function from README)
          try {
            const { data: rpcData, error: rpcErr } = await supabase
              .rpc('get_user_emails', { ids: reporterIds });
            if (rpcErr) {
              // eslint-disable-next-line no-console
              console.warn('get_user_emails RPC failed; continuing without auth emails', rpcErr.message);
            } else if (Array.isArray(rpcData)) {
              const em: Record<string, string> = {};
              for (const row of rpcData as any[]) {
                if (row && row.id) em[row.id] = row.email ?? '';
              }
              setEmailsById(em);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('RPC threw; continuing without auth emails', e);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Profiles fetch threw; continuing with IDs', e);
      }
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av = (a[sortBy] ?? '') as string;
      let bv = (b[sortBy] ?? '') as string;
      if (sortBy === 'reporter_id') {
        const aEmail = emailsById[a.reporter_id];
        const bEmail = emailsById[b.reporter_id];
        const ar = profilesById[a.reporter_id];
        const br = profilesById[b.reporter_id];
        av = (aEmail || ar?.full_name || ar?.email || a.reporter_id || '').toString();
        bv = (bEmail || br?.full_name || br?.email || b.reporter_id || '').toString();
      }
      return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sortBy, asc, profilesById, emailsById]);

  function header(label: string, key?: keyof ReportRow) {
    return (
      <th
        style={{ cursor: key ? 'pointer' : 'default' }}
        onClick={() => {
          if (!key) return;
          if (sortBy === key) setAsc(!asc); else { setSortBy(key); setAsc(true); }
        }}
      >
        {label}{key && sortBy === key ? (asc ? ' ▲' : ' ▼') : ''}
      </th>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
        <button onClick={async () => { await supabase.auth.signOut(); location.href = '/login'; }}>Sign Out</button>
      </div>
      {loading && <div>Loading reports…</div>}
      {error && (
        <div style={{ color: 'crimson', marginBottom: 12 }}>
          Failed to load reports: {error}
          <div style={{ fontSize: 12, marginTop: 4 }}>If this mentions RLS or permission denied, ensure the admin role is set and the RLS policy allows admins.</div>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div>No reports found.</div>
      )}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              {header('Actions')}
              {header('Reporter', 'reporter_id')}
              {header('Incident Date', 'incident_date')}
              {header('Incident Time', 'incident_time')}
              {header('Patient ID', 'patient_id')}
              {header('Device ID', 'device_id')}
              {header('Concerned Department', 'concerned_department')}
              {header('Created At', 'created_at')}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                <td>
                  <Link to={`/admin/reports/${r.id}`} style={{ textDecoration: 'underline' }}>View Report</Link>
                </td>
                <td>
                  {emailsById[r.reporter_id] || profilesById[r.reporter_id]?.full_name || profilesById[r.reporter_id]?.email || r.reporter_id}
                </td>
                <td>{r.incident_date ?? ''}</td>
                <td>{r.incident_time ?? ''}</td>
                <td>{r.patient_id ?? ''}</td>
                <td>{r.device_id ?? ''}</td>
                <td>{r.concerned_department ?? ''}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


