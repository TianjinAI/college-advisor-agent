import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { StudentProfile } from '../types';

interface ProfileCardProps {
  profile: StudentProfile;
  onProfileChange: (profile: StudentProfile) => void;
}

export default function ProfileCard({ profile, onProfileChange }: ProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleChange = (field: keyof StudentProfile, value: string) => {
    onProfileChange({ ...profile, [field]: value });
  };

  const fields: { key: keyof StudentProfile; label: string; placeholder: string; type?: string }[] = [
    { key: 'gpa', label: 'GPA', placeholder: 'e.g. 3.8 / 4.0' },
    { key: 'sat_act', label: 'SAT / ACT', placeholder: 'e.g. SAT 1450' },
    { key: 'interests', label: 'Interests', placeholder: 'e.g. CS, Business, Art' },
    { key: 'budget', label: 'Budget (annual)', placeholder: 'e.g. $50,000' },
    { key: 'target_states', label: 'Target States', placeholder: 'e.g. CA, NY, MA' },
    { key: 'extracurriculars', label: 'Extracurriculars', placeholder: 'e.g. Debate Club, Volunteer' },
  ];

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
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="profile-field">
              <label htmlFor={`profile-${key}`}>{label}</label>
              <input
                id={`profile-${key}`}
                type="text"
                value={profile[key]}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
