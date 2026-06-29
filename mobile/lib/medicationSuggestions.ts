import brandMedications from '../data/brand-medications.json'

export type MedicationSuggestion = {
  name: string
  doseMg?: string
  dosePills?: string
  /** Shown under the name — usually the generic ingredient for brand entries. */
  genericName?: string
}

type BrandEntry = {
  name: string
  genericName?: string
  doseMg?: string
  dosePills?: string
}

const BRAND_MEDICATIONS: MedicationSuggestion[] = (
  brandMedications as BrandEntry[]
).map((entry) => ({
  name: entry.name,
  genericName: entry.genericName,
  doseMg: entry.doseMg,
  dosePills: entry.dosePills,
}))

/** Common medications for name autocomplete (generic names). */
export const MEDICATION_SUGGESTIONS: MedicationSuggestion[] = [
  { name: 'Acetaminophen', doseMg: '500 mg', dosePills: '1 tablet' },
  { name: 'Albuterol', dosePills: '2 puffs' },
  { name: 'Allopurinol', doseMg: '300 mg' },
  { name: 'Amlodipine', doseMg: '5 mg' },
  { name: 'Amoxicillin', doseMg: '500 mg' },
  { name: 'Aspirin', doseMg: '81 mg', dosePills: '1 tablet' },
  { name: 'Atenolol', doseMg: '50 mg' },
  { name: 'Atorvastatin', doseMg: '20 mg' },
  { name: 'Azithromycin', doseMg: '250 mg' },
  { name: 'Baclofen', doseMg: '10 mg' },
  { name: 'Benazepril', doseMg: '10 mg' },
  { name: 'Bisoprolol', doseMg: '5 mg' },
  { name: 'Bupropion', doseMg: '150 mg' },
  { name: 'Buspirone', doseMg: '10 mg' },
  { name: 'Carvedilol', doseMg: '12.5 mg' },
  { name: 'Celecoxib', doseMg: '200 mg' },
  { name: 'Cetirizine', doseMg: '10 mg' },
  { name: 'Citalopram', doseMg: '20 mg' },
  { name: 'Clonazepam', doseMg: '0.5 mg' },
  { name: 'Clonidine', doseMg: '0.1 mg' },
  { name: 'Clopidogrel', doseMg: '75 mg' },
  { name: 'Cyclobenzaprine', doseMg: '10 mg' },
  { name: 'Dexamethasone', doseMg: '4 mg' },
  { name: 'Diazepam', doseMg: '5 mg' },
  { name: 'Diclofenac', doseMg: '50 mg' },
  { name: 'Digoxin', doseMg: '0.125 mg' },
  { name: 'Diltiazem', doseMg: '120 mg' },
  { name: 'Doxycycline', doseMg: '100 mg' },
  { name: 'Duloxetine', doseMg: '60 mg' },
  { name: 'Enalapril', doseMg: '10 mg' },
  { name: 'Escitalopram', doseMg: '10 mg' },
  { name: 'Esomeprazole', doseMg: '40 mg' },
  { name: 'Ezetimibe', doseMg: '10 mg' },
  { name: 'Famotidine', doseMg: '20 mg' },
  { name: 'Fenofibrate', doseMg: '145 mg' },
  { name: 'Ferrous sulfate', doseMg: '325 mg' },
  { name: 'Finasteride', doseMg: '5 mg' },
  { name: 'Fluconazole', doseMg: '150 mg' },
  { name: 'Fluoxetine', doseMg: '20 mg' },
  { name: 'Fluticasone', dosePills: '2 sprays' },
  { name: 'Folic acid', doseMg: '1 mg' },
  { name: 'Furosemide', doseMg: '40 mg' },
  { name: 'Gabapentin', doseMg: '300 mg' },
  { name: 'Glimepiride', doseMg: '2 mg' },
  { name: 'Glipizide', doseMg: '5 mg' },
  { name: 'Hydrochlorothiazide', doseMg: '25 mg' },
  { name: 'Hydrocodone-acetaminophen', doseMg: '5/325 mg' },
  { name: 'Hydroxyzine', doseMg: '25 mg' },
  { name: 'Ibuprofen', doseMg: '200 mg', dosePills: '1 tablet' },
  { name: 'Insulin glargine', doseMg: '10 units' },
  { name: 'Insulin lispro', doseMg: '4 units' },
  { name: 'Irbesartan', doseMg: '150 mg' },
  { name: 'Lamotrigine', doseMg: '100 mg' },
  { name: 'Lansoprazole', doseMg: '30 mg' },
  { name: 'Levothyroxine', doseMg: '50 mcg' },
  { name: 'Lisinopril', doseMg: '10 mg' },
  { name: 'Loratadine', doseMg: '10 mg' },
  { name: 'Lorazepam', doseMg: '0.5 mg' },
  { name: 'Losartan', doseMg: '50 mg' },
  { name: 'Lovastatin', doseMg: '20 mg' },
  { name: 'Melatonin', doseMg: '3 mg' },
  { name: 'Meloxicam', doseMg: '15 mg' },
  { name: 'Metformin', doseMg: '500 mg' },
  { name: 'Methotrexate', doseMg: '2.5 mg' },
  { name: 'Metoprolol', doseMg: '50 mg' },
  { name: 'Metronidazole', doseMg: '500 mg' },
  { name: 'Montelukast', doseMg: '10 mg' },
  { name: 'Mirtazapine', doseMg: '15 mg' },
  { name: 'Naproxen', doseMg: '220 mg' },
  { name: 'Nitroglycerin', doseMg: '0.4 mg' },
  { name: 'Olmesartan', doseMg: '20 mg' },
  { name: 'Omeprazole', doseMg: '20 mg' },
  { name: 'Ondansetron', doseMg: '4 mg' },
  { name: 'Oxycodone', doseMg: '5 mg' },
  { name: 'Pantoprazole', doseMg: '40 mg' },
  { name: 'Paroxetine', doseMg: '20 mg' },
  { name: 'Potassium chloride', doseMg: '20 mEq' },
  { name: 'Pravastatin', doseMg: '40 mg' },
  { name: 'Prednisone', doseMg: '10 mg' },
  { name: 'Pregabalin', doseMg: '75 mg' },
  { name: 'Propranolol', doseMg: '40 mg' },
  { name: 'Quetiapine', doseMg: '25 mg' },
  { name: 'Ramipril', doseMg: '5 mg' },
  { name: 'Ranitidine', doseMg: '150 mg' },
  { name: 'Rivaroxaban', doseMg: '20 mg' },
  { name: 'Rosuvastatin', doseMg: '10 mg' },
  { name: 'Sertraline', doseMg: '50 mg' },
  { name: 'Simvastatin', doseMg: '20 mg' },
  { name: 'Spironolactone', doseMg: '25 mg' },
  { name: 'Sumatriptan', doseMg: '50 mg' },
  { name: 'Tamsulosin', doseMg: '0.4 mg' },
  { name: 'Telmisartan', doseMg: '40 mg' },
  { name: 'Tizanidine', doseMg: '4 mg' },
  { name: 'Topiramate', doseMg: '50 mg' },
  { name: 'Tramadol', doseMg: '50 mg' },
  { name: 'Trazodone', doseMg: '50 mg' },
  { name: 'Triamcinolone', dosePills: '1 application' },
  { name: 'Valacyclovir', doseMg: '500 mg' },
  { name: 'Valsartan', doseMg: '80 mg' },
  { name: 'Venlafaxine', doseMg: '75 mg' },
  { name: 'Verapamil', doseMg: '120 mg' },
  { name: 'Vitamin B12', doseMg: '1000 mcg' },
  { name: 'Vitamin D3', doseMg: '2000 IU' },
  { name: 'Warfarin', doseMg: '5 mg' },
  { name: 'Zolpidem', doseMg: '10 mg' },
  { name: 'Paracetamol', doseMg: '500 mg', dosePills: '1 tablet' },
  { name: 'Salbutamol', dosePills: '2 puffs' },
  { name: 'Fexofenadine', doseMg: '120 mg' },
  { name: 'Pheniramine', doseMg: '25 mg' },
  { name: 'Loperamide', doseMg: '2 mg' },
  { name: 'Domperidone', doseMg: '10 mg' },
  { name: 'Metoclopramide', doseMg: '10 mg' },
  { name: 'Prochlorperazine', doseMg: '5 mg' },
  { name: 'Cinnarizine', doseMg: '25 mg' },
  { name: 'Hyoscine butylbromide', doseMg: '10 mg' },
  { name: 'Prednisolone', doseMg: '5 mg' },
  { name: 'Vildagliptin', doseMg: '50 mg' },
  { name: 'Gliclazide', doseMg: '80 mg' },
  { name: 'Itraconazole', doseMg: '100 mg' },
  { name: 'Indapamide', doseMg: '2.5 mg' },
  { name: 'Perindopril', doseMg: '4 mg' },
  { name: 'Bendroflumethiazide', doseMg: '2.5 mg' },
  { name: 'Glyceryl trinitrate', doseMg: '0.5 mg' },
  { name: 'Frusemide', doseMg: '40 mg' },
  { name: 'Amitriptyline', doseMg: '25 mg' },
  { name: 'Flucloxacillin', doseMg: '500 mg' },
  { name: 'Co-amoxiclav', doseMg: '625 mg' },
  { name: 'Co-codamol', doseMg: '8/500 mg' },
  { name: 'Rabeprazole', doseMg: '20 mg' },
  { name: 'Levocetirizine', doseMg: '5 mg' },
]

