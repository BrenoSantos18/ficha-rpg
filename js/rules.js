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
    classId: '', subclass: '', classChoices: {}, classSkills: [],
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

// Vagas de talento (2024): níveis de Aumento de Atributo (+ Guerreiro 6/14, Ladino 10; 19 = Dádiva Épica)
// e vagas de Estilo de Luta. O talento do antecedente e o do Humano (Versátil) não ocupam vaga.
function featSlotsOf(s, cls, subId, level) {
  const asiLevels = [4, 8, 12, 16, 19].concat(cls.id === 'fighter' ? [6, 14] : [], cls.id === 'rogue' ? [10] : []).sort((a, b) => a - b);
  let styleSlots = 0;
  if (cls.id === 'fighter') styleSlots = 1 + (subId === 'champion' && level >= 7 ? 1 : 0);
  if ((cls.id === 'paladin' || cls.id === 'ranger') && level >= 2) styleSlots = 1;
  const featUse = { general: 0, style: 0 };
  for (const f of s.feats || []) {
    const F = f.featId && FEAT[f.featId];
    if (!F) continue; // talentos personalizados ficam por conta do jogador
    if (F.cat === 'Estilo de Luta') featUse.style++; else featUse.general++;
  }
  return { featSlots: asiLevels.filter(l => l <= level).length, nextFeatLevel: asiLevels.find(l => l > level) || null, styleSlots, featUse };
}

