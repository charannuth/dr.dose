import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { SupplementForm } from '../../../components/supplements/SupplementForm';

export default function AddSupplementScreen() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  return <SupplementForm userId={user.id} onDone={() => router.back()} />;
}
