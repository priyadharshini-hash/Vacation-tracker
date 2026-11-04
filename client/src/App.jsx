import { Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { Holidays } from './pages/Holidays.jsx';
import { Profile } from './pages/Profile.jsx';
import { RequestLeavePage } from './pages/RequestLeavePage.jsx';
import { TeamRequests } from './pages/TeamRequests.jsx';
import { AdminUsers } from './pages/AdminUsers.jsx';
import { AdminLeaveTypes } from './pages/AdminLeaveTypes.jsx';
import { Integrations } from './pages/Integrations.jsx';

export function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className={isLoginPage ? '' : 'app-shell'}>
      {!isLoginPage && <Sidebar />}
      <div className={isLoginPage ? '' : 'app-content'}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/holidays"
            element={
              <ProtectedRoute>
                <Holidays />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/integrations"
            element={
              <ProtectedRoute>
                <Integrations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/request"
            element={
              <ProtectedRoute>
                <RequestLeavePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute roles={['manager', 'admin']}>
                <TeamRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leave-types"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminLeaveTypes />
              </ProtectedRoute>
            }
          />
        </Routes>
        {!isLoginPage && (
          <footer className="app-footer">
            <span>Copyright Numrah &copy; {new Date().getFullYear()} &middot; Manage your PTO from your mobile:</span>
            <span className="store-btn" title="Mobile apps coming soon">
              Download for iOS
            </span>
            <span className="store-btn" title="Mobile apps coming soon">
              Download for Android
            </span>
          </footer>
        )}
      </div>
    </div>
  );
}
