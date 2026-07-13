import { useEffect, useRef, useState } from 'react'
import { formatTimeLabel } from '../lib/dateUtils'
import { colorFor } from '../lib/eventColors'

export default function EventBlock({
  instance,
  style,
  editing,
  selected,
  onCommitTitle,
  onRequestDelete,
  onRequestDetails,
  onDragMoveStart,
  onDragResizeStart,
  compact,
}) {
  const inputRef = useRef(null)
  const [draftTitle, setDraftTitle] = useState(instance.title)
  const c = colorFor(instance.color)

  useEffect(() => {
    setDraftTitle(instance.title)
  }, [instance.title, editing])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function commit() {
    onCommitTitle(draftTitle.trim() || 'Untitled')
  }

  const controlsVisible = selected && !editing

  return (
    <div
      className={`group absolute rounded-lg px-2 py-1 shadow-soft hover:shadow-pop hover:z-20 transition-shadow overflow-hidden select-none ${
        selected ? 'ring-2 ring-ink-800 z-30' : ''
      }`}
      style={{ ...style, backgroundColor: c.bg, border: `1px solid ${c.border}55`, borderLeft: `3px solid ${c.border}` }}
      data-event-block
      onPointerDown={(e) => {
        if (editing) return
        e.stopPropagation()
      }}
    >
      {/* Body: drag to move; a plain press-release (no move) is a click, handled by the grid. */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (editing) return
          onDragMoveStart(e)
        }}
      />

      <div className="relative pointer-events-none">
        {editing ? (
          <input
            ref={inputRef}
            className="pointer-events-auto w-full bg-white/90 rounded px-1 py-0.5 text-xs font-medium text-ink-800 outline outline-2 outline-moss-400"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              } else if (e.key === 'Escape') {
                setDraftTitle(instance.title)
                commit()
              }
            }}
          />
        ) : (
          <>
            <p className="text-xs font-medium text-ink-800 truncate leading-tight">
              {instance.title || 'Untitled'}
            </p>
            {!compact && (
              <p className="text-[10px] truncate leading-tight" style={{ color: c.text }}>
                {formatTimeLabel(instance.start_time)}
              </p>
            )}
          </>
        )}
      </div>

      {instance.isRecurring && !editing && (
        <span
          className="absolute bottom-1 right-1.5 text-moss-400 pointer-events-none"
          title="Repeating event"
          style={{ fontSize: 10 }}
        >
          ↻
        </span>
      )}

      {/* Hover/selected controls: details + delete. Keyboard (Del / dbl-click) covers desktop;
          these give a tap target on mobile. */}
      {!editing && (
        <div
          className={`absolute top-0.5 right-0.5 flex gap-0.5 transition-opacity pointer-events-auto ${
            controlsVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-active:opacity-100'
          }`}
        >
          <button
            className="w-5 h-5 rounded-full bg-white/90 text-ink-500 hover:text-ink-800 flex items-center justify-center text-[10px] leading-none shadow-soft"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onRequestDetails()
            }}
            aria-label="Event details"
          >
            ⋯
          </button>
          <button
            className="w-5 h-5 rounded-full bg-white/90 text-ink-500 hover:text-rose-500 flex items-center justify-center text-xs leading-none shadow-soft"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onRequestDelete()
            }}
            aria-label="Delete event"
          >
            ×
          </button>
        </div>
      )}

      {/* Bottom resize handle: drag to change duration. */}
      {!editing && (
        <div
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 group-active:opacity-100"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.stopPropagation()
            onDragResizeStart(e)
          }}
        >
          <div className="mx-auto mt-1.5 w-6 h-0.5 rounded-full bg-moss-400" />
        </div>
      )}
    </div>
  )
}
