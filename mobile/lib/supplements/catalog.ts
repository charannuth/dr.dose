// Supplement catalog for the Supplements tab.
//
// This is a *starter* database, not an exhaustive registry. Users can always
// type a supplement that isn't listed here (the add flow is free-text first),
// so we only curate the common ones plus the ones that need safety context.
//
// Safety tiers drive whether the add/detail UI shows a disclaimer:
//   - 'general'  : everyday supplement, no special warning (whey, vitamin C, fiber)
//   - 'caution'  : real bodily changes, notable interactions, or dosing that
//                  matters (creatine, ashwagandha, melatonin, iron, red yeast rice)
//   - 'advanced' : prescription-only, hormonal, or research/unapproved compounds
//                  (GLP-1s, peptides, SARMs) — always show a strong disclaimer and
//                  urge medical supervision.
//
// Nothing here is medical advice. `benefit` describes why people commonly take a
// supplement; it is not a claim that it works or is safe for a given person.

export type SupplementCategory =
  | 'multivitamins'
  | 'vitamins'
  | 'minerals'
  | 'protein-fitness'
  | 'performance'
  | 'omega'
  | 'joint-bone'
  | 'digestive'
  | 'sleep-stress'
  | 'heart-wellness'
  | 'beauty'
  | 'herbal'
  | 'specialty'
  | 'peptides-advanced'

export type SupplementSafetyTier = 'general' | 'caution' | 'advanced'

// Kept as a friendly union but treated as free-text in the UI so users can pick
// whatever fits (e.g. "2 gummies", "1 scoop", "5 g").
export type SupplementUnit =
  | 'mg'
  | 'g'
  | 'mcg'
  | 'IU'
  | 'CFU (billions)'
  | 'mL'
  | 'scoop'
  | 'tablet'
  | 'capsule'
  | 'softgel'
  | 'gummy'
  | 'drop'
  | 'spray'
  | 'tsp'
  | 'tbsp'
  | 'packet'
  | 'puff'

/** Units offered in the amount dropdown, in display order. */
export const SUPPLEMENT_UNIT_OPTIONS: SupplementUnit[] = [
  'mg',
  'g',
  'mcg',
  'IU',
  'CFU (billions)',
  'mL',
  'drop',
  'tablet',
  'capsule',
  'softgel',
  'gummy',
  'scoop',
  'spray',
  'tsp',
  'tbsp',
  'packet',
  'puff',
]

export type SupplementEntry = {
  /** Canonical display name. */
  name: string
  category: SupplementCategory
  /** Alternate spellings / brand names for search matching. */
  aliases?: string[]
  /** Suggested unit for the amount field. */
  defaultUnit: SupplementUnit
  /** A typical starting amount, shown as a hint (not a recommendation). */
  commonDose?: string
  /** Typical cadence, prefilled into frequency (user can change). */
  defaultFrequency?: string
  /** Why people commonly take it. Short, neutral. */
  benefit: string
  safetyTier: SupplementSafetyTier
  /** Practical "what to do while taking it" guidance (hydration, timing, etc.). */
  usageNotes?: string
  /** Safety disclaimer shown for caution/advanced tiers. */
  warning?: string
  /** Affects body composition / hormones — relevant to bulking or cutting. */
  bodilyChange?: boolean
  /** Could be prescribed, is prescription-only, or is a research/unapproved compound. */
  prescribable?: boolean
}

export type SupplementCategoryMeta = {
  id: SupplementCategory
  label: string
  description: string
}

export const SUPPLEMENT_CATEGORIES: SupplementCategoryMeta[] = [
  { id: 'multivitamins', label: 'Multivitamins', description: 'Daily all-in-one vitamins by age and sex' },
  { id: 'vitamins', label: 'Vitamins', description: 'Individual vitamins (D, C, B12, etc.)' },
  { id: 'minerals', label: 'Minerals & electrolytes', description: 'Magnesium, zinc, iron, calcium, sodium' },
  { id: 'protein-fitness', label: 'Protein & fitness', description: 'Protein powders and mass gainers' },
  { id: 'performance', label: 'Performance & energy', description: 'Creatine, pre-workout, amino acids, boosters' },
  { id: 'omega', label: 'Omega & fatty acids', description: 'Fish oil and other omega-3 sources' },
  { id: 'joint-bone', label: 'Joint, bone & collagen', description: 'Collagen, glucosamine, turmeric' },
  { id: 'digestive', label: 'Digestive & gut', description: 'Probiotics, fiber, enzymes' },
  { id: 'sleep-stress', label: 'Sleep & stress', description: 'Melatonin, adaptogens, calming aids' },
  { id: 'heart-wellness', label: 'Heart & wellness', description: 'CoQ10, berberine, general wellness' },
  { id: 'beauty', label: 'Hair, skin & nails', description: 'Biotin, collagen, hyaluronic acid' },
  { id: 'herbal', label: 'Herbal & botanical', description: 'Plant extracts and traditional herbs' },
  { id: 'specialty', label: 'Specialty & life stage', description: 'Prenatal, kids, eye health' },
  { id: 'peptides-advanced', label: 'Peptides & advanced', description: 'Prescription and research compounds — supervision required' },
]

// Reusable disclaimer copy.
export const SUPPLEMENT_GENERAL_DISCLAIMER =
  'Supplements are not evaluated the way medications are. This information is educational, not medical advice — check with a doctor or pharmacist, especially if you take other medications.'

const CAUTION_PREFIX = 'Heads up:'
const ADVANCED_PREFIX = 'Important:'

