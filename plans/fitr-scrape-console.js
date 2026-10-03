/* ============================================================
   Fitr set/rep scraper — paste into the browser console
   ------------------------------------------------------------
   Why this exists: Fitr preloads every session into the page and
   only renders set/rep values once an exercise row is expanded,
   so the numbers can't be fetched from an API or read from the
   raw HTML. This clicks through the month, expands each exercise
   and reads the targets out of the input placeholders.

   HOW TO USE
   1. Open your Fitr calendar on the month you want, e.g.
        app.fitr.training/user/calendar?year=2026&month=8&day=3
   2. Open the console:  Cmd+Option+J  (Chrome, Mac)
   3. Paste this whole file, press Enter.
   4. Leave the tab in the FOREGROUND and don't switch away —
      background tabs get throttled and it crawls.
   5. It prints progress. When it finishes it copies the JSON to
      your clipboard and also leaves it in  window.FITR_RESULT.
   6. Paste the result back into the chat.

   Repeat for each month you want (August, then September).
   ============================================================ */
(async () => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  const MON = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6,
                Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };

  const cardsNow = () => [...document.querySelectorAll('.day__item[role="button"]')];
  const total = cardsNow().length;
  if (!total) {
    console.error('No session cards found — are you on the calendar page?');
    return;
  }
  console.log(`Fitr scrape: ${total} sessions on this month. Keep this tab in front…`);

  const out = {};
  for (let i = 0; i < total; i++) {
    const cards = cardsNow();
    if (!cards[i]) continue;

    // Clicking another card swaps the panel — no need to close it first.
    cards[i].click();
    await w(900);

    const sb = document.querySelector('.page-sidebar.client-sidebar');
    if (!sb) { console.warn(`  ${i + 1}/${total} — panel didn't open, skipped`); continue; }

    const line = (sb.innerText || '').split('\n')[1] || '';
    const dm = line.match(/([A-Z][a-z]+)\s+(\d{1,2})/);
    if (!dm) { console.warn(`  ${i + 1}/${total} — no date, skipped`); continue; }
    const date = `2026-${String(MON[dm[1].slice(0, 3)]).padStart(2, '0')}-${String(dm[2]).padStart(2, '0')}`;

    // Values only exist in the DOM once a row is expanded.
    for (const e of sb.querySelectorAll('.section-field_kind-exercise')) {
      if (/_collapsed/.test(e.className)) {
        e.querySelector('.section-field__body[role="button"]')?.click();
        await w(90);
      }
    }
    await w(250);

    const exs = [];
    for (const e of sb.querySelectorAll('.section-field_kind-exercise')) {
      const n = (e.querySelector('.section-field__header')?.innerText || '').split('\n')[0].trim();
      const titles = [...e.querySelectorAll('.exercise-column__title')].map((t) => t.textContent.trim());
      const ins = [...e.querySelectorAll('input')].map((x) => x.placeholder);
      const cols = [];
      if (titles.length && ins.length) {
        const per = Math.round(ins.length / titles.length);
        titles.forEach((t, k) => cols.push({ t, v: ins.slice(k * per, (k + 1) * per) }));
      }
      if (n) exs.push({ n, cols });
    }
    out[date] = exs;
    console.log(`  ${i + 1}/${total}  ${date}  — ${exs.length} exercise(s)`);
  }

  const json = JSON.stringify(out);
  window.FITR_RESULT = json;
  try {
    await navigator.clipboard.writeText(json);
    console.log(`\n✅ Done. ${Object.keys(out).length} days copied to clipboard (${json.length} chars).`);
  } catch {
    console.log(`\n✅ Done. ${Object.keys(out).length} days. Clipboard blocked — run:  copy(window.FITR_RESULT)`);
  }
  console.log(json);
})();
