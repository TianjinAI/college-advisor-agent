import { useState } from 'react';
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
      <div className="profile-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>📋 Student Profile</h3>
        <span className="toggle-icon">{isExpanded ? '▲' : '▼'}</span>
      </div>
      {isExpanded && (
        <div className="profile-form">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="profile-field">
              <label>{label}</label>
              <input
                type="text"
                value={profile[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
