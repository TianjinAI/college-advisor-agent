import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { FinancialProfile, StudentProfile } from '../types';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming','District of Columbia',
];

const MARITAL_STATUSES: FinancialProfile['parent_marital_status'][] = [
  'married','divorced','separated','single','widowed',
];

const DEPENDENCY_OPTIONS: FinancialProfile['dependency_status'][] = [
  'dependent','independent',
];

const INCOME_TYPES: FinancialProfile['parent_income_type'][] = [
  'W-2','self-employed','mixed',
];

export const DEFAULT_FINANCIAL_PROFILE: FinancialProfile = {
  dependency_status: 'dependent',
  household_size: 4,
  num_in_college: 1,
  parent_marital_status: 'married',
  parent_agi: 0,
  parent_income_type: 'W-2',
  student_income: 0,
  parent_savings: 0,
  parent_investments: 0,
  home_equity: 0,
  business_assets: 0,
  student_assets: 0,
  balance_529: 0,
  gpa: 0,
  sat: null,
  act: null,
  class_rank: '',
  first_gen: false,
  state_of_residency: '',
  citizenship: '',
  special_circumstances: '',
};

interface FAProfilePanelProps {
  profile: FinancialProfile;
  onProfileChange: (profile: FinancialProfile) => void;
  collegeProfile?: StudentProfile;
}

