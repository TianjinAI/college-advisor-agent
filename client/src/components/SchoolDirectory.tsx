import { useState } from 'react';
import type { SchoolCategory } from '../types';

const MASCOTS: Record<string, string> = {
  'Harvard': '\u{1F534}', 'Yale': '\u{1F436}', 'Princeton': '\u{1F42F}', 'Columbia': '\u{1F981}',
  'Penn': '\u{1F535}', 'Brown': '\u{1F43B}', 'Dartmouth': '\u{1F7E2}', 'Cornell': '\u{1F534}',
  'Stanford': '\u{1F332}', 'MIT': '\u{1F527}', 'Caltech': '\u{1F9AB}', 'Duke': '\u{1F608}',
  'UChicago': '\u{1F985}', 'Johns Hopkins': '\u{1F426}', 'Northwestern': '\u{1F406}',
  'Vanderbilt': '\u{2693}', 'Rice': '\u{1F989}', 'Notre Dame': '\u{2618}',
  'Georgetown': '\u{1F436}', 'Emory': '\u{1F985}', 'CMU': '\u{1F3F4}', 'USC': '\u{2694}',
  'WashU': '\u{1F43B}',
  'Williams': '\u{1F42E}', 'Amherst': '\u{1F9A3}', 'Swarthmore': '\u{1F525}', 'Pomona': '\u{1F414}',
  'Wellesley': '\u{1F535}', 'Bowdoin': '\u{1F43B}', 'Carleton': '\u{2694}',
  'Middlebury': '\u{1F406}', 'Haverford': '\u{26AB}', 'CMC': '\u{1F98C}',
  'Smith': '\u{2B50}', 'Grinnell': '\u{2B50}', 'Colby': '\u{1F434}',
  'Bates': '\u{1F431}', 'Macalester': '\u{1F3F4}', 'Oberlin': '\u{1F9D1}',
  'Hamilton': '\u{1F7E1}', 'Colgate': '\u{1F3F4}', 'Vassar': '\u{1F37A}',
  'Georgia Tech': '\u{1F41D}', 'UIUC': '\u{1F7E0}', 'Purdue': '\u{1F682}',
  'Michigan': '\u{1F7E1}', 'UC Berkeley': '\u{1F43B}', 'Virginia Tech': '\u{1F983}',
  'Cal Poly SLO': '\u{1F40E}',
  'Harvey Mudd': '\u{1F527}', 'Rose-Hulman': '\u{1F527}', 'RPI': '\u{1F527}',
  'WPI': '\u{1F527}', 'UCLA': '\u{1F43B}', 'Soka': '\u{1F981}',
  'Washington & Lee': '\u{1F396}',
};

function getMascot(school: string): string {
  return MASCOTS[school] || '\u{1F393}';
}

const SCHOOL_CATEGORIES: SchoolCategory[] = [
  { name: 'Ivy League', schools: ['Harvard', 'Yale', 'Princeton', 'Columbia', 'Penn', 'Brown', 'Dartmouth', 'Cornell'] },
  { name: 'Elite National', schools: ['Stanford', 'MIT', 'Caltech', 'Duke', 'UChicago', 'Johns Hopkins', 'Northwestern', 'Vanderbilt', 'Rice', 'Notre Dame', 'Georgetown', 'Emory', 'CMU', 'USC', 'WashU'] },
  { name: 'Top LACs', schools: ['Williams', 'Amherst', 'Swarthmore', 'Pomona', 'Wellesley', 'Bowdoin', 'Carleton', 'Middlebury', 'Haverford', 'CMC', 'Smith', 'Grinnell', 'Colby', 'Bates', 'Macalester', 'Oberlin', 'Hamilton', 'Colgate', 'Vassar'] },
  { name: 'STEM Powerhouses', schools: ['Georgia Tech', 'UIUC', 'Purdue', 'Michigan', 'UC Berkeley', 'Virginia Tech', 'Cal Poly SLO'] },
  { name: 'Specialized Tech', schools: ['Harvey Mudd', 'Rose-Hulman', 'RPI', 'WPI', 'UCLA', 'Soka', 'Washington & Lee'] },
];

interface SchoolDirectoryProps {
  onSelectSchool: (school: string) => void;
}

export default function SchoolDirectory({ onSelectSchool }: SchoolDirectoryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`school-dir ${isCollapsed ? 'collapsed' : ''}`}>
      <button type="button" className="school-dir-toggle" onClick={() => setIsCollapsed(c => !c)} aria-expanded={!isCollapsed}>
        <span>School Directory</span>
        <span aria-hidden="true">{isCollapsed ? '\u2039' : '\u203A'}</span>
      </button>
      {!isCollapsed && (
        <div className="school-dir-body">
          {SCHOOL_CATEGORIES.map(cat => (
            <details key={cat.name} open>
              <summary>{cat.name} \u00B7 {cat.schools.length}</summary>
              <div className="school-tag-grid">
                {cat.schools.map(school => (
                  <button key={school} type="button" className="school-tag" onClick={() => onSelectSchool(school)}>
                    <span className="school-mascot">{getMascot(school)}</span>
                    {school}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </aside>
  );
}
