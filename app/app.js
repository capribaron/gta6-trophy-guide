// Leonida Legend — GTA VI trophy guide & tracker.
// Single module, no dependencies, no network at runtime beyond loading the
// local data file app/data/trophies.json. Progress lives in localStorage.

const STORAGE_EARNED = 'leonida-legend-earned-v1';
const STORAGE_SPOILERS = 'leonida-legend-spoilers-v1';
const DATA_URL = 'data/trophies.json';

// Demo seed for ?demo=1 (and for the screenshots): 13 of 55 earned, spread
// across story, activities, open-world and collectibles.
const DEMO_EARNED_IDS = [2, 3, 4, 5, 8, 16, 20, 21, 33, 36, 44, 52, 55];

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  'open-world': 'Open world',
  meta: 'Meta',
  online: 'Online',
};

const ROADMAP_STAGES = [
  {
    n: 1,
    title: 'Stage 1 — Play the story',
    text: 'Finish all five chapters and the named story missions. Everything here is automatic and unmissable — except one thing: do Lucia\u2019s balcony meditation in Chapter 1 before the chapter ends (Positive Mental Attitude, Stage 3). Keep a manual save at the start of each chapter; there is no mission replay.',
  },
  {
    n: 2,
    title: 'Stage 2 — Side stories',
    text: 'Finish the stranger strands and the side-character finales (Andy, Kenton, Billy, Randy, Tyrone, Bret). Only some strands count toward Strangers & Freaks — Andy\u2019s, Billy\u2019s and Tyrone\u2019s have their own trophies and do not count. Do Race Against Yago the moment it appears in Chapter 3: it is time-sensitive and its strand counts.',
  },
  {
    n: 3,
    title: 'Stage 3 — Activities & skills',
    text: 'Shooting Range golds, 250 stunts, drone races, races, fishing, arcade, meditation, bowling and 50 Challenges. The Shootist\u2019s 42 gold medals are the skill gate of this stage, and Positive Mental Attitude is the one trophy you can miss — read its warning first.',
  },
  {
    n: 4,
    title: 'Stage 4 — Collectibles & exploration',
    text: 'Cards, WAiNK spots, vehicles, all 52 areas of Leonida, garages and Scooter Bros registrations. Scan everything with WAiNK as you travel — it feeds both WAiNK It and vehicle discovery — and buy garages before you start registering cars.',
  },
  {
    n: 5,
    title: 'Stage 5 — Money, mayhem & the platinum',
    text: 'Robberies, partner crimes, money laundering and the odd one-offs, then 100% completion. Finish with A Long Road (100% completion) and the platinum, Vice Got a Price!, pops right after it.',
  },
];

const params = new URLSearchParams(location.search);
const demoMode = params.get('demo') === '1';

let trophies = [];
let earned = new Set();
let spoilersHidden = true;
let currentView = 'tracker';
let selectedId = null;
let filterKind = 'all';
let filterGrade = 'all';
let filterQuery = '';
let hideEarned = false;

const $ = (id) => document.getElementById(id);

function loadTrophies() {
  return fetch(DATA_URL).then((r) => {
    if (!r.ok) throw new Error('trophy data failed to load');
    return r.json();
  }).then((doc) => doc.trophies);
}

function loadStoredProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_EARNED);
    if (!raw) return new Set();
    const names = JSON.parse(raw);
    const known = new Set(trophies.map((t) => t.name));
    return new Set(names.filter((n) => known.has(n)));
  } catch {
    return new Set();
  }
}

function loadStoredSpoilerSetting() {
  try {
    const raw = localStorage.getItem(STORAGE_SPOILERS);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_EARNED, JSON.stringify([...earned]));
  } catch {
    // Storage full or unavailable: progress still works for this session.
  }
}

function saveSpoilerSetting() {
  try {
    localStorage.setItem(STORAGE_SPOILERS, spoilersHidden ? '1' : '0');
  } catch {
    // Ignore: the setting still applies for this session.
  }
}

function seedDemoProgress() {
  return new Set(DEMO_EARNED_IDS.map((id) => trophies.find((t) => t.id === id).name));
}

function trophyById(id) {
  return trophies.find((t) => t.id === id) || null;
}

function isEarned(t) {
  return earned.has(t.name);
}

function isSpoilerMasked(t) {
  return spoilersHidden && t.kind === 'story' && !isEarned(t);
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  return KIND_LABELS[kind] || kind;
}

