import { Link } from 'react-router-dom'
import { setOnboardingDone } from '../lib/settings'

type OnboardingModalProps = {
  userId: string
  onDone: () => void
  onStartTour: () => void
  onAddMedication: () => void
}

export function OnboardingModal({
  userId,
  onDone,
  onStartTour,
  onAddMedication,
}: OnboardingModalProps) {
  function finish() {
    setOnboardingDone(userId)
    onDone()
  }

  function handleTour() {
    setOnboardingDone(userId)
    onStartTour()
  }

  function handleAdd() {
    setOnboardingDone(userId)
    onAddMedication()
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal onboarding-modal"
        role="dialog"
        aria-labelledby="onboarding-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="onboarding-title">Welcome to Dr. Dose</h2>
        <ol className="onboarding-steps">
          <li>Add your medications with dose times (12-hour + AM/PM).</li>
          <li>On <strong>Today</strong>, mark each dose when you take it.</li>
          <li>Build a streak by logging every scheduled dose each day.</li>
          <li>
            <Link to="/history" onClick={finish}>History</Link> for your calendar and daily
            notes; <Link to="/streaks" onClick={finish}>Streaks</Link> for tulip badges.
          </li>
        </ol>
        <div className="form-actions onboarding-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={finish}>
            Skip for now
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleTour}>
            Show me around
          </button>
          <button type="button" className="btn btn-primary" onClick={handleAdd}>
            Add first medication
          </button>
        </div>
      </div>
    </div>
  )
}
