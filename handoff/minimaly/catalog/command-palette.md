# Command palette

Every place and action of an app behind one shortcut: ⌘K or Ctrl+K, type, Enter. One per page. Picking a value for a field is a `combobox`; actions on one thing are a `menu`. Needs `ds.js`.

```html
<dialog class="modal command-palette" aria-label="Commands">
  <label class="input command-palette__search"><i class="icon" data-icon="magnifying-glass"></i><input placeholder="Search commands" aria-label="Search commands"></label>
  <div class="command-palette__list">
    <div class="command-palette__group"><p class="command-palette__label">Go to</p>
      <div class="command-palette__item" data-value="inbox"><i class="icon" data-icon="tray"></i><span class="command-palette__title">Inbox</span><span class="command-palette__keys"><span class="kbd">G</span><span class="kbd">I</span></span></div>
    </div>
    <div class="empty command-palette__empty" data-variant="compact"><span class="empty__art"><i class="icon" data-icon="magnifying-glass"></i></span><p class="empty__title">No command found</p><p class="empty__text">Try another word.</p></div>
  </div>
</dialog>
```

- ⌘K or Ctrl+K opens and closes it from anywhere; `data-open="<id>"` on a button too (the dialog card). Esc or the backdrop close it, focus goes back.
- Typing filters on the titles; groups left empty hide, the empty state shows when nothing matches. The first match is active (grey). It hangs from the top of the screen, so the field never moves while results filter.
- ↑ ↓ move, Enter or a click runs the active item: the palette closes, then fires `select` on it (`event.detail.value`, `event.detail.item`). Closing clears the search. Shortcuts are `.kbd` keys in `.command-palette__keys`.
