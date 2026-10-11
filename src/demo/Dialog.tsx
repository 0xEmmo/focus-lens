import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from '../panel/Icon'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** A native modal <dialog>: the browser handles the focus trap, Escape and the inert background. */
export function Dialog({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dlg"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="dlg-in">
        <header>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
