/**
 * College Scorecard CSV parser.
 *
 * Reads the raw CSV (typically /tmp/scorecard-recent.csv) and maps the
 * fields we care about into our CollegeProfile type.  Only extracts data
 * for the 50 target colleges defined in TARGET_COLLEGES.
 *
 * Parsed results are cached as JSON in data/colleges/<id>.json so that
 * subsequent loads skip the CSV entirely.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CollegeProfile, CollegeType, CollegeTier, CollegeCategory } from './types';

// ─── Target Colleges ─────────────────────────────────────────────────────────
// Keyed by the INSTNM value found in the Scorecard CSV.

interface TargetEntry {
  name: string;              // exact INSTNM value
  shortName: string;         // common short name
  type: CollegeType;
  tier: CollegeTier;
  category: CollegeCategory;
}

export const TARGET_COLLEGES: TargetEntry[] = [
  // Ivy League
  { name: 'Harvard University',                                            shortName: 'Harvard',         type: 'national-university', tier: 'ivy',       category: 'ivy' },
  { name: 'Yale University',                                               shortName: 'Yale',            type: 'national-university', tier: 'ivy',       category: 'ivy' },
  { name: 'Princeton University',                                          shortName: 'Princeton',       type: 'national-university', tier: 'ivy',       category: 'ivy' },
  { name: 'Columbia University in the City of New York',                   shortName: 'Columbia',        type: 'national-university', tier: 'ivy',       category: 'ivy' },
  { name: 'University of Pennsylvania',                                    shortName: 'Penn',            type: 'national-university', tier: 'ivy',       category: 'ivy' },
  { name: 'Brown University',                                              shortName: 'Brown',           type: 'national-university', tier: 'ivy',       category: 'ivy' },
  { name: 'Cornell University',                                            shortName: 'Cornell',         type: 'national-university', tier: 'ivy',       category: 'ivy' },
  { name: 'Dartmouth College',                                             shortName: 'Dartmouth',       type: 'national-university', tier: 'ivy',       category: 'ivy' },

  // National Universities
  { name: 'Stanford University',                                           shortName: 'Stanford',        type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Massachusetts Institute of Technology',                         shortName: 'MIT',             type: 'institute-of-technology', tier: 'elite', category: 'national' },
  { name: 'California Institute of Technology',                            shortName: 'Caltech',         type: 'institute-of-technology', tier: 'elite', category: 'national' },
  { name: 'University of Chicago',                                         shortName: 'UChicago',        type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Duke University',                                               shortName: 'Duke',            type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Johns Hopkins University',                                      shortName: 'JHU',             type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Northwestern University',                                       shortName: 'Northwestern',    type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Rice University',                                               shortName: 'Rice',            type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Vanderbilt University',                                         shortName: 'Vanderbilt',      type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Washington University in St Louis',                             shortName: 'WashU',           type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'University of Notre Dame',                                      shortName: 'Notre Dame',      type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Georgetown University',                                         shortName: 'Georgetown',      type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Emory University',                                              shortName: 'Emory',           type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'Carnegie Mellon University',                                    shortName: 'CMU',             type: 'national-university', tier: 'elite',     category: 'national' },
  { name: 'University of California-Los Angeles',                          shortName: 'UCLA',            type: 'national-university', tier: 'elite',     category: 'national' },

  // Liberal Arts Colleges
  { name: 'Williams College',                                              shortName: 'Williams',        type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Amherst College',                                               shortName: 'Amherst',         type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Swarthmore College',                                            shortName: 'Swarthmore',      type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Pomona College',                                                shortName: 'Pomona',          type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Wellesley College',                                             shortName: 'Wellesley',       type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Bowdoin College',                                               shortName: 'Bowdoin',         type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Carleton College',                                              shortName: 'Carleton',        type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Claremont McKenna College',                                     shortName: 'CMC',             type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Middlebury College',                                            shortName: 'Middlebury',      type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Colby College',                                                 shortName: 'Colby',           type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Grinnell College',                                              shortName: 'Grinnell',        type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Hamilton College',                                              shortName: 'Hamilton',        type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Haverford College',                                             shortName: 'Haverford',       type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Vassar College',                                                shortName: 'Vassar',          type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Harvey Mudd College',                                           shortName: 'Harvey Mudd',     type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Colgate University',                                            shortName: 'Colgate',         type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Oberlin College',                                               shortName: 'Oberlin',         type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Smith College',                                                 shortName: 'Smith',           type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Bates College',                                                 shortName: 'Bates',           type: 'liberal-arts-college', tier: 'top-lac', category: 'lac' },
  { name: 'Rose-Hulman Institute of Technology',                           shortName: 'Rose-Hulman',     type: 'institute-of-technology', tier: 'top-stem', category: 'lac' },
  { name: 'Cooper Union for the Advancement of Science and Art',           shortName: 'Cooper Union',    type: 'institute-of-technology', tier: 'top-stem', category: 'lac' },

  // STEM-focused
  { name: 'Georgia Institute of Technology-Main Campus',                   shortName: 'Georgia Tech',    type: 'institute-of-technology', tier: 'top-stem', category: 'stem' },
  { name: 'Purdue University-Main Campus',                                shortName: 'Purdue',          type: 'national-university', tier: 'top-stem',  category: 'stem' },
  { name: 'Virginia Polytechnic Institute and State University',           shortName: 'Virginia Tech',   type: 'national-university', tier: 'top-stem',  category: 'stem' },
  { name: 'California Polytechnic State University-San Luis Obispo',       shortName: 'Cal Poly SLO',    type: 'national-university', tier: 'top-stem',  category: 'stem' },
  { name: 'Rensselaer Polytechnic Institute',                              shortName: 'RPI',             type: 'institute-of-technology', tier: 'top-stem', category: 'stem' },
  { name: 'Worcester Polytechnic Institute',                               shortName: 'WPI',             type: 'institute-of-technology', tier: 'top-stem', category: 'stem' },
];

// Build a lookup map keyed by lowercased INSTNM for fast matching
const TARGET_MAP = new Map<string, TargetEntry>();
for (const t of TARGET_COLLEGES) {
  TARGET_MAP.set(t.name.toLowerCase(), t);
}

// ─── Simple CSV Parser ───────────────────────────────────────────────────────
// Handles quoted fields with commas/newlines.  Not battle-tested but sufficient
// for the Scorecard format which is well-formed.

function parseCSVLine(line: string, fields: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  let col = 0;

  while (i < line.length && col < fields.length) {
    const ch = line[i];

    if (ch === '"') {
      // Quoted field
      i++; // skip opening quote
      let value = '';
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            value += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          value += line[i];
          i++;
        }
      }
      result[fields[col]] = value;
      col++;
      if (i < line.length && line[i] === ',') i++; // skip comma
    } else {
      // Unquoted field
      let value = '';
      while (i < line.length && line[i] !== ',') {
        value += line[i];
        i++;
      }
      result[fields[col]] = value;
      col++;
      if (i < line.length && line[i] === ',') i++; // skip comma
    }
  }

  return result;
}

function readCSV(filePath: string): { headers: string[]; rows: Record<string, string>[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  // Split respecting quoted fields (newlines inside quotes)
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.length > 0) {
        lines.push(current);
        current = '';
      }
      if (ch === '\r' && i + 1 < content.length && content[i + 1] === '\n') {
        i++; // skip \r\n
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCSVLine(lines[i], headers));
  }

  return { headers, rows };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a Scorecard value that might be "PrivacySuppressed", "NULL", "None", or a number. */
