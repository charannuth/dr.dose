import { openRow, sealRow } from './crypto/seal';
import { supabase } from './supabase';
import type { Medication } from './types';
import { refillFields, type RefillDraft } from './refillForm';

export async function fetchRefillMedication(userId: string, id: string): Promise<Medication> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('medications').select('*').eq('user_id', userId).eq('id', id).single();
  if (error) throw error;
  return openRow('medications', data) as unknown as Medication;
}
export async function saveMedicationRefill(userId: string, original: Medication, draft: RefillDraft): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { id: _id, ...payload } = sealRow('medications', { id: original.id, ...refillFields(draft) });
  // A logged dose can change inventory while this editor is open. Never overwrite it silently.
  let query = supabase.from('medications').update(payload).eq('user_id', userId).eq('id', original.id).eq('updated_at', original.updated_at);
  query = original.pills_remaining === null ? query.is('pills_remaining', null) : query.eq('pills_remaining', original.pills_remaining);
  const { data, error } = await query.select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This medication changed while you were editing. Return to Refills and reopen it to use the latest supply count.');
}
