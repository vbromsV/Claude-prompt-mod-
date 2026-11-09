# Prompt Master

Turns your rough prompt into a clear, specific, well-structured one before you send it.

## Use it

- **✨ Prompt Master button** (in the band right above the prompt box): type a rough prompt, click the button (or focus the band and press `p`). The box is replaced with the improved prompt so you can review it, tweak it, and press Enter.
- **Auto: on/off button** (`a`): when on, every prompt you send is rewritten automatically before it reaches Claude. If the rewrite fails, your prompt is sent as typed.
- **`/prompt-master`**: rewrites what is in the box. `/prompt-master <text>` rewrites the given text into the box. `/prompt-master auto on|off` toggles auto mode.

The rewrite keeps your intent, facts, names, code and language; it never answers the prompt or invents requirements. It uses the `sonnet` model through your own session, so it costs a small completion per rewrite.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install prompt-master --marketplace vbromsV/Claude-prompt-mod-
```

Answer `y` to add the marketplace, then pick a scope. From a shell:

```
claude plugin install prompt-master --marketplace vbromsV/Claude-prompt-mod-
```

In the desktop app: click **+** next to the prompt box → **Plugins** → **Add marketplace** with `vbromsV/Claude-prompt-mod-`, then **Add plugin**.
