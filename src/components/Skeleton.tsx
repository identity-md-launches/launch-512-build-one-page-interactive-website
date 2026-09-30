/** Placeholder layout shown while a scan runs; mirrors the dashboard's shape. */
export function DashboardSkeleton() {
  return (
    <div className="section" aria-hidden="true">
      <div className="card">
        <div className="skeleton" style={{ width: '40%', height: '1.75rem' }} />
        <div className="skeleton" style={{ width: '65%', marginBlockStart: '0.75rem' }} />
      </div>
      <div className="pulse-grid">
        <div className="card">
          <div className="skeleton" style={{ height: '7.5rem' }} />
        </div>
        <div className="stat-grid">
          {[0, 1, 2, 3].map((i) => (
            <div className="stat-tile" key={i}>
              <div className="skeleton" style={{ width: '55%' }} />
              <div className="skeleton" style={{ width: '40%', height: '2rem' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
