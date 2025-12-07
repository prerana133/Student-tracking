import { useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/authContext';

/**
 * Custom hook to access authentication context and related utilities
 * @returns {Object} Auth context value with additional helper methods
 * @throws {Error} If used outside of an AuthProvider
 */
const useAuth = () => {
  const context = useContext(AuthContext);
  const navigate = useNavigate();

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { user, isAuthenticated, ...rest } = context;

  /**
   * Check if user has required role(s)
   * @param {string|string[]} requiredRoles - Single role or array of roles
   * @returns {boolean} True if user has at least one of the required roles
   */
  const hasRole = useCallback(
    (requiredRoles) => {
      if (!isAuthenticated || !user?.role) return false;
      if (!requiredRoles) return true;
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      return roles.some(role => user.role === role);
    },
    [isAuthenticated, user]
  );

  /**
   * Redirect to login if not authenticated
   * @param {string} redirectPath - Path to redirect to after login
   */
  const requireAuth = useCallback((redirectPath = '/login') => {
    if (!isAuthenticated) {
      navigate(redirectPath, { state: { from: window.location.pathname } });
    }
  }, [isAuthenticated, navigate]);

  return {
    ...rest,
    user,
    isAuthenticated,
    hasRole,
    requireAuth,
  };
};

// Export as named export to match the import statements in components
export { useAuth };

export default useAuth;
