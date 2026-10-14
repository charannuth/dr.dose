import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { registerDemoTourMenu, unregisterDemoTourMenu } from '../lib/demoTourMenu'
import { ProfileAvatar } from './ProfileAvatar'
import { SidebarNav } from './SidebarNav'

const CLOSE_DELAY_MS = 220
const SIDEBAR_TRANSITION_MS = 300
/** Desktop with mouse — hover opens; touch screens use tap only. */
const HOVER_MENU_MEDIA = '(hover: hover) and (pointer: fine)'

export function ProfileMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const sidebarId = useId()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [canHoverMenu, setCanHoverMenu] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(HOVER_MENU_MEDIA)
    const update = () => setCanHoverMenu(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const beginClose = useCallback(() => {
    cancelScheduledClose()
    setVisible(false)
  }, [cancelScheduledClose])

  const scheduleClose = useCallback(() => {
    cancelScheduledClose()
    closeTimerRef.current = setTimeout(() => {
      beginClose()
    }, CLOSE_DELAY_MS)
  }, [cancelScheduledClose, beginClose])

  const closeMenu = useCallback(() => {
    setPinned(false)
    beginClose()
  }, [beginClose])

  const openMenu = useCallback(() => {
    cancelScheduledClose()
    if (!mounted) {
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return
    }
    setVisible(true)
  }, [cancelScheduledClose, mounted])

  useEffect(() => {
    return () => cancelScheduledClose()
  }, [cancelScheduledClose])

  useEffect(() => {
    registerDemoTourMenu(
      () => {
        setPinned(true)
        openMenu()
      },
      () => {
        setPinned(false)
        closeMenu()
      },
    )
    return () => unregisterDemoTourMenu()
  }, [openMenu, closeMenu])

  useEffect(() => {
    if (!mounted || visible) return

    const timeout = window.setTimeout(() => {
      setMounted(false)
      setPinned(false)
    }, SIDEBAR_TRANSITION_MS)

    return () => window.clearTimeout(timeout)
  }, [mounted, visible])

  useEffect(() => {
    if (!mounted) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mounted, closeMenu])

  function handleTriggerMouseEnter() {
    if (!canHoverMenu) return
    openMenu()
  }

  function handleTriggerMouseLeave() {
    if (!canHoverMenu || pinned) return
    scheduleClose()
  }

  function handleSidebarMouseEnter() {
    if (!canHoverMenu) return
    openMenu()
  }

  function handleSidebarMouseLeave() {
    if (!canHoverMenu || pinned) return
    scheduleClose()
  }

  function handleTriggerClick() {
    cancelScheduledClose()

    if (canHoverMenu) {
      if (visible && pinned) {
        closeMenu()
        return
      }
      setPinned(true)
      openMenu()
      return
    }

    if (visible) {
      closeMenu()
      return
    }

    setPinned(false)
    openMenu()
  }

  async function handleSignOut() {
    closeMenu()
    await signOut()
    navigate('/')
  }

  const sidebar =
    mounted && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              className={`profile-sidebar-backdrop${visible ? ' is-visible' : ''}`}
              aria-label="Close menu"
              tabIndex={visible ? 0 : -1}
              onClick={closeMenu}
            />
            <aside
              id={sidebarId}
              className={`profile-sidebar${visible ? ' is-visible' : ''}`}
              aria-label="Main menu"
              aria-hidden={!visible}
              onMouseEnter={canHoverMenu ? handleSidebarMouseEnter : undefined}
              onMouseLeave={canHoverMenu ? handleSidebarMouseLeave : undefined}
            >
              <SidebarNav
                variant="drawer"
                onNavigate={closeMenu}
                onSignOut={() => void handleSignOut()}
              />
            </aside>
          </>,
          document.body,
        )
      : null

  return (
    <div className="profile-menu">
      <button
        type="button"
        className={`profile-trigger${visible ? ' profile-trigger-open' : ''}`}
        data-tour="profile-menu"
        aria-expanded={visible}
        aria-controls={sidebarId}
        aria-haspopup="dialog"
        aria-label={visible ? 'Close menu' : 'Open menu'}
        onClick={handleTriggerClick}
        onMouseEnter={canHoverMenu ? handleTriggerMouseEnter : undefined}
        onMouseLeave={canHoverMenu ? handleTriggerMouseLeave : undefined}
      >
        <ProfileAvatar user={user} size="sm" />
      </button>
      {sidebar}
    </div>
  )
}