function compute(s) {
  const cls = CLASS[s.classId] || NULL_CLASS;
  const sp = SPECIE[s.species] || NULL_SPECIES;
  const bg = BACKGROUND[s.background] || NULL_BG;
  const level = Math.min(20, Math.max(1, +s.level || 1));
  const pb = pbFor(level);
  const sub = cls.subclasses.find(x => x.id === s.subclass && level >= 3) || null;
  const subId = sub ? sub.id : '';
  const feats = featIds(s);
  const has = (id) => feats.includes(id);
  const cc = s.classChoices || {};
  const spc = s.speciesChoices || {};

  // --- Atributos
  const bgBonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  if (bg.id) {
    if (s.bgMode === '111') bg.abilities.forEach(a => bgBonus[a] += 1);
    else {
      if (bg.abilities.includes(s.bg2)) bgBonus[s.bg2] += 2;
      if (bg.abilities.includes(s.bg1) && s.bg1 !== s.bg2) bgBonus[s.bg1] += 1;
    }
  }
  const scores = {}, mods = {}, capstone = {};
  for (const a of ABILITIES) {
    let v = (+s.abilities[a.id] || 0) + bgBonus[a.id] + (+s.abilityExtra[a.id] || 0);
    if (level >= 20 && ((cls.id === 'barbarian' && (a.id === 'str' || a.id === 'con')) || (cls.id === 'monk' && (a.id === 'dex' || a.id === 'wis')))) {
      capstone[a.id] = 4; v = Math.min(25, v + 4);
    }
    scores[a.id] = v; mods[a.id] = modOf(v);
  }
  const ctx = { level, pb, mods, scores, sub: subId, sheet: s };

  // --- Salvaguardas
  const saveProfs = new Set(cls.saves);
  if (cls.id === 'rogue' && level >= 15) { saveProfs.add('wis'); saveProfs.add('cha'); }
  if (cls.id === 'monk' && level >= 14) ABILITIES.forEach(a => saveProfs.add(a.id));
  if (subId === 'gloom-stalker' && level >= 7) saveProfs.add('wis');
  for (const [k, v] of Object.entries(s.saveProf || {})) if (v) saveProfs.add(k);
  const aura = cls.id === 'paladin' && level >= 6 ? Math.max(1, mods.cha) : 0;
  const saves = {};
  for (const a of ABILITIES) saves[a.id] = { prof: saveProfs.has(a.id), classProf: cls.saves.includes(a.id), bonus: mods[a.id] + (saveProfs.has(a.id) ? pb : 0) + aura + (+s.saveBonus || 0) };

  // --- Perícias
  const autoSkill = {};
  const mark = (id, src) => { if (id) (autoSkill[id] = autoSkill[id] || []).push(src); };
  bg.skills.forEach(k => mark(k, 'Antecedente'));
  (s.classSkills || []).forEach(k => mark(k, 'Classe'));
  if (sp.id === 'elf') mark(spc.keen, 'Espécie');
  if (sp.id === 'human') mark(spc.skillful, 'Espécie');
  if (subId === 'mercy') { mark('insight', 'Subclasse'); mark('medicine', 'Subclasse'); }
  const jack = cls.jackOfAllTrades && level >= 2 ? Math.floor(pb / 2) : 0;
  const skills = {};
  let expertiseUsed = 0;
  for (const sk of SKILLS) {
    const auto = autoSkill[sk.id] ? 1 : 0;
    const manual = +s.skillProf[sk.id] || 0;
    const prof = Math.max(auto, manual);
    if (prof === 2) expertiseUsed++;
    let bonus = mods[sk.ab] + (prof === 2 ? pb * 2 : prof === 1 ? pb : jack);
    if (cls.id === 'cleric' && cc.order === 'thaumaturge' && (sk.id === 'arcana' || sk.id === 'religion')) bonus += Math.max(1, mods.wis);
    if (cls.id === 'druid' && cc.order === 'magician' && (sk.id === 'arcana' || sk.id === 'nature')) bonus += Math.max(1, mods.wis);
    skills[sk.id] = { prof, auto: !!auto, sources: autoSkill[sk.id] || [], bonus, jack: !prof && jack > 0 };
  }
  // Proficiências extras (além de antecedente, classe e espécie) e especializações
  const featCount = (id) => feats.filter(f => f === id).length;
  const extraSources = [];
  const addSrc = (n, label) => { if (n > 0) extraSources.push([label, n]); };
  addSrc(3 * featCount('skilled'), 'Habilidoso');
  addSrc(featCount('skill-expert'), 'Perito');
  addSrc(featCount('keen-mind'), 'Mente Afiada');
  addSrc(featCount('observant'), 'Observador');
  if (cls.id === 'barbarian' && level >= 3) addSrc(1, 'Conhecimento Primitivo');
  if (subId === 'lore') addSrc(3, 'Proficiências Bônus');
  if (subId === 'battle-master') addSrc(1, 'Estudante da Guerra');
  if (subId === 'fey-wanderer') addSrc(1, 'Glamour Sobrenatural');
  addSrc(+s.extraSkills || 0, 'Mestre/outros');
  const profExtraMax = has('boon-skill') ? SKILLS.length : extraSources.reduce((t, [, n]) => t + n, 0);
  const profExtraUsed = SKILLS.filter(sk => !autoSkill[sk.id] && (+s.skillProf[sk.id] || 0) >= 1).length;
  const expertiseMax = (cls.expertise ? cls.expertise(level) : 0) + featCount('skill-expert') + (has('boon-skill') ? 1 : 0) + (+s.extraExpertise || 0);
  const classSkillMax = cls.skillCount;
  const classSkillList = cls.skillList === 'any' ? SKILLS.map(x => x.id) : cls.skillList;

  // --- Treinamentos
  const armorTrain = new Set(cls.armor);
  const weaponTrain = new Set(cls.weapons);
  if (cls.id === 'cleric' && cc.order === 'protector') { armorTrain.add('heavy'); weaponTrain.add('martial'); }
  if (cls.id === 'druid' && cc.order === 'warden') { armorTrain.add('medium'); weaponTrain.add('martial'); }
  if (subId === 'valor') { armorTrain.add('medium'); armorTrain.add('shield'); weaponTrain.add('martial'); }
  if (has('lightly-armored')) { armorTrain.add('light'); armorTrain.add('shield'); }
  if (has('moderately-armored')) { armorTrain.add('medium'); armorTrain.add('shield'); }
  if (has('heavily-armored')) armorTrain.add('heavy');
  if (has('martial-weapon-training')) weaponTrain.add('martial');

  // --- CA
  const armor = ARMOR[s.armor] || ARMOR.none;
  let ac, acNote;
  const warnings = [];
  if (armor.type === 'none') {
    const opts = [[10 + mods.dex, 'Sem armadura']];
    if (cls.unarmored === 'con') opts.push([10 + mods.dex + mods.con, 'Defesa sem Armadura']);
    if (cls.unarmored === 'wis' && !s.shield) opts.push([10 + mods.dex + mods.wis, 'Defesa sem Armadura']);
    if (subId === 'draconic' || subId === 'dance') opts.push([10 + mods.dex + mods.cha, subId === 'draconic' ? 'Resiliência Dracônica' : 'Passos Deslumbrantes']);
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
  const heavy = armor.type === 'heavy';
  if (cls.id === 'barbarian' && level >= 5 && !heavy) speed += 10;
  if (cls.id === 'monk' && level >= 2 && armor.type === 'none' && !s.shield) speed += steps([[2, 10], [6, 15], [10, 20], [14, 25], [18, 30]])(level);
  if (cls.id === 'ranger' && level >= 6 && !heavy) speed += 10;
  if (has('speedy')) speed += 10;
  if (has('boon-speed')) speed += 30;
  if (armor.str && scores.str < armor.str) { speed -= 10; warnings.push(`FOR ${armor.str} necessária para ${armor.name}: −3 m de deslocamento.`); }
  speed += (+s.speedBonus || 0);
  speed = Math.max(0, speed - 5 * (+s.exhaustion || 0));

  // --- Iniciativa
  let init = mods.dex + (+s.initBonus || 0);
  if (has('alert')) init += pb;
  if (subId === 'gloom-stalker') init += mods.wis;
  const initAdv = (cls.id === 'barbarian' && level >= 7) || subId === 'champion' || subId === 'assassin';

  // --- PV
  const hd = cls.hd;
  let hpMax = hd + mods.con + Math.max(0, level - 1) * (hd / 2 + 1 + mods.con);
  hpMax = Math.max(level, hpMax);
  if (sp.hpPerLevel) hpMax += sp.hpPerLevel * level;
  if (has('tough')) hpMax += 2 * level;
  if (subId === 'draconic') hpMax += level;
  if (has('boon-fortitude')) hpMax += 40;
  hpMax += (+s.hp.bonus || 0);
  if (s.hp.maxOverride) hpMax = +s.hp.maxOverride;

  // --- Conjuração
  let casterType = cls.caster || null;
  let castAb = cls.castAb || null;
  let cantrips = cls.cantrips ? cls.cantrips(level) : 0;
  let prepared = cls.prepared ? cls.prepared(level) : 0;
  if (cls.thirdCaster && subId === cls.thirdCaster) {
    casterType = 'third'; castAb = cls.thirdAb;
    cantrips = subId === 'arcane-trickster' ? (level >= 10 ? 4 : 3) : (level >= 10 ? 3 : 2);
    prepared = PREP_THIRD[level - 1];
  }
  if ((cls.id === 'cleric' && cc.order === 'thaumaturge') || (cls.id === 'druid' && cc.order === 'magician')) cantrips += 1;
  if (s.spellAbility) castAb = s.spellAbility;
  let slots = [], pact = null;
  if (casterType === 'full') slots = FULL_SLOTS[level];
  else if (casterType === 'half') slots = FULL_SLOTS[Math.ceil(level / 2)];
  else if (casterType === 'third') slots = FULL_SLOTS[Math.ceil(level / 3)];
  else if (casterType === 'pact') pact = { count: steps([[1, 1], [2, 2], [11, 3], [17, 4]])(level), level: Math.min(5, Math.ceil(level / 2)) };
  const spell = castAb ? { ability: castAb, dc: 8 + pb + mods[castAb], attack: pb + mods[castAb] } : null;

  // --- Recursos
  const resources = [];
  const pushR = (r, src) => { if (r && r.max > 0) resources.push(Object.assign({ src }, r)); };
  cls.resources(ctx).forEach(r => pushR(r, cls.name));
  const spRes = {
    aasimar: [{ key: 'sp-heal', name: 'Mãos Curativas', max: 1, reset: 'long' }, level >= 3 && { key: 'sp-reveal', name: 'Revelação Celestial', max: 1, reset: 'long' }],
    dragonborn: [{ key: 'sp-breath', name: `Arma de Sopro (${steps([[1, 1], [5, 2], [11, 3], [17, 4]])(level)}d10, CD ${8 + mods.con + pb})`, max: pb, reset: 'long' }, level >= 5 && { key: 'sp-flight', name: 'Voo Dracônico', max: 1, reset: 'long' }],
    dwarf: [{ key: 'sp-stone', name: 'Conhecimento de Pedras', max: pb, reset: 'long' }],
    goliath: [{ key: 'sp-giant', name: 'Ancestralidade Gigante', max: pb, reset: 'long' }, level >= 5 && { key: 'sp-large', name: 'Forma Grande', max: 1, reset: 'long' }],
    orc: [{ key: 'sp-adrenaline', name: 'Surto de Adrenalina', max: pb, reset: 'short' }, { key: 'sp-relentless', name: 'Resistência Implacável', max: 1, reset: 'long' }],
  }[sp.id] || [];
  spRes.forEach(r => pushR(r, sp.name));
  if (has('lucky')) pushR({ key: 'ft-luck', name: 'Pontos de Sorte', max: pb, reset: 'long' }, 'Talento');
  (s.customRes || []).forEach(r => pushR({ key: 'c:' + r.id, name: r.name || 'Recurso', max: +r.max || 0, reset: r.reset || 'long', custom: r.id }, 'Personalizado'));

  // --- Características
  const features = [];
  sp.traits.forEach(([l, n, d]) => features.push({ lvl: l, name: n, desc: d, src: sp.name, kind: 'species' }));
  (sp.choices || []).forEach(ch => {
    if (!ch.options) return;
    const opt = ch.options.find(o => o.id === spc[ch.key]);
    if (opt && opt.desc) features.push({ lvl: 1, name: `${ch.label}: ${opt.name}`, desc: opt.desc, src: sp.name, kind: 'species' });
  });
  cls.features.forEach(([l, n, d]) => features.push({ lvl: l, name: n, desc: d, src: cls.name, kind: 'class' }));
  (cls.choices || []).forEach(ch => {
    const opt = ch.options.find(o => o.id === cc[ch.key]);
    if (opt) features.push({ lvl: 1, name: `${ch.label}: ${opt.name}`, desc: opt.desc, src: cls.name, kind: 'class' });
  });
  const subDef = cls.subclasses.find(x => x.id === s.subclass);
  if (subDef) subDef.features.forEach(([l, n, d]) => features.push({ lvl: l, name: n, desc: d, src: subDef.name, kind: 'subclass' }));
  features.sort((a, b) => a.lvl - b.lvl);

  // --- Resistências / sentidos
  const resist = [...(sp.resist || [])];
  if (sp.id === 'dragonborn') { const o = sp.choices[0].options.find(o => o.id === spc.ancestry); if (o) resist.push(o.dmg); }
  if (sp.id === 'tiefling') { const o = sp.choices[0].options.find(o => o.id === spc.legacy); if (o) resist.push(o.dmg); }
  let darkvision = sp.darkvision;
  if (sp.id === 'elf' && spc.lineage === 'drow') darkvision = 120;
  if (subId === 'gloom-stalker' && darkvision < 60) darkvision = 60;

  // --- Idiomas automáticos
  const autoLangs = [...(cls.languages || [])];

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
    cls, sp, bg, sub, subId, level, pb, scores, mods, bgBonus, capstone, saves, aura, skills, jack, expertiseMax, expertiseUsed, profExtraMax, profExtraUsed, extraSources, classSkillMax, classSkillList,
    armorTrain, weaponTrain, ac, acNote, warnings, speed, init, initAdv, hd, hpMax, casterType, castAb, cantrips, prepared, slots, pact, spell,
    resources, features, feats, has, resist, darkvision, autoLangs, capacity, weight, wealth,
    passive: { perception: 10 + percep, insight: 10 + skills.insight.bonus, investigation: 10 + skills.investigation.bonus },
    masteryMax: cls.masteryCount ? cls.masteryCount(level) : 0,
    // Maestrias marcadas em armas que estão nos ataques
    masteryUsed: Object.keys(s.mastery || {}).filter(id => s.mastery[id] && (s.attacks || []).some(a => a.weaponId === id)).length,
    ...featSlotsOf(s, cls, subId, level),
  };
}

// ---------------------------------------------------------------- Ataques
function weaponProficient(d, w) {
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
  const monk = d.cls.id === 'monk';
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
    die = monk ? 'd' + steps([[1, 6], [5, 8], [11, 10], [17, 12]])(d.level) : d.has('tavern-brawler') ? 'd4' : '';
    die = die ? '1' + die : '1';
  } else if (w) {
    die = atk.versatile ? (w.props.find(p => p.startsWith('Versátil')) || '').replace(/.*\((.*)\)/, '$1') || w.dmg : w.dmg;
    if (monk && isMonkWeapon(w)) {
      const ma = steps([[1, 6], [5, 8], [11, 10], [17, 12]])(d.level);
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
