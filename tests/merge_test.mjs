import { merge3 } from "../auth.js";
let fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const t = (name, got, want) => { const ok = eq(got, want); if (!ok) fail++; console.log(ok ? "ok  " : "FAIL", name, ok ? "" : "\n   got  " + JSON.stringify(got) + "\n   want " + JSON.stringify(want)); };

// --- the headline case: two devices log different meals the same day
const meal = (id, kcal) => ({ id, label: "lunch", total: { kcal } });
const base = { "2026-10-06": { meals: [meal("a", 500)] } };
const phone = { "2026-10-06": { meals: [meal("a", 500), meal("phone", 600)] } };
const ipad  = { "2026-10-06": { meals: [meal("a", 500), meal("ipad", 700)] } };
const m1 = merge3(base, phone, ipad);
t("two devices add different meals -> both survive", m1["2026-10-06"].meals.map(x => x.id).sort(), ["a", "ipad", "phone"]);

// --- different days merge
t("different days merge", merge3({ d1: 1 }, { d1: 1, d2: 2 }, { d1: 1, d3: 3 }), { d1: 1, d2: 2, d3: 3 });

// --- untouched side takes the other
t("local untouched -> remote", merge3({ a: 1 }, { a: 1 }, { a: 2 }), { a: 2 });
t("remote untouched -> local", merge3({ a: 1 }, { a: 5 }, { a: 1 }), { a: 5 });

// --- true conflict on the same leaf: this device wins
t("same entry edited both sides -> local wins", merge3({ a: 1 }, { a: 5 }, { a: 9 }), { a: 5 });

// --- deletions
t("we deleted, they didn't touch -> stays deleted", merge3({ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2 }), { a: 1 });
t("we deleted, they EDITED it -> their edit kept", merge3({ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 9 }), { a: 1, b: 9 });
t("they deleted, we didn't touch -> deleted", merge3({ a: 1, b: 2 }, { a: 1, b: 2 }, { a: 1 }), { a: 1 });
t("they deleted, we edited -> our edit kept", merge3({ a: 1, b: 2 }, { a: 1, b: 7 }, { a: 1 }), { a: 1, b: 7 });
t("delete a meal locally, other device adds one", merge3({ m: [meal("x", 1)] }, { m: [] }, { m: [meal("x", 1), meal("y", 2)] }).m.map(x => x.id), ["y"]);

// --- list items by id: edit one, add another
t("same meal edited on both -> local wins for that meal, other adds kept",
  merge3({ m: [meal("x", 1)] }, { m: [meal("x", 111)] }, { m: [meal("x", 222), meal("z", 3)] }).m.map(x => x.id + ":" + x.total.kcal), ["x:111", "z:3"]);

// --- no base (quota failure / first run): union, local wins
t("no base -> union, local wins conflicts", merge3(undefined, { a: 1, b: 2 }, { a: 9, c: 3 }), { a: 1, b: 2, c: 3 });

// --- key order must not matter (postgres jsonb reorders keys)
t("jsonb key reordering isn't a change", merge3({ a: 1, b: 2 }, { b: 2, a: 1 }, { a: 1, b: 2 }), { b: 2, a: 1 });

// --- atomic arrays (no ids): a conflict -> local wins; one-sided -> that side
t("plain array one-sided", merge3([1, 2], [1, 2], [1, 2, 3]), [1, 2, 3]);
t("plain array conflict -> local", merge3([1], [1, 2], [1, 3]), [1, 2]);

// --- progress doc shape
const p0 = { sessions: { "W1.a": { done: 1 } }, blocks: {} };
t("progress: each device ticks a different session",
  merge3(p0, { sessions: { "W1.a": { done: 1 }, "W1.b": { done: 1 } }, blocks: {} }, { sessions: { "W1.a": { done: 1 }, "W1.c": { done: 1 } }, blocks: {} }).sessions,
  { "W1.a": { done: 1 }, "W1.b": { done: 1 }, "W1.c": { done: 1 } });

// --- values that aren't objects at all
t("string leaf conflict -> local", merge3("a", "b", "c"), "b");
t("string one-sided", merge3("a", "a", "c"), "c");
console.log(fail ? `\n${fail} FAILED` : "\nall merge cases pass");
process.exit(fail ? 1 : 0);
