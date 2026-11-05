import { Bot, Briefcase, Mail, Newspaper, Sparkles } from 'lucide-react'
import type { AgentTemplate } from '../../global/stores/useAgentsStore'
import { Card } from '../../global/ui/Card'
import { Button } from '../../global/ui/Button'

/** Server template icons are display names, not lucide keys. */
const TEMPLATE_ICONS: Record<string, typeof Mail> = {
  mail: Mail,
  briefcase: Briefcase,
  newspaper: Newspaper,
  sparkles: Sparkles,
  bell: Mail,
  calendar: Newspaper,
}

type TemplateGalleryProps = {
  templates: AgentTemplate[]
  onSelect: (template: AgentTemplate) => void
}

export function TemplateGallery({ templates, onSelect }: TemplateGalleryProps) {
  if (templates.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-(--border-strong) p-8 text-center text-sm text-(--text-muted)">
        No templates are available right now. Start from scratch instead.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const Icon = TEMPLATE_ICONS[template.icon.toLowerCase()] ?? Bot
        const chips: string[] = []
        if (template.requiresOAuth) {
          chips.push(template.requiresOAuth === 'gmail' ? 'Gmail' : template.requiresOAuth)
        }
        if (template.defaultTools.length > 0) {
          chips.push(`${template.defaultTools.length} tool${template.defaultTools.length === 1 ? '' : 's'}`)
        }
        if (template.defaultOutput.length > 0) {
          chips.push(
            template.defaultOutput
              .map((output) => (output === 'message' ? 'Inbox' : output === 'note' ? 'Notes' : 'Calendar'))
              .join(' + ')
          )
        }

        return (
          <Card key={template.id} className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-(--surface-2) text-(--text-muted)">
                <Icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{template.name}</h3>
                <p className="mt-0.5 text-xs font-medium text-(--text-muted)">{template.defaultRole}</p>
              </div>
            </div>

            <p className="mt-3 flex-1 text-sm text-(--text-muted)">{template.description}</p>

            {chips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-(--surface-2) px-2 py-0.5 text-[11px] font-medium text-(--text-muted)"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}

            <Button
              variant="soft"
              size="sm"
              className="mt-4"
              onClick={() => onSelect(template)}
            >
              Use template
            </Button>
          </Card>
        )
      })}
    </div>
  )
}
