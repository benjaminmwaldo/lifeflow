import { useEffect, useRef, useState } from 'react'
import { formatTimeLabel } from '../lib/dateUtils'

export default function EventBlock({
  instance,
  style,
  editing,
  onCommitTitle,
  onRequestEdit,
  onRequestDelete,
  onRequestDetails,
  onDragMoveStart,
  onDragResizeStart,
  compact,
}) {
  const inputRef = useRef(null)
  const [draftTitle, setDraftTitle] = useState(instance.title)

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

  return (
    <div
      className="group absolute rounded-lg px-2 py-1 bg-moss-50 border border-moss-100 shadow-soft hover:shadow-pop hover:z-20 transition-shadow overflow-hidden select-none"
      style={{ ...style, borderLeft: '3px solid #2F6F62' }}
      data-event-block
      onPointerDown={(e) => {
        if (editing) return
        e.stopPropagation()
      }}
    >
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (editing) return
          onDragMoveStart(e)
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onRequestEdit()
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
              <p className="text-[10px] text-moss-600 truncate leading-tight">
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

      {!editing && (
        <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity pointer-events-auto">
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
      {!editing && (
        <button
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white/90 text-ink-500 hover:text-ink-800 flex items-center justify-center text-[10px] leading-none shadow-soft opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onRequestDetails()
          }}
          aria-label="Event details"
        >
          ⋯
        </button>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize opacity-0 group-hover:opacity-100 group-active:opacity-100"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.stopPropagation()
          onDragResizeStart(e)
        }}
      >
        <div className="mx-auto mt-1 w-6 h-0.5 rounded-full bg-moss-400" />
      </div>
    </div>
  )
}
