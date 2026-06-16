import { Redirect } from 'expo-router';
import { routes } from '../lib/routes';

/** Cold start lands here — send to login before the drawer shell can mount. */
export default function Index() {
  return <Redirect href={routes.login} />;
}