export default function FAProfilePanel({ profile, onProfileChange, collegeProfile }: FAProfilePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [importToast, setImportToast] = useState<string | null>(null);

  const update = <K extends keyof FinancialProfile>(field: K, value: FinancialProfile[K]) => {
    onProfileChange({ ...profile, [field]: value });
  };

  const numInput = (
    e: ChangeEvent<HTMLInputElement>,
    field: keyof FinancialProfile,
    opts?: { nullable?: boolean; min?: number; max?: number; step?: number },
  ) => {
    const raw = e.target.value;
    if (opts?.nullable && raw === '') {
      update(field, null as unknown as number); // sat/act nullable
      return;
    }
    const val = opts?.step === 0.01 ? parseFloat(raw) : parseInt(raw, 10);
    if (isNaN(val)) return;
    if (opts?.min !== undefined && val < opts.min) return;
    if (opts?.max !== undefined && val > opts.max) return;
    update(field, val);
  };

  return (
    <div className="profile-card">
      {/* Privacy notice */}
      <div className="fa-privacy-notice">
        ⚠️ Financial data stays in this session only. Nothing is saved to disk.
      </div>

      {/* Import from College Profile */}
      {collegeProfile && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ width: '100%' }}
            onClick={() => {
              if (!collegeProfile) return;
              let count = 0;
              const next = { ...profile };
              if (!next.gpa && collegeProfile.gpa) { next.gpa = parseFloat(collegeProfile.gpa) || 0; count++; }
              if (!next.sat && collegeProfile.sat_score) { const v = parseInt(collegeProfile.sat_score, 10); if (!isNaN(v)) { next.sat = v; count++; } }
              if (!next.act && collegeProfile.act_score) { const v = parseInt(collegeProfile.act_score, 10); if (!isNaN(v)) { next.act = v; count++; } }
              if (!next.class_rank && collegeProfile.class_rank) { next.class_rank = collegeProfile.class_rank; count++; }
              if (!next.state_of_residency && collegeProfile.target_states) { next.state_of_residency = collegeProfile.target_states; count++; }
              if (next.gpa === 0 && collegeProfile.gpa) { next.gpa = parseFloat(collegeProfile.gpa) || 0; }
              onProfileChange(next);
              setImportToast(`Imported ${count} fields from College Profile`);
              setTimeout(() => setImportToast(null), 3000);
            }}
          >
            Import from College Profile
          </button>
          {importToast && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text)', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: 6 }}>
              {importToast}
            </div>
          )}
          {(collegeProfile.targetSchools?.length ?? 0) > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text)', background: 'rgba(245,158,11,0.08)', border: '1px solid var(--accent)', borderRadius: 6, padding: 6 }}>
              📋 {collegeProfile.targetSchools!.length} schools from your College List are available in the Schools tab
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="profile-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div>
          <p className="profile-kicker">Financial aid profile</p>
          <h3>Household &amp; finances</h3>
        </div>
        <span className="toggle-icon" aria-hidden="true">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div className="profile-form">

          {/* ── Household ── */}
          <div className="fa-section-title">Household</div>

          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="fa-family-size">Family Size</label>
              <input
                id="fa-family-size"
                type="number"
                min={1}
                value={profile.household_size}
                onChange={(e) => numInput(e, 'household_size', { min: 1 })}
              />
            </div>
            <div>
              <label htmlFor="fa-students-in-college">Students in College</label>
              <input
                id="fa-students-in-college"
                type="number"
                min={1}
                value={profile.num_in_college}
                onChange={(e) => numInput(e, 'num_in_college', { min: 1 })}
              />
            </div>
          </div>

          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="fa-marital-status">Parent Marital Status</label>
              <select
                id="fa-marital-status"
                value={profile.parent_marital_status}
                onChange={(e) => update('parent_marital_status', e.target.value as FinancialProfile['parent_marital_status'])}
              >
                {MARITAL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fa-dependency">Dependency Status</label>
              <select
                id="fa-dependency"
                value={profile.dependency_status}
                onChange={(e) => update('dependency_status', e.target.value as FinancialProfile['dependency_status'])}
              >
                {DEPENDENCY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Income ── */}
          <div className="fa-section-title">Income</div>

          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="fa-parent-income">Parent Adjusted Gross Income ($)</label>
              <input
                id="fa-parent-income"
                type="number"
                min={0}
                step={1000}
                value={profile.parent_agi}
                onChange={(e) => numInput(e, 'parent_agi', { min: 0 })}
              />
            </div>
            <div>
              <label htmlFor="fa-income-type">Income Type</label>
              <select
                id="fa-income-type"
                value={profile.parent_income_type}
                onChange={(e) => update('parent_income_type', e.target.value as FinancialProfile['parent_income_type'])}
              >
                {INCOME_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="fa-student-income">Student Income ($)</label>
            <input
              id="fa-student-income"
              type="number"
              min={0}
              step={1000}
              value={profile.student_income}
              onChange={(e) => numInput(e, 'student_income', { min: 0 })}
            />
          </div>

          {/* ── Assets ── */}
          <div className="fa-section-title">Assets (for CSS Profile schools)</div>

          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="fa-parent-savings">Parent Savings ($)</label>
              <input
                id="fa-parent-savings"
                type="number"
                min={0}
                step={1000}
                value={profile.parent_savings}
                onChange={(e) => numInput(e, 'parent_savings', { min: 0 })}
              />
            </div>
            <div>
              <label htmlFor="fa-home-equity">Home Equity ($)</label>
              <input
                id="fa-home-equity"
                type="number"
                min={0}
                step={1000}
                value={profile.home_equity}
                onChange={(e) => numInput(e, 'home_equity', { min: 0 })}
              />
            </div>
          </div>

          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="fa-parent-investments">Parent Investments ($)</label>
              <input
                id="fa-parent-investments"
                type="number"
                min={0}
                step={1000}
                value={profile.parent_investments}
                onChange={(e) => numInput(e, 'parent_investments', { min: 0 })}
              />
            </div>
            <div>
              <label htmlFor="fa-business-assets">Business Assets ($)</label>
              <input
                id="fa-business-assets"
                type="number"
                min={0}
                step={1000}
                value={profile.business_assets}
                onChange={(e) => numInput(e, 'business_assets', { min: 0 })}
              />
            </div>
          </div>

          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="fa-529">529 Balance ($)</label>
              <input
                id="fa-529"
                type="number"
                min={0}
                step={1000}
                value={profile.balance_529}
                onChange={(e) => numInput(e, 'balance_529', { min: 0 })}
              />
            </div>
            <div>
              <label htmlFor="fa-student-assets">Student Assets ($)</label>
              <input
                id="fa-student-assets"
                type="number"
                min={0}
                step={1000}
                value={profile.student_assets}
                onChange={(e) => numInput(e, 'student_assets', { min: 0 })}
              />
            </div>
          </div>

          {/* ── Student Academic Profile ── */}
          <div className="fa-section-title">Student Academic Profile</div>

          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="fa-gpa">GPA (Unweighted)</label>
              <input
                id="fa-gpa"
                type="number"
                min={0}
                max={5}
                step={0.01}
                value={profile.gpa}
                onChange={(e) => numInput(e, 'gpa', { min: 0, max: 5, step: 0.01 })}
              />
            </div>
            <div>
              <label htmlFor="fa-sat">SAT (optional)</label>
              <input
                id="fa-sat"
                type="number"
                min={400}
                max={1600}
                value={profile.sat ?? ''}
                onChange={(e) => numInput(e, 'sat', { nullable: true, min: 400, max: 1600 })}
                placeholder="e.g. 1450"
              />
            </div>
          </div>

          <div className="profile-field profile-field-inline">
            <label htmlFor="fa-act">ACT (optional)</label>
            <input
              id="fa-act"
              type="number"
              min={1}
              max={36}
              value={profile.act ?? ''}
              onChange={(e) => numInput(e, 'act', { nullable: true, min: 1, max: 36 })}
              placeholder="e.g. 33"
            />
            <div>
              <label htmlFor="fa-class-rank">Class Rank</label>
              <input
                id="fa-class-rank"
                type="text"
                value={profile.class_rank}
                onChange={(e) => update('class_rank', e.target.value)}
                placeholder="e.g. Top 10%"
              />
            </div>
          </div>

          {/* ── Context ── */}
          <div className="fa-section-title">Context</div>

          <div className="profile-field">
            <label htmlFor="fa-first-gen" className="fa-checkbox-label">
              <input
                id="fa-first-gen"
                type="checkbox"
                checked={profile.first_gen}
                onChange={(e) => update('first_gen', e.target.checked)}
              />
              First-generation college student
            </label>
          </div>

          <div className="profile-field">
            <label htmlFor="fa-state">State of Residency</label>
            <select
              id="fa-state"
              value={profile.state_of_residency}
              onChange={(e) => update('state_of_residency', e.target.value)}
            >
              <option value="">Select state</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="profile-field">
            <label htmlFor="fa-citizenship">Citizenship Status</label>
            <input
              id="fa-citizenship"
              type="text"
              value={profile.citizenship}
              onChange={(e) => update('citizenship', e.target.value)}
              placeholder="e.g. U.S. Citizen, Permanent Resident"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="fa-special">Special Circumstances</label>
            <textarea
              id="fa-special"
              value={profile.special_circumstances}
              onChange={(e) => update('special_circumstances', e.target.value)}
              placeholder="e.g. recent job loss, medical expenses, single parent household"
              rows={4}
            />
          </div>

        </div>
      )}
    </div>
  );
}
