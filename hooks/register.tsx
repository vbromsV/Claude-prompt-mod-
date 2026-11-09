import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const isBusy = atom({ plugin: 'prompt-master', key: 'isBusy' } as const, false)
const isAuto = atom({ plugin: 'prompt-master', key: 'isAuto' } as const, false)

const MODEL = 'sonnet'

const SYSTEM = `You are Prompt Master, an expert prompt engineer.
The user gives you a rough prompt they are about to send to an AI assistant.
Rewrite it into a clear, specific, well-structured prompt that will get a better answer.

Rules:
- Keep the user's intent, facts, names, code, paths and constraints exactly. Never invent requirements, data or context.
- State the goal first, then relevant context, then concrete requirements and the expected output format, when the rough prompt implies them.
- Fix spelling and grammar; remove filler and ambiguity.
- Write in the same language as the rough prompt, in the first person, as the user speaking to the assistant.
- Keep it proportionate: a short ask stays fairly short. Use a short list only when it helps.
- Do not answer the prompt. Do not add commentary, quotes, headings like "Improved prompt", or code fences around the whole thing.

Reply with the rewritten prompt only.`

type Rewrite = { text: string } | { error: string }

async function rewrite($: EngineInterface, rough: string): Promise<Rewrite> {
  const r = await $.model.complete({
    model: MODEL,
    system: SYSTEM,
    prompt: `<rough_prompt>\n${rough}\n</rough_prompt>`,
    maxTokens: 2048,
    effort: 'low',
    timeoutMs: 60000,
  })
  if (!r.isAnswered) return { error: r.reason }
  const text = r.text.trim()
  return text ? { text } : { error: 'empty-reply' }
}

// Rewrites what is in the prompt box and puts the result back for review.
async function improveDraft($: EngineInterface) {
  if (await read($, isBusy)) return
  const box = await $.prompt.read()
  const rough = box.text.trim()
  if (!rough) {
    $.ui.toast('Prompt Master: type a rough prompt first')
    return
  }
  await update($, isBusy, () => true)
  try {
    const r = await rewrite($, rough)
    if ('error' in r) {
      $.ui.toast(`Prompt Master failed: ${r.error}`)
      return
    }
    // Only replace if the person hasn't changed the draft meanwhile.
    const now = await $.prompt.read()
    if (now.text.trim() !== rough) {
      $.ui.toast('Prompt Master: draft changed while rewriting, kept yours')
      return
    }
    const filled = await $.prompt.fill({ text: r.text, mode: 'replace' })
    $.ui.toast(filled.isFilled ? 'Prompt Master: rewritten — review and press Enter' : 'Prompt Master: could not fill the prompt box')
  } finally {
    await update($, isBusy, () => false)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-master',
      description: 'Rewrite the prompt box (or the given text) into a better prompt; "auto on|off" rewrites every prompt on send',
    })
    return next(e)
  })

  // /prompt-master            -> rewrite what is in the prompt box
  // /prompt-master <text>     -> rewrite <text> and put it in the prompt box
  // /prompt-master auto on|off -> toggle rewriting every prompt on send
  on('command.run', { command: 'prompt-master' }, async ($, e) => {
    const args = e.args.trim()
    const mode = /^auto(?:\s+(on|off))?$/i.exec(args)
    if (mode) {
      const want = mode[1] ? mode[1].toLowerCase() === 'on' : !(await read($, isAuto))
      await update($, isAuto, () => want)
      return { text: `Prompt Master auto mode ${want ? 'on: every prompt is rewritten before it is sent' : 'off'}.` }
    }
    if (!args) {
      void improveDraft($)
      return { text: 'Prompt Master is rewriting the prompt box…' }
    }
    await update($, isBusy, () => true)
    try {
      const r = await rewrite($, args)
      if ('error' in r) return { text: `Prompt Master failed: ${r.error}` }
      const filled = await $.prompt.fill({ text: r.text, mode: 'replace' })
      return {
        text: filled.isFilled
          ? 'Rewritten prompt is in the box: review it and press Enter.'
          : `Rewritten prompt:\n\n${r.text}`,
      }
    } finally {
      await update($, isBusy, () => false)
    }
  })

  // Auto mode: rewrite every prompt the person sends before it reaches the model.
  on('prompt.submit', async ($, e, next) => {
    const isPlain = e.origin.kind === 'composer' && !e.command && !e.isMeta && e.text.trim().length > 0
    if (!isPlain || !(await read($, isAuto))) return next(e)
    $.ui.status('Prompt Master: rewriting…')
    const r = await rewrite($, e.text).catch((err: unknown): Rewrite => ({ error: String(err) }))
    $.ui.status(undefined)
    if ('error' in r) {
      $.ui.toast(`Prompt Master failed (${r.error}), sent as typed`)
      return next(e)
    }
    return next({ ...e, text: r.text })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const busy = await read($, isBusy)
    const auto = await read($, isAuto)

    return (
      <Box flexDirection="row" gap={1}>
        <Button
          key="prompt-master"
          label={busy ? '✨ Rewriting…' : '✨ Prompt Master'}
          hotkey="p"
          onPress={() => improveDraft($)}
        />
        <Button
          key="prompt-master-auto"
          label={auto ? 'Auto: on' : 'Auto: off'}
          hotkey="a"
          onPress={() => update($, isAuto, v => !v)}
        />
        <Text dimColor>{auto ? 'every prompt is rewritten on send' : 'rewrites the draft in the box'}</Text>
      </Box>
    )
  })
}
