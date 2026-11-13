// Gera exemplos/MANUAL-TEMPLATE.md a partir dos dados do app (códigos e limites sempre em sincronia).
// Uso: node tools/gerar-manual.js
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Set };
vm.createContext(ctx);
for (const f of ['js/data.js', 'js/spells.js', 'js/rules.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const D = vm.runInContext(`({ ABILITIES, SKILLS, SK, AB, ALIGNMENTS, LANGUAGES, CONDITIONS, SPECIES, BACKGROUNDS, CLASSES, FEATS, FEAT,
  WEAPONS, ARMORS, ARMOR_TYPE_NAME, SPELLS, COINS, FULL_SLOTS, PREP_THIRD, XP_TABLE, POINT_BUY_COST, STANDARD_ARRAY, SPELL_SCHOOLS, newSheet, steps })`, ctx);
// Itens comuns (lista de sugestões do app, com peso em libras)
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const GEAR = vm.runInNewContext(appSrc.match(/const GEAR = (\[[\s\S]*?\]);/)[1]);

const L = [];
const out = (...lines) => L.push(...lines);
const code = (x) => '`' + x + '`';
const listNames = { bard: 'Bardo', cleric: 'Clérigo', druid: 'Druida', paladin: 'Paladino', ranger: 'Patrulheiro', sorcerer: 'Feiticeiro', warlock: 'Bruxo', wizard: 'Mago' };
const weaponTrain = { simple: 'Simples', martial: 'Marciais', 'martial-light': 'Marciais com Leve', 'martial-finesse-light': 'Marciais com Acuidade ou Leve' };

out('# Manual do template de ficha — Grimório de Fichas (D&D 5e, regras de 2024)', '',
  '> Gerado automaticamente a partir dos dados do app (`node tools/gerar-manual.js`). Todos os códigos abaixo são exatamente os que o app aceita.', '',
  'Este manual explica como preencher o arquivo `template-ficha.json` para importar um personagem no Grimório (botão **Importar** na lista de fichas).',
  'Ele foi escrito para ser colado num chat com um assistente de IA junto com o template.', '');

out('## 1. Instruções para o assistente (cole isto no chat)', '',
  '```text',
  'Você vai me ajudar a criar um personagem de D&D 5e usando as regras de 2024 (Livro do Jogador 2024)',
  'e, no final, gerar um arquivo JSON para o app "Grimório de Fichas". Siga o manual anexo:',
  '1. Converse comigo para definir espécie, antecedente, classe, nível, atributos, perícias, equipamento, magias e história.',
  '2. Use SOMENTE os códigos (ids) listados no manual para espécie, antecedente, classe, subclasse, perícias, armas, armaduras, talentos e magias.',
  '3. Respeite os limites do nível: quantidade de perícias da classe, especializações, truques, magias preparadas e nível máximo de magia.',
  '4. Escreva todo texto livre (nome, história, notas, nomes de itens) em português.',
  '5. No final, responda com o JSON completo e válido, no formato { "app": "grimorio-fichas", "version": 1, "sheets": [ ... ] },',
  '   sem comentários dentro do JSON, para eu salvar como arquivo .json e importar.',
  '6. Se a ficha original for de outra edição (ex.: 2014), adapte para 2024 e me diga o que mudou.',
  '```', '');

out('## 2. Estrutura do arquivo', '',
  '```json',
  '{', '  "app": "grimorio-fichas",', '  "version": 1,', '  "exportedAt": "",', '  "sheets": [ { ...ficha... } ]', '}', '```', '',
  '- `sheets` é uma lista: dá para colocar vários personagens no mesmo arquivo.',
  '- Também são aceitos: um array de fichas (`[ {...}, {...} ]`) ou uma ficha sozinha (`{...}`).',
  '- A ficha precisa ter pelo menos o objeto `abilities`; o resto pode faltar e o app completa com o padrão.',
  '- JSON não aceita comentários nem vírgula sobrando no fim de listas.', '');

