/**
 * The tool catalogue is dependency-free on purpose: it is imported by the
 * registry test under Node's type-stripping loader, where extensionless runtime
 * imports cannot resolve. Keep it free of service/http imports.
 */

export type ToolDefinition = {
  name: string
  label: string
  description: string
  category: string
  icon: string
  requiresOAuth: string | null
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  { name: 'email_read', label: 'Read Emails', description: 'Read emails from your inbox', category: 'data', icon: 'Mail', requiresOAuth: 'gmail' },
  { name: 'email_send', label: 'Send Emails', description: 'Send emails on your behalf', category: 'communication', icon: 'Send', requiresOAuth: 'gmail' },
  { name: 'web_fetch', label: 'Web Fetch', description: 'Fetch and read web page content', category: 'data', icon: 'Globe', requiresOAuth: null },
  { name: 'news_read', label: 'Read News', description: 'Read latest news articles', category: 'data', icon: 'Newspaper', requiresOAuth: null },
  { name: 'job_search', label: 'Job Search', description: 'Search for job listings', category: 'data', icon: 'Search', requiresOAuth: null },
  { name: 'notes_read', label: 'Read Notes', description: 'Read your notes', category: 'data', icon: 'StickyNote', requiresOAuth: null },
  { name: 'calendar_read', label: 'Read Calendar', description: 'Read calendar events', category: 'productivity', icon: 'CalendarDays', requiresOAuth: null },
  { name: 'diary_read', label: 'Read Diary', description: 'Read diary entries', category: 'data', icon: 'BookOpen', requiresOAuth: null },
  { name: 'note_write', label: 'Write Note', description: 'Create or update notes', category: 'productivity', icon: 'PenLine', requiresOAuth: null },
  { name: 'calendar_write', label: 'Write Calendar', description: 'Create or update calendar events', category: 'productivity', icon: 'CalendarPlus', requiresOAuth: null },
  { name: 'task_move', label: 'Move Task', description: 'Move tasks between columns', category: 'productivity', icon: 'ArrowRightLeft', requiresOAuth: null },
  { name: 'message_inbox', label: 'Message Inbox', description: 'Check agent message inbox', category: 'communication', icon: 'Inbox', requiresOAuth: null },
  { name: 'summarize', label: 'Summarize', description: 'Summarize content using AI', category: 'ai', icon: 'Sparkles', requiresOAuth: null },
  { name: 'classify', label: 'Classify', description: 'Classify content using AI', category: 'ai', icon: 'Tags', requiresOAuth: null },
]

export function listAvailableTools(): ToolDefinition[] {
  return TOOL_REGISTRY
}
