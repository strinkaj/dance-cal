# Dance Calendar 2026–2027

Personal swing dance event tracker — Lindy Hop, Blues, West Coast Swing.
From Boston, Apr 2026 through Mar 2027.

## Stack

- React 18 + Vite
- Tailwind CSS v3
- `attendance.json` for persistent tracking

---

## Quick Start

```bash
npm install
npm run dev
# open http://localhost:5173
```

---

## Attendance Privacy

`attendance.json` is committed to this repo as an empty file so cloners get
the correct schema. Your local attendance data never gets pushed because of
`skip-worktree` — git permanently ignores local changes to that file.

**Run this once after cloning:**

```bash
chmod +x scripts/init.sh
./scripts/init.sh
# ✓ attendance.json is now skip-worktree'd — your local data stays private.
```

After that, fill in statuses freely. Git will never stage your changes to
`attendance.json` no matter how many times you run `git add .` or `git add -A`.

To verify it's working:
```bash
git status   # attendance.json will never appear here
```

---

## Workflow

### Day-to-day

1. `npm run dev`
2. Set statuses on events — saves to `localStorage` automatically

### Saving your attendance data locally

Your data lives in `localStorage` while the app is open. To persist it across
browsers or machines, use the Export/Import buttons in the app header:

```bash
# In the app: click "⬇ Export attendance.json"
mv ~/Downloads/attendance.json .
# That's it — your local file is updated. Git ignores it.
```

Keep a backup of `attendance.json` somewhere you trust (iCloud, Dropbox, etc.)
since it's not going to git.

### On a new machine

```bash
git clone git@github.com:you/dance-calendar.git
cd dance-calendar
npm install
./scripts/init.sh        # set skip-worktree
npm run dev
# In the app: click "⬆ Import attendance.json" and select your backup file
```

---

## Updating the Calendar

Edit `src/DanceCalendar.jsx`:

- **New events** — append to the `EVENTS` array with a new `id`
- **Mark past** — flip `past: false` → `past: true`
- **Ticket status** — `"TBD"` → `"Open"` or `"Sold Out"`
- **Costs** — edit the `costs:{}` block
- **Conflicts** — update `conflicts:[]` arrays and `CONFLICT_GROUPS`

```bash
git add src/DanceCalendar.jsx
git commit -m "update: Lindy Focus tickets now open"
git push
```

---

## Suggested Commit Conventions

```
update: confirmed Lindy Focus dates Dec 26-Jan 1
update: Boogie by the Bay tickets open
update: corrected Snowball hotel pricing
add: 2027 fall events
fix: DCLX individual tickets now on sale
```

---

## Structure

```
dance-calendar/
├── attendance.json        ← empty in repo; your real data stays local
├── scripts/
│   └── init.sh            ← run once after cloning
├── src/
│   ├── DanceCalendar.jsx  ← all event data + full UI
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Event ID Reference

| ID | Event | Year |
|----|-------|------|
| 1 | Rock That Swing Festival | 2026 |
| 2 | The Flurry Festival | 2026 |
| 3 | Rose City Blues | 2026 |
| 4 | Salt City Stomp | 2026 |
| 5 | Steel City Blues | 2026 |
| 6 | MADjam | 2026 |
| 7 | The Great Southwest Lindyfest | 2026 |
| 8 | Meet in the Middle | 2026 |
| 9 | River City Mess Around | 2026 |
| 10 | Boston Tea Party Swings | 2026 |
| 11 | Kind of a Big Deal Weekend | 2026 |
| 12 | DCLX (DC Lindy Exchange) | 2026 |
| 13 | Jazz Town | 2026 |
| 14 | Canadian Swing Championships | 2026 |
| 15 | Camp Jitterbug | 2026 |
| 16 | Jack & Jill O'Rama | 2026 |
| 17 | Liberty Swing Dance Championships | 2026 |
| 18 | Beantown Camp | 2026 |
| 19 | Oxford Lindy Exchange | 2026 |
| 20 | Wild Wild Westie | 2026 |
| 21 | ILHC World Finals | 2026 |
| 22 | Herrang Dance Camp | 2026 |
| 23 | Slow Dance Soiree | 2026 |
| 24 | Uptown Swingout | 2026 |
| 25 | Swing Fling | 2026 |
| 26 | Express Track Blues | 2026 |
| 27 | Summer Hummer | 2026 |
| 28 | Swing Out New Hampshire | 2026 |
| 29 | Desert City Swing | 2026 |
| 30 | Camp Hollywood (NJC) | 2026 |
| 31 | Lindy on the Rocks | 2026 |
| 32 | Rhythm Shuffle | 2026 |
| 33 | Dirty Water Lindy Exchange | 2026 |
| 34 | Boogie by the Bay | 2026 |
| 35 | Blues Muse | 2026 |
| 36 | Flying Home | 2026 |
| 37 | New York Lindy Exchange | 2026 |
| 38 | Cats Corner Exchange | 2026 |
| 39 | Track Town Throwdown | 2026 |
| 40 | Northeast Swing Classic | 2026 |
| 41 | Austin Lindy Exchange | 2026 |
| 42 | Stompology | 2026 |
| 43 | The Open (WSDC World Championships) | 2026 |
| 44 | PittStop Lindy Hop | 2026 |
| 45 | The Snowball | 2026 |
| 46 | Lindy Focus | 2026 |
| 47 | Countdown Swing Boston | 2026 |
| 48 | DC Swing eXperience (DCSX) | 2026 |
| 49 | Blues Experiment | 2026 |
| 101 | Rock That Swing 2027 | 2027 |
| 102 | Flurry Festival 2027 | 2027 |
| 103 | Rose City Blues 2027 | 2027 |
| 104 | Salt City Stomp 2027 | 2027 |
| 105 | Steel City Blues 2027 | 2027 |
| 106 | MADjam 2027 | 2027 |
| 107 | Great Southwest Lindyfest 2027 | 2027 |
| 108 | Boston Tea Party Swings 2027 | 2027 |
