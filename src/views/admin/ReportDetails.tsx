import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

type Report = {
  id: string;
  created_at: string;
  reporter_id: string;
  incident_date: string | null;
  incident_time: string | null;
  patient_id: string | null;
  device_id: string | null;
  device_report_details: string | null;
  patient_symptoms: string | null;
  advice_given: string | null;
  concerned_department: string | null;
} | null;

export default function ReportDetails() {
  const { id } = useParams();
  const [report, setReport] = useState<Report>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();
      setReport((data as any) ?? null);
    })();
  }, [id]);

  if (!report) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 800, margin: '0 auto' }}>
      <Link to="/admin">← Back</Link>
      <h2 style={{ marginBottom: 0 }}>Report Details</h2>
      <div className="card" style={{ display: 'grid', gap: 8 }}>
        <div><strong>Report ID:</strong> {report.id}</div>
        <div><strong>Reporter ID:</strong> {report.reporter_id}</div>
        <div><strong>Created At:</strong> {new Date(report.created_at).toLocaleString()}</div>
        <div><strong>Incident Date:</strong> {report.incident_date ?? ''}</div>
        <div><strong>Incident Time:</strong> {report.incident_time ?? ''}</div>
        <div><strong>Patient ID:</strong> {report.patient_id ?? ''}</div>
        <div><strong>Device ID:</strong> {report.device_id ?? ''}</div>
        <div><strong>Concerned Department:</strong> {report.concerned_department ?? ''}</div>
      </div>
      <div className="card">
        <strong>Incident Device Report</strong>
        <p>{report.device_report_details ?? ''}</p>
      </div>
      <div className="card">
        <strong>Patient Symptoms Noted</strong>
        <p>{report.patient_symptoms ?? ''}</p>
      </div>
      <div className="card">
        <strong>Advice Given</strong>
        <p>{report.advice_given ?? ''}</p>
      </div>
    </div>
  );
}


