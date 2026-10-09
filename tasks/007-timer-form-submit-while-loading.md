# 007: Timer form ignores a submit before organizations load

Status: todo

The timer form's submit returns without a word when no organization is known yet: while
`GET /api/v1/me` is still loading, or after it failed. The user presses ↵ and nothing
happens.

## Acceptance criteria

- [ ] A submit while organizations load waits for them and then starts the timer, or says
      to wait
- [ ] A submit after loading them failed shows the failure toast again, with its action
