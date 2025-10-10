import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import FullScreenStatus from './components/FullScreenStatus';

type Role = 'reporter' | 'admin';

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, role: null, session: null, loading: true });

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      // eslint-disable-next-line no-console
      console.log('AuthProvider init');
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        const roleClaim = (data.session.user.app_metadata as any)?.role as Role | undefined;
        if (roleClaim) setRole(roleClaim);
        else {
          // fallback: fetch from public profile if stored
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single();
          setRole((profile?.role as Role) ?? null);
        }
      }
      setLoading(false);
    }
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // eslint-disable-next-line no-console
      console.log('auth state changed');
      setSession(newSession);
      setUser(newSession?.user ?? null);
      const roleClaim = (newSession?.user?.app_metadata as any)?.role as Role | undefined;
      setRole(roleClaim ?? null);
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, role, session, loading }), [user, role, session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function PublicRoute() {
  const { user, role, loading } = useAuth();
  if (loading) return <FullScreenStatus message="Loading…" />;
  if (user && role === 'reporter') return <Navigate to="/report/new" replace />;
  if (user && role === 'admin') return <Navigate to="/admin" replace />;
  return <Outlet />;
}

function PrivateRoute({ allow }: { allow: Role[] }) {
  const { user, role, loading } = useAuth();
  if (loading) return <FullScreenStatus message="Authenticating…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && allow.includes(role)) return <Outlet />;
  return <Navigate to="/login" replace />;
}

// Pages
import LoginPage from './views/LoginPage';
import NewReportPage from './views/NewReportPage';
import AdminDashboard from './views/admin/AdminDashboard';
import ReportDetails from './views/admin/ReportDetails';

const router = createBrowserRouter([
  {
    element: <AuthProvider><Outlet /></AuthProvider>,
    children: [
      {
        element: <PublicRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
        ],
      },
      {
        element: <PrivateRoute allow={['reporter']} />,
        children: [
          { path: '/report/new', element: <NewReportPage /> },
        ],
      },
      {
        element: <PrivateRoute allow={['admin']} />,
        children: [
          { path: '/admin', element: <AdminDashboard /> },
          { path: '/admin/reports/:id', element: <ReportDetails /> },
        ],
      },
      { path: '/', element: <Navigate to="/login" replace /> },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
], { basename: import.meta.env.BASE_URL });

export default function AppRouter() {
  return <RouterProvider router={router} />;
}