function matchScore(med: MedicationSuggestion, q: string, brandBoost: number): number {
  const name = med.name.toLowerCase()
  const generic = med.genericName?.toLowerCase() ?? ''
  if (name.startsWith(q)) return brandBoost
  if (name.includes(q)) return brandBoost + 1
  if (generic.startsWith(q)) return brandBoost + 2
  if (generic.includes(q)) return brandBoost + 3
  return 99
}

export function searchLocalMedicationSuggestions(
  query: string,
  limit = 10,
): MedicationSuggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const brandMatches = BRAND_MEDICATIONS.filter(
    (med) => matchScore(med, q, 0) < 99,
  )
  const genericMatches = MEDICATION_SUGGESTIONS.filter(
    (med) => matchScore(med, q, 10) < 99,
  )

  const seen = new Set<string>()
  const merged: MedicationSuggestion[] = []

  for (const med of [...brandMatches, ...genericMatches].sort(
    (a, b) => matchScore(a, q, a.genericName ? 0 : 10) - matchScore(b, q, b.genericName ? 0 : 10),
  )) {
    const key = med.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(med)
    if (merged.length >= limit) break
  }

  return merged
}

/** @deprecated Use searchLocalMedicationSuggestions */
export const searchMedicationSuggestions = searchLocalMedicationSuggestions

export function mergeMedicationSuggestions(
  local: MedicationSuggestion[],
  rxnormNames: string[],
  limit = 12,
): MedicationSuggestion[] {
  const seen = new Set(local.map((m) => m.name.toLowerCase()))
  const merged = [...local]

  for (const name of rxnormNames) {
    if (merged.length >= limit) break
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({ name })
  }

  return merged.slice(0, limit)
}
