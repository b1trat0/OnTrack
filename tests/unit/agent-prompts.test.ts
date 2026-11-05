import { describe, expect, it } from 'vitest'
import {
  parseActionItems,
  stripActionLines,
} from '../../apps/backend/src/lib/agent-prompts'

describe('agent action markers', () => {
  it('parses tasks, events, and notes from one reply', () => {
    const reply = [
      'Digest for today.',
      '[TASK] Send the invoice | 2026-11-06',
      '[EVENT] Client call | 2026-11-06 | 15:00-15:30',
      '[NOTE] Keep the scope small | one sentence',
    ].join('\n')

    const actions = parseActionItems(reply)
    expect(actions).toHaveLength(3)
    expect(actions[0]).toMatchObject({ kind: 'task', title: 'Send the invoice', date: '2026-11-06' })
    expect(actions[1]).toMatchObject({ kind: 'event', startTime: '15:00', endTime: '15:30' })
    expect(actions[2]).toMatchObject({ kind: 'note', title: 'Keep the scope small' })
  })

  it('strips marker lines but keeps the human digest', () => {
    const reply = 'Summary\n[TASK] One | 2026-11-06\nRest of the summary'
    expect(stripActionLines(reply)).toBe('Summary\nRest of the summary')
  })

  it('ignores prose that mentions a marker mid-line', () => {
    expect(parseActionItems('The string [TASK] is a marker.')).toEqual([])
  })
})
