import { Redirect } from 'expo-router';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../hooks/useAuth';
import { routes } from '../lib/routes';

/** Sole handler for `/` — auth-aware redirect before any drawer shell mounts. */
export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Redirect href={routes.today} />;
  }

  return <Redirect href={routes.login} />;
}
