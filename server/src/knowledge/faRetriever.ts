/**
 * Financial Aid Retriever — lightweight wrapper around FinancialAidManager
 * for RAG context injection. Singleton pattern matching knowledge/retriever.ts.
 */

import { FinancialAidManager } from './financialAidManager.js';

class FARetriever {
  private loaded = false;
  private manager = new FinancialAidManager();

  async load(dataDir: string): Promise<void> {
    if (this.loaded) return;
    await this.manager.load(dataDir);
    this.loaded = true;
    console.log('[FA-Retriever] Loaded:', JSON.stringify(this.getStats()));
  }

  search(query: string): string {
    if (!this.loaded) return '';
    return this.manager.search(query);
  }

  getManager(): FinancialAidManager {
    return this.manager;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getStats(): { schools: number; scholarships: number; federal: number; state: number } {
    return {
      schools: this.manager.getSchools().length,
      scholarships: this.manager.getScholarships().length,
      federal: this.manager.getFederalPrograms().length,
      state: this.manager.getStateGrants().length,
    };
  }
}

// Singleton
const faRetriever = new FARetriever();
export default faRetriever;
