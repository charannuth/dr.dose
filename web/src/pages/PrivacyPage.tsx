import { Link } from 'react-router-dom'

export function PrivacyPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h2>Privacy policy</h2>
        <p className="page-subtitle">Last updated: June 10, 2026</p>
      </header>

      <section className="help-section">
        <h3>Overview</h3>
        <p>
          Dr. Dose (&ldquo;the app&rdquo;) helps you organize medications, doses, wellness
          notes, and optional health tracking. This policy describes what we collect, how it
          is stored, and your choices. The app is intended for personal use, not as a
          HIPAA-certified clinical product.
        </p>
      </section>

      <section className="help-section">
        <h3>Information we collect</h3>
        <ul>
          <li>
            <strong>Account data</strong> — email address, password (stored hashed by our auth
            provider), optional display name, and profile photo if you upload one.
          </li>
          <li>
            <strong>Health-related data you enter</strong> — medications, dose logs, wellness
            check-ins, medical records you choose to save (allergies, conditions, etc.),
            tracking data (for example cycle logs), and related notes.
          </li>
          <li>
            <strong>Device permissions</strong> — local notification permission for dose
            reminders; photo library or camera permission if you set a profile picture.
          </li>
        </ul>
      </section>

      <section className="help-section">
        <h3>How data is stored</h3>
        <p>
          Your data is stored in a Supabase (PostgreSQL) database tied to your account.
          Row Level Security ensures each user can access only their own rows. Profile photos
          are stored in Supabase Storage. We do not sell your data.
        </p>
      </section>

      <section className="help-section">
        <h3>Third-party services</h3>
        <p>
          We use Supabase for authentication and database hosting. Medication name search may
          call the public NIH RxNorm API. Drug interaction information is checked against a
          local reference database in the app — not sent to a third-party interaction API.
        </p>
      </section>

      <section className="help-section">
        <h3>Your choices</h3>
        <ul>
          <li>You can edit or delete medications and logs in the app.</li>
          <li>You can sign out at any time from Account or the profile menu.</li>
          <li>
            To delete your account and associated data, contact the app operator or use account
            deletion when available in Account settings.
          </li>
          <li>You can decline notification or photo permissions in iOS Settings.</li>
        </ul>
      </section>

      <section className="help-section">
        <h3>Security</h3>
        <p>
          Passwords are hashed by Supabase Auth. Never share your password. The app uses the
          Supabase anon key in the client together with database policies — the service role
          key is never embedded in the app.
        </p>
      </section>

      <section className="help-section">
        <h3>Children</h3>
        <p>The app is not directed at children under 13.</p>
      </section>

      <section className="help-section">
        <h3>Contact</h3>
        <p>
          Questions about this policy: use the contact method listed on your App Store listing
          or project repository.
        </p>
      </section>

      <p className="page-footer-hint">
        <Link to="/help">Help &amp; safety</Link>
        {' · '}
        <Link to="/terms">Terms of use</Link>
      </p>
    </main>
  )
}
