export default function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        <div>
          <p className="eyebrow">College Advisor</p>
          <h1 className="header-title">A sharper admissions workspace for school matching and strategy.</h1>
          <p className="header-subtitle">Curated school profiles first, web research only when the question needs fresh data.</p>
        </div>
        <div className="kb-indicator" aria-label="Knowledge base status">
          <span className="kb-indicator-dot" aria-hidden="true" />
          <div>
            <p className="kb-indicator-label">Knowledge base</p>
            <p className="kb-indicator-value">49 schools + 57 insights loaded</p>
          </div>
        </div>
      </div>
    </header>
  );
}
