const INTEGRATIONS = [
  { name: 'API', description: 'Read leave data from your own tools using API keys.' },
  { name: 'Webhooks', description: 'Get a signed HTTP call whenever a leave request changes.' },
  { name: 'Slack', description: 'Request and approve leave from Slack.' },
  { name: 'Microsoft Teams', description: 'Request and approve leave from Teams.' },
  { name: 'Zapier', description: 'Connect leave events to thousands of apps.' },
  { name: 'BambooHR', description: 'Sync employees and leave with BambooHR.' },
  { name: 'ADP', description: 'Send approved leave to ADP payroll.' },
];

export function Integrations() {
  return (
    <div className="page">
      <h2>Integrations</h2>
      <p className="muted-small">Connect Numrah Leaves Tracker with the tools your team already uses.</p>
      <div className="integration-grid">
        {INTEGRATIONS.map((item) => (
          <div key={item.name} className="panel integration-card">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <span className="soon-badge">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}
