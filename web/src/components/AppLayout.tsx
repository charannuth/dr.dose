import { useCallback, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useReminderPoller } from '../hooks/useReminderPoller'
import { SIDEBAR_DOCK_QUERY } from '../lib/navigation'
import { isSidebarCollapsed, setSidebarCollapsed } from '../lib/settings'
import { Header } from './Header'
import { InAppReminderToast } from './InAppReminderToast'
import { SidebarNav } from './SidebarNav'

export type LayoutOutletContext = {
  registerAddHandler: (handler: (() => void) | null) => void
}

export function AppLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [addHandler, setAddHandler] = useState<(() => void) | null>(null)
  const docked = useMediaQuery(SIDEBAR_DOCK_QUERY)
  const [collapsed, setCollapsed] = useState(() => isSidebarCollapsed())

  useReminderPoller(user?.id)

  const registerAddHandler = useCallback((handler: (() => void) | null) => {
    setAddHandler(() => handler)
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      setSidebarCollapsed(!prev)
      return !prev
    })
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const showAdd = location.pathname === '/' && addHandler
  const shellClass = docked
    ? `app-shell app-shell-docked${collapsed ? ' is-sidebar-collapsed' : ''}`
    : 'app-shell'

  return (
    <div className={shellClass}>
      {docked && (
        <aside className={`app-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Main menu">
          <SidebarNav
            variant="docked"
            collapsed={collapsed}
            onSignOut={() => void handleSignOut()}
            onToggleCollapsed={toggleCollapsed}
          />
        </aside>
      )}
      <div className="app-main">
        <Header docked={docked} onAddClick={showAdd ? addHandler : undefined} />
        <Outlet context={{ registerAddHandler } satisfies LayoutOutletContext} />
      </div>
      <InAppReminderToast />
    </div>
  )
}
