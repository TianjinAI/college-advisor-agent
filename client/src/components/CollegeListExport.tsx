import type { TargetSchool } from '../types';

interface CollegeListExportProps {
  schools: TargetSchool[];
  onClose: () => void;
}

const statusClass = (status: TargetSchool['status']): string => {
  if (status === 'Reach') return 'status-reach';
  if (status === 'Match') return 'status-match';
  if (status === 'Safety') return 'status-safety';
  return 'status-none';
};

export default function CollegeListExport({ schools, onClose }: CollegeListExportProps) {
  return (
    <div className="college-export-overlay" role="dialog" aria-modal="true" aria-label="College list export">
      <div className="college-export-modal">
        <div className="college-export-toolbar no-print">
          <h3 style={{ margin: 0 }}>College List Export</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="secondary-btn" onClick={() => window.print()}>Print</button>
            <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="college-export-sheet print-area">
          <h1>College Application Plan</h1>
          <p className="college-export-subtitle">Prepared list with admissions strategy, essay narrative, and recommendation planning.</p>

          <div className="college-export-footnotes">
            <p><strong>Reach / Match / Safety:</strong> Reach means harder odds, Match means realistic odds, Safety means stronger odds.</p>
            <p><strong>ED / EA / REA / RD:</strong> Early Decision (binding), Early Action (non-binding), Restrictive Early Action (limits other early apps), Regular Decision (standard deadline).</p>
          </div>

          <div className="college-export-list">
            {schools.map((school) => (
              <article key={school.id} className="college-export-card">
                <div className="college-export-head">
                  <h2>{school.name}</h2>
                  <span className={`college-status-badge ${statusClass(school.status)}`}>{school.status || 'Unassigned'}</span>
                </div>
                <p><strong>Strategy:</strong> {school.strategy || 'Not set'}</p>
                <p><strong>Intended major:</strong> {school.intendedMajor || 'Not set'}</p>
                <p><strong>Application narrative:</strong> {school.appNarrative || 'Not set'}</p>
                <p><strong>Recommendation letter suggesters:</strong> {(school.recommendedSuggesters ?? []).join(', ') || 'Not set'}</p>
                <p><strong>Essay requirements:</strong> Review Essay tab prompts and map to this school’s supplement set.</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
