import { useEffect, useState } from 'react';
import { openRows } from '../lib/crypto/seal';
import { todayLocalDate } from '../lib/dates';
import { formatDoseDisplay } from '../lib/dose';
import { fetchDoctorVisits, type DoctorVisit } from '../lib/doctorVisits';
import { filterMedicationsActiveOn } from '../lib/medicationDates';
import { isAsNeededMed } from '../lib/medicationSchedule';
import type { SummaryMedication } from '../lib/medicalSummary';
import { supabase } from '../lib/supabase';
import type { Medication } from '../lib/types';

function scheduleLabel(m: Medication): string {
  if (isAsNeededMed(m)) return m.max_doses_per_day ? `as needed, up to ${m.max_doses_per_day}/day` : 'as needed';
  const times = m.schedule_times ?? [];
  if (!times.length) return 'daily';
  return times.length === 1 ? `daily at ${times[0]}` : `${times.length}× daily (${times.join(', ')})`;
}

/**
 * Read-only context Medical records shows but doesn't own: current
 * medications (owned by Today) and providers from Doctor visits.
 */
export function useMedicalSummaryData(userId: string | undefined, refreshKey = 0) {
  const [medications, setMedications] = useState<SummaryMedication[]>([]);
  const [visits, setVisits] = useState<DoctorVisit[]>([]);

  useEffect(() => {
    if (!userId || !supabase) return;
    let active = true;
    const today = todayLocalDate();
    void (async () => {
      const [medRes, visitRows] = await Promise.all([
        supabase!.from('medications').select('*').eq('user_id', userId).order('name'),
        fetchDoctorVisits(userId, 200).catch(() => [] as DoctorVisit[]),
      ]);
      if (!active) return;
      const meds = medRes.error
        ? []
        : filterMedicationsActiveOn(openRows('medications', (medRes.data ?? []) as Record<string, unknown>[]) as Medication[], today);
      setMedications(meds.map((m) => ({ name: m.name, dose: formatDoseDisplay(m), schedule: scheduleLabel(m) })));
      setVisits(visitRows);
    })();
    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  return { medications, visits };
}
