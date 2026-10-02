const SLOTS = [
  { id: 'morning', label: 'Morning' },
  { id: 'noon', label: 'Midday' },
  { id: 'evening', label: 'Evening' },
  { id: 'bed', label: 'Bedtime' },
];
const KEY = 'pillbox.v1';

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || { meds: [], log: {} }; }
  catch { return { meds: [], log: {} }; }
};
const state = load();
const save = () => localStorage.setItem(KEY, JSON.stringify(state));

const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
let current = new Date();

const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};
const fmtTime = iso => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function render() {
  const key = dayKey(current);
  const isToday = key === dayKey(new Date());
  $('dateLabel').textContent = (isToday ? 'Today · ' : '') +
    current.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  $('today').hidden = isToday;

  const day = state.log[key] || {};
  const grid = $('grid');
  grid.replaceChildren(
    el('thead', {}, el('tr', {}, el('th', { textContent: 'Medication' }),
      ...SLOTS.map(s => el('th', { textContent: s.label })))),
    el('tbody', {}, ...state.meds.map(m => el('tr', {},
      el('td', { className: 'med' },
        el('b', { textContent: m.name }),
        el('small', { textContent: m.dose || '' }),
        el('button', { className: 'rm', textContent: '✕', title: 'Remove', onclick: () => removeMed(m.id) })),
      ...SLOTS.map(s => {
        if (!m.slots.includes(s.id)) return el('td', { className: 'off' });
        const t = day[`${m.id}|${s.id}`];
        return el('td', {}, el('button', {
          className: 'cell' + (t ? ' done' : ''),
          onclick: () => toggle(key, m.id, s.id),
        }, t ? el('span', {}, '✓', el('small', { textContent: fmtTime(t) })) : ''));
      })))));
  $('empty').hidden = state.meds.length > 0;
}

function toggle(key, medId, slotId) {
  const day = (state.log[key] ||= {});
  const k = `${medId}|${slotId}`;
  if (day[k]) delete day[k];
  else {
    // Past/future days: stamp with that day at the current clock time.
    const t = new Date(current);
    const now = new Date();
    t.setHours(now.getHours(), now.getMinutes(), 0, 0);
    day[k] = t.toISOString();
  }
  save(); render();
}

function removeMed(id) {
  const m = state.meds.find(m => m.id === id);
  if (!confirm(`Remove ${m.name}? Its history will be deleted too.`)) return;
  state.meds = state.meds.filter(m => m.id !== id);
  for (const day of Object.values(state.log))
    for (const k of Object.keys(day)) if (k.startsWith(id + '|')) delete day[k];
  save(); render();
}

const shift = n => { current.setDate(current.getDate() + n); render(); };
$('prev').onclick = () => shift(-1);
$('next').onclick = () => shift(1);
$('today').onclick = () => { current = new Date(); render(); };

$('slotPicks').append(...SLOTS.map(s => el('label', {},
  el('input', { type: 'checkbox', value: s.id, defaultChecked: s.id === 'morning', style: 'flex:none' }), ' ' + s.label)));

$('addForm').onsubmit = e => {
  e.preventDefault();
  const slots = [...$('slotPicks').querySelectorAll('input:checked')].map(i => i.value);
  if (!slots.length) return alert('Pick at least one time of day.');
  state.meds.push({ id: crypto.randomUUID(), name: $('name').value.trim(), dose: $('dose').value.trim(), slots });
  save(); e.target.reset(); render();
};

render();
