# Input

Text field in a 32 px box. The `<label>` wraps the field so a click anywhere focuses it. Optional leading icon, a magnifying glass for search.

```html
<label class="input"><input placeholder="Project name"></label>
<label class="input"><i class="icon" data-icon="magnifying-glass"></i><input type="search" placeholder="Search topics" aria-label="Search topics"></label>
```

- Width from the layout (`flex: 1` or a fixed width on `.input`).
- A field without a visible label carries `aria-label`.
