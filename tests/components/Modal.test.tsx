// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from '../../apps/web/src/global/ui/Modal'

describe('Modal accessibility', () => {
  it('is a labelled dialog and focuses the first control', () => {
    render(
      <Modal open onClose={() => {}} title="Test dialog">
        <input aria-label="Name" />
        <button>Save</button>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Test dialog')
    expect(screen.getByLabelText('Name')).toHaveFocus()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal open onClose={onClose} title="Escape test">
        <button>Save</button>
      </Modal>
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    render(
      <Modal open onClose={() => {}} title="Trap test">
        <input aria-label="Name" />
        <button>Save</button>
      </Modal>
    )

    const save = screen.getByRole('button', { name: 'Save' })
    save.focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })
})
