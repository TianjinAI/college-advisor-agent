/**
 * Knowledge Retriever — loads college profiles + expert insights into memory
 * and provides fast keyword + fuzzy search for RAG injection.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CollegeProfile, ExpertInsight } from './types';

// ─── Indexed Types ────────────────────────────────────────────────────────────

interface IndexedProfile {
  profile: CollegeProfile;
  searchText: string;
  keywords: Map<string, string>;
}

interface IndexedInsight {
  insight: ExpertInsight;
  searchText: string;
}

// ─── Retriever ────────────────────────────────────────────────────────────────

class KnowledgeRetriever {
  private colleges: IndexedProfile[] = [];
  private insights: IndexedInsight[] = [];
  private collegeById: Map<string, CollegeProfile> = new Map();
  private loaded = false;

  async load(dataDir: string): Promise<void> {
    if (this.loaded) return;

    const collegesDir = path.join(dataDir, 'colleges');
    const files = fs.readdirSync(collegesDir).filter(
      f => f.endsWith('.json') && f !== '_scorecard_raw.json'
    );

    for (const file of files) {
      const raw = fs.readFileSync(path.join(collegesDir, file), 'utf-8');
      const profile: CollegeProfile = JSON.parse(raw);
      
      const searchText = this.buildCollegeSearchText(profile);
      const keywords = this.buildCollegeKeywords(profile);
      
      this.colleges.push({ profile, searchText, keywords });
      this.collegeById.set(profile.id, profile);
    }

    const insightsPath = path.join(dataDir, 'experts', 'insights.json');
    if (fs.existsSync(insightsPath)) {
      const raw = JSON.parse(fs.readFileSync(insightsPath, 'utf-8'));
      const insights: ExpertInsight[] = Array.isArray(raw) ? raw : (raw.insights || raw.entries || []);
      for (const ins of insights) {
        const searchText = [
          ins.title, ins.category, ins.content, ins.source || ''
        ].join(' ').toLowerCase();
        this.insights.push({ insight: ins, searchText });
      }
    }

    this.loaded = true;
    console.log(
      `[Retriever] Loaded ${this.colleges.length} colleges, ${this.insights.length} insights`
    );
  }

  // ─── Search Text Building ───────────────────────────────────────────────

  private buildCollegeSearchText(p: CollegeProfile): string {
    const parts: string[] = [
      p.name, p.shortName || '',
      p.location?.city || '', p.location?.state || '', p.location?.region || '',
      p.type || '', p.tier || '', p.control || '',
      ...(p.academics?.strengths || []),
      ...(p.academics?.signaturePrograms || []),
      p.academics?.curriculumStyle || '',
      p.academics?.stemStrength || '',
      p.campus?.setting || '',
      p.campus?.culture || '',
      p.campus?.distinctiveTraits || '',
      p.campus?.whatTheyLookFor || '',
      p.campus?.applicationTips || '',
    ];
    return parts.join(' ').toLowerCase();
  }

  private buildCollegeKeywords(p: CollegeProfile): Map<string, string> {
    const m = new Map<string, string>();
    m.set('name', p.name.toLowerCase());
    m.set('type', (p.type || '').toLowerCase());
    m.set('tier', (p.tier || '').toLowerCase());
    m.set('region', (p.location?.region || '').toLowerCase());
    m.set('state', (p.location?.state || '').toLowerCase());
    m.set('control', (p.control || '').toLowerCase());
    m.set('stemStrength', (p.academics?.stemStrength || '').toLowerCase());
    m.set('curriculumStyle', (p.academics?.curriculumStyle || '').toLowerCase());
    if (p.campus?.setting) m.set('setting', p.campus.setting.toLowerCase());
    return m;
  }

  // ─── Search API ─────────────────────────────────────────────────────────

  searchColleges(
    query: string,
    topK: number = 5
  ): Array<{ profile: CollegeProfile; score: number; matchedOn: string[] }> {
    const lowerQ = query.toLowerCase();
    const results: Array<{ profile: CollegeProfile; score: number; matchedOn: string[] }> = [];

    // Parse structured filters (key:value pairs like "tier:ivy stem:elite")
    const filters = new Map<string, string>();
    const cleanQuery = lowerQ.replace(/(\w+):(\S+)/g, (_match, key, value) => {
      filters.set(key, value);
      return '';
    }).trim();

    const queryTerms = cleanQuery.split(/\s+/).filter(t => t.length > 0);

    for (const { profile, searchText, keywords } of this.colleges) {
      let score = 0;
      const matchedOn: string[] = [];

      // 1. Structured filter matching (must all pass)
      let filterMatch = true;
      for (const [key, value] of Array.from(filters.entries())) {
        const kw = keywords.get(key);
        if (!kw || !kw.includes(value)) {
          filterMatch = false;
          break;
        }
        score += 20;
        matchedOn.push(`filter:${key}:${value}`);
      }
      if (!filterMatch) continue;

      // 2. Exact phrase match (highest weight)
      if (cleanQuery && (
        searchText.includes(` ${cleanQuery} `) || 
        searchText.startsWith(cleanQuery + ' ') ||
        searchText.endsWith(' ' + cleanQuery)
      )) {
        score += 50;
        matchedOn.push('exact phrase');
      }

      // 3. Term matching in search text
      for (const term of queryTerms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        const matches = searchText.match(regex);
        if (matches) {
          score += matches.length * 5;
          matchedOn.push(`term:${term}(${matches.length})`);
        }
      }

      // 4. Name prefix bonus (single short queries)
      if (queryTerms.length === 1 && queryTerms[0].length < 15) {
        if (searchText.startsWith(queryTerms[0])) {
          score += 30;
          matchedOn.push('name prefix');
        }
      }

      if (score > 0) {
        results.push({ profile, score, matchedOn });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  searchInsights(
    query: string,
    topK: number = 5
  ): Array<{ insight: ExpertInsight; score: number; matchedOn: string[] }> {
    const lowerQ = query.toLowerCase();
    const terms = lowerQ.split(/\s+/).filter(t => t.length > 0);
    const results: Array<{ insight: ExpertInsight; score: number; matchedOn: string[] }> = [];

    for (const { insight, searchText } of this.insights) {
      let score = 0;
      const matchedOn: string[] = [];

      // Category match
      if (insight.category && terms.some(t => insight.category.toLowerCase().includes(t))) {
        score += 10;
        matchedOn.push(`category:${insight.category}`);
      }

      // Title match
      if (terms.some(t => insight.title.toLowerCase().includes(t))) {
        score += 8;
        matchedOn.push('title');
      }

      // Content term matching
      for (const term of terms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = searchText.match(new RegExp(escaped, 'g'));
        if (matches) score += matches.length * 3;
        if (matches) matchedOn.push(`term:${term}`);
      }

      if (score > 0) results.push({ insight, score, matchedOn });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  // ─── Structured Access ──────────────────────────────────────────────────

  getCollegeById(id: string): CollegeProfile | undefined {
    return this.collegeById.get(id);
  }

  getAllIds(): string[] {
    return Array.from(this.collegeById.keys());
  }

  getStats() {
    const tiers: Record<string, number> = {};
    const types: Record<string, number> = {};
    for (const { profile } of this.colleges) {
      const t = profile.tier || 'unknown';
      tiers[t] = (tiers[t] || 0) + 1;
      const ty = profile.type || 'unknown';
      types[ty] = (types[ty] || 0) + 1;
    }
    return {
      collegeCount: this.colleges.length,
      insightCount: this.insights.length,
      tiers,
      types,
    };
  }

  // ─── Context Builder for RAG ────────────────────────────────────────────

  buildContext(
    query: string,
    maxColleges: number = 3,
    maxInsights: number = 3
  ): string {
    const collegeResults = this.searchColleges(query, maxColleges);
    const insightResults = this.searchInsights(query, maxInsights);
    const parts: string[] = [];

    if (collegeResults.length > 0) {
      parts.push('## Relevant College Profiles (from knowledge base)');
      for (const { profile } of collegeResults) {
        parts.push(this.formatCollegeContext(profile));
      }
    }

    if (insightResults.length > 0) {
      parts.push('## Relevant Admissions Insights (from expert knowledge)');
      for (const { insight } of insightResults) {
        parts.push(
          `- **[${insight.category}] ${insight.title}**\n  ${insight.content.substring(0, 300)}`
        );
      }
    }

    return parts.join('\n\n');
  }

  private formatCollegeContext(p: CollegeProfile): string {
    const lines: string[] = [
      `### ${p.name} (${p.shortName || p.name})`,
      `- Type: ${p.type} | Tier: ${p.tier} | Region: ${p.location?.region} | Control: ${p.control}`,
      `- Setting: ${p.campus?.setting || 'N/A'}`,
    ];

    const ar = p.admissions?.acceptanceRate;
    if (ar != null) {
      lines.push(
        `- Acceptance: ${(ar * 100).toFixed(1)}% | ` +
        `SAT: ${p.admissions?.satRange?.['25th'] || '?'}-${p.admissions?.satRange?.['75th'] || '?'}`
      );
    }

    const tuition = p.cost?.tuitionAndFees;
    if (tuition != null) {
      lines.push(`- Tuition: $${tuition.toLocaleString()}`);
    }

    if (p.academics?.strengths?.length) {
      lines.push(`- Top Programs: ${p.academics.strengths.join(', ')}`);
    }
    if (p.academics?.curriculumStyle) {
      lines.push(
        `- Curriculum: ${p.academics.curriculumStyle} | STEM: ${p.academics.stemStrength || 'N/A'}`
      );
    }
    if (p.campus?.culture) {
      lines.push(`- Culture: ${p.campus.culture.substring(0, 200)}`);
    }
    if (p.campus?.whatTheyLookFor) {
      lines.push(`- Admissions Priorities: ${p.campus.whatTheyLookFor.substring(0, 180)}`);
    }
    if (p.campus?.applicationTips) {
      lines.push(`- Application Tips: ${p.campus.applicationTips.substring(0, 150)}`);
    }

    return lines.join('\n');
  }
}

// Singleton
const retriever = new KnowledgeRetriever();
export default retriever;