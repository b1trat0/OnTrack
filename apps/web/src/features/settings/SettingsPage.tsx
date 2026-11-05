import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, KeyRound, LogOut, ShieldAlert, Trash2, UserRound } from 'lucide-react'
import { useUserStore } from '../../global/stores/useUserStore'
import { useToastStore } from '../../global/stores/useToastStore'
import { toErrorMessage } from '../../global/lib/api'
import {
  changePassword,
  exportAccount,
  updateProfile,
} from '../../global/repositories/auth.repository'
import { Card } from '../../global/ui/Card'
import { Button } from '../../global/ui/Button'
import { Field, Input } from '../../global/ui/Field'

export function SettingsPage() {
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)
  const signOut = useUserStore((state) => state.signOut)
  const deleteAccount = useUserStore((state) => state.deleteAccount)
  const pushToast = useToastStore((state) => state.push)
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [exporting, setExporting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const updated = await updateProfile({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
      })
      setUser(updated)
      pushToast({ title: 'Profile updated', level: 'info' })
    } catch (error) {
      pushToast({ title: 'Could not update profile', message: toErrorMessage(error), level: 'error' })
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async () => {
    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      pushToast({
        title: 'Password changed',
        message: 'Signing you out so every session uses the new password.',
        level: 'info',
      })
      await signOut()
      navigate('/sign-in')
    } catch (error) {
      pushToast({ title: 'Could not change password', message: toErrorMessage(error), level: 'error' })
    } finally {
      setSavingPassword(false)
    }
  }

  const downloadExport = async () => {
    setExporting(true)
    try {
      const data = await exportAccount()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `ontrack-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      pushToast({ title: 'Export downloaded', level: 'info' })
    } catch (error) {
      pushToast({ title: 'Could not export data', message: toErrorMessage(error), level: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteConfirm !== 'DELETE' || !deletePassword) return
    setDeleting(true)
    try {
      await deleteAccount(deletePassword)
      navigate('/sign-in')
    } catch (error) {
      pushToast({ title: 'Could not delete account', message: toErrorMessage(error), level: 'error' })
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-(--text-muted)">
          Your account, your data. Export or remove it without opening a support ticket.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UserRound size={16} className="text-(--accent)" />
            Profile
          </h2>
          <p className="mt-1 text-xs text-(--text-muted)">
            {user?.email} · {user?.emailVerified ? 'Email verified' : 'Email not verified'}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Avatar URL" hint="Optional. Leave empty to use your initials.">
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => void saveProfile()} disabled={savingProfile || !name.trim()}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound size={16} className="text-(--accent)" />
            Password
          </h2>
          <p className="mt-1 text-xs text-(--text-muted)">
            Changing the password revokes the refresh token and signs you out everywhere.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Current password">
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => void savePassword()}
              disabled={savingPassword || !currentPassword || newPassword.length < 8}
            >
              {savingPassword ? 'Updating…' : 'Change password'}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Download size={16} className="text-(--accent)" />
            Export your data
          </h2>
          <p className="mt-1 text-xs text-(--text-muted)">
            Downloads notes, calendar, diary, agents, messages, and model-key labels as JSON.
            API keys are never included.
          </p>
          <div className="mt-4 flex justify-end">
            <Button variant="soft" onClick={() => void downloadExport()} disabled={exporting}>
              <Download size={14} />
              {exporting ? 'Preparing…' : 'Download JSON'}
            </Button>
          </div>
        </Card>

        <Card className="border-red-500/30 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-(--danger)">
            <ShieldAlert size={16} />
            Danger zone
          </h2>
          <p className="mt-1 text-xs text-(--text-muted)">
            Deleting your account removes every task, appointment, diary entry, agent, message,
            and stored integration. This cannot be undone.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Account password">
              <Input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
              />
            </Field>
            <Field label='Type DELETE to confirm'>
              <Input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder="DELETE"
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => void signOut().then(() => navigate('/sign-in'))}>
              <LogOut size={14} />
              Sign out
            </Button>
            <Button
              variant="danger"
              onClick={() => void confirmDelete()}
              disabled={deleting || deleteConfirm !== 'DELETE' || !deletePassword}
            >
              <Trash2 size={14} />
              {deleting ? 'Deleting…' : 'Delete account'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
