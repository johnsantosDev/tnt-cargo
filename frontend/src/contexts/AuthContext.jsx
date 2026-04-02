import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/me')
        .then(({ data }) => {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasPermission = (permission) => {
    if (user?.roles?.includes('admin')) return true;
    // Support both 'module.action' and 'action_module' formats
    if (user?.permissions?.includes(permission)) return true;
    // Convert 'payments.delete' to 'delete_payments'
    if (permission.includes('.')) {
      const [module, action] = permission.split('.');
      return user?.permissions?.includes(`${action}_${module}`) || false;
    }
    return false;
  };

  const hasRole = (role) => {
    return user?.roles?.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
