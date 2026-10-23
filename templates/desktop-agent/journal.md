## 2026-10-23
- First version: [Start](screen:start), [Session](screen:session), [Review changes](screen:review), [Prototype](screen:prototype), [Hand off](screen:handoff). The product is Protopass Pro; the user prototypes a booking app for Pebble Wall, a climbing gym.
- The command palette is a state of Session, not a screen: it is an overlay, and a separate screen would copy the whole session markup.
- The error path drives the review flow: a failed contrast check offers two fixes, the fix becomes a plan with a diff, nothing is written before Apply. It shows the checks, which is what sets Protopass apart.
- Hand off shows the stepper Brief, Prototype, Review, Hand off, and the checks next to the summary: the handoff is the differentiator, not the generation.
- The generated app follows its frame width (container queries): the same markup is the mobile preview in Session and the desktop or mobile Prototype.
- Toasts of Applied and Link copied stay on screen in those states so they show in captures; in the app they leave after 4 s.
- Library gaps found (diff, chat message, card footer, shell right pane, streaming with citations, dark tertiary contrast, lint exceptions) are listed in the open questions. Nothing under handoff/ was changed.
- Validator: 0 errors, 2 M204 warnings kept on purpose (toast and tooltip are built by ds.js, the validator only reads HTML classes).
