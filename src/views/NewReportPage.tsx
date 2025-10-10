import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Patient = { patient_id: string; full_name: string; date_of_birth: string; gender: string } | null;
type Device = { device_id: string; device_name: string; manufacturer: string; model: string } | null;

const departments = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'General Medicine',
  'Emergency',
  'Oncology',
  'Pediatrics',
];

export default function NewReportPage() {
  const [reporterEmail, setReporterEmail] = useState('');
  const [loadedAt] = useState(() => new Date());
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentTime, setIncidentTime] = useState('');
  const [patientId, setPatientId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [patient, setPatient] = useState<Patient>(null);
  const [device, setDevice] = useState<Device>(null);
  const [deviceReportDetails, setDeviceReportDetails] = useState('');
  const [patientSymptoms, setPatientSymptoms] = useState('');
  const [adviceGiven, setAdviceGiven] = useState('');
  const [concernedDepartment, setConcernedDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setReporterEmail(data.user?.email ?? ''));
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!patientId) { setPatient(null); return; }
      const { data } = await supabase.from('patients').select('patient_id, full_name, date_of_birth, gender').ilike('patient_id', `%${patientId}%`).limit(1).maybeSingle();
      setPatient(data ?? null);
    }, 300);
    return () => clearTimeout(id);
  }, [patientId]);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!deviceId) { setDevice(null); return; }
      const { data } = await supabase.from('devices').select('device_id, device_name, manufacturer, model').ilike('device_id', `%${deviceId}%`).limit(1).maybeSingle();
      setDevice(data ?? null);
    }, 300);
    return () => clearTimeout(id);
  }, [deviceId]);

  const reportTimestamp = useMemo(() => loadedAt.toISOString(), [loadedAt]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    if (!userId) { setError('Not authenticated'); setSubmitting(false); return; }
    const { error } = await supabase.from('reports').insert({
      reporter_id: userId,
      incident_date: incidentDate || null,
      incident_time: incidentTime || null,
      patient_id: patientId || null,
      device_id: deviceId || null,
      device_report_details: deviceReportDetails || null,
      patient_symptoms: patientSymptoms || null,
      advice_given: adviceGiven || null,
      concerned_department: concernedDepartment || null,
    });
    if (error) setError(error.message);
    else {
      setSuccess('Report submitted successfully');
      setIncidentDate('');
      setIncidentTime('');
      setPatientId('');
      setDeviceId('');
      setPatient(null);
      setDevice(null);
      setDeviceReportDetails('');
      setPatientSymptoms('');
      setAdviceGiven('');
      setConcernedDepartment('');
    }
    setSubmitting(false);
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>New Incident Report</h2>
      </div>
      <form className="card grid-2" onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label>
            Reporter
            <input className="input" value={reporterEmail} disabled />
          </label>
          <label>
            Report Date & Time
            <input className="input" value={reportTimestamp} disabled />
          </label>
          <label>
            Incident Date
            <input className="input" type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} required />
          </label>
          <label>
            Incident Time
            <input className="input" type="time" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} required />
          </label>
          <label>
            Patient ID
            <input className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="e.g., P12345" />
          </label>
          <label>
            Device ID
            <input className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g., D-ECG-08" />
          </label>
          <label>
            Incident Device Report
            <textarea className="textarea" value={deviceReportDetails} onChange={(e) => setDeviceReportDetails(e.target.value)} rows={4} />
          </label>
          <label>
            Patient Symptoms Noted
            <textarea className="textarea" value={patientSymptoms} onChange={(e) => setPatientSymptoms(e.target.value)} rows={4} />
          </label>
          <label>
            Advice Given
            <textarea className="textarea" value={adviceGiven} onChange={(e) => setAdviceGiven(e.target.value)} rows={3} />
          </label>
          <label>
            Concerned Department
            <select className="select" value={concernedDepartment} onChange={(e) => setConcernedDepartment(e.target.value)} required>
              <option value="" disabled>Select department</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Report'}</button>
            <button type="button" onClick={async () => { await supabase.auth.signOut(); location.href = '/login'; }}>Sign Out</button>
          </div>
          {success && <div style={{ color: 'green' }}>{success}</div>}
          {error && <div style={{ color: 'crimson' }}>{error}</div>}
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card info-card" style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Patient</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {patientId.length === 0 ? <em>Type a Patient ID…</em> : patient ? (
                <div className="kv">
                  <div className="label">Patient ID</div>
                  <div className="value">{patient.patient_id}</div>
                  <div className="label">Patient Name</div>
                  <div className="value">{patient.full_name}</div>
                  <div className="label">Gender</div>
                  <div className="value">{patient.gender}</div>
                </div>
              ) : <span>Patient not found</span>}
            </div>
          </div>
          <div className="card info-card" style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Device</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {deviceId.length === 0 ? <em>Type a Device ID…</em> : device ? (
                <div className="kv">
                  <div className="label">Device ID</div>
                  <div className="value">{device.device_id}</div>
                  <div className="label">Device Name</div>
                  <div className="value">{device.device_name}</div>
                  <div className="label">Manufacturer</div>
                  <div className="value">{device.manufacturer}</div>
                  <div className="label">Model</div>
                  <div className="value">{device.model}</div>
                </div>
              ) : <span>Device not found</span>}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}


