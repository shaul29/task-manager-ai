/**
 * Header Component
 */

import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const { user, signOut, isAuthenticated } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">Task Manager AI</h1>
        {isAuthenticated && (
          <div className="header-actions">
            <span className="user-email">{user?.attributes?.email}</span>
            <button onClick={signOut} className="btn btn-secondary">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