function applyFilters(list) {
  const q = filterQuery.trim().toLowerCase();
  return list.filter((t) => {
    if (filterKind === 'missable' && !t.missable) return false;
    if (filterKind === 'online') return false;
    if (filterKind !== 'all' && filterKind !== 'missable' && t.kind !== filterKind) return false;
    if (filterGrade !== 'all' && t.grade !== filterGrade) return false;
    if (hideEarned && isEarned(t)) return false;
    if (q) {
      const hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderProgressHeader() {
  const total = trophies.length;
  const n = earned.size;
  $('earnedCount').textContent = String(n);
  $('progressFill').style.width = total ? Math.round((n / total) * 100) + '%' : '0%';
  $('progressNote').textContent = n === total
    ? 'Platinum earned — Leonida Legend!'
    : (total - n) + ' to go until the platinum';
  const counts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const inGrade = trophies.filter((t) => t.grade === g);
    const done = inGrade.filter((t) => isEarned(t)).length;
    return gradeLabel(g) + ' ' + done + '/' + inGrade.length;
  }).join('  ·  ');
  $('gradeCounts').textContent = counts;
}

function renderKindFilters() {
  const kinds = ['all', 'story', 'missable', 'collectibles', 'activities', 'open-world', 'meta', 'online'];
  const wrap = $('kindFilters');
  wrap.replaceChildren();
  for (const k of kinds) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kind-btn' + (filterKind === k ? ' active' : '');
    b.textContent = k === 'all' ? 'All kinds' : kindLabel(k);
    b.setAttribute('aria-pressed', filterKind === k ? 'true' : 'false');
    b.addEventListener('click', () => {
      filterKind = k;
      renderKindFilters();
      renderTracker();
    });
    wrap.append(b);
  }
}

function trophyCard(t) {
  const masked = isSpoilerMasked(t);
  const card = document.createElement('article');
  card.className = 'trophy-card' + (isEarned(t) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
  card.dataset.trophyId = String(t.id);

  const top = document.createElement('div');
  top.className = 'trophy-top';
  const dot = document.createElement('span');
  dot.className = 'grade-dot ' + t.grade;
  dot.title = gradeLabel(t.grade);
  top.append(dot);
  const text = document.createElement('div');
  const name = document.createElement('h3');
  name.className = 'trophy-name';
  name.textContent = masked ? 'Hidden story trophy' : t.name;
  const desc = document.createElement('p');
  desc.className = 'trophy-desc' + (masked ? ' masked' : '');
  desc.textContent = masked
    ? 'Hidden until earned — finish the story to reveal it.'
    : t.description;
  text.append(name, desc);
  top.append(text);
  card.append(top);

  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  const gradeTag = document.createElement('span');
  gradeTag.className = 'tag grade-' + t.grade;
  gradeTag.textContent = gradeLabel(t.grade);
  meta.append(gradeTag);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = kindLabel(t.kind);
  meta.append(kindTag);
  if (t.hidden) {
    const h = document.createElement('span');
    h.className = 'tag tag-hidden';
    h.textContent = 'Hidden on PSN';
    meta.append(h);
  }
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'tag tag-missable';
    m.textContent = 'Missable';
    meta.append(m);
  }
  if (t.countLabel) {
    const c = document.createElement('span');
    c.className = 'tag tag-count';
    c.textContent = t.countLabel;
    meta.append(c);
  }
  card.append(meta);

  const actions = document.createElement('div');
  actions.className = 'trophy-actions';
  const label = document.createElement('label');
  label.className = 'earn-check';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned(t);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
  // Stop the click reaching the card: without this, the card's click handler
  // re-renders the list before the checkbox's change event fires, and the
  // tick is lost.
  box.addEventListener('click', (e) => e.stopPropagation());
  box.addEventListener('change', () => {
    toggleEarned(t);
  });
  label.addEventListener('click', (e) => e.stopPropagation());
  label.append(box, document.createTextNode(isEarned(t) ? 'Earned' : 'Mark earned'));
  const guideBtn = document.createElement('button');
  guideBtn.type = 'button';
  guideBtn.className = 'guide-link';
  guideBtn.textContent = 'Guide & sources →';
  guideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectTrophy(t.id);
  });
  actions.append(label, guideBtn);
  card.append(actions);

  card.addEventListener('click', () => selectTrophy(t.id));
  return card;
}

function renderTracker() {
  const list = $('trophyList');
  const shown = applyFilters(trophies);
  list.replaceChildren();
  if (filterKind === 'online') {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<strong>No online trophies.</strong><br>All 55 GTA VI trophies are single-player and offline — nothing here needs PlayStation Plus or another player.';
    list.append(empty);
  } else if (shown.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No trophies match these filters. Clear the search or pick another kind or grade.';
    list.append(empty);
  } else {
    for (const t of shown) list.append(trophyCard(t));
  }
  const note = [];
  if (filterKind !== 'all') note.push(filterKind === 'online' ? 'Online: 0 trophies' : KIND_LABELS[filterKind] + ': ' + shown.length + ' shown');
  else note.push(shown.length + ' of 55 shown');
  if (filterGrade !== 'all') note.push('grade: ' + gradeLabel(filterGrade));
  if (hideEarned) note.push('earned hidden');
  if (spoilersHidden) note.push('story spoilers hidden until earned');
  $('filterNote').textContent = note.join(' · ');
  $('trophyList').parentElement.classList.toggle('with-detail', selectedId !== null);
  renderDetailPanel();
  renderProgressHeader();
}

