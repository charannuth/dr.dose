import type { SameTimeDoseGroup } from '../lib/sameTimeDoseGroups'
import { sameTimePendingItemKey } from '../lib/sameTimeDoseGroups'
import type { SameTimeDoseMode } from '../lib/settings'

type GroupBarProps = {
  group: SameTimeDoseGroup
  mode: SameTimeDoseMode
  disabled: boolean
  busy: boolean
  onTakeAll: () => void
  onChoose: () => void
}

export function SameTimeDoseGroupBar({
  group,
  mode,
  disabled,
  busy,
  onTakeAll,
  onChoose,
}: GroupBarProps) {
  if (mode === 'individual' || group.pending.length < 2) return null

  if (mode === 'take_all') {
    return (
      <button
        type="button"
        className="btn btn-primary btn-sm same-time-dose-bar-btn"
        disabled={disabled || busy}
        onClick={onTakeAll}
      >
        {busy ? '…' : `Take all (${group.pending.length})`}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm same-time-dose-bar-btn"
      disabled={disabled || busy}
      onClick={onChoose}
    >
      Choose doses
    </button>
  )
}

type ChooseModalProps = {
  open: boolean
  group: SameTimeDoseGroup | null
  selectedKeys: Set<string>
  busy: boolean
  onToggle: (key: string) => void
  onSelectAll: () => void
  onClearAll: () => void
  onConfirm: () => void
  onClose: () => void
}

export function SameTimeDoseChooseModal({
  open,
  group,
  selectedKeys,
  busy,
  onToggle,
  onSelectAll,
  onClearAll,
  onConfirm,
  onClose,
}: ChooseModalProps) {
  if (!open || !group) return null

  const selectedCount = group.pending.filter((item) =>
    selectedKeys.has(sameTimePendingItemKey(item.med.id, item.time)),
  ).length

  return (
    <div className="same-time-dose-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="same-time-dose-modal"
        role="dialog"
        aria-labelledby="same-time-dose-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="same-time-dose-modal-title">Doses at {group.label}</h4>
        <p className="field-hint">
          Select the medications you took. Each one is logged the same as Mark taken on that
          medication.
        </p>

        <div className="same-time-dose-modal-quick">
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onSelectAll}>
            Select all
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onClearAll}>
            Clear
          </button>
        </div>

        <ul className="same-time-dose-modal-list">
          {group.pending.map((item) => {
            const key = sameTimePendingItemKey(item.med.id, item.time)
            const checked = selectedKeys.has(key)
            return (
              <li key={key}>
                <label className={`same-time-dose-modal-row${checked ? ' checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={() => onToggle(key)}
                  />
                  <span>{item.med.name}</span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className="same-time-dose-modal-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || selectedCount === 0}
            onClick={onConfirm}
          >
            {busy ? '…' : `Mark ${selectedCount} taken`}
          </button>
        </div>
      </div>
    </div>
  )
}
