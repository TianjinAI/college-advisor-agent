import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { StudentProfile } from '../types';

const HOOK_OPTIONS = ['Legacy', 'First-Gen', 'Recruited Athlete', 'Underrepresented Minority', 'Rural'] as const;
const SCHOOL_TYPES: StudentProfile['school_type'][] = ['Public', 'Private', 'Charter', 'Homeschool'];

interface ProfileCardProps {
  profile: StudentProfile;
  onProfileChange: (profile: StudentProfile) => void;
}

export default function ProfileCard({ profile, onProfileChange }: ProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleChange = (field: keyof StudentProfile, value: string | string[]) => {
    onProfileChange({ ...profile, [field]: value });
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
              {SCHOOL_TYPES.map((schoolType) => (
                <option key={schoolType} value={schoolType}>
                  {schoolType}
                </option>
              ))}
            </select>
          </div>

          <div className="profile-field">
            <label>Hooks</label>
            <div className="hook-grid">
              {HOOK_OPTIONS.map((hook) => {
                const checked = profile.hooks.includes(hook);
                return (
                  <label key={hook} className="hook-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const nextHooks = e.target.checked
                          ? [...profile.hooks, hook]
                          : profile.hooks.filter((item) => item !== hook);
                        handleChange('hooks', nextHooks);
                      }}
                    />
                    <span>{hook}</span>
                  </label>
                );
              })}
            </div>
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
            <label htmlFor="profile-awards-honors">Awards &amp; Honors</label>
            <textarea
              id="profile-awards-honors"
              value={profile.awards_honors}
              onChange={(e) => handleChange('awards_honors', e.target.value)}
              placeholder="Competitions, awards, distinctions"
              rows={4}
            />
          </div>
        </div>
      )}
    </div>
  );
}