function renderDetailPanel() {
  const panel = $('detailPanel');
  panel.replaceChildren();
  if (selectedId === null) return;
  const t = trophyById(selectedId);
  if (!t) return;
  const masked = isSpoilerMasked(t);

  const card = document.createElement('div');
  card.className = 'detail-card';
  const title = document.createElement('h2');
  title.textContent = masked ? 'Hidden story trophy' : t.name;
  const official = document.createElement('p');
  official.className = 'detail-official';
  official.textContent = masked
    ? 'Official name and description hidden until earned.'
    : '“' + t.description + '”';
  const grade = document.createElement('p');
  grade.className = 'detail-grade';
  grade.textContent = gradeLabel(t.grade) + ' trophy' + (t.hidden ? ' · Hidden on PSN' : ' · Visible on PSN') + (t.countLabel ? ' · ' + t.countLabel : '');
  card.append(title, official, grade);

  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'missable-warning';
    warn.innerHTML = '<strong>Missable — read this first.</strong> ';
    warn.append(document.createTextNode('The Chapter 1 balcony meditation is gone after Chapter 1, and it is not confirmed whether Positive Mental Attitude needs it. Do it in Chapter 1 and keep a Chapter 1 save until the trophy pops.'));
    card.append(warn);
  }

  const guide = document.createElement('p');
  guide.className = 'detail-guide';
  guide.textContent = t.guide;
  card.append(guide);

  const src = document.createElement('div');
  src.className = 'detail-sources';
  const h = document.createElement('h3');
  h.textContent = 'Where this guide comes from';
  src.append(h);
  const ul = document.createElement('ul');
  for (const s of t.sources) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    li.append(a);
    ul.append(li);
  }
  src.append(ul);
  card.append(src);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'detail-close';
  close.textContent = 'Close guide';
  close.addEventListener('click', () => selectTrophy(null));
  card.append(close);
  panel.append(card);
}

function renderRoadmap() {
  const wrap = $('roadmapStages');
  wrap.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const members = trophies.filter((t) => t.stage === stage.n);
    const done = members.filter((t) => isEarned(t)).length;
    const card = document.createElement('div');
    card.className = 'stage-card';
    const head = document.createElement('div');
    head.className = 'stage-head';
    const h = document.createElement('h2');
    h.textContent = stage.title;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = done + ' / ' + members.length + ' earned';
    head.append(h, count);
    const p = document.createElement('p');
    p.textContent = stage.text;
    const track = document.createElement('div');
    track.className = 'stage-track';
    const fill = document.createElement('div');
    fill.className = 'stage-fill';
    fill.style.width = members.length ? Math.round((done / members.length) * 100) + '%' : '0%';
    track.append(fill);
    const ul = document.createElement('ul');
    ul.className = 'stage-trophies';
    for (const t of members) {
      const li = document.createElement('li');
      li.className = isEarned(t) ? 'done' : '';
      li.textContent = (isEarned(t) ? '✓ ' : '') + (isSpoilerMasked(t) ? 'Hidden story trophy' : t.name);
      li.title = t.description;
      li.addEventListener('click', () => {
        showView('tracker');
        selectTrophy(t.id);
      });
      ul.append(li);
    }
    card.append(head, p, track, ul);
    wrap.append(card);
  }
}

