import { useEffect, useState } from 'react';
import { openRow } from '../lib/crypto/seal';
import { supabase } from '../lib/supabase';

export function useMedicalRecordAllergies(userId: string | undefined) {
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId || !supabase) {
      setAllergies([]);
      setConditions([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const { data } = await supabase
          .from('medical_records')
          .select('known_allergies, known_conditions')
          .eq('user_id', userId)
          .maybeSingle();
        if (!active) return;
        if (!data) {
          setAllergies([]);
          setConditions([]);
          return;
        }
        const opened = openRow(
          'medical_records',
          data as Record<string, unknown>,
        );
        setAllergies(
          Array.isArray(opened.known_allergies)
            ? (opened.known_allergies as string[])
            : [],
        );
        setConditions(
          Array.isArray(opened.known_conditions)
            ? (opened.known_conditions as string[])
            : [],
        );
      } catch {
        if (active) {
          setAllergies([]);
          setConditions([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  return { allergies, conditions, loading };
}
