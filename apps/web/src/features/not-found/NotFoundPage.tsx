import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../global/ui/Card'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <Card className="p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-(--accent-soft) text-(--accent)">
          <Compass size={22} />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-(--text-muted)">
          That link does not point anywhere in OnTrack. Your work is still where you left it.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-(--accent) px-4 py-2 text-sm font-medium text-(--on-accent)"
        >
          <ArrowLeft size={15} />
          Back to Today
        </Link>
      </Card>
    </div>
  )
}
