import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const icons = {
  dashboard: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="11" y="2.5" width="6.5" height="4" rx="1.2" />
      <rect x="11" y="8.5" width="6.5" height="9" rx="1.2" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.2" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="4" width="15" height="13.5" rx="1.5" />
      <path d="M2.5 8h15M6 2.5v3M14 2.5v3" strokeLinecap="round" />
    </svg>
  ),
  holidays: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 3v14M4 10h12" strokeLinecap="round" />
      <path d="M10 3c-2 2-2 4 0 4s2-2 0-4zM10 3c2 2 2 4 0 4" />
      <rect x="3.5" y="10" width="13" height="6.5" rx="1.2" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="6.5" r="3.2" />
      <path d="M3.5 17c1-3.5 4-5 6.5-5s5.5 1.5 6.5 5" strokeLinecap="round" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7" cy="6.5" r="2.6" />
      <circle cx="14" cy="7.5" r="2.1" />
      <path d="M2.3 17c.8-3 3-4.5 4.7-4.5s3.9 1.5 4.7 4.5M12.5 17c.6-2.3 2-3.6 3.4-3.9" strokeLinecap="round" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="6.5" r="3" />
      <path d="M2.5 17c.9-3.3 3.3-5 5.5-5s4.6 1.7 5.5 5" strokeLinecap="round" />
      <path d="M14.5 4.5c1.4.4 2.3 1.6 2.3 3s-.9 2.6-2.3 3M17 17c-.4-1.6-1.2-2.8-2.2-3.6" strokeLinecap="round" />
    </svg>
  ),
  leaveTypes: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4h12M4 10h12M4 16h7" strokeLinecap="round" />
    </svg>
  ),
};

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
      <span className="sidebar-icon">{icon}</span>
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">N</span>
        Numrah Vacation Tracker
      </div>

      <button className="sidebar-request-btn" onClick={() => navigate('/request')}>
        Request Leave
      </button>

      <nav className="sidebar-nav">
        <NavItem to="/" end icon={icons.dashboard} label="Dashboard" />
        <NavItem to="/calendar" icon={icons.calendar} label="Calendar" />
        <NavItem to="/holidays" icon={icons.holidays} label="Holidays" />
        <NavItem to="/profile" icon={icons.profile} label="My Profile" />

        {(user.role === 'manager' || user.role === 'admin') && (
          <>
            <div className="sidebar-section">Management</div>
            <NavItem to="/team" icon={icons.team} label="Team Requests" />
          </>
        )}
        {user.role === 'admin' && (
          <>
            <NavItem to="/admin/users" icon={icons.users} label="Users" />
            <NavItem to="/admin/leave-types" icon={icons.leaveTypes} label="Leave Types" />
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-footer-text">
          <div className="sidebar-footer-name">{user.name}</div>
          <div className="sidebar-footer-org">Numrah</div>
        </div>
        <button className="sidebar-logout" onClick={logout} title="Log out">
          &#8594;
        </button>
      </div>
    </aside>
  );
}
