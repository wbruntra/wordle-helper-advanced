import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import './Modal.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ComponentChildren
  children: ComponentChildren
  /** Fixed footer content, e.g. action buttons. */
  footer?: ComponentChildren
  wide?: boolean
}

/** A modal dialog built on the native <dialog> element (focus trap, Escape, backdrop come for free). */
export function Modal({ open, onClose, title, children, footer, wide }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      class={`modal${wide ? ' modal-wide' : ''}`}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
    >
      {open && (
        <div class="modal-panel">
          <header class="modal-header">
            <h2>{title}</h2>
            <button class="icon-btn" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
          <div class="modal-body">{children}</div>
          {footer && <footer class="modal-footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
