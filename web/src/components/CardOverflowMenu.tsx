import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { NavIcon, type NavIconName } from './NavIcon'

export type CardOverflowAction = {
  label: string
  icon: NavIconName
  onSelect: () => void
  disabled?: boolean
  danger?: boolean
}

type CardOverflowMenuProps = {
  label: string
  actions: CardOverflowAction[]
}

export function CardOverflowMenu({ label, actions }: CardOverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [
      ...(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []),
    ]
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'ArrowDown' ? index + 1 : index - 1
    items[(next + items.length) % items.length]?.focus()
  }

  return (
    <div className="card-overflow" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="card-overflow-trigger"
        aria-label={label}
        title="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <NavIcon name="more" />
      </button>
      {open && (
        <div id={menuId} className="card-overflow-menu" role="menu" onKeyDown={handleMenuKeyDown}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={`card-overflow-item${action.danger ? ' danger' : ''}`}
              disabled={action.disabled}
              onClick={() => {
                setOpen(false)
                action.onSelect()
              }}
            >
              <NavIcon name={action.icon} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