out('## 3. Campos da ficha', '',
  '| Campo | Tipo | O que colocar |', '|---|---|---|',
  '| `id` | texto | Pode ficar `""`: o app gera um. Se repetir o id de uma ficha que já existe, ela só é substituída se `updatedAt` for maior. |',
  '| `createdAt`, `updatedAt` | número | Data em milissegundos (Unix). Pode ser `0`. |',
  '| `name` | texto | Nome do personagem. |',
  '| `player` | texto | Nome do jogador. |',
  '| `photo` | texto | Deixe `""` (a foto é adicionada no app). |',
  '| `level` | número | 1 a 20. |',
  `| ${code('xp')} | número | Pontos de experiência. Mínimo por nível: ${D.XP_TABLE.map((x, i) => `${i + 1}→${x}`).join(', ')}. |`,
  `| ${code('alignment')} | texto | Um destes ou \`""\`: ${D.ALIGNMENTS.map(code).join(', ')}. |`,
  '| `species` | código | Ver seção 4. |',
  '| `speciesChoices` | objeto | Escolhas da espécie (seção 4). Ex.: `{ "lineage": "high", "keen": "perception" }`. |',
  '| `size` | texto | `"Médio"` ou `"Pequeno"` (só para espécies que deixam escolher); senão `""`. |',
  '| `background` | código | Ver seção 5. |',
  '| `bgMode` | texto | `"21"` = +2 num atributo e +1 em outro; `"111"` = +1 nos três atributos do antecedente. |',
  '| `bg2`, `bg1` | código de atributo | Com `bgMode: "21"`: qual recebe +2 e qual recebe +1 (diferentes, e entre os 3 do antecedente). |',
  '| `classId` | código | Ver seção 6. |',
  '| `subclass` | código | Subclasse (a partir do nível 3), ou `""`. |',
  '| `classChoices` | objeto | Escolhas da classe (Clérigo e Druida têm `order`). Ex.: `{ "order": "protector" }`. |',
  '| `classSkills` | lista de códigos | Perícias escolhidas da lista da classe (quantidade exata da classe). Não repita as do antecedente. |',
  '| `abilityMethod` | texto | `"pointbuy"`, `"standard"` ou `"manual"` (rolagem). |',
  '| `abilities` | objeto | Valores **base** (antes do antecedente): `{ "str", "dex", "con", "int", "wis", "cha" }`. |',
  '| `abilityExtra` | objeto | Bônus extras por atributo (Aumentos de Atributo, talentos, itens). Mesmo formato. |',
  '| `saveProf` | objeto | Proficiências de salvaguarda **além** das da classe. Ex.: `{ "wis": true }` (talento Resiliente). |',
  '| `saveBonus` | número | Bônus em todas as salvaguardas (itens mágicos). Normalmente `0`. |',
  '| `skillProf` | objeto | Perícia → `1` (proficiente, vinda de talento/outra fonte) ou `2` (especialização). Ex.: `{ "stealth": 2 }`. |',
  '| `extraSkills`, `extraExpertise` | número | Proficiências/especializações extras dadas pelo mestre. Normalmente `0`. |',
  '| `hp` | objeto | `{ "current": null, "temp": 0, "maxOverride": null, "bonus": 0 }`. **Use `null` em `current`** (= PV cheios). `maxOverride` só se a mesa usar PV rolados. |',
  '| `hitDiceUsed` | número | Dados de vida gastos. Normalmente `0`. |',
  '| `deathSaves` | objeto | `{ "s": 0, "f": 0 }`. |',
  '| `exhaustion` | número | 0 a 6. |',
  '| `inspiration` | sim/não | Inspiração Heroica. |',
  `| ${code('conditions')} | lista | Condições atuais: ${D.CONDITIONS.map(code).join(', ')}. Normalmente \`[]\`. |`,
  '| `armor` | código | Armadura vestida (seção 8) ou `"none"`. |',
  '| `shield` | sim/não | Usa escudo. |',
  '| `acBonus`, `initBonus`, `speedBonus` | número | Bônus extras de CA, iniciativa e deslocamento (em pés, múltiplos de 5). |',
  '| `attacks` | lista | Ataques (seção 9). |',
  '| `mastery` | objeto | Armas com Maestria ativa: `{ "rapier": true }` (só classes com Maestria). |',
  '| `spellAbility` | código | Deixe `""` (usa o da classe). Só para quem não é conjurador e tem magias de talento/espécie: `"int"`, `"wis"` ou `"cha"`. |',
  '| `spells` | lista | Magias (seção 10). |',
  '| `slotsUsed` | lista | 10 números: `[0,0,0,0,0,0,0,0,0,0]`. |',
  '| `pactUsed` | número | `0`. |',
  '| `resUsed` | objeto | `{}` (usos de recursos gastos). |',
  '| `customRes` | lista | Recursos personalizados: `{ "id": "", "name": "Varinha", "max": 3, "reset": "long" }` (`reset`: `"long"` ou `"short"`). |',
  '| `inventory` | lista | Itens (seção 8). |',
  '| `coins` | objeto | `{ "pc": 0, "pp": 0, "pe": 0, "po": 0, "pl": 0 }` = cobre, prata, electro, ouro, platina. |',
  '| `feats` | lista | Talentos **adicionais** (seção 7). Não repita o talento do antecedente. |',
  `| ${code('languages')} | lista de textos | Sempre inclua "Comum" + 2 à escolha. Sugestões: ${D.LANGUAGES.map(x => `"${x}"`).join(', ')}. |`,
  '| `toolProfs` | texto | Ferramentas/proficiências extras em texto livre. As do antecedente e da classe já aparecem sozinhas. |',
  '| `otherProfs` | texto | Livre. |',
  '| `bio` | objeto | Textos livres: `age`, `height`, `weight`, `eyes`, `hair`, `skin`, `gender`, `faith`, `appearance`, `personality`, `ideals`, `bonds`, `flaws`, `backstory`, `allies`, `notes`. |',
  '| `equipAdded` | objeto | `{}`. |', '');

