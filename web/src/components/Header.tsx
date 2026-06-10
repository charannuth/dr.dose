import { Link, useLocation } from 'react-router-dom'
import { ProfileMenu } from './ProfileMenu'
import { ThemeToggle } from './ThemeToggle'

type HeaderProps = {
  onAddClick?: () => void
}

export function Header({ onAddClick }: HeaderProps) {
  const location = useLocation()
  const showAdd = location.pathname === '/' && onAddClick

  return (
    <header className="app-header">
      <div className="header-brand">
        <ProfileMenu />
        <Link
          to="/"
          className="header-home-link"
          aria-label="Dr. Dose — go to Today"
        >
          <h1>Dr. Dose</h1>
        </Link>
      </div>
      <div className="header-actions">
        <ThemeToggle />
        {showAdd && (
          <button
            type="button"
            className="btn btn-secondary"
            data-tour="add-medication"
            onClick={onAddClick}
          >
            Add medication
          </button>
        )}
      </div>
    </header>
  )
}
