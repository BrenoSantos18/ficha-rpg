// Cálculos derivados da ficha
'use strict';

const NULL_CLASS = { id: '', name: '—', hd: 8, saves: [], armor: [], weapons: [], skillCount: 0, skillList: [], features: [], subclasses: [], resources: () => [] };
const NULL_SPECIES = { id: '', name: '—', size: '—', speed: 30, darkvision: 0, traits: [] };
const NULL_BG = { id: '', name: '—', abilities: [], skills: [], equip: [], gp: 0 };

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const modOf = (score) => Math.floor((score - 10) / 2);
const fmt = (n) => (n >= 0 ? '+' : '') + n;
const ftToM = (ft) => (ft * 0.3).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function newSheet() {
  return {
    id: uid(), createdAt: Date.now(), updatedAt: Date.now(),
    name: '', player: '', photo: '', level: 1, xp: 0, alignment: '',
    species: '', speciesChoices: {}, size: '',
    background: '', bgMode: '21', bg2: '', bg1: '',
    classId: '', subclass: '', classChoices: {}, classSkills: [], multiclass: [],
    abilityMethod: 'pointbuy',
    abilities: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
    abilityExtra: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    saveProf: {}, saveBonus: 0, skillProf: {}, extraSkills: 0, extraExpertise: 0,
    hp: { current: null, temp: 0, maxOverride: null, bonus: 0 }, hitDiceUsed: 0,
    deathSaves: { s: 0, f: 0 }, exhaustion: 0, inspiration: false, conditions: [],
    armor: 'none', shield: false, acBonus: 0, speedBonus: 0, initBonus: 0,
    attacks: [], mastery: {},
    spellAbility: '', spells: [], slotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], pactUsed: 0,
    resUsed: {}, customRes: [],
    inventory: [], coins: { pc: 0, pp: 0, pe: 0, po: 0, pl: 0 },
    feats: [], languages: ['Comum'], toolProfs: '', otherProfs: '',
    bio: { age: '', height: '', weight: '', eyes: '', hair: '', skin: '', gender: '', faith: '', appearance: '', personality: '', ideals: '', bonds: '', flaws: '', backstory: '', allies: '', notes: '' },
    equipAdded: {},
  };
}

// Garante que fichas antigas tenham todos os campos
function migrate(s) {
  const base = newSheet();
  if (s.abilityMethod === undefined && s.abilities) {
    const v = Object.values(s.abilities).map(Number);
    s.abilityMethod = v.every(x => x >= 8 && x <= 15) && pointBuySpent(s.abilities) <= POINT_BUY_BUDGET ? 'pointbuy' : 'manual';
  }
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  for (const k of ['abilities', 'abilityExtra', 'hp', 'deathSaves', 'coins', 'bio']) s[k] = Object.assign({}, base[k], s[k]);
  while (s.slotsUsed.length < 10) s.slotsUsed.push(0);
  // Resumos de magia antigos (que repetiam dano/área) viram o resumo novo, se o jogador não os editou
  if (typeof SPELL !== 'undefined') for (const sp of s.spells || []) {
    const c = sp.cat && SPELL[sp.cat];
    if (c && c.old && sp.notes === c.old) sp.notes = c.sum;
  }
  return s;
}

function pointBuySpent(abs) {
  return ABILITIES.reduce((t, a) => t + (POINT_BUY_COST[+abs[a.id]] ?? 0), 0);
}

function pbFor(level) { return Math.ceil(level / 4) + 1; }

function featIds(s) {
  const ids = [];
  const bg = BACKGROUND[s.background];
  if (bg) ids.push(bg.feat);
  if (s.species === 'human' && s.speciesChoices.versatile) ids.push(s.speciesChoices.versatile);
  for (const f of s.feats) if (f.featId) ids.push(f.featId);
  return ids;
}

// ---------------------------------------------------------------- Classes (inicial + multiclasse)
// A classe inicial fica em classId/level/subclass/classChoices/classSkills (contrato original);
// as demais em s.multiclass = [{ classId, level, subclass, classChoices, classSkills }].
function classEntries(s) {
  const list = [];
  if (CLASS[s.classId]) list.push({ primary: true, idx: -1, classId: s.classId, level: Math.min(20, Math.max(1, +s.level || 1)),
    subclass: s.subclass || '', classChoices: s.classChoices || {}, classSkills: s.classSkills || [] });
  (s.multiclass || []).forEach((m, i) => {
    if (!m || !CLASS[m.classId] || list.some(x => x.classId === m.classId)) return;
    list.push({ primary: false, idx: i, classId: m.classId, level: Math.min(19, Math.max(1, +m.level || 1)),
      subclass: m.subclass || '', classChoices: m.classChoices || {}, classSkills: m.classSkills || [] });
  });
  return list.map(e => {
    const cls = CLASS[e.classId];
    return Object.assign(e, { cls, sub: cls.subclasses.find(x => x.id === e.subclass && e.level >= 3) || null });
  });
}
// Escolha de atributo de um talento é válida? asi: +2 em um ou +1 em dois diferentes; demais: +1 num atributo permitido
function featAbValid(f) {
  const R = FEAT_AB[f.featId]; const ab = f.ab || {};
  const ks = Object.keys(ab).filter(k => +ab[k] > 0);
  if (!R) return true;
  if (R.asi) return (ks.length === 1 && +ab[ks[0]] === 2) || (ks.length === 2 && ks.every(k => +ab[k] === 1));
  return ks.length === 1 && +ab[ks[0]] === 1 && R.from.includes(ks[0]);
}

// Pré-requisito de multiclasse: atributo(s) principal(is) 13+. '' = atende.
function multiclassReqFail(classId, scores) {
  const r = (MULTICLASS[classId] || {}).req; if (!r) return '';
  const ok = r.all ? r.all.every(a => scores[a] >= 13) : r.any.some(a => scores[a] >= 13);
  return ok ? '' : `${CLASS[classId].name} exige ${(r.all || r.any).map(a => AB[a].short).join(r.all ? ' e ' : ' ou ')} 13`;
}

// Vagas de talento (2024): níveis de Aumento de Atributo de cada classe (+ Guerreiro 6/14, Ladino 10;
// 19 = Dádiva Épica) e vagas de Estilo de Luta. O talento do antecedente e o do Humano não ocupam vaga.
function featSlotsOf(s, classes, level) {
  let featSlots = 0, next = null, styleSlots = 0;
  for (const c of classes) {
    const asi = [4, 8, 12, 16, 19].concat(c.classId === 'fighter' ? [6, 14] : [], c.classId === 'rogue' ? [10] : []).sort((a, b) => a - b);
    featSlots += asi.filter(l => l <= c.level).length;
    const n = asi.find(l => l > c.level);
    if (n && (next === null || level + (n - c.level) < next)) next = level + (n - c.level); // nível de personagem da próxima vaga
    if (c.classId === 'fighter') styleSlots += 1 + (c.sub && c.sub.id === 'champion' && c.level >= 7 ? 1 : 0);
    if ((c.classId === 'paladin' || c.classId === 'ranger') && c.level >= 2) styleSlots += 1;
  }
  const featUse = { general: 0, style: 0 };
  for (const f of s.feats || []) {
    const F = f.featId && FEAT[f.featId];
    if (!F) continue; // talentos personalizados ficam por conta do jogador
    if (F.cat === 'Estilo de Luta') featUse.style++; else featUse.general++;
  }
  // nextFeatLevel: próximo nível de personagem com vaga, supondo que o nível vá para a mesma classe
  return { featSlots, nextFeatLevel: next, styleSlots, featUse };
}

// Nível máximo de magia pela tabela da própria classe (multiclasse prepara cada classe como se fosse única)
function ownMaxSpellLevel(type, lvl) {
  if (type === 'pact') return Math.min(5, Math.ceil(lvl / 2));
  const row = type === 'full' ? FULL_SLOTS[lvl] : type === 'half' ? FULL_SLOTS[Math.ceil(lvl / 2)] : FULL_SLOTS[Math.ceil(lvl / 3)];
  return (row || []).length;
}

function compute(s) {
  const classes = classEntries(s);
  const primary = classes[0] || null;
  const cls = primary ? primary.cls : NULL_CLASS;
  const sp = SPECIE[s.species] || NULL_SPECIES;
  const bg = BACKGROUND[s.background] || NULL_BG;
  const level = classes.length ? Math.min(20, classes.reduce((t, c) => t + c.level, 0)) : Math.min(20, Math.max(1, +s.level || 1));
  const clsLevel = primary ? primary.level : level;
  const pb = pbFor(level);
  const sub = primary ? primary.sub : null;
  const subId = sub ? sub.id : '';
  const lvlOf = (id) => { const c = classes.find(x => x.classId === id); return c ? c.level : 0; };
  const subs = new Set(classes.filter(c => c.sub).map(c => c.sub.id));
  const choiceOf = (id, key) => { const c = classes.find(x => x.classId === id); return c ? c.classChoices[key] : undefined; };
  const feats = featIds(s);
  const has = (id) => feats.includes(id);
  const spc = s.speciesChoices || {};
  const warnings = [];
  // Sub-raça (espécies de legado): efeitos de regra somam aos da espécie
  const spOpt = ((sp.choices || []).find(c => c.key === 'subrace') || { options: [] }).options.find(o => o.id === spc.subrace) || {};
  const spList = (k) => [...(sp[k] || []), ...(spOpt[k] || [])];

  // --- Atributos
  const bgBonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  if (bg.id) {
    if (s.bgMode === '111') bg.abilities.forEach(a => bgBonus[a] += 1);
    else {
      if (bg.abilities.includes(s.bg2)) bgBonus[s.bg2] += 2;
      if (bg.abilities.includes(s.bg1) && s.bg1 !== s.bg2) bgBonus[s.bg1] += 1;
    }
  }
  // Aumentos de atributo dos talentos (escolha guardada em feats[i].ab), com teto de 20 (30 nas Dádivas Épicas)
  const raw = {};
  for (const a of ABILITIES) raw[a.id] = (+s.abilities[a.id] || 0) + bgBonus[a.id] + (+s.abilityExtra[a.id] || 0);
  const featBonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const featAbPending = [], featSaves = [];
  (s.feats || []).forEach((f, i) => {
    const R = f.featId && FEAT_AB[f.featId]; if (!R) return;
    if (!featAbValid(f)) { featAbPending.push(i); return; }
    for (const [k, n] of Object.entries(f.ab)) {
      if (!n) continue;
      const cur = raw[k] + featBonus[k];
      featBonus[k] += Math.max(0, Math.min(n, R.max - cur));
      if (f.featId === 'resilient') featSaves.push(k);
    }
  });
  const scores = {}, mods = {}, capstone = {};
  for (const a of ABILITIES) {
    let v = raw[a.id] + featBonus[a.id];
    if ((lvlOf('barbarian') >= 20 && (a.id === 'str' || a.id === 'con')) || (lvlOf('monk') >= 20 && (a.id === 'dex' || a.id === 'wis'))) {
      capstone[a.id] = 4; v = Math.min(25, v + 4);
    }
    scores[a.id] = v; mods[a.id] = modOf(v);
  }

  // --- Multiclasse: pré-requisito e limite de nível
  const multi = classes.length > 1;
  const mcIssues = multi ? classes.map(c => multiclassReqFail(c.classId, scores)).filter(Boolean) : [];
  if (mcIssues.length) warnings.push('Pré-requisito de multiclasse não atendido: ' + mcIssues.join('; ') + '.');
  if (classes.reduce((t, c) => t + c.level, 0) > 20) warnings.push('A soma dos níveis das classes passa de 20.');

  // --- Salvaguardas (só da classe inicial)
  const saveProfs = new Set(cls.saves);
  if (lvlOf('rogue') >= 15) { saveProfs.add('wis'); saveProfs.add('cha'); }
  if (lvlOf('monk') >= 14) ABILITIES.forEach(a => saveProfs.add(a.id));
  if (subs.has('gloom-stalker') && lvlOf('ranger') >= 7) saveProfs.add('wis');
  for (const [k, v] of Object.entries(s.saveProf || {})) if (v) saveProfs.add(k);
  featSaves.forEach(k => saveProfs.add(k));   // Resiliente
  const aura = lvlOf('paladin') >= 6 ? Math.max(1, mods.cha) : 0;
  const saves = {};
  for (const a of ABILITIES) saves[a.id] = { prof: saveProfs.has(a.id), classProf: cls.saves.includes(a.id), bonus: mods[a.id] + (saveProfs.has(a.id) ? pb : 0) + aura + (+s.saveBonus || 0) };

  // --- Perícias
  const autoSkill = {};
  const mark = (id, src) => { if (id) (autoSkill[id] = autoSkill[id] || []).push(src); };
  bg.skills.forEach(k => mark(k, 'Antecedente'));
  (s.classSkills || []).forEach(k => mark(k, 'Classe'));
  classes.filter(c => !c.primary).forEach(c => c.classSkills.forEach(k => mark(k, 'Multiclasse')));
  spList('skills').forEach(k => mark(k, 'Espécie'));
  if (sp.id === 'elf') mark(spc.keen, 'Espécie');
  if (sp.id === 'human') mark(spc.skillful, 'Espécie');
  if (subs.has('mercy')) { mark('insight', 'Subclasse'); mark('medicine', 'Subclasse'); }
  const jack = lvlOf('bard') >= 2 ? Math.floor(pb / 2) : 0;
  const skills = {};
  let expertiseUsed = 0;
  for (const sk of SKILLS) {
    const auto = autoSkill[sk.id] ? 1 : 0;
    const manual = +s.skillProf[sk.id] || 0;
    const prof = Math.max(auto, manual);
    if (prof === 2) expertiseUsed++;
    let bonus = mods[sk.ab] + (prof === 2 ? pb * 2 : prof === 1 ? pb : jack);
    if (choiceOf('cleric', 'order') === 'thaumaturge' && (sk.id === 'arcana' || sk.id === 'religion')) bonus += Math.max(1, mods.wis);
    if (choiceOf('druid', 'order') === 'magician' && (sk.id === 'arcana' || sk.id === 'nature')) bonus += Math.max(1, mods.wis);
    skills[sk.id] = { prof, auto: !!auto, sources: autoSkill[sk.id] || [], bonus, jack: !prof && jack > 0 };
  }
  // Gnomo das Rochas (BG3): dobro do bônus de proficiência em História
  if (spOpt.historyX2 && skills.history.prof < 2) Object.assign(skills.history, { prof: 2, auto: true, bonus: mods.int + 2 * pb, sources: [...skills.history.sources, 'Espécie'] });
  // Proficiências extras (além de antecedente, classe e espécie) e especializações
  const featCount = (id) => feats.filter(f => f === id).length;
  const extraSources = [];
  const addSrc = (n, label) => { if (n > 0) extraSources.push([label, n]); };
  addSrc(3 * featCount('skilled'), 'Habilidoso');
  addSrc(featCount('skill-expert'), 'Perito');
  addSrc(featCount('keen-mind'), 'Mente Afiada');
  addSrc(featCount('observant'), 'Observador');
  if (lvlOf('barbarian') >= 3) addSrc(1, 'Conhecimento Primitivo');
  if (subs.has('lore')) addSrc(3, 'Proficiências Bônus');
  if (subs.has('battle-master')) addSrc(1, 'Estudante da Guerra');
  if (subs.has('fey-wanderer')) addSrc(1, 'Glamour Sobrenatural');
  addSrc(+s.extraSkills || 0, 'Mestre/outros');
  const profExtraMax = has('boon-skill') ? SKILLS.length : extraSources.reduce((t, [, n]) => t + n, 0);
  const profExtraUsed = SKILLS.filter(sk => !autoSkill[sk.id] && (+s.skillProf[sk.id] || 0) >= 1).length;
  const expertiseMax = classes.reduce((t, c) => t + (c.cls.expertise ? c.cls.expertise(c.level) : 0), 0) + featCount('skill-expert') + (has('boon-skill') ? 1 : 0) + (+s.extraExpertise || 0);
  const classSkillMax = cls.skillCount;
  const classSkillList = cls.skillList === 'any' ? SKILLS.map(x => x.id) : cls.skillList;
  // Perícias que a multiclasse concede (Bardo 1 qualquer; Patrulheiro e Ladino 1 da lista da classe)
  const mcPicks = classes.filter(c => !c.primary && (MULTICLASS[c.classId] || {}).skills).map(c => ({
    idx: c.idx, classId: c.classId, name: c.cls.name, count: MULTICLASS[c.classId].skills, used: c.classSkills.length,
    list: MULTICLASS[c.classId].skillList === 'any' ? SKILLS.map(x => x.id) : (c.cls.skillList === 'any' ? SKILLS.map(x => x.id) : c.cls.skillList),
  }));

  // --- Treinamentos (classe inicial completa; demais pela tabela de multiclasse)
  const armorTrain = new Set(cls.armor);
  const weaponTrain = new Set(cls.weapons);
  classes.filter(c => !c.primary).forEach(c => {
    const m = MULTICLASS[c.classId] || {};
    (m.armor || []).forEach(a => armorTrain.add(a)); (m.weapons || []).forEach(w => weaponTrain.add(w));
  });
  if (choiceOf('cleric', 'order') === 'protector') { armorTrain.add('heavy'); weaponTrain.add('martial'); }
  if (choiceOf('druid', 'order') === 'warden') { armorTrain.add('medium'); weaponTrain.add('martial'); }
  if (subs.has('valor')) { armorTrain.add('medium'); armorTrain.add('shield'); weaponTrain.add('martial'); }
  if (has('lightly-armored')) { armorTrain.add('light'); armorTrain.add('shield'); }
  if (has('moderately-armored')) { armorTrain.add('medium'); armorTrain.add('shield'); }
  if (has('heavily-armored')) armorTrain.add('heavy');
  if (has('martial-weapon-training')) weaponTrain.add('martial');
  spList('armor').forEach(a => armorTrain.add(a));
  const weaponIds = new Set(spList('weapons'));   // armas específicas da espécie (legado)
  if (subs.has('gunslinger')) weaponTrain.add('firearm');   // homebrew de Matt Mercer

  // --- CA
  const armor = ARMOR[s.armor] || ARMOR.none;
  let ac, acNote;
  if (armor.type === 'none') {
    const opts = [[10 + mods.dex, 'Sem armadura']];
    if (lvlOf('barbarian')) opts.push([10 + mods.dex + mods.con, 'Defesa sem Armadura']);
    if (lvlOf('monk') && !s.shield) opts.push([10 + mods.dex + mods.wis, 'Defesa sem Armadura']);
    if (subs.has('draconic') || subs.has('dance')) opts.push([10 + mods.dex + mods.cha, subs.has('draconic') ? 'Resiliência Dracônica' : 'Passos Deslumbrantes']);
    opts.sort((a, b) => b[0] - a[0]);
    [ac, acNote] = opts[0];
  } else {
    const dexCap = armor.type === 'light' ? 99 : armor.type === 'medium' ? (has('medium-armor-master') ? 3 : 2) : 0;
    ac = armor.base + Math.min(mods.dex, dexCap);
    acNote = armor.name;
    if (has('fs-defense')) ac += 1;
    if (!armorTrain.has(armor.type)) warnings.push(`Sem treinamento em armadura ${ARMOR_TYPE_NAME[armor.type].toLowerCase()}: Desvantagem em testes de FOR/DES e não pode conjurar.`);
  }
  if (s.shield) { ac += 2; if (!armorTrain.has('shield')) warnings.push('Sem treinamento com escudo.'); }
  ac += (+s.acBonus || 0);

  // --- Deslocamento
  let speed = sp.speed;
  if (sp.id === 'elf' && spc.lineage === 'wood') speed = 35;
  if (spOpt.speed) speed = spOpt.speed;
  const heavy = armor.type === 'heavy';
  if (lvlOf('barbarian') >= 5 && !heavy) speed += 10;
  if (lvlOf('monk') >= 2 && armor.type === 'none' && !s.shield) speed += steps([[2, 10], [6, 15], [10, 20], [14, 25], [18, 30]])(lvlOf('monk'));
  if (lvlOf('ranger') >= 6 && !heavy) speed += 10;
  if (has('speedy')) speed += 10;
  if (has('boon-speed')) speed += 30;
  if (armor.str && scores.str < armor.str) { speed -= 10; warnings.push(`FOR ${armor.str} necessária para ${armor.name}: −3 m de deslocamento.`); }
  speed += (+s.speedBonus || 0);
  speed = Math.max(0, speed - 5 * (+s.exhaustion || 0));

  // --- Iniciativa
  let init = mods.dex + (+s.initBonus || 0);
  if (has('alert')) init += pb;
  if (subs.has('gloom-stalker')) init += mods.wis;
  if (subs.has('gunslinger') && lvlOf('fighter') >= 7) init += pb;   // Saque Rápido (homebrew)
  const initAdv = lvlOf('barbarian') >= 7 || subs.has('champion') || subs.has('assassin');

  // --- PV: dado máximo da classe inicial no 1º nível; média do dado de cada classe nos demais
  const hd = cls.hd;
  let hpMax = 0;
  if (primary) {
    hpMax = hd + mods.con;
    for (const c of classes) hpMax += (c.level - (c.primary ? 1 : 0)) * (c.cls.hd / 2 + 1 + mods.con);
  } else hpMax = hd + mods.con + Math.max(0, level - 1) * (hd / 2 + 1 + mods.con);
  hpMax = Math.max(level, hpMax);
  if (sp.hpPerLevel) hpMax += sp.hpPerLevel * level;
  if (spOpt.hpPerLevel) hpMax += spOpt.hpPerLevel * level;
  if (has('tough')) hpMax += 2 * level;
  if (subs.has('draconic')) hpMax += lvlOf('sorcerer');
  if (has('boon-fortitude')) hpMax += 40;
  hpMax += (+s.hp.bonus || 0);
  if (s.hp.maxOverride) hpMax = +s.hp.maxOverride;
  // Dados de Vida por tipo (ex.: 5d10 + 3d6), do maior para o menor
  const hdMap = {};
  if (primary) classes.forEach(c => { hdMap[c.cls.hd] = (hdMap[c.cls.hd] || 0) + c.level; }); else hdMap[hd] = level;
  const hitDice = Object.entries(hdMap).map(([die, count]) => ({ die: +die, count })).sort((a, b) => b.die - a.die);

  // --- Conjuração: cada classe tem atributo, CD, truques, preparadas e lista próprios;
  // espaços pela tabela da classe (uma conjuradora) ou pela tabela de multiclasse (várias). Pacto é separado.
  const casters = [];
  for (const c of classes) {
    let type = c.cls.caster || null, ab = c.cls.castAb || null;
    let can = c.cls.cantrips ? c.cls.cantrips(c.level) : 0, prep = c.cls.prepared ? c.cls.prepared(c.level) : 0;
    if (c.cls.thirdCaster && c.sub && c.sub.id === c.cls.thirdCaster) {
      type = 'third'; ab = c.cls.thirdAb;
      can = c.sub.id === 'arcane-trickster' ? (c.level >= 10 ? 4 : 3) : (c.level >= 10 ? 3 : 2);
      prep = PREP_THIRD[c.level - 1];
    }
    if (!type) continue;
    if ((c.classId === 'cleric' && c.classChoices.order === 'thaumaturge') || (c.classId === 'druid' && c.classChoices.order === 'magician')) can += 1;
    if (c.primary && s.spellAbility) ab = s.spellAbility;
    casters.push({ classId: c.classId, name: c.cls.name, sub: c.sub, level: c.level, primary: c.primary, type, ability: ab,
      dc: 8 + pb + mods[ab], attack: pb + mods[ab], cantrips: can, prepared: prep,
      list: type === 'third' ? 'wizard' : c.classId, maxLevel: ownMaxSpellLevel(type, c.level) });
  }
  const slotCasters = casters.filter(c => c.type !== 'pact');
  let slots = [];
  if (slotCasters.length === 1) {
    const c = slotCasters[0];
    slots = c.type === 'full' ? FULL_SLOTS[c.level] : c.type === 'half' ? FULL_SLOTS[Math.ceil(c.level / 2)] : FULL_SLOTS[Math.ceil(c.level / 3)];
  } else if (slotCasters.length > 1) {
    const casterLevel = slotCasters.reduce((t, c) => t + (c.type === 'full' ? c.level : c.type === 'half' ? Math.ceil(c.level / 2) : Math.floor(c.level / 3)), 0);
    slots = FULL_SLOTS[Math.min(20, casterLevel)] || [];
  }
  const pactC = casters.find(c => c.type === 'pact');
  const pact = pactC ? { count: steps([[1, 1], [2, 2], [11, 3], [17, 4]])(pactC.level), level: Math.min(5, Math.ceil(pactC.level / 2)) } : null;
  const mainC = casters[0] || null;
  const casterType = mainC ? mainC.type : null;
  const castAb = mainC ? mainC.ability : (s.spellAbility || null);
  const cantrips = mainC ? mainC.cantrips : 0;
  const prepared = mainC ? mainC.prepared : 0;
  const spell = castAb ? { ability: castAb, dc: 8 + pb + mods[castAb], attack: pb + mods[castAb] } : null;

  // --- Recursos (os da classe inicial mantêm a chave original; os das outras ganham prefixo da classe)
  const resources = [];
  const pushR = (r, src) => { if (r && r.max > 0) resources.push(Object.assign({ src }, r)); };
  classes.forEach(c => {
    const ctx = { level: c.level, pb, mods, scores, sub: c.sub ? c.sub.id : '', sheet: s };
    c.cls.resources(ctx).forEach(r => r && pushR(c.primary ? r : Object.assign({}, r, { key: c.classId + ':' + r.key }), c.cls.name));
  });
  const spRes = {
    aasimar: [{ key: 'sp-heal', name: 'Mãos Curativas', max: 1, reset: 'long' }, level >= 3 && { key: 'sp-reveal', name: 'Revelação Celestial', max: 1, reset: 'long' }],
    dragonborn: [{ key: 'sp-breath', name: `Arma de Sopro (${steps([[1, 1], [5, 2], [11, 3], [17, 4]])(level)}d10, CD ${8 + mods.con + pb})`, max: pb, reset: 'long' }, level >= 5 && { key: 'sp-flight', name: 'Voo Dracônico', max: 1, reset: 'long' }],
    dwarf: [{ key: 'sp-stone', name: 'Conhecimento de Pedras', max: pb, reset: 'long' }],
    goliath: [{ key: 'sp-giant', name: 'Ancestralidade Gigante', max: pb, reset: 'long' }, level >= 5 && { key: 'sp-large', name: 'Forma Grande', max: 1, reset: 'long' }],
    orc: [{ key: 'sp-adrenaline', name: 'Surto de Adrenalina', max: pb, reset: 'short' }, { key: 'sp-relentless', name: 'Resistência Implacável', max: 1, reset: 'long' }],
  }[sp.id] || [];
  spRes.forEach(r => pushR(r, sp.name));
  (sp.resources || []).forEach(r => pushR(r, sp.name));
  if (has('lucky')) pushR({ key: 'ft-luck', name: 'Pontos de Sorte', max: pb, reset: 'long' }, 'Talento');
  (s.customRes || []).forEach(r => pushR({ key: 'c:' + r.id, name: r.name || 'Recurso', max: +r.max || 0, reset: r.reset || 'long', custom: r.id }, 'Personalizado'));

  // --- Características (srcLevel = nível que libera: de personagem para espécie, da classe para classe/subclasse)
  const features = [];
  sp.traits.forEach(([l, n, d]) => features.push({ lvl: l, name: n, desc: d, src: sp.name, kind: 'species', srcLevel: level }));
  (sp.choices || []).forEach(ch => {
    if (!ch.options) return;
    const opt = ch.options.find(o => o.id === spc[ch.key]);
    if (opt && opt.traits) opt.traits.forEach(([l, n, t]) => features.push({ lvl: l, name: n, desc: t, src: sp.name, kind: 'species', srcLevel: level }));
    else if (opt && opt.desc) features.push({ lvl: 1, name: `${ch.label}: ${opt.name}`, desc: opt.desc, src: sp.name, kind: 'species', srcLevel: level });
  });
  classes.forEach(c => {
    c.cls.features.forEach(([l, n, d]) => features.push({ lvl: l, name: n, desc: d, src: c.cls.name, kind: 'class', srcLevel: c.level }));
    (c.cls.choices || []).forEach(ch => {
      const opt = ch.options.find(o => o.id === c.classChoices[ch.key]);
      if (opt) features.push({ lvl: 1, name: `${ch.label}: ${opt.name}`, desc: opt.desc, src: c.cls.name, kind: 'class', srcLevel: c.level });
    });
    const subDef = c.cls.subclasses.find(x => x.id === c.subclass);
    if (subDef) subDef.features.forEach(([l, n, d]) => features.push({ lvl: l, name: n, desc: d, src: subDef.name, kind: 'subclass', srcLevel: c.level }));
  });
  features.sort((a, b) => a.lvl - b.lvl);

  // --- Resistências / sentidos
  const resist = spList('resist');
  if (sp.id === 'dragonborn') { const o = sp.choices[0].options.find(o => o.id === spc.ancestry); if (o) resist.push(o.dmg); }
  if (sp.id === 'tiefling') { const o = sp.choices[0].options.find(o => o.id === spc.legacy); if (o) resist.push(o.dmg); }
  let darkvision = sp.darkvision;
  if (sp.id === 'elf' && spc.lineage === 'drow') darkvision = 120;
  if (spOpt.darkvision) darkvision = spOpt.darkvision;
  if (subs.has('gloom-stalker') && darkvision < 60) darkvision = 60;

  // --- Idiomas automáticos e ferramentas de multiclasse
  const autoLangs = [...new Set(classes.flatMap(c => c.cls.languages || []))];
  const mcTools = classes.filter(c => !c.primary && (MULTICLASS[c.classId] || {}).tools).map(c => MULTICLASS[c.classId].tools);
  if (subs.has('gunslinger')) mcTools.push('Ferramentas de Funileiro');   // Armeiro (homebrew)

  // --- Carga
  const sizeMult = sp.id === 'goliath' ? 2 : 1;
  const capacity = scores.str * 15 * sizeMult;
  let weight = 0;
  for (const it of s.inventory) weight += (+it.qty || 0) * (+it.weight || 0);
  const coinCount = COINS.reduce((t, c) => t + (+s.coins[c.id] || 0), 0);
  weight += coinCount / 50;
  const wealth = COINS.reduce((t, c) => t + (+s.coins[c.id] || 0) * c.gp, 0);

  const percep = skills.perception.bonus;

  return {
    featBonus, featAbPending, featSaves, weaponIds, spOpt, savage: !!sp.savage,
    cls, sp, bg, sub, subId, level, clsLevel, classes, multi, lvlOf, subs, mcIssues, mcPicks, mcTools, hitDice, casters,
    pb, scores, mods, bgBonus, capstone, saves, aura, skills, jack, expertiseMax, expertiseUsed, profExtraMax, profExtraUsed, extraSources, classSkillMax, classSkillList,
    armorTrain, weaponTrain, ac, acNote, warnings, speed, init, initAdv, hd, hpMax, casterType, castAb, cantrips, prepared, slots, pact, spell,
    resources, features, feats, has, resist, darkvision, autoLangs, capacity, weight, wealth,
    passive: { perception: 10 + percep, insight: 10 + skills.insight.bonus, investigation: 10 + skills.investigation.bonus },
    masteryMax: classes.reduce((m, c) => Math.max(m, c.cls.masteryCount ? c.cls.masteryCount(c.level) : 0), 0),
    // Maestrias marcadas em armas que estão nos ataques
    masteryUsed: Object.keys(s.mastery || {}).filter(id => s.mastery[id] && (s.attacks || []).some(a => a.weaponId === id)).length,
    ...featSlotsOf(s, classes, level),
  };
}

// ---------------------------------------------------------------- Ataques
function weaponProficient(d, w) {
  if (d.weaponIds && d.weaponIds.has(w.id)) return true;
  if (d.weaponTrain.has(w.cat)) return true;
  if (w.cat === 'martial' && d.weaponTrain.has('martial-light') && w.props.includes('Leve')) return true;
  if (w.cat === 'martial' && d.weaponTrain.has('martial-finesse-light') && (w.props.includes('Leve') || w.props.includes('Acuidade'))) return true;
  return false;
}

function isMonkWeapon(w) {
  return w.kind === 'm' && (w.cat === 'simple' || w.props.includes('Leve'));
}

function attackCalc(d, s, atk) {
  const w = atk.weaponId ? WEAPON[atk.weaponId] : null;
  const monk = d.lvlOf('monk') > 0;
  const unarmed = atk.weaponId === 'unarmed';
  let ab = atk.ability || 'auto';
  if (ab === 'auto') {
    if (unarmed) ab = monk && d.mods.dex > d.mods.str ? 'dex' : 'str';
    else if (!w) ab = 'str';
    else if (w.kind === 'r') ab = 'dex';
    else if (w.props.includes('Acuidade') || (monk && isMonkWeapon(w))) ab = d.mods.dex > d.mods.str ? 'dex' : 'str';
    else ab = 'str';
  }
  const mod = d.mods[ab] || 0;
  let prof;
  if (atk.prof === 'yes') prof = true;
  else if (atk.prof === 'no') prof = false;
  else prof = unarmed ? true : w ? weaponProficient(d, w) : true;
  const magic = +atk.magic || 0;
  let hit = mod + (prof ? d.pb : 0) + magic + (+atk.hitBonus || 0);
  const bonusTags = [];   // estilos de luta já somados (mostrados no ataque)
  const notes = [];       // lembretes condicionais (não alteram o número)
  if (w && w.kind === 'r' && d.has('fs-archery')) { hit += 2; bonusTags.push('Arquearia +2 no acerto'); }

  let die;
  if (unarmed) {
    die = monk ? 'd' + steps([[1, 6], [5, 8], [11, 10], [17, 12]])(d.lvlOf('monk')) : d.has('tavern-brawler') ? 'd4' : '';
    die = die ? '1' + die : '1';
  } else if (w) {
    die = atk.versatile ? (w.props.find(p => p.startsWith('Versátil')) || '').replace(/.*\((.*)\)/, '$1') || w.dmg : w.dmg;
    if (monk && isMonkWeapon(w)) {
      const ma = steps([[1, 6], [5, 8], [11, 10], [17, 12]])(d.lvlOf('monk'));
      const m = /^(\d+)d(\d+)$/.exec(die);
      if (m && +m[1] * +m[2] < ma) die = '1d' + ma;
    }
  } else die = atk.dmg || '1d4';
  // Duelismo: só lembrete — depende de como a arma está sendo empunhada no momento
  if (w && w.kind === 'm' && d.has('fs-dueling') && !w.props.some(p => p.startsWith('Duas Mãos'))) {
    notes.push('Duelismo: +2 de dano se empunhar com uma mão e sem outra arma');
  }
  const dmgMod = mod + magic + (+atk.dmgBonus || 0);
  const dmgStr = die + (dmgMod ? (dmgMod > 0 ? '+' : '') + dmgMod : '');
  const dtype = unarmed ? 'Contundente' : w ? w.dtype : (atk.dtype || '');
  return { ab, prof, hit, dmg: dmgStr, dtype, w, extra: atk.extraDmg || '', tags: bonusTags, notes };
}

// ---------------------------------------------------------------- Dados
function rollDie(sides) { return 1 + Math.floor(Math.random() * sides); }
function rollExpr(expr) {
  // "2d6+1d4+3"
  const parts = String(expr).replace(/\s+/g, '').replace(/-/g, '+-').split('+').filter(Boolean);
  let total = 0; const detail = [];
  for (const p of parts) {
    const m = /^(-?)(\d*)d(\d+)$/i.exec(p);
    if (m) {
      const n = +(m[2] || 1), sides = +m[3], sign = m[1] ? -1 : 1;
      const rs = Array.from({ length: Math.min(n, 100) }, () => rollDie(sides));
      total += sign * rs.reduce((a, b) => a + b, 0);
      detail.push(`${m[1]}[${rs.join(',')}]`);
    } else if (/^-?\d+$/.test(p)) { total += +p; detail.push(p); }
  }
  return { total, detail: detail.join(' + ').replace(/\+ -/g, '− ') };
}
