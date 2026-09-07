import { useId, useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** Solid almond eye, shared by both states. */
const EYE_PATH =
  'M12 5C7.05 5 2.73 8.11 1 12c1.73 3.89 6.05 7 11 7s9.27-3.11 11-7c-1.73-3.89-6.05-7-11-7Z'

const SLASH = { x1: 20.5, y1: 3.5, x2: 3.5, y2: 20.5 }

/** Solid opaque eye — shown while the password is visible. */
function EyeOpenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 5C7.05 5 2.73 8.11 1 12c1.73 3.89 6.05 7 11 7s9.27-3.11 11-7c-1.73-3.89-6.05-7-11-7Zm0 9.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
      />
    </svg>
  )
}

/**
 * Solid eye with slash — default while the password is censored. The pupil and
 * the gap around the slash are masked out rather than painted, so the input
 * background shows through and the icon works in both themes.
 */
function EyeSlashIcon() {
  const maskId = `eye-slash-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#fff" />
        <circle cx="12" cy="12" r="2.9" fill="#000" />
        <line {...SLASH} stroke="#000" strokeWidth="3.6" strokeLinecap="round" />
      </mask>
      <path d={EYE_PATH} fill="currentColor" mask={`url(#${maskId})`} />
      <line {...SLASH} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={className ? `password-input ${className}` : 'password-input'}>
      <input {...props} type={visible ? 'text' : 'password'} className="password-input__field" />
      <button
        type="button"
        className="password-input__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOpenIcon /> : <EyeSlashIcon />}
      </button>
    </div>
  )
}