out('### Atributos e perícias', '',
  '| Código | Atributo |', '|---|---|', ...D.ABILITIES.map(a => `| ${code(a.id)} | ${a.name} (${a.short}) |`), '',
  '| Código | Perícia | Atributo |', '|---|---|---|', ...D.SKILLS.map(s => `| ${code(s.id)} | ${s.name} | ${D.AB[s.ab].short} |`), '');

out('### Como montar os atributos', '',
  `- **Compra de pontos** (\`"pointbuy"\`): cada valor base entre 8 e 15, total de até 27 pontos. Custos: ${Object.entries(D.POINT_BUY_COST).map(([v, c]) => `${v}=${c}`).join(', ')}.`,
  `- **Arranjo padrão** (\`"standard"\`): distribua ${D.STANDARD_ARRAY.join(', ')}, um valor por atributo.`,
  '- **Rolagem** (`"manual"`): valores base de 3 a 18.',
  '- O antecedente soma +2/+1 ou +1/+1/+1 em cima da base (campos `bgMode`, `bg2`, `bg1`).',
  '- Aumentos de Atributo de nível (4, 8, 12, 16, 19 — Guerreiro também 6 e 14, Ladino também 10) vão em `abilityExtra` e devem ter um talento `asi` correspondente em `feats`.',
  '- Nenhum atributo final passa de 20 (exceto Dádivas Épicas e as capstones de nível 20 de Bárbaro e Monge, que o app soma sozinho).', '');

// Espécies
out('## 4. Espécies (`species`)', '');
for (const sp of D.SPECIES) {
  out(`### ${code(sp.id)} — ${sp.name}`, `Tamanho: ${sp.size}${sp.sizeChoice ? ' (use `size`)' : ''} · Deslocamento: ${sp.speed} pés · Visão no escuro: ${sp.darkvision || 'não'}`);
  for (const ch of sp.choices || []) {
    if (ch.options) out(`- \`speciesChoices.${ch.key}\` (${ch.label}): ${ch.options.map(o => `${code(o.id)} = ${o.name}`).join('; ')}`);
    else if (ch.skillAny) out(`- \`speciesChoices.${ch.key}\` (${ch.label}): código de qualquer perícia.`);
    else if (ch.featOrigin) out(`- \`speciesChoices.${ch.key}\` (${ch.label}): código de um talento de Origem (seção 7), diferente do talento do antecedente.`);
  }
  out('');
}

// Antecedentes
out('## 5. Antecedentes (`background`)', '',
  '| Código | Nome | Atributos (`bg2`/`bg1`) | Talento de Origem | Perícias (automáticas) | Ferramenta |', '|---|---|---|---|---|---|',
  ...D.BACKGROUNDS.map(b => `| ${code(b.id)} | ${b.name} | ${b.abilities.map(code).join(', ')} | ${code(b.feat)} ${D.FEAT[b.feat].name} | ${b.skills.map(k => D.SK[k].name).join(', ')} | ${b.tool} |`), '');

