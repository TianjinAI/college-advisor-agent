/**
 * TypeScript types for the College Advisor Knowledge Base.
 * Matches data/schema.json — CollegeProfile, ExpertInsight, AdmissionCaseStudy.
 */

// ─── Enums & Literal Unions ──────────────────────────────────────────────────

export type CollegeType =
  | 'national-university'
  | 'liberal-arts-college'
  | 'institute-of-technology'
  | 'specialized';

export type CollegeTier =
  | 'ivy'
  | 'elite'
  | 'top-lac'
  | 'top-stem'
  | 'strong-public';

export type CollegeControl = 'private' | 'public';

export type CollegeRegion =
  | 'northeast'
  | 'southeast'
  | 'midwest'
  | 'southwest'
  | 'west'
  | 'pacific';

export type STEMStrength = 'elite' | 'strong' | 'moderate' | 'developing';

export type ExpertCategory =
  | 'admissions'
  | 'essays'
  | 'extracurriculars'
  | 'financial-aid'
  | 'strategy'
  | 'timeline'
  | 'interviews'
  | 'general';

// ─── Nested Object Types ─────────────────────────────────────────────────────

export interface Location {
  city: string;
  state: string;
  region: CollegeRegion;
}

export interface Academics {
  strengths?: string[];
  signaturePrograms?: string[];
  curriculumStyle?: string;       // e.g. 'Core Curriculum', 'Open Curriculum'
  studentFacultyRatio?: number;
  averageClassSize?: string;
  stemStrength?: STEMStrength;
}

export interface Campus {
  setting?: string;               // e.g. 'Urban campus in Cambridge'
  culture?: string;               // 2-3 sentence campus culture description
  distinctiveTraits?: string;     // What makes this school unique
  whatTheyLookFor?: string;       // What admissions officers prioritize
  applicationTips?: string;       // School-specific application advice
  studentLife?: string;           // Social scene, traditions, athletics
}

export interface ScoreRange {
  '25th': number;
  '75th': number;
}

export interface ApplicationDeadlines {
  earlyDecision?: string;
  earlyAction?: string;
  regularDecision?: string;
  finaidPriority?: string;
}

export interface Admissions {
  acceptanceRate?: number;
  earlyDecisionRate?: number;
  earlyActionRate?: number;
  regularRate?: number;
  waitlistAcceptRate?: number;
  internationalAcceptRate?: number;
  satRange?: ScoreRange;
  actRange?: ScoreRange;
  gpaRange?: string;
  applicationTips?: string;
  whatTheyLookFor?: string;
  deadlines?: ApplicationDeadlines;
}

export interface NetPriceByIncome {
  '0-30k'?: number;
  '30-48k'?: number;
  '48-75k'?: number;
  '75-110k'?: number;
  '110k-plus'?: number;
}

export interface Cost {
  tuitionAndFees?: number;
  roomAndBoard?: number;
  totalCostOfAttendance?: number;
  averageNetPrice?: number;
  netPriceByIncome?: NetPriceByIncome;
  percentReceivingAid?: number;
  needBlind?: boolean;
  meetsFullNeed?: boolean;
  financialAidNotes?: string;
}

export interface Outcomes {
  graduationRate4Year?: number;
  graduationRate6Year?: number;
  retentionRate?: number;
  medianEarnings6Year?: number;
  medianEarnings10Year?: number;
  percentEmployed?: number;
  percentGradSchool?: number;
  averageDebtAtGraduation?: number;
}

export interface GenderBreakdown {
  male?: number;
  female?: number;
}

export interface Students {
  totalUndergrad?: number;
  genderBreakdown?: GenderBreakdown;
  internationalPercent?: number;
  firstGenPercent?: number;
  pellGrantPercent?: number;
  diversityNotes?: string;
}

// ─── Top-level Types ─────────────────────────────────────────────────────────

export interface CollegeProfile {
  id: string;                     // kebab-case, e.g. 'harvard-university'
  name: string;                   // Full official name
  shortName?: string;             // Common short name, e.g. 'Harvard'
  location: Location;
  type: CollegeType;
  tier: CollegeTier;
  control?: CollegeControl;
  website?: string;

  academics?: Academics;
  campus?: Campus;
  admissions?: Admissions;
  cost?: Cost;
  outcomes?: Outcomes;
  students?: Students;

  scorecardId?: number;           // College Scorecard UNITID
  lastUpdated?: string;           // ISO 8601 datetime
}

export interface ExpertInsight {
  id?: string;
  category: ExpertCategory;
  title: string;
  content: string;
  targetTier?: 'ivy' | 'elite' | 'top-lac' | 'any';
  source?: string;
}

export interface AdmissionCaseStudy {
  id?: string;
  studentProfile?: {
    gpa?: string;
    satAct?: string;
    extracurriculars?: string;
    essays?: string;
    demographics?: string;
  };
  results?: {
    accepted?: string[];
    rejected?: string[];
    waitlisted?: string[];
  };
  analysis?: string;
}

// ─── Category Labels for the 50 target colleges ──────────────────────────────

export type CollegeCategory = 'ivy' | 'national' | 'lac' | 'stem';
