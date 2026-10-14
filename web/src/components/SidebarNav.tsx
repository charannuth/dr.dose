import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getDisplayName } from '../lib/profile'
import { NAV_GROUPS } from '../lib/navigation'
import { NavIcon } from './NavIcon'
import { ProfileAvatar } from './ProfileAvatar'

type SidebarNavProps = {
  /** `drawer` slides over content on phones/tablets; `docked` stays beside it on laptops. */
  variant: 'drawer' | 'docked'
  collapsed?: boolean
  onNavigate?: () => void
  onSignOut: () => void
  onToggleCollapsed?: () => void
}

export function SidebarNav({
  variant,
  collapsed = false,
  onNavigate,
  onSignOut,
  onToggleCollapsed,
}: SidebarNavProps) {
  const { user } = useAuth()
  const displayName = getDisplayName(user)
  const docked = variant === 'docked'

  const userCard = (
    <>
      <ProfileAvatar user={user} size={docked ? 'sm' : 'lg'} />
      <span className="sidebar-user-text">
        <span className="sidebar-user-name">{displayName ?? 'Signed in'}</span>
        <span className="sidebar-user-email">{user?.email}</span>
      </span>
    </>
  )

  return (
    <>
      {docked ? (
        <div className="sidebar-top">
          <Link to="/" className="header-home-link sidebar-brand" aria-label="Dr. Dose — go to Today">
            <h1>{collapsed ? 'Dd' : 'Dr. Dose'}</h1>
          </Link>
          <button
            type="button"
            className="sidebar-icon-btn sidebar-collapse-btn"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <NavIcon name={collapsed ? 'expand' : 'collapse'} />
          </button>
        </div>
      ) : (
        <div className="sidebar-top sidebar-user sidebar-user-static">{userCard}</div>
      )}

      <nav className="sidebar-nav" data-tour="drawer-nav" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="sidebar-group">
            <p className="sidebar-group-label">{group.label}</p>
            <ul className="sidebar-group-list">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    data-tour={item.to === '/streaks' ? 'drawer-streaks' : undefined}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    onClick={onNavigate}
                  >
                    <NavIcon name={item.icon} />
                    <span className="sidebar-link-label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {docked && (
          <Link
            to="/account"
            className="sidebar-user"
            data-tour="profile-menu"
            title={collapsed ? 'My account' : undefined}
            aria-label={collapsed ? 'My account' : undefined}
            onClick={onNavigate}
          >
            {userCard}
          </Link>
        )}
        <button
          type="button"
          className="sidebar-link sidebar-sign-out"
          onClick={onSignOut}
          title={collapsed ? 'Sign out' : undefined}
          aria-label={collapsed ? 'Sign out' : undefined}
        >
          <NavIcon name="signOut" />
          <span className="sidebar-link-label">Sign out</span>
        </button>
      </div>
    </>
  )
}
