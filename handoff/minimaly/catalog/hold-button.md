# Hold to confirm

A button for an action that cannot be undone, where a confirmation dialog would be one click too many. Needs `ds.js`.

```html
<button class="btn" data-hold data-confirmed="Deleted"><i class="icon" data-icon="trash"></i>Hold to delete</button>
```

```js
button.addEventListener("confirm", deleteProject);
```

- Holding the pointer, Space or Enter fills it over 1.8 s. Letting go drains it 2.5 times faster; pressing again resumes from what is left.
- Only a full hold fires `confirm`. A click alone does nothing.
- `data-confirmed` (default "Confirmed") shows for 1.6 s, with a check, and is announced. Both labels share one cell: the width never changes.
- The label says "Hold to …". Screen readers also hear "Press and hold for 1.8 seconds".
- Unavailable: `aria-disabled="true"`, not `disabled`, so focus is never dropped mid-hold.
