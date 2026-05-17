import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { StudentProfile, UploadedDocument } from '../types';

const SCHOOL_TYPES: StudentProfile['school_type'][] = ['Public', 'Private', 'Both'];
const ETHNIC_GROUPS = [
  'White',
  'Black or African American',
  'Asian',
  'Hispanic or Latino',
  'Native American or Alaska Native',
  'Native Hawaiian or Pacific Islander',
  'Two or More Races',
  'International',
  'Prefer not to say',
] as const;
const SEX_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'] as const;
const DOC_TYPES: { value: UploadedDocument['type']; label: string }[] = [
  { value: 'resume', label: 'Resume / CV' },
  { value: 'essay', label: 'Essay / Writing Sample' },
  { value: 'other', label: 'Other Document' },
];

interface ProfileCardProps {
  profile: StudentProfile;
  onProfileChange: (profile: StudentProfile) => void;
}

export default function ProfileCard({ profile, onProfileChange }: ProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof StudentProfile, value: string | string[] | UploadedDocument[]) => {
    onProfileChange({ ...profile, [field]: value });
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', 'other'); // default; user can change later

    setUploadStatus('Uploading…');
    try {
      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `Upload failed (${resp.status})`);
      }
      const doc: UploadedDocument = await resp.json();
      handleChange('documents', [...(profile.documents || []), doc]);
      setUploadStatus(null);
    } catch (err: any) {
      setUploadStatus(err.message || 'Upload failed');
      setTimeout(() => setUploadStatus(null), 3000);
    }
    // Reset file input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveDoc = (docId: string) => {
    handleChange('documents', (profile.documents || []).filter(d => d.id !== docId));
  };

  const handleDocTypeChange = (docId: string, newType: UploadedDocument['type']) => {
    const docs = (profile.documents || []).map(d =>
      d.id === docId ? { ...d, type: newType } : d
    );
    handleChange('documents', docs);
  };

  return (
    <div className="profile-card">
      <button
        type="button"
        className="profile-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div>
          <p className="profile-kicker">Student profile</p>
          <h3>Preferences and constraints</h3>
        </div>
        <span className="toggle-icon" aria-hidden="true">{isExpanded ? '−' : '+'}</span>
      </button>
      {isExpanded && (
        <div className="profile-form">
          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="profile-gpa">GPA</label>
              <input
                id="profile-gpa"
                type="text"
                value={profile.gpa}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('gpa', e.target.value)}
                placeholder="e.g. 3.8 / 4.0"
              />
            </div>
            <div>
              <label htmlFor="profile-gpa-scale">Scale</label>
              <select
                id="profile-gpa-scale"
                value={profile.gpa_scale}
                onChange={(e) => handleChange('gpa_scale', e.target.value)}
              >
                <option value="Weighted">Weighted</option>
                <option value="Unweighted">Unweighted</option>
              </select>
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="profile-ap-ib-classes">AP / IB Classes</label>
            <input
              id="profile-ap-ib-classes"
              type="text"
              value={profile.ap_ib_classes}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('ap_ib_classes', e.target.value)}
              placeholder="e.g. AP Calc BC (5), AP Physics C (4), AP CS A (5)"
            />
          </div>

          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="profile-sat-score">SAT Score</label>
              <input
                id="profile-sat-score"
                type="text"
                value={profile.sat_score}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('sat_score', e.target.value)}
                placeholder="e.g. 1450"
              />
            </div>
            <div>
              <label htmlFor="profile-act-score">ACT Score</label>
              <input
                id="profile-act-score"
                type="text"
                value={profile.act_score}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('act_score', e.target.value)}
                placeholder="e.g. 33"
              />
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="profile-class-rank">Class Rank</label>
            <input
              id="profile-class-rank"
              type="text"
              value={profile.class_rank}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('class_rank', e.target.value)}
              placeholder="e.g. Top 5% or 15/400"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-intended-majors">Intended Major(s)</label>
            <input
              id="profile-intended-majors"
              type="text"
              value={profile.intended_majors}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('intended_majors', e.target.value)}
              placeholder="e.g. Computer Science, Economics"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-interests">Interests</label>
            <input
              id="profile-interests"
              type="text"
              value={profile.interests}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('interests', e.target.value)}
              placeholder="e.g. robotics, startups, debate"
            />
          </div>

          <div className="profile-field profile-field-inline">
            <div>
              <label htmlFor="profile-ethnic-group">Ethnic Group</label>
              <select
                id="profile-ethnic-group"
                value={profile.ethnic_group}
                onChange={(e) => handleChange('ethnic_group', e.target.value)}
              >
                <option value="">Select ethnic group</option>
                {ETHNIC_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="profile-sex">Sex</label>
              <select
                id="profile-sex"
                value={profile.sex}
                onChange={(e) => handleChange('sex', e.target.value)}
              >
                <option value="">Select sex</option>
                {SEX_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="profile-budget">Budget (annual)</label>
            <input
              id="profile-budget"
              type="text"
              value={profile.budget}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('budget', e.target.value)}
              placeholder="e.g. $50,000"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-target-states">Target States</label>
            <input
              id="profile-target-states"
              type="text"
              value={profile.target_states}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('target_states', e.target.value)}
              placeholder="e.g. CA, NY, MA"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-school-type">School Type</label>
            <select
              id="profile-school-type"
              value={profile.school_type}
              onChange={(e) => handleChange('school_type', e.target.value)}
            >
              <option value="">Select school type</option>
              {SCHOOL_TYPES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="profile-field">
            <label htmlFor="profile-extracurriculars">Extracurricular Activities</label>
            <textarea
              id="profile-extracurriculars"
              value={profile.extracurriculars}
              onChange={(e) => handleChange('extracurriculars', e.target.value)}
              placeholder="List your top 3-5 activities with leadership roles and impact"
              rows={5}
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-summer-camps">Summer Camps / Programs</label>
            <textarea
              id="profile-summer-camps"
              value={profile.summer_camps}
              onChange={(e) => handleChange('summer_camps', e.target.value)}
              placeholder="e.g. MIT RSI, Yale Summer Session, Columbia Summer Pre-College"
              rows={4}
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-awards-honors">Awards &amp; Honors</label>
            <textarea
              id="profile-awards-honors"
              value={profile.awards_honors}
              onChange={(e) => handleChange('awards_honors', e.target.value)}
              placeholder="Competitions, awards, distinctions"
              rows={4}
            />
          </div>

          {/* Document Upload */}
          <div className="profile-field">
            <label>Upload Resume / Essay</label>
            <div className="upload-area">
              <button
                type="button"
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Upload a resume, essay, or other document to give the advisor more context"
              >
                <span className="upload-icon">📎</span> Attach file
              </button>
              {uploadStatus && <span className="upload-status">{uploadStatus}</span>}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf,.md"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
            {(profile.documents || []).length > 0 && (
              <div className="doc-list">
                {(profile.documents || []).map((doc) => (
                  <div key={doc.id} className="doc-item">
                    <select
                      className="doc-type-select"
                      value={doc.type}
                      onChange={(e) => handleDocTypeChange(doc.id, e.target.value as UploadedDocument['type'])}
                    >
                      {DOC_TYPES.map(dt => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                      ))}
                    </select>
                    <span className="doc-filename" title={doc.filename}>
                      {doc.filename.length > 20 ? doc.filename.slice(0, 17) + '…' : doc.filename}
                    </span>
                    <button
                      type="button"
                      className="doc-remove"
                      onClick={() => handleRemoveDoc(doc.id)}
                      title="Remove document"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}