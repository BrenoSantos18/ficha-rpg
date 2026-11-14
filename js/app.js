// Interface do gerenciador de fichas
'use strict';

const STORE_KEY = 'ficha-rpg:v1';
const UI_KEY = 'ficha-rpg:ui';
let db = { sheets: {}, open: [], active: null };
let ui = { sub: {}, rollMode: 'normal', library: false, showFuture: false, preview: false, libQ: '', libSel: new Set() };

const GEAR = [
  ['Aljava', 1], ['Algemas', 6], ['Arpéu', 4], ['Bolsa', 1], ['Cantil', 5], ['Corda (15 m)', 5], ['Corrente (3 m)', 10],
  ['Espelho', 0.5], ['Flechas (20)', 1], ['Virotes (20)', 1.5], ['Frasco de Óleo', 1], ['Água Benta (frasco)', 1], ['Ácido (frasco)', 1],
  ['Fogo de Alquimista (frasco)', 1], ['Antitoxina', 0], ['Poção de Cura', 0.5], ['Ração (1 dia)', 2], ['Saco de Dormir', 7],
  ['Tenda', 20], ['Tocha', 1], ['Lanterna Coberta', 2], ['Lâmpada', 1], ['Pé de Cabra', 5], ['Pá', 5], ['Martelo', 3], ['Pitons (10)', 2.5],
  ['Kit de Curandeiro', 3], ['Kit de Herbalismo', 3], ['Kit de Disfarce', 3], ['Kit de Falsificação', 5], ['Kit de Venenos', 2],
  ['Ferramentas de Ladrão', 1], ['Suprimentos de Caligrafia', 5], ['Kit de Jogo', 0], ['Instrumento Musical', 3], ['Livro', 5],
  ['Pergaminho (folha)', 0], ['Tinta (frasco)', 0], ['Pena de Escrever', 0], ['Símbolo Sagrado', 1], ['Foco Arcano', 1], ['Foco Druídico', 1], ['Grimório', 3],
  ['Roupas de Viajante', 4], ['Roupas Finas', 6], ['Túnica', 4], ['Fantasia', 4], ['Manto', 3], ['Mochila', 5], ['Baú', 25],
  ['Pacote de Aventureiro', 55], ['Pacote de Explorador de Masmorras', 55], ['Pacote de Sacerdote', 29], ['Pacote de Erudito', 22],
  ['Pacote de Artista', 58], ['Pacote de Assaltante', 42], ['Pacote de Diplomata', 39],
];
const GEAR_W = Object.fromEntries(GEAR);

// ---------------------------------------------------------------- Armazenamento
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) db = Object.assign(db, JSON.parse(raw));
    for (const id of Object.keys(db.sheets)) migrate(db.sheets[id]);
    db.open = db.open.filter(id => db.sheets[id]);
    if (!db.sheets[db.active]) db.active = db.open[0] || null;
    const u = localStorage.getItem(UI_KEY);
    if (u) ui = Object.assign(ui, JSON.parse(u), { library: false });
  } catch (e) { console.error(e); }
}
let saveTimer = null;
function save(now) {
  clearTimeout(saveTimer);
  const doIt = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(db));
      localStorage.setItem(UI_KEY, JSON.stringify({ sub: ui.sub, rollMode: ui.rollMode, showFuture: ui.showFuture }));
    } catch (e) {
      toast('Não foi possível salvar: armazenamento cheio. Tente usar fotos menores ou exportar fichas antigas.', 'bad');
    }
  };
  if (now) doIt(); else saveTimer = setTimeout(doIt, 250);
}
function touch(s) { s.updatedAt = Date.now(); save(); }
const active = () => db.sheets[db.active] || null;

// ---------------------------------------------------------------- Utilitários
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(sel) === String(v) ? ' selected' : ''}>${esc(label)}</option>`;
const $ = (sel, root = document) => root.querySelector(sel);

function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, val) {
  const keys = path.split('.'); const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] == null ? (o[k] = {}) : o[k]), obj);
  target[last] = val;
}

// Soma dos níveis das classes de multiclasse (a classe inicial fica com o restante do nível de personagem)
const mcLevels = (s) => (s.multiclass || []).reduce((t, m) => t + (CLASS[m.classId] ? Math.max(1, +m.level || 1) : 0), 0);
function classLine(s) {
  return [{ classId: s.classId, level: s.level }].concat(s.multiclass || []).filter(c => CLASS[c.classId])
    .map(c => `${CLASS[c.classId].name} ${c.level}`).join(' / ');
}
function speciesLabel(s) {
  const sp = SPECIE[s.species]; if (!sp) return '';
  const o = ((sp.choices || []).find(c => c.key === 'subrace') || { options: [] }).options.find(x => x.id === (s.speciesChoices || {}).subrace);
  return o ? o.name : sp.name;
}
function summary(s) {
  return [speciesLabel(s), classLine(s)].filter(Boolean).join(' · ') || 'Personagem incompleto';
}
// Dados de Vida por tipo. Uma classe: usa hitDiceUsed (contrato original). Multiclasse: hitDiceUsedBy { dado: gastos }.
function hdState(s, d) {
  if (d.hitDice.length <= 1) { const h = d.hitDice[0] || { die: d.hd, count: d.level }; return [{ die: h.die, count: h.count, used: Math.min(h.count, +s.hitDiceUsed || 0) }]; }
  const by = s.hitDiceUsedBy || {};
  return d.hitDice.map(h => ({ die: h.die, count: h.count, used: Math.min(h.count, +by[h.die] || 0) }));
}
const hdLabel = (d) => d.hitDice.map(h => `${h.count}d${h.die}`).join(' + ') || `${d.level}d${d.hd}`;

function pips(total, available, action, data = '', cls = '') {
  let h = `<span class="pips ${cls}">`;
  for (let i = 0; i < total; i++) h += `<button class="pip${i < available ? ' on' : ''}" data-action="${action}" data-i="${i}" ${data} title="${i < available ? 'Usar' : 'Recuperar'}"></button>`;
  return h + '</span>';
}

// ---------------------------------------------------------------- Toasts / dados
function toast(html, kind = '', ms = 4500) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = html;
  el.addEventListener('click', () => el.remove());
  box.prepend(el);
  while (box.children.length > 5) box.lastChild.remove();
  setTimeout(() => el.classList.add('out'), ms - 400);
  setTimeout(() => el.remove(), ms);
}

function rollD20(label, bonus, opts = {}) {
  const s = active();
  const mode = opts.mode || ui.rollMode;
  const a = rollDie(20), b = rollDie(20);
  let nat = a, dice = `${a}`;
  if (mode === 'adv') { nat = Math.max(a, b); dice = `${a} | ${b} <small>vant.</small>`; }
  if (mode === 'dis') { nat = Math.min(a, b); dice = `${a} | ${b} <small>desv.</small>`; }
  const exh = s ? (+s.exhaustion || 0) * 2 : 0;
  const total = nat + bonus - exh;
  const crit = nat === 20 ? ' crit' : nat === 1 ? ' fumble' : '';
  toast(`<div class="t-label">${esc(label)}</div><div class="t-line"><span class="t-dice">🎲 ${dice}</span> ${fmt(bonus)}${exh ? ` −${exh} <small>exaustão</small>` : ''} = <b class="t-total${crit}">${total}</b></div>${nat === 20 ? '<div class="t-note">20 natural!</div>' : nat === 1 ? '<div class="t-note">1 natural…</div>' : ''}`, 'roll');
  return { nat, total };
}
function rollDamage(label, expr, crit, extraAfterCrit = '') {
  let e = expr;
  if (crit) e = expr.replace(/(\d*)d(\d+)/g, (_, n, d) => `${(+n || 1) * 2}d${d}`);
  if (extraAfterCrit) e += '+' + extraAfterCrit;
  const r = rollExpr(e);
  toast(`<div class="t-label">${esc(label)}${crit ? ' — CRÍTICO' : ''}</div><div class="t-line"><span class="t-dice">${esc(e)}</span> → ${esc(r.detail)} = <b class="t-total">${r.total}</b></div>`, 'roll dmg');
  return r;
}

// ---------------------------------------------------------------- Renderização
const SUBTABS = [['build', 'Construção'], ['main', 'Atributos & Perícias'], ['combat', 'Combate'], ['spells', 'Magias'], ['inv', 'Inventário'], ['features', 'Características'], ['bio', 'Biografia']];

let renderQueued = false, pointerDown = false, renderPending = false;
function scheduleRender() {
  // Não re-renderiza com o mouse pressionado: o clique em curso seria perdido.
  if (pointerDown) { renderPending = true; return; }
  if (renderQueued) return;
  renderQueued = true;
  setTimeout(() => { renderQueued = false; render(); }, 0);
}
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
document.addEventListener('pointerup', () => {
  pointerDown = false;
  if (renderPending) { renderPending = false; setTimeout(scheduleRender, 0); }
}, true);

function render() {
  const ae = document.activeElement;
  let focusSel = null, selStart = null;
  if (ae && ae !== document.body) {
    if (ae.dataset.bind) focusSel = `[data-bind="${ae.dataset.bind}"]`;
    else if (ae.id) focusSel = '#' + ae.id;
    try { selStart = ae.selectionStart; } catch (e) { /* number inputs */ }
  }
  const sy = window.scrollY;

  renderHeader();
  const main = $('#main');
  const s = active();
  main.innerHTML = s ? renderSheet(s) : renderHome();
  renderLightbox(s);
  renderLevelUp(s);
  renderPicker(s);
  $('#library').innerHTML = ui.library ? renderLibrary() : '';
  $('#library').hidden = !ui.library;

  window.scrollTo(0, sy);
  if (focusSel) {
    const el = $(focusSel);
    if (el) { el.focus({ preventScroll: true }); if (selStart != null) try { el.setSelectionRange(selStart, selStart); } catch (e) { /* ignore */ } }
  }
}




// ---------------------------------------------------------------- Seletor em modal (listas com descrição)
// Substitui listas suspensas longas: cartões com nome, resumo e descrição; bloqueados aparecem com o motivo.
// item: { value, label, group, sub, desc, why, badge }
const WTRAIN = { simple: 'Simples', martial: 'Marciais', 'martial-light': 'Marciais com Leve', 'martial-finesse-light': 'Marciais com Acuidade ou Leve' };
function abIncText(id) { const A = FEAT_AB[id]; return A.asi ? '+2 em um atributo ou +1 em dois' : '+1 em ' + (A.from.length === 6 ? 'qualquer atributo' : A.from.map(a => AB[a].short).join(' ou ')) + (A.max === 30 ? ' (até 30)' : ''); }
const featItem = (f, why) => ({ value: f.id, label: f.name, group: f.cat, why, desc: f.desc,
  sub: [featReqText(f) && 'Pré-requisito: ' + featReqText(f), FEAT_AB[f.id] && abIncText(f.id)].filter(Boolean).join(' · ') });
const classItem = (c, why) => ({ value: c.id, label: c.name, why,
  sub: `Dado de Vida d${c.hd} · Atributo principal: ${c.primary}${c.caster ? ' · Conjura (' + AB[c.castAb].name + ')' : ''}`,
  desc: `Salvaguardas: ${c.saves.map(a => AB[a].name).join(', ')}. Armaduras: ${c.armor.map(a => a === 'shield' ? 'escudos' : ARMOR_TYPE_NAME[a].toLowerCase()).join(', ') || 'nenhuma'}. Armas: ${c.weapons.map(w => WTRAIN[w].toLowerCase()).join(', ')}. ${c.skillCount} perícias. Subclasses: ${c.subclasses.map(x => x.name).join(', ')}.` });
const subItem = (x) => ({ value: x.id, label: x.name, sub: x.homebrew ? `Homebrew — ${x.homebrew}. Não é conteúdo oficial; confirme com o mestre.` : 'Características por nível', badge: x.homebrew ? 'homebrew' : '',
  desc: x.features.map(([l, n, t]) => `Nv ${l} — ${n}${t ? ': ' + t : ''}`).join('\n') });
const weaponItem = (d) => (w) => ({ value: w.id, label: w.name + (w.hb ? ' (homebrew)' : ''),
  group: w.cat === 'firearm' ? 'Armas de fogo — homebrew de Matt Mercer' : `${w.cat === 'simple' ? 'Simples' : 'Marciais'} ${w.kind === 'm' ? 'corpo a corpo' : 'à distância'}`,
  sub: `${w.dmg} ${w.dtype}${w.props.length ? ' · ' + w.props.join(', ') : ''} · ${w.weight} lb`,
  desc: w.mastery ? `Maestria ${w.mastery}: ${MASTERY_DESC[w.mastery]}` : 'Sem propriedade de Maestria. Exige proficiência com armas de fogo (Pistoleiro).',
  badge: weaponProficient(d, w) ? '' : 'sem proficiência' });
const armorItem = (d) => (a) => ({ value: a.id, label: a.name, group: a.type === 'none' ? 'Sem armadura' : 'Armadura ' + ARMOR_TYPE_NAME[a.type].toLowerCase(),
  sub: a.type === 'none' ? 'CA 10 + DES (ou Defesa sem Armadura da classe)' : `CA ${a.base}${a.type === 'light' ? ' + DES' : a.type === 'medium' ? ' + DES (máx. 2)' : ''} · ${a.weight} lb`,
  desc: [a.str && `Exige FOR ${a.str} (senão −3 m de deslocamento).`, a.stealth && 'Desvantagem em Furtividade.'].filter(Boolean).join(' '),
  badge: a.type === 'none' || d.armorTrain.has(a.type) ? '' : 'sem treinamento' });
// classe da ficha a que um seletor se refere: 'p' = inicial, número = índice em multiclass
const entryOf = (s, who) => who === 'p' ? { classId: s.classId, sub: s.subclass, choices: s.classChoices } : (() => { const m = s.multiclass[+who] || {}; return { classId: m.classId, sub: m.subclass, choices: m.classChoices || {} }; })();

const PICKERS = {
  classId: (s) => ({ title: 'Escolher a classe', selected: s.classId, items: CLASSES.map(c => classItem(c)),
    pick: (s, v) => { s.classId = v; onChange.classId(s); } }),
  species: (s) => ({ title: 'Escolher a espécie', selected: s.species, items: SPECIES.map(x => ({ value: x.id, label: x.name,
      group: x.legacy ? `Legado — ${x.legacy} (não é do Livro do Jogador 2024; confirme com o mestre)` : 'Livro do Jogador 2024', badge: x.legacy ? 'legado' : '',
      sub: `${x.size} · ${ftToM(x.speed)} m${x.darkvision ? ' · Visão no escuro ' + ftToM(x.darkvision) + ' m' : ''}`,
      desc: x.traits.map(([l, n, t]) => `${n}${l > 1 ? ` (nível ${l})` : ''}: ${t}`).join('\n') + ((x.choices || []).find(c => c.key === 'subrace') ? '\nSub-raças: ' + x.choices.find(c => c.key === 'subrace').options.map(o => o.name).join(', ') : '') })),
    pick: (s, v) => { s.species = v; onChange.species(s); } }),
  background: (s) => ({ title: 'Escolher o antecedente', selected: s.background, items: BACKGROUNDS.map(b => ({ value: b.id, label: b.name,
      sub: `Atributos: ${b.abilities.map(a => AB[a].short).join(', ')} · Talento: ${FEAT[b.feat].name}`,
      desc: `Perícias: ${b.skills.map(k => SK[k].name).join(', ')}. Ferramenta: ${b.tool}.\n${FEAT[b.feat].name}: ${FEAT[b.feat].desc}` })),
    pick: (s, v) => { s.background = v; onChange.background(s); } }),
  subclass: (s, d, who) => { const e = entryOf(s, who); const c = CLASS[e.classId];
    return { title: `Subclasse de ${c.name}`, selected: e.sub, none: '— Nenhuma por enquanto', items: c.subclasses.map(subItem),
      pick: (s, v) => { if (who === 'p') s.subclass = v; else s.multiclass[+who].subclass = v; } }; },
  classChoice: (s, d, arg) => { const [who, key] = arg.split(':'); const e = entryOf(s, who); const ch = CLASS[e.classId].choices.find(x => x.key === key);
    return { title: `${ch.label} — ${CLASS[e.classId].name}`, selected: e.choices[key], items: ch.options.map(o => ({ value: o.id, label: o.name, desc: o.desc })),
      pick: (s, v) => { if (who === 'p') s.classChoices[key] = v; else { const m = s.multiclass[+who]; m.classChoices = Object.assign({}, m.classChoices, { [key]: v }); } } }; },
  speciesChoice: (s, d, key) => { const ch = d.sp.choices.find(x => x.key === key);
    let items;
    if (ch.skillAny) items = SKILLS.map(k => ({ value: k.id, label: k.name, sub: AB[k.ab].name, why: d.skills[k.id].auto && s.speciesChoices[key] !== k.id ? 'já é proficiente' : '' }));
    else if (ch.featOrigin) items = FEATS.filter(f => f.cat === 'Origem').map(f => featItem(f, f.id === d.bg.feat && !FEAT_REPEATABLE.has(f.id) ? 'já vem do antecedente' : ''));
    else items = ch.options.map(o => ({ value: o.id, label: o.name, desc: o.desc || '' }));
    return { title: `${ch.label} — ${d.sp.name}`, selected: s.speciesChoices[key], items, pick: (s, v) => { s.speciesChoices[key] = v; } }; },
  feat: (s, d) => ({ title: 'Adicionar talento', items: FEATS.map(f => featItem(f, featBlocked(f, s, d))),
    pick: (s, v) => { s.feats.push({ id: uid(), featId: v, note: '', ab: {} }); if (FEAT_AB[v]) toast(`${FEAT[v].name} adicionado — escolha o atributo que ele aumenta.`); } }),
  lvFeat: (s) => { const base = lvApply(s, ui.lv, false), db = compute(base);
    return { title: 'Novo talento', selected: ui.lv.feat, none: 'Escolher depois',
      items: FEATS.filter(f => f.cat !== 'Estilo de Luta').map(f => featItem(f, featBlocked(f, base, db))), pick: (s, v) => { ui.lv.feat = v; ui.lv.ab = {}; } }; },
  lvStyle: (s) => { const base = lvApply(s, ui.lv, false), db = compute(base);
    return { title: 'Estilo de Luta', selected: ui.lv.style, none: 'Escolher depois',
      items: FEATS.filter(f => f.cat === 'Estilo de Luta').map(f => featItem(f, featBlocked(f, base, db))), pick: (s, v) => { ui.lv.style = v; } }; },
  lvSubclass: (s) => { const id = ui.lv.choice.replace('new:', ''); const c = CLASS[id];
    return { title: `Subclasse de ${c.name}`, selected: ui.lv.subclass, none: 'Escolher depois', items: c.subclasses.map(subItem), pick: (s, v) => { ui.lv.subclass = v; } }; },
  lvNewClass: (s, d) => ({ title: 'Nova classe (multiclasse)', selected: ui.lv.choice.replace('new:', ''),
    items: lvOptions(s, d).fresh.map(o => classItem(CLASS[o.id.slice(4)], o.why)),
    pick: (s, v) => { Object.assign(ui.lv, { choice: 'new:' + v, subclass: '', feat: '', style: '', ab: {} }); } }),
  weapon: (s, d) => ({ title: 'Adicionar arma', items: WEAPONS.map(weaponItem(d)),
    pick: (s, v) => { const before = s.attacks.length; addWeaponTo(s, v); if (s.attacks.length === before) s.attacks.push({ id: uid(), weaponId: v });
      toast(`${WEAPON[v].name} adicionada aos ataques e ao inventário.`, 'good'); } }),
  armor: (s, d) => ({ title: 'Armadura vestida', selected: s.armor, items: ARMORS.map(armorItem(d)), pick: (s, v) => { s.armor = v; } }),
  gear: (s, d) => ({ title: 'Adicionar arma, armadura ou escudo', items: WEAPONS.map(weaponItem(d))
      .concat(ARMORS.filter(a => a.type !== 'none').map(a => Object.assign(armorItem(d)(a), { value: 'a:' + a.id })))
      .concat([{ value: 'a:shield', label: 'Escudo', group: 'Escudo', sub: '+2 CA · 6 lb', badge: d.armorTrain.has('shield') ? '' : 'sem treinamento' }]),
    pick: (s, v) => {
      if (!v.startsWith('a:')) { addWeaponTo(s, v); toast(`${WEAPON[v].name} adicionada ao inventário e aos ataques.`, 'good'); return; }
      const id = v.slice(2);
      if (id === 'shield') s.inventory.push({ id: uid(), name: 'Escudo', qty: 1, weight: 6, equipped: false, notes: '+2 CA' });
      else { const a = ARMOR[id]; s.inventory.push({ id: uid(), name: a.name, qty: 1, weight: a.weight, equipped: false, notes: `Armadura ${ARMOR_TYPE_NAME[a.type]}, CA ${a.base}` }); }
      toast('Armadura adicionada. Para vesti-la, escolha-a em Combate → Defesa.'); } }),
};

// Botão que abre o seletor
function pickBtn(type, arg, label, placeholder, cls = '', disabled = '') {
  return `<button class="pick-btn ${cls}" data-action="openPicker" data-type="${type}" data-arg="${esc(arg || '')}"${disabled ? ` disabled title="${esc(disabled)}"` : ''}>${label ? `<span>${esc(label)}</span>` : `<span class="muted">${esc(placeholder)}</span>`}<span class="pick-caret">▾</span></button>`;
}

function renderPicker(s) {
  let box = $('#picker');
  if (!box) { box = document.createElement('div'); box.id = 'picker'; document.body.appendChild(box); }
  const p = ui.picker && s && ui.picker.sheet === s.id ? ui.picker : null;
  box.hidden = !p;
  if (!p) { box.innerHTML = ''; return; }
  const spec = PICKERS[p.type](s, compute(s), p.arg);
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const groups = [];
  spec.items.forEach(it => { let g = groups.find(x => x.name === (it.group || '')); if (!g) groups.push(g = { name: it.group || '', items: [] }); g.items.push(it); });
  const item = (it) => `<button class="pk-item${it.value === spec.selected ? ' on' : ''}${it.why ? ' dis' : ''}" data-action="pickerSelect" data-value="${esc(it.value)}"${it.why ? ' disabled' : ''} data-search="${esc(norm(it.label + ' ' + (it.sub || '') + ' ' + (it.desc || '')))}">
      <span class="pk-top"><span class="pk-name">${esc(it.label)}</span>${it.value === spec.selected ? '<span class="pk-tag ok">✓ atual</span>' : ''}${it.badge ? `<span class="pk-tag bad-text">${esc(it.badge)}</span>` : ''}${it.why ? `<span class="pk-tag pk-why">🔒 ${esc(it.why)}</span>` : ''}</span>
      ${it.sub ? `<span class="pk-sub">${esc(it.sub)}</span>` : ''}
      ${it.desc ? `<span class="pk-desc">${esc(it.desc).replace(/\n/g, '<br>')}</span>` : ''}</button>`;
  box.innerHTML = `<div class="modal-bg picker-bg" data-action="pickerClose"></div>
  <div class="modal picker-modal" role="dialog" aria-label="${esc(spec.title)}">
    <div class="modal-head"><h2>${esc(spec.title)}</h2><button class="btn sm" data-action="pickerClose">Fechar</button></div>
    <input id="pickerSearch" type="search" placeholder="Buscar…" autocomplete="off" value="${esc(p.q || '')}">
    <div class="pk-list">
      ${spec.none ? `<button class="pk-item pk-none${!spec.selected ? ' on' : ''}" data-action="pickerSelect" data-value="" data-search=""><span class="pk-name">${esc(spec.none)}</span></button>` : ''}
      ${groups.map(g => `<div class="pk-group">${g.name ? `<h4>${esc(g.name)}</h4>` : ''}${g.items.map(item).join('')}</div>`).join('')}
    </div>
  </div>`;
  filterPicker(p.q || '');
  if (p.justOpened) { p.justOpened = false; if (!matchMedia('(hover: none)').matches) setTimeout(() => { const i = $('#pickerSearch'); if (i) i.focus(); }, 0); }
}
function filterPicker(q) {
  const n = String(q).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  document.querySelectorAll('#picker .pk-item').forEach(b => { b.hidden = !!n && !b.dataset.search.includes(n); });
  document.querySelectorAll('#picker .pk-group').forEach(g => { g.hidden = ![...g.querySelectorAll('.pk-item')].some(b => !b.hidden); });
}

// ---------------------------------------------------------------- Pendências (o que falta configurar)
// Lista o que falta escolher ou passou do limite, usando os mesmos números do motor de regras.
// sev: 'todo' = falta configurar; 'bad' = passou do limite / fora da regra
function pendings(s, d) {
  const out = [];
  const add = (tab, text, sev = 'todo') => out.push({ tab, text, sev });
  const n = (k, a, b) => `${k} ${a} de ${b}`;
  // Construção: básico
  if (!s.species) add('build', 'Escolher a espécie');
  if (!s.background) add('build', 'Escolher o antecedente');
  if (!s.classId) add('build', 'Escolher a classe');
  // Espécie
  if (d.sp.id) {
    if (d.sp.sizeChoice && !s.size) add('build', `Escolher o tamanho — ${d.sp.name}`);
    for (const ch of d.sp.choices || []) if (!(s.speciesChoices || {})[ch.key]) add('build', `Escolher ${ch.label} — ${d.sp.name}`);
  }
  // Antecedente
  if (d.bg.id && s.bgMode !== '111' && (!d.bg.abilities.includes(s.bg2) || !d.bg.abilities.includes(s.bg1) || s.bg1 === s.bg2)) add('build', 'Distribuir o aumento de atributos do antecedente');
  // Classes
  for (const c of d.classes) {
    for (const ch of c.cls.choices || []) if (!c.classChoices[ch.key]) add('build', `Escolher ${ch.label} — ${c.cls.name}`);
    if (c.level >= 3 && !c.subclass) add('build', `Escolher a subclasse de ${c.cls.name}`);
  }
  if (d.cls.id && s.classSkills.length < d.classSkillMax) add('build', `Escolher ${d.classSkillMax - s.classSkills.length} perícia(s) de ${d.cls.name}`);
  if (d.cls.id && s.classSkills.length > d.classSkillMax) add('build', `Perícias de ${d.cls.name} acima do limite (${s.classSkills.length}/${d.classSkillMax})`, 'bad');
  d.mcPicks.forEach(p => { if (p.used < p.count) add('build', `Escolher ${p.count - p.used} perícia de ${p.name} (multiclasse)`); });
  // Atributos
  if (s.abilityMethod === 'pointbuy') {
    const left = POINT_BUY_BUDGET - pointBuySpent(s.abilities);
    if (left > 0) add('build', `Distribuir ${left} ponto(s) de atributo (compra de pontos)`);
    if (left < 0) add('build', `Compra de pontos estourada em ${-left} ponto(s)`, 'bad');
  }
  if (s.abilityMethod === 'standard') {
    const v = ABILITIES.map(a => +s.abilities[a.id]).sort((a, b) => b - a);
    if (JSON.stringify(v) !== JSON.stringify(STANDARD_ARRAY)) add('build', 'Distribuir o arranjo padrão (15, 14, 13, 12, 10, 8)');
  }
  d.mcIssues.forEach(m => add('build', `Pré-requisito de multiclasse: ${m}`, 'bad'));
  const langs = (s.languages || []).filter(Boolean).length;
  if (langs < 3) add('build', `Escolher ${3 - langs} idioma(s)`);
  // Perícias
  if (d.expertiseUsed < d.expertiseMax) add('main', `Escolher ${d.expertiseMax - d.expertiseUsed} especialização(ões)`);
  if (d.expertiseUsed > d.expertiseMax) add('main', `Especializações acima do limite (${d.expertiseUsed}/${d.expertiseMax})`, 'bad');
  if (d.profExtraUsed < d.profExtraMax) add('main', `Escolher ${d.profExtraMax - d.profExtraUsed} perícia(s) extra(s)`);
  if (d.profExtraUsed > d.profExtraMax) add('main', `Perícias extras acima do limite (${d.profExtraUsed}/${d.profExtraMax})`, 'bad');
  // Combate
  if (d.masteryUsed < d.masteryMax) add('combat', `Marcar ${d.masteryMax - d.masteryUsed} arma(s) com Maestria${d.masteryUsed + (s.attacks || []).filter(a => WEAPON[a.weaponId] && !s.mastery[a.weaponId]).length < d.masteryMax ? ' (adicione armas em Ataques)' : ''}`);
  if (d.masteryUsed > d.masteryMax) add('combat', n('Maestrias acima do limite:', d.masteryUsed, d.masteryMax), 'bad');
  // Magias
  for (const c of d.casters) {
    const k = spellCounts(s, c.classId);
    if (k.cantrips < c.cantrips) add('spells', `Escolher ${c.cantrips - k.cantrips} truque(s) de ${c.name}`);
    if (k.cantrips > c.cantrips) add('spells', `Truques de ${c.name} acima do limite (${k.cantrips}/${c.cantrips})`, 'bad');
    if (c.classId === 'wizard' && k.book < spellMaxOf(c)) add('spells', `Copiar ${spellMaxOf(c) - k.book} magia(s) para o grimório (Mago)`);
    if (k.prepared < c.prepared) add('spells', `Preparar ${c.prepared - k.prepared} magia(s) de ${c.name}`);
    if (k.prepared > c.prepared) add('spells', `Magias preparadas de ${c.name} acima do limite (${k.prepared}/${c.prepared})`, 'bad');
  }
  // Talentos
  if (d.featUse.general < d.featSlots) add('features', `Escolher ${d.featSlots - d.featUse.general} talento(s)`);
  if (d.featUse.general > d.featSlots) add('features', `Talentos acima das vagas (${d.featUse.general}/${d.featSlots})`, 'bad');
  if (d.featUse.style < d.styleSlots) add('features', `Escolher ${d.styleSlots - d.featUse.style} Estilo(s) de Luta`);
  if (d.featUse.style > d.styleSlots) add('features', `Estilos de Luta acima das vagas (${d.featUse.style}/${d.styleSlots})`, 'bad');
  d.featAbPending.forEach(i => add('features', `Escolher o atributo de ${(FEAT[s.feats[i].featId] || {}).name || 'talento'}`));
  (s.feats || []).forEach(f => { const F = f.featId && FEAT[f.featId]; const why = F && featPrereqFail(F, d); if (why) add('features', `${F.name}: ${why}`, 'bad'); });
  return out;
}
const TAB_NAME = { build: 'Construção', main: 'Atributos & Perícias', combat: 'Combate', spells: 'Magias', inv: 'Inventário', features: 'Características', bio: 'Biografia' };
function pendingsHtml(s, list) {
  if (!list.length) return '';
  const open = ui.pendOpen === s.id;
  const bad = list.filter(p => p.sev === 'bad').length;
  return `<div class="pend-box${bad ? ' has-bad' : ''}">
    <button class="pend-toggle" data-action="pendToggle">⚠ ${list.length} ${list.length === 1 ? 'item' : 'itens'} para configurar${bad ? ` <span class="bad-text">(${bad} fora da regra)</span>` : ''} <span class="muted">${open ? '▲' : '▼'}</span></button>
    ${open ? `<ul class="pend-list">${list.map(p => `<li class="${p.sev}"><a href="#" data-action="subtab" data-tab="${p.tab}"><span class="pend-tab">${TAB_NAME[p.tab]}</span> ${esc(p.text)}</a></li>`).join('')}</ul>` : ''}
  </div>`;
}

// ---------------------------------------------------------------- Subir de nível (modal)
// O modal calcula a ficha como está e como ficaria depois (mesmo motor de regras) e mostra a diferença.
function lvOptions(s, d) {
  if (d.level >= 20) return { cur: [], fresh: [] };
  const cur = d.classes.filter(c => c.level < 20).map(c => ({ id: c.classId, label: `${c.cls.name} ${c.level} → ${c.level + 1}` }));
  const blockedNow = d.classes.map(c => multiclassReqFail(c.classId, d.scores)).find(Boolean);
  const fresh = CLASSES.filter(c => !d.classes.some(x => x.classId === c.id)).map(c => {
    const why = multiclassReqFail(c.id, d.scores) || (blockedNow ? blockedNow.replace(' exige', ' (atual) exige') : '');
    return { id: 'new:' + c.id, label: c.name, why: why ? why.replace(c.name + ' exige', 'exige') : '' };
  });
  return { cur, fresh };
}
function lvApply(s, lv, withPicks = true) {
  const n = JSON.parse(JSON.stringify(s));
  n.multiclass = n.multiclass || [];
  const isNew = lv.choice.startsWith('new:');
  const id = isNew ? lv.choice.slice(4) : lv.choice;
  if (isNew) n.multiclass.push({ classId: id, level: 1, subclass: '', classChoices: {}, classSkills: [] });
  else if (id === n.classId) n.level = (+n.level || 1) + 1;
  else { const m = n.multiclass.find(x => x.classId === id); if (m) m.level = (+m.level || 1) + 1; }
  if (withPicks) {
    if (lv.subclass) { if (id === n.classId) n.subclass = lv.subclass; else { const m = n.multiclass.find(x => x.classId === id); if (m) m.subclass = lv.subclass; } }
    const lvl = compute(s).level + 1;
    if (lv.feat) n.feats.push({ id: uid(), featId: lv.feat, note: `Nível ${lvl}`, ab: lv.ab || {} });
    if (lv.style) n.feats.push({ id: uid(), featId: lv.style, note: `Nível ${lvl}` });
  }
  return n;
}
function levelDiff(s0, d0, s1, d1, lv, dBase = d1) {
  const id = lv.choice.replace('new:', '');
  const c1 = d1.classes.find(c => c.classId === id);
  const sec = [], pend = [];
  const li = (txt, cls = '') => `<li class="${cls}">${txt}</li>`;
  // Básico
  const basic = [li(`Nível de personagem <b>${d0.level} → ${d1.level}</b>${d1.multi ? ` · ${esc(classLine(s1))}` : ''}`)];
  if (d1.pb !== d0.pb) basic.push(li(`Bônus de proficiência <b>${fmt(d0.pb)} → ${fmt(d1.pb)}</b> (perícias, salvaguardas, ataques e CD)`, 'up'));
  const hpLevel = dBase.hpMax - d0.hpMax, hpChoice = d1.hpMax - dBase.hpMax;
  basic.push(li(`Pontos de Vida máximos <b>${d0.hpMax} → ${d1.hpMax}</b> (+${hpLevel} do nível: média do d${c1.cls.hd} + CON${hpChoice ? `; ${hpChoice > 0 ? '+' : ''}${hpChoice} do talento escolhido` : ''})`, 'up'));
  basic.push(li(`Dado de Vida <b>+1d${c1.cls.hd}</b>`));
  ABILITIES.filter(a => d1.scores[a.id] !== d0.scores[a.id]).forEach(a => basic.push(li(`${a.name} <b>${d0.scores[a.id]} → ${d1.scores[a.id]}</b> (mod. ${fmt(d0.mods[a.id])} → ${fmt(d1.mods[a.id])})`, 'up')));
  if (d1.speed !== d0.speed) basic.push(li(`Deslocamento <b>${ftToM(d0.speed)} → ${ftToM(d1.speed)} m</b>`, 'up'));
  if (d1.ac !== d0.ac) basic.push(li(`CA <b>${d0.ac} → ${d1.ac}</b>`, 'up'));
  const newSaves = ABILITIES.filter(a => d1.saves[a.id].prof && !d0.saves[a.id].prof);
  if (newSaves.length) basic.push(li(`Proficiência em salvaguardas: <b>${newSaves.map(a => a.name).join(', ')}</b>`, 'up'));
  if (d1.aura !== d0.aura) basic.push(li(`Aura de Proteção: <b>+${d1.aura}</b> em todas as salvaguardas`, 'up'));
  if (d1.initAdv && !d0.initAdv) basic.push(li('Vantagem na Iniciativa', 'up'));
  sec.push(['Geral', basic]);
  // Classe nova: proficiências
  if (lv.choice.startsWith('new:')) {
    sec.push([`Entrando em ${c1.cls.name} (multiclasse)`, [li(`Proficiências: ${esc(mcGainText(id))}`), li('Salvaguardas continuam só as da classe inicial', 'muted')]]);
    if ((c1.cls.choices || []).length) pend.push(`${c1.cls.choices.map(ch => ch.label).join(', ')} de ${c1.cls.name} — Construção`);
  }
  // Características novas
  const key = (f) => f.src + '|' + f.name + '|' + f.lvl;
  const had = new Set(d0.features.filter(f => f.lvl <= f.srcLevel).map(key));
  const feats = d1.features.filter(f => f.lvl <= f.srcLevel && !had.has(key(f)));
  if (feats.length) sec.push(['Características novas', feats.map(f => li(`<b>${esc(f.name)}</b> <small class="muted">${esc(f.src)}</small>${f.desc ? `<br><span class="small">${esc(f.desc)}</span>` : ''}`))]);
  // Recursos e números de classe
  const r0 = Object.fromEntries(d0.resources.map(r => [r.key, r]));
  const res = d1.resources.filter(r => !r.custom && (!r0[r.key] || r0[r.key].max !== r.max || r0[r.key].name !== r.name))
    .map(r => li(r0[r.key] ? `${esc(r.name)}: <b>${r0[r.key].max} → ${r.max}</b>` : `Novo recurso: <b>${esc(r.name)}</b> (${r.max} ${r.reset === 'short' ? 'por descanso curto' : 'por descanso longo'})`, 'up'));
  const st0 = Object.fromEntries(classStats(d0));
  classStats(d1).forEach(([k, v]) => { if (String(st0[k]) !== String(v)) res.push(li(st0[k] != null ? `${esc(k)}: <b>${esc(String(st0[k]))} → ${esc(String(v))}</b>` : `${esc(k)}: <b>${esc(String(v))}</b>`, 'up')); });
  if (d1.masteryMax > d0.masteryMax) { res.push(li(`Maestria em armas: <b>${d0.masteryMax} → ${d1.masteryMax}</b>`, 'up')); pend.push(`Marcar ${d1.masteryMax - d0.masteryMax} maestria(s) — Combate`); }
  if (d1.expertiseMax > d0.expertiseMax) { res.push(li(`Especializações: <b>${d0.expertiseMax} → ${d1.expertiseMax}</b>`, 'up')); pend.push(`Escolher ${d1.expertiseMax - d0.expertiseMax} especialização(ões) — Atributos & Perícias`); }
  if (d1.profExtraMax > d0.profExtraMax) { res.push(li(`Proficiências em perícia extras: <b>+${d1.profExtraMax - d0.profExtraMax}</b>`, 'up')); pend.push(`Escolher ${d1.profExtraMax - d0.profExtraMax} perícia(s) — Atributos & Perícias`); }
  const mcp = d1.mcPicks.find(p => p.classId === id && !d0.mcPicks.some(q => q.classId === id));
  if (mcp) pend.push(`Escolher ${mcp.count} perícia de ${CLASS[id].name} — Construção`);
  if (res.length) sec.push(['Recursos e números de classe', res]);
  // Magia
  const mag = [];
  for (const c of d1.casters) {
    const o = casterFor(d0, c.classId);
    if (!o) { mag.push(li(`<b>Conjuração de ${esc(casterLabel(c))}</b>: ${AB[c.ability].name}, CD ${c.dc}${c.cantrips ? `, ${c.cantrips} truque(s)` : ''}, ${c.prepared} magia(s) preparada(s) até o ${c.maxLevel}º nível`, 'up')); if (c.cantrips) pend.push(`Escolher ${c.cantrips} truque(s) de ${c.name} — Magias`); if (c.prepared) pend.push(`Escolher ${c.prepared} magia(s) de ${c.name} — Magias`); continue; }
    if (c.cantrips > o.cantrips) { mag.push(li(`Truques de ${esc(c.name)}: <b>${o.cantrips} → ${c.cantrips}</b>`, 'up')); pend.push(`Escolher ${c.cantrips - o.cantrips} truque(s) de ${c.name} — Magias`); }
    if (c.prepared > o.prepared) { mag.push(li(`Magias preparadas de ${esc(c.name)}: <b>${o.prepared} → ${c.prepared}</b>`, 'up')); pend.push(`Escolher ${c.prepared - o.prepared} magia(s) de ${c.name} — Magias`); }
    if (c.maxLevel > o.maxLevel) mag.push(li(`${esc(c.name)} passa a lançar magias de <b>${c.maxLevel}º nível</b>`, 'up'));
    if (c.classId === 'wizard' && spellMaxOf(c) > spellMaxOf(o)) pend.push(`Copiar ${spellMaxOf(c) - spellMaxOf(o)} magia(s) para o grimório — Magias`);
  }
  for (let i = 0; i < 9; i++) { const a = d0.slots[i] || 0, b = d1.slots[i] || 0; if (b !== a) mag.push(li(`Espaços de ${i + 1}º nível: <b>${a} → ${b}</b>`, 'up')); }
  if (JSON.stringify(d0.pact) !== JSON.stringify(d1.pact) && d1.pact) mag.push(li(`Espaços de Pacto: <b>${d1.pact.count} de ${d1.pact.level}º nível</b>${d0.pact ? ` (antes ${d0.pact.count} de ${d0.pact.level}º)` : ''}`, 'up'));
  if (mag.length) sec.push(['Magia', mag]);
  return { sec, pend, c1, d1 };
}

function renderLevelUp(s) {
  let box = $('#levelup');
  if (!box) { box = document.createElement('div'); box.id = 'levelup'; document.body.appendChild(box); }
  const lv = ui.lv && s && ui.lv.sheet === s.id ? ui.lv : null;
  box.hidden = !lv;
  if (!lv) { box.innerHTML = ''; return; }
  const d0 = compute(s);
  const { cur, fresh } = lvOptions(s, d0);
  if (!lv.choice) lv.choice = cur[0] ? cur[0].id : '';
  const base = lvApply(s, lv, false), dBase = compute(base);
  const full = lvApply(s, lv, true), d1 = compute(full);
  const { sec, pend, c1 } = levelDiff(s, d0, full, d1, lv, dBase);
  // escolhas feitas no próprio modal
  const choices = [];
  if (c1 && c1.level === 3 && !(lv.choice === s.classId ? s.subclass : ((s.multiclass || []).find(m => m.classId === c1.classId) || {}).subclass)) {
    choices.push(`<div class="field"><span>Subclasse de ${esc(c1.cls.name)}</span>${pickBtn('lvSubclass', '', lv.subclass ? c1.cls.subclasses.find(x => x.id === lv.subclass).name : '', 'Escolher depois')}</div>`);
    if (!lv.subclass) pend.push(`Escolher a subclasse de ${c1.cls.name} — Construção`);
  }
  if (dBase.featSlots > d0.featSlots) {
    choices.push(`<div class="field"><span>Novo talento <small class="muted">(ou Aumento no Valor de Atributo)</small></span>${pickBtn('lvFeat', '', lv.feat ? FEAT[lv.feat].name : '', 'Escolher depois')}
      ${lv.feat ? `<p class="small muted">${esc(FEAT[lv.feat].desc)}</p>` : ''}
      ${lv.feat && FEAT_AB[lv.feat] ? `<div class="field small">Aumento de atributo: ${abChooserHtml('lv', lv.feat, lv.ab, dBase)}</div>` : ''}</div>`);
    if (!lv.feat) pend.push('Escolher o talento novo — Características');
    else if (FEAT_AB[lv.feat] && !featAbValid({ featId: lv.feat, ab: lv.ab })) pend.push('Escolher o atributo do talento — Características');
  }
  if (dBase.styleSlots > d0.styleSlots) {
    choices.push(`<div class="field"><span>Estilo de Luta</span>${pickBtn('lvStyle', '', lv.style ? FEAT[lv.style].name : '', 'Escolher depois')}</div>${lv.style ? `<p class="small muted">${esc(FEAT[lv.style].desc)}</p>` : ''}`);
    if (!lv.style) pend.push('Escolher o Estilo de Luta — Características');
  }
  box.innerHTML = `<div class="modal-bg" data-action="lvClose"></div>
  <div class="modal lv-modal" role="dialog" aria-label="Subir de nível">
    <div class="modal-head"><h2>Subir de nível — ${esc(s.name || 'Sem nome')}</h2><button class="btn sm" data-action="lvClose">Fechar</button></div>
    <div class="lv-pick">
      <span class="small muted">Em qual classe?</span>
      <div class="row gap wrap">${cur.map(o => `<button class="btn${lv.choice === o.id ? ' primary' : ''}" data-action="lvChoice" data-choice="${o.id}">${esc(o.label)}</button>`).join('')}
        ${fresh.length ? pickBtn('lvNewClass', '', lv.choice.startsWith('new:') ? `${CLASS[lv.choice.slice(4)].name} 0 → 1 (nova)` : '', '＋ Nova classe (multiclasse)…', lv.choice.startsWith('new:') ? 'on' : '') : ''}</div>
    </div>
    ${choices.length ? `<div class="lv-choices">${choices.join('')}</div>` : ''}
    ${sec.map(([t, items]) => `<section class="lv-sec"><h3>${esc(t)}</h3><ul>${items.join('')}</ul></section>`).join('')}
    ${pend.length ? `<section class="lv-sec lv-pend"><h3>Depois de subir, falta escolher</h3><ul>${pend.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>` : ''}
    <div class="lv-foot"><button class="btn" data-action="lvClose">Cancelar</button><button class="btn primary" data-action="lvConfirm">Confirmar: nível ${d1.level}</button></div>
  </div>`;
  lv.pending = pend;
}

// Foto expandida em tela cheia, com opções no rodapé
function renderLightbox(s) {
  let lb = $('#lightbox');
  if (!lb) { lb = document.createElement('div'); lb.id = 'lightbox'; document.body.appendChild(lb); }
  const show = ui.photoView && s && s.photo;
  lb.hidden = !show;
  lb.innerHTML = show ? `<div class="lb-bg" data-action="closePhoto"></div>
    <figure class="lb-fig"><img src="${s.photo}" alt="Retrato de ${esc(s.name || 'personagem')}"><figcaption>${esc(s.name || 'Sem nome')}</figcaption></figure>
    <div class="lb-bar">
      <button class="btn primary" data-action="photoChange">Trocar foto</button>
      <button class="btn danger" data-action="photoRemove">Remover</button>
      <button class="btn" data-action="closePhoto">Fechar</button>
    </div>` : '';
  document.body.classList.toggle('no-scroll', !!show);
}

// Números de classe (Fúria, Ataque Furtivo, Artes Marciais...), cada um pelo nível na própria classe
function classStats(d) {
  return d.classes.flatMap(c => (c.cls.stats ? c.cls.stats({ level: c.level, mods: d.mods, pb: d.pb, sub: c.sub ? c.sub.id : '' }) : [])
    .map(([k, v]) => [d.multi && d.classes.length > 1 ? `${k} (${c.cls.name})` : k, v]));
}

function renderHeader() {
  const tabs = db.open.map(id => {
    const s = db.sheets[id];
    return `<div class="tab${id === db.active ? ' active' : ''}" data-action="switchTab" data-id="${id}" title="${esc(s.name || 'Sem nome')}">
      <span class="tab-av">${s.photo ? `<img src="${s.photo}" alt="">` : esc((s.name || '?')[0].toUpperCase())}</span>
      <span class="tab-txt"><b>${esc(s.name || 'Sem nome')}</b><small>${esc(summary(s))}</small></span>
      <button class="tab-x" data-action="closeTab" data-id="${id}" title="Fechar aba">×</button>
    </div>`;
  }).join('');
  $('#tabs').innerHTML = tabs + `<button class="tab-new" data-action="newSheet" title="Nova ficha">＋ Nova ficha</button>`;
}

function renderHome() {
  const list = Object.values(db.sheets).sort((a, b) => b.updatedAt - a.updatedAt);
  return `<section class="home">
    <div class="home-hero">
      <h1>Grimório de Fichas</h1>
      <p>Fichas de personagem interativas para D&amp;D 5e (regras de 2024). Tudo fica salvo no seu navegador.</p>
      <div class="row gap"><button class="btn primary big" data-action="newSheet">＋ Criar nova ficha</button>
      <button class="btn big" data-action="importSheet">Importar ficha (.json)</button></div>
    </div>
    ${list.length && !ui.library ? `<h2>Suas fichas</h2>${renderLibBody()}` : ''}
  </section>`;
}

// ---------------------------------------------------------------- Biblioteca: busca, seleção, exportação em massa
const normTxt = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function libSearchText(s) {
  const cls = CLASS[s.classId], sp = SPECIE[s.species], bg = BACKGROUND[s.background];
  const sub = cls && cls.subclasses.find(x => x.id === s.subclass);
  return normTxt([s.name, s.player, cls && cls.name, sp && sp.name, sub && sub.name, bg && bg.name].filter(Boolean).join(' '));
}
function libVisible() {
  const q = normTxt(ui.libQ).trim();
  return Object.values(db.sheets).sort((a, b) => b.updatedAt - a.updatedAt).filter(s => !q || libSearchText(s).includes(q));
}
function libPrune() { for (const id of [...ui.libSel]) if (!db.sheets[id]) ui.libSel.delete(id); }
function libBarHtml() {
  libPrune();
  const n = ui.libSel.size, total = Object.keys(db.sheets).length, vis = libVisible().length;
  return `<span class="small muted">${n ? `<b class="pending">${n}</b> selecionada(s) · ` : ''}${vis === total ? `${total} ficha(s)` : `${vis} de ${total} ficha(s)`}</span>
    <button class="btn sm" data-action="libSelectAll" ${vis ? '' : 'disabled'}>Selecionar todas (visíveis)</button>
    <button class="btn sm" data-action="libClear" ${n ? '' : 'disabled'}>Limpar seleção</button>
    <button class="btn sm primary" data-action="exportSelected" ${n ? '' : 'disabled'}>Exportar selecionadas (${n})</button>
    <button class="btn sm danger" data-action="deleteSelected" ${n ? '' : 'disabled'}>Excluir selecionadas (${n})</button>
    <span class="lib-bar-sep"></span>
    <button class="btn sm" data-action="exportAll" ${total ? '' : 'disabled'}>Exportar todas</button>
    <button class="btn sm" data-action="importSheet">Importar .json</button>`;
}
function libGridHtml() {
  const list = libVisible();
  if (list.length) return list.map(libCard).join('');
  return Object.keys(db.sheets).length ? `<p class="muted">Nenhuma ficha encontrada para "${esc(ui.libQ)}".</p>` : '<p class="muted">Nenhuma ficha ainda.</p>';
}
function renderLibBody() {
  return `<div class="lib-body">
    <div class="lib-toolbar">
      <input id="libSearch" type="search" placeholder="Buscar por nome, jogador, classe, espécie…" value="${esc(ui.libQ)}" autocomplete="off">
      <div class="lib-bar row gap wrap">${libBarHtml()}</div>
    </div>
    <div class="lib-grid" id="libGrid">${libGridHtml()}</div>
  </div>`;
}
function refreshLibrary() {
  document.querySelectorAll('.lib-bar').forEach(el => { el.innerHTML = libBarHtml(); });
  document.querySelectorAll('#libGrid').forEach(el => { el.innerHTML = libGridHtml(); });
}
function localDate() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function exportBulk(sheets) {
  if (!sheets.length) return;
  download(`grimorio-fichas-${localDate()}.json`, { app: 'grimorio-fichas', version: 1, exportedAt: new Date().toISOString(), sheets });
  toast(`${sheets.length} ficha(s) exportada(s) em um arquivo.`, 'good');
}

// Importa um ou mais arquivos: formato em massa, array de fichas ou ficha avulsa.
async function importFiles(files) {
  const c = { imported: 0, updated: 0, skipped: 0, invalid: 0 };
  let lastId = null;
  for (const file of files) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { c.invalid++; continue; }
    const list = data && !Array.isArray(data) && Array.isArray(data.sheets) ? data.sheets : Array.isArray(data) ? data : [data];
    for (const raw of list) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.abilities || typeof raw.abilities !== 'object') { c.invalid++; continue; }
      const sh = migrate(raw);
      if (!sh.id) sh.id = uid();
      const cur = db.sheets[sh.id];
      if (!cur) { db.sheets[sh.id] = sh; c.imported++; lastId = sh.id; }
      else if ((+sh.updatedAt || 0) > (+cur.updatedAt || 0)) { db.sheets[sh.id] = sh; c.updated++; lastId = sh.id; }
      else c.skipped++;
    }
  }
  if (c.imported + c.updated === 1 && lastId) openSheet(lastId);
  save(); render();
  toast(`${c.imported} importada(s), ${c.updated} atualizada(s), ${c.skipped} ignorada(s) (já atualizadas), ${c.invalid} inválida(s)`,
    c.imported + c.updated ? 'good' : c.invalid ? 'bad' : '', 6500);
  return c;
}

function libCard(s) {
  const sel = ui.libSel.has(s.id);
  return `<div class="lib-card${sel ? ' sel' : ''}">
    <label class="lib-check" title="Selecionar"><input type="checkbox" data-action="libToggle" data-id="${s.id}" ${sel ? 'checked' : ''} aria-label="Selecionar ${esc(s.name || 'Sem nome')}"></label>
    <div class="lib-av">${s.photo ? `<img src="${s.photo}" alt="">` : esc((s.name || '?')[0].toUpperCase())}</div>
    <div class="lib-info"><b>${esc(s.name || 'Sem nome')}</b><small>${esc(summary(s))}</small><small class="muted">Editada ${new Date(s.updatedAt).toLocaleString('pt-BR')}</small></div>
    <div class="lib-actions">
      <button class="btn sm primary" data-action="openSheet" data-id="${s.id}">Abrir</button>
      <button class="btn sm" data-action="duplicateSheet" data-id="${s.id}">Duplicar</button>
      <button class="btn sm" data-action="exportSheet" data-id="${s.id}">Exportar</button>
      <button class="btn sm danger" data-action="deleteSheet" data-id="${s.id}">Excluir</button>
    </div>
  </div>`;
}

function renderLibrary() {
  return `<div class="modal-bg" data-action="toggleLibrary"></div>
  <div class="modal">
    <div class="modal-head"><h2>Todas as fichas</h2><button class="btn sm" data-action="toggleLibrary">Fechar</button></div>
    <div class="row gap wrap"><button class="btn primary" data-action="newSheet">＋ Nova ficha</button></div>
    ${renderLibBody()}
  </div>`;
}

function renderSheet(s) {
  const d = compute(s);
  if (ui.preview) return renderPreview(s, d);
  const sub = ui.sub[s.id] || (s.classId ? 'main' : 'build');
  const hpCur = s.hp.current == null ? d.hpMax : s.hp.current;
  const hpPct = Math.max(0, Math.min(100, hpCur / d.hpMax * 100));
  const xpNext = XP_TABLE[d.level] ?? null;
  const pend = pendings(s, d);
  const pendBy = pend.reduce((m, p) => (m[p.tab] = (m[p.tab] || 0) + 1, m), {});

  const body = {
    build: renderBuild, main: renderMain, combat: renderCombat, spells: renderSpells, inv: renderInventory, features: renderFeatures, bio: renderBio,
  }[sub](s, d);

  return `
  <section class="hero card">
    <div class="photo" data-action="photoPick" title="${s.photo ? 'Ver foto' : 'Escolher uma foto'}" role="button" tabindex="0">
      ${s.photo ? `<img src="${s.photo}" alt="Retrato">` : '<span>＋ Foto</span>'}
    </div>
    <div class="hero-main">
      <input class="name-input" data-bind="name" value="${esc(s.name)}" placeholder="Nome do personagem">
      <div class="hero-sub">${esc(summary(s))}${d.sub ? ` · ${esc(d.sub.name)}` : ''}${d.bg.id ? ` · ${esc(d.bg.name)}` : ''}</div>
      <div class="hero-fields">
        <label title="Nível de personagem${d.multi ? ' (soma das classes; distribua entre elas na Construção)' : ''}">Nível <select data-total>${Array.from({ length: 20 - mcLevels(s) }, (_, i) => i + 1 + mcLevels(s)).map(n => opt(n, n, d.level)).join('')}</select></label>
        ${d.cls.id && d.level < 20 ? `<button class="btn sm${xpNext != null && s.xp >= xpNext ? ' gold' : ''}" data-action="levelUp" title="Ver tudo o que o personagem ganha no próximo nível">⬆ Subir de nível</button>` : ''}
        <label>XP <input type="number" min="0" data-bind="xp" data-num value="${+s.xp || 0}" class="w-num">${xpNext != null ? `<small class="muted">/ ${xpNext.toLocaleString('pt-BR')}</small>` : ''}</label>
        <label>Jogador <input data-bind="player" value="${esc(s.player)}" placeholder="—"></label>
        <label>Tendência <select data-bind="alignment">${opt('', '—', s.alignment)}${ALIGNMENTS.map(a => opt(a, a, s.alignment)).join('')}</select></label>
      </div>
      ${pendingsHtml(s, pend)}
    </div>
    <div class="hero-side">
      <button class="btn primary" data-action="togglePreview">👁 Ficha completa</button>
      <label class="insp${s.inspiration ? ' on' : ''}"><input type="checkbox" data-bind="inspiration" ${s.inspiration ? 'checked' : ''}> Inspiração Heroica</label>
      <div class="row gap"><button class="btn" data-action="shortRest">Descanso curto</button><button class="btn" data-action="longRest">Descanso longo</button></div>
      <div class="roll-mode" role="group" aria-label="Modo de rolagem">
        ${[['dis', 'Desvantagem'], ['normal', 'Normal'], ['adv', 'Vantagem']].map(([m, l]) => `<button class="${ui.rollMode === m ? 'on' : ''}" data-action="rollMode" data-mode="${m}">${l}</button>`).join('')}
      </div>
    </div>
  </section>

  <section class="vitals">
    <div class="vital card"><span class="v-label">Classe de Armadura</span><span class="v-big shield-shape">${d.ac}</span><small>${esc(d.acNote)}${s.shield ? ' + Escudo' : ''}</small></div>
    <button class="vital card click" data-action="rollInit"><span class="v-label">Iniciativa</span><span class="v-big">${fmt(d.init)}</span><small>${d.initAdv ? 'com Vantagem' : 'clique p/ rolar'}</small></button>
    <div class="vital card"><span class="v-label">Deslocamento</span><span class="v-big">${ftToM(d.speed)}<small> m</small></span><small>${d.speed} pés</small></div>
    <div class="vital card"><span class="v-label">Proficiência</span><span class="v-big">${fmt(d.pb)}</span><small>bônus</small></div>
    <div class="vital card"><span class="v-label">Percepção passiva</span><span class="v-big">${d.passive.perception}</span><small>${d.darkvision ? `Visão no escuro ${ftToM(d.darkvision)} m` : 'sem visão no escuro'}</small></div>
    <div class="vital card hp">
      <div class="hp-top"><span class="v-label">Pontos de Vida</span><span class="muted small">Dado${d.hitDice.length > 1 ? 's' : ''} de Vida ${d.hitDice.length > 1 ? d.hitDice.map(h => 'd' + h.die).join('/') : 'd' + d.hd}</span></div>
      <div class="hp-nums"><input type="number" data-bind="hp.current" data-num value="${hpCur}" class="hp-cur" aria-label="PV atuais"><span>/ ${d.hpMax}</span>${s.hp.temp ? `<span class="temp">+${s.hp.temp} temp</span>` : ''}</div>
      <div class="hp-bar"><div style="width:${hpPct}%" class="${hpPct <= 25 ? 'low' : hpPct <= 50 ? 'mid' : ''}"></div></div>
      <div class="hp-ctrl"><input type="number" id="hpAmt" min="0" placeholder="0" aria-label="Quantidade"><button class="btn sm danger" data-action="hpDamage">Dano</button><button class="btn sm good" data-action="hpHeal">Cura</button><button class="btn sm" data-action="hpTemp">Temp</button></div>
    </div>
    <div class="vital card hd">
      <span class="v-label">Dados de Vida</span>
      ${(() => { const hs = hdState(s, d); const left = hs.reduce((t, h) => t + h.count - h.used, 0);
        return `<span class="v-mid">${left}<small>/${d.level}</small></span><small>${hs.map(h => `${h.count - h.used}d${h.die}`).join(' + ')}</small>
        <div class="row gap wrap hd-btns">${hs.map(h => `<button class="btn sm" data-action="spendHD" data-die="${h.die}" ${h.used >= h.count ? 'disabled' : ''}>${hs.length > 1 ? 'Gastar d' + h.die : 'Gastar 1'}</button>`).join('')}</div>`; })()}
    </div>
    ${hpCur <= 0 ? `<div class="vital card death">
      <span class="v-label">Testes contra a Morte</span>
      <div>Sucessos ${pips(3, s.deathSaves.s, 'deathPip', 'data-t="s"', 'good')}</div>
      <div>Falhas ${pips(3, s.deathSaves.f, 'deathPip', 'data-t="f"', 'bad')}</div>
      <button class="btn sm" data-action="rollDeath">Rolar teste</button>
    </div>` : ''}
  </section>

  ${d.warnings.length ? `<div class="warn">${d.warnings.map(esc).join('<br>')}</div>` : ''}

  <nav class="subtabs">${SUBTABS.map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" data-action="subtab" data-tab="${k}">${l}${pendBy[k] ? ` <span class="tab-count" title="${pendBy[k]} pendência(s)">${pendBy[k]}</span>` : ''}</button>`).join('')}</nav>
  <div class="sub-body">${body}</div>`;
}


// ---------------------------------------------------------------- Ficha completa (visão geral)
function renderPreview(s, d) {
  const hpCur = s.hp.current == null ? d.hpMax : s.hp.current;
  const sec = (title, body, cls = '') => body ? `<section class="pv-sec ${cls}"><h3>${title}</h3>${body}</section>` : '';
  const line = (k, v) => v ? `<div class="pv-line"><span>${k}</span><b>${v}</b></div>` : '';
  const ident = [d.sp.id && speciesLabel(s), d.classes.map(c => `${c.cls.name} ${c.level}${c.sub ? ` (${c.sub.name})` : ''}`).join(' / '), d.bg.id && d.bg.name].filter(Boolean).map(esc).join(' · ');
  const flags = [s.inspiration && '<span class="badge gold">Inspiração Heroica</span>', s.exhaustion > 0 && `<span class="badge bad">Exaustão ${s.exhaustion}</span>`,
    ...s.conditions.map(c => `<span class="badge bad">${esc(c)}</span>`)].filter(Boolean).join(' ');

  // Atributos
  const abilities = ABILITIES.map(a => `<div class="pv-ab">
    <span class="pv-ab-name">${a.short}</span>
    <button class="pv-ab-mod" data-action="rollAbility" data-ab="${a.id}" title="Rolar teste">${fmt(d.mods[a.id])}</button>
    <span class="pv-ab-score">${d.scores[a.id]}</span>
    <button class="pv-ab-save${d.saves[a.id].prof ? ' prof' : ''}" data-action="rollSave" data-ab="${a.id}" title="Rolar salvaguarda">Salv. ${fmt(d.saves[a.id].bonus)}</button>
  </div>`).join('');

  // Perícias
  const skills = SKILLS.map(sk => {
    const x = d.skills[sk.id];
    return `<button class="pv-skill${x.prof ? ' prof' : ''}" data-action="rollSkill" data-id="${sk.id}">
      <span class="pv-mark">${x.prof === 2 ? '◆' : x.prof ? '●' : '○'}</span><span>${sk.name} <small>${AB[sk.ab].short}</small></span><b>${fmt(x.bonus)}</b></button>`;
  }).join('');

  // Ataques
  const attacks = s.attacks.map((atk, i) => {
    const c = attackCalc(d, s, atk);
    const name = atk.name || (c.w ? c.w.name : 'Ataque');
    return `<tr><td><b>${esc(name)}</b>${c.w ? `<br><small class="muted">${esc(c.w.props.join(', '))}${d.masteryMax && s.mastery[c.w.id] ? ` · Maestria: ${c.w.mastery}` : ''}</small>` : ''}${c.tags.length ? `<br><small class="ok">${c.tags.map(esc).join(' · ')}</small>` : ''}${c.notes.length ? `<br><small class="atk-note">ⓘ ${c.notes.map(esc).join(' · ')}</small>` : ''}</td>
      <td><button class="btn sm roll" data-action="rollAttack" data-i="${i}">${fmt(c.hit)}</button></td>
      <td><button class="btn sm roll dmg" data-action="rollDmg" data-i="${i}">${esc(c.dmg)}${c.extra ? ' + ' + esc(c.extra) : ''}</button> <small class="muted">${esc(c.dtype)}</small></td></tr>`;
  }).join('');
  const stats = classStats(d);

  // Recursos
  const resources = d.resources.map(r => {
    const avail = r.max - Math.min(r.max, +s.resUsed[r.key] || 0);
    const ctrl = r.pool || r.max > 12 ? `<b>${avail}/${r.max}</b>` : pips(r.max, avail, 'resPip', `data-key="${esc(r.key)}" data-max="${r.max}"`);
    return `<div class="pv-res"><span>${esc(r.name)} <small class="muted">(${r.reset === 'short' ? 'curto' : 'longo'})</small></span>${ctrl}</div>`;
  }).join('');

  // Características e talentos
  const feats = [];
  if (d.bg.id) feats.push([FEAT[d.bg.feat], d.bg.name]);
  if (s.species === 'human' && s.speciesChoices.versatile) feats.push([FEAT[s.speciesChoices.versatile], 'Humano']);
  s.feats.forEach(x => feats.push([x.featId ? FEAT[x.featId] : { name: x.name, desc: x.desc }, x.note || '']));
  const features = d.features.filter(f => f.lvl <= f.srcLevel && f.desc).map(f =>
    `<div class="pv-feat"><b>${esc(f.name)}</b> <small class="muted">${esc(f.src)} ${f.lvl}</small><p>${esc(f.desc)}</p></div>`).join('');
  const featHtml = feats.map(([f, src]) => `<div class="pv-feat"><b>${esc(f.name)}</b> ${src ? `<small class="muted">${esc(src)}</small>` : ''}${f.desc ? `<p>${esc(f.desc)}</p>` : ''}</div>`).join('');

  // Magias
  let spellHtml = '';
  if (d.spell || s.spells.length) {
    const top = d.spell ? `<div class="pv-strip">
      <div><span>CD</span><b>${d.spell.dc}</b></div>
      <button data-action="rollSpellAtk"><span>Ataque</span><b>${fmt(d.spell.attack)}</b></button>
      <div><span>Atributo</span><b>${AB[d.spell.ability].short}</b></div>
      ${d.casters.map(c => `<div><span>Preparadas${d.casters.length > 1 ? ' · ' + esc(c.name) : ''}</span><b>${spellCounts(s, c.classId).prepared}/${c.prepared}</b></div>`).join('')}
    </div>` : '';
    const slots = d.slots.map((n, i) => `<div class="slot"><span class="slot-l">${i + 1}º</span>${pips(n, n - Math.min(n, s.slotsUsed[i + 1] || 0), 'slotPip', `data-l="${i + 1}" data-max="${n}"`)}</div>`).join('')
      + (d.pact ? `<div class="slot"><span class="slot-l">${d.pact.level}º</span>${pips(d.pact.count, d.pact.count - Math.min(d.pact.count, s.pactUsed), 'pactPip', `data-max="${d.pact.count}"`)} <small class="muted">Pacto</small></div>` : '');
    const byLvl = Array.from({ length: 10 }, () => []);
    s.spells.forEach(sp => byLvl[Math.min(9, Math.max(0, +sp.level || 0))].push(sp));
    const list = byLvl.map((arr, l) => arr.length ? `<div class="pv-spell-lvl"><h4>${l === 0 ? 'Truques' : l + 'º nível'}</h4>${arr.map(sp =>
      `<div class="pv-spell${l > 0 && !sp.prepared ? ' unprep' : ''}" data-myspell="${sp.id}">${l > 0 ? (sp.prepared ? '●' : '○') : '✦'} ${esc(sp.name)}${sp.conc ? ' <span class="badge">C</span>' : ''}${sp.ritual ? ' <span class="badge">R</span>' : ''}
        ${spellInfoHtml(sp)}</div>`).join('')}</div>` : '').join('');
    spellHtml = sec('Magias', top + (slots ? `<div class="slots pv-slots">${slots}</div>` : '') + (list ? `<div class="pv-spells">${list}</div>` : '<p class="muted small">Nenhuma magia adicionada.</p>'), 'span2');
  }

  // Inventário
  const coins = COINS.filter(c => +s.coins[c.id]).map(c => `<span class="coin-${c.id}"><b>${s.coins[c.id]}</b> ${c.name}</span>`).join(' ');
  const inv = s.inventory.map(it => `<li class="${it.equipped ? 'eq' : ''}">${+it.qty > 1 ? `<b>${it.qty}×</b> ` : ''}${esc(it.name)}${it.equipped ? ' <small class="muted">(equipado)</small>' : ''}</li>`).join('');
  const invHtml = `<div class="pv-coins">${coins || '<span class="muted">Sem dinheiro</span>'}</div>
    ${inv ? `<ul class="pv-inv">${inv}</ul>` : '<p class="muted small">Inventário vazio.</p>'}
    <p class="small muted">Carga: ${d.weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} / ${d.capacity} lb</p>`;

  // Biografia
  const b = s.bio;
  const bioLines = [['Idade', b.age], ['Altura', b.height], ['Peso', b.weight], ['Olhos', b.eyes], ['Cabelo', b.hair], ['Pele', b.skin], ['Gênero', b.gender], ['Fé', b.faith], ['Tendência', s.alignment]].filter(([, v]) => v);
  const bioTexts = [['Aparência', b.appearance], ['Personalidade', b.personality], ['Ideais', b.ideals], ['Vínculos', b.bonds], ['Defeitos', b.flaws], ['História', b.backstory], ['Aliados', b.allies], ['Anotações', b.notes]].filter(([, v]) => v);
  const bioHtml = (bioLines.length ? `<div class="pv-bio-facts">${bioLines.map(([k, v]) => `<span><small>${k}</small> ${esc(v)}</span>`).join('')}</div>` : '')
    + bioTexts.map(([k, v]) => `<div class="pv-bio"><h4>${k}</h4><p>${esc(v).replace(/\n/g, '<br>')}</p></div>`).join('');

  const armorList = [...d.armorTrain].map(a => a === 'shield' ? 'Escudos' : ARMOR_TYPE_NAME[a]).join(', ') || 'Nenhuma';
  const weaponList = [...d.weaponTrain].map(w => ({ simple: 'Simples', martial: 'Marciais', 'martial-light': 'Marciais (Leve)', 'martial-finesse-light': 'Marciais (Acuidade/Leve)' }[w])).join(', ');

  return `<div class="preview">
  <div class="pv-toolbar no-print">
    <button class="btn" data-action="togglePreview">← Voltar à edição</button>
    <span class="muted small">Clique nos valores para rolar. Pips de recursos e espaços continuam funcionando.</span>
    <button class="btn" data-action="printSheet">🖨 Imprimir / PDF</button>
  </div>

  <header class="pv-head card">
    <div class="pv-photo" data-action="photoPick" role="button" tabindex="0" title="${s.photo ? 'Ver foto' : 'Escolher uma foto'}">${s.photo ? `<img src="${s.photo}" alt="Retrato">` : `<span>${esc((s.name || '?')[0].toUpperCase())}</span>`}</div>
    <div class="pv-id">
      <h1>${esc(s.name || 'Sem nome')}</h1>
      <div class="pv-sub">${ident || 'Personagem incompleto'}</div>
      <div class="pv-meta">${s.player ? `Jogador: ${esc(s.player)} · ` : ''}XP ${(+s.xp || 0).toLocaleString('pt-BR')}${s.alignment ? ' · ' + esc(s.alignment) : ''}</div>
      ${flags ? `<div class="pv-flags">${flags}</div>` : ''}
    </div>
    <div class="pv-vitals">
      <div class="pv-v"><span>CA</span><b>${d.ac}</b></div>
      <div class="pv-v hp"><span>PV</span><b>${hpCur}<small>/${d.hpMax}</small></b>${s.hp.temp ? `<small class="temp">+${s.hp.temp} temp</small>` : ''}</div>
      <button class="pv-v" data-action="rollInit"><span>Iniciativa</span><b>${fmt(d.init)}</b></button>
      <div class="pv-v"><span>Desloc.</span><b>${ftToM(d.speed)}<small> m</small></b></div>
      <div class="pv-v"><span>Prof.</span><b>${fmt(d.pb)}</b></div>
      <div class="pv-v"><span>Dados de Vida</span><b>${hdState(s, d).reduce((t, h) => t + h.count - h.used, 0)}<small>/${hdLabel(d)}</small></b></div>
      <div class="pv-v"><span>Perc. passiva</span><b>${d.passive.perception}</b></div>
    </div>
  </header>

  <div class="pv-grid">
    <div class="pv-col">
      ${sec('Atributos', `<div class="pv-abs">${abilities}</div>`)}
      ${sec('Sentidos e defesas', line('Visão no escuro', d.darkvision ? ftToM(d.darkvision) + ' m' : '—') + line('Intuição passiva', d.passive.insight) + line('Investigação passiva', d.passive.investigation)
        + line('Tamanho', esc(s.size || d.sp.size)) + line('Resistências', [...new Set(d.resist)].join(', ')) + line('Armadura', esc(d.acNote) + (s.shield ? ' + Escudo' : '')))}
      ${sec('Proficiências', line('Armaduras', armorList) + line('Armas', weaponList) + line('Ferramentas', [...new Set([d.bg.tool, d.cls.tools, ...d.mcTools, s.toolProfs].filter(Boolean))].map(esc).join('; '))
        + line('Idiomas', [...s.languages, ...d.autoLangs].map(esc).join(', ')))}
    </div>
    <div class="pv-col">
      ${sec('Perícias', `<div class="pv-skills">${skills}</div><p class="small muted">● proficiente · ◆ especialização</p>`)}
      ${sec('Recursos', resources)}
    </div>
    <div class="pv-col">
      ${sec('Ataques', (stats.length ? `<div class="stat-chips">${stats.map(([k, v]) => `<span class="stat-chip"><small>${k}</small><b>${v}</b></span>`).join('')}</div>` : '')
        + (attacks ? `<table class="pv-atk"><thead><tr><th>Arma</th><th>Acerto</th><th>Dano</th></tr></thead><tbody>${attacks}</tbody></table>` : '<p class="muted small">Nenhum ataque.</p>'))}
      ${sec('Talentos', featHtml)}
    </div>
    ${sec('Características', `<div class="pv-feats">${features || '<p class="muted small">Escolha espécie e classe.</p>'}</div>`, 'span3')}
    ${spellHtml}
    ${sec('Equipamento', invHtml)}
    ${bioHtml ? sec('Personagem', bioHtml, 'span3') : ''}
  </div>
  </div>`;
}

// ---------------------------------------------------------------- Construção
function renderBuild(s, d) {
  const { cls, sp, bg } = d;
  const skillPicks = s.classSkills || [];
  const list = cls.skillList === 'any' ? SKILLS.map(x => x.id) : cls.skillList;
  const bgSkills = new Set(bg.skills);

  // Classe
  let classCard = `<div class="card"><h3>${d.multi ? 'Classe inicial' : 'Classe'}</h3>
    ${pickBtn('classId', '', cls.id ? cls.name : '', 'Escolha uma classe…', 'big')}
    ${d.multi ? `<p class="small muted">Nível em ${esc(cls.name)}: <b class="lvl-total">${s.level}</b> (o restante do nível de personagem)</p>` : ''}`;
  if (cls.id) {
    classCard += `<dl class="facts">
      <dt>Dado de Vida</dt><dd>d${cls.hd}</dd>
      <dt>Atributo principal</dt><dd>${cls.primary}</dd>
      <dt>Salvaguardas</dt><dd>${cls.saves.map(a => AB[a].name).join(', ')}</dd>
      <dt>Armaduras</dt><dd>${cls.armor.map(a => a === 'shield' ? 'Escudos' : ARMOR_TYPE_NAME[a]).join(', ') || 'Nenhuma'}</dd>
      <dt>Armas</dt><dd>${cls.weapons.map(w => ({ simple: 'Simples', martial: 'Marciais', 'martial-light': 'Marciais com Leve', 'martial-finesse-light': 'Marciais com Acuidade ou Leve' }[w])).join(', ')}</dd>
      ${cls.tools ? `<dt>Ferramentas</dt><dd>${esc(cls.tools)}</dd>` : ''}
      ${casterFor(d, cls.id) ? `<dt>Conjuração</dt><dd>${AB[casterFor(d, cls.id).ability].name}</dd>` : ''}
    </dl>
    <label class="field">Subclasse ${d.clsLevel < 3 ? `<small class="muted">(disponível no nível 3${d.multi ? ' de ' + esc(cls.name) : ''})</small>` : ''}
      ${pickBtn('subclass', 'p', d.sub ? d.sub.name : (cls.subclasses.find(x => x.id === s.subclass) || {}).name, '—')}</label>
    ${(cls.choices || []).map(ch => `<label class="field">${ch.label}${pickBtn('classChoice', 'p:' + ch.key, (ch.options.find(o => o.id === s.classChoices[ch.key]) || {}).name, 'Escolha…')}</label>`).join('')}
    <div class="field"><span>Perícias de classe — escolha ${cls.skillCount} <b class="${skillPicks.length === cls.skillCount ? 'ok' : 'pending'}">(${skillPicks.length}/${cls.skillCount})</b></span>
      <div class="checks">${list.map(id => {
        const on = skillPicks.includes(id), fromBg = bgSkills.has(id);
        const dis = (!on && (skillPicks.length >= cls.skillCount || fromBg));
        return `<label class="chk${on ? ' on' : ''}${dis ? ' dis' : ''}"><input type="checkbox" data-action="classSkill" data-id="${id}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}>${SK[id].name}${fromBg ? ' <small>(antecedente)</small>' : ''}</label>`;
      }).join('')}</div></div>
    <div class="field"><span>Equipamento inicial</span>
      <p class="small"><b>Opção A:</b> ${cls.equipA.map(([n, q]) => (q > 1 ? q + '× ' : '') + n).join(', ')} e ${cls.gpA} PO. <b>Opção B:</b> ${cls.gpB} PO.</p>
      <div class="row gap"><button class="btn sm" data-action="equipClass" data-o="A">Adicionar opção A</button><button class="btn sm" data-action="equipClass" data-o="B">Adicionar ${cls.gpB} PO</button>
      ${s.equipAdded.class ? `<small class="muted">✓ já adicionado (${s.equipAdded.class})</small>` : ''}</div></div>`;
  }
  if (cls.id) classCard += renderMulticlass(s, d);
  classCard += '</div>';

  // Espécie
  let speciesCard = `<div class="card"><h3>Espécie</h3>
    ${pickBtn('species', '', sp.id ? sp.name : '', 'Escolha uma espécie…', 'big')}`;
  if (sp.id) {
    speciesCard += `<dl class="facts"><dt>Tamanho</dt><dd>${sp.sizeChoice ? `<select data-bind="size">${opt('', 'Escolha…', s.size)}${opt('Médio', 'Médio', s.size)}${opt('Pequeno', 'Pequeno', s.size)}</select>` : sp.size}</dd>
      <dt>Deslocamento</dt><dd>${ftToM(sp.speed)} m</dd><dt>Visão no escuro</dt><dd>${sp.darkvision ? ftToM(sp.darkvision) + ' m' : '—'}</dd></dl>`;
    for (const ch of sp.choices || []) {
      const val = s.speciesChoices[ch.key] || '';
      const valName = ch.skillAny ? (SK[val] || {}).name : ch.featOrigin ? (FEAT[val] || {}).name : (ch.options.find(o => o.id === val) || {}).name;
      speciesCard += `<label class="field">${ch.label}${pickBtn('speciesChoice', ch.key, valName, 'Escolha…')}</label>`;
      if (ch.featOrigin && val) speciesCard += `<p class="small muted">${esc(FEAT[val].desc)}</p>`;
    }
    speciesCard += `<ul class="traits">${sp.traits.map(([l, n, t]) => `<li class="${l > d.level ? 'future' : ''}"><b>${n}</b>${l > 1 ? ` <small>(nível ${l})</small>` : ''} — ${t}</li>`).join('')}</ul>`;
  }
  speciesCard += '</div>';

  // Antecedente
  let bgCard = `<div class="card"><h3>Antecedente</h3>
    ${pickBtn('background', '', bg.id ? bg.name : '', 'Escolha um antecedente…', 'big')}`;
  if (bg.id) {
    const feat = FEAT[bg.feat];
    const abOpts = (v) => bg.abilities.map(a => opt(a, AB[a].name, v)).join('');
    bgCard += `<div class="field"><span>Aumento de atributos (${bg.abilities.map(a => AB[a].short).join(', ')})</span>
      <div class="row gap wrap">
        <label class="radio"><input type="radio" name="bgMode" data-bind="bgMode" value="21" ${s.bgMode !== '111' ? 'checked' : ''}> +2 e +1</label>
        <label class="radio"><input type="radio" name="bgMode" data-bind="bgMode" value="111" ${s.bgMode === '111' ? 'checked' : ''}> +1 em todos</label>
      </div>
      ${s.bgMode !== '111' ? `<div class="row gap wrap"><label>+2 em <select data-bind="bg2">${abOpts(s.bg2)}</select></label><label>+1 em <select data-bind="bg1">${abOpts(s.bg1)}</select></label></div>
      ${s.bg1 === s.bg2 ? '<p class="small bad-text">Escolha atributos diferentes.</p>' : ''}` : ''}
    </div>
    <dl class="facts"><dt>Talento de Origem</dt><dd><b>${feat.name}</b> — ${esc(feat.desc)}</dd>
      <dt>Perícias</dt><dd>${bg.skills.map(k => SK[k].name).join(', ')}</dd>
      <dt>Ferramenta</dt><dd>${esc(bg.tool)}</dd></dl>
    <div class="field"><span>Equipamento</span>
      <p class="small"><b>Opção A:</b> ${bg.equip.map(([n, q]) => (q > 1 ? q + '× ' : '') + n).join(', ')} e ${bg.gp} PO. <b>Opção B:</b> 50 PO.</p>
      <div class="row gap"><button class="btn sm" data-action="equipBg" data-o="A">Adicionar opção A</button><button class="btn sm" data-action="equipBg" data-o="B">Adicionar 50 PO</button>
      ${s.equipAdded.bg ? `<small class="muted">✓ já adicionado (${s.equipAdded.bg})</small>` : ''}</div></div>`;
  }
  bgCard += '</div>';

  // Atributos
  const method = s.abilityMethod || 'manual';
  const pbSpent = pointBuySpent(s.abilities);
  const pbLeft = POINT_BUY_BUDGET - pbSpent;
  const cap = d.feats.some(f => f.startsWith('boon-')) ? 30 : 20;
  const stepper = (ab, field, val, canDec, canInc, title = '') => `<div class="stepper">
      <button class="step" data-action="abStep" data-ab="${ab}" data-f="${field}" data-delta="-1" ${canDec ? '' : 'disabled'} aria-label="Diminuir">−</button>
      <span class="step-val" title="${title}">${field === 'extra' ? fmt(val) : val}</span>
      <button class="step" data-action="abStep" data-ab="${ab}" data-f="${field}" data-delta="1" ${canInc ? '' : 'disabled'} aria-label="Aumentar">+</button></div>`;
  const baseCell = (a) => {
    const v = +s.abilities[a.id];
    const totalOk = d.scores[a.id] < cap;
    if (method === 'pointbuy') {
      const next = POINT_BUY_COST[v + 1];
      const canInc = v < 15 && next != null && next - POINT_BUY_COST[v] <= pbLeft && totalOk;
      return stepper(a.id, 'base', v, v > 8, canInc) + `<small class="muted cost">custo ${POINT_BUY_COST[v] ?? '?'}</small>`;
    }
    if (method === 'standard') {
      return `<select data-std="${a.id}" class="std-sel">${STANDARD_ARRAY.map(x => opt(x, x, v)).join('')}</select>`;
    }
    return stepper(a.id, 'base', v, v > 3, v < 18 && totalOk);
  };
  const methodInfo = {
    pointbuy: `<span>Pontos restantes: <b class="${pbLeft === 0 ? 'ok' : pbLeft < 0 ? 'bad-text' : 'pending'}">${pbLeft}</b> / ${POINT_BUY_BUDGET}</span><span class="muted">Valores de 8 a 15. Custos: 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9.</span>`,
    standard: `<span class="muted">Distribua 15, 14, 13, 12, 10 e 8 — cada valor uma vez. Escolher um valor já usado troca os dois atributos.</span>`,
    manual: `<button class="btn sm" data-action="rollStats">🎲 Rolar 4d6 (descarta o menor)</button><span class="muted">Valores de 3 a 18.</span>`,
  }[method];
  const abCard = `<div class="card wide"><h3>Valores de Atributo</h3>
    <div class="row gap wrap">
      <label>Método <select data-bind="abilityMethod">${opt('pointbuy', 'Compra de pontos (27)', method)}${opt('standard', 'Arranjo padrão', method)}${opt('manual', 'Rolagem / manual', method)}</select></label>
      ${methodInfo}
    </div>
    ${method === 'pointbuy' && pbLeft < 0 ? '<p class="small bad-text">Os valores atuais passam do orçamento — reduza algum atributo.</p>' : ''}
    <div class="table-wrap"><table class="ab-table"><thead><tr><th>Atributo</th><th>Base</th><th>Antecedente</th><th>Talentos</th><th>Extra <small>(itens, mestre)</small></th><th>Total</th><th>Mod.</th></tr></thead><tbody>
    ${ABILITIES.map(a => `<tr><td><b>${a.name}</b></td>
      <td>${baseCell(a)}</td>
      <td class="c">${d.bgBonus[a.id] ? '+' + d.bgBonus[a.id] : '—'}</td>
      <td class="c">${d.featBonus[a.id] ? '+' + d.featBonus[a.id] : '—'}</td>
      <td>${stepper(a.id, 'extra', +s.abilityExtra[a.id] || 0, (+s.abilityExtra[a.id] || 0) > -10, d.scores[a.id] < cap)}${d.capstone[a.id] ? ' <small>+4 nível 20</small>' : ''}</td>
      <td class="c"><b>${d.scores[a.id]}</b>${d.scores[a.id] > cap ? ` <small class="bad-text">&gt;${cap}</small>` : ''}</td><td class="c"><b>${fmt(d.mods[a.id])}</b></td></tr>`).join('')}
    </tbody></table></div>
    <p class="small muted">Nenhum atributo passa de ${cap}${cap === 20 ? ' (30 com Dádivas Épicas)' : ''}. Os aumentos de talento (Aumento no Valor de Atributo e talentos gerais) entram sozinhos na coluna <b>Talentos</b> — escolha o atributo em Características → Talentos.</p>
    ${d.featAbPending.length ? `<p class="small bad-text">⚠ ${d.featAbPending.length} talento(s) sem atributo escolhido — escolha em Características → Talentos.</p>` : ''}
    ${ABILITIES.some(a => +s.abilityExtra[a.id] > 0) && (s.feats || []).some(f => FEAT_AB[f.featId]) ? '<p class="small pending">Se você tinha lançado aumentos de talento em "Extra", tire de lá: agora eles contam sozinhos na coluna Talentos.</p>' : ''}</div>`;

  // Idiomas
  const langCard = `<div class="card"><h3>Idiomas</h3>
    <p class="small muted">Todo personagem conhece o Comum e mais 2 idiomas à escolha.</p>
    <div class="chips">${s.languages.map((l, i) => `<span class="chip">${esc(l)}<button data-action="delLang" data-i="${i}" title="Remover">×</button></span>`).join('')}
    ${d.autoLangs.map(l => `<span class="chip auto">${esc(l)}</span>`).join('')}</div>
    <div class="row gap"><input list="langList" id="langNew" placeholder="Adicionar idioma"><datalist id="langList">${LANGUAGES.map(l => `<option value="${esc(l)}">`).join('')}</datalist><button class="btn sm" data-action="addLang">Adicionar</button></div>
  </div>`;

  return `<div class="grid build">${classCard}${speciesCard}${bgCard}${langCard}${abCard}</div>`;
}



// ---------------------------------------------------------------- Multiclasse (Construção)
const TRAIN_NAME = { light: 'Armadura leve', medium: 'Armadura média', heavy: 'Armadura pesada', shield: 'Escudos', martial: 'Armas marciais' };
function mcGainText(id) {
  const m = MULTICLASS[id] || {};
  const parts = [...(m.armor || []), ...(m.weapons || [])].map(x => TRAIN_NAME[x]);
  if (m.skills) parts.push(`${m.skills} perícia ${m.skillList === 'any' ? 'qualquer' : 'da lista da classe'}`);
  if (m.tools) parts.push(m.tools);
  return parts.join(', ') || 'Nenhuma proficiência (só o Dado de Vida)';
}

function renderMulticlass(s, d) {
  const others = d.classes.filter(c => !c.primary);
  const rows = others.map(c => {
    const m = s.multiclass[c.idx];
    const pick = d.mcPicks.find(p => p.idx === c.idx);
    const caster = casterFor(d, c.classId);
    const issue = multiclassReqFail(c.classId, d.scores);
    return `<div class="mc-row">
      <div class="mc-head"><b>${esc(c.cls.name)}</b>
        <span class="muted">nível <b class="lvl-total">${c.level}</b></span>
        <label>Subclasse ${pickBtn('subclass', String(c.idx), c.sub ? c.sub.name : (c.cls.subclasses.find(x => x.id === m.subclass) || {}).name, c.level < 3 ? '(nível 3)' : '—', '', c.level < 3 ? 'Disponível no nível 3 desta classe' : '')}</label>
        <button class="btn sm danger" data-action="delClass" data-i="${c.idx}">Remover</button></div>
      ${issue ? `<p class="small bad-text">⚠ ${esc(issue)}</p>` : ''}
      <p class="small">Dado de Vida d${c.cls.hd}${caster ? ` · Conjuração (${AB[caster.ability].short}), até ${caster.maxLevel}º nível` : ''} · <span class="muted">Ganha: ${esc(mcGainText(c.classId))}</span></p>
      ${(c.cls.choices || []).map(ch => `<label class="field small">${ch.label}${pickBtn('classChoice', c.idx + ':' + ch.key, (ch.options.find(o => o.id === (m.classChoices || {})[ch.key]) || {}).name, 'Escolha…')}</label>`).join('')}
      ${pick ? `<div class="field"><span class="small">Perícia de ${esc(c.cls.name)} — escolha ${pick.count} <b class="${pick.used === pick.count ? 'ok' : 'pending'}">(${pick.used}/${pick.count})</b></span>
        <div class="checks">${pick.list.map(id => {
          const on = (m.classSkills || []).includes(id);
          const already = !on && d.skills[id].auto;
          const dis = !on && (pick.used >= pick.count || already);
          return `<label class="chk${on ? ' on' : ''}${dis ? ' dis' : ''}"><input type="checkbox" data-action="mcSkill" data-i="${c.idx}" data-id="${id}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}>${SK[id].name}${already ? ' <small>(já tem)</small>' : ''}</label>`;
        }).join('')}</div></div>` : ''}
    </div>`;
  }).join('');
  return `<div class="mc-section">
    ${d.multi ? `<div class="mc-total">Nível de personagem <b>${d.level}</b> · ${esc(classLine(s))}</div>` : ''}
    ${d.mcIssues.length ? `<div class="warn">⚠ ${d.mcIssues.map(esc).join('<br>⚠ ')}</div>` : ''}
    ${rows}
    <p class="small muted mc-hint">${d.multi ? 'Para subir o nível de uma destas classes ou entrar em outra' : 'Multiclasse: para entrar em outra classe'}, use <b>⬆ Subir de nível</b> no topo da ficha.</p>
  </div>`;
}

// ---------------------------------------------------------------- Atributos & Perícias
function limitBadge(used, max) {
  return `<b class="${used > max ? 'bad-text' : used === max ? 'ok' : 'pending'}">${used} / ${max}</b>${used > max ? ' <small class="bad-text">acima do limite</small>' : ''}`;
}
function counter(label, used, max, title) {
  const cls = used > max ? 'bad-text' : used === max ? 'ok' : 'pending';
  return `<span class="counter" title="${esc(title)}">${label} <b class="${max === 0 && used === 0 ? 'muted' : cls}">${used}/${max}</b></span>`;
}
function numStepper(path, val, min, max) {
  return `<span class="stepper"><button class="step" data-action="numStep" data-path="${path}" data-delta="-1" data-min="${min}" data-max="${max}" ${val <= min ? 'disabled' : ''}>−</button><span class="step-val">${val}</span><button class="step" data-action="numStep" data-path="${path}" data-delta="1" data-min="${min}" data-max="${max}" ${val >= max ? 'disabled' : ''}>+</button></span>`;
}

function renderMain(s, d) {
  const abCards = ABILITIES.map(a => {
    const sv = d.saves[a.id];
    return `<div class="ab card">
      <span class="ab-name">${a.name}</span>
      <button class="ab-mod" data-action="rollAbility" data-ab="${a.id}" title="Rolar teste de ${a.name}">${fmt(d.mods[a.id])}</button>
      <span class="ab-score">${d.scores[a.id]}</span>
      <div class="ab-save">
        <button class="dot${sv.prof ? ' on' : ''}${sv.classProf ? ' locked' : ''}" data-action="saveToggle" data-ab="${a.id}" title="${sv.classProf ? 'Proficiência da classe' : 'Alternar proficiência'}"></button>
        <button class="linkish" data-action="rollSave" data-ab="${a.id}">Salvaguarda ${fmt(sv.bonus)}</button>
      </div>
    </div>`;
  }).join('');

  const skillRows = SKILLS.map(sk => {
    const x = d.skills[sk.id];
    const cls = x.prof === 2 ? 'exp' : x.prof === 1 ? 'on' : x.jack ? 'half' : '';
    return `<div class="skill">
      <button class="dot ${cls}" data-action="skillCycle" data-id="${sk.id}" title="${x.prof === 2 ? 'Especialização' : x.prof ? 'Proficiente' : 'Sem proficiência'}${x.auto ? ' (' + x.sources.join(', ') + ')' : ''}"></button>
      <button class="skill-name" data-action="rollSkill" data-id="${sk.id}">${sk.name} <small>${AB[sk.ab].short}</small></button>
      ${x.sources.map(src => `<span class="badge">${src}</span>`).join('')}${!x.auto && x.prof ? '<span class="badge">Extra</span>' : ''}
      <button class="skill-bonus" data-action="rollSkill" data-id="${sk.id}">${fmt(x.bonus)}</button>
    </div>`;
  }).join('');

  const toolsAuto = [...new Set([d.bg.tool, d.cls.tools, ...d.mcTools].filter(Boolean))];
  const armorList = [...d.armorTrain].map(a => a === 'shield' ? 'Escudos' : ARMOR_TYPE_NAME[a]).join(', ') || 'Nenhuma';
  const weaponList = [...d.weaponTrain].map(w => ({ simple: 'Simples', martial: 'Marciais', 'martial-light': 'Marciais com Leve', 'martial-finesse-light': 'Marciais com Acuidade/Leve' }[w])).join(', ');

  return `<div class="grid main">
    <div class="abilities">${abCards}</div>
    <div class="card skills">
      <div class="card-head"><h3>Perícias</h3>
      </div>
      <div class="skill-counters">
        ${counter('Classe', s.classSkills.length, d.classSkillMax, `Escolha da lista de ${d.cls.name}`)}
        ${counter('Extras', d.profExtraUsed, d.profExtraMax, d.extraSources.map(([l, n]) => `${l}: ${n}`).join(', ') || 'Nenhuma fonte de proficiência extra')}
        ${counter('Especializações', d.expertiseUsed, d.expertiseMax, 'Dobra o bônus de proficiência')}
      </div>
      <p class="small muted">Clique no círculo para alternar: sem proficiência → proficiente → especialização. Perícias do antecedente e da espécie são fixas. Clique no nome para rolar.${d.jack ? ` Pau pra Toda Obra: +${d.jack} nas demais.` : ''}</p>
      ${skillRows}
      <details class="add-res"><summary>Proficiências concedidas pelo mestre / outras fontes</summary>
        <div class="row gap wrap small" style="margin-top:8px">
          <span>Perícias extras ${numStepper('extraSkills', +s.extraSkills || 0, 0, 18)}</span>
          <span>Especializações extras ${numStepper('extraExpertise', +s.extraExpertise || 0, 0, 18)}</span>
        </div></details>
    </div>
    <div class="card">
      <h3>Sentidos</h3>
      <dl class="facts"><dt>Percepção passiva</dt><dd>${d.passive.perception}</dd><dt>Intuição passiva</dt><dd>${d.passive.insight}</dd><dt>Investigação passiva</dt><dd>${d.passive.investigation}</dd>
      <dt>Visão no escuro</dt><dd>${d.darkvision ? ftToM(d.darkvision) + ' m' : '—'}</dd><dt>Tamanho</dt><dd>${esc(s.size || d.sp.size)}</dd>
      ${d.resist.length ? `<dt>Resistências</dt><dd>${[...new Set(d.resist)].join(', ')}</dd>` : ''}</dl>
      <h3>Proficiências</h3>
      <dl class="facts"><dt>Armaduras</dt><dd>${armorList}</dd><dt>Armas</dt><dd>${weaponList || '—'}</dd>
      <dt>Ferramentas</dt><dd>${toolsAuto.map(esc).join('; ') || '—'}</dd>
      <dt>Idiomas</dt><dd>${[...s.languages, ...d.autoLangs].map(esc).join(', ')}</dd></dl>
      <label class="field">Outras ferramentas / proficiências<textarea data-bind="toolProfs" rows="2">${esc(s.toolProfs)}</textarea></label>
      <label class="field">Bônus em todas as salvaguardas <input type="number" data-bind="saveBonus" data-num value="${+s.saveBonus || 0}" class="w-num"> ${d.aura ? `<small class="muted">Aura de Proteção +${d.aura} já incluída</small>` : ''}</label>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- Combate

// Adiciona a arma ao inventário (se ainda não estiver) e aos ataques
function addWeaponTo(s, weaponId, { inventory = true, attack = true } = {}) {
  const w = WEAPON[weaponId];
  if (inventory) {
    const it = s.inventory.find(i => i.weaponId === w.id || i.name === w.name);
    if (it) it.qty = (+it.qty || 0) + 1;
    else s.inventory.push({ id: uid(), name: w.name, weaponId: w.id, qty: 1, weight: w.weight, equipped: true, notes: `${w.dmg} ${w.dtype}${w.props.length ? '; ' + w.props.join(', ') : ''}` });
  }
  if (attack && !s.attacks.some(a => a.weaponId === w.id)) s.attacks.push({ id: uid(), weaponId: w.id });
}

function renderCombat(s, d) {
  const masteryUsed = d.masteryUsed;
  const attacks = s.attacks.map((atk, i) => {
    const c = attackCalc(d, s, atk);
    const w = c.w;
    const versatile = w && w.props.some(p => p.startsWith('Versátil'));
    return `<div class="attack">
      <div class="atk-top">
        <input data-bind="attacks.${i}.name" value="${esc(atk.name || (w ? w.name : atk.weaponId === 'unarmed' ? 'Ataque Desarmado' : ''))}" placeholder="Nome" class="atk-name">
        <button class="btn roll" data-action="rollAttack" data-i="${i}" title="Rolar ataque">${fmt(c.hit)}</button>
        <button class="btn roll dmg" data-action="rollDmg" data-i="${i}" title="Rolar dano (Shift = crítico)">${esc(c.dmg)}${c.extra ? ' + ' + esc(c.extra) : ''}</button>
        <span class="muted small">${esc(c.dtype)}</span>
        <button class="icon-btn" data-action="delAttack" data-i="${i}" title="Remover">🗑</button>
      </div>
      <div class="atk-meta small">
        ${w ? `<span>${w.props.join(', ') || 'sem propriedades'}</span>` : ''}
        ${!c.prof ? '<span class="bad-text">sem proficiência</span>' : ''}
        ${c.tags.map(t => `<span class="ok">✓ ${esc(t)}</span>`).join('')}
        ${c.notes.map(t => `<span class="atk-note">ⓘ ${esc(t)}</span>`).join('')}
        ${w && w.mastery && d.masteryMax ? (() => {
          const on = !!s.mastery[w.id];
          const block = on ? '' : !c.prof ? 'sem proficiência' : masteryUsed >= d.masteryMax ? 'limite atingido' : '';
          return `<label class="chk-inline${block ? ' dis' : ''}" title="${esc(block ? `Maestria indisponível: ${block}` : MASTERY_DESC[w.mastery])}"><input type="checkbox" data-bind="mastery.${w.id}" ${on ? 'checked' : ''} ${block ? 'disabled' : ''}> Maestria: <b>${w.mastery}</b>${block ? ` <small class="muted">(${block})</small>` : ''}${on && !c.prof ? ' <small class="bad-text">⚠ sem proficiência</small>' : ''}</label>`;
        })() : ''}
      </div>
      <details class="atk-opts"><summary>Ajustes</summary><div class="row gap wrap small">
        <label>Atributo <select data-bind="attacks.${i}.ability">${opt('auto', 'Automático (' + AB[c.ab].short + ')', atk.ability || 'auto')}${ABILITIES.map(a => opt(a.id, a.short, atk.ability)).join('')}</select></label>
        <label>Proficiência <select data-bind="attacks.${i}.prof">${opt('auto', 'Automática', atk.prof || 'auto')}${opt('yes', 'Sim', atk.prof)}${opt('no', 'Não', atk.prof)}</select></label>
        <label>Bônus mágico <input type="number" data-bind="attacks.${i}.magic" data-num value="${+atk.magic || 0}" class="w-num"></label>
        <label>+Acerto <input type="number" data-bind="attacks.${i}.hitBonus" data-num value="${+atk.hitBonus || 0}" class="w-num"></label>
        <label>+Dano <input type="number" data-bind="attacks.${i}.dmgBonus" data-num value="${+atk.dmgBonus || 0}" class="w-num"></label>
        <label>Dano extra <input data-rerender data-bind="attacks.${i}.extraDmg" value="${esc(atk.extraDmg || '')}" placeholder="ex: 1d6" class="w-dice"></label>
        ${versatile ? `<label class="chk-inline"><input type="checkbox" data-bind="attacks.${i}.versatile" ${atk.versatile ? 'checked' : ''}> Duas mãos (versátil)</label>` : ''}
        ${!w && atk.weaponId !== 'unarmed' ? `<label>Dado <input data-rerender data-bind="attacks.${i}.dmg" value="${esc(atk.dmg || '')}" placeholder="1d8" class="w-dice"></label><label>Tipo <input data-rerender data-bind="attacks.${i}.dtype" value="${esc(atk.dtype || '')}" class="w-dice"></label>` : ''}
      </div></details>
    </div>`;
  }).join('');

  const resources = d.resources.map(r => {
    const used = Math.min(r.max, +s.resUsed[r.key] || 0);
    const avail = r.max - used;
    const ctrl = r.pool || r.max > 12
      ? `<span class="pool"><input type="number" min="0" max="${r.max}" value="${avail}" data-action-input="resPool" data-key="${esc(r.key)}" data-max="${r.max}" class="w-num"> / ${r.max}</span>`
      : pips(r.max, avail, 'resPip', `data-key="${esc(r.key)}" data-max="${r.max}"`);
    return `<div class="res">
      <div class="res-name"><b>${esc(r.name)}</b><small class="muted">${esc(r.src)} · ${r.reset === 'short' ? 'descanso curto' : 'descanso longo'}${r.note ? ' · ' + esc(r.note) : ''}</small></div>
      ${ctrl}
      ${r.custom ? `<button class="icon-btn" data-action="delCustomRes" data-id="${r.custom}" title="Remover">🗑</button>` : ''}
    </div>`;
  }).join('');

  const stats = classStats(d);

  return `<div class="grid combat">
    <div class="card wide">
      <div class="card-head"><h3>Ataques</h3>${d.masteryMax ? `<span class="small ${masteryUsed > d.masteryMax ? 'bad-text' : 'muted'}">Maestrias ${masteryUsed}/${d.masteryMax}</span>` : ''}</div>
      ${stats.length ? `<div class="stat-chips">${stats.map(([k, v]) => `<span class="stat-chip"><small>${k}</small><b>${v}</b></span>`).join('')}</div>` : ''}
      ${attacks || '<p class="muted">Nenhum ataque. Adicione uma arma abaixo.</p>'}
      <div class="row gap wrap add-row">
        ${pickBtn('weapon', '', '', '＋ Adicionar arma', 'add')}
        <button class="btn sm" data-action="addUnarmed">Ataque desarmado</button>
        <button class="btn sm" data-action="addCustomAttack">Ataque personalizado</button>
      </div>
      <p class="small muted">Dica: segure Shift ao clicar no dano para rolar um crítico.</p>
    </div>

    <div class="card">
      <h3>Defesa</h3>
      <label class="field">Armadura ${pickBtn('armor', '', (ARMOR[s.armor] || ARMOR.none).name, '')}</label>
      ${ARMOR[s.armor] && ARMOR[s.armor].stealth ? '<p class="small muted">Desvantagem em Furtividade.</p>' : ''}
      <label class="chk-inline"><input type="checkbox" data-bind="shield" ${s.shield ? 'checked' : ''}> Escudo (+2)</label>
      <div class="row gap wrap">
        <label>Bônus de CA <input type="number" data-bind="acBonus" data-num value="${+s.acBonus || 0}" class="w-num"></label>
        <label>Iniciativa extra <input type="number" data-bind="initBonus" data-num value="${+s.initBonus || 0}" class="w-num"></label>
        <label>Deslocamento extra (pés) <input type="number" step="5" data-bind="speedBonus" data-num value="${+s.speedBonus || 0}" class="w-num"></label>
      </div>
      <h3>Condições</h3>
      <div class="chips toggle">${CONDITIONS.map(c => `<button class="chip${s.conditions.includes(c) ? ' on' : ''}" data-action="condition" data-c="${c}">${c}</button>`).join('')}</div>
      <label class="field">Exaustão <select data-bind="exhaustion" data-num>${[0, 1, 2, 3, 4, 5, 6].map(n => opt(n, n === 0 ? 'Nenhuma' : n === 6 ? '6 — Morte' : `${n} (−${n * 2} em Testes de D20, −${ftToM(n * 5)} m)`, s.exhaustion)).join('')}</select></label>
    </div>

    <div class="card">
      <h3>Recursos</h3>
      ${resources || '<p class="muted small">Sem recursos de classe neste nível.</p>'}
      <details class="add-res"><summary>Adicionar recurso personalizado</summary>
        <div class="row gap wrap"><input id="resName" placeholder="Nome (ex: Varinha de Mísseis)"><input id="resMax" type="number" min="1" value="1" class="w-num">
        <select id="resReset">${opt('long', 'Descanso longo', 'long')}${opt('short', 'Descanso curto', '')}</select><button class="btn sm" data-action="addCustomRes">Adicionar</button></div>
      </details>
    </div>
  </div>`;
}


// ---------------------------------------------------------------- Catálogo de magias
const CLASS_SPELL_LIST = { bard: 'bard', cleric: 'cleric', druid: 'druid', paladin: 'paladin', ranger: 'ranger', sorcerer: 'sorcerer', warlock: 'warlock', wizard: 'wizard' };
const LIST_NAMES = { bard: 'Bardo', cleric: 'Clérigo', druid: 'Druida', paladin: 'Paladino', ranger: 'Patrulheiro', sorcerer: 'Feiticeiro', warlock: 'Bruxo', wizard: 'Mago' };

// Conjuradores: cada classe conjuradora (d.casters) tem atributo, CD, limites, lista e nível máximo próprios.
// Uma magia de origem "Classe" pertence a sp.classId (ou à classe inicial, se ausente).
const spellClassOf = (sp, s) => sp.classId || s.classId;
const casterFor = (d, classId) => d.casters.find(c => c.classId === classId) || null;
function defaultSpellList(d) { return d.casters[0] ? d.casters[0].list : ''; }
// Maior nível de magia que o personagem consegue lançar (para filtros gerais)
function maxSpellLevel(d) {
  return Math.max(d.slots.length, d.pact ? d.pact.level : 0, ...d.casters.map(c => c.maxLevel), 0);
}
function catFilter(s, d) {
  const f = ui.spellFilter = Object.assign({ q: '', lvl: '', list: null, school: '', castable: true }, ui.spellFilter);
  const key = s.id + ':' + d.casters.map(c => c.classId).join(',');
  if (f.list === null || f.key !== key) {
    f.list = ''; f.key = key; f.source = 'extra'; f.lvl = ''; f.castable = false;
  }
  return f;
}

// Origem da magia: 'class' conta nos limites; 'always' (sempre preparada) e 'extra' (espécie, talento, item) não contam.
const SPELL_SOURCES = { class: 'Classe', always: 'Sempre preparada', extra: 'Espécie / talento / item' };
const spellSource = (sp) => sp.source || 'class';
// Contagem das magias de origem "Classe" de uma classe (padrão: classe inicial)
function spellCounts(s, classId = s.classId) {
  const cls = s.spells.filter(x => spellSource(x) === 'class' && spellClassOf(x, s) === classId);
  return { cantrips: cls.filter(x => +x.level === 0).length, prepared: cls.filter(x => +x.level > 0 && x.prepared).length, book: cls.filter(x => +x.level > 0).length };
}
// Listas de onde a classe pode tirar magias (Segredos Mágicos do Bardo no nível 10 abre outras)
function allowedListsFor(c) {
  if (!c) return [];
  if (c.classId === 'bard' && c.level >= 10) return ['bard', 'cleric', 'druid', 'wizard'];
  return [c.list];
}
const casterLabel = (c) => c.name + (c.type === 'third' && c.sub ? ` (${c.sub.name})` : '');
const spellMaxOf = (c) => c.classId === 'wizard' ? 6 + 2 * (c.level - 1) : c.prepared; // grimório do Mago x preparadas
// Por que esta magia não pode entrar como magia da classe c? ('' = pode)
function classSpellBlock(sp, s, d, c = d.casters[0]) {
  if (!c) return `${d.cls.name || 'Sua classe'} não conjura magias neste nível — adicione como "${SPELL_SOURCES.extra}".`;
  const lists = allowedListsFor(c);
  if (!sp.classes.some(x => lists.includes(x))) return `${sp.name} não está na lista de ${lists.map(x => LIST_NAMES[x]).join('/')}.`;
  const n = spellCounts(s, c.classId);
  if (sp.level === 0 && n.cantrips >= c.cantrips) return c.cantrips ? `${casterLabel(c)} já tem os ${c.cantrips} truques permitidos no nível ${c.level}.` : `${c.name} não aprende truques.`;
  if (sp.level > c.maxLevel) return `${c.name} nível ${c.level} só lança magias até o ${c.maxLevel}º nível.`;
  return '';
}

function renderCatalog(s, d) {
  const f = catFilter(s, d);
  const maxLvl = maxSpellLevel(d);
  return `<details class="card wide catalog"${d.casterType ? '' : ' open'}>
    <summary class="cat-summary"><h3>Outras fontes</h3><span class="small muted">Magias de espécie, talento, item, subclasse ou de outras listas — não contam nos limites da classe. ${SPELLS.length} magias (SRD 5.2).</span></summary>
    <div class="row gap wrap cat-filters">
      <input id="spellSearch" placeholder="Buscar por nome (português ou inglês)…" value="${esc(f.q)}" autocomplete="off">
      <select id="catList" class="cat-f">${opt('', 'Todas as listas', f.list)}${Object.entries(LIST_NAMES).map(([k, v]) => opt(k, 'Lista de ' + v, f.list)).join('')}</select>
      <select id="catLvl" class="cat-f">${opt('', 'Todos os níveis', f.lvl)}${Array.from({ length: 10 }, (_, l) => opt(l, l === 0 ? 'Truques' : l + 'º nível', f.lvl)).join('')}</select>
      <select id="catSchool" class="cat-f">${opt('', 'Todas as escolas', f.school)}${SPELL_SCHOOLS.map(x => opt(x, x, f.school)).join('')}</select>
      <label class="small">Adicionar como <select id="catSource" class="cat-f">${Object.entries(SPELL_SOURCES).filter(([k]) => k !== 'class').map(([k, v]) => opt(k, v, f.source)).join('')}</select></label>
    </div>
    <div id="catResults" class="cat-results">${renderCatalogResults(s, d)}</div>
  </details>`;
}

function renderCatalogResults(s, d) {
  const f = catFilter(s, d);
  const q = f.q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const maxLvl = maxSpellLevel(d);
  const owned = new Set(s.spells.map(x => x.cat).filter(Boolean));
  const res = SPELLS.filter(sp =>
    (!q || sp.search.includes(q)) &&
    (!f.list || sp.classes.includes(f.list)) &&
    (f.lvl === '' || sp.level === +f.lvl) &&
    (!f.school || sp.school === f.school) &&
    (!(f.castable && d.casterType) || sp.level <= maxLvl));
  if (!res.length) return '<p class="muted small">Nenhuma magia encontrada com esses filtros.</p>';
  const LIMIT = 80;
  return res.slice(0, LIMIT).map(sp => `<div class="cat-spell" data-spell="${sp.id}">
      <div class="cat-top">
        <span class="cat-lvl">${sp.level === 0 ? 'Truque' : sp.level + 'º'}</span>
        <b>${esc(sp.name)}</b> <small class="muted">${esc(sp.en)}</small>
        ${sp.conc ? '<span class="badge" title="Concentração">C</span>' : ''}${sp.ritual ? '<span class="badge" title="Ritual">R</span>' : ''}
        <span class="cat-act">${owned.has(sp.id) ? '<span class="ok small">✓ na ficha</span>' : (() => {
          const why = f.source === 'class' ? classSpellBlock(sp, s, d) : '';
          return why ? `<button class="btn sm" disabled title="${esc(why)}">Bloqueada</button><span class="cat-why small muted">${esc(why)}</span>` : `<button class="btn sm primary" data-action="addCatSpell" data-id="${sp.id}">+ Adicionar</button>`;
        })()}</span>
      </div>
      <div class="cat-meta small muted">${esc(sp.school)} · ${esc(sp.time)} · ${esc(sp.range)} · ${esc(sp.dur)} · ${sp.classes.map(c => LIST_NAMES[c]).join(', ')}</div>
      ${mechLine(sp.mec || {}) ? `<div class="mec-line">${esc(mechLine(sp.mec))}</div>` : ''}
      <div class="cat-sum">${esc(sp.sum)}</div>
      <details><summary>Texto oficial (inglês)</summary><p class="small">${esc(sp.text).replace(/\n/g, '<br>')}</p></details>
    </div>`).join('') + (res.length > LIMIT ? `<p class="muted small">Mostrando ${LIMIT} de ${res.length}. Refine a busca para ver as demais.</p>` : `<p class="muted small">${res.length} magia(s).</p>`);
}

function refreshCatalog() {
  const s = active(); const box = $('#catResults');
  if (s && box) box.innerHTML = renderCatalogResults(s, compute(s));
}



// ---------------------------------------------------------------- Seletor de magias da classe (chips), um por classe conjuradora
function pickerState(s, d, c) {
  const wizard = c.classId === 'wizard';
  const mine = s.spells.filter(x => spellSource(x) === 'class' && x.cat && spellClassOf(x, s) === c.classId);
  return {
    wizard,
    cantripIds: new Set(mine.filter(x => +x.level === 0).map(x => x.cat)),
    spellIds: new Set(mine.filter(x => +x.level > 0 && (wizard || x.prepared)).map(x => x.cat)),
    spellMax: spellMaxOf(c),
  };
}

function renderSpellPicker(s, d, c) {
  const lists = allowedListsFor(c);
  const maxLvl = c.maxLevel;
  const st = pickerState(s, d, c);
  const q = (ui.pickerQ || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pool = SPELLS.filter(sp => sp.classes.some(x => lists.includes(x)) && sp.level <= maxLvl);
  const cantripFull = st.cantripIds.size >= c.cantrips;
  const spellFull = st.spellIds.size >= st.spellMax;
  const [detailCls, detailSpell] = (ui.spellDetail || '').split(':');
  const detailId = detailCls === c.classId && SPELL[detailSpell] ? detailSpell : null;
  const dk = (id) => `${c.classId}:${id}`;

  const chip = (sp, on, full) => {
    const dis = !on && full;
    const hide = q && !sp.search.includes(q);
    return `<span class="chk spell-chip${on ? ' on' : ''}${dis ? ' dis' : ''}${detailId === sp.id ? ' open' : ''}" data-search="${esc(sp.search)}"${hide ? ' hidden' : ''}>
      <input type="checkbox" data-action="pickSpell" data-id="${sp.id}" data-cls="${c.classId}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''} title="${on ? 'Remover' : dis ? 'Limite atingido' : 'Selecionar'}" aria-label="Selecionar ${esc(sp.name)}">
      <button class="pill-name" data-action="spellDetail" data-id="${dk(sp.id)}" title="Ver detalhes">${esc(sp.name)}${sp.conc ? ' <small>C</small>' : ''}${sp.ritual ? ' <small>R</small>' : ''}</button></span>`;
  };
  const group = (title, arr, ids, full) => {
    if (!arr.length) return '';
    const open = arr.find(sp => sp.id === detailId);
    return `<div class="pick-group"><h4>${title}</h4><div class="checks">${arr.map(sp => chip(sp, ids.has(sp.id), full)).join('')}</div>
      ${open ? `<div class="spell-detail">${spellCardHtml(open, false, true)}
        <div class="row gap">${ids.has(open.id) ? `<button class="btn sm danger" data-action="pickSpell" data-id="${open.id}" data-cls="${c.classId}">Remover</button>`
          : full ? `<button class="btn sm" disabled>Limite atingido</button>` : `<button class="btn sm primary" data-action="pickSpell" data-id="${open.id}" data-cls="${c.classId}">Selecionar</button>`}
          <button class="btn sm" data-action="spellDetail" data-id="${dk(open.id)}">Fechar</button></div></div>` : ''}</div>`;
  };
  const status = (n, max) => `<b class="${n === max ? 'ok' : n > max ? 'bad-text' : 'pending'}">${n}/${max}</b>`;
  const byLvl = {};
  pool.filter(sp => sp.level > 0).forEach(sp => (byLvl[sp.level] = byLvl[sp.level] || []).push(sp));

  return `<div class="card span2 picker">
    <div class="card-head"><h3>Magias de ${esc(casterLabel(c))}${d.multi ? ` <small class="muted">nível ${c.level}</small>` : ''}</h3>
      <input class="picker-filter" id="pickerFilter-${c.classId}" placeholder="Filtrar por nome…" autocomplete="off" value="${esc(ui.pickerQ || '')}"></div>
    <p class="small muted">Marque a caixinha para escolher; clique no nome para ver os detalhes. Lista de ${lists.map(x => LIST_NAMES[x]).join(', ')}, até o ${maxLvl}º nível · ${AB[c.ability].name}, CD ${c.dc}.</p>
    ${c.cantrips ? `<section class="pick-sec"><div class="pick-head"><span>Truques ${status(st.cantripIds.size, c.cantrips)}</span><small class="muted">lançados à vontade, sem gastar espaço de magia</small></div>
      ${group('', pool.filter(sp => sp.level === 0), st.cantripIds, cantripFull)}</section>` : ''}
    <section class="pick-sec"><div class="pick-head"><span>${st.wizard ? 'Magias do grimório' : 'Magias preparadas'} ${status(st.spellIds.size, st.spellMax)}</span>
      <small class="muted">${st.wizard ? `o grimório começa com 6 e ganha 2 por nível; você prepara ${c.prepared} delas em "Minhas magias"` : 'gastam espaços de magia'}</small></div>
      ${Object.entries(byLvl).map(([l, arr]) => group(l + 'º nível', arr, st.spellIds, spellFull)).join('')}</section>
  </div>`;
}

// ---------------------------------------------------------------- Ícones das escolas e card de detalhes
const SCHOOL_STYLE = {
  'Abjuração': ['#5b9bd5', '<path d="M32 8 L52 16 V32 C52 44 43 52 32 56 C21 52 12 44 12 32 V16 Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M32 18 V46 M22 30 H42" stroke="currentColor" stroke-width="4"/>'],
  'Adivinhação': ['#9b7fd4', '<path d="M6 32 C16 18 48 18 58 32 C48 46 16 46 6 32 Z" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="32" cy="32" r="8" fill="currentColor"/>'],
  'Conjuração': ['#d4a64a', '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="5 4"/><circle cx="32" cy="32" r="4" fill="currentColor"/>'],
  'Encantamento': ['#e07fb0', '<path d="M32 52 C14 40 8 30 14 21 C20 13 29 16 32 23 C35 16 44 13 50 21 C56 30 50 40 32 52 Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M26 30 C30 26 34 34 38 30" fill="none" stroke="currentColor" stroke-width="3"/>'],
  'Evocação': ['#e0703a', '<path d="M32 6 C36 18 48 22 46 38 C45 48 38 56 32 56 C26 56 18 50 18 40 C18 32 24 28 26 22 C28 28 30 30 32 30 C34 22 30 14 32 6 Z" fill="none" stroke="currentColor" stroke-width="4"/>'],
  'Ilusão': ['#7fc9c9', '<path d="M10 20 C20 14 44 14 54 20 C54 38 44 50 32 50 C20 50 10 38 10 20 Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M19 28 C22 24 27 24 29 28 M35 28 C37 24 42 24 45 28" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 40 C29 36 35 36 40 40" fill="none" stroke="currentColor" stroke-width="3"/>'],
  'Necromancia': ['#8fbf6a', '<path d="M32 8 C18 8 12 18 12 28 C12 36 18 40 20 42 V50 H44 V42 C46 40 52 36 52 28 C52 18 46 8 32 8 Z" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="29" r="5" fill="currentColor"/><circle cx="40" cy="29" r="5" fill="currentColor"/><path d="M28 50 V44 M36 50 V44" stroke="currentColor" stroke-width="3"/>'],
  'Transmutação': ['#c9a26b', '<path d="M14 26 A18 18 0 0 1 46 18" fill="none" stroke="currentColor" stroke-width="4"/><path d="M46 8 V20 H34" fill="none" stroke="currentColor" stroke-width="4"/><path d="M50 38 A18 18 0 0 1 18 46" fill="none" stroke="currentColor" stroke-width="4"/><path d="M18 56 V44 H30" fill="none" stroke="currentColor" stroke-width="4"/>'],
};
function schoolIcon(school, size = 56) {
  const st = SCHOOL_STYLE[school] || ['#a99b84', '<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="4"/><text x="32" y="40" text-anchor="middle" font-size="22" fill="currentColor">?</text>'];
  return `<span class="school-ic" style="--sc:${st[0]};width:${size}px;height:${size}px"><svg viewBox="0 0 64 64" width="${size * 0.62}" height="${size * 0.62}" aria-hidden="true">${st[1]}</svg></span>`;
}

// Mecânica (extraída do texto oficial): linhas claras e versão compacta
const mecOf = (sp) => (sp.mec ? sp.mec : sp.cat && SPELL[sp.cat] ? SPELL[sp.cat].mec : null) || {};
const MEC_ROWS = [['atk', 'Acerto'], ['save', 'Resistência'], ['dmg', 'Dano'], ['heal', 'Cura'], ['thp', 'PV temporários'], ['area', 'Área'], ['targets', 'Alvos'], ['cond', 'Condições'], ['cure', 'Remove'], ['up', 'Nível maior']];
function mechHtml(mec) {
  const rows = MEC_ROWS.filter(([k]) => mec[k]).map(([k, l]) => `<div class="mec-row mec-${k}"><small>${l}</small><b>${esc(mec[k])}</b></div>`).join('');
  return rows ? `<div class="mec">${rows}</div>` : '';
}
function mechLine(mec) {
  const parts = [];
  if (mec.atk) parts.push(mec.atk.replace('Ataque mágico ', 'Ataque '));
  if (mec.save) parts.push(mec.save.replace('Salvaguarda de ', 'Salv. ').replace(' — metade do dano se passar', ' (½)'));
  if (mec.dmg) parts.push(mec.dmg);
  if (mec.heal) parts.push('Cura ' + mec.heal.replace(' + mod. de conjuração', ' + mod.'));
  if (mec.thp) parts.push(mec.thp + ' PV temp.');
  if (mec.area) parts.push(mec.area.replace(' de raio', '').replace(' ao seu redor', ''));
  if (mec.cond) parts.push(mec.cond);
  return parts.join(' · ');
}

// Bloco de informações sempre visível (sem hover): tempo/alcance/duração, mecânica e efeito
function spellInfoHtml(sp) {
  const mec = mecOf(sp);
  const cat = sp.cat && SPELL[sp.cat];
  const facts = [sp.time || (cat && cat.time), sp.range || (cat && cat.range), sp.dur || (cat && cat.dur)].filter(Boolean);
  const short = (k, v) => k === 'save' ? v.replace('Salvaguarda de ', '').replace(' — metade do dano se passar', ' (metade se passar)')
    : k === 'atk' ? v.replace('Ataque mágico ', '') : v;
  const label = { atk: 'Ataque', save: 'Resistência' };
  const items = MEC_ROWS.filter(([k]) => mec[k]).map(([k, l]) => `<span class="si si-${k}"><small>${label[k] || l}</small>${esc(short(k, mec[k]))}</span>`);
  const effect = sp.notes || (cat && cat.sum) || '';
  if (!facts.length && !items.length && !effect) return '';
  return `<div class="spell-info">
    ${facts.length ? `<div class="si-facts">${facts.map(esc).join(' · ')}</div>` : ''}
    ${items.length ? `<div class="si-mec">${items.join('')}</div>` : ''}
    ${effect ? `<p class="si-eff">${esc(effect)}</p>` : ''}
  </div>`;
}

function spellCardHtml(sp, mine, full) {
  const lvlTxt = +sp.level === 0 ? `Truque de ${sp.school || '—'}` : `${sp.school || 'Magia'} de ${sp.level}º nível`;
  const cat = sp.cat ? SPELL[sp.cat] : (sp.classes ? sp : null);
  const text = cat && cat.text ? cat.text.split('\n')[0] : '';
  const short = full && cat ? cat.text : text.length > 420 ? text.slice(0, 420).replace(/\s\S*$/, '') + '…' : text;
  const field = (k, v) => v ? `<div><small>${k}</small><b>${esc(v)}</b></div>` : '';
  const src = mine ? spellSource(sp) : null;
  return `<div class="hc-head">${schoolIcon(sp.school)}<div><div class="hc-name">${esc(sp.name)}</div>${cat && cat.en ? `<div class="hc-en">${esc(cat.en)}</div>` : ''}<div class="hc-lvl">${esc(lvlTxt)}</div></div></div>
    <div class="hc-grid three">${field('Tempo', sp.time)}${field('Alcance', sp.range)}${field('Duração', sp.dur)}</div>
    ${mechHtml(mecOf(sp))}
    <div class="hc-tags">${sp.conc ? '<span class="badge">Concentração</span>' : ''}${sp.ritual ? '<span class="badge">Ritual</span>' : ''}${src && src !== 'class' ? `<span class="badge">${SPELL_SOURCES[src]}</span>` : ''}${mine && +sp.level > 0 && src === 'class' ? `<span class="badge${sp.prepared ? ' gold' : ''}">${sp.prepared ? 'Preparada' : 'Não preparada'}</span>` : ''}</div>
    ${(mine ? sp.notes : sp.sum) ? `<p class="hc-sum"><small>Efeito</small>${esc(mine ? sp.notes : sp.sum)}</p>` : ''}
    ${short ? `<p class="hc-text">${esc(short).replace(/\n/g, '<br>')}</p>` : ''}
    ${cat && cat.classes ? `<div class="hc-foot">${cat.classes.map(c => LIST_NAMES[c]).join(' · ')}</div>` : ''}`;
}

let hoverTimer = null, hoverEl = null;
function hideHoverCard() { clearTimeout(hoverTimer); hoverEl = null; const hc = $('#hovercard'); if (hc) hc.hidden = true; }
document.addEventListener('mouseover', (ev) => {
  const el = ev.target.closest('[data-spell],[data-myspell]');
  if (el === hoverEl) return;
  if (!el) { hideHoverCard(); return; }
  if (ev.target.closest('details[open]')) return; // não atrapalha quem está lendo os detalhes
  hideHoverCard(); hoverEl = el;
  hoverTimer = setTimeout(() => {
    const s = active(); if (!s || hoverEl !== el || !document.body.contains(el)) return;
    let sp, mine = false;
    if (el.dataset.spell) sp = SPELL[el.dataset.spell];
    else { sp = s.spells.find(x => x.id === el.dataset.myspell); mine = true; }
    if (!sp) return;
    const hc = $('#hovercard');
    hc.innerHTML = spellCardHtml(sp, mine); hc.hidden = false;
    const r = el.getBoundingClientRect(), w = hc.offsetWidth, h = hc.offsetHeight;
    let left = r.right + 12, top = r.top;
    if (left + w > innerWidth - 12) left = Math.max(12, r.left - w - 12);
    if (left < 12 || (left + w > innerWidth - 12)) { left = Math.min(Math.max(12, ev.clientX - w / 2), innerWidth - w - 12); top = r.bottom + 8; }
    if (top + h > innerHeight - 12) top = Math.max(12, innerHeight - h - 12);
    hc.style.left = left + 'px'; hc.style.top = top + 'px';
  }, 220);
});
window.addEventListener('scroll', () => { const hc = $('#hovercard'); if (hc && !hc.hidden) hideHoverCard(); }, { passive: true });
document.addEventListener('pointerdown', hideHoverCard, true);

// ---------------------------------------------------------------- Magias
function renderSpells(s, d) {
  const CASTER_NAME = { full: 'Conjurador completo', half: 'Meio-conjurador', third: 'Um terço de conjurador', pact: 'Magia de Pacto' };
  const byLvl = Array.from({ length: 10 }, () => []);
  s.spells.forEach((sp, i) => byLvl[Math.min(9, Math.max(0, +sp.level || 0))].push([sp, i]));
  const main = d.casters[0] || null;
  const mainCount = main ? spellCounts(s, main.classId) : { cantrips: 0, prepared: 0, book: 0 };

  const slotsHtml = d.slots.map((n, i) => {
    const lvl = i + 1; const used = Math.min(n, s.slotsUsed[lvl] || 0);
    return `<div class="slot"><span class="slot-l">${lvl}º</span>${pips(n, n - used, 'slotPip', `data-l="${lvl}" data-max="${n}"`)}</div>`;
  }).join('');

  const spellRow = ([sp, i]) => {
    const src = spellSource(sp);
    const fixedPrep = src !== 'class';
    const own = src === 'class' ? casterFor(d, spellClassOf(sp, s)) : null;
    const orphan = src === 'class' && !own && d.casters.length > 0;   // classe da magia saiu da ficha
    const tooHigh = own ? +sp.level > own.maxLevel : false;
    return `<div class="spell${sp.prepared || +sp.level === 0 || fixedPrep ? ' prep' : ''}" data-myspell="${sp.id}">
    ${+sp.level === 0 ? '<span class="cantrip-dot" title="Truque">✦</span>'
      : fixedPrep ? `<span class="cantrip-dot" title="${SPELL_SOURCES[src]} — não conta no limite">★</span>`
      : `<input type="checkbox" data-prep="${i}" ${sp.prepared ? 'checked' : ''} ${tooHigh && !sp.prepared ? 'disabled' : ''} title="${tooHigh ? 'Acima do seu nível máximo de magia' : 'Preparada'}">`}
    <input data-bind="spells.${i}.name" value="${esc(sp.name)}" placeholder="Nome da magia" class="spell-name">
    ${spellInfoHtml(sp)}
    <span class="tags">${d.casters.length > 1 && own ? `<span class="badge">${esc(own.name)}</span>` : ''}${orphan ? '<span class="badge bad" title="A classe desta magia não está na ficha">sem classe</span>' : ''}${src !== 'class' ? `<span class="badge">${src === 'always' ? 'Sempre' : 'Extra'}</span>` : ''}${tooHigh ? '<span class="badge bad" title="Acima do seu nível máximo">nível alto</span>' : ''}${sp.conc ? '<span class="badge">C</span>' : ''}${sp.ritual ? '<span class="badge">R</span>' : ''}</span>
    <details><summary>editar</summary><div class="row gap wrap small">
      <label>Origem <select data-src="${i}">${Object.entries(SPELL_SOURCES).map(([k, v]) => opt(k, v, src)).join('')}</select></label>
      <label>Nível <select data-bind="spells.${i}.level" data-num>${Array.from({ length: 10 }, (_, l) => opt(l, l === 0 ? 'Truque' : l + 'º', sp.level)).join('')}</select></label>
      <label>Escola <select data-bind="spells.${i}.school">${opt('', '—', sp.school)}${SPELL_SCHOOLS.map(x => opt(x, x, sp.school)).join('')}</select></label>
      <label>Tempo <input data-bind="spells.${i}.time" value="${esc(sp.time || '')}" placeholder="1 ação" class="w-dice"></label>
      <label>Alcance <input data-bind="spells.${i}.range" value="${esc(sp.range || '')}" placeholder="18 m" class="w-dice"></label>
      <label>Duração <input data-bind="spells.${i}.dur" value="${esc(sp.dur || '')}" placeholder="Instantânea" class="w-dice"></label>
      <label class="chk-inline"><input type="checkbox" data-bind="spells.${i}.conc" ${sp.conc ? 'checked' : ''}> Concentração</label>
      <label class="chk-inline"><input type="checkbox" data-bind="spells.${i}.ritual" ${sp.ritual ? 'checked' : ''}> Ritual</label>
      </div><textarea data-bind="spells.${i}.notes" rows="3" placeholder="Descrição / efeito">${esc(sp.notes || '')}</textarea>
      ${sp.cat && SPELL[sp.cat] ? `<div class="spell-official"><b>Texto oficial (SRD 5.2, em inglês)</b><p>${esc(SPELL[sp.cat].text).replace(/\n/g, '<br>')}</p></div>` : ''}</details>
    <button class="icon-btn" data-action="delSpell" data-i="${i}" title="Remover">🗑</button>
  </div>`;
  };

  const cantripList = byLvl[0].map(spellRow).join('');
  const spellLists = byLvl.slice(1).map((arr, l) => arr.length ? `<div class="spell-group"><h4>${l + 1}º nível</h4>${arr.map(spellRow).join('')}</div>` : '').join('');
  const lists = `<div class="my-spells">
    <section><h3>Truques ${d.casters.length === 1 && main.cantrips ? limitBadge(mainCount.cantrips, main.cantrips) : ''}</h3>${cantripList || '<p class="muted small">Nenhum truque escolhido.</p>'}</section>
    <section><h3>Magias ${d.casters.length === 1 ? `<small class="muted">preparadas</small> ${limitBadge(mainCount.prepared, main.prepared)}` : ''}</h3>${spellLists || '<p class="muted small">Nenhuma magia escolhida.</p>'}</section>
  </div>`;

  return `<div class="grid spells">
    <div class="card">
      <h3>Conjuração</h3>
      ${d.casters.length ? d.casters.map(c => {
        const n = spellCounts(s, c.classId);
        return `<div class="caster-block">
        ${d.casters.length > 1 ? `<h4>${esc(casterLabel(c))} <small class="muted">nível ${c.level}</small></h4>` : ''}
        <p class="small muted">${CASTER_NAME[c.type]} · ${esc(casterLabel(c))} · ${AB[c.ability].name}</p>
        ${c.primary ? `<label class="field small">Atributo de conjuração <select data-bind="spellAbility">${opt('', 'Padrão da classe', s.spellAbility)}${['int', 'wis', 'cha'].map(a => opt(a, AB[a].name, s.spellAbility)).join('')}</select></label>` : ''}
        <div class="vitals mini">
          <div class="vital card"><span class="v-label">CD de resistência</span><span class="v-big">${c.dc}</span></div>
          <button class="vital card click" data-action="rollSpellAtk" data-cls="${c.classId}"><span class="v-label">Ataque mágico</span><span class="v-big">${fmt(c.attack)}</span></button>
          <div class="vital card"><span class="v-label">Modificador</span><span class="v-big">${fmt(d.mods[c.ability])}</span></div>
        </div>
        <dl class="facts">
          ${c.cantrips ? `<dt>Truques</dt><dd>${limitBadge(n.cantrips, c.cantrips)}</dd>` : ''}
          <dt>Magias preparadas</dt><dd>${limitBadge(n.prepared, c.prepared)}</dd>
          <dt>Nível máximo</dt><dd>${c.maxLevel}º</dd>
          ${c.classId === 'wizard' ? `<dt>Grimório</dt><dd>${n.book} magias <small class="muted">(começa com 6 e ganha 2 por nível: ${spellMaxOf(c)} esperadas)</small></dd>` : ''}
        </dl></div>`;
      }).join('') : `<p class="small muted">Sua classe não conjura magias neste nível. Se tiver magias de espécie ou talentos, escolha o atributo abaixo.</p>
        <label class="field">Atributo de conjuração <select data-bind="spellAbility">${opt('', 'Nenhum', s.spellAbility)}${['int', 'wis', 'cha'].map(a => opt(a, AB[a].name, s.spellAbility)).join('')}</select></label>
        ${d.spell ? `<div class="vitals mini">
          <div class="vital card"><span class="v-label">CD de resistência</span><span class="v-big">${d.spell.dc}</span></div>
          <button class="vital card click" data-action="rollSpellAtk"><span class="v-label">Ataque mágico</span><span class="v-big">${fmt(d.spell.attack)}</span></button>
          <div class="vital card"><span class="v-label">Modificador</span><span class="v-big">${fmt(d.mods[d.spell.ability])}</span></div>
        </div>` : ''}`}
      ${d.casters.length ? `<p class="small muted">Só magias de origem "Classe" contam nos limites. Magias sempre preparadas (subclasse, características) e de espécie/talento/item ficam de fora.${d.casters.filter(c => c.type !== 'pact').length > 1 ? ' Espaços de magia pela tabela de multiclasse.' : ''}</p>` : ''}
      ${d.slots.length ? `<h3>Espaços de magia</h3><div class="slots">${slotsHtml}</div>` : ''}
      ${d.pact ? `<h3>Espaços de Pacto (${d.pact.level}º nível)</h3><div class="slots"><div class="slot"><span class="slot-l">${d.pact.level}º</span>${pips(d.pact.count, d.pact.count - Math.min(d.pact.count, s.pactUsed), 'pactPip', `data-max="${d.pact.count}"`)}</div></div><p class="small muted">Recuperados em descanso curto ou longo.</p>` : ''}
    </div>
    ${d.casters.map(c => renderSpellPicker(s, d, c)).join('')}
    <div class="card wide">
      ${lists}
      <details class="add-res"><summary>Adicionar magia personalizada (fora do catálogo)</summary>
      <div class="row gap wrap add-row"><input id="spellName" placeholder="Nome da magia"><select id="spellLevel">${Array.from({ length: 10 }, (_, l) => opt(l, l === 0 ? 'Truque' : l + 'º nível', '')).join('')}</select><button class="btn sm" data-action="addSpell">Adicionar</button></div></details>
    </div>
    ${renderCatalog(s, d)}
  </div>`;
}

// ---------------------------------------------------------------- Inventário
function renderInventory(s, d) {
  const pct = Math.min(100, d.weight / d.capacity * 100);
  const items = s.inventory.map((it, i) => `<tr class="${it.equipped ? 'eq' : ''}">
    <td><input type="checkbox" data-bind="inventory.${i}.equipped" ${it.equipped ? 'checked' : ''} title="Equipado"></td>
    <td><input data-bind="inventory.${i}.name" value="${esc(it.name)}" class="w-full"></td>
    <td><input type="number" min="0" data-bind="inventory.${i}.qty" data-num value="${+it.qty || 0}" class="w-num"></td>
    <td><input type="number" min="0" step="0.25" data-bind="inventory.${i}.weight" data-num value="${+it.weight || 0}" class="w-num"></td>
    <td><input data-bind="inventory.${i}.notes" value="${esc(it.notes || '')}" placeholder="—" class="w-full"></td>
    <td><button class="icon-btn" data-action="delItem" data-i="${i}" title="Remover">🗑</button></td>
  </tr>`).join('');

  return `<div class="grid inv">
    <div class="card">
      <h3>Dinheiro</h3>
      <div class="coins">${COINS.map(c => `<label class="coin coin-${c.id}"><span>${c.name}<small>${c.full}</small></span><input type="number" min="0" data-bind="coins.${c.id}" data-num value="${+s.coins[c.id] || 0}"></label>`).join('')}</div>
      <p class="small">Patrimônio total: <b>${d.wealth.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} PO</b></p>
      <div class="row gap wrap"><input type="number" id="coinAmt" min="0" placeholder="Valor" class="w-num"><select id="coinType">${COINS.map(c => opt(c.id, c.name, 'po')).join('')}</select>
      <button class="btn sm good" data-action="coinOp" data-sign="1">Receber</button><button class="btn sm danger" data-action="coinOp" data-sign="-1">Gastar</button></div>
      <p class="small muted">Ao gastar, moedas maiores são trocadas automaticamente se faltar troco.</p>
    </div>
    <div class="card">
      <h3>Carga</h3>
      <div class="hp-bar"><div style="width:${pct}%" class="${pct >= 100 ? 'low' : pct > 66 ? 'mid' : ''}"></div></div>
      <p class="small">${d.weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} lb de ${d.capacity} lb (${(d.weight * 0.45).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg / ${(d.capacity * 0.45).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg)</p>
      <p class="small muted">Capacidade = FOR × 15 lb${d.sp.id === 'goliath' ? ' × 2 (Constituição Poderosa)' : ''}. Acima disso, deslocamento cai para 1,5 m.</p>
    </div>
    <div class="card wide">
      <h3>Itens</h3>
      <div class="table-wrap"><table class="inv-table"><thead><tr><th title="Equipado">Eq.</th><th>Item</th><th>Qtd.</th><th>Peso (lb)</th><th>Notas</th><th></th></tr></thead><tbody>${items || '<tr><td colspan="6" class="muted c">Inventário vazio.</td></tr>'}</tbody></table></div>
      <div class="row gap wrap add-row">
        <input id="itemName" list="gearList" placeholder="Nome do item"><datalist id="gearList">${GEAR.map(([n]) => `<option value="${esc(n)}">`).join('')}</datalist>
        <input id="itemQty" type="number" min="1" value="1" class="w-num" title="Quantidade">
        <button class="btn sm primary" data-action="addItem">Adicionar item</button>
      </div>
      <div class="row gap wrap add-row">
        ${pickBtn('gear', '', '', '＋ Arma, armadura ou escudo', 'add')}
        <span class="small muted">Armas também entram em Combate → Ataques.</span>
      </div>
    </div>
  </div>`;
}


// Pré-requisitos dos talentos (regras 2024)
const FEAT_REPEATABLE = new Set(['asi', 'skilled', 'mi-cleric', 'mi-druid', 'mi-wizard', 'elemental-adept']);
const FEAT_PREREQ = { 'Origem': '', 'Estilo de Luta': 'Característica Estilo de Luta (Guerreiro 1, Paladino 2, Patrulheiro 2)', 'Geral': 'Nível 4+', 'Dádiva Épica': 'Nível 19+' };
// Escolha do aumento de atributo de um talento (asi: +2 em um ou +1 em dois; demais: +1 num atributo permitido)
function abChooserHtml(box, featId, ab, d) {
  const R = FEAT_AB[featId]; if (!R) return '';
  ab = ab || {};
  const ks = Object.keys(ab).filter(k => +ab[k] > 0);
  const mode = R.asi ? (ks.length === 2 || (ks.length === 1 && +ab[ks[0]] === 1) ? '11' : '2') : '1';
  const [a1 = '', a2 = ''] = ks;
  const optAb = (sel, other) => R.from.map(a => {
    const full = d.scores[a] >= R.max && !ab[a];
    return `<option value="${a}"${a === sel ? ' selected' : ''}${full || a === other ? ' disabled' : ''}>${AB[a].short} (${d.scores[a]})${full ? ' — no máximo' : ''}</option>`;
  }).join('');
  return `<span class="ab-choose" data-abbox="${box}">
    ${R.asi ? `<select data-abk="mode">${opt('2', '+2 em um', mode)}${opt('11', '+1 em dois', mode)}</select>` : '<b>+1 em</b>'}
    <select data-abk="a1"><option value="">atributo…</option>${optAb(a1, a2)}</select>
    ${mode === '11' ? `<select data-abk="a2"><option value="">atributo…</option>${optAb(a2, a1)}</select>` : ''}</span>`;
}
function readAbChooser(box) {
  const v = (k) => { const el = box.querySelector(`[data-abk="${k}"]`); return el ? el.value : ''; };
  const mode = v('mode') || '1', a1 = v('a1'), a2 = v('a2');
  if (!a1) return {};
  if (mode === '2') return { [a1]: 2 };
  if (mode === '11') return a2 && a2 !== a1 ? { [a1]: 1, [a2]: 1 } : { [a1]: 1 };
  return { [a1]: 1 };
}

// Pré-requisito do talento (nível, característica, atributo, treinamento, conjuração). '' = atende.
function featPrereqFail(f, d) {
  if (f.cat === 'Geral' && d.level < 4) return 'requer nível 4';
  if (f.cat === 'Dádiva Épica' && d.level < 19) return 'requer nível 19';
  if (f.cat === 'Estilo de Luta' && !d.styleSlots) return 'requer a característica Estilo de Luta';
  const r = FEAT_REQ[f.id];
  if (r) {
    if (r.ab && !r.ab.some(a => d.scores[a] >= 13)) return `requer ${r.ab.map(a => AB[a].short).join(' ou ')} 13`;
    if (r.train && !d.armorTrain.has(r.train)) return `requer treinamento em ${r.train === 'shield' ? 'escudos' : 'armadura ' + ARMOR_TYPE_NAME[r.train].toLowerCase()}`;
    if (r.caster && !d.casterType) return 'requer Conjuração ou Magia de Pacto';
  }
  return '';
}
// Pode adicionar agora? Considera repetição, pré-requisito e vagas. '' = pode.
function featBlocked(f, s, d) {
  if (!FEAT_REPEATABLE.has(f.id) && d.feats.includes(f.id)) return 'já possui';
  const pre = featPrereqFail(f, d); if (pre) return pre;
  if (f.cat === 'Estilo de Luta') { if (d.featUse.style >= d.styleSlots) return 'sem vaga de Estilo de Luta'; }
  else if (d.featUse.general >= d.featSlots) return d.nextFeatLevel ? `sem vaga — próxima no nível ${d.nextFeatLevel}` : 'sem vaga de talento';
  return '';
}
function featReqText(f) {
  const parts = [FEAT_PREREQ[f.cat]].filter(Boolean);
  const r = FEAT_REQ[f.id];
  if (r && r.ab) parts.push(r.ab.map(a => AB[a].short).join(' ou ') + ' 13+');
  if (r && r.train) parts.push('treinamento em ' + (r.train === 'shield' ? 'escudos' : 'armadura ' + ARMOR_TYPE_NAME[r.train].toLowerCase()));
  if (r && r.caster) parts.push('Conjuração ou Magia de Pacto');
  return parts.join(' · ');
}

// ---------------------------------------------------------------- Características
function renderFeatures(s, d) {
  const groups = {};
  for (const f of d.features) {
    if (f.lvl > f.srcLevel && !ui.showFuture) continue;
    (groups[f.src] = groups[f.src] || []).push(f);
  }
  const featList = [];
  if (d.bg.id) featList.push({ f: FEAT[d.bg.feat], src: 'Antecedente: ' + d.bg.name });
  if (s.species === 'human' && s.speciesChoices.versatile) featList.push({ f: FEAT[s.speciesChoices.versatile], src: 'Humano: Versátil' });
  s.feats.forEach((x, i) => featList.push({ f: x.featId ? FEAT[x.featId] : { name: x.name, desc: x.desc }, src: x.note || '', i, custom: !x.featId, raw: x }));
  const cats = [...new Set(FEATS.map(f => f.cat))];

  return `<div class="grid features">
    <div class="card wide">
      <div class="card-head"><h3>Características</h3><label class="chk-inline small"><input type="checkbox" data-action="toggleFuture" ${ui.showFuture ? 'checked' : ''}> Mostrar níveis futuros</label></div>
      ${Object.entries(groups).map(([src, arr]) => `<div class="feat-group"><h4>${esc(src)}</h4>${arr.map(f => `<div class="feature${f.lvl > f.srcLevel ? ' future' : ''}"><div><b>${esc(f.name)}</b> <span class="badge">Nv ${f.lvl}</span></div>${f.desc ? `<p>${esc(f.desc)}</p>` : ''}</div>`).join('')}</div>`).join('') || '<p class="muted">Escolha espécie e classe na aba Construção.</p>'}
    </div>
    <div class="card">
      <h3>Talentos</h3>
      <div class="skill-counters">
        ${counter('Vagas de talento', d.featUse.general, d.featSlots, d.nextFeatLevel ? `Próxima vaga no nível ${d.nextFeatLevel}` : 'Todas as vagas liberadas')}
        ${d.styleSlots || d.featUse.style ? counter('Estilo de Luta', d.featUse.style, d.styleSlots, 'Vagas de Estilo de Luta da classe') : ''}
      </div>
      <p class="small muted">Vagas de talento vêm nos níveis 4, 8, 12, 16 e 19${d.classes.some(c => c.classId === 'fighter') ? ' (Guerreiro também 6 e 14)' : ''}${d.classes.some(c => c.classId === 'rogue') ? ' (Ladino também 10)' : ''}${d.multi ? ', contados pelo <b>nível em cada classe</b> (' + esc(classLine(s)) + ')' : ''}. ${d.featSlots ? '' : '<b>Ainda não há vaga.</b> '}${d.nextFeatLevel ? `Próxima vaga: nível de personagem ${d.nextFeatLevel}.` : ''} ${s.species === 'human' ? 'O talento do antecedente e o do Humano (Versátil) não ocupam vaga.' : 'O talento do antecedente não ocupa vaga.'}</p>
      ${featList.map(x => {
        const issue = x.raw && x.raw.featId && FEAT[x.raw.featId] ? featPrereqFail(FEAT[x.raw.featId], d) : '';
        return `<div class="feature"><div><b>${esc(x.f.name)}</b> ${x.src ? `<span class="badge">${esc(x.src)}</span>` : ''}${x.i != null ? ` <button class="icon-btn" data-action="delFeat" data-i="${x.i}" title="Remover">🗑</button>` : ''}</div>
        ${issue ? `<div class="small bad-text">⚠ Pré-requisito não atendido: ${esc(issue)}</div>` : ''}
        ${x.raw && FEAT_AB[x.raw.featId] ? `<div class="ab-row small">Aumento de atributo: ${abChooserHtml(x.i, x.raw.featId, x.raw.ab, d)}
          ${d.featAbPending.includes(x.i) ? '<span class="bad-text">⚠ escolha o atributo</span>' : ''}${x.raw.featId === 'resilient' && !d.featAbPending.includes(x.i) ? '<span class="ok">✓ salvaguarda aplicada</span>' : ''}</div>` : ''}
        ${x.custom ? `<textarea data-bind="feats.${x.i}.desc" rows="2" placeholder="Descrição">${esc(x.raw.desc || '')}</textarea>` : `<p>${esc(x.f.desc)}</p>`}</div>`;
      }).join('') || '<p class="muted small">Nenhum talento.</p>'}
      <div class="field"><span>Adicionar talento</span>
        ${pickBtn('feat', '', '', '＋ Adicionar talento', 'add')}
        <div class="row gap wrap"><input id="featCustom" placeholder="Talento personalizado"><button class="btn sm" data-action="addCustomFeat">Adicionar personalizado</button></div>
        <p class="small muted">Talentos que aumentam atributo pedem a escolha do atributo e somam sozinhos (coluna Talentos, na Construção).</p>
      </div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- Biografia
function renderBio(s) {
  const f = (k, l, ph = '') => `<label class="field">${l}<input data-bind="bio.${k}" value="${esc(s.bio[k])}" placeholder="${ph}"></label>`;
  const t = (k, l, rows = 3) => `<label class="field">${l}<textarea data-bind="bio.${k}" rows="${rows}">${esc(s.bio[k])}</textarea></label>`;
  return `<div class="grid bio">
    <div class="card"><h3>Aparência</h3><div class="bio-grid">${f('age', 'Idade')}${f('height', 'Altura')}${f('weight', 'Peso')}${f('eyes', 'Olhos')}${f('hair', 'Cabelo')}${f('skin', 'Pele')}${f('gender', 'Gênero / pronomes')}${f('faith', 'Fé / divindade')}</div>${t('appearance', 'Descrição física', 4)}</div>
    <div class="card"><h3>Personalidade</h3>${t('personality', 'Traços de personalidade')}${t('ideals', 'Ideais', 2)}${t('bonds', 'Vínculos', 2)}${t('flaws', 'Defeitos', 2)}</div>
    <div class="card wide"><h3>História</h3>${t('backstory', 'História do personagem', 8)}${t('allies', 'Aliados e organizações', 3)}${t('notes', 'Anotações', 5)}</div>
  </div>`;
}

// ---------------------------------------------------------------- Ações
function addEquip(s, list, gp) {
  for (const [name, qty = 1, link] of list) {
    let weight = GEAR_W[name] ?? 0, equipped = false;
    if (link && link.startsWith('w:')) {
      const w = WEAPON[link.slice(2)]; weight = w.weight; equipped = true;
      if (!s.attacks.some(a => a.weaponId === w.id)) s.attacks.push({ id: uid(), weaponId: w.id });
    } else if (link && link.startsWith('a:')) {
      const a = ARMOR[link.slice(2)]; weight = a.weight; equipped = true; s.armor = a.id;
    } else if (link === 's') { weight = 6; equipped = true; s.shield = true; }
    s.inventory.push({ id: uid(), name, qty, weight, equipped, notes: '' });
  }
  s.coins.po = (+s.coins.po || 0) + gp;
}

function spendCoins(s, amount, type) {
  const val = COINS.find(c => c.id === type).gp;
  const costCp = Math.round(amount * val * 100);
  const totalCp = Math.round(COINS.reduce((t, c) => t + (+s.coins[c.id] || 0) * c.gp * 100, 0));
  if (costCp > totalCp) return false;
  if ((+s.coins[type] || 0) >= amount) { s.coins[type] -= amount; return true; }
  // Recalcula usando troco: paga com o que tiver e devolve em moedas menores
  let remaining = totalCp - costCp;
  for (const c of [...COINS].reverse()) {
    if (c.id === 'pe') { s.coins.pe = 0; continue; }
    const cp = Math.round(c.gp * 100);
    s.coins[c.id] = Math.floor(remaining / cp); remaining -= s.coins[c.id] * cp;
  }
  return true;
}

function rollStatArray() {
  return Array.from({ length: 6 }, () => {
    const r = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)].sort((a, b) => b - a);
    return r[0] + r[1] + r[2];
  });
}

function readPhoto(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => toast('Não foi possível ler essa imagem.', 'bad');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function openSheet(id) {
  if (!db.open.includes(id)) db.open.push(id);
  db.active = id; ui.library = false;
}

function healOrDamage(s, d, kind, amt) {
  let cur = s.hp.current == null ? d.hpMax : +s.hp.current;
  if (kind === 'damage') {
    let left = amt;
    const t = Math.min(+s.hp.temp || 0, left); s.hp.temp -= t; left -= t;
    if (cur <= 0 && left > 0) { s.deathSaves.f = Math.min(3, s.deathSaves.f + 1); toast('Dano a 0 PV: uma falha no teste contra a morte.', 'bad'); }
    else if (cur > 0 && left - cur >= d.hpMax) toast('Dano massivo: o dano restante iguala seus PV máximos — morte instantânea!', 'bad');
    cur = Math.max(0, cur - left);
  } else if (kind === 'heal') {
    if (cur <= 0 && amt > 0) s.deathSaves = { s: 0, f: 0 };
    cur = Math.min(d.hpMax, cur + amt);
  } else if (kind === 'temp') s.hp.temp = Math.max(+s.hp.temp || 0, amt);
  s.hp.current = cur;
}

// Pip cheio clicado: gasta 1. Pip vazio clicado: recupera 1.
const step = (avail, i, max) => Math.max(0, Math.min(max, i < avail ? avail - 1 : avail + 1));

const actions = {
  newSheet() { const s = newSheet(); db.sheets[s.id] = s; openSheet(s.id); ui.sub[s.id] = 'build'; save(); },
  openSheet(el) { openSheet(el.dataset.id); save(); },
  switchTab(el) { db.active = el.dataset.id; ui.photoView = false; save(); },
  closeTab(el, ev) {
    ev.stopPropagation();
    const id = el.dataset.id; const idx = db.open.indexOf(id);
    db.open.splice(idx, 1);
    if (db.active === id) db.active = db.open[Math.max(0, idx - 1)] || null;
    save();
  },
  toggleLibrary() { ui.library = !ui.library; },
  pendToggle(el, ev, s) { ui.pendOpen = ui.pendOpen === s.id ? null : s.id; },
  openPicker(el, ev, s) { ui.picker = { type: el.dataset.type, arg: el.dataset.arg || '', sheet: s.id, q: '', justOpened: true }; },
  pickerClose() { ui.picker = null; },
  pickerSelect(el, ev, s, d) {
    const p = ui.picker; if (!p) return false;
    PICKERS[p.type](s, d, p.arg).pick(s, el.dataset.value, d);
    ui.picker = null; touch(s);
  },
  togglePreview() { ui.preview = !ui.preview; window.scrollTo(0, 0); },
  printSheet() { window.print(); return false; },
  libToggle(el) {
    const id = el.dataset.id;
    ui.libSel.has(id) ? ui.libSel.delete(id) : ui.libSel.add(id);
    refreshLibrary(); return false;
  },
  libSelectAll() { libVisible().forEach(s => ui.libSel.add(s.id)); refreshLibrary(); return false; },
  libClear() { ui.libSel.clear(); refreshLibrary(); return false; },
  exportSelected() { libPrune(); exportBulk([...ui.libSel].map(id => db.sheets[id])); return false; },
  exportAll() { exportBulk(Object.values(db.sheets).sort((a, b) => b.updatedAt - a.updatedAt)); return false; },
  deleteSelected() {
    libPrune();
    const ids = [...ui.libSel]; if (!ids.length) return false;
    if (!confirm(`Excluir ${ids.length} ficha(s) permanentemente? Isso não pode ser desfeito.`)) return false;
    for (const id of ids) delete db.sheets[id];
    db.open = db.open.filter(x => db.sheets[x]);
    if (!db.sheets[db.active]) db.active = db.open[0] || null;
    ui.libSel.clear(); save();
    toast(`${ids.length} ficha(s) excluída(s).`, 'good');
  },
  deleteSheet(el) {
    const s = db.sheets[el.dataset.id];
    if (!confirm(`Excluir a ficha "${s.name || 'Sem nome'}" permanentemente?`)) return false;
    ui.libSel.delete(s.id);
    delete db.sheets[s.id]; db.open = db.open.filter(x => x !== s.id);
    if (db.active === s.id) db.active = db.open[0] || null;
    save();
  },
  duplicateSheet(el) {
    const copy = JSON.parse(JSON.stringify(db.sheets[el.dataset.id]));
    copy.id = uid(); copy.name = (copy.name || 'Sem nome') + ' (cópia)'; copy.createdAt = copy.updatedAt = Date.now();
    db.sheets[copy.id] = copy; save();
  },
  exportSheet(el) { const s = db.sheets[el.dataset.id]; download(`${(s.name || 'ficha').replace(/[^\w\-À-ÿ ]+/g, '')}.json`, s); return false; },
  importSheet() { $('#importFile').click(); return false; },
  subtab(el, ev) { ev.preventDefault(); ui.sub[db.active] = el.dataset.tab; save(); window.scrollTo({ top: $('.subtabs') ? $('.subtabs').offsetTop - 70 : 0 }); },
  photoPick(el, ev, s) {
    if (s && s.photo) { ui.photoView = true; return; }   // tem foto: expande
    $('#photoFile').click(); return false;               // sem foto: escolhe uma
  },
  photoChange() { $('#photoFile').click(); return false; },
  photoRemove(el, ev, s) { s.photo = ''; ui.photoView = false; touch(s); toast('Foto removida.'); },
  closePhoto() { ui.photoView = false; },
  rollMode(el) { ui.rollMode = el.dataset.mode; save(); },
  levelUp(el, ev, s, d) {
    if (d.level >= 20) { toast('Nível 20 é o máximo.'); return false; }
    ui.lv = { sheet: s.id, choice: '', subclass: '', feat: '', style: '' };
  },
  lvChoice(el) { Object.assign(ui.lv, { choice: el.dataset.choice, subclass: '', feat: '', style: '' }); },
  lvClose() { ui.lv = null; },
  lvConfirm(el, ev, s, d) {
    const lv = ui.lv; if (!lv || !lv.choice) return false;
    const n = lvApply(s, lv, true); const d1 = compute(n);
    if (n.hp.current != null) n.hp.current = Math.min(d1.hpMax, +n.hp.current + (d1.hpMax - d.hpMax));
    n.updatedAt = Date.now();
    Object.keys(s).forEach(k => delete s[k]); Object.assign(s, n);   // mesmo objeto, mesma aba
    const pend = lv.pending || [];
    ui.lv = null; save();
    toast(`Nível ${d1.level}! ${esc(classLine(s))}.${pend.length ? `<br><small>Pendente: ${pend.map(esc).join(' · ')}</small>` : ''}`, 'good', pend.length ? 9000 : 4500);
  },

  delClass(el, ev, s) {
    const i = +el.dataset.i; const m = s.multiclass[i]; if (!m) return false;
    const name = CLASS[m.classId] ? CLASS[m.classId].name : 'classe';
    const nSpells = s.spells.filter(x => x.classId === m.classId && spellSource(x) === 'class').length;
    if (!confirm(`Remover ${name} (nível ${m.level}) da ficha? Esses níveis voltam para ${CLASS[s.classId].name}.${nSpells ? `\n${nSpells} magia(s) dessa classe também serão removidas.` : ''}`)) return false;
    s.spells = s.spells.filter(x => !(x.classId === m.classId && spellSource(x) === 'class'));
    s.level = (+s.level || 1) + Math.max(1, +m.level || 1);   // os níveis voltam para a classe inicial
    s.multiclass.splice(i, 1); s.hitDiceUsedBy = {};
    touch(s);
  },
  mcSkill(el, ev, s, d) {
    const m = s.multiclass[+el.dataset.i]; if (!m) return false;
    const id = el.dataset.id; m.classSkills = m.classSkills || [];
    const pick = d.mcPicks.find(p => p.idx === +el.dataset.i);
    if (m.classSkills.includes(id)) m.classSkills = m.classSkills.filter(k => k !== id);
    else if (pick && m.classSkills.length < pick.count) m.classSkills.push(id);
    touch(s);
  },
  classSkill(el, ev, s) {
    const id = el.dataset.id; const set = new Set(s.classSkills);
    set.has(id) ? set.delete(id) : set.add(id);
    s.classSkills = [...set]; touch(s);
  },
  // Ciclo: sem proficiência → proficiente → especialização → sem proficiência,
  // sempre consumindo uma fonte disponível (perícia de classe, extra ou especialização).
  skillCycle(el, ev, s, d) {
    const id = el.dataset.id; const x = d.skills[id];
    const inClass = s.classSkills.includes(id);
    const mcOwner = (s.multiclass || []).find(m => (m.classSkills || []).includes(id));
    const locked = x.sources.some(src => src !== 'Classe' && src !== 'Multiclasse'); // antecedente, espécie, subclasse
    const unpick = () => {
      s.skillProf[id] = 0;
      if (locked) return;
      if (inClass) s.classSkills = s.classSkills.filter(k => k !== id);
      if (mcOwner) mcOwner.classSkills = mcOwner.classSkills.filter(k => k !== id);
    };
    const mcPick = d.mcPicks.find(p => p.used < p.count && p.list.includes(id));
    if (x.prof === 2) unpick();
    else if (x.prof === 1) {
      if (d.expertiseUsed < d.expertiseMax) s.skillProf[id] = 2;
      else if (locked) { toast(d.expertiseMax ? `Todas as ${d.expertiseMax} especializações já foram usadas.` : 'Sua ficha não tem especializações disponíveis.', 'bad'); return false; }
      else unpick();
    } else if (d.classSkillList.includes(id) && s.classSkills.length < d.classSkillMax) {
      s.classSkills.push(id);
    } else if (mcPick) {
      const m = s.multiclass[mcPick.idx]; m.classSkills = (m.classSkills || []).concat([id]);
    } else if (d.profExtraUsed < d.profExtraMax) {
      s.skillProf[id] = 1;
    } else {
      const why = !d.classSkillList.includes(id) && s.classSkills.length < d.classSkillMax
        ? `${SK[id].name} não está na lista de perícias de ${d.cls.name}.`
        : `Você já escolheu as ${d.classSkillMax} perícias de classe.`;
      toast(`${why} Para mais proficiências, ganhe-as com talentos (Habilidoso, Observador…) ou ajuste "Concedidas pelo mestre".`, 'bad', 6500);
      return false;
    }
    touch(s);
  },
  numStep(el, ev, s) {
    const path = el.dataset.path, v = (+getPath(s, path) || 0) + +el.dataset.delta;
    if (v < +el.dataset.min || v > +el.dataset.max) return false;
    setPath(s, path, v); touch(s);
  },
  saveToggle(el, ev, s, d) {
    const ab = el.dataset.ab;
    if (d.saves[ab].classProf) { toast('Proficiência concedida pela classe.'); return false; }
    s.saveProf[ab] = !s.saveProf[ab]; touch(s);
  },

  rollAbility(el, ev, s, d) { rollD20(`Teste de ${AB[el.dataset.ab].name}`, d.mods[el.dataset.ab]); return false; },
  rollSave(el, ev, s, d) { rollD20(`Salvaguarda de ${AB[el.dataset.ab].name}`, d.saves[el.dataset.ab].bonus); return false; },
  rollSkill(el, ev, s, d) { rollD20(SK[el.dataset.id].name, d.skills[el.dataset.id].bonus); return false; },
  rollInit(el, ev, s, d) { rollD20('Iniciativa', d.init, d.initAdv && ui.rollMode === 'normal' ? { mode: 'adv' } : {}); return false; },
  rollSpellAtk(el, ev, s, d) {
    const c = el.dataset.cls && casterFor(d, el.dataset.cls);
    rollD20(c && d.casters.length > 1 ? `Ataque mágico (${c.name})` : 'Ataque mágico', c ? c.attack : d.spell.attack); return false;
  },
  rollAttack(el, ev, s, d) {
    const atk = s.attacks[+el.dataset.i]; const c = attackCalc(d, s, atk);
    const r = rollD20(`Ataque: ${atk.name || (c.w ? c.w.name : 'Ataque')}`, c.hit);
    let critMin = d.subs.has('champion') ? (d.lvlOf('fighter') >= 15 ? 18 : 19) : 20;
    if (d.subs.has('gunslinger') && d.lvlOf('fighter') >= 18 && FIREARMS.has(atk.weaponId)) critMin = Math.min(critMin, 19);   // Intenção Cruel
    if (r.nat >= critMin && r.nat < 20) toast(`Acerto crítico (${d.subs.has('gunslinger') && FIREARMS.has(atk.weaponId) && !d.subs.has('champion') ? 'Intenção Cruel' : 'Campeão'})!`, 'good');
    return false;
  },
  rollDmg(el, ev, s, d) {
    const atk = s.attacks[+el.dataset.i]; const c = attackCalc(d, s, atk);
    const savage = ev.shiftKey && d.savage && c.w && c.w.kind === 'm' ? '1d' + (/d(\d+)/.exec(c.dmg) || [])[1] : '';
    rollDamage(`Dano: ${atk.name || (c.w ? c.w.name : 'Ataque')}${savage ? ' (+ Ataques Selvagens)' : ''}`, c.dmg + (c.extra ? '+' + c.extra : ''), ev.shiftKey, savage);
    return false;
  },
  rollDeath(el, ev, s, d) {
    const r = rollD20('Teste contra a Morte', 0, { mode: 'normal' });
    if (r.nat === 20) { s.hp.current = 1; s.deathSaves = { s: 0, f: 0 }; toast('20 natural! Você recupera 1 PV.', 'good'); }
    else if (r.nat === 1) s.deathSaves.f = Math.min(3, s.deathSaves.f + 2);
    else if (r.total >= 10) s.deathSaves.s = Math.min(3, s.deathSaves.s + 1);
    else s.deathSaves.f = Math.min(3, s.deathSaves.f + 1);
    if (s.deathSaves.s >= 3) toast('3 sucessos: você está Estável.', 'good');
    if (s.deathSaves.f >= 3) toast('3 falhas: o personagem morreu.', 'bad');
    touch(s);
  },
  deathPip(el, ev, s) {
    const t = el.dataset.t, i = +el.dataset.i;
    s.deathSaves[t] = step(s.deathSaves[t], i, 3); touch(s);
  },

  hpDamage(el, ev, s, d) { const v = +$('#hpAmt').value; if (!v) return false; healOrDamage(s, d, 'damage', v); touch(s); },
  hpHeal(el, ev, s, d) { const v = +$('#hpAmt').value; if (!v) return false; healOrDamage(s, d, 'heal', v); touch(s); },
  hpTemp(el, ev, s, d) { const v = +$('#hpAmt').value; if (!v) return false; healOrDamage(s, d, 'temp', v); touch(s); },
  spendHD(el, ev, s, d) {
    const hs = hdState(s, d);
    const h = hs.find(x => x.die === +el.dataset.die) || hs.find(x => x.used < x.count);
    if (!h || h.used >= h.count) return false;
    const r = rollDie(h.die); const heal = Math.max(0, r + d.mods.con);
    if (hs.length > 1) { s.hitDiceUsedBy = Object.assign({}, s.hitDiceUsedBy); s.hitDiceUsedBy[h.die] = (+s.hitDiceUsedBy[h.die] || 0) + 1; }
    s.hitDiceUsed = (+s.hitDiceUsed || 0) + 1; healOrDamage(s, d, 'heal', heal);
    toast(`<div class="t-label">Dado de Vida</div><div class="t-line">d${h.die}: ${r} ${fmt(d.mods.con)} = <b class="t-total">${heal}</b> PV</div>`, 'roll good');
    touch(s);
  },

  resPip(el, ev, s) {
    const key = el.dataset.key, max = +el.dataset.max, i = +el.dataset.i;
    const avail = max - (+s.resUsed[key] || 0);
    s.resUsed[key] = max - step(avail, i, max); touch(s);
  },
  addCustomRes(el, ev, s) {
    const name = $('#resName').value.trim(); if (!name) return false;
    s.customRes.push({ id: uid(), name, max: Math.max(1, +$('#resMax').value || 1), reset: $('#resReset').value }); touch(s);
  },
  delCustomRes(el, ev, s) { s.customRes = s.customRes.filter(r => r.id !== el.dataset.id); delete s.resUsed['c:' + el.dataset.id]; touch(s); },
  slotPip(el, ev, s) {
    const l = +el.dataset.l, max = +el.dataset.max, i = +el.dataset.i;
    const avail = max - (s.slotsUsed[l] || 0);
    s.slotsUsed[l] = max - step(avail, i, max); touch(s);
  },
  pactPip(el, ev, s) {
    const max = +el.dataset.max, i = +el.dataset.i; const avail = max - s.pactUsed;
    s.pactUsed = max - step(avail, i, max); touch(s);
  },
  condition(el, ev, s) {
    const c = el.dataset.c;
    s.conditions = s.conditions.includes(c) ? s.conditions.filter(x => x !== c) : [...s.conditions, c]; touch(s);
  },
  toggleFuture() { ui.showFuture = !ui.showFuture; save(); },

  shortRest(el, ev, s, d) {
    for (const r of d.resources) {
      if (r.reset === 'short') s.resUsed[r.key] = 0;
      else if (r.shortGain) s.resUsed[r.key] = Math.max(0, (+s.resUsed[r.key] || 0) - r.shortGain);
    }
    s.pactUsed = 0;
    toast('Descanso curto: recursos de descanso curto e espaços de Pacto recuperados. Use "Gastar 1" nos Dados de Vida para curar.', 'good');
    touch(s);
  },
  longRest(el, ev, s, d) {
    s.hp.current = d.hpMax; s.hp.temp = 0; s.hitDiceUsed = 0; s.hitDiceUsedBy = {}; s.resUsed = {};
    s.slotsUsed = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; s.pactUsed = 0; s.deathSaves = { s: 0, f: 0 };
    if (s.exhaustion > 0) s.exhaustion--;
    if (s.species === 'human') s.inspiration = true;
    toast('Descanso longo: PV, Dados de Vida, espaços e recursos recuperados.' + (s.species === 'human' ? ' Inspiração Heroica ganha (Engenhoso).' : ''), 'good');
    touch(s);
  },

  addUnarmed(el, ev, s) { s.attacks.push({ id: uid(), weaponId: 'unarmed', name: 'Ataque Desarmado' }); touch(s); },
  addCustomAttack(el, ev, s) { s.attacks.push({ id: uid(), name: 'Novo ataque', dmg: '1d6', dtype: '' }); touch(s); },
  delAttack(el, ev, s) { s.attacks.splice(+el.dataset.i, 1); touch(s); },

  spellDetail(el) { ui.spellDetail = ui.spellDetail === el.dataset.id ? null : el.dataset.id; },
  pickSpell(el, ev, s, d) {
    const sp = SPELL[el.dataset.id]; if (!sp) return false;
    const c = casterFor(d, el.dataset.cls || s.classId); if (!c) return false;
    const st = pickerState(s, d, c);
    const idx = s.spells.findIndex(x => x.cat === sp.id && spellSource(x) === 'class' && spellClassOf(x, s) === c.classId);
    const on = sp.level === 0 ? st.cantripIds.has(sp.id) : st.spellIds.has(sp.id);
    if (on) { s.spells.splice(idx, 1); touch(s); return; }
    if (sp.level > 0 && st.spellIds.size >= st.spellMax) { toast(`Limite de ${st.spellMax} atingido para ${c.name}. Desmarque outra antes.`, 'bad'); return; }
    if (idx >= 0) s.spells[idx].prepared = true; // já estava na ficha sem preparar
    else {
      const why = classSpellBlock(sp, s, d, c);
      if (why) { toast(why, 'bad'); return; }
      s.spells.push({ id: uid(), cat: sp.id, source: 'class', classId: c.classId, prepared: sp.level === 0 || !st.wizard, name: sp.name, level: sp.level, school: sp.school, time: sp.time, range: sp.range, dur: sp.dur, conc: sp.conc, ritual: sp.ritual, notes: sp.sum });
    }
    touch(s);
  },
  addCatSpell(el, ev, s, d) {
    const sp = SPELL[el.dataset.id]; if (!sp) return false;
    const source = (ui.spellFilter && ui.spellFilter.source) || 'class';
    const why = source === 'class' ? classSpellBlock(sp, s, d) : '';
    if (why) { toast(why, 'bad', 6000); return false; }
    const autoPrep = source === 'class' && sp.level > 0 && d.cls.id !== 'wizard' && spellCounts(s).prepared < d.prepared;
    if (source === 'class' && sp.level > 0 && d.cls.id === 'wizard' && spellCounts(s).book >= 6 + 2 * (d.level - 1)) toast('Atenção: o grimório já tem as magias esperadas para o nível — confirme com o mestre se você copiou esta de um pergaminho ou livro.', '', 6000);
    s.spells.push({ id: uid(), cat: sp.id, source, prepared: source !== 'class' || sp.level === 0 || autoPrep, name: sp.name, level: sp.level, school: sp.school, time: sp.time, range: sp.range, dur: sp.dur, conc: sp.conc, ritual: sp.ritual, notes: sp.sum });
    const added = s.spells[s.spells.length - 1];
    const how = sp.level === 0 ? 'adicionado aos truques' : source !== 'class' ? `adicionada (${SPELL_SOURCES[source].toLowerCase()})` : added.prepared ? 'adicionada e preparada' : d.cls.id === 'wizard' ? 'adicionada ao grimório — prepare-a quando quiser' : 'adicionada, mas não preparada (limite de preparadas atingido)';
    toast(`${sp.name} ${how}.`, 'good', 2500);
    touch(s);
  },
  addSpell(el, ev, s) {
    const name = $('#spellName').value.trim(); if (!name) { $('#spellName').focus(); return false; }
    s.spells.push({ id: uid(), name, level: +$('#spellLevel').value, prepared: false }); touch(s);
  },
  delSpell(el, ev, s) { s.spells.splice(+el.dataset.i, 1); touch(s); },

  addItem(el, ev, s) {
    const name = $('#itemName').value.trim(); if (!name) { $('#itemName').focus(); return false; }
    s.inventory.push({ id: uid(), name, qty: Math.max(1, +$('#itemQty').value || 1), weight: GEAR_W[name] ?? 0, equipped: false, notes: '' }); touch(s);
  },
  delItem(el, ev, s) { s.inventory.splice(+el.dataset.i, 1); touch(s); },
  coinOp(el, ev, s) {
    const amt = Math.floor(+$('#coinAmt').value || 0); const type = $('#coinType').value;
    if (amt <= 0) return false;
    if (+el.dataset.sign > 0) s.coins[type] = (+s.coins[type] || 0) + amt;
    else if (!spendCoins(s, amt, type)) { toast('Dinheiro insuficiente.', 'bad'); return false; }
    touch(s);
  },

  addCustomFeat(el, ev, s) {
    const name = $('#featCustom').value.trim(); if (!name) return false;
    s.feats.push({ id: uid(), name, desc: '' }); touch(s);
  },
  delFeat(el, ev, s) { s.feats.splice(+el.dataset.i, 1); touch(s); },
  addLang(el, ev, s) {
    const v = $('#langNew').value.trim(); if (!v || s.languages.includes(v)) return false;
    s.languages.push(v); touch(s);
  },
  delLang(el, ev, s) { s.languages.splice(+el.dataset.i, 1); touch(s); },

  equipClass(el, ev, s, d) {
    if (el.dataset.o === 'A') addEquip(s, d.cls.equipA, d.cls.gpA); else s.coins.po = (+s.coins.po || 0) + d.cls.gpB;
    s.equipAdded.class = `${d.cls.name}, opção ${el.dataset.o}`;
    toast('Equipamento de classe adicionado ao inventário.' + (el.dataset.o === 'A' ? ' Armas foram para Ataques e armaduras foram vestidas.' : ''), 'good');
    touch(s);
  },
  equipBg(el, ev, s, d) {
    if (el.dataset.o === 'A') addEquip(s, d.bg.equip, d.bg.gp); else s.coins.po = (+s.coins.po || 0) + 50;
    s.equipAdded.bg = `${d.bg.name}, opção ${el.dataset.o}`;
    toast('Equipamento de antecedente adicionado ao inventário.', 'good');
    touch(s);
  },
  abStep(el, ev, s, d) {
    const ab = el.dataset.ab, delta = +el.dataset.delta;
    const cap = d.feats.some(f => f.startsWith('boon-')) ? 30 : 20;
    if (delta > 0 && d.scores[ab] >= cap) return false;
    if (el.dataset.f === 'extra') {
      s.abilityExtra[ab] = Math.max(-10, (+s.abilityExtra[ab] || 0) + delta);
    } else {
      const v = +s.abilities[ab] + delta;
      if (s.abilityMethod === 'pointbuy') {
        if (v < 8 || v > 15) return false;
        const after = Object.assign({}, s.abilities, { [ab]: v });
        if (delta > 0 && pointBuySpent(after) > POINT_BUY_BUDGET) { toast('Pontos insuficientes.', 'bad'); return false; }
      } else if (v < 3 || v > 18) return false;
      s.abilities[ab] = v;
    }
    touch(s);
  },
  rollStats(el, ev, s) {
    const arr = rollStatArray();
    arr.forEach((v, i) => s.abilities[ABILITIES[i].id] = v);
    s.abilityMethod = 'manual';
    toast(`<div class="t-label">4d6 (descarta o menor)</div><div class="t-line">${arr.join(', ')} — total ${arr.reduce((a, b) => a + b, 0)}</div>`, 'roll');
    touch(s);
  },
};

// Regras ao mudar um campo
const onChange = {
  classId(s) {
    s.subclass = ''; s.classSkills = []; s.classChoices = {}; s.spellAbility = '';
    if (!s.classId && (s.multiclass || []).length) { s.multiclass = []; toast('Sem classe inicial, as classes de multiclasse foram removidas.'); }
    if ((s.multiclass || []).some(m => m.classId === s.classId)) { s.multiclass = s.multiclass.filter(m => m.classId !== s.classId); toast('Essa classe estava na multiclasse e virou a classe inicial.'); }
    const c = CLASS[s.classId];
    if (c) toast(`Classe: ${c.name}. Escolha ${c.skillCount} perícias e o equipamento inicial.`);
  },
  species(s) { s.speciesChoices = {}; s.size = ''; },
  abilityMethod(s) {
    if (s.abilityMethod === 'pointbuy') ABILITIES.forEach(a => s.abilities[a.id] = 8);
    if (s.abilityMethod === 'standard') STANDARD_ARRAY.forEach((v, i) => s.abilities[ABILITIES[i].id] = v);
  },
  background(s) {
    const bg = BACKGROUND[s.background];
    if (bg) { s.bg2 = bg.abilities[0]; s.bg1 = bg.abilities[1]; s.classSkills = s.classSkills.filter(k => !bg.skills.includes(k)); }
  },
  level(s) {
    const d = compute(s);
    if (s.hp.current != null && s.hp.current > d.hpMax) s.hp.current = d.hpMax;
    if (s.hitDiceUsed > d.level) s.hitDiceUsed = d.level;
  },
};

// ---------------------------------------------------------------- Eventos
function bindValue(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'radio') return el.value;
  if ('num' in el.dataset) return el.value === '' ? 0 : +el.value;
  return el.value;
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  const s = active();
  const res = fn(el, ev, s, s ? compute(s) : null);
  if (res !== false) scheduleRender();
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.id === 'libSearch') { ui.libQ = el.value; refreshLibrary(); return; }
  const s = active();
  if (!s) return;
  if (el.id === 'spellSearch') { ui.spellFilter.q = el.value; refreshCatalog(); return; }
  if (el.id === 'pickerSearch') { if (ui.picker) ui.picker.q = el.value; filterPicker(el.value); return; }
  if (el.classList.contains('picker-filter')) {
    ui.pickerQ = el.value;
    const q = el.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    document.querySelectorAll('.picker-filter').forEach(x => { if (x !== el) x.value = el.value; });
    document.querySelectorAll('.picker .spell-chip').forEach(c => { c.hidden = !!q && !c.dataset.search.includes(q); });
    return;
  }
  if (el.dataset.bind && el.type !== 'checkbox' && el.type !== 'radio' && el.tagName !== 'SELECT') {
    setPath(s, el.dataset.bind, bindValue(el));
    s.updatedAt = Date.now(); save();
    if (el.dataset.bind === 'name') renderHeader();
  }
  if (el.dataset.actionInput === 'resPool') {
    const max = +el.dataset.max; const v = Math.max(0, Math.min(max, +el.value || 0));
    s.resUsed[el.dataset.key] = max - v; save();
  }
});

document.addEventListener('change', (ev) => {
  const el = ev.target;
  const s = active();
  if (!s) return;
  const abBox = el.closest && el.closest('[data-abbox]');
  if (abBox) {
    const ab = readAbChooser(abBox);
    if (abBox.dataset.abbox === 'lv') { if (ui.lv) ui.lv.ab = ab; }
    else { const f = s.feats[+abBox.dataset.abbox]; if (f) { f.ab = ab; touch(s); } }
    scheduleRender(); return;
  }
  if (el.dataset.lv && ui.lv) {             // escolhas dentro do modal de subir de nível
    if (el.dataset.lv === 'choice') { if (!el.value) return; Object.assign(ui.lv, { choice: el.value, subclass: '', feat: '', style: '' }); }
    else { ui.lv[el.dataset.lv] = el.value; if (el.dataset.lv === 'feat') ui.lv.ab = {}; }
    scheduleRender(); return;
  }
  if (el.dataset.total != null) {           // nível de personagem: a classe inicial absorve a diferença
    s.level = Math.max(1, +el.value - mcLevels(s)); onChange.level(s); touch(s); scheduleRender(); return;
  }
  if (el.dataset.bind && el.dataset.bind.startsWith('mastery.') && el.checked) {
    const d = compute(s);
    if (d.masteryUsed >= d.masteryMax) { el.checked = false; toast(`Limite de ${d.masteryMax} maestrias no nível ${d.level}.`, 'bad'); return; }
  }
  if (el.dataset.prep != null) {
    const sp = s.spells[+el.dataset.prep]; const d = compute(s);
    if (el.checked) {
      const own = casterFor(d, spellClassOf(sp, s));
      let why = '';
      if (!own) why = 'A classe desta magia não está na ficha. Mude a origem em "editar".';
      else if (+sp.level > own.maxLevel) why = `${own.name} nível ${own.level} só prepara magias até o ${own.maxLevel}º nível.`;
      else if (spellCounts(s, own.classId).prepared >= own.prepared) why = `${own.name} já tem ${own.prepared} magias preparadas (limite do nível ${own.level}). Desmarque outra antes.`;
      if (why) { el.checked = false; toast(why, 'bad', 6000); return; }
    }
    sp.prepared = el.checked; touch(s); scheduleRender(); return;
  }
  if (el.dataset.src != null) {
    const sp = s.spells[+el.dataset.src]; const d = compute(s);
    if (el.value === 'class' && spellSource(sp) !== 'class') {
      const cat = sp.cat && SPELL[sp.cat];
      const others = Object.assign({}, s, { spells: s.spells.filter(x => x !== sp) });
      // escolhe a classe: a já indicada na magia, senão a primeira conjuradora cuja lista tenha a magia
      const c = casterFor(d, sp.classId) || (cat && d.casters.find(x => cat.classes.some(l => allowedListsFor(x).includes(l)))) || d.casters[0];
      const why = !c ? classSpellBlock(cat || sp, others, d, null) : cat ? classSpellBlock(cat, others, d, c)
        : (+sp.level === 0 && spellCounts(others, c.classId).cantrips >= c.cantrips ? `${c.name} já tem os ${c.cantrips} truques permitidos.` : '');
      if (!why && c) sp.classId = c.classId;
      if (why) { el.value = spellSource(sp); toast(why, 'bad', 6000); return; }
      sp.prepared = false;
    }
    sp.source = el.value;
    if (el.value !== 'class') sp.prepared = true;
    touch(s); scheduleRender(); return;
  }
  if (el.classList.contains('cat-f')) {
    const f = ui.spellFilter;
    if (el.id === 'catList') f.list = el.value;
    if (el.id === 'catLvl') f.lvl = el.value;
    if (el.id === 'catSchool') f.school = el.value;
    if (el.id === 'catCastable') f.castable = el.checked;
    if (el.id === 'catSource') f.source = el.value;
    refreshCatalog(); return;
  }
  if (el.dataset.std) {
    const ab = el.dataset.std, v = +el.value, old = +s.abilities[ab];
    const other = ABILITIES.find(a => a.id !== ab && +s.abilities[a.id] === v);
    if (other) s.abilities[other.id] = old;
    s.abilities[ab] = v; touch(s); scheduleRender(); return;
  }
  if (el.dataset.bind) {
    let v = bindValue(el);
    if (el.dataset.bind === 'hp.current') v = Math.max(0, v);
    setPath(s, el.dataset.bind, v);
    if (onChange[el.dataset.bind]) onChange[el.dataset.bind](s);
    touch(s);
    const structural = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio' || 'num' in el.dataset || 'rerender' in el.dataset;
    if (structural) scheduleRender();
  } else if (el.dataset.actionInput) scheduleRender();
});