// Classes
out('## 6. Classes (`classId`) e subclasses (`subclass`)', '');
for (const c of D.CLASSES) {
  out(`### ${code(c.id)} — ${c.name}`,
    `- Dado de Vida d${c.hd} · Salvaguardas: ${c.saves.map(a => D.AB[a].short).join(', ')} · Armaduras: ${c.armor.map(a => a === 'shield' ? 'Escudos' : D.ARMOR_TYPE_NAME[a]).join(', ') || 'nenhuma'} · Armas: ${c.weapons.map(w => weaponTrain[w]).join(', ')}`,
    `- \`classSkills\`: escolha **${c.skillCount}** de ${c.skillList === 'any' ? 'qualquer perícia' : c.skillList.map(code).join(', ')}`);
  if (c.expertise) out(`- Especializações (\`skillProf\` = 2): ${[1, 2, 6, 9].map(l => `nível ${l}: ${c.expertise(l)}`).filter((x, i, a) => a.indexOf(x) === i).join(' · ')}`);
  if (c.masteryCount) out(`- Maestria em armas (\`mastery\`): ${[1, 4, 10, 16].map(l => `nível ${l}: ${c.masteryCount(l)}`).join(' · ')}`);
  for (const ch of c.choices || []) out(`- \`classChoices.${ch.key}\` (${ch.label}): ${ch.options.map(o => `${code(o.id)} = ${o.name}`).join('; ')}`);
  out(`- Subclasses (nível 3+): ${c.subclasses.map(s => `${code(s.id)} = ${s.name}`).join('; ')}`, '');
}

// Magia por nível
out('### Limites de magia por classe e nível', '',
  'Truques e magias preparadas de origem `"class"` precisam caber nestes números. "Máx." é o maior nível de magia que pode ser escolhido.', '');
const casters = D.CLASSES.filter(c => c.caster).map(c => [c.name, c.caster, c.cantrips, c.prepared]);
casters.push(['Guerreiro (Cavaleiro Arcano)', 'third', (l) => (l >= 10 ? 3 : 2), (l) => D.PREP_THIRD[l - 1]]);
casters.push(['Ladino (Trapaceiro Arcano)', 'third', (l) => (l >= 10 ? 4 : 3), (l) => D.PREP_THIRD[l - 1]]);
const maxLvl = (type, l) => type === 'pact' ? Math.min(5, Math.ceil(l / 2)) : (type === 'full' ? D.FULL_SLOTS[l] : type === 'half' ? D.FULL_SLOTS[Math.ceil(l / 2)] : D.FULL_SLOTS[Math.ceil(l / 3)]).length;
out('| Classe | ' + Array.from({ length: 20 }, (_, i) => i + 1).join(' | ') + ' |', '|---|' + '---|'.repeat(20));
for (const [name, type, can, prep] of casters) {
  const lv = Array.from({ length: 20 }, (_, i) => i + 1).map(l => (type === 'third' && l < 3) ? '—' : `${can(l)}/${prep(l)}/${maxLvl(type, l)}º`);
  out(`| ${name} | ${lv.join(' | ')} |`);
}
out('', 'Formato de cada célula: **truques / magias preparadas / nível máximo**. O Mago pode ter mais magias no grimório (6 no nível 1 + 2 por nível), mas só marca como `prepared` a quantidade da tabela.', '');

// Talentos
out('## 7. Talentos (`feats`)', '',
  'Formato de cada item: `{ "id": "", "featId": "alert", "note": "Nível 4", "name": "", "desc": "" }`.',
  '- `featId`: um código da tabela abaixo. `note`: de onde veio (ex.: "Nível 4").',
  '- Talento inventado/homebrew: deixe `featId` vazio e preencha `name` e `desc`.',
  '- Pré-requisitos: Origem = qualquer nível; Geral = nível 4+; Estilo de Luta = Guerreiro 1+, Paladino 2+ ou Patrulheiro 2+; Dádiva Épica = nível 19+.',
  '- O talento do antecedente e o do Humano (`speciesChoices.versatile`) **não** entram aqui.', '',
  '| Código | Nome | Categoria | Efeito |', '|---|---|---|---|',
  ...D.FEATS.map(f => `| ${code(f.id)} | ${f.name} | ${f.cat} | ${f.desc.replace(/\|/g, '/')} |`), '');

