import { Link } from 'react-router-dom'

export function TermsPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h2>Terms of use</h2>
        <p className="page-subtitle">Last updated: June 10, 2026</p>
      </header>

      <section className="help-section">
        <h3>Acceptance</h3>
        <p>
          By creating an account or using Dr. Dose, you agree to these terms. If you do not
          agree, do not use the app.
        </p>
      </section>

      <section className="help-section">
        <h3>Not medical advice</h3>
        <p>
          Dr. Dose is a personal organization tool. It does not provide medical advice,
          diagnosis, or treatment. Drug interaction and safety information may be incomplete
          or outdated. Always follow instructions from your doctor, pharmacist, or other
          qualified health provider. Call emergency services for urgent medical problems.
        </p>
      </section>

      <section className="help-section">
        <h3>Your account</h3>
        <p>
          You are responsible for keeping your login credentials secure and for activity under
          your account. Provide accurate information when signing up. You must be at least 13
          years old to use the app.
        </p>
      </section>

      <section className="help-section">
        <h3>Acceptable use</h3>
        <p>
          Do not misuse the service, attempt to access other users&apos; data, or interfere
          with app operation. Do not use the app for unlawful purposes.
        </p>
      </section>

      <section className="help-section">
        <h3>Availability</h3>
        <p>
          We strive for reliable service but do not guarantee uninterrupted access. Features
          may change. Reminders depend on your device and notification settings — missed
          reminders do not replace professional medical guidance.
        </p>
      </section>

      <section className="help-section">
        <h3>Limitation of liability</h3>
        <p>
          To the fullest extent permitted by law, Dr. Dose is provided &ldquo;as is&rdquo;
          without warranties. We are not liable for decisions you make based on app
          information or for missed doses, incorrect logs, or data loss. Use at your own
          risk.
        </p>
      </section>

      <section className="help-section">
        <h3>Changes</h3>
        <p>
          We may update these terms. Continued use after changes means you accept the updated
          terms. Material changes may be noted in the app or repository.
        </p>
      </section>

      <p className="page-footer-hint">
        <Link to="/privacy">Privacy policy</Link>
        {' · '}
        <Link to="/help">Help &amp; safety</Link>
      </p>
    </main>
  )
}
