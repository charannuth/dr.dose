import type { MedicationRouteId } from './medicationForms';
import type { MedicationScheduleType } from './medicationSchedule';

/** Confirmable suggestions passed from label scan review into the add-medication wizard. */
export type LabelScanPrefill = {
  name?: string;
  brandName?: string;
  route?: MedicationRouteId | null;
  form?: string;
  doseMg?: string;
  directions?: string;
  notes?: string;
  scheduleType?: MedicationScheduleType;
  scheduleTimes?: string[];
  quantity?: number;
  rawText?: string;
  aiEnhanced?: boolean;
};
