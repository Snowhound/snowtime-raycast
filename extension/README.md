# Snowtime

Start, stop, and watch your [Snowtime](https://snowtime.snowhound.eu) timer from Raycast,
without opening the web app. The running timer's elapsed time stays in the menu bar.

## Set up

The extension signs in with a personal API key.

1. In Snowtime, open Settings → API keys and create a key. Choose the `write` scope to
   start and stop timers; a `read` key only shows your timer and entries.
2. Run any Snowtime command in Raycast. Raycast asks for the API key, and stores it
   encrypted.
3. If your Snowtime runs at another address, set Instance URL to it, such as
   `https://time.example.com`. The default is `https://snowtime.snowhound.eu`.

You can change both later in Raycast's settings, under Extensions → Snowtime.

## Commands

| Command        | Does                                                                                                                     | Key scope |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ | --------- |
| Start Timer    | Type what you're working on. ↵ starts a matching recent entry again; ⌘↵ edits it first; ⌘N opens the form for a new one. | `write`   |
| Continue Timer | Opens the timer form filled in from your running or newest entry, to change and start.                                   | `write`   |
| Stop Timer     | Stops the running timer and shows how long it ran.                                                                       | `write`   |
| Recent Entries | Your entries of the last 14 days, grouped by day with each day's total. Starts any again.                                | `read`    |
| Running Timer  | The elapsed time in the menu bar, with a menu to stop the timer or start another.                                        | `read`    |

Recent Entries and Running Timer read with a `read` key, but their actions that start or
stop a timer need `write`.

Starting a timer stops the running one first, wherever it runs, as in the web app.

To skip a step, type the description in Raycast's root search: Start Timer, Tab, then the
text. Start Timer opens with the matching recent entries, or, when none matches, straight
in the form. With Start Timer set as a fallback command, any text in the root search works
the same way.

## Tickets

Leave Ticket empty in the timer form, and a ticket key in the description, such as
`ABC-123`, becomes the ticket when you start. A key at the start of the description moves
to the ticket. A key later in the text becomes the ticket and stays in the text. A ticket
you type is never replaced.

## Organizations

If you belong to more than one organization, Start Timer, Recent Entries, and the timer
form let you pick one. The extension remembers it for every command, together with the
project of your last timer.

## The menu bar

Running Timer updates its elapsed time every minute and reads Snowtime every 5 minutes, so
a timer you start or stop in the web app shows there within 5 minutes. Choose Refresh
(`⌘R`) in its menu to show it at once. Timers you start or stop from Raycast show right
away.

## Preferences

| Preference       | Applies to     | Does                                                                    |
| ---------------- | -------------- | ----------------------------------------------------------------------- |
| Instance URL     | Every command  | The address of your Snowtime                                            |
| API Key          | Every command  | Your personal API key                                                   |
| Suggestions From | Start Timer    | How far back suggestions go: today and yesterday, 7 days, or 14 days    |
| Time Format      | Every command  | System Default, 12-hour, or 24-hour times                               |
| Merge Tickets    | Recent Entries | Shows a day's entries with the same ticket as one row, with their total |
| Show Start Again | Running Timer  | Lists five recent entries in the menu, to start one again with ⌘1–⌘5    |
