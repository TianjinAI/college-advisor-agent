/**
 * Advising Ingestion Manager (Tier B: Data Ingestion)
 * Loads structured entries from data/advising-ingestion/entries/
 * Provides stats, list, get, search, hot-reload, and approval/index gates.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AdvisingIngestionEntry, IngestionKbTarget, IngestionStatus } from './types.js';

export interface IngestionStats {
  entryCount: number;
  bySourceType: Record<string, number>;
  byConfidence: Record<string, number>;
  byStatus: Record<string, number>;
  indexedCount: number;
  draftCount: number;
  byTopic: string[];
}

export class AdvisingIngestionManager {
  private entriesCache: Map<string, AdvisingIngestionEntry> = new Map();
  private loaded = false;
  private fileById: Map<string, string> = new Map();

  constructor(private entriesDir: string) {}

  // ─── Load ─────────────────────────────────────────────────────────────────

  private normalizeEntry(entry: AdvisingIngestionEntry): AdvisingIngestionEntry {
    return {
      ...entry,
      review: {
        status: entry.review?.status || 'draft',
        kb_targets: entry.review?.kb_targets || [],
        approved_at: entry.review?.approved_at,
        approved_by: entry.review?.approved_by,
        indexed_at: entry.review?.indexed_at,
        ingestion_notes: entry.review?.ingestion_notes,
      },
    };
  }

  private load(): void {
    if (this.loaded) return;
    this.reload();
  }

  /** Force a fresh read from disk (call after adding new entries). */
  reload(): void {
    this.entriesCache.clear();
    this.fileById.clear();
    this.loaded = false;

    if (!fs.existsSync(this.entriesDir)) {
      console.warn('[IngestionMgr] Entries directory not found:', this.entriesDir);
      this.loaded = true;
      return;
    }

    const files = fs.readdirSync(this.entriesDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const fullPath = path.join(this.entriesDir, file);
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const entry = this.normalizeEntry(JSON.parse(raw) as AdvisingIngestionEntry);
        this.entriesCache.set(entry.id, entry);
        this.fileById.set(entry.id, fullPath);
      } catch (err) {
        console.warn('[IngestionMgr] Failed to parse entry file:', file, err);
      }
    }

    this.loaded = true;
    console.log(`[IngestionMgr] Loaded ${this.entriesCache.size} ingestion entries`);
  }

  private persist(entry: AdvisingIngestionEntry): void {
    const file = this.fileById.get(entry.id) || path.join(this.entriesDir, `${entry.id}.json`);
    fs.writeFileSync(file, `${JSON.stringify(entry, null, 2)}\n`, 'utf-8');
    this.entriesCache.set(entry.id, entry);
    this.fileById.set(entry.id, file);
  }

  // ─── KB Access ────────────────────────────────────────────────────────────

  /** All entries as array. */
  list(): AdvisingIngestionEntry[] {
    this.load();
    return Array.from(this.entriesCache.values());
  }

  /** Entries approved and indexed for retrieval. */
  indexed(): AdvisingIngestionEntry[] {
    this.load();
    return this.list().filter(e => e.review?.status === 'indexed');
  }

  /** Get a single entry by ID. */
  get(id: string): AdvisingIngestionEntry | null {
    this.load();
    return this.entriesCache.get(id) || null;
  }

  /** Approve and mark an entry indexed into shared KB. */
  approveAndIndex(id: string, approvedBy = 'shaobin', targets: IngestionKbTarget[] = ['college_advisor', 'financial_aid']): AdvisingIngestionEntry | null {
    this.load();
    const entry = this.entriesCache.get(id);
    if (!entry) return null;
    const now = new Date().toISOString();
    const updated: AdvisingIngestionEntry = {
      ...entry,
      review: {
        ...(entry.review || { status: 'draft' }),
        status: 'indexed' as IngestionStatus,
        approved_at: entry.review?.approved_at || now,
        approved_by: approvedBy,
        indexed_at: now,
        kb_targets: targets,
      },
    };
    this.persist(updated);
    return updated;
  }

  updateStatus(id: string, status: IngestionStatus, notes?: string): AdvisingIngestionEntry | null {
    this.load();
    const entry = this.entriesCache.get(id);
    if (!entry) return null;
    const updated: AdvisingIngestionEntry = {
      ...entry,
      review: {
        ...(entry.review || { status: 'draft' }),
        status,
        ingestion_notes: notes ?? entry.review?.ingestion_notes,
      },
    };
    this.persist(updated);
    return updated;
  }

  createDraft(input: {
    topic: string;
    text: string;
    sourceUrl?: string;
    sourceType: any;
    creator?: string;
  }): AdvisingIngestionEntry {
    this.load();
    const now = new Date().toISOString();
    const slug = input.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'source';
    const id = `draft-${Date.now()}-${slug}`;
    const text = input.text.replace(/\s+/g, ' ').trim();
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const entry: AdvisingIngestionEntry = {
      id,
      topic: input.topic || 'Imported advising source',
      student_profile: 'Imported from public or user-provided source. Review before using with a student.',
      problem: sentences[0]?.slice(0, 600) || 'Review source to identify advising problem.',
      advice_given: sentences.slice(1, 5).map(s => s.slice(0, 500)),
      reasoning: sentences.slice(5, 8).join(' ').slice(0, 900) || text.slice(0, 900),
      action_plan: sentences.slice(8, 12).map(s => s.slice(0, 500)),
      risks: ['Draft extraction. Human review required before this knowledge appears in College Advisor or Financial Aid answers.'],
      source_url: input.sourceUrl || 'manual_input',
      source_type: input.sourceType,
      creator: input.creator || 'workspace_import',
      captured_at: now,
      confidence: text.length > 1000 ? 'med' : 'low',
      review: { status: 'needs_review', kb_targets: [], ingestion_notes: 'Imported draft. Needs review and conflict check.' },
    };
    this.persist(entry);
    return entry;
  }

  findPotentialConflicts(entry: AdvisingIngestionEntry): Array<{ entry: AdvisingIngestionEntry; score: number; reason: string }> {
    this.load();
    const terms = [entry.topic, entry.problem, ...(entry.advice_given || [])]
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 5)
      .slice(0, 40);
    const conflicts: Array<{ entry: AdvisingIngestionEntry; score: number; reason: string }> = [];
    for (const existing of this.entriesCache.values()) {
      if (existing.id === entry.id || existing.review?.status !== 'indexed') continue;
      const haystack = [existing.topic, existing.problem, existing.reasoning, ...(existing.advice_given || [])].join(' ').toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      if (score >= 4) conflicts.push({ entry: existing, score, reason: 'Similar topic/advice already exists in indexed knowledge.' });
    }
    return conflicts.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Keyword search across topic, advice_given, action_plan, reasoning, problem.
   * Returns scored results, descending.
   */
  search(q: string, limit = 10): Array<{ entry: AdvisingIngestionEntry; score: number }> {
    this.load();
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const results: Array<{ entry: AdvisingIngestionEntry; score: number }> = [];

    for (const entry of this.entriesCache.values()) {
      const searchable = [
        entry.topic,
        entry.problem,
        entry.reasoning,
        entry.student_profile,
        ...(entry.advice_given || []),
        ...(entry.action_plan || []),
        ...(entry.risks || []),
        entry.creator || '',
      ]
        .join(' ')
        .toLowerCase();

      let score = 0;
      for (const term of terms) {
        const count = (searchable.match(new RegExp(term, 'g')) || []).length;
        score += count * (term.length > 4 ? 2 : 1); // weight longer terms
      }

      if (score > 0) {
        results.push({ entry, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /** Aggregate stats for health endpoint / admin panel. */
  getStats(): IngestionStats {
    this.load();
    const bySourceType: Record<string, number> = {};
    const byConfidence: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const topics: string[] = [];

    for (const entry of this.entriesCache.values()) {
      const status = entry.review?.status || 'draft';
      bySourceType[entry.source_type] = (bySourceType[entry.source_type] || 0) + 1;
      byConfidence[entry.confidence] = (byConfidence[entry.confidence] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;
      topics.push(entry.topic);
    }

    return {
      entryCount: this.entriesCache.size,
      bySourceType,
      byConfidence,
      byStatus,
      indexedCount: byStatus.indexed || 0,
      draftCount: (byStatus.draft || 0) + (byStatus.needs_review || 0),
      byTopic: topics,
    };
  }
}