// Equipamento
out('## 8. Equipamento', '',
  'Formato de cada item de `inventory`: `{ "id": "", "name": "Corda (15 m)", "qty": 1, "weight": 5, "equipped": false, "notes": "" }`.',
  '- `weight` é em **libras (lb)** por unidade. `equipped`: está em uso.',
  '- Para armas, acrescente `"weaponId": "<código>"` e crie também o ataque correspondente em `attacks` (seção 9).',
  '- A armadura vestida vai no campo `armor` da ficha (e pode estar no inventário com `equipped: true`). Escudo: `shield: true`.',
  '- Itens fora destas listas são permitidos: use um nome em português e um peso aproximado.', '',
  '### Armas (`weaponId`)', '', '| Código | Nome | Categoria | Dano | Propriedades | Maestria | Peso (lb) |', '|---|---|---|---|---|---|---|',
  ...D.WEAPONS.map(w => `| ${code(w.id)} | ${w.name} | ${w.cat === 'simple' ? 'Simples' : 'Marcial'} ${w.kind === 'm' ? 'corpo a corpo' : 'à distância'} | ${w.dmg} ${w.dtype} | ${w.props.join(', ') || '—'} | ${w.mastery} | ${w.weight} |`), '',
  '### Armaduras (`armor`)', '', '| Código | Nome | Tipo | CA | Peso (lb) |', '|---|---|---|---|---|',
  ...D.ARMORS.map(a => `| ${code(a.id)} | ${a.name} | ${a.type === 'none' ? '—' : D.ARMOR_TYPE_NAME[a.type]} | ${a.base}${a.type === 'light' ? ' + DES' : a.type === 'medium' ? ' + DES (máx. 2)' : a.type === 'none' ? ' + DES' : ''}${a.str ? ` (FOR ${a.str})` : ''}${a.stealth ? ', desvantagem em Furtividade' : ''} | ${a.weight || 0} |`),
  '| — | Escudo (`shield: true`) | — | +2 | 6 |', '',
  '### Itens comuns (nome e peso sugeridos)', '', '| Nome | Peso (lb) |', '|---|---|', ...GEAR.map(([n, w]) => `| ${n} | ${w} |`), '',
  '### Moedas (`coins`)', '', ...D.COINS.map(c => `- ${code(c.id)} = ${c.full} (${c.name}) — vale ${c.gp} PO`), '');

// Ataques
out('## 9. Ataques (`attacks`)', '',
  'Arma do catálogo — o app calcula acerto e dano sozinho:',
  '```json', '{ "id": "", "weaponId": "rapier", "name": "Rapieira de aço negro" }', '```',
  'Campos opcionais: `"magic": 1` (arma +1), `"versatile": true` (usar com duas mãos), `"extraDmg": "1d6"` (dano extra), `"hitBonus"`/`"dmgBonus"` (números), `"ability": "dex"` (forçar atributo), `"prof": "yes"`/`"no"` (forçar proficiência).', '',
  'Ataque desarmado: `{ "id": "", "weaponId": "unarmed", "name": "Ataque Desarmado" }`.', '',
  'Ataque personalizado (garra, arma homebrew):',
  '```json', '{ "id": "", "name": "Garras", "dmg": "1d6", "dtype": "Cortante", "ability": "str" }', '```', '');

