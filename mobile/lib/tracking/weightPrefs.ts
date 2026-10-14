/** Weight tracker personalization (tracker_preferences, tracker_id = 'weight'). */

export type WeightFocus = 'lose' | 'gain' | 'maintain' | 'observe'

export type WeightPrefs = {
  focus: WeightFocus | null
  /** Off hides calorie targets and meal calorie fields entirely. */
  showCalories: boolean
  /** Blind weigh-ins: the number is masked everywhere in this tracker. */
  hideWeightNumber: boolean
  configured: boolean
}

export const WEIGHT_FOCUS_OPTIONS: { value: WeightFocus; label: string; emoji: string; hint: string }[] = [
  { value: 'observe', label: 'Just keeping an eye on it', emoji: '👀', hint: 'No targets, no pressure' },
  { value: 'maintain', label: 'Stay where I am', emoji: '⚖️', hint: 'Maintenance only' },
  { value: 'gain', label: 'Gain weight', emoji: '🌱', hint: 'Recovery, muscle, pregnancy, health' },
  { value: 'lose', label: 'Lose weight', emoji: '🏃‍♀️', hint: 'Gentle, steady targets' },
]

export function normalizeWeightPrefs(raw: Record<string, unknown>): WeightPrefs {
  const focus = WEIGHT_FOCUS_OPTIONS.some((o) => o.value === raw.focus) ? (raw.focus as WeightFocus) : null
  return {
    focus,
    showCalories: typeof raw.showCalories === 'boolean' ? raw.showCalories : focus !== 'observe',
    hideWeightNumber: raw.hideWeightNumber === true,
    configured: raw.configured === true,
  }
}

/** Goal / pace pickers only make sense when actively changing weight. */
export function weightFocusUsesGoal(focus: WeightFocus | null): boolean {
  return focus == null || focus === 'lose' || focus === 'gain'
}
