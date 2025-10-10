import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DropdownFilter, { type DropdownOption } from '../../components/DropdownFilter';
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
  // Global search & column filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterReporter, setFilterReporter] = useState('');
  const [filterPatientId, setFilterPatientId] = useState('');
  const [filterDeviceId, setFilterDeviceId] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState(''); // YYYY-MM-DD
  const [filterDateTo, setFilterDateTo] = useState(''); // YYYY-MM-DD
  const [datePreset, setDatePreset] = useState<string[]>([]);
  // Multi-select dropdown selections
  const [selReporter, setSelReporter] = useState<string[]>([]);
  const [selPatient, setSelPatient] = useState<string[]>([]);
  const [selDevice, setSelDevice] = useState<string[]>([]);
  const [selDept, setSelDept] = useState<string[]>([]);

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

  // Debounce global search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Date preset handling
  useEffect(() => {
    if (datePreset.length === 0) return;
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    if (datePreset[0] === '7d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setFilterDateFrom(d.toISOString().slice(0, 10));
      setFilterDateTo(todayIso);
    } else if (datePreset[0] === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      setFilterDateFrom(d.toISOString().slice(0, 10));
      setFilterDateTo(todayIso);
    } else if (datePreset[0] === 'ytd') {
      setFilterDateFrom(firstDayOfYear);
      setFilterDateTo(todayIso);
    } else if (datePreset[0] === 'all') {
      setFilterDateFrom('');
      setFilterDateTo('');
    }
  }, [datePreset]);

  // Apply filters first, then sorting
  const filtered = useMemo(() => {
    const lower = (v: unknown) => String(v ?? '').toLowerCase();
    const inRangeByDate = (iso: string) => {
      if (!filterDateFrom && !filterDateTo) return true;
      const d = iso ? iso.slice(0, 10) : '';
      if (filterDateFrom && d < filterDateFrom) return false;
      if (filterDateTo && d > filterDateTo) return false;
      return true;
    };
    const matchesGlobal = (r: ReportRow) => {
      if (!debouncedSearch) return true;
      const reporterDisplay = emailsById[r.reporter_id] || profilesById[r.reporter_id]?.full_name || profilesById[r.reporter_id]?.email || r.reporter_id;
      const haystack = [
        r.id,
        reporterDisplay,
        r.incident_date,
        r.incident_time,
        r.patient_id,
        r.device_id,
        r.concerned_department,
        r.created_at,
      ].map(lower).join(' ');
      return haystack.includes(debouncedSearch);
    };
    const matchesColumns = (r: ReportRow) => {
      const reporterDisplay = emailsById[r.reporter_id] || profilesById[r.reporter_id]?.full_name || profilesById[r.reporter_id]?.email || r.reporter_id;
      // Text filters (kept for backwards compatibility)
      if (filterReporter && !lower(reporterDisplay).includes(filterReporter.trim().toLowerCase())) return false;
      if (filterPatientId && !lower(r.patient_id).includes(filterPatientId.trim().toLowerCase())) return false;
      if (filterDeviceId && !lower(r.device_id).includes(filterDeviceId.trim().toLowerCase())) return false;
      if (filterDepartment && !lower(r.concerned_department).includes(filterDepartment.trim().toLowerCase())) return false;
      // Dropdown multi-select filters
      if (selReporter.length > 0) {
        const rv = String(reporterDisplay ?? '');
        if (!selReporter.some(v => rv === v)) return false;
      }
      if (selPatient.length > 0) {
        const pv = String(r.patient_id ?? '');
        if (!selPatient.some(v => pv === v)) return false;
      }
      if (selDevice.length > 0) {
        const dv = String(r.device_id ?? '');
        if (!selDevice.some(v => dv === v)) return false;
      }
      if (selDept.length > 0) {
        const dep = String(r.concerned_department ?? '');
        if (!selDept.some(v => dep === v)) return false;
      }
      // Date range uses incident_date when present; fallback to created_at
      const dateForFilter = r.incident_date || r.created_at;
      if (!inRangeByDate(dateForFilter)) return false;
      return true;
    };
    return rows.filter(r => matchesGlobal(r) && matchesColumns(r));
  }, [rows, debouncedSearch, filterReporter, filterPatientId, filterDeviceId, filterDepartment, filterDateFrom, filterDateTo, selReporter, selPatient, selDevice, selDept, profilesById, emailsById]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
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
  }, [filtered, sortBy, asc, profilesById, emailsById]);

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
      {/* Filters Row */}
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
          <input
            className="input"
            placeholder="Search reports (name, email, patient, device, department...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {/* Dropdown filters */}
          <DropdownFilter
            label="Reporter"
            options={useMemo<DropdownOption[]>(() => {
              const set = new Map<string, string>();
              for (const r of rows) {
                const disp = (emailsById[r.reporter_id] || profilesById[r.reporter_id]?.full_name || profilesById[r.reporter_id]?.email || r.reporter_id) ?? '';
                set.set(String(disp), String(disp));
              }
              return Array.from(set.values()).filter(Boolean).sort().map(v => ({ value: v, label: v }));
            }, [rows, profilesById, emailsById])}
            selectedValues={selReporter}
            onChange={setSelReporter}
          />
          <DropdownFilter
            label="Patient"
            options={useMemo<DropdownOption[]>(() => {
              const set = new Set<string>();
              for (const r of rows) { if (r.patient_id) set.add(String(r.patient_id)); }
              return Array.from(set.values()).sort().map(v => ({ value: v, label: v }));
            }, [rows])}
            selectedValues={selPatient}
            onChange={setSelPatient}
          />
          <DropdownFilter
            label="Device"
            options={useMemo<DropdownOption[]>(() => {
              const set = new Set<string>();
              for (const r of rows) { if (r.device_id) set.add(String(r.device_id)); }
              return Array.from(set.values()).sort().map(v => ({ value: v, label: v }));
            }, [rows])}
            selectedValues={selDevice}
            onChange={setSelDevice}
          />
          <DropdownFilter
            label="Department"
            options={useMemo<DropdownOption[]>(() => {
              const set = new Set<string>();
              for (const r of rows) { if (r.concerned_department) set.add(String(r.concerned_department)); }
              return Array.from(set.values()).sort().map(v => ({ value: v, label: v }));
            }, [rows])}
            selectedValues={selDept}
            onChange={setSelDept}
          />
          <DropdownFilter
            label="Date"
            options={useMemo<DropdownOption[]>(() => ([
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: 'ytd', label: 'This Year' },
              { value: 'all', label: 'All Time' },
            ]), [])}
            selectedValues={datePreset}
            onChange={setDatePreset}
            multi={false}
            searchable={false}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Active filter chips */}
          {debouncedSearch && <span className="chip" onClick={() => setSearch('')}>Search: {debouncedSearch} ✕</span>}
          {selReporter.map(v => <span key={`r-${v}`} className="chip" onClick={() => setSelReporter(selReporter.filter(x => x !== v))}>Reporter: {v} ✕</span>)}
          {selPatient.map(v => <span key={`p-${v}`} className="chip" onClick={() => setSelPatient(selPatient.filter(x => x !== v))}>Patient: {v} ✕</span>)}
          {selDevice.map(v => <span key={`d-${v}`} className="chip" onClick={() => setSelDevice(selDevice.filter(x => x !== v))}>Device: {v} ✕</span>)}
          {selDept.map(v => <span key={`dep-${v}`} className="chip" onClick={() => setSelDept(selDept.filter(x => x !== v))}>Dept: {v} ✕</span>)}
          {(filterDateFrom || filterDateTo) && (
            <span className="chip" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>
              Date: {filterDateFrom || '…'} → {filterDateTo || '…'} ✕
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => {
              setSearch('');
              setFilterReporter('');
              setFilterPatientId('');
              setFilterDeviceId('');
              setFilterDepartment('');
              setFilterDateFrom('');
              setFilterDateTo('');
              setSelReporter([]);
              setSelPatient([]);
              setSelDevice([]);
              setSelDept([]);
              setDatePreset([]);
            }}
            aria-label="Reset filters"
          >
            Reset Filters
          </button>
        </div>
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
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
                  No results found. Try adjusting your filters.
                </td>
              </tr>
            )}
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


