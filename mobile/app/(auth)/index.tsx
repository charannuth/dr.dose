import { Redirect } from 'expo-router';
import { routes } from '../../lib/routes';

/** Default entry for the auth group — cold start must land here, not the drawer. */
export default function AuthIndex() {
  return <Redirect href={routes.login} />;
}
