import { Link } from 'react-router-dom'

export function PrivacyPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h2>Privacy policy</h2>
        <p className="page-subtitle">Last updated: November 12, 2026</p>
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
        <h3>How we protect your health data</h3>
        <p>
          Health content you enter (medications, doses, notes, medical history, wellness and
          tracking notes, and similar fields) is <strong>encrypted on your device</strong> before
          it is synced to our database. We store ciphertext and a wrapped encryption key for your
          account. The key is unlocked with your login password on your device; we do not hold a
          copy that lets us read your encrypted health fields in our dashboard.
        </p>
        <p>
          Structural details needed to run reminders (for example dose times and schedule type)
          remain as metadata so the app can function. When you first create an account you are
          asked to save an <strong>account backup</strong> (a recovery phrase). You need that
          backup only if you forget your password and reset it. Changing your password while
          signed in does not require the backup.
        </p>
        <p>
          If you reset a forgotten password and no longer have your account backup, encrypted
          health fields from before the reset cannot be recovered by us.
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
            <strong>Encrypted health data</strong> — medications, dose logs, wellness
            check-ins, medical records, tracking notes, doctor visits, and related fields,
            stored as ciphertext after on-device encryption.
          </li>
          <li>
            <strong>Operational metadata</strong> — schedule times, dates, category flags, and
            similar fields required for reminders and list routing.
          </li>
          <li>
            <strong>Device permissions</strong> — local notification permission for dose
            reminders; photo library or camera for profile pictures and on-device label scanning.
          </li>
        </ul>
      </section>

      <section className="help-section">
        <h3>How data is stored</h3>
        <p>
          Data is stored in a Supabase (PostgreSQL) database tied to your account. Row Level
          Security ensures each signed-in user can access only their own rows at the API layer.
          Profile photos are stored in Supabase Storage. We do not sell your data.
        </p>
      </section>

      <section className="help-section">
        <h3>Third-party services</h3>
        <p>
          We use Supabase for authentication and database hosting. Medication name search may
          call the public NIH RxNorm API with the text you type.
        </p>
        <p>
          <strong>Pharmacy label scanning.</strong> When you scan a label, the photo is read on
          your device using the phone&rsquo;s built-in text recognition, and the drug name,
          strength and directions are picked out on your device. The photo is never uploaded.
          If the app can&rsquo;t make sense of a label, it asks &ldquo;Use AI to read this
          label?&rdquo; Only if you tap <em>Use AI</em>, the text read from the label (not the
          photo) is sent to Google&rsquo;s Gemini API to fill in the details. Before sending, the
          app removes lines and numbers that identify you, such as patient and prescriber names,
          addresses, phone numbers, dates and Rx numbers. Google processes this text under the{' '}
          <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">
            Gemini API terms
          </a>
          . If you say no, nothing from the label leaves your device. You can also ask for AI
          from the review screen; the same consent prompt is shown first.
        </p>
        <p>
          <strong>Safety checks.</strong> After a scan, and when you add a medication, the app
          checks the drug against your allergies, conditions and current medications. This uses a
          reference database built into the app, plus public U.S. government drug references:
          the drug&rsquo;s name may be sent to the NIH RxNorm API to identify it, and to the FDA
          (openFDA) to fetch its official label. Your allergies, conditions and medication list
          are never sent; they are compared with that information on your device. Results are
          informational and are not medical advice.
        </p>
        <p>
          Local notifications use generic wording (they do not include medication names) so
          lock-screen previews do not expose drug names.
        </p>
      </section>

      <section className="help-section">
        <h3>Your choices</h3>
        <ul>
          <li>You can edit or delete medications and logs in the app.</li>
          <li>You can sign out at any time from Account or the profile menu.</li>
          <li>
            To delete your account and associated data, use account deletion in Account
            settings when available.
          </li>
          <li>You can decline notification or photo permissions in system Settings.</li>
        </ul>
      </section>

      <section className="help-section">
        <h3>Security</h3>
        <p>
          Login passwords are hashed by Supabase Auth. Never share your login password. The
          app uses the Supabase anon key in the client together with database policies — the
          service role key is never embedded in the app.
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
