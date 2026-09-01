function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

export function RequestTable({ requests, showEmployee, actions }) {
  if (requests.length === 0) {
    return <p className="empty-state">No requests to show.</p>;
  }

  return (
    <table className="request-table">
      <thead>
        <tr>
          {showEmployee && <th>Employee</th>}
          <th>Leave type</th>
          <th>Start</th>
          <th>End</th>
          <th>Days</th>
          <th>Status</th>
          <th>Reason</th>
          {actions && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => (
          <tr key={r.id}>
            {showEmployee && <td>{r.userName}</td>}
            <td>{r.leaveTypeName}</td>
            <td>{r.startDate?.slice(0, 10)}</td>
            <td>{r.endDate?.slice(0, 10)}</td>
            <td>{r.daysRequested}</td>
            <td>
              <StatusBadge status={r.status} />
            </td>
            <td>{r.reason || '-'}</td>
            {actions && <td>{actions(r)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
