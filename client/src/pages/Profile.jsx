import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { RequestTable } from '../components/RequestTable.jsx';

export function Profile() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.me(token), api.getMyRequests(token)]).then(([me, reqs]) => {
      setProfile(me.user);
      setRequests(reqs);
      setLoading(false);
    });
  }, [token]);

  if (loading || !profile) return <p className="page-loading">Loading...</p>;

  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="page">
      <div className="profile-hero">
        <div className="profile-avatar-large">{initials}</div>
        <div>
          <h2>{profile.name}</h2>
          <p>{profile.department || 'No department set'}</p>
        </div>
      </div>

      <div className="tab-row">
        <button className={tab === 'profile' ? 'tab active' : 'tab'} onClick={() => setTab('profile')}>
          Profile
        </button>
        <button className={tab === 'leaves' ? 'tab active' : 'tab'} onClick={() => setTab('leaves')}>
          Leaves
        </button>
      </div>

      {tab === 'profile' ? (
        <div className="panel profile-grid">
          <div>
            <div className="profile-field-label">Name</div>
            <div>{profile.name}</div>
          </div>
          <div>
            <div className="profile-field-label">Department</div>
            <div>{profile.department || 'Not set'}</div>
          </div>
          <div>
            <div className="profile-field-label">Location</div>
            <div>{profile.location || 'Not set'}</div>
          </div>
          <div>
            <div className="profile-field-label">Email</div>
            <div>{profile.email}</div>
          </div>
          <div>
            <div className="profile-field-label">Employee since</div>
            <div>{new Date(profile.createdAt).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="profile-field-label">Role</div>
            <div style={{ textTransform: 'capitalize' }}>{profile.role}</div>
          </div>
          <div>
            <div className="profile-field-label">Status</div>
            <div>Active</div>
          </div>
          <div>
            <div className="profile-field-label">Approver</div>
            <div>{profile.managerName || 'Not set'}</div>
          </div>
          <div className="profile-grid-full">
            <div className="profile-field-label">Working days</div>
            <div>Monday, Tuesday, Wednesday, Thursday, Friday &mdash; 8 hours/day</div>
          </div>
        </div>
      ) : (
        <div className="panel">
          <RequestTable requests={requests} />
        </div>
      )}
    </div>
  );
}