function renderMissables() {
  const wrap = $('missableList');
  wrap.replaceChildren();
  const t = trophies.find((x) => x.missable);
  if (t) {
    const card = document.createElement('div');
    card.className = 'missable-card';
    const h = document.createElement('h2');
    h.textContent = '⚠ ' + t.name + ' — the one trophy you can miss';
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = '“' + t.description + '” — Bronze · ' + t.countLabel;
    const guide = document.createElement('p');
    guide.textContent = t.guide;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'guide-link';
    open.textContent = 'Open the full guide in the tracker →';
    open.addEventListener('click', () => {
      showView('tracker');
      selectTrophy(t.id);
    });
    card.append(h, desc, guide, open);
    wrap.append(card);
  }

  const timed = document.createElement('div');
  timed.className = 'missable-card';
  const th = document.createElement('h2');
  th.textContent = 'Time-sensitive, not missable: Race Against Yago';
  const tp = document.createElement('p');
  tp.textContent = 'In Chapter 3, Yago\u2019s street racing strand offers Race Against Yago with an hourglass icon: it disappears if you leave it too long, and the strand counts toward Strangers & Freaks (8 strands). Do it the moment it appears, and save first. Missing the race does not lock the platinum by itself — other strands can fill the 8 — but it is the only timed window reported so far.';
  const tcite = document.createElement('p');
  tcite.className = 'cite';
  tcite.textContent = 'Source: ';
  const ta = document.createElement('a');
  ta.href = 'https://outputlag.com/guides/gta-6-trophy-list/';
  ta.target = '_blank';
  ta.rel = 'noopener';
  ta.textContent = 'OutputLag — GTA 6 trophy list';
  tcite.append(ta);
  timed.append(th, tp, tcite);
  wrap.append(timed);

  const safe = document.createElement('div');
  safe.className = 'safe-card';
  const sh = document.createElement('h2');
  sh.textContent = 'What you cannot miss';
  const sp = document.createElement('p');
  sp.textContent = 'Everything else can be done after the story, in free roam:';
  const ul = document.createElement('ul');
  const safeItems = [
    'All 12 story chapter and mission trophies — they pop as you play, and cannot be missed.',
    'All five side-character finales (Andy, Kenton, Billy, Randy, Tyrone) — the quest givers return after the story.',
    'Stranger mission chains: some have windows tied to story progress, so start them when they unlock to be safe, but their finales stay open.',
    'Every collectible, robbery, activity and money trophy — the whole map stays open after the credits.',
    'Nothing on the 100% completion checklist is missable, and it only asks for 15 of the 18 meditation spots.',
  ];
  for (const item of safeItems) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.append(li);
  }
  safe.append(sh, sp, ul);
  wrap.append(safe);
  $('missableTabCount').textContent = String(trophies.filter((x) => x.missable).length);
}

function toggleEarned(t) {
  if (isEarned(t)) earned.delete(t.name);
  else earned.add(t.name);
  saveProgress();
  renderTracker();
  renderRoadmap();
}

function selectTrophy(id) {
  selectedId = id;
  renderTracker();
  if (id !== null) {
    const el = document.querySelector('.trophy-card[data-trophy-id="' + id + '"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
}

function showView(view) {
  currentView = view;
  document.querySelectorAll('.view-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  document.querySelectorAll('.view-panel').forEach((p) => {
    p.hidden = p.id !== 'view-' + view;
  });
  if (view === 'roadmap') renderRoadmap();
  if (view === 'missables') renderMissables();
}

function exportProgress() {
  const payload = {
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
    total: trophies.length,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function importProgress(file) {
  file.text().then((text) => {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      alert('That file is not valid JSON.');
      return;
    }
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) {
      alert('That file has no earned list in it.');
      return;
    }
    const known = new Set(trophies.map((t) => t.name));
    const good = names.filter((n) => typeof n === 'string' && known.has(n));
    earned = new Set(good);
    saveProgress();
    renderTracker();
    renderRoadmap();
    alert('Imported ' + good.length + ' earned trophies.');
  }).catch(() => alert('That file could not be read.'));
}

function wireControls() {
  document.querySelectorAll('.view-tab').forEach((b) => {
    b.addEventListener('click', () => showView(b.dataset.view));
  });
  $('searchBox').addEventListener('input', (e) => {
    filterQuery = e.target.value;
    renderTracker();
  });
  $('gradeFilter').addEventListener('change', (e) => {
    filterGrade = e.target.value;
    renderTracker();
  });
  $('spoilerToggle').addEventListener('change', (e) => {
    spoilersHidden = e.target.checked;
    saveSpoilerSetting();
    renderTracker();
    renderRoadmap();
  });
  $('hideEarnedToggle').addEventListener('change', (e) => {
    hideEarned = e.target.checked;
    renderTracker();
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importProgress(file);
    e.target.value = '';
  });
}

function start() {
  return loadTrophies().then((list) => {
    trophies = list;
    if (demoMode) {
      earned = seedDemoProgress();
    } else {
      earned = loadStoredProgress();
    }
    spoilersHidden = params.get('spoilers') === 'off' ? false
      : params.get('spoilers') === 'on' ? true
      : loadStoredSpoilerSetting();
    $('spoilerToggle').checked = spoilersHidden;
    const view = params.get('view');
    if (view === 'roadmap' || view === 'missables' || view === 'about') currentView = view;
    const trophyParam = Number(params.get('trophy'));
    if (Number.isInteger(trophyParam) && trophyById(trophyParam)) selectedId = trophyParam;
    wireControls();
    renderKindFilters();
    showView(currentView);
    renderTracker();
    renderRoadmap();
    renderMissables();
  }).catch((err) => {
    document.querySelector('main').innerHTML =
      '<p class="empty-state">The trophy data could not be loaded (' + err.message + '). ' +
      'Serve the app folder with a static server and open index.html again.</p>';
  });
}

start();
