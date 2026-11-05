import { useState } from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { Modal } from '../../global/ui/Modal'
import { Button } from '../../global/ui/Button'
import { Input } from '../../global/ui/Field'
import { useNotesStore } from '../../global/stores/useNotesStore'
import { useTimerStore } from '../../global/stores/useTimerStore'
import { useToastStore } from '../../global/stores/useToastStore'

type OnboardingModalProps = {
  open: boolean
  onClose: () => void
}

const FOCUS_CHOICES = [10, 15, 25, 45]

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const addTask = useNotesStore((state) => state.addTask)
  const setMinutes = useTimerStore((state) => state.setMinutes)
  const pushToast = useToastStore((state) => state.push)
  const [step, setStep] = useState(0)
  const [task, setTask] = useState('')
  const [focus, setFocus] = useState(25)

  const finish = () => {
    if (task.trim()) {
      addTask({ title: task.trim(), text: '', priority: 'medium', dueDate: null })
      pushToast({ title: 'First task added', message: 'It is waiting on the Notes board.', level: 'info' })
    }
    setMinutes(focus)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Welcome to OnTrack" width="max-w-lg">
      {step === 0 ? (
        <div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-(--accent-soft) text-(--accent)">
            <Sparkles size={22} />
          </span>
          <h3 className="mt-4 text-lg font-semibold">One place for the day in your head.</h3>
          <p className="mt-2 text-sm leading-relaxed text-(--text-muted)">
            Capture tasks, see the calendar, write the diary, run a focus timer, and let agents
            read your email or news. Nothing here is a productivity contest.
          </p>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setStep(1)}>
              Get started <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      ) : step === 1 ? (
        <div>
          <h3 className="text-lg font-semibold">What is one thing for today?</h3>
          <p className="mt-2 text-sm text-(--text-muted)">
            Keep it small. You can change it later, or skip this.
          </p>
          <Input
            autoFocus
            value={task}
            onChange={(event) => setTask(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setStep(2)
            }}
            placeholder="e.g. Send the one email I keep avoiding"
            className="mt-4"
          />
          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => setStep(2)}>
              Continue <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold">Pick a focus length</h3>
          <p className="mt-2 text-sm text-(--text-muted)">
            There is no correct answer. 25 minutes is a starting point, not a rule.
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {FOCUS_CHOICES.map((minutes) => (
              <button
                key={minutes}
                onClick={() => setFocus(minutes)}
                aria-pressed={focus === minutes}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  focus === minutes
                    ? 'border-(--accent) bg-(--accent-soft) text-(--accent)'
                    : 'border-(--border) text-(--text-muted) hover:bg-(--surface-2)'
                }`}
              >
                {minutes} min
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={finish}>
              <Check size={14} /> Start using OnTrack
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