// Magias
out('## 10. Magias (`spells`)', '',
  'Formato de cada magia (copie `name`, `level`, `school` do catálogo abaixo; os demais textos podem ficar vazios — o app mostra os detalhes oficiais pelo `cat`):',
  '```json', '{ "id": "", "cat": "fireball", "source": "class", "prepared": true, "name": "Bola de Fogo", "level": 3, "school": "Evocação", "time": "", "range": "", "dur": "", "conc": false, "ritual": false, "notes": "" }', '```',
  '- `cat`: código do catálogo (abaixo). Para magia fora do catálogo, deixe `cat: ""` e preencha os textos.',
  '- `source`:',
  '  - `"class"` — magia da classe: conta nos limites da seção 6 e precisa estar na lista da classe;',
  '  - `"always"` — sempre preparada (magias de subclasse ou características, como Marca do Caçador do Patrulheiro);',
  '  - `"extra"` — de espécie, talento ou item (ex.: Luz do Aasimar, Iniciado em Magia). Não conta nos limites.',
  '- `prepared`: truques sempre `true`; para `"class"`, marque `true` só até o limite; `"always"` e `"extra"` usam `true`.',
  '- `level`: 0 = truque. Não escolha magias acima do nível máximo da classe.',
  '- Listas: Cavaleiro Arcano e Trapaceiro Arcano usam a lista de Mago. Bardo a partir do nível 10 pode escolher também das listas de Clérigo, Druida e Mago.', '',
  `### Catálogo (${D.SPELLS.length} magias do SRD 5.2)`, '');
for (let lv = 0; lv <= 9; lv++) {
  const arr = D.SPELLS.filter(s => s.level === lv);
  out(`#### ${lv === 0 ? 'Truques' : lv + 'º nível'} (${arr.length})`, '', '| Código (`cat`) | Nome | Inglês | Escola | Listas |', '|---|---|---|---|---|',
    ...arr.map(s => `| ${code(s.id)} | ${s.name} | ${s.en} | ${s.school} | ${s.classes.map(c => listNames[c]).join(', ')} |`), '');
}

// Checklist e exemplo
out('## 11. Checklist antes de importar', '',
  '- [ ] JSON válido (sem comentários, sem vírgula sobrando, aspas duplas).',
  '- [ ] `species`, `background`, `classId`, `subclass` e todos os códigos existem neste manual.',
  '- [ ] `classSkills` tem exatamente a quantidade da classe e não repete perícias do antecedente.',
  '- [ ] Especializações (`skillProf` = 2) dentro do limite da classe.',
  '- [ ] Truques e magias preparadas `"class"` dentro da tabela; nenhuma magia acima do nível máximo.',
  '- [ ] `hp.current` é `null`.',
  '- [ ] Cada arma tem `weaponId` no inventário e um ataque em `attacks`.',
  '- [ ] Aumentos de Atributo em `abilityExtra` batem com talentos `asi` em `feats`.', '');

const ex = D.newSheet();
Object.assign(ex, { id: '', createdAt: 0, updatedAt: 0, name: 'Exemplo', level: 1, species: 'elf', speciesChoices: { lineage: 'high', keen: 'perception' },
  background: 'sage', bgMode: '21', bg2: 'int', bg1: 'con', classId: 'wizard', classSkills: ['investigation', 'insight'],
  abilities: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, languages: ['Comum', 'Élfico', 'Dracônico'],
  attacks: [{ id: '', weaponId: 'dagger', name: 'Adaga' }],
  inventory: [{ id: '', name: 'Adaga', weaponId: 'dagger', qty: 2, weight: 1, equipped: true, notes: '' }, { id: '', name: 'Grimório', qty: 1, weight: 3, equipped: false, notes: '' }],
  spells: [['fire-bolt', true], ['mage-hand', true], ['light', true], ['magic-missile', true], ['shield', true], ['mage-armor', true], ['sleep', true], ['detect-magic', false], ['feather-fall', false]]
    .map(([id, p]) => { const s = D.SPELLS.find(x => x.id === id); return { id: '', cat: id, source: 'class', prepared: p, name: s.name, level: s.level, school: s.school, time: '', range: '', dur: '', conc: false, ritual: false, notes: '' }; }),
  coins: { pc: 0, pp: 0, pe: 0, po: 15, pl: 0 } });
ex.bio.backstory = 'Uma aprendiz de biblioteca que fugiu com um grimório proibido.';
out('## 12. Exemplo mínimo (Elfa Maga nível 1)', '',
  'Repare: 3 truques e 4 magias preparadas (limite do Mago 1), mais 2 magias só no grimório (`prepared: false`), totalizando 6.', '',
  '```json', JSON.stringify({ app: 'grimorio-fichas', version: 1, exportedAt: '', sheets: [ex] }, null, 2), '```', '');

fs.writeFileSync(path.join(root, 'exemplos/MANUAL-TEMPLATE.md'), L.join('\n'));
console.log(`exemplos/MANUAL-TEMPLATE.md: ${L.length} linhas`);
