import React, { type Dispatch, type SetStateAction, useState } from 'react';
import FAProfilePanel from './FAProfilePanel';
import FAChatPanel from './FAChatPanel';
import FASchoolsPanel from './FASchoolsPanel';
import FAScholarshipsPanel from './FAScholarshipsPanel';
import FAVocabulary from './FAVocabulary';
import type { FinancialProfile, StudentProfile } from '../types';

type RightTab = 'schools' | 'scholarships' | 'vocab';

interface FinancialAidWorkspaceProps {
  financialProfile: FinancialProfile;
  onFinancialProfileChange: (profile: FinancialProfile) => void;
  collegeProfile?: StudentProfile;
  userId: string;
  sessionId: string | null;
  isStreaming: boolean;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  availableModels: string[];
  currentModel: string;
  onModelChange: (model: string) => void;
  isLoadingModels: boolean;
  onResizeHandleDrag: (side: 'left' | 'right', e: React.MouseEvent) => void;
}

/**
 * Returns an array of exactly 5 elements for the 5-column .app-body grid:
 * [0] sidebar, [1] left resize handle, [2] main content, [3] right resize handle, [4] right panel
 */
export default function FinancialAidWorkspace({
  financialProfile,
  onFinancialProfileChange,
  collegeProfile,
  userId,
  sessionId,
  isStreaming,
  setIsStreaming,
  availableModels,
  currentModel,
  onModelChange,
  isLoadingModels,
  onResizeHandleDrag,
}: FinancialAidWorkspaceProps): JSX.Element[] {
  const [rightTab, setRightTab] = useState<RightTab>('schools');

  return [
    <aside className="sidebar" key="sidebar">
      <div className="sidebar-copy">
        <p className="eyebrow">Financial Aid Advisor</p>
        <h2>Understand your EFC, net costs, and scholarship eligibility.</h2>
        <p>
          Fill in your household financials and ask about aid strategy, school net costs,
          FAFSA, CSS Profile, and scholarship deadlines.
        </p>
      </div>
      <FAProfilePanel profile={financialProfile} onProfileChange={onFinancialProfileChange} collegeProfile={collegeProfile} />
    </aside>,

    <div
      key="left-resize"
      className="resize-handle"
      onMouseDown={(e) => onResizeHandleDrag('left', e)}
      aria-label="Resize sidebar"
      role="separator"
    />,

    <main className="main-content" key="main">
      <FAChatPanel
        financialProfile={financialProfile}
        userId={userId}
        sessionId={sessionId}
        isStreaming={isStreaming}
        setIsStreaming={setIsStreaming}
        availableModels={availableModels}
        currentModel={currentModel}
        onModelChange={onModelChange}
        isLoadingModels={isLoadingModels}
      />
    </main>,

    <div
      key="right-resize"
      className="resize-handle"
      onMouseDown={(e) => onResizeHandleDrag('right', e)}
      aria-label="Resize right panel"
      role="separator"
    />,

    <div className="right-panel-wrapper" key="right-panel">
      <div className="right-view-switcher" role="group" aria-label="Right panel view">
        <button
          type="button"
          className={`right-view-btn${rightTab === 'schools' ? ' active' : ''}`}
          onClick={() => setRightTab('schools')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Schools
        </button>
        <button
          type="button"
          className={`right-view-btn${rightTab === 'scholarships' ? ' active' : ''}`}
          onClick={() => setRightTab('scholarships')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="6"/>
            <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
          </svg>
          Scholarships
        </button>
        <button
          type="button"
          className={`right-view-btn${rightTab === 'vocab' ? ' active' : ''}`}
          onClick={() => setRightTab('vocab')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Vocabulary
        </button>
      </div>

      <div className="fa-right-panel-content">
        {rightTab === 'schools' ? <FASchoolsPanel /> : rightTab === 'scholarships' ? <FAScholarshipsPanel /> : <FAVocabulary />}
      </div>
    </div>,
  ];
}