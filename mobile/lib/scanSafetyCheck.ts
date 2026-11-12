import { severityLabel, resolveDrugNames } from './drugInteractions';
import { fetchFdaLabel, type FdaLabelSections } from './fdaDrugLabel';
import { buildMedicationSafetyReview } from './medicationSafetyReview';
import {
  directAllergyMatches,
  duplicateTherapyMatches,
  findTermMentions,
  sortFindings,
  verdictFromFindings,
  type ScanFinding,
  type ScanVerdict,
} from './scanSafetyVerdict';

export type ScanSafetyInput = {
  drugName: string;
  brandName?: string;
  currentMedicationNames: string[];
  allergies: string[];
  conditions: string[];
};

export type ScanSafetyResult = {
  verdict: ScanVerdict;
  findings: ScanFinding[];
  /** Set when the FDA label lookup could not run (e.g. offline). */
  fdaUnavailable: boolean;
  dailyMedUrl: string | null;
};

const LOCAL_SOURCE = 'Dr. Dose reference data';
const FDA_SOURCE = 'FDA drug label (openFDA)';

/**
 * Runs automatically after a label scan: checks the scanned drug against the user's
 * allergies, conditions and current medications. Informational only.
 */
export async function runScanSafetyCheck(input: ScanSafetyInput): Promise<ScanSafetyResult> {
  const drugName = input.drugName.trim();
  const others = input.currentMedicationNames
    .map((n) => n.trim())
    .filter((n) => n && n.toLowerCase() !== drugName.toLowerCase());

  const [review, resolvedCurrent, fda] = await Promise.all([
    buildMedicationSafetyReview(drugName, others, input.allergies, input.conditions),
    resolveDrugNames(input.currentMedicationNames),
    fetchFdaLabel(drugName)
      .then((label) => ({ label, failed: false }))
      .catch(() => ({ label: null as FdaLabelSections | null, failed: true })),
  ]);

  const findings: ScanFinding[] = [];

  // 1. Allergies: category cross-reactions (penicillins, sulfa, NSAIDs…) from local data.
  for (const w of review.allergyWarnings) {
    findings.push({
      kind: 'allergy',
      severity: 'danger',
      title: `Allergy: ${w.allergyLabel}`,
      detail: `You listed "${w.userAllergyText}". ${w.description} ${w.management}`.trim(),
      source: LOCAL_SOURCE,
    });
  }
  // …and allergies written as the drug name itself.
  const alreadyFlagged = new Set(review.allergyWarnings.map((w) => w.userAllergyText.toLowerCase()));
  for (const hit of directAllergyMatches(
    [drugName, input.brandName, review.canonical, ...(fda.label?.genericNames ?? [])],
    input.allergies,
  )) {
    if (alreadyFlagged.has(hit.toLowerCase())) continue;
    findings.push({
      kind: 'allergy',
      severity: 'danger',
      title: `Allergy: ${hit}`,
      detail: `You listed an allergy to "${hit}", which matches this medication. Do not take it until a pharmacist or doctor confirms it's safe.`,
      source: 'Your medical record',
    });
  }

  // 2. Conditions.
  for (const w of review.conditionWarnings) {
    findings.push({
      kind: 'condition',
      severity: w.severity === 'major' ? 'danger' : 'caution',
      title: `Condition: ${w.conditionLabel}`,
      detail: `${w.description} ${w.management}`.trim(),
      source: LOCAL_SOURCE,
    });
  }

  // 3. Interactions with current medications (curated local pairs + class rules).
  for (const i of review.existingMedInteractions) {
    findings.push({
      kind: 'interaction',
      severity: i.severity === 'major' ? 'danger' : i.severity === 'moderate' ? 'caution' : 'info',
      title: `${i.displayA} + ${i.displayB} (${severityLabel(i.severity)})`,
      detail: `${i.description} ${i.management}`.trim(),
      source: LOCAL_SOURCE,
    });
  }

  // 4. Same ingredient already on the list.
  for (const dup of duplicateTherapyMatches(review.canonical, drugName, resolvedCurrent)) {
    findings.push({
      kind: 'duplicate',
      severity: 'caution',
      title: `Already on your list: ${dup}`,
      detail:
        "If this is a refill, you're fine. If it's a second prescription, taking both could double your dose, so check with your pharmacist.",
      source: 'Your medication list',
    });
  }

  // 5. FDA label: current medications named in its contraindications or interactions.
  const label = fda.label;
  if (label) {
    const flaggedPairs = new Set(
      review.existingMedInteractions.flatMap((i) => [i.displayA.toLowerCase(), i.displayB.toLowerCase()]),
    );
    const medTerms = [
      ...others,
      ...resolvedCurrent.map((r) => r.canonical).filter((c): c is string => Boolean(c)),
    ];
    const strong = findTermMentions(`${label.boxedWarning}\n${label.contraindications}`, medTerms);
    for (const med of strong) {
      if (flaggedPairs.has(med.toLowerCase())) continue;
      findings.push({
        kind: 'label-contraindication',
        severity: 'danger',
        title: `FDA label warns about ${med}`,
        detail: `The official label for ${drugName} mentions ${med} in its contraindications or boxed warning.`,
        source: FDA_SOURCE,
      });
    }
    const strongSet = new Set(strong.map((s) => s.toLowerCase()));
    for (const med of findTermMentions(label.drugInteractions, medTerms)) {
      if (strongSet.has(med.toLowerCase()) || flaggedPairs.has(med.toLowerCase())) continue;
      findings.push({
        kind: 'label-interaction',
        severity: 'caution',
        title: `Possible interaction with ${med}`,
        detail: `The official label for ${drugName} lists ${med} under drug interactions.`,
        source: FDA_SOURCE,
      });
    }
    const allergyInLabel = findTermMentions(label.contraindications, input.allergies).filter(
      (a) => !findings.some((f) => f.kind === 'allergy' && f.title.toLowerCase().includes(a.toLowerCase())),
    );
    for (const allergy of allergyInLabel) {
      findings.push({
        kind: 'label-contraindication',
        severity: 'danger',
        title: `FDA label mentions your allergy: ${allergy}`,
        detail: `The contraindications on the official label for ${drugName} mention ${allergy}.`,
        source: FDA_SOURCE,
      });
    }
  }

  const sorted = sortFindings(findings);
  const verdict = verdictFromFindings(sorted, {
    drugName,
    drugIdentified: Boolean(review.canonical || label),
    allergyCount: input.allergies.filter((a) => a.trim()).length,
    medicationCount: others.length,
  });

  return {
    verdict,
    findings: sorted,
    fdaUnavailable: fda.failed,
    dailyMedUrl: label?.dailyMedUrl ?? null,
  };
}