function safeNumber(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === 'NULL' || trimmed === 'None' || trimmed === 'PrivacySuppressed') {
    return undefined;
  }
  const n = parseFloat(trimmed);
  return isNaN(n) ? undefined : n;
}

/** Parse a percentage (0-100 in CSV) to fraction (0-1). */
function pctToFraction(val: string | undefined): number | undefined {
  const n = safeNumber(val);
  return n !== undefined ? n / 100 : undefined;
}

/** Map state abbreviation to region. */
function stateToRegion(state: string): 'northeast' | 'southeast' | 'midwest' | 'southwest' | 'west' | 'pacific' {
  const s = (state || '').toUpperCase();
  const regions: Record<string, string[]> = {
    northeast: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
    southeast: ['AL', 'AR', 'DE', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV', 'DC'],
    midwest:   ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
    southwest: ['AZ', 'NM', 'OK', 'TX'],
    west:      ['CO', 'ID', 'MT', 'NV', 'UT', 'WY'],
    pacific:   ['AK', 'CA', 'HI', 'OR', 'WA'],
  };
  for (const [region, states] of Object.entries(regions)) {
    if (states.includes(s)) return region as any;
  }
  return 'northeast'; // fallback
}

/** Create a kebab-case id from the school name. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Build the net-price-by-income object from Scorecard fields. */
function buildNetPriceByIncome(row: Record<string, string>): Record<string, number | undefined> | undefined {
  // The Scorecard has per-type net prices. We prefer the one matching CONTROL.
  const ctrl = parseInt(row['CONTROL'] || '0', 10);
  const suffix = ctrl === 1 ? 'PUB' : 'PRIV'; // 1=public → PUB, 2/3=private → PRIV

  const result: Record<string, number | undefined> = {
    '0-30k':    safeNumber(row[`NPT4_048_${suffix}`]),
    '30-48k':   safeNumber(row[`NPT4_3075_${suffix}`]),
    '48-75k':   safeNumber(row[`NPT4_75110_${suffix}`]),
    '75-110k':  safeNumber(row[`NPT4110_${suffix}`]),
    '110k-plus': safeNumber(row[`NPT4110_${suffix}`]),
  };

  // Check if we got any data at all
  const hasData = Object.values(result).some(v => v !== undefined);
  return hasData ? result : undefined;
}

// ─── Scorecard → CollegeProfile Mapper ───────────────────────────────────────

export function mapScorecardRow(
  row: Record<string, string>,
  target: TargetEntry,
): CollegeProfile {
  const name = row['INSTNM'] || target.name;
  const city = row['CITY'] || '';
  const state = row['STABBR'] || '';

  // Control: 1=Public, 2=Private nonprofit, 3=Private for-profit
  const controlVal = parseInt(row['CONTROL'] || '0', 10);

  const profile: CollegeProfile = {
    id: slugify(name),
    name,
    shortName: target.shortName,
    location: {
      city,
      state,
      region: stateToRegion(state),
    },
    type: target.type,
    tier: target.tier,
    control: controlVal === 1 ? 'public' : 'private',
    website: row['SCHURL'] || undefined,

    academics: {
      studentFacultyRatio: safeNumber(row['STUFACR']),
    },

    admissions: {
      acceptanceRate: pctToFraction(row['ADM_RATE_ALL'] || row['ADM_RATE']),
      satRange: buildSATRange(row),
      actRange: buildACTRange(row),
    },

    cost: {
      tuitionAndFees: safeNumber(row['TUITIONFEE_IN']) || safeNumber(row['TUITIONFEE_OUT']),
      roomAndBoard: safeNumber(row['ROOMBOARDON']) || safeNumber(row['ROOMBOARD']),
      totalCostOfAttendance: safeNumber(row['COSTT4_A']),
      averageNetPrice: safeNumber(row['NPT4_PRIV']) || safeNumber(row['NPT4_PUB']) || safeNumber(row['NPT4_PROG']),
      netPriceByIncome: buildNetPriceByIncome(row),
      percentReceivingAid: pctToFraction(row['PCTFLOAN']),
    },

    outcomes: {
      graduationRate4Year: safeNumber(row['C150_4']),
      graduationRate6Year: safeNumber(row['C150_4']) ? undefined : safeNumber(row['C150_4']),
      retentionRate: pctToFraction(row['RET_FT4'] || row['RET_FT']),
      medianEarnings6Year: safeNumber(row['EARN_MDN_6YR']),
      medianEarnings10Year: safeNumber(row['EARN_MDN_10YR']),
      averageDebtAtGraduation: safeNumber(row['GRAD_DEBT_MDN']),
    },

    students: {
      totalUndergrad: safeNumber(row['UGDS']),
      genderBreakdown: {
        male: pctToFraction(row['UGDS_MEN']),
        female: pctToFraction(row['UGDS_WOMEN']),
      },
      internationalPercent: pctToFraction(row['UGDS_NRA']),
      pellGrantPercent: pctToFraction(row['PCTPELL']),
      firstGenPercent: pctToFraction(row['FIRSTGEN']),
    },

    scorecardId: safeNumber(row['UNITID']),
    lastUpdated: new Date().toISOString(),
  };

  return profile;
}

function buildSATRange(row: Record<string, string>) { 
  const satMathMid = safeNumber(row['SATMTMID']);
  const satVRMid = safeNumber(row['SATVRMID']);
  if (satMathMid !== undefined && satVRMid !== undefined) {
    const satAvg = satMathMid + satVRMid;
    // Scorecard only gives midpoints; construct approximate range
    const margin = 80;
    return {
      '25th': Math.round(satAvg - margin),
      '75th': Math.round(satAvg + margin),
    };
  }
  const satAvg = safeNumber(row['SAT_AVG_ALL'] || row['SAT_AVG']);
  if (satAvg !== undefined) {
    const margin = 80;
    return {
      '25th': Math.round(satAvg - margin),
      '75th': Math.round(satAvg + margin),
    };
  }
  return undefined;
}

function buildACTRange(row: Record<string, string>) {
  const actMid = safeNumber(row['ACTCMMID']);
  if (actMid !== undefined) {
    const margin = 3;
    return {
      '25th': Math.round((actMid - margin) * 10) / 10,
      '75th': Math.round((actMid + margin) * 10) / 10,
    };
  }
  return undefined;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ParseResult {
  collegeId: string;
  profile: CollegeProfile;
  cached: boolean;
}

/**
 * Parse the College Scorecard CSV and extract data for all 50 target colleges.
 *
 * @param csvPath  Path to the raw CSV file (default: /tmp/scorecard-recent.csv)
 * @param outputDir  Where to write per-college JSON files (default: data/colleges/)
 * @returns Array of parse results
 */
export function parseScorecardCSV(
  csvPath: string = '/tmp/scorecard-recent.csv',
  outputDir: string = path.resolve(__dirname, '../../../data/colleges'),
): ParseResult[] {
  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  const { headers, rows } = readCSV(csvPath);

  console.log(`[scorecard] Read CSV: ${rows.length} rows, ${headers.length} columns`);
  console.log(`[scorecard] Looking for ${TARGET_COLLEGES.length} target colleges`);

  const results: ParseResult[] = [];
  const foundNames = new Set<string>();

  for (const row of rows) {
    const instName = (row['INSTNM'] || '').trim();
    const key = instName.toLowerCase();
    const target = TARGET_MAP.get(key);

    if (!target) continue;

    foundNames.add(key);
    const profile = mapScorecardRow(row, target);

    // Check for cached version
    const jsonPath = path.join(outputDir, `${profile.id}.json`);
    const cached = fs.existsSync(jsonPath);

    // Always overwrite with fresh data
    fs.writeFileSync(jsonPath, JSON.stringify(profile, null, 2), 'utf-8');

    results.push({ collegeId: profile.id, profile, cached: false });
  }

  // Report missing colleges
  const missing: string[] = [];
  for (const t of TARGET_COLLEGES) {
    if (!foundNames.has(t.name.toLowerCase())) {
      missing.push(t.name);
    }
  }

  if (missing.length > 0) {
    console.warn(`[scorecard] WARNING: ${missing.length} colleges not found in CSV:`);
    for (const m of missing) {
      console.warn(`  - ${m}`);
    }
  }

  return results;
}

/**
 * Parse a single college from an already-loaded set of CSV rows.
 * Useful when you've already loaded the CSV and want per-college lookups.
 */
export function parseSingleCollege(
  rows: Record<string, string>[],
  collegeName: string,
): CollegeProfile | undefined {
  const target = TARGET_MAP.get(collegeName.toLowerCase());
  if (!target) return undefined;

  for (const row of rows) {
    if ((row['INSTNM'] || '').trim().toLowerCase() === target.name.toLowerCase()) {
      return mapScorecardRow(row, target);
    }
  }
  return undefined;
}

/** Get the cached profile for a college by id, or undefined. */
export function getCachedProfile(
  collegeId: string,
  outputDir: string = path.resolve(__dirname, '../../../data/colleges'),
): CollegeProfile | undefined {
  const jsonPath = path.join(outputDir, `${collegeId}.json`);
  if (!fs.existsSync(jsonPath)) return undefined;
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}
