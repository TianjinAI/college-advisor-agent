/**
 * Essay Manager — persists student essay submissions and reviews.
 * Essays are stored in: data/users/{userId}/essays/
 *   {essayId}.json        — EssaySubmission
 *   {essayId}-review.json — EssayReview
 */

import * as fs from 'fs';
import * as path from 'path';

export interface EssaySubmission {
  id: string;
  userId: string;
  promptId: string;
  promptLabel: string;
  draftText: string;
  wordCount: number;
  submittedAt: number;
  revisionOf?: string; // parent essay ID for revisions
}

export interface EssayReview {
  id: string;
  essayId: string;
  content: string;
  completedAt: number;
}

export interface EssayEntry extends EssaySubmission {
  review?: EssayReview;
}

export class EssayManager {
  constructor(private usersDir: string) {}

  private getEssaysDir(userId: string): string {
    return path.join(this.usersDir, userId, 'essays');
  }

  private ensureDir(userId: string): void {
    const dir = this.getEssaysDir(userId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /** Save a new essay submission */
  saveEssay(essay: EssaySubmission): void {
    this.ensureDir(essay.userId);
    const file = path.join(this.getEssaysDir(essay.userId), `${essay.id}.json`);
    fs.writeFileSync(file, JSON.stringify(essay, null, 2), 'utf-8');
  }

  /** Save a review for an essay */
  saveReview(review: EssayReview): void {
    const essay = this.getEssay(review.essayId);
    if (!essay) throw new Error(`Essay ${review.essayId} not found`);
    this.ensureDir(essay.userId);
    const file = path.join(this.getEssaysDir(essay.userId), `${review.essayId}-review.json`);
    fs.writeFileSync(file, JSON.stringify(review, null, 2), 'utf-8');
  }

  /** Get a single essay */
  getEssay(essayId: string, userId?: string): EssaySubmission | null {
    // Scan users dir if no userId
    if (!userId) {
      const users = fs.readdirSync(this.usersDir).filter(
        d => fs.statSync(path.join(this.usersDir, d)).isDirectory()
      );
      for (const uid of users) {
        const file = path.join(this.getEssaysDir(uid), `${essayId}.json`);
        if (fs.existsSync(file)) {
          return JSON.parse(fs.readFileSync(file, 'utf-8')) as EssaySubmission;
        }
      }
      return null;
    }
    const file = path.join(this.getEssaysDir(userId), `${essayId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as EssaySubmission;
  }

  /** Get a review for an essay */
  getReview(essayId: string, userId?: string): EssayReview | null {
    if (!userId) {
      const users = fs.readdirSync(this.usersDir).filter(
        d => fs.statSync(path.join(this.usersDir, d)).isDirectory()
      );
      for (const uid of users) {
        const file = path.join(this.getEssaysDir(uid), `${essayId}-review.json`);
        if (fs.existsSync(file)) {
          return JSON.parse(fs.readFileSync(file, 'utf-8')) as EssayReview;
        }
      }
      return null;
    }
    const file = path.join(this.getEssaysDir(userId), `${essayId}-review.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as EssayReview;
  }

  /** Get full essay entry (submission + review) */
  getEntry(essayId: string, userId?: string): EssayEntry | null {
    const essay = this.getEssay(essayId, userId);
    if (!essay) return null;
    const review = this.getReview(essayId, userId);
    return review ? { ...essay, review } : { ...essay };
  }

  /** List all essays for a user, newest first */
  listEssays(userId: string): EssayEntry[] {
    const dir = this.getEssaysDir(userId);
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && !f.includes('-review'))
      .map(f => f.replace('.json', ''));

    const entries: EssayEntry[] = [];
    for (const id of files) {
      const entry = this.getEntry(id, userId);
      if (entry) entries.push(entry);
    }

    return entries.sort((a, b) => b.submittedAt - a.submittedAt);
  }
}
