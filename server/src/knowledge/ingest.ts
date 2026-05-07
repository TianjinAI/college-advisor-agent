#!/usr/bin/env node
/**
 * ingest.ts — CLI entry point for parsing College Scorecard data and
 * producing per-college JSON files in data/colleges/.
 *
 * Usage:
 *   npx tsx src/knowledge/ingest.ts [--csv /tmp/scorecard-recent.csv] [--out data/colleges]
 */

import * as path from 'path';
import * as fs from 'fs';
import { parseScorecardCSV, TARGET_COLLEGES } from './scorecard';
import { CollegeProfile } from './types';

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

function parseArgs(): { csvPath: string; outputDir: string } {
  const args = process.argv.slice(2);
  let csvPath = '/tmp/scorecard-recent.csv';
  let outputDir = path.resolve(__dirname, '../../../data/colleges');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv' && args[i + 1]) {
      csvPath = args[++i];
    } else if (args[i] === '--out' && args[i + 1]) {
      outputDir = path.resolve(args[++i]);
    }
  }

  return { csvPath, outputDir };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const { csvPath, outputDir } = parseArgs();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  College Advisor — Scorecard Data Ingestion');
  console.log('═══════════════════════════════════════════════════════════');
  console.log();

  // Validate CSV exists
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: CSV file not found: ${csvPath}`);
    console.error('Download it from:');
    console.error('  https://data.ed.gov/dataset/college-scorecard-all-data-files-through-6-2024');
    console.error('  or place the extracted CSV at /tmp/scorecard-recent.csv');
    process.exit(1);
  }

  const csvSize = fs.statSync(csvPath).size;
  console.log(`  CSV source:       ${csvPath}`);
  console.log(`  CSV size:         ${(csvSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Output directory: ${outputDir}`);
  console.log(`  Target colleges:  ${TARGET_COLLEGES.length}`);
  console.log();

  // Ensure output directory
  fs.mkdirSync(outputDir, { recursive: true });

  // Parse!
  const startTime = Date.now();
  const results = parseScorecardCSV(csvPath, outputDir);
  const elapsed = Date.now() - startTime;

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log();
  console.log('───────────────────────────────────────────────────────────');
  console.log('  Ingestion Summary');
  console.log('───────────────────────────────────────────────────────────');
  console.log();
  console.log(`  Colleges parsed:    ${results.length} / ${TARGET_COLLEGES.length}`);
  console.log(`  Time:               ${elapsed} ms`);
  console.log(`  Output directory:   ${outputDir}`);
  console.log();

  // Break down by category
  const byCategory = {
    ivy: results.filter(r => TARGET_COLLEGES.find(t => t.name.toLowerCase() === r.profile.name.toLowerCase())?.category === 'ivy'),
    national: results.filter(r => TARGET_COLLEGES.find(t => t.name.toLowerCase() === r.profile.name.toLowerCase())?.category === 'national'),
    lac: results.filter(r => TARGET_COLLEGES.find(t => t.name.toLowerCase() === r.profile.name.toLowerCase())?.category === 'lac'),
    stem: results.filter(r => TARGET_COLLEGES.find(t => t.name.toLowerCase() === r.profile.name.toLowerCase())?.category === 'stem'),
  };

  console.log('  By Category:');
  console.log(`    Ivy League:        ${byCategory.ivy.length} colleges`);
  console.log(`    National:          ${byCategory.national.length} colleges`);
  console.log(`    Liberal Arts:      ${byCategory.lac.length} colleges`);
  console.log(`    STEM-focused:      ${byCategory.stem.length} colleges`);
  console.log();

  // Data quality summary
  let withSAT = 0;
  let withACT = 0;
  let withAcceptRate = 0;
  let withGradRate = 0;
  let withEarnings = 0;
  let withCost = 0;
  let withRetention = 0;

  for (const r of results) {
    if (r.profile.admissions?.satRange) withSAT++;
    if (r.profile.admissions?.actRange) withACT++;
    if (r.profile.admissions?.acceptanceRate !== undefined) withAcceptRate++;
    if (r.profile.outcomes?.graduationRate4Year !== undefined) withGradRate++;
    if (r.profile.outcomes?.medianEarnings6Year !== undefined) withEarnings++;
    if (r.profile.cost?.totalCostOfAttendance !== undefined) withCost++;
    if (r.profile.outcomes?.retentionRate !== undefined) withRetention++;
  }

  console.log('  Data Coverage:');
  console.log(`    Acceptance Rate:   ${withAcceptRate} / ${results.length}`);
  console.log(`    SAT Range:         ${withSAT} / ${results.length}`);
  console.log(`    ACT Range:         ${withACT} / ${results.length}`);
  console.log(`    Graduation Rate:   ${withGradRate} / ${results.length}`);
  console.log(`    Retention Rate:    ${withRetention} / ${results.length}`);
  console.log(`    Cost of Attend.:   ${withCost} / ${results.length}`);
  console.log(`    Earnings Data:     ${withEarnings} / ${results.length}`);
  console.log();

  // List parsed colleges
  console.log('  Parsed Colleges:');
  for (const r of results.sort((a, b) => a.profile.name.localeCompare(b.profile.name))) {
    const cat = TARGET_COLLEGES.find(t => t.name.toLowerCase() === r.profile.name.toLowerCase())?.category || '?';
    const ar = r.profile.admissions?.acceptanceRate;
    const arStr = ar !== undefined ? `${(ar * 100).toFixed(1)}%` : 'N/A';
    console.log(`    [${cat.toUpperCase().padEnd(5)}] ${r.profile.name.padEnd(55)} AR: ${arStr}`);
  }

  console.log();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Done! JSON files written to: ' + outputDir);
  console.log('═══════════════════════════════════════════════════════════');
}

// Run if invoked directly
if (require.main === module) {
  main();
}
