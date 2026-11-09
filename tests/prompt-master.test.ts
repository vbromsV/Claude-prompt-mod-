import { expect, test } from 'claude-code/testing'

const ORIGIN = { kind: 'composer' } as const

test('auto mode off: a prompt is sent as typed', async ($, on) => {
  on('prompt.submit', (_, e) => ({ text: e.text }))
  const r = await $.prompt.submit({ text: 'fix bug pls', wait: false, origin: ORIGIN })
  expect('text' in r ? r.text : '').toBe('fix bug pls')
})

test('auto mode on: the prompt is rewritten before it is sent', async ($, on) => {
  on('command.register', () => ({ value: { command: 'prompt-master' } }))
  on('model.complete', () => ({
    value: { isAnswered: true, text: 'Please find and fix the bug.', usage: { input_tokens: 1, output_tokens: 1 } },
  }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('ui.status', () => ({ value: undefined }))

  await $.command.run({ command: 'prompt-master', args: 'auto on' })
  const r = await $.prompt.submit({ text: 'fix bug pls', wait: false, origin: ORIGIN })
  expect('text' in r ? r.text : '').toBe('Please find and fix the bug.')
})

test('auto mode on: a failed rewrite sends the prompt as typed', async ($, on) => {
  on('model.complete', () => ({
    value: { isAnswered: false, reason: 'empty-reply', usage: { input_tokens: 1, output_tokens: 0 } },
  }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  await $.command.run({ command: 'prompt-master', args: 'auto on' })
  const r = await $.prompt.submit({ text: 'fix bug pls', wait: false, origin: ORIGIN })
  expect('text' in r ? r.text : '').toBe('fix bug pls')
})

test('/prompt-master <text> puts the rewrite in the prompt box', async ($, on) => {
  let filled = ''
  on('model.complete', () => ({
    value: { isAnswered: true, text: 'Better prompt.', usage: { input_tokens: 1, output_tokens: 1 } },
  }))
  on('prompt.fill', (_, e) => {
    filled = e.text
    return { isFilled: true }
  })
  const r = await $.command.run({ command: 'prompt-master', args: 'rough thing' })
  expect(filled).toBe('Better prompt.')
  expect(r.text).toContain('review it')
})
