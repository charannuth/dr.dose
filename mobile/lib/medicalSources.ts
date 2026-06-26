/**
 * Citations for the medical/health information shown in the app
 * (App Store Review Guideline 1.4.1). Surfaced in Help, the drug interaction
 * checker, and the medication safety panel so users can verify the sources.
 */
export type MedicalSource = {
  label: string;
  description: string;
  url: string;
};

export const MEDICAL_SOURCES: MedicalSource[] = [
  {
    label: 'MedlinePlus — Drug Information',
    description:
      'U.S. National Library of Medicine: uses, side effects, and precautions for medications.',
    url: 'https://medlineplus.gov/druginformation.html',
  },
  {
    label: 'DailyMed',
    description:
      'U.S. National Library of Medicine / FDA: official FDA drug labeling and package inserts.',
    url: 'https://dailymed.nlm.nih.gov/dailymed/',
  },
  {
    label: 'MedlinePlus — Drug Reactions & Interactions',
    description:
      'U.S. National Library of Medicine: general guidance on drug, food, and substance interactions.',
    url: 'https://medlineplus.gov/druginteractions.html',
  },
  {
    label: 'RxNorm',
    description:
      'U.S. National Library of Medicine: standardized drug naming used to match medications.',
    url: 'https://www.nlm.nih.gov/research/umls/rxnorm/index.html',
  },
  {
    label: 'Office on Women\u2019s Health — Menstrual Cycle',
    description:
      'U.S. Department of Health & Human Services: menstrual cycle phases and fertility windows used in tracking.',
    url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
  },
];
