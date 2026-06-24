import { Link } from 'react-router-dom'

const SUPPORT_EMAIL = 'ncharan2023@gmail.com'

export function SupportPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h2>Support</h2>
        <p className="page-subtitle">Help and contact for Dr. Dose</p>
      </header>

      <section className="help-section">
        <h3>Contact us</h3>
        <p>
          Need help, have a question, or found a problem? Email us and we&apos;ll get back
          to you, usually within 2&ndash;3 business days.
        </p>
        <p>
          <strong>Email:</strong>{' '}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Dr.%20Dose%20support`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>
          When reporting a problem, it helps to include your device model, iOS version, and
          a short description of what happened.
        </p>
      </section>

      <section className="help-section">
        <h3>What is Dr. Dose?</h3>
        <p>
          Dr. Dose helps you organize your medications, track your daily doses, set
          reminders, log wellness check-ins, and keep notes for doctor visits. Your data is
          tied to your own account and is private to you.
        </p>
      </section>

      <section className="help-section">
        <h3>Frequently asked questions</h3>
        <ul>
          <li>
            <strong>How do I add a medication?</strong> Go to <strong>My account →
            Medications</strong> (or the add button on Today), type the name, and set the
            schedule, start date, and optional end date.
          </li>
          <li>
            <strong>How do reminders work?</strong> Enable notifications in{' '}
            <strong>My account</strong>. Dr. Dose sends a reminder at each scheduled dose
            time if you haven&apos;t logged that dose yet.
          </li>
          <li>
            <strong>How do I mark a dose as taken?</strong> On the <strong>Today</strong>{' '}
            screen, tap the dose to mark it taken. Use <strong>Undo</strong> if you logged
            it by mistake.
          </li>
          <li>
            <strong>How do I reset my password?</strong> On the sign-in screen, choose{' '}
            <strong>Forgot password</strong> and follow the email link.
          </li>
          <li>
            <strong>How do I delete my account and data?</strong> Email us at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20Dr.%20Dose%20account`}>
              {SUPPORT_EMAIL}
            </a>{' '}
            and we&apos;ll remove your account and associated data.
          </li>
        </ul>
      </section>

      <section className="help-section help-warning">
        <h3>Medical disclaimer</h3>
        <p>
          Dr. Dose is for personal organization only and does not provide medical advice.
          Always follow instructions from your doctor or pharmacist, and call emergency
          services for urgent medical problems.
        </p>
      </section>

      <p className="page-footer-hint">
        <Link to="/privacy">Privacy policy</Link>
        {' · '}
        <Link to="/terms">Terms of use</Link>
      </p>
    </main>
  )
}
