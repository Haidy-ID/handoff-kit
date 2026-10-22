# Reasoning

The agent's thinking, folded under one line above its answer. A run with known steps is a `steps` list; a single action is a `tool-call`.

```html
<details class="reasoning" data-state="thinking">
  <summary><i class="icon" data-icon="sparkle"></i>Thinking…<i class="icon" data-icon="caret-right"></i></summary>
  <p class="reasoning__body">…</p>
</details>
```

- `data-state="thinking"`: the label breathes in agent violet (it stays still under reduced motion). `done`: neutral, and the label says how long it took ("Thought for 12s").
- Native `<details>`: click, Enter or Space opens it; it opens and closes with a height animation. Closed by default: the answer matters more than the thinking.
- The page changes `data-state` and the label text; no `ds.js` needed.