document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  const map = { hpAmt: 'hpDamage', spellName: 'addSpell', itemName: 'addItem', langNew: 'addLang', featCustom: 'addCustomFeat', resName: 'addCustomRes', coinAmt: null };
  const id = ev.target.id;
  if (id in map && map[id]) { ev.preventDefault(); ev.target.blur(); const b = $(`[data-action="${map[id]}"]`); if (b) b.click(); }
});
document.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.dataset && ev.target.dataset.action === 'photoPick') { ev.preventDefault(); ev.target.click(); return; }
  if (ev.key !== 'Escape') return;
  if (ui.picker) { ui.picker = null; render(); return; }
  if (ui.photoView) { ui.photoView = false; render(); return; }
  if (ui.lv) { ui.lv = null; render(); return; }
  if (ui.library) { ui.library = false; render(); }
  else if (ui.preview && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { ui.preview = false; render(); }
});

function init() {
  load();
  $('#photoFile').addEventListener('change', (ev) => {
    const f = ev.target.files[0]; const s = active();
    if (f && s) readPhoto(f, (url) => { s.photo = url; touch(s); render(); });
    ev.target.value = '';
  });
  $('#importFile').addEventListener('change', (ev) => {
    const files = [...ev.target.files]; ev.target.value = '';
    if (files.length) importFiles(files);
  });
  window.addEventListener('beforeunload', () => save(true));
  render();
}
init();
