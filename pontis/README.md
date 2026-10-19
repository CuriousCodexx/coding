# Pontis — the Bridge Oath

*Pons* is Latin for bridge; *Sacramentum* was the oath a Roman soldier swore. **Pontis** builds the bridge between who you are and the job you want — and seals it with your word.

## Three stages

| | Stage | What it does |
|---|---|---|
| I | **Forge** | Write your resume: identity, summary, experience, education, skills. Live A4 preview in three templates — *Forum* (classic serif), *Aqueduct* (sidebar), *Tablet* (minimal). |
| II | **Bridge** | Paste a job description. Pontis extracts its keywords, shows which are already in your resume ("stones in place") and which are missing, scores the match, and gives notes on weak verbs, missing numbers and long bullets. Click a missing keyword to add it to your skills. |
| III | **Oath** | Take the honesty oath and add a personal pledge to your next employer. Once sealed, a signed seal appears on your resume. Export to PDF via the print dialog. |

Everything is saved in your browser (localStorage). Use **Save .json / Open .json** to back up or move a resume between devices. No account, no server, nothing leaves your machine.

## Run it

It's plain HTML/CSS/JS with no build step — open `index.html` in a browser, or serve the folder:

```sh
cd pontis && python3 -m http.server 8000   # then visit http://localhost:8000
```

To publish, point GitHub Pages (or Netlify, Vercel, Lovable hosting…) at the `pontis/` folder.

## Tests

```sh
node --test pontis/tests/*.test.js
```
