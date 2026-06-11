import { Link } from 'react-router-dom'

export function HelpPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h2>Help & safety</h2>
        <p className="page-subtitle">How to use Dr. Dose</p>
      </header>

      <section className="help-section">
        <h3>Using the app</h3>
        <ul>
          <li>
            <strong>Today</strong> — mark each scheduled dose separately (e.g. morning
            and evening are two doses). Use <strong>Move to as needed</strong> or{' '}
            <strong>Move to daily schedule</strong> to switch types without re-adding a
            medication. Refill and
            missed-dose banners appear when relevant.
          </li>
          <li>
            <strong>History</strong> — 42-day calendar, weekly summary, and dose list.
            Tap a day to filter.
          </li>
          <li>
            <strong>Tracking</strong> — optional modules (cycle, HRT, medication progress).
            Set your physical profile (editable anytime). HRT doses logged on Today sync
            here when you enable <strong>Sync doses to Tracking → HRT</strong> on a
            medication.
          </li>
          <li>
            <strong>My account → Medications</strong> — add, edit, or remove medications.
            When you type a name, suggestions come from a built-in list plus{' '}
            <a href="https://www.nlm.nih.gov/research/umls/rxnorm/index.html" target="_blank" rel="noreferrer">
              RxNorm (NIH)
            </a>{' '}
            (brands and generics such as Lipitor, Tylenol, lisinopril). Set a{' '}
            <strong>start date</strong> and optional <strong>end date</strong> for each
            schedule (e.g. a short antibiotic course).
          </li>
          <li>
            <strong>Medical records</strong> — self-reported allergies, blood type, and
            conditions (not certified clinical records). <strong>Doctor visits</strong>{' '}
            — schedule appointments and save notes after your visit.{' '}
            <strong>Drug safety check</strong> — cross-reference medications and your
            allergy list (always ask a pharmacist).
          </li>
          <li>
            <strong>History</strong> — {42}-day calendar; tap a day for doses and wellness
            notes. <strong>Streaks</strong> — current streak and tulip badge milestones.{' '}
            <strong>My account</strong> — profile, timezone, theme, reminders, and sign out.
          </li>
        </ul>
      </section>

      <section className="help-section">
        <h3>Streaks &amp; History</h3>
        <p>
          A <strong>perfect day</strong> means you logged every scheduled dose that day.
          Your current streak counts consecutive perfect days. Today still counts as in
          progress until the day ends — missing doses after that breaks the streak. On{' '}
          <strong>History</strong>, the color calendar shows perfect, partial, and missed
          days; tap one to see each dose and your wellness check-in. On{' '}
          <strong>Streaks</strong>, see tulip badges and how many consecutive perfect days
          each one requires.
        </p>
      </section>

      <section className="help-section">
        <h3>Reminders & missed doses</h3>
        <p>
          Enable browser reminders in <strong>My account</strong> while the app is open.
          They fire at scheduled dose times if you have not logged that dose yet. The
          missed-doses banner on Today shows yesterday&apos;s gaps and today&apos;s past-due
          slots.
        </p>
      </section>

      <section className="help-section">
        <h3>Preventing double doses</h3>
        <p>
          Each dose <em>time</em> can only be marked once per day. Add one row per daily
          dose (12-hour time + AM/PM). Use{' '}
          <strong>Undo</strong> on a slot if you logged it by mistake. Pill counts drop
          by one each time you mark a dose taken.
        </p>
      </section>

      <section className="help-section help-warning">
        <h3>Medical disclaimer</h3>
        <p>
          Dr. Dose is for personal organization only. It does not provide medical
          advice. Always follow instructions from your doctor or pharmacist. Call
          emergency services for urgent medical problems.
        </p>
      </section>

      <p className="page-footer-hint">
        <Link to="/privacy">Privacy policy</Link>
        {' · '}
        <Link to="/terms">Terms of use</Link>
        {' · '}
        <Link to="/">Back to Today</Link>
      </p>
    </main>
  )
}
