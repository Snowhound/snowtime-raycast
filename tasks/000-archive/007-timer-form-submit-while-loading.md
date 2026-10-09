# 007: Timer form ignores a submit before organizations load

Status: done

The timer form's submit returns without a word when no organization is known yet: while
`GET /api/v1/me` is still loading, or after it failed. The user presses ↵ and nothing
happens.

## Acceptance criteria

- [x] A submit while organizations load waits for them and then starts the timer, or says
      to wait
- [x] A submit after loading them failed shows the failure toast again, with its action
- [x] A person checks in Raycast: with a wrong Instance URL, ↵ in the form shows the toast
      with Open Extension Preferences
