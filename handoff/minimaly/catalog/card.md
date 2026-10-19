# Card

Raised panel with an optional head and a body. The head title is mono uppercase, the tag takes the free space, actions go last.

```html
<div class="card">
  <div class="card__head">
    <h3 class="card__title">Work order</h3>
    <span class="card__tag">Draft</span>
    <button class="btn" data-variant="icon" aria-label="More"><i class="icon" data-icon="dots-three"></i></button>
  </div>
  <div class="card__body">…</div>
</div>
```

- `data-variant="accent"`: blue border for the card in focus (snapshot, selection).
- The first block after the head gets a top border automatically.
- The card takes the full width of its parent: size it from the layout.