export const SUPPLEMENT_CATALOG: SupplementEntry[] = [
  // ── Multivitamins ────────────────────────────────────────────────────────
  {
    name: 'Multivitamin',
    category: 'multivitamins',
    aliases: ['daily multivitamin', 'multi'],
    defaultUnit: 'tablet',
    commonDose: '1 tablet',
    defaultFrequency: 'once daily',
    benefit: 'Broad daily coverage of essential vitamins and minerals to fill gaps in your diet.',
    safetyTier: 'general',
  },
  {
    name: "Men's One A Day",
    category: 'multivitamins',
    aliases: ["men's daily", "one a day men's", "men's multivitamin"],
    defaultUnit: 'tablet',
    commonDose: '1 tablet',
    defaultFrequency: 'once daily',
    benefit: 'A daily multivitamin formulated for adult men.',
    safetyTier: 'general',
  },
  {
    name: "Women's One A Day",
    category: 'multivitamins',
    aliases: ["women's daily", "one a day women's", "women's multivitamin"],
    defaultUnit: 'tablet',
    commonDose: '1 tablet',
    defaultFrequency: 'once daily',
    benefit: 'A daily multivitamin formulated for adult women, often with extra iron and folate.',
    safetyTier: 'general',
  },
  {
    name: "Men's One A Day 50+",
    category: 'multivitamins',
    aliases: ["men's 50 plus", "one a day men's 50+", "senior men's multivitamin"],
    defaultUnit: 'tablet',
    commonDose: '1 tablet',
    defaultFrequency: 'once daily',
    benefit: 'A multivitamin tuned for men 50 and older, with more B12, D, and heart-focused nutrients.',
    safetyTier: 'general',
  },
  {
    name: "Women's One A Day 50+",
    category: 'multivitamins',
    aliases: ["women's 50 plus", "one a day women's 50+", "senior women's multivitamin"],
    defaultUnit: 'tablet',
    commonDose: '1 tablet',
    defaultFrequency: 'once daily',
    benefit: 'A multivitamin tuned for women 50 and older, with more calcium, D, and B12.',
    safetyTier: 'general',
  },
  {
    name: 'Kids / teen multivitamin',
    category: 'multivitamins',
    aliases: ['childrens multivitamin', 'gummy multivitamin'],
    defaultUnit: 'gummy',
    commonDose: '1–2 gummies',
    defaultFrequency: 'once daily',
    benefit: 'Age-appropriate daily vitamins for growing kids and teens.',
    safetyTier: 'general',
  },

  // ── Vitamins ─────────────────────────────────────────────────────────────
  {
    name: 'Vitamin D3',
    category: 'vitamins',
    aliases: ['cholecalciferol', 'vitamin d'],
    defaultUnit: 'IU',
    commonDose: '2000 IU',
    defaultFrequency: 'once daily',
    benefit: 'Supports bone health, immune function, and mood; commonly low in people with little sun exposure.',
    safetyTier: 'general',
  },
  {
    name: 'Vitamin C',
    category: 'vitamins',
    aliases: ['ascorbic acid'],
    defaultUnit: 'mg',
    commonDose: '500 mg',
    defaultFrequency: 'once daily',
    benefit: 'Antioxidant that supports immune health and collagen formation.',
    safetyTier: 'general',
  },
  {
    name: 'Vitamin B12',
    category: 'vitamins',
    aliases: ['cobalamin', 'methylcobalamin'],
    defaultUnit: 'mcg',
    commonDose: '1000 mcg',
    defaultFrequency: 'once daily',
    benefit: 'Supports energy, nerve function, and red blood cells; important for vegans and older adults.',
    safetyTier: 'general',
  },
  {
    name: 'Vitamin B Complex',
    category: 'vitamins',
    aliases: ['b complex', 'b vitamins'],
    defaultUnit: 'capsule',
    commonDose: '1 capsule',
    defaultFrequency: 'once daily',
    benefit: 'Combines the B vitamins that support energy metabolism and the nervous system.',
    safetyTier: 'general',
  },
  {
    name: 'Folic acid (Folate)',
    category: 'vitamins',
    aliases: ['folate', 'vitamin b9'],
    defaultUnit: 'mcg',
    commonDose: '400 mcg',
    defaultFrequency: 'once daily',
    benefit: 'Supports cell growth; essential before and during pregnancy to prevent birth defects.',
    safetyTier: 'general',
  },
  {
    name: 'Biotin',
    category: 'vitamins',
    aliases: ['vitamin b7', 'vitamin h'],
    defaultUnit: 'mcg',
    commonDose: '5000 mcg',
    defaultFrequency: 'once daily',
    benefit: 'Popular for hair, skin, and nail support.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} high-dose biotin can distort common lab tests (thyroid, hormone, and troponin/heart tests). Tell your doctor you take it before bloodwork.`,
  },
  {
    name: 'Vitamin A',
    category: 'vitamins',
    aliases: ['retinol', 'beta carotene'],
    defaultUnit: 'IU',
    commonDose: '2500 IU',
    defaultFrequency: 'once daily',
    benefit: 'Supports vision, skin, and immune function.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} vitamin A is fat-soluble and builds up in the body. High doses can be toxic and are unsafe in pregnancy. Do not stack multiple products containing vitamin A.`,
  },
  {
    name: 'Vitamin E',
    category: 'vitamins',
    aliases: ['tocopherol'],
    defaultUnit: 'IU',
    commonDose: '200 IU',
    defaultFrequency: 'once daily',
    benefit: 'Antioxidant that supports skin and cell health.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} high doses can increase bleeding risk, especially if you take blood thinners (warfarin, aspirin). Talk to a doctor before surgery.`,
  },
  {
    name: 'Vitamin K2',
    category: 'vitamins',
    aliases: ['menaquinone', 'vitamin k'],
    defaultUnit: 'mcg',
    commonDose: '100 mcg',
    defaultFrequency: 'once daily',
    benefit: 'Works with vitamin D to direct calcium to bones; supports bone and heart health.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} vitamin K can interfere with blood thinners like warfarin (Coumadin). Do not start it without your doctor's okay if you take an anticoagulant.`,
    prescribable: false,
  },
  {
    name: 'Vitamin B6',
    category: 'vitamins',
    aliases: ['pyridoxine'],
    defaultUnit: 'mg',
    commonDose: '25 mg',
    defaultFrequency: 'once daily',
    benefit: 'Supports metabolism, mood, and nerve function.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} very high doses taken long-term can cause nerve damage (numbness/tingling). Stick to sensible amounts unless a doctor advises otherwise.`,
  },

  // ── Minerals & electrolytes ──────────────────────────────────────────────
  {
    name: 'Magnesium',
    category: 'minerals',
    aliases: ['magnesium citrate', 'magnesium oxide'],
    defaultUnit: 'mg',
    commonDose: '400 mg',
    defaultFrequency: 'once daily',
    benefit: 'Supports muscle and nerve function, sleep, and relaxation.',
    safetyTier: 'general',
    usageNotes: 'Some forms (oxide, citrate) can loosen stools; glycinate is gentler.',
  },
  {
    name: 'Magnesium glycinate',
    category: 'minerals',
    aliases: ['magnesium bisglycinate'],
    defaultUnit: 'mg',
    commonDose: '300 mg',
    defaultFrequency: 'once daily',
    benefit: 'A gentle, well-absorbed magnesium often taken in the evening for sleep and calm.',
    safetyTier: 'general',
  },
  {
    name: 'Zinc',
    category: 'minerals',
    defaultUnit: 'mg',
    commonDose: '15 mg',
    defaultFrequency: 'once daily',
    benefit: 'Supports immune function, skin, and testosterone in deficient people.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} high-dose zinc taken long-term depletes copper and can weaken immunity. Avoid taking large amounts continuously without a break.`,
  },
  {
    name: 'Iron',
    category: 'minerals',
    aliases: ['ferrous sulfate', 'ferrous gluconate'],
    defaultUnit: 'mg',
    commonDose: '18 mg',
    defaultFrequency: 'once daily',
    benefit: 'Treats and prevents iron-deficiency anemia; common need for menstruating and pregnant people.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} only take iron if you know you need it — excess iron is harmful, and iron overdose is a leading cause of poisoning in young children. Keep away from kids.`,
    usageNotes: 'Take with vitamin C to boost absorption; separate from calcium, coffee, and tea.',
  },
  {
    name: 'Calcium',
    category: 'minerals',
    aliases: ['calcium carbonate', 'calcium citrate'],
    defaultUnit: 'mg',
    commonDose: '500 mg',
    defaultFrequency: 'once daily',
    benefit: 'Supports bones and teeth; often paired with vitamin D.',
    safetyTier: 'general',
    usageNotes: 'Absorbs best in doses of 500 mg or less; can reduce absorption of some medications.',
  },
  {
    name: 'Potassium',
    category: 'minerals',
    defaultUnit: 'mg',
    commonDose: '99 mg',
    defaultFrequency: 'once daily',
    benefit: 'Electrolyte that supports blood pressure, hydration, and muscle function.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} large potassium doses can dangerously affect heart rhythm, especially with kidney problems or blood-pressure meds (ACE inhibitors, ARBs, spironolactone). Get medical advice first.`,
  },
  {
    name: 'Sodium (electrolyte / salt)',
    category: 'minerals',
    aliases: ['salt', 'electrolyte sodium'],
    defaultUnit: 'mg',
    commonDose: '500 mg',
    defaultFrequency: 'as needed',
    benefit: 'Key electrolyte for hydration and performance, especially with heavy sweating or low-carb diets.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} added sodium can raise blood pressure and strain the heart and kidneys. Be careful if you have high blood pressure, heart, or kidney conditions.`,
  },
  {
    name: 'Selenium',
    category: 'minerals',
    defaultUnit: 'mcg',
    commonDose: '55 mcg',
    defaultFrequency: 'once daily',
    benefit: 'Antioxidant mineral that supports thyroid and immune function.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} selenium has a narrow safe range — too much causes hair loss, nail changes, and nerve issues. Don't exceed typical amounts.`,
  },
  {
    name: 'Iodine',
    category: 'minerals',
    defaultUnit: 'mcg',
    commonDose: '150 mcg',
    defaultFrequency: 'once daily',
    benefit: 'Essential for thyroid hormone production.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} both too little and too much iodine can disrupt the thyroid. Avoid high-dose iodine if you have a thyroid condition unless a doctor directs it.`,
  },

  // ── Protein & fitness ────────────────────────────────────────────────────
  {
    name: 'Whey protein',
    category: 'protein-fitness',
    aliases: ['whey isolate', 'whey concentrate', 'protein powder'],
    defaultUnit: 'scoop',
    commonDose: '1 scoop (~25 g)',
    defaultFrequency: 'once daily',
    benefit: 'Fast-digesting complete protein to support muscle recovery and hit daily protein targets.',
    safetyTier: 'general',
    bodilyChange: true,
    usageNotes: 'On a bulk, use it to add easy calories/protein; on a cut, it helps preserve muscle while eating less.',
  },
  {
    name: 'Casein protein',
    category: 'protein-fitness',
    defaultUnit: 'scoop',
    commonDose: '1 scoop (~25 g)',
    defaultFrequency: 'once daily',
    benefit: 'Slow-digesting protein often taken before bed to feed muscles overnight.',
    safetyTier: 'general',
    bodilyChange: true,
  },
  {
    name: 'Plant / vegan protein',
    category: 'protein-fitness',
    aliases: ['pea protein', 'soy protein', 'rice protein'],
    defaultUnit: 'scoop',
    commonDose: '1 scoop (~25 g)',
    defaultFrequency: 'once daily',
    benefit: 'Dairy-free protein blend for recovery and daily protein goals.',
    safetyTier: 'general',
    bodilyChange: true,
  },
  {
    name: 'Mass gainer',
    category: 'protein-fitness',
    aliases: ['weight gainer'],
    defaultUnit: 'scoop',
    commonDose: '1 serving',
    defaultFrequency: 'once daily',
    benefit: 'High-calorie protein + carb powder to help hard gainers eat enough to bulk.',
    safetyTier: 'general',
    bodilyChange: true,
    usageNotes: 'Mostly useful on a bulk; the added carbs/calories are counterproductive on a cut.',
  },

  // ── Performance & energy ─────────────────────────────────────────────────
  {
    name: 'Creatine monohydrate',
    category: 'performance',
    aliases: ['creatine'],
    defaultUnit: 'g',
    commonDose: '5 g',
    defaultFrequency: 'once daily',
    benefit: 'The most researched performance supplement — improves strength, power, and muscle size over time.',
    safetyTier: 'caution',
    bodilyChange: true,
    usageNotes:
      'Take 5 g daily (timing does not matter) and drink extra water. On a bulk it boosts strength and fullness; on a cut, keep taking it to hold onto strength and muscle.',
    warning:
      `${CAUTION_PREFIX} creatine is generally very safe, but it causes some water weight (a few pounds early on) and people with kidney disease should check with a doctor first.`,
  },
  {
    name: 'Pre-workout',
    category: 'performance',
    aliases: ['pre workout', 'preworkout'],
    defaultUnit: 'scoop',
    commonDose: '1 scoop',
    defaultFrequency: 'as needed',
    benefit: 'Caffeine-based blend for energy, focus, and pumps before training.',
    safetyTier: 'general',
    usageNotes: 'It is high in caffeine — avoid within ~6 hours of bed and do not stack with other stimulants.',
  },
  {
    name: 'BCAAs',
    category: 'performance',
    aliases: ['branched chain amino acids'],
    defaultUnit: 'scoop',
    commonDose: '1 scoop (~7 g)',
    defaultFrequency: 'as needed',
    benefit: 'Amino acids marketed for recovery; most useful if overall protein intake is low.',
    safetyTier: 'general',
  },
  {
    name: 'EAAs',
    category: 'performance',
    aliases: ['essential amino acids'],
    defaultUnit: 'scoop',
    commonDose: '1 scoop (~10 g)',
    defaultFrequency: 'as needed',
    benefit: 'Full set of essential amino acids to support muscle protein synthesis.',
    safetyTier: 'general',
  },
  {
    name: 'Beta-alanine',
    category: 'performance',
    defaultUnit: 'g',
    commonDose: '3 g',
    defaultFrequency: 'once daily',
    benefit: 'Buffers muscle fatigue for better performance in high-rep and endurance work.',
    safetyTier: 'general',
    usageNotes: 'A harmless tingling sensation (paresthesia) is normal; split doses to reduce it.',
  },
  {
    name: 'L-Citrulline',
    category: 'performance',
    aliases: ['citrulline malate'],
    defaultUnit: 'g',
    commonDose: '6 g',
    defaultFrequency: 'as needed',
    benefit: 'Boosts blood flow and pumps and may reduce training fatigue.',
    safetyTier: 'general',
  },
  {
    name: 'L-Glutamine',
    category: 'performance',
    aliases: ['glutamine'],
    defaultUnit: 'g',
    commonDose: '5 g',
    defaultFrequency: 'once daily',
    benefit: 'Amino acid taken for recovery and gut health.',
    safetyTier: 'general',
  },
  {
    name: 'L-Carnitine',
    category: 'performance',
    aliases: ['acetyl l-carnitine', 'carnitine'],
    defaultUnit: 'mg',
    commonDose: '1000 mg',
    defaultFrequency: 'once daily',
    benefit: 'Involved in turning fat into energy; popular during cuts.',
    safetyTier: 'general',
  },
  {
    name: 'Taurine',
    category: 'performance',
    defaultUnit: 'g',
    commonDose: '1 g',
    defaultFrequency: 'as needed',
    benefit: 'Amino acid that supports hydration and exercise performance.',
    safetyTier: 'general',
  },
  {
    name: 'Electrolytes',
    category: 'performance',
    aliases: ['electrolyte powder', 'lmnt', 'liquid iv'],
    defaultUnit: 'scoop',
    commonDose: '1 serving',
    defaultFrequency: 'as needed',
    benefit: 'Sodium, potassium, and magnesium blend for hydration during training or heat.',
    safetyTier: 'general',
  },
  {
    name: 'Caffeine tablet',
    category: 'performance',
    aliases: ['caffeine pills'],
    defaultUnit: 'mg',
    commonDose: '100–200 mg',
    defaultFrequency: 'as needed',
    benefit: 'Convenient dosed caffeine for energy and focus.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} caffeine adds up fast across coffee, pre-workout, and pills. Too much causes jitters, racing heart, and poor sleep; be careful with heart conditions or anxiety.`,
  },

  // ── Omega & fatty acids ──────────────────────────────────────────────────
  {
    name: 'Fish oil (Omega-3)',
    category: 'omega',
    aliases: ['omega 3', 'epa dha', 'fish oil'],
    defaultUnit: 'softgel',
    commonDose: '1000 mg',
    defaultFrequency: 'once daily',
    benefit: 'EPA/DHA omega-3s that support heart, brain, and joint health.',
    safetyTier: 'general',
    usageNotes: 'Very high doses can thin the blood slightly; mention it before surgery if you take a lot.',
  },
  {
    name: 'Krill oil',
    category: 'omega',
    defaultUnit: 'softgel',
    commonDose: '1000 mg',
    defaultFrequency: 'once daily',
    benefit: 'Omega-3 source with antioxidants; often easier on the stomach than fish oil.',
    safetyTier: 'general',
  },
  {
    name: 'Flaxseed oil',
    category: 'omega',
    aliases: ['flax oil', 'ala omega'],
    defaultUnit: 'softgel',
    commonDose: '1000 mg',
    defaultFrequency: 'once daily',
    benefit: 'Plant-based (ALA) omega-3 option for vegans and vegetarians.',
    safetyTier: 'general',
  },
  {
    name: 'Cod liver oil',
    category: 'omega',
    defaultUnit: 'mL',
    commonDose: '5 mL',
    defaultFrequency: 'once daily',
    benefit: 'Omega-3s plus naturally occurring vitamins A and D.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} it contains vitamin A and D, which build up in the body. Don't combine with other high-dose A/D products, and avoid high doses in pregnancy.`,
  },

  // ── Joint, bone & collagen ───────────────────────────────────────────────
  {
    name: 'Collagen peptides',
    category: 'joint-bone',
    aliases: ['collagen', 'hydrolyzed collagen'],
    defaultUnit: 'scoop',
    commonDose: '10 g',
    defaultFrequency: 'once daily',
    benefit: 'Protein for skin elasticity, joints, hair, and nails.',
    safetyTier: 'general',
  },
  {
    name: 'Glucosamine & Chondroitin',
    category: 'joint-bone',
    aliases: ['glucosamine', 'chondroitin'],
    defaultUnit: 'capsule',
    commonDose: '1500 mg',
    defaultFrequency: 'once daily',
    benefit: 'Popular for joint comfort and osteoarthritis, especially in older adults.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} glucosamine is often made from shellfish — avoid if you have a shellfish allergy. It may also slightly affect blood sugar and blood thinners.`,
  },
  {
    name: 'MSM',
    category: 'joint-bone',
    aliases: ['methylsulfonylmethane'],
    defaultUnit: 'mg',
    commonDose: '1000 mg',
    defaultFrequency: 'once daily',
    benefit: 'Sulfur compound taken for joint comfort and recovery.',
    safetyTier: 'general',
  },
  {
    name: 'Turmeric / Curcumin',
    category: 'joint-bone',
    aliases: ['turmeric', 'curcumin'],
    defaultUnit: 'mg',
    commonDose: '500 mg',
    defaultFrequency: 'once daily',
    benefit: 'Anti-inflammatory compound taken for joint and general inflammation.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} high doses can thin the blood and interact with anticoagulants; may stir up gallbladder issues. Use caution before surgery.`,
  },

  // ── Digestive & gut ──────────────────────────────────────────────────────
  {
    name: 'Probiotics',
    category: 'digestive',
    aliases: ['probiotic'],
    defaultUnit: 'CFU (billions)',
    commonDose: '10 billion CFU',
    defaultFrequency: 'once daily',
    benefit: 'Beneficial bacteria that support gut balance and digestion.',
    safetyTier: 'general',
  },
  {
    name: 'Fiber (psyllium)',
    category: 'digestive',
    aliases: ['psyllium husk', 'metamucil', 'fiber supplement'],
    defaultUnit: 'scoop',
    commonDose: '1 serving',
    defaultFrequency: 'once daily',
    benefit: 'Adds soluble fiber for regularity, fullness, and cholesterol support.',
    safetyTier: 'general',
    usageNotes: 'Take with a full glass of water and separate from medications by ~2 hours (it can block absorption).',
  },
  {
    name: 'Digestive enzymes',
    category: 'digestive',
    defaultUnit: 'capsule',
    commonDose: '1 capsule',
    defaultFrequency: 'with meals',
    benefit: 'Enzymes taken with meals to ease bloating and support digestion.',
    safetyTier: 'general',
  },
  {
    name: 'Apple cider vinegar',
    category: 'digestive',
    aliases: ['acv'],
    defaultUnit: 'gummy',
    commonDose: '1–2 gummies',
    defaultFrequency: 'once daily',
    benefit: 'Taken for digestion and appetite; available as liquid or gummies.',
    safetyTier: 'general',
    usageNotes: 'Liquid ACV is acidic — dilute it to protect tooth enamel and your throat.',
  },
  {
    name: 'Greens powder',
    category: 'digestive',
    aliases: ['super greens', 'ag1', 'athletic greens'],
    defaultUnit: 'scoop',
    commonDose: '1 scoop',
    defaultFrequency: 'once daily',
    benefit: 'Blended vegetables, vitamins, and probiotics for daily micronutrient support.',
    safetyTier: 'general',
  },

  // ── Sleep & stress ───────────────────────────────────────────────────────
  {
    name: 'Melatonin',
    category: 'sleep-stress',
    defaultUnit: 'mg',
    commonDose: '3 mg',
    defaultFrequency: 'once at night',
    benefit: 'A sleep hormone taken to fall asleep faster or reset your body clock (jet lag).',
    safetyTier: 'caution',
    bodilyChange: true,
    usageNotes: 'Lower doses (0.5–1 mg) often work as well as high ones. Take ~30–60 min before bed.',
    warning:
      `${CAUTION_PREFIX} melatonin is a hormone. It can cause grogginess — don't drive after taking it — and isn't meant for long-term nightly use without medical advice. Use caution in kids.`,
  },
  {
    name: 'Ashwagandha',
    category: 'sleep-stress',
    aliases: ['withania somnifera', 'ksm-66'],
    defaultUnit: 'mg',
    commonDose: '600 mg',
    defaultFrequency: 'once daily',
    benefit: 'An adaptogen taken to lower stress and cortisol, improve sleep, and modestly support testosterone.',
    safetyTier: 'caution',
    bodilyChange: true,
    warning:
      `${CAUTION_PREFIX} ashwagandha affects hormones and the thyroid, can interact with thyroid and sedative medications, and is not recommended in pregnancy. Rare reports of liver issues exist — stop if you feel unwell.`,
  },
  {
    name: 'L-Theanine',
    category: 'sleep-stress',
    defaultUnit: 'mg',
    commonDose: '200 mg',
    defaultFrequency: 'as needed',
    benefit: 'Amino acid from tea that promotes calm focus; often paired with caffeine.',
    safetyTier: 'general',
  },
  {
    name: 'GABA',
    category: 'sleep-stress',
    aliases: ['gamma aminobutyric acid'],
    defaultUnit: 'mg',
    commonDose: '500 mg',
    defaultFrequency: 'once at night',
    benefit: 'Calming neurotransmitter taken for relaxation and sleep.',
    safetyTier: 'general',
  },
  {
    name: '5-HTP',
    category: 'sleep-stress',
    aliases: ['5 hydroxytryptophan'],
    defaultUnit: 'mg',
    commonDose: '100 mg',
    defaultFrequency: 'once at night',
    benefit: 'Serotonin precursor taken for mood and sleep.',
    safetyTier: 'advanced',
    warning:
      `${ADVANCED_PREFIX} do NOT combine 5-HTP with antidepressants (SSRIs, SNRIs, MAOIs) or migraine triptans — the combination can cause dangerous serotonin syndrome. Check with a doctor first.`,
    prescribable: false,
  },
  {
    name: 'Valerian root',
    category: 'sleep-stress',
    defaultUnit: 'mg',
    commonDose: '500 mg',
    defaultFrequency: 'once at night',
    benefit: 'Herbal sedative taken for sleep and anxiety.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} it can cause drowsiness — don't mix with alcohol, sedatives, or sleep medications, and avoid before driving.`,
  },

  // ── Heart & wellness ─────────────────────────────────────────────────────
  {
    name: 'CoQ10',
    category: 'heart-wellness',
    aliases: ['coenzyme q10', 'ubiquinol'],
    defaultUnit: 'mg',
    commonDose: '100 mg',
    defaultFrequency: 'once daily',
    benefit: 'Supports cellular energy and heart health; often used by people on statins.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} CoQ10 can slightly lower blood pressure and may reduce the effect of blood thinners like warfarin. Mention it to your doctor if you take those.`,
  },
  {
    name: 'Berberine',
    category: 'heart-wellness',
    defaultUnit: 'mg',
    commonDose: '500 mg',
    defaultFrequency: 'with meals',
    benefit: 'Plant compound taken to support blood sugar and cholesterol (sometimes called "nature\'s Ozempic").',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} berberine lowers blood sugar and can stack with diabetes medications to cause lows. It also interacts with many drugs (it blocks a key liver enzyme). Talk to a doctor if you take prescriptions.`,
  },
  {
    name: 'Niacin (B3)',
    category: 'heart-wellness',
    aliases: ['vitamin b3', 'nicotinic acid'],
    defaultUnit: 'mg',
    commonDose: '500 mg',
    defaultFrequency: 'once daily',
    benefit: 'Taken for cholesterol support and energy metabolism.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} high-dose niacin causes intense skin flushing and, over time, can affect the liver and blood sugar. High doses should be doctor-supervised.`,
  },
  {
    name: 'Red yeast rice',
    category: 'heart-wellness',
    defaultUnit: 'mg',
    commonDose: '1200 mg',
    defaultFrequency: 'once daily',
    benefit: 'Fermented rice taken to lower cholesterol.',
    safetyTier: 'advanced',
    warning:
      `${ADVANCED_PREFIX} red yeast rice naturally contains lovastatin — the same active as a prescription statin. It carries the same risks (muscle damage, liver injury), interacts with many drugs, and is unsafe in pregnancy. Do not combine with a statin. Use only with medical guidance.`,
    prescribable: true,
  },

  // ── Hair, skin & nails ───────────────────────────────────────────────────
  {
    name: 'Hyaluronic acid',
    category: 'beauty',
    defaultUnit: 'mg',
    commonDose: '120 mg',
    defaultFrequency: 'once daily',
    benefit: 'Taken for skin hydration and joint lubrication.',
    safetyTier: 'general',
  },
  {
    name: 'Sea moss',
    category: 'beauty',
    aliases: ['irish sea moss'],
    defaultUnit: 'capsule',
    commonDose: '1 capsule',
    defaultFrequency: 'once daily',
    benefit: 'Seaweed marketed for skin, thyroid, and general wellness.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} sea moss can be very high in iodine, which may disrupt the thyroid. Amounts vary a lot between products.`,
  },

  // ── Herbal & botanical ───────────────────────────────────────────────────
  {
    name: 'Elderberry',
    category: 'herbal',
    aliases: ['sambucus'],
    defaultUnit: 'gummy',
    commonDose: '1–2 gummies',
    defaultFrequency: 'once daily',
    benefit: 'Popular for immune support during cold and flu season.',
    safetyTier: 'general',
  },
  {
    name: 'Ginkgo biloba',
    category: 'herbal',
    defaultUnit: 'mg',
    commonDose: '120 mg',
    defaultFrequency: 'once daily',
    benefit: 'Herb taken for memory, focus, and circulation.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} ginkgo can thin the blood and increase bleeding risk, especially with anticoagulants or before surgery.`,
  },
  {
    name: 'Ginseng',
    category: 'herbal',
    aliases: ['panax ginseng', 'korean ginseng'],
    defaultUnit: 'mg',
    commonDose: '400 mg',
    defaultFrequency: 'once daily',
    benefit: 'Adaptogen taken for energy, focus, and stamina.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} ginseng can affect blood sugar and blood pressure, may be stimulating (avoid at night), and interacts with blood thinners and diabetes meds.`,
  },
  {
    name: 'Milk thistle',
    category: 'herbal',
    aliases: ['silymarin'],
    defaultUnit: 'mg',
    commonDose: '250 mg',
    defaultFrequency: 'once daily',
    benefit: 'Herb traditionally taken for liver support.',
    safetyTier: 'general',
  },
  {
    name: 'Saw palmetto',
    category: 'herbal',
    defaultUnit: 'mg',
    commonDose: '320 mg',
    defaultFrequency: 'once daily',
    benefit: 'Taken by men for prostate health and hair.',
    safetyTier: 'caution',
    bodilyChange: true,
    warning:
      `${CAUTION_PREFIX} saw palmetto affects hormones (DHT) and can thin the blood. It may also alter PSA prostate test results — tell your doctor before testing.`,
  },
  {
    name: 'Cranberry',
    category: 'herbal',
    defaultUnit: 'capsule',
    commonDose: '500 mg',
    defaultFrequency: 'once daily',
    benefit: 'Taken to support urinary tract health.',
    safetyTier: 'general',
    usageNotes: 'May slightly increase the effect of warfarin at high doses.',
  },
  {
    name: 'Green tea extract',
    category: 'herbal',
    aliases: ['egcg', 'green tea'],
    defaultUnit: 'mg',
    commonDose: '400 mg',
    defaultFrequency: 'once daily',
    benefit: 'Antioxidant extract taken for metabolism and fat loss.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} concentrated green tea extract has been linked to rare liver injury at high doses, and it contains caffeine. Take with food and avoid mega-doses.`,
  },
  {
    name: 'Ginger',
    category: 'herbal',
    defaultUnit: 'mg',
    commonDose: '500 mg',
    defaultFrequency: 'as needed',
    benefit: 'Taken for nausea, digestion, and inflammation.',
    safetyTier: 'general',
  },
  {
    name: 'Garlic extract',
    category: 'herbal',
    aliases: ['aged garlic', 'allicin'],
    defaultUnit: 'mg',
    commonDose: '600 mg',
    defaultFrequency: 'once daily',
    benefit: 'Taken for heart health and blood pressure.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} concentrated garlic can thin the blood — use caution with anticoagulants and before surgery.`,
  },
  {
    name: 'Echinacea',
    category: 'herbal',
    defaultUnit: 'mg',
    commonDose: '400 mg',
    defaultFrequency: 'as needed',
    benefit: 'Herb taken for immune support at the first sign of a cold.',
    safetyTier: 'general',
  },
  {
    name: 'Rhodiola rosea',
    category: 'herbal',
    aliases: ['rhodiola', 'golden root'],
    defaultUnit: 'mg',
    commonDose: '400 mg',
    defaultFrequency: 'once daily',
    benefit: 'Adaptogen taken for stress resilience, energy, and mental stamina.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} it can be stimulating (take earlier in the day) and may interact with antidepressants and blood-pressure medications.`,
  },
  {
    name: 'Maca root',
    category: 'herbal',
    aliases: ['maca'],
    defaultUnit: 'mg',
    commonDose: '1500 mg',
    defaultFrequency: 'once daily',
    benefit: 'Root taken for energy, libido, and stamina.',
    safetyTier: 'general',
  },
  {
    name: 'Spirulina',
    category: 'herbal',
    aliases: ['blue green algae'],
    defaultUnit: 'g',
    commonDose: '3 g',
    defaultFrequency: 'once daily',
    benefit: 'Nutrient-dense algae taken for protein, antioxidants, and energy.',
    safetyTier: 'general',
  },
  {
    name: 'St. John\'s Wort',
    category: 'herbal',
    aliases: ['hypericum'],
    defaultUnit: 'mg',
    commonDose: '300 mg',
    defaultFrequency: 'once daily',
    benefit: 'Herb traditionally taken for low mood.',
    safetyTier: 'advanced',
    warning:
      `${ADVANCED_PREFIX} St. John's Wort has some of the most serious interactions of any supplement. It weakens birth control, antidepressants, blood thinners, HIV and transplant drugs, and more, and can cause serotonin syndrome. Do not take it without talking to a doctor or pharmacist.`,
    prescribable: false,
  },

  // ── Specialty & life stage ───────────────────────────────────────────────
  {
    name: 'Prenatal vitamin',
    category: 'specialty',
    aliases: ['prenatal', 'prenatal multivitamin'],
    defaultUnit: 'tablet',
    commonDose: '1 tablet',
    defaultFrequency: 'once daily',
    benefit: 'A multivitamin with folate, iron, and DHA for pregnancy and those trying to conceive.',
    safetyTier: 'caution',
    warning:
      `${CAUTION_PREFIX} prenatals are high in iron and vitamin A — don't double up with other multivitamins or A supplements. Keep away from children due to the iron content.`,
  },
  {
    name: 'Lutein',
    category: 'specialty',
    aliases: ['lutein zeaxanthin'],
    defaultUnit: 'mg',
    commonDose: '20 mg',
    defaultFrequency: 'once daily',
    benefit: 'Carotenoid taken for eye health and to support aging vision.',
    safetyTier: 'general',
  },

  // ── Peptides & advanced compounds ────────────────────────────────────────
  {
    name: 'Retatrutide',
    category: 'peptides-advanced',
    aliases: ['reta', 'triple g'],
    defaultUnit: 'mg',
    commonDose: 'physician-directed',
    defaultFrequency: 'weekly',
    benefit: 'An investigational triple-hormone (GLP-1/GIP/glucagon) agonist studied for major weight loss.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} retatrutide is an experimental drug that is NOT FDA-approved and is not legally sold as a supplement. "Research chemical" versions are unregulated and can be unsafe or contaminated. Only use a prescribed, pharmacy-sourced product under a doctor's supervision.`,
  },
  {
    name: 'Semaglutide',
    category: 'peptides-advanced',
    aliases: ['ozempic', 'wegovy', 'rybelsus'],
    defaultUnit: 'mg',
    commonDose: 'physician-directed',
    defaultFrequency: 'weekly',
    benefit: 'A prescription GLP-1 medication for type 2 diabetes and weight management.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} semaglutide is a prescription medication, not a supplement. It requires medical supervision and dose titration, and has real side effects (nausea, pancreatitis risk, thyroid warnings). Use only a pharmacy-dispensed prescription — avoid grey-market "research" vials.`,
  },
  {
    name: 'Tirzepatide',
    category: 'peptides-advanced',
    aliases: ['mounjaro', 'zepbound'],
    defaultUnit: 'mg',
    commonDose: 'physician-directed',
    defaultFrequency: 'weekly',
    benefit: 'A prescription dual GLP-1/GIP medication for diabetes and weight loss.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} tirzepatide is a prescription medication, not a supplement. It requires medical supervision, and grey-market versions are unregulated and risky. Use only a pharmacy-dispensed prescription.`,
  },
  {
    name: 'BPC-157',
    category: 'peptides-advanced',
    defaultUnit: 'mcg',
    commonDose: 'physician-directed',
    defaultFrequency: 'daily',
    benefit: 'A research peptide popular in fitness circles for claims around tendon, gut, and injury healing.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} BPC-157 is not FDA-approved, has little human safety data, and is banned in sport (WADA). Products sold online are unregulated "research chemicals" of unknown purity. Only consider it under a knowledgeable physician.`,
  },
  {
    name: 'TB-500',
    category: 'peptides-advanced',
    aliases: ['thymosin beta-4'],
    defaultUnit: 'mg',
    commonDose: 'physician-directed',
    defaultFrequency: 'weekly',
    benefit: 'A research peptide used for claims around recovery and injury repair.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} TB-500 is not approved for human use, lacks safety data, and is banned in sport. Sold only as an unregulated research chemical. Do not use without expert medical oversight.`,
  },
  {
    name: 'GHK-Cu (copper peptide)',
    category: 'peptides-advanced',
    aliases: ['ghkcu', 'ghk copper', 'copper peptide'],
    defaultUnit: 'mg',
    commonDose: 'physician-directed',
    defaultFrequency: 'daily',
    benefit: 'A copper peptide used topically for skin/hair and studied for wound healing and anti-aging.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} topical cosmetic use is generally milder, but injectable GHK-Cu is an unregulated research chemical with little human safety data. Excess copper can be toxic. Get medical guidance before injecting anything.`,
  },
  {
    name: 'Ipamorelin',
    category: 'peptides-advanced',
    defaultUnit: 'mcg',
    commonDose: 'physician-directed',
    defaultFrequency: 'daily',
    benefit: 'A growth-hormone-releasing peptide used for claims around muscle, recovery, and body composition.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} ipamorelin manipulates growth hormone, is not FDA-approved, and is banned in sport. Unregulated sourcing and hormonal side effects make this risky without a specialist physician.`,
  },
  {
    name: 'CJC-1295',
    category: 'peptides-advanced',
    defaultUnit: 'mcg',
    commonDose: 'physician-directed',
    defaultFrequency: 'weekly',
    benefit: 'A growth-hormone-releasing peptide often stacked with ipamorelin.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} CJC-1295 alters growth hormone, is not approved for human use, and is banned in sport. Hormonal effects and unregulated products make medical supervision essential.`,
  },
  {
    name: 'MK-677 (Ibutamoren)',
    category: 'peptides-advanced',
    aliases: ['ibutamoren', 'mk677'],
    defaultUnit: 'mg',
    commonDose: 'physician-directed',
    defaultFrequency: 'daily',
    benefit: 'A growth-hormone secretagogue used for claims around muscle, appetite, and sleep.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} MK-677 raises growth hormone and can cause water retention, raised blood sugar/insulin resistance, and increased appetite. It is not approved, is banned in sport, and needs medical oversight.`,
  },
  {
    name: 'Ostarine (MK-2866)',
    category: 'peptides-advanced',
    aliases: ['mk-2866', 'sarm ostarine'],
    defaultUnit: 'mg',
    commonDose: 'physician-directed',
    defaultFrequency: 'daily',
    benefit: 'A SARM used to build muscle and preserve it while cutting.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} SARMs like ostarine suppress your natural testosterone, can strain the liver, and are not approved for human use (banned in sport, illegal to sell as supplements). Bloodwork and physician oversight are strongly advised.`,
  },
  {
    name: 'RAD-140 (Testolone)',
    category: 'peptides-advanced',
    aliases: ['testolone', 'rad140'],
    defaultUnit: 'mg',
    commonDose: 'physician-directed',
    defaultFrequency: 'daily',
    benefit: 'A potent SARM used for muscle and strength gains.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} RAD-140 strongly suppresses testosterone, stresses the liver, and is unapproved and banned in sport. It typically requires post-cycle therapy and medical monitoring. High risk — proceed only with a doctor.`,
  },
  {
    name: 'Ligandrol (LGD-4033)',
    category: 'peptides-advanced',
    aliases: ['lgd-4033', 'lgd'],
    defaultUnit: 'mg',
    commonDose: 'physician-directed',
    defaultFrequency: 'daily',
    benefit: 'A SARM used for muscle mass and strength.',
    safetyTier: 'advanced',
    bodilyChange: true,
    prescribable: true,
    warning:
      `${ADVANCED_PREFIX} ligandrol suppresses natural hormones, can affect the liver, and is unapproved and banned in sport. Needs bloodwork and medical oversight.`,
  },
]

export function isSupplementCategory(value: string): value is SupplementCategory {
  return SUPPLEMENT_CATEGORIES.some((c) => c.id === value)
}

export function supplementCategoryMeta(
  id: SupplementCategory,
): SupplementCategoryMeta | undefined {
  return SUPPLEMENT_CATEGORIES.find((c) => c.id === id)
}
