import React, { type Dispatch, type SetStateAction } from 'react';
import FAProfilePanel from './FAProfilePanel';
import FAChatPanel from './FAChatPanel';
import type { FinancialProfile } from '../types';

interface FinancialAidWorkspaceProps {
  financialProfile: FinancialProfile;
  onFinancialProfileChange: (profile: FinancialProfile) => void;
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
      <FAProfilePanel profile={financialProfile} onProfileChange={onFinancialProfileChange} />
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
      {/* Placeholder shell for Sprint 1.4 — Schools + Scholarships tabs */}
      <div className="right-view-switcher" role="group" aria-label="Right panel view">
        <button type="button" className="right-view-btn active" disabled title="Coming in Sprint 1.4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Schools
        </button>
        <button type="button" className="right-view-btn" disabled title="Coming in Sprint 1.4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="6"/>
            <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
          </svg>
          Scholarships
        </button>
      </div>

      <div className="fa-right-placeholder">
        <div className="fa-right-placeholder-inner">
          <div className="fa-right-placeholder-icon" aria-hidden="true">🏫</div>
          <p className="fa-right-placeholder-title">School &amp; Scholarship Matching</p>
          <p className="fa-right-placeholder-body">
            Matching your financial profile against school net price calculators and scholarship
            databases will appear here in Sprint 1.4.
          </p>
        </div>
      </div>
    </div>,
  ];
}