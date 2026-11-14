# Manual do template de ficha — Grimório de Fichas (D&D 5e, regras de 2024)

> Gerado automaticamente a partir dos dados do app (`node tools/gerar-manual.js`). Todos os códigos abaixo são exatamente os que o app aceita.

Este manual explica como preencher o arquivo `template-ficha.json` para importar um personagem no Grimório (botão **Importar** na lista de fichas).
Ele foi escrito para ser colado num chat com um assistente de IA junto com o template.

## 1. Instruções para o assistente (cole isto no chat)

```text
Você vai me ajudar a criar um personagem de D&D 5e usando as regras de 2024 (Livro do Jogador 2024)
e, no final, gerar um arquivo JSON para o app "Grimório de Fichas". Siga o manual anexo:
1. Converse comigo para definir espécie, antecedente, classe, nível, atributos, perícias, equipamento, magias e história.
2. Use SOMENTE os códigos (ids) listados no manual para espécie, antecedente, classe, subclasse, perícias, armas, armaduras, talentos e magias.
3. Respeite os limites do nível: quantidade de perícias da classe, especializações, truques, magias preparadas e nível máximo de magia.
4. Escreva todo texto livre (nome, história, notas, nomes de itens) em português.
5. No final, responda com o JSON completo e válido, no formato { "app": "grimorio-fichas", "version": 1, "sheets": [ ... ] },
   sem comentários dentro do JSON, para eu salvar como arquivo .json e importar.
6. Se a ficha original for de outra edição (ex.: 2014), adapte para 2024 e me diga o que mudou.
```

## 2. Estrutura do arquivo

```json
{
  "app": "grimorio-fichas",
  "version": 1,
  "exportedAt": "",
  "sheets": [ { ...ficha... } ]
}
```

- `sheets` é uma lista: dá para colocar vários personagens no mesmo arquivo.
- Também são aceitos: um array de fichas (`[ {...}, {...} ]`) ou uma ficha sozinha (`{...}`).
- A ficha precisa ter pelo menos o objeto `abilities`; o resto pode faltar e o app completa com o padrão.
- JSON não aceita comentários nem vírgula sobrando no fim de listas.

## 3. Campos da ficha

| Campo | Tipo | O que colocar |
|---|---|---|
| `id` | texto | Pode ficar `""`: o app gera um. Se repetir o id de uma ficha que já existe, ela só é substituída se `updatedAt` for maior. |
| `createdAt`, `updatedAt` | número | Data em milissegundos (Unix). Pode ser `0`. |
| `name` | texto | Nome do personagem. |
| `player` | texto | Nome do jogador. |
| `photo` | texto | Deixe `""` (a foto é adicionada no app). |
| `level` | número | 1 a 20. |
| `xp` | número | Pontos de experiência. Mínimo por nível: 1→0, 2→300, 3→900, 4→2700, 5→6500, 6→14000, 7→23000, 8→34000, 9→48000, 10→64000, 11→85000, 12→100000, 13→120000, 14→140000, 15→165000, 16→195000, 17→225000, 18→265000, 19→305000, 20→355000. |
| `alignment` | texto | Um destes ou `""`: `Leal e Bom`, `Neutro e Bom`, `Caótico e Bom`, `Leal e Neutro`, `Neutro`, `Caótico e Neutro`, `Leal e Mau`, `Neutro e Mau`, `Caótico e Mau`. |
| `species` | código | Ver seção 4. |
| `speciesChoices` | objeto | Escolhas da espécie (seção 4). Ex.: `{ "lineage": "high", "keen": "perception" }`. |
| `size` | texto | `"Médio"` ou `"Pequeno"` (só para espécies que deixam escolher); senão `""`. |
| `background` | código | Ver seção 5. |
| `bgMode` | texto | `"21"` = +2 num atributo e +1 em outro; `"111"` = +1 nos três atributos do antecedente. |
| `bg2`, `bg1` | código de atributo | Com `bgMode: "21"`: qual recebe +2 e qual recebe +1 (diferentes, e entre os 3 do antecedente). |
| `classId` | código | Ver seção 6. |
| `subclass` | código | Subclasse (a partir do nível 3), ou `""`. |
| `classChoices` | objeto | Escolhas da classe (Clérigo e Druida têm `order`). Ex.: `{ "order": "protector" }`. |
| `classSkills` | lista de códigos | Perícias escolhidas da lista da classe (quantidade exata da classe). Não repita as do antecedente. |
| `abilityMethod` | texto | `"pointbuy"`, `"standard"` ou `"manual"` (rolagem). |
| `abilities` | objeto | Valores **base** (antes do antecedente): `{ "str", "dex", "con", "int", "wis", "cha" }`. |
| `abilityExtra` | objeto | Bônus extras por atributo (Aumentos de Atributo, talentos, itens). Mesmo formato. |
| `saveProf` | objeto | Proficiências de salvaguarda **além** das da classe. Ex.: `{ "wis": true }` (talento Resiliente). |
| `saveBonus` | número | Bônus em todas as salvaguardas (itens mágicos). Normalmente `0`. |
| `skillProf` | objeto | Perícia → `1` (proficiente, vinda de talento/outra fonte) ou `2` (especialização). Ex.: `{ "stealth": 2 }`. |
| `extraSkills`, `extraExpertise` | número | Proficiências/especializações extras dadas pelo mestre. Normalmente `0`. |
| `hp` | objeto | `{ "current": null, "temp": 0, "maxOverride": null, "bonus": 0 }`. **Use `null` em `current`** (= PV cheios). `maxOverride` só se a mesa usar PV rolados. |
| `hitDiceUsed` | número | Dados de vida gastos. Normalmente `0`. |
| `deathSaves` | objeto | `{ "s": 0, "f": 0 }`. |
| `exhaustion` | número | 0 a 6. |
| `inspiration` | sim/não | Inspiração Heroica. |
| `conditions` | lista | Condições atuais: `Agarrado`, `Amedrontado`, `Atordoado`, `Caído`, `Cego`, `Contido`, `Enfeitiçado`, `Envenenado`, `Incapacitado`, `Inconsciente`, `Invisível`, `Paralisado`, `Petrificado`, `Surdo`. Normalmente `[]`. |
| `armor` | código | Armadura vestida (seção 8) ou `"none"`. |
| `shield` | sim/não | Usa escudo. |
| `acBonus`, `initBonus`, `speedBonus` | número | Bônus extras de CA, iniciativa e deslocamento (em pés, múltiplos de 5). |
| `attacks` | lista | Ataques (seção 9). |
| `mastery` | objeto | Armas com Maestria ativa: `{ "rapier": true }` (só classes com Maestria). |
| `spellAbility` | código | Deixe `""` (usa o da classe). Só para quem não é conjurador e tem magias de talento/espécie: `"int"`, `"wis"` ou `"cha"`. |
| `spells` | lista | Magias (seção 10). |
| `slotsUsed` | lista | 10 números: `[0,0,0,0,0,0,0,0,0,0]`. |
| `pactUsed` | número | `0`. |
| `resUsed` | objeto | `{}` (usos de recursos gastos). |
| `customRes` | lista | Recursos personalizados: `{ "id": "", "name": "Varinha", "max": 3, "reset": "long" }` (`reset`: `"long"` ou `"short"`). |
| `inventory` | lista | Itens (seção 8). |
| `coins` | objeto | `{ "pc": 0, "pp": 0, "pe": 0, "po": 0, "pl": 0 }` = cobre, prata, electro, ouro, platina. |
| `feats` | lista | Talentos **adicionais** (seção 7). Não repita o talento do antecedente. |
| `languages` | lista de textos | Sempre inclua "Comum" + 2 à escolha. Sugestões: "Comum", "Língua de Sinais Comum", "Dracônico", "Anão", "Élfico", "Gigante", "Gnômico", "Goblin", "Halfling", "Orc", "Abissal", "Celestial", "Dialeto Subterrâneo", "Druídico", "Gíria de Ladrão", "Infernal", "Primordial", "Silvestre", "Subcomum". |
| `toolProfs` | texto | Ferramentas/proficiências extras em texto livre. As do antecedente e da classe já aparecem sozinhas. |
| `otherProfs` | texto | Livre. |
| `bio` | objeto | Textos livres: `age`, `height`, `weight`, `eyes`, `hair`, `skin`, `gender`, `faith`, `appearance`, `personality`, `ideals`, `bonds`, `flaws`, `backstory`, `allies`, `notes`. |
| `equipAdded` | objeto | `{}`. |

### Atributos e perícias

| Código | Atributo |
|---|---|
| `str` | Força (FOR) |
| `dex` | Destreza (DES) |
| `con` | Constituição (CON) |
| `int` | Inteligência (INT) |
| `wis` | Sabedoria (SAB) |
| `cha` | Carisma (CAR) |

| Código | Perícia | Atributo |
|---|---|---|
| `acrobatics` | Acrobacia | DES |
| `animal` | Adestrar Animais | SAB |
| `arcana` | Arcanismo | INT |
| `athletics` | Atletismo | FOR |
| `performance` | Atuação | CAR |
| `deception` | Enganação | CAR |
| `stealth` | Furtividade | DES |
| `history` | História | INT |
| `intimidation` | Intimidação | CAR |
| `insight` | Intuição | SAB |
| `investigation` | Investigação | INT |
| `medicine` | Medicina | SAB |
| `nature` | Natureza | INT |
| `perception` | Percepção | SAB |
| `persuasion` | Persuasão | CAR |
| `sleight` | Prestidigitação | DES |
| `religion` | Religião | INT |
| `survival` | Sobrevivência | SAB |

### Como montar os atributos

- **Compra de pontos** (`"pointbuy"`): cada valor base entre 8 e 15, total de até 27 pontos. Custos: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9.
- **Arranjo padrão** (`"standard"`): distribua 15, 14, 13, 12, 10, 8, um valor por atributo.
- **Rolagem** (`"manual"`): valores base de 3 a 18.
- O antecedente soma +2/+1 ou +1/+1/+1 em cima da base (campos `bgMode`, `bg2`, `bg1`).
- Aumentos de Atributo de nível (4, 8, 12, 16, 19 — Guerreiro também 6 e 14, Ladino também 10) vão em `abilityExtra` e devem ter um talento `asi` correspondente em `feats`.
- Nenhum atributo final passa de 20 (exceto Dádivas Épicas e as capstones de nível 20 de Bárbaro e Monge, que o app soma sozinho).

## 4. Espécies (`species`)

### `aasimar` — Aasimar
Tamanho: Médio ou Pequeno (use `size`) · Deslocamento: 30 pés · Visão no escuro: 60

### `dragonborn` — Draconato
Tamanho: Médio · Deslocamento: 30 pés · Visão no escuro: 60
- `speciesChoices.ancestry` (Ancestralidade Dracônica): `black` = Negro (Ácido); `blue` = Azul (Elétrico); `brass` = Latão (Fogo); `bronze` = Bronze (Elétrico); `copper` = Cobre (Ácido); `gold` = Ouro (Fogo); `green` = Verde (Veneno); `red` = Vermelho (Fogo); `silver` = Prata (Frio); `white` = Branco (Frio)

### `dwarf` — Anão
Tamanho: Médio · Deslocamento: 30 pés · Visão no escuro: 120

### `elf` — Elfo
Tamanho: Médio · Deslocamento: 30 pés · Visão no escuro: 60
- `speciesChoices.lineage` (Linhagem Élfica): `drow` = Drow; `high` = Alto Elfo; `wood` = Elfo da Floresta
- `speciesChoices.keen` (Sentidos Aguçados (perícia)): `insight` = Intuição; `perception` = Percepção; `survival` = Sobrevivência

### `gnome` — Gnomo
Tamanho: Pequeno · Deslocamento: 30 pés · Visão no escuro: 60
- `speciesChoices.lineage` (Linhagem Gnômica): `forest` = Gnomo da Floresta; `rock` = Gnomo das Rochas

### `goliath` — Golias
Tamanho: Médio · Deslocamento: 35 pés · Visão no escuro: não
- `speciesChoices.ancestry` (Ancestralidade Gigante): `cloud` = Nuvem — Salto das Nuvens; `fire` = Fogo — Queimadura do Fogo; `frost` = Gelo — Arrepio do Gelo; `hill` = Colina — Tombo da Colina; `stone` = Pedra — Resistência da Pedra; `storm` = Tempestade — Trovão da Tempestade

### `halfling` — Halfling
Tamanho: Pequeno · Deslocamento: 30 pés · Visão no escuro: não

### `human` — Humano
Tamanho: Médio ou Pequeno (use `size`) · Deslocamento: 30 pés · Visão no escuro: não
- `speciesChoices.skillful` (Habilidoso (perícia)): código de qualquer perícia.
- `speciesChoices.versatile` (Versátil (talento de origem)): código de um talento de Origem (seção 7), diferente do talento do antecedente.

### `orc` — Orc
Tamanho: Médio · Deslocamento: 30 pés · Visão no escuro: 120

### `tiefling` — Tiefling
Tamanho: Médio ou Pequeno (use `size`) · Deslocamento: 30 pés · Visão no escuro: 60
- `speciesChoices.legacy` (Legado Ínfero): `abyssal` = Abissal; `chthonic` = Ctônico; `infernal` = Infernal

## 5. Antecedentes (`background`)

| Código | Nome | Atributos (`bg2`/`bg1`) | Talento de Origem | Perícias (automáticas) | Ferramenta |
|---|---|---|---|---|---|
| `acolyte` | Acólito | `int`, `wis`, `cha` | `mi-cleric` Iniciado em Magia (Clérigo) | Intuição, Religião | Suprimentos de Caligrafia |
| `artisan` | Artesão | `str`, `dex`, `int` | `crafter` Artífice | Investigação, Persuasão | Ferramentas de Artesão (à escolha) |
| `charlatan` | Charlatão | `dex`, `con`, `cha` | `skilled` Habilidoso | Enganação, Prestidigitação | Kit de Falsificação |
| `criminal` | Criminoso | `dex`, `con`, `int` | `alert` Alerta | Prestidigitação, Furtividade | Ferramentas de Ladrão |
| `entertainer` | Artista | `str`, `dex`, `cha` | `musician` Músico | Acrobacia, Atuação | Instrumento Musical (à escolha) |
| `farmer` | Fazendeiro | `str`, `con`, `wis` | `tough` Robusto | Adestrar Animais, Natureza | Ferramentas de Carpinteiro |
| `guard` | Guarda | `str`, `int`, `wis` | `alert` Alerta | Atletismo, Percepção | Kit de Jogo (à escolha) |
| `guide` | Guia | `dex`, `con`, `wis` | `mi-druid` Iniciado em Magia (Druida) | Furtividade, Sobrevivência | Ferramentas de Cartógrafo |
| `hermit` | Eremita | `con`, `wis`, `cha` | `healer` Curandeiro | Medicina, Religião | Kit de Herbalismo |
| `merchant` | Mercador | `con`, `int`, `cha` | `lucky` Sortudo | Adestrar Animais, Persuasão | Ferramentas de Navegador |
| `noble` | Nobre | `str`, `int`, `cha` | `skilled` Habilidoso | História, Persuasão | Kit de Jogo (à escolha) |
| `sage` | Sábio | `con`, `int`, `wis` | `mi-wizard` Iniciado em Magia (Mago) | Arcanismo, História | Suprimentos de Caligrafia |
| `sailor` | Marinheiro | `str`, `dex`, `wis` | `tavern-brawler` Brigão de Taverna | Acrobacia, Percepção | Ferramentas de Navegador |
| `scribe` | Escriba | `dex`, `int`, `wis` | `skilled` Habilidoso | Investigação, Percepção | Suprimentos de Caligrafia |
| `soldier` | Soldado | `str`, `dex`, `con` | `savage-attacker` Atacante Selvagem | Atletismo, Intimidação | Kit de Jogo (à escolha) |
| `wayfarer` | Andarilho | `dex`, `wis`, `cha` | `lucky` Sortudo | Intuição, Furtividade | Ferramentas de Ladrão |

## 6. Classes (`classId`) e subclasses (`subclass`)

### `barbarian` — Bárbaro
- Dado de Vida d12 · Salvaguardas: FOR, CON · Armaduras: Leve, Média, Escudos · Armas: Simples, Marciais
- `classSkills`: escolha **2** de `animal`, `athletics`, `intimidation`, `nature`, `perception`, `survival`
- Maestria em armas (`mastery`, só em armas com proficiência e que estejam em `attacks`): nível 1: 2 · nível 4: 3 · nível 10: 4 · nível 16: 4
- Subclasses (nível 3+): `berserker` = Caminho do Berserker; `wild-heart` = Caminho do Coração Selvagem; `world-tree` = Caminho da Árvore do Mundo; `zealot` = Caminho do Fanático

### `bard` — Bardo
- Dado de Vida d8 · Salvaguardas: DES, CAR · Armaduras: Leve · Armas: Simples
- `classSkills`: escolha **3** de qualquer perícia
- Especializações (`skillProf` = 2): nível 1: 0 · nível 2: 2 · nível 6: 2 · nível 9: 4
- Subclasses (nível 3+): `dance` = Colégio da Dança; `glamour` = Colégio do Glamour; `lore` = Colégio do Conhecimento; `valor` = Colégio da Bravura

### `cleric` — Clérigo
- Dado de Vida d8 · Salvaguardas: SAB, CAR · Armaduras: Leve, Média, Escudos · Armas: Simples
- `classSkills`: escolha **2** de `history`, `insight`, `medicine`, `persuasion`, `religion`
- `classChoices.order` (Ordem Divina): `protector` = Protetor; `thaumaturge` = Taumaturgo
- Subclasses (nível 3+): `life` = Domínio da Vida; `light` = Domínio da Luz; `trickery` = Domínio da Trapaça; `war` = Domínio da Guerra

### `druid` — Druida
- Dado de Vida d8 · Salvaguardas: INT, SAB · Armaduras: Leve, Escudos · Armas: Simples
- `classSkills`: escolha **2** de `arcana`, `animal`, `insight`, `medicine`, `nature`, `perception`, `religion`, `survival`
- `classChoices.order` (Ordem Primal): `magician` = Mago; `warden` = Guardião
- Subclasses (nível 3+): `land` = Círculo da Terra; `moon` = Círculo da Lua; `sea` = Círculo do Mar; `stars` = Círculo das Estrelas

### `fighter` — Guerreiro
- Dado de Vida d10 · Salvaguardas: FOR, CON · Armaduras: Leve, Média, Pesada, Escudos · Armas: Simples, Marciais
- `classSkills`: escolha **2** de `acrobatics`, `animal`, `athletics`, `history`, `insight`, `intimidation`, `persuasion`, `perception`, `survival`
- Maestria em armas (`mastery`, só em armas com proficiência e que estejam em `attacks`): nível 1: 3 · nível 4: 4 · nível 10: 5 · nível 16: 6
- Subclasses (nível 3+): `battle-master` = Mestre de Batalha; `champion` = Campeão; `eldritch-knight` = Cavaleiro Arcano; `psi-warrior` = Guerreiro Psiônico

### `monk` — Monge
- Dado de Vida d8 · Salvaguardas: FOR, DES · Armaduras: nenhuma · Armas: Simples, Marciais com Leve
- `classSkills`: escolha **2** de `acrobatics`, `athletics`, `history`, `insight`, `religion`, `stealth`
- Subclasses (nível 3+): `mercy` = Guerreiro da Misericórdia; `shadow` = Guerreiro da Sombra; `elements` = Guerreiro dos Elementos; `open-hand` = Guerreiro da Mão Aberta

### `paladin` — Paladino
- Dado de Vida d10 · Salvaguardas: SAB, CAR · Armaduras: Leve, Média, Pesada, Escudos · Armas: Simples, Marciais
- `classSkills`: escolha **2** de `athletics`, `insight`, `intimidation`, `medicine`, `persuasion`, `religion`
- Maestria em armas (`mastery`, só em armas com proficiência e que estejam em `attacks`): nível 1: 2 · nível 4: 2 · nível 10: 2 · nível 16: 2
- Subclasses (nível 3+): `devotion` = Juramento de Devoção; `glory` = Juramento de Glória; `ancients` = Juramento dos Anciões; `vengeance` = Juramento de Vingança

### `ranger` — Patrulheiro
- Dado de Vida d10 · Salvaguardas: FOR, DES · Armaduras: Leve, Média, Escudos · Armas: Simples, Marciais
- `classSkills`: escolha **3** de `animal`, `athletics`, `insight`, `investigation`, `nature`, `perception`, `stealth`, `survival`
- Especializações (`skillProf` = 2): nível 1: 0 · nível 2: 1 · nível 6: 1 · nível 9: 3
- Maestria em armas (`mastery`, só em armas com proficiência e que estejam em `attacks`): nível 1: 2 · nível 4: 2 · nível 10: 2 · nível 16: 2
- Subclasses (nível 3+): `beast-master` = Mestre das Feras; `fey-wanderer` = Andarilho Feérico; `gloom-stalker` = Espreitador Sombrio; `hunter` = Caçador

### `rogue` — Ladino
- Dado de Vida d8 · Salvaguardas: DES, INT · Armaduras: Leve · Armas: Simples, Marciais com Acuidade ou Leve
- `classSkills`: escolha **4** de `acrobatics`, `athletics`, `deception`, `insight`, `intimidation`, `investigation`, `perception`, `persuasion`, `sleight`, `stealth`
- Especializações (`skillProf` = 2): nível 1: 2 · nível 2: 2 · nível 6: 4 · nível 9: 4
- Maestria em armas (`mastery`, só em armas com proficiência e que estejam em `attacks`): nível 1: 2 · nível 4: 2 · nível 10: 2 · nível 16: 2
- Subclasses (nível 3+): `arcane-trickster` = Trapaceiro Arcano; `assassin` = Assassino; `soulknife` = Lâmina da Alma; `thief` = Ladrão

### `sorcerer` — Feiticeiro
- Dado de Vida d6 · Salvaguardas: CON, CAR · Armaduras: nenhuma · Armas: Simples
- `classSkills`: escolha **2** de `arcana`, `deception`, `insight`, `intimidation`, `persuasion`, `religion`
- Subclasses (nível 3+): `aberrant` = Feitiçaria Aberrante; `clockwork` = Feitiçaria Mecânica; `draconic` = Feitiçaria Dracônica; `wild-magic` = Magia Selvagem

### `warlock` — Bruxo
- Dado de Vida d8 · Salvaguardas: SAB, CAR · Armaduras: Leve · Armas: Simples
- `classSkills`: escolha **2** de `arcana`, `deception`, `history`, `intimidation`, `investigation`, `nature`, `religion`
- Subclasses (nível 3+): `archfey` = Patrono Arquifada; `celestial` = Patrono Celestial; `fiend` = Patrono Ínfero; `great-old-one` = Patrono Grande Antigo

### `wizard` — Mago
- Dado de Vida d6 · Salvaguardas: INT, SAB · Armaduras: nenhuma · Armas: Simples
- `classSkills`: escolha **2** de `arcana`, `history`, `insight`, `investigation`, `medicine`, `nature`, `religion`
- Especializações (`skillProf` = 2): nível 1: 0 · nível 2: 1 · nível 6: 1 · nível 9: 1
- Subclasses (nível 3+): `abjurer` = Abjurador; `diviner` = Adivinho; `evoker` = Evocador; `illusionist` = Ilusionista

### Limites de magia por classe e nível

Truques e magias preparadas de origem `"class"` precisam caber nestes números. "Máx." é o maior nível de magia que pode ser escolhido.

| Classe | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bardo | 2/4/1º | 2/5/1º | 2/6/2º | 3/7/2º | 3/9/3º | 3/10/3º | 3/11/4º | 3/12/4º | 3/14/5º | 4/15/5º | 4/16/6º | 4/16/6º | 4/17/7º | 4/17/7º | 4/18/8º | 4/18/8º | 4/19/9º | 4/20/9º | 4/21/9º | 4/22/9º |
| Clérigo | 3/4/1º | 3/5/1º | 3/6/2º | 4/7/2º | 4/9/3º | 4/10/3º | 4/11/4º | 4/12/4º | 4/14/5º | 5/15/5º | 5/16/6º | 5/16/6º | 5/17/7º | 5/17/7º | 5/18/8º | 5/18/8º | 5/19/9º | 5/20/9º | 5/21/9º | 5/22/9º |
| Druida | 2/4/1º | 2/5/1º | 2/6/2º | 3/7/2º | 3/9/3º | 3/10/3º | 3/11/4º | 3/12/4º | 3/14/5º | 4/15/5º | 4/16/6º | 4/16/6º | 4/17/7º | 4/17/7º | 4/18/8º | 4/18/8º | 4/19/9º | 4/20/9º | 4/21/9º | 4/22/9º |
| Paladino | 0/2/1º | 0/3/1º | 0/4/1º | 0/5/1º | 0/6/2º | 0/6/2º | 0/7/2º | 0/7/2º | 0/9/3º | 0/9/3º | 0/10/3º | 0/10/3º | 0/11/4º | 0/11/4º | 0/12/4º | 0/12/4º | 0/14/5º | 0/14/5º | 0/15/5º | 0/15/5º |
| Patrulheiro | 0/2/1º | 0/3/1º | 0/4/1º | 0/5/1º | 0/6/2º | 0/6/2º | 0/7/2º | 0/7/2º | 0/9/3º | 0/9/3º | 0/10/3º | 0/10/3º | 0/11/4º | 0/11/4º | 0/12/4º | 0/12/4º | 0/14/5º | 0/14/5º | 0/15/5º | 0/15/5º |
| Feiticeiro | 4/2/1º | 4/4/1º | 4/6/2º | 5/7/2º | 5/9/3º | 5/10/3º | 5/11/4º | 5/12/4º | 5/14/5º | 6/15/5º | 6/16/6º | 6/16/6º | 6/17/7º | 6/17/7º | 6/18/8º | 6/18/8º | 6/19/9º | 6/20/9º | 6/21/9º | 6/22/9º |
| Bruxo | 2/2/1º | 2/3/1º | 2/4/2º | 3/5/2º | 3/6/3º | 3/7/3º | 3/8/4º | 3/9/4º | 3/10/5º | 4/10/5º | 4/11/5º | 4/11/5º | 4/12/5º | 4/12/5º | 4/13/5º | 4/13/5º | 4/14/5º | 4/14/5º | 4/15/5º | 4/15/5º |
| Mago | 3/4/1º | 3/5/1º | 3/6/2º | 4/7/2º | 4/9/3º | 4/10/3º | 4/11/4º | 4/12/4º | 4/14/5º | 5/15/5º | 5/16/6º | 5/16/6º | 5/17/7º | 5/18/7º | 5/19/8º | 5/21/8º | 5/22/9º | 5/23/9º | 5/24/9º | 5/25/9º |
| Guerreiro (Cavaleiro Arcano) | — | — | 2/3/1º | 2/4/1º | 2/4/1º | 2/4/1º | 2/5/2º | 2/6/2º | 2/6/2º | 3/7/2º | 3/8/2º | 3/8/2º | 3/9/3º | 3/10/3º | 3/10/3º | 3/11/3º | 3/11/3º | 3/11/3º | 3/12/4º | 3/13/4º |
| Ladino (Trapaceiro Arcano) | — | — | 3/3/1º | 3/4/1º | 3/4/1º | 3/4/1º | 3/5/2º | 3/6/2º | 3/6/2º | 4/7/2º | 4/8/2º | 4/8/2º | 4/9/3º | 4/10/3º | 4/10/3º | 4/11/3º | 4/11/3º | 4/11/3º | 4/12/4º | 4/13/4º |

Formato de cada célula: **truques / magias preparadas / nível máximo**. O Mago pode ter mais magias no grimório (6 no nível 1 + 2 por nível), mas só marca como `prepared` a quantidade da tabela.

## 7. Talentos (`feats`)

Formato de cada item: `{ "id": "", "featId": "alert", "note": "Nível 4", "name": "", "desc": "" }`.
- `featId`: um código da tabela abaixo. `note`: de onde veio (ex.: "Nível 4").
- Talento inventado/homebrew: deixe `featId` vazio e preencha `name` e `desc`.
- O talento do antecedente e o do Humano (`speciesChoices.versatile`) **não** entram aqui e não ocupam vaga.
- **Vagas de talento** (Geral, Origem, Aumento de Atributo ou Dádiva Épica): uma em cada nível 4, 8, 12, 16 e 19; Guerreiro também 6 e 14; Ladino também 10. Ex.: Guerreiro nível 6 = 2 talentos; Mago nível 3 = nenhum.
- **Vagas de Estilo de Luta**: Guerreiro 1 (Campeão nível 7+: 2); Paladino e Patrulheiro 1 a partir do nível 2; demais classes 0.
- Não repita talentos, exceto `asi`, `skilled`, `mi-cleric`, `mi-druid`, `mi-wizard` e `elemental-adept`.
- O app trava talentos sem vaga ou sem pré-requisito e mostra aviso nos que já estiverem na ficha fora da regra.

| Código | Nome | Categoria | Pré-requisito | Efeito |
|---|---|---|---|---|
| `alert` | Alerta | Origem | — | Some seu Bônus de Proficiência à Iniciativa. Pode trocar a iniciativa com um aliado voluntário. |
| `crafter` | Artífice | Origem | — | Proficiência em 3 Ferramentas de Artesão; 20% de desconto em itens não mágicos; criação rápida de itens após descanso longo. |
| `healer` | Curandeiro | Origem | — | Ação Utilizar com Kit de Curandeiro: a criatura gasta um Dado de Vida e recupera PV (+BP). Rerola 1s em dados de cura. |
| `lucky` | Sortudo | Origem | — | Pontos de Sorte = BP por descanso longo. Gaste 1 para ter Vantagem num Teste de D20 ou impor Desvantagem num ataque contra você. |
| `mi-cleric` | Iniciado em Magia (Clérigo) | Origem | — | 2 truques e 1 magia de 1º nível da lista de Clérigo (INT, SAB ou CAR). A magia de 1º nível pode ser lançada 1x por descanso longo sem espaço. |
| `mi-druid` | Iniciado em Magia (Druida) | Origem | — | 2 truques e 1 magia de 1º nível da lista de Druida (INT, SAB ou CAR). A magia de 1º nível pode ser lançada 1x por descanso longo sem espaço. |
| `mi-wizard` | Iniciado em Magia (Mago) | Origem | — | 2 truques e 1 magia de 1º nível da lista de Mago (INT, SAB ou CAR). A magia de 1º nível pode ser lançada 1x por descanso longo sem espaço. |
| `musician` | Músico | Origem | — | Proficiência em 3 instrumentos musicais. Ao terminar um descanso, concede Inspiração Heroica a aliados (até BP) que ouviram sua música. |
| `savage-attacker` | Atacante Selvagem | Origem | — | Uma vez por turno, ao acertar com uma arma, role os dados de dano duas vezes e use o maior. |
| `skilled` | Habilidoso | Origem | — | Proficiência em qualquer combinação de 3 perícias ou ferramentas (marque-as na lista de perícias). |
| `tavern-brawler` | Brigão de Taverna | Origem | — | Ataque Desarmado: 1d4 + FOR; rerola 1s no dano; proficiência com armas improvisadas; empurrar 1,5 m uma vez por turno. |
| `tough` | Robusto | Origem | — | PV máximos +2 por nível (já somado). |
| `fs-archery` | Estilo: Arquearia | Estilo de Luta | Estilo de Luta (classe) | +2 nas jogadas de ataque com armas à distância (já somado). |
| `fs-blind` | Estilo: Combate às Cegas | Estilo de Luta | Estilo de Luta (classe) | Percepção às Cegas 3 m. |
| `fs-defense` | Estilo: Defesa | Estilo de Luta | Estilo de Luta (classe) | +1 na CA enquanto usar armadura (já somado). |
| `fs-dueling` | Estilo: Duelismo | Estilo de Luta | Estilo de Luta (classe) | +2 de dano com arma corpo a corpo em uma mão e nenhuma outra arma (aparece como lembrete nos ataques com armas de uma mão ou versáteis). |
| `fs-gwf` | Estilo: Armas Grandes | Estilo de Luta | Estilo de Luta (classe) | Trate 1 e 2 nos dados de dano de armas de Duas Mãos/Versáteis como 3. |
| `fs-interception` | Estilo: Interceptação | Estilo de Luta | Estilo de Luta (classe) | Reação: reduz dano a um aliado próximo em 1d10 + BP. |
| `fs-protection` | Estilo: Proteção | Estilo de Luta | Estilo de Luta (classe) | Reação com escudo: impõe Desvantagem a um ataque contra aliado próximo. |
| `fs-thrown` | Estilo: Armas de Arremesso | Estilo de Luta | Estilo de Luta (classe) | +2 de dano com armas de Arremesso em ataques à distância. |
| `fs-twf` | Estilo: Duas Armas | Estilo de Luta | Estilo de Luta (classe) | Some o modificador ao dano do ataque extra da propriedade Leve. |
| `fs-unarmed` | Estilo: Luta Desarmada | Estilo de Luta | Estilo de Luta (classe) | Ataque Desarmado 1d6 + FOR (1d8 sem armas/escudo); 1d4 a criatura agarrada. |
| `asi` | Aumento no Valor de Atributo | Geral | Nível 4+ | +2 em um atributo ou +1 em dois (aplique em "Bônus extra" dos atributos). |
| `actor` | Ator | Geral | Nível 4+; CAR 13+ | +1 CAR. Vantagem em Enganação/Atuação ao se passar por outro; imita sons. |
| `athlete` | Atleta | Geral | Nível 4+; FOR ou DES 13+ | +1 FOR ou DES. Deslocamento de escalada; levantar gasta 1,5 m; salto com corrida após 1,5 m. |
| `charger` | Investida | Geral | Nível 4+; FOR ou DES 13+ | +1 FOR ou DES. Disparada +3 m; ataque após mover 3 m em linha reta: +1d8 ou empurrar 3 m. |
| `chef` | Chef | Geral | Nível 4+ | +1 CON ou SAB. Prof. utensílios de cozinheiro; petiscos dão PV temporários; cura extra em descanso curto. |
| `crossbow-expert` | Especialista em Bestas | Geral | Nível 4+; DES 13+ | +1 DES. Ignora Recarga; sem Desvantagem corpo a corpo; mod. no ataque extra Leve. |
| `crusher` | Esmagador | Geral | Nível 4+; FOR ou CON 13+ | +1 FOR ou CON. Empurra 1,5 m com dano Contundente; críticos dão Vantagem aos aliados. |
| `defensive-duelist` | Duelista Defensivo | Geral | Nível 4+; DES 13+ | +1 DES. Reação com arma Acuidade: +BP na CA contra um ataque. |
| `dual-wielder` | Combatente com Duas Armas | Geral | Nível 4+; FOR ou DES 13+ | +1 FOR ou DES. Ataque extra com arma não Leve; sacar duas armas. |
| `durable` | Durável | Geral | Nível 4+ | +1 CON. Vantagem em salvaguardas contra morte; Ação Bônus para gastar Dado de Vida. |
| `elemental-adept` | Adepto Elemental | Geral | Nível 4+; Conjuração ou Magia de Pacto | +1 INT, SAB ou CAR. Ignora resistência ao tipo escolhido; 1s viram 2s. |
| `fey-touched` | Tocado pelas Fadas | Geral | Nível 4+ | +1 INT, SAB ou CAR. Passo Nebuloso + uma magia de 1º nível de Adivinhação/Encantamento. |
| `grappler` | Agarrador | Geral | Nível 4+; FOR ou DES 13+ | +1 FOR ou DES. Soco e Agarrar no mesmo ataque; Vantagem contra agarrados. |
| `great-weapon-master` | Mestre de Armas Grandes | Geral | Nível 4+; FOR 13+ | +1 FOR. Dano extra = BP com armas Pesadas; ataque bônus após crítico ou abate. |
| `heavily-armored` | Armadura Pesada | Geral | Nível 4+; treinamento em armadura média | +1 FOR ou CON. Treinamento com armaduras pesadas. |
| `heavy-armor-master` | Mestre de Armadura Pesada | Geral | Nível 4+; treinamento em armadura pesada | +1 FOR ou CON. Reduz dano físico em BP usando armadura pesada. |
| `inspiring-leader` | Líder Inspirador | Geral | Nível 4+; SAB ou CAR 13+ | +1 SAB ou CAR. Após descanso, até 6 aliados ganham PV temporários = nível + mod. |
| `keen-mind` | Mente Afiada | Geral | Nível 4+; INT 13+ | +1 INT. Proficiência/Especialização em uma perícia de INT; Estudar como Ação Bônus. |
| `lightly-armored` | Armadura Leve | Geral | Nível 4+ | +1 FOR ou DES. Treinamento com armaduras leves e escudos. |
| `mage-slayer` | Matador de Magos | Geral | Nível 4+ | +1 FOR ou DES. Quebra Concentração; passar automaticamente em salvaguarda mental 1x. |
| `martial-weapon-training` | Treinamento com Armas Marciais | Geral | Nível 4+ | +1 FOR ou DES. Proficiência com armas marciais. |
| `medium-armor-master` | Mestre de Armadura Média | Geral | Nível 4+; treinamento em armadura média | +1 FOR ou DES. DES máx. 3 na armadura média. |
| `moderately-armored` | Armadura Média | Geral | Nível 4+; treinamento em armadura leve | +1 FOR ou DES. Treinamento com armaduras médias. |
| `mounted-combatant` | Combatente Montado | Geral | Nível 4+ | +1 FOR, DES ou SAB. Vantagem contra criaturas não montadas menores que a montaria. |
| `observant` | Observador | Geral | Nível 4+; INT ou SAB 13+ | +1 INT ou SAB. Proficiência/Especialização em Intuição, Investigação ou Percepção; Busca como Ação Bônus. |
| `piercer` | Perfurador | Geral | Nível 4+; FOR ou DES 13+ | +1 FOR ou DES. Rerola um dado de dano Perfurante; crítico +1 dado. |
| `poisoner` | Envenenador | Geral | Nível 4+ | +1 DES ou INT. Ignora resistência a Veneno; prepara venenos. |
| `polearm-master` | Mestre de Armas de Haste | Geral | Nível 4+; FOR ou DES 13+ | +1 FOR ou DES. Ataque bônus com o cabo (1d4); ataque de oportunidade ao entrar no alcance. |
| `resilient` | Resiliente | Geral | Nível 4+ | +1 em um atributo e proficiência na salvaguarda dele (marque a salvaguarda). |
| `ritual-caster` | Conjurador Ritualístico | Geral | Nível 4+; INT ou SAB ou CAR 13+ | +1 INT, SAB ou CAR. Magias de ritual preparadas; ritual rápido 1x/descanso longo. |
| `sentinel` | Sentinela | Geral | Nível 4+; FOR ou DES 13+ | +1 FOR ou DES. Ataques de oportunidade param movimento; reage a ataques em aliados. |
| `shadow-touched` | Tocado pelas Sombras | Geral | Nível 4+ | +1 INT, SAB ou CAR. Invisibilidade + uma magia de 1º nível de Ilusão/Necromancia. |
| `sharpshooter` | Atirador de Elite | Geral | Nível 4+; DES 13+ | +1 DES. Ignora cobertura parcial; sem Desvantagem em longo alcance ou corpo a corpo. |
| `shield-master` | Mestre de Escudo | Geral | Nível 4+; treinamento em escudos | +1 FOR. Pancada com escudo; Evasão com escudo em salvaguardas de DES. |
| `skill-expert` | Perito | Geral | Nível 4+ | +1 em qualquer atributo. Proficiência em uma perícia e Especialização em outra. |
| `skulker` | Espreitador | Geral | Nível 4+; DES 13+ | +1 DES. Percepção às Cegas 3 m; não se revela ao errar ataque. |
| `slasher` | Retalhador | Geral | Nível 4+; FOR ou DES 13+ | +1 FOR ou DES. Reduz deslocamento em 3 m; críticos impõem Desvantagem. |
| `speedy` | Veloz | Geral | Nível 4+; DES ou CON 13+ | +1 DES ou CON. +3 m de deslocamento (já somado); Disparada ignora terreno difícil. |
| `spell-sniper` | Franco-Atirador Mágico | Geral | Nível 4+; Conjuração ou Magia de Pacto | +1 INT, SAB ou CAR. +18 m de alcance em magias; ignora cobertura parcial. |
| `telekinetic` | Telecinético | Geral | Nível 4+ | +1 INT, SAB ou CAR. Mãos Mágicas invisível; empurrar 1,5 m como Ação Bônus. |
| `telepathic` | Telepático | Geral | Nível 4+ | +1 INT, SAB ou CAR. Telepatia 18 m; Detectar Pensamentos 1x/descanso longo. |
| `war-caster` | Conjurador de Guerra | Geral | Nível 4+; Conjuração ou Magia de Pacto | +1 INT, SAB ou CAR. Vantagem em Concentração; magia como ataque de oportunidade. |
| `weapon-master` | Mestre de Armas | Geral | Nível 4+; FOR ou DES 13+ | +1 FOR ou DES. Usa a propriedade de Maestria de uma arma adicional. |
| `boon-combat` | Dádiva da Proeza em Combate | Dádiva Épica | Nível 19+ | +1 em atributo (máx. 30). 1x por turno, transforma um erro em acerto. |
| `boon-dimensional` | Dádiva da Viagem Dimensional | Dádiva Épica | Nível 19+ | +1 em atributo (máx. 30). Teleporte 9 m após Atacar ou Magia. |
| `boon-fate` | Dádiva do Destino | Dádiva Épica | Nível 19+ | +1 em atributo (máx. 30). Adiciona/subtrai 2d4 de um Teste de D20. |
| `boon-fortitude` | Dádiva da Fortitude | Dádiva Épica | Nível 19+ | +1 em atributo (máx. 30). +40 PV máximos. |
| `boon-irresistible` | Dádiva da Ofensiva Irresistível | Dádiva Épica | Nível 19+ | +1 FOR ou DES (máx. 30). Ignora resistência a dano físico. |
| `boon-recovery` | Dádiva da Recuperação | Dádiva Épica | Nível 19+ | +1 em atributo (máx. 30). Evita cair a 0 PV 1x; dado de cura 10d10. |
| `boon-skill` | Dádiva da Perícia | Dádiva Épica | Nível 19+ | +1 em atributo (máx. 30). Proficiência em todas as perícias e Especialização em uma. |
| `boon-speed` | Dádiva da Velocidade | Dádiva Épica | Nível 19+ | +1 em atributo (máx. 30). +9 m de deslocamento. |
| `boon-spell-recall` | Dádiva da Recordação de Magia | Dádiva Épica | Nível 19+ | +1 INT, SAB ou CAR (máx. 30). Lança magia de 1º–4º nível sem gastar espaço 1x. |
| `boon-night` | Dádiva do Espírito Noturno | Dádiva Épica | Nível 19+ | +1 em atributo (máx. 30). Invisível na Penumbra/Escuridão. |
| `boon-truesight` | Dádiva da Visão Verdadeira | Dádiva Épica | Nível 19+ | +1 em atributo (máx. 30). Visão Verdadeira 18 m. |

## 8. Equipamento

Formato de cada item de `inventory`: `{ "id": "", "name": "Corda (15 m)", "qty": 1, "weight": 5, "equipped": false, "notes": "" }`.
- `weight` é em **libras (lb)** por unidade. `equipped`: está em uso.
- Para armas, acrescente `"weaponId": "<código>"` e crie também o ataque correspondente em `attacks` (seção 9).
- A armadura vestida vai no campo `armor` da ficha (e pode estar no inventário com `equipped: true`). Escudo: `shield: true`.
- Itens fora destas listas são permitidos: use um nome em português e um peso aproximado.

### Armas (`weaponId`)

| Código | Nome | Categoria | Dano | Propriedades | Maestria | Peso (lb) |
|---|---|---|---|---|---|---|
| `club` | Clava | Simples corpo a corpo | 1d4 Contundente | Leve | Lentidão | 2 |
| `dagger` | Adaga | Simples corpo a corpo | 1d4 Perfurante | Acuidade, Leve, Arremesso (6/18 m) | Ágil | 1 |
| `greatclub` | Clava Grande | Simples corpo a corpo | 1d8 Contundente | Duas Mãos | Empurrar | 10 |
| `handaxe` | Machadinha | Simples corpo a corpo | 1d6 Cortante | Leve, Arremesso (6/18 m) | Irritar | 2 |
| `javelin` | Azagaia | Simples corpo a corpo | 1d6 Perfurante | Arremesso (9/36 m) | Lentidão | 2 |
| `light-hammer` | Martelo Leve | Simples corpo a corpo | 1d4 Contundente | Leve, Arremesso (6/18 m) | Ágil | 2 |
| `mace` | Maça | Simples corpo a corpo | 1d6 Contundente | — | Drenar | 4 |
| `quarterstaff` | Bordão | Simples corpo a corpo | 1d6 Contundente | Versátil (1d8) | Derrubar | 4 |
| `sickle` | Foice Curta | Simples corpo a corpo | 1d4 Cortante | Leve | Ágil | 2 |
| `spear` | Lança | Simples corpo a corpo | 1d6 Perfurante | Arremesso (6/18 m), Versátil (1d8) | Drenar | 3 |
| `dart` | Dardo | Simples à distância | 1d4 Perfurante | Acuidade, Arremesso (6/18 m) | Irritar | 0.25 |
| `light-crossbow` | Besta Leve | Simples à distância | 1d8 Perfurante | Munição (24/96 m), Recarga, Duas Mãos | Lentidão | 5 |
| `shortbow` | Arco Curto | Simples à distância | 1d6 Perfurante | Munição (24/96 m), Duas Mãos | Irritar | 2 |
| `sling` | Funda | Simples à distância | 1d4 Contundente | Munição (9/36 m) | Lentidão | 0 |
| `battleaxe` | Machado de Batalha | Marcial corpo a corpo | 1d8 Cortante | Versátil (1d10) | Derrubar | 4 |
| `flail` | Mangual | Marcial corpo a corpo | 1d8 Contundente | — | Drenar | 2 |
| `glaive` | Glaive | Marcial corpo a corpo | 1d10 Cortante | Pesada, Alcance, Duas Mãos | Raspar | 6 |
| `greataxe` | Machado Grande | Marcial corpo a corpo | 1d12 Cortante | Pesada, Duas Mãos | Trespassar | 7 |
| `greatsword` | Espada Grande | Marcial corpo a corpo | 2d6 Cortante | Pesada, Duas Mãos | Raspar | 6 |
| `halberd` | Alabarda | Marcial corpo a corpo | 1d10 Cortante | Pesada, Alcance, Duas Mãos | Trespassar | 6 |
| `lance` | Lança de Montaria | Marcial corpo a corpo | 1d10 Perfurante | Pesada, Alcance, Duas Mãos (exceto montado) | Derrubar | 6 |
| `longsword` | Espada Longa | Marcial corpo a corpo | 1d8 Cortante | Versátil (1d10) | Drenar | 3 |
| `maul` | Malho | Marcial corpo a corpo | 2d6 Contundente | Pesada, Duas Mãos | Derrubar | 10 |
| `morningstar` | Maça Estrela | Marcial corpo a corpo | 1d8 Perfurante | — | Drenar | 4 |
| `pike` | Pique | Marcial corpo a corpo | 1d10 Perfurante | Pesada, Alcance, Duas Mãos | Empurrar | 18 |
| `rapier` | Rapieira | Marcial corpo a corpo | 1d8 Perfurante | Acuidade | Irritar | 2 |
| `scimitar` | Cimitarra | Marcial corpo a corpo | 1d6 Cortante | Acuidade, Leve | Ágil | 3 |
| `shortsword` | Espada Curta | Marcial corpo a corpo | 1d6 Perfurante | Acuidade, Leve | Irritar | 2 |
| `trident` | Tridente | Marcial corpo a corpo | 1d8 Perfurante | Arremesso (6/18 m), Versátil (1d10) | Derrubar | 4 |
| `warhammer` | Martelo de Guerra | Marcial corpo a corpo | 1d8 Contundente | Versátil (1d10) | Empurrar | 5 |
| `war-pick` | Picareta de Guerra | Marcial corpo a corpo | 1d8 Perfurante | Versátil (1d10) | Drenar | 2 |
| `whip` | Chicote | Marcial corpo a corpo | 1d4 Cortante | Acuidade, Alcance | Lentidão | 3 |
| `blowgun` | Zarabatana | Marcial à distância | 1 Perfurante | Munição (7,5/30 m), Recarga | Irritar | 1 |
| `hand-crossbow` | Besta de Mão | Marcial à distância | 1d6 Perfurante | Munição (9/36 m), Leve, Recarga | Irritar | 3 |
| `heavy-crossbow` | Besta Pesada | Marcial à distância | 1d10 Perfurante | Munição (30/120 m), Pesada, Recarga, Duas Mãos | Empurrar | 18 |
| `longbow` | Arco Longo | Marcial à distância | 1d8 Perfurante | Munição (45/180 m), Pesada, Duas Mãos | Lentidão | 2 |
| `musket` | Mosquete | Marcial à distância | 1d12 Perfurante | Munição (12/36 m), Recarga, Duas Mãos | Lentidão | 10 |
| `pistol` | Pistola | Marcial à distância | 1d10 Perfurante | Munição (9/27 m), Recarga | Irritar | 3 |

### Armaduras (`armor`)

| Código | Nome | Tipo | CA | Peso (lb) |
|---|---|---|---|---|
| `none` | Sem armadura | — | 10 + DES | 0 |
| `padded` | Acolchoada | Leve | 11 + DES, desvantagem em Furtividade | 8 |
| `leather` | Couro | Leve | 11 + DES | 10 |
| `studded` | Couro Batido | Leve | 12 + DES | 13 |
| `hide` | Gibão de Peles | Média | 12 + DES (máx. 2) | 12 |
| `chain-shirt` | Camisão de Malha | Média | 13 + DES (máx. 2) | 20 |
| `scale` | Brunea | Média | 14 + DES (máx. 2), desvantagem em Furtividade | 45 |
| `breastplate` | Peitoral | Média | 14 + DES (máx. 2) | 20 |
| `half-plate` | Meia-Armadura | Média | 15 + DES (máx. 2), desvantagem em Furtividade | 40 |
| `ring` | Cota de Anéis | Pesada | 14, desvantagem em Furtividade | 40 |
| `chain-mail` | Cota de Malha | Pesada | 16 (FOR 13), desvantagem em Furtividade | 55 |
| `splint` | Cota de Talas | Pesada | 17 (FOR 15), desvantagem em Furtividade | 60 |
| `plate` | Armadura de Placas | Pesada | 18 (FOR 15), desvantagem em Furtividade | 65 |
| — | Escudo (`shield: true`) | — | +2 | 6 |

### Itens comuns (nome e peso sugeridos)

| Nome | Peso (lb) |
|---|---|
| Aljava | 1 |
| Algemas | 6 |
| Arpéu | 4 |
| Bolsa | 1 |
| Cantil | 5 |
| Corda (15 m) | 5 |
| Corrente (3 m) | 10 |
| Espelho | 0.5 |
| Flechas (20) | 1 |
| Virotes (20) | 1.5 |
| Frasco de Óleo | 1 |
| Água Benta (frasco) | 1 |
| Ácido (frasco) | 1 |
| Fogo de Alquimista (frasco) | 1 |
| Antitoxina | 0 |
| Poção de Cura | 0.5 |
| Ração (1 dia) | 2 |
| Saco de Dormir | 7 |
| Tenda | 20 |
| Tocha | 1 |
| Lanterna Coberta | 2 |
| Lâmpada | 1 |
| Pé de Cabra | 5 |
| Pá | 5 |
| Martelo | 3 |
| Pitons (10) | 2.5 |
| Kit de Curandeiro | 3 |
| Kit de Herbalismo | 3 |
| Kit de Disfarce | 3 |
| Kit de Falsificação | 5 |
| Kit de Venenos | 2 |
| Ferramentas de Ladrão | 1 |
| Suprimentos de Caligrafia | 5 |
| Kit de Jogo | 0 |
| Instrumento Musical | 3 |
| Livro | 5 |
| Pergaminho (folha) | 0 |
| Tinta (frasco) | 0 |
| Pena de Escrever | 0 |
| Símbolo Sagrado | 1 |
| Foco Arcano | 1 |
| Foco Druídico | 1 |
| Grimório | 3 |
| Roupas de Viajante | 4 |
| Roupas Finas | 6 |
| Túnica | 4 |
| Fantasia | 4 |
| Manto | 3 |
| Mochila | 5 |
| Baú | 25 |
| Pacote de Aventureiro | 55 |
| Pacote de Explorador de Masmorras | 55 |
| Pacote de Sacerdote | 29 |
| Pacote de Erudito | 22 |
| Pacote de Artista | 58 |
| Pacote de Assaltante | 42 |
| Pacote de Diplomata | 39 |

### Moedas (`coins`)

- `pc` = Cobre (PC) — vale 0.01 PO
- `pp` = Prata (PP) — vale 0.1 PO
- `pe` = Electro (PE) — vale 0.5 PO
- `po` = Ouro (PO) — vale 1 PO
- `pl` = Platina (PL) — vale 10 PO

## 9. Ataques (`attacks`)

Arma do catálogo — o app calcula acerto e dano sozinho:
```json
{ "id": "", "weaponId": "rapier", "name": "Rapieira de aço negro" }
```
Campos opcionais: `"magic": 1` (arma +1), `"versatile": true` (usar com duas mãos), `"extraDmg": "1d6"` (dano extra), `"hitBonus"`/`"dmgBonus"` (números), `"ability": "dex"` (forçar atributo), `"prof": "yes"`/`"no"` (forçar proficiência).

Ataque desarmado: `{ "id": "", "weaponId": "unarmed", "name": "Ataque Desarmado" }`.

Ataque personalizado (garra, arma homebrew):
```json
{ "id": "", "name": "Garras", "dmg": "1d6", "dtype": "Cortante", "ability": "str" }
```

## 10. Magias (`spells`)

Formato de cada magia (copie `name`, `level`, `school` do catálogo abaixo; os demais textos podem ficar vazios — o app mostra os detalhes oficiais pelo `cat`):
```json
{ "id": "", "cat": "fireball", "source": "class", "prepared": true, "name": "Bola de Fogo", "level": 3, "school": "Evocação", "time": "", "range": "", "dur": "", "conc": false, "ritual": false, "notes": "" }
```
- `cat`: código do catálogo (abaixo). Para magia fora do catálogo, deixe `cat: ""` e preencha os textos.
- `source`:
  - `"class"` — magia da classe: conta nos limites da seção 6 e precisa estar na lista da classe;
  - `"always"` — sempre preparada (magias de subclasse ou características, como Marca do Caçador do Patrulheiro);
  - `"extra"` — de espécie, talento ou item (ex.: Luz do Aasimar, Iniciado em Magia). Não conta nos limites.
- `prepared`: truques sempre `true`; para `"class"`, marque `true` só até o limite; `"always"` e `"extra"` usam `true`.
- `level`: 0 = truque. Não escolha magias acima do nível máximo da classe.
- Listas: Cavaleiro Arcano e Trapaceiro Arcano usam a lista de Mago. Bardo a partir do nível 10 pode escolher também das listas de Clérigo, Druida e Mago.

### Catálogo (339 magias do SRD 5.2)

#### Truques (27)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `druidcraft` | Arte Druídica | Druidcraft | Transmutação | Druida |
| `sacred-flame` | Chama Sagrada | Sacred Flame | Evocação | Clérigo |
| `mending` | Consertar | Mending | Transmutação | Bardo, Clérigo, Druida, Feiticeiro, Mago |
| `elementalism` | Elementalismo | Elementalism | Transmutação | Druida, Feiticeiro, Mago |
| `sorcerous-burst` | Explosão Feiticeira | Sorcerous Burst | Evocação | Feiticeiro |
| `dancing-lights` | Globos de Luz | Dancing Lights | Ilusão | Bardo, Feiticeiro, Mago |
| `true-strike` | Golpe Certeiro | True Strike | Adivinhação | Bardo, Feiticeiro, Bruxo, Mago |
| `minor-illusion` | Ilusão Menor | Minor Illusion | Ilusão | Bardo, Feiticeiro, Bruxo, Mago |
| `starry-wisp` | Lampejo Estelar | Starry Wisp | Evocação | Bardo, Druida |
| `light` | Luz | Light | Evocação | Bardo, Clérigo, Feiticeiro, Mago |
| `mage-hand` | Mãos Mágicas | Mage Hand | Conjuração | Bardo, Feiticeiro, Bruxo, Mago |
| `message` | Mensagem | Message | Transmutação | Bardo, Druida, Feiticeiro, Mago |
| `guidance` | Orientação | Guidance | Adivinhação | Clérigo, Druida |
| `spare-the-dying` | Poupar os Moribundos | Spare the Dying | Necromancia | Clérigo, Druida |
| `prestidigitation` | Prestidigitação | Prestidigitation | Transmutação | Bardo, Feiticeiro, Bruxo, Mago |
| `produce-flame` | Produzir Chama | Produce Flame | Conjuração | Druida |
| `fire-bolt` | Raio de Fogo | Fire Bolt | Evocação | Feiticeiro, Mago |
| `ray-of-frost` | Raio de Gelo | Ray of Frost | Evocação | Feiticeiro, Mago |
| `poison-spray` | Rajada de Veneno | Poison Spray | Necromancia | Druida, Feiticeiro, Bruxo, Mago |
| `eldritch-blast` | Rajada Mística | Eldritch Blast | Evocação | Bruxo |
| `resistance` | Resistência | Resistance | Abjuração | Clérigo, Druida |
| `acid-splash` | Respingo Ácido | Acid Splash | Evocação | Feiticeiro, Mago |
| `shillelagh` | Shillelagh | Shillelagh | Transmutação | Druida |
| `thaumaturgy` | Taumaturgia | Thaumaturgy | Transmutação | Clérigo |
| `chill-touch` | Toque Arrepiante | Chill Touch | Necromancia | Feiticeiro, Bruxo, Mago |
| `shocking-grasp` | Toque Chocante | Shocking Grasp | Evocação | Feiticeiro, Mago |
| `vicious-mockery` | Zombaria Viciosa | Vicious Mockery | Encantamento | Bardo |

#### 1º nível (57)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `alarm` | Alarme | Alarm | Abjuração | Patrulheiro, Mago |
| `animal-friendship` | Amizade Animal | Animal Friendship | Encantamento | Bardo, Druida, Patrulheiro |
| `grease` | Área Escorregadia | Grease | Conjuração | Feiticeiro, Mago |
| `mage-armor` | Armadura Arcana | Mage Armor | Abjuração | Feiticeiro, Mago |
| `bless` | Bênção | Bless | Encantamento | Clérigo, Paladino |
| `goodberry` | Bom Fruto | Goodberry | Conjuração | Druida, Patrulheiro |
| `hex` | Bruxaria | Hex | Encantamento | Bruxo |
| `command` | Comando | Command | Encantamento | Bardo, Clérigo, Paladino |
| `comprehend-languages` | Compreender Idiomas | Comprehend Languages | Adivinhação | Bardo, Feiticeiro, Bruxo, Mago |
| `entangle` | Constrição | Entangle | Conjuração | Druida, Patrulheiro |
| `create-or-destroy-water` | Criar ou Destruir Água | Create or Destroy Water | Transmutação | Clérigo, Druida |
| `cure-wounds` | Curar Ferimentos | Cure Wounds | Abjuração | Bardo, Clérigo, Druida, Paladino, Patrulheiro |
| `detect-magic` | Detectar Magia | Detect Magic | Adivinhação | Bardo, Clérigo, Druida, Paladino, Patrulheiro, Feiticeiro, Bruxo, Mago |
| `detect-evil-and-good` | Detectar o Bem e o Mal | Detect Evil and Good | Adivinhação | Clérigo, Paladino |
| `detect-poison-and-disease` | Detectar Veneno e Doença | Detect Poison and Disease | Adivinhação | Clérigo, Druida, Paladino, Patrulheiro |
| `floating-disk` | Disco Flutuante | Floating Disk | Conjuração | Mago |
| `disguise-self` | Disfarçar-se | Disguise Self | Ilusão | Bardo, Feiticeiro, Mago |
| `find-familiar` | Encontrar Familiar | Find Familiar | Conjuração | Mago |
| `charm-person` | Enfeitiçar Pessoa | Charm Person | Encantamento | Bardo, Druida, Feiticeiro, Bruxo, Mago |
| `illusory-script` | Escrita Ilusória | Illusory Script | Ilusão | Bardo, Bruxo, Mago |
| `shield` | Escudo Arcano | Shield | Abjuração | Feiticeiro, Mago |
| `shield-of-faith` | Escudo da Fé | Shield of Faith | Abjuração | Clérigo, Paladino |
| `ice-knife` | Faca de Gelo | Ice Knife | Conjuração | Druida, Feiticeiro, Mago |
| `speak-with-animals` | Falar com Animais | Speak with Animals | Adivinhação | Bardo, Druida, Patrulheiro, Bruxo |
| `divine-favor` | Favor Divino | Divine Favor | Transmutação | Paladino |
| `faerie-fire` | Fogo das Fadas | Faerie Fire | Evocação | Bardo, Druida |
| `searing-smite` | Golpe Abrasador | Searing Smite | Evocação | Paladino |
| `ensnaring-strike` | Golpe Constritor | Ensnaring Strike | Conjuração | Patrulheiro |
| `divine-smite` | Golpe Divino | Divine Smite | Evocação | Paladino |
| `heroism` | Heroísmo | Heroism | Encantamento | Bardo, Paladino |
| `identify` | Identificar | Identify | Adivinhação | Bardo, Mago |
| `silent-image` | Imagem Silenciosa | Silent Image | Ilusão | Bardo, Feiticeiro, Mago |
| `inflict-wounds` | Infligir Ferimentos | Inflict Wounds | Necromancia | Clérigo |
| `burning-hands` | Mãos Flamejantes | Burning Hands | Evocação | Feiticeiro, Mago |
| `hunters-mark` | Marca do Caçador | Hunter's Mark | Adivinhação | Patrulheiro |
| `magic-missile` | Mísseis Mágicos | Magic Missile | Evocação | Feiticeiro, Mago |
| `fog-cloud` | Névoa Obscurecente | Fog Cloud | Conjuração | Druida, Patrulheiro, Feiticeiro, Mago |
| `thunderwave` | Onda Trovejante | Thunderwave | Evocação | Bardo, Druida, Feiticeiro, Mago |
| `chromatic-orb` | Orbe Cromático | Chromatic Orb | Evocação | Feiticeiro, Mago |
| `healing-word` | Palavra Curativa | Healing Word | Abjuração | Bardo, Clérigo, Druida |
| `longstrider` | Passos Largos | Longstrider | Transmutação | Bardo, Druida, Patrulheiro, Mago |
| `bane` | Perdição | Bane | Encantamento | Bardo, Clérigo, Bruxo |
| `protection-from-evil-and-good` | Proteção contra o Bem e o Mal | Protection from Evil and Good | Abjuração | Clérigo, Druida, Paladino, Bruxo, Mago |
| `purify-food-and-drink` | Purificar Comida e Bebida | Purify Food and Drink | Transmutação | Clérigo, Druida, Paladino |
| `feather-fall` | Queda Suave | Feather Fall | Transmutação | Bardo, Feiticeiro, Mago |
| `guiding-bolt` | Raio Guia | Guiding Bolt | Evocação | Clérigo |
| `ray-of-sickness` | Raio Nauseante | Ray of Sickness | Necromancia | Feiticeiro, Mago |
| `expeditious-retreat` | Recuo Acelerado | Expeditious Retreat | Transmutação | Feiticeiro, Bruxo, Mago |
| `hellish-rebuke` | Repreensão Infernal | Hellish Rebuke | Evocação | Bruxo |
| `hideous-laughter` | Riso Histérico | Hideous Laughter | Encantamento | Bardo, Bruxo, Mago |
| `jump` | Salto | Jump | Transmutação | Druida, Patrulheiro, Feiticeiro, Mago |
| `sanctuary` | Santuário | Sanctuary | Abjuração | Clérigo |
| `unseen-servant` | Servo Invisível | Unseen Servant | Conjuração | Bardo, Bruxo, Mago |
| `sleep` | Sono | Sleep | Encantamento | Bardo, Feiticeiro, Mago |
| `color-spray` | Spray de Cores | Color Spray | Ilusão | Bardo, Feiticeiro, Mago |
| `dissonant-whispers` | Sussurros Dissonantes | Dissonant Whispers | Encantamento | Bardo |
| `false-life` | Vitalidade Falsa | False Life | Necromancia | Feiticeiro, Mago |

#### 2º nível (57)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `calm-emotions` | Acalmar Emoções | Calm Emotions | Encantamento | Bardo, Clérigo |
| `alter-self` | Alterar-se | Alter Self | Transmutação | Feiticeiro, Mago |
| `enhance-ability` | Aprimorar Atributo | Enhance Ability | Transmutação | Bardo, Clérigo, Druida, Patrulheiro, Feiticeiro, Mago |
| `spiritual-weapon` | Arma Espiritual | Spiritual Weapon | Evocação | Clérigo |
| `magic-weapon` | Arma Mágica | Magic Weapon | Transmutação | Paladino, Patrulheiro, Feiticeiro, Mago |
| `knock` | Arrombar | Knock | Transmutação | Bardo, Feiticeiro, Mago |
| `augury` | Augúrio | Augury | Adivinhação | Clérigo, Druida, Mago |
| `enlarge-reduce` | Aumentar/Reduzir | Enlarge/Reduce | Transmutação | Bardo, Druida, Feiticeiro, Mago |
| `arcanists-magic-aura` | Aura Mágica do Arcanista | Arcanist's Magic Aura | Ilusão | Mago |
| `aid` | Auxílio | Aid | Abjuração | Bardo, Clérigo, Druida, Paladino, Patrulheiro |
| `magic-mouth` | Boca Mágica | Magic Mouth | Ilusão | Bardo, Mago |
| `blindness-deafness` | Cegueira/Surdez | Blindness/Deafness | Transmutação | Bardo, Clérigo, Feiticeiro, Mago |
| `continual-flame` | Chama Contínua | Continual Flame | Evocação | Clérigo, Druida, Mago |
| `spike-growth` | Crescer Espinhos | Spike Growth | Transmutação | Druida, Patrulheiro |
| `shatter` | Despedaçar | Shatter | Evocação | Bardo, Feiticeiro, Mago |
| `detect-thoughts` | Detectar Pensamentos | Detect Thoughts | Adivinhação | Bardo, Feiticeiro, Mago |
| `warding-bond` | Elo de Proteção | Warding Bond | Abjuração | Clérigo, Paladino |
| `enthrall` | Encantar | Enthrall | Encantamento | Bardo, Bruxo |
| `find-traps` | Encontrar Armadilhas | Find Traps | Adivinhação | Clérigo, Druida, Patrulheiro |
| `find-steed` | Encontrar Corcel | Find Steed | Conjuração | Paladino |
| `darkness` | Escuridão | Darkness | Evocação | Feiticeiro, Bruxo, Mago |
| `flaming-sphere` | Esfera Flamejante | Flaming Sphere | Conjuração | Druida, Feiticeiro, Mago |
| `heat-metal` | Esquentar Metal | Heat Metal | Transmutação | Bardo, Druida |
| `acid-arrow` | Flecha Ácida | Acid Arrow | Evocação | Mago |
| `phantasmal-force` | Força Fantasmagórica | Phantasmal Force | Ilusão | Bardo, Feiticeiro, Mago |
| `shining-smite` | Golpe Radiante | Shining Smite | Transmutação | Paladino |
| `mirror-image` | Imagem Espelhada | Mirror Image | Ilusão | Bardo, Feiticeiro, Bruxo, Mago |
| `invisibility` | Invisibilidade | Invisibility | Ilusão | Bardo, Feiticeiro, Bruxo, Mago |
| `flame-blade` | Lâmina Flamejante | Flame Blade | Evocação | Druida, Feiticeiro |
| `mind-spike` | Lança Mental | Mind Spike | Adivinhação | Feiticeiro, Bruxo, Mago |
| `levitate` | Levitação | Levitate | Transmutação | Feiticeiro, Mago |
| `locate-animals-or-plants` | Localizar Animais ou Plantas | Locate Animals or Plants | Adivinhação | Bardo, Druida, Patrulheiro |
| `locate-object` | Localizar Objeto | Locate Object | Adivinhação | Bardo, Clérigo, Druida, Paladino, Patrulheiro, Mago |
| `gust-of-wind` | Lufada de Vento | Gust of Wind | Evocação | Druida, Patrulheiro, Feiticeiro, Mago |
| `animal-messenger` | Mensageiro Animal | Animal Messenger | Encantamento | Bardo, Druida, Patrulheiro |
| `blur` | Nublar | Blur | Ilusão | Feiticeiro, Mago |
| `hold-person` | Paralisar Pessoa | Hold Person | Encantamento | Bardo, Clérigo, Druida, Feiticeiro, Bruxo, Mago |
| `misty-step` | Passo Nebuloso | Misty Step | Conjuração | Feiticeiro, Bruxo, Mago |
| `pass-without-trace` | Passos sem Pegadas | Pass without Trace | Abjuração | Druida, Patrulheiro |
| `spider-climb` | Patas de Aranha | Spider Climb | Transmutação | Feiticeiro, Bruxo, Mago |
| `barkskin` | Pele de Árvore | Barkskin | Transmutação | Druida, Patrulheiro |
| `prayer-of-healing` | Prece de Cura | Prayer of Healing | Abjuração | Clérigo, Paladino |
| `protection-from-poison` | Proteção contra Veneno | Protection from Poison | Abjuração | Clérigo, Druida, Paladino, Patrulheiro |
| `scorching-ray` | Raio Ardente | Scorching Ray | Evocação | Feiticeiro, Mago |
| `ray-of-enfeeblement` | Raio do Enfraquecimento | Ray of Enfeeblement | Necromancia | Bruxo, Mago |
| `moonbeam` | Raio Lunar | Moonbeam | Evocação | Druida |
| `gentle-repose` | Repouso Tranquilo | Gentle Repose | Necromancia | Clérigo, Paladino, Mago |
| `lesser-restoration` | Restauração Menor | Lesser Restoration | Abjuração | Bardo, Clérigo, Druida, Paladino, Patrulheiro |
| `silence` | Silêncio | Silence | Ilusão | Bardo, Clérigo, Patrulheiro |
| `dragons-breath` | Sopro do Dragão | Dragon's Breath | Transmutação | Feiticeiro, Mago |
| `suggestion` | Sugestão | Suggestion | Encantamento | Bardo, Feiticeiro, Bruxo, Mago |
| `web` | Teia | Web | Conjuração | Feiticeiro, Mago |
| `arcane-lock` | Tranca Arcana | Arcane Lock | Abjuração | Mago |
| `rope-trick` | Truque da Corda | Rope Trick | Transmutação | Mago |
| `see-invisibility` | Ver o Invisível | See Invisibility | Adivinhação | Bardo, Feiticeiro, Mago |
| `darkvision` | Visão no Escuro | Darkvision | Transmutação | Druida, Patrulheiro, Feiticeiro, Mago |
| `zone-of-truth` | Zona da Verdade | Zone of Truth | Encantamento | Bardo, Clérigo, Paladino |

#### 3º nível (42)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `water-walk` | Andar na Água | Water Walk | Transmutação | Clérigo, Druida, Patrulheiro, Feiticeiro |
| `animate-dead` | Animar Mortos | Animate Dead | Necromancia | Clérigo, Mago |
| `fireball` | Bola de Fogo | Fireball | Evocação | Feiticeiro, Mago |
| `magic-circle` | Círculo Mágico | Magic Circle | Abjuração | Clérigo, Paladino, Bruxo, Mago |
| `clairvoyance` | Clarividência | Clairvoyance | Adivinhação | Bardo, Clérigo, Feiticeiro, Mago |
| `conjure-animals` | Conjurar Animais | Conjure Animals | Conjuração | Druida, Patrulheiro |
| `counterspell` | Contramágica | Counterspell | Abjuração | Feiticeiro, Bruxo, Mago |
| `phantom-steed` | Corcel Fantasma | Phantom Steed | Ilusão | Mago |
| `plant-growth` | Crescimento de Plantas | Plant Growth | Transmutação | Bardo, Druida, Patrulheiro |
| `create-food-and-water` | Criar Comida e Água | Create Food and Water | Conjuração | Clérigo, Paladino |
| `dispel-magic` | Dissipar Magia | Dispel Magic | Abjuração | Bardo, Clérigo, Druida, Paladino, Patrulheiro, Feiticeiro, Bruxo, Mago |
| `sending` | Enviar Mensagem | Sending | Adivinhação | Bardo, Clérigo, Mago |
| `spirit-guardians` | Espíritos Guardiões | Spirit Guardians | Conjuração | Clérigo |
| `speak-with-dead` | Falar com os Mortos | Speak with Dead | Necromancia | Bardo, Clérigo, Mago |
| `speak-with-plants` | Falar com Plantas | Speak with Plants | Transmutação | Bardo, Druida, Patrulheiro |
| `gaseous-form` | Forma Gasosa | Gaseous Form | Transmutação | Feiticeiro, Bruxo, Mago |
| `meld-into-stone` | Fundir-se às Pedras | Meld into Stone | Transmutação | Clérigo, Druida, Patrulheiro |
| `glyph-of-warding` | Glifo de Proteção | Glyph of Warding | Abjuração | Bardo, Clérigo, Mago |
| `tongues` | Idiomas | Tongues | Adivinhação | Bardo, Clérigo, Feiticeiro, Bruxo, Mago |
| `major-image` | Imagem Maior | Major Image | Ilusão | Bardo, Feiticeiro, Bruxo, Mago |
| `nondetection` | Indetectável | Nondetection | Abjuração | Bardo, Patrulheiro, Mago |
| `call-lightning` | Invocar Relâmpago | Call Lightning | Conjuração | Druida |
| `slow` | Lentidão | Slow | Transmutação | Bardo, Feiticeiro, Mago |
| `daylight` | Luz do Dia | Daylight | Evocação | Clérigo, Druida, Paladino, Patrulheiro, Feiticeiro |
| `fear` | Medo | Fear | Ilusão | Bardo, Feiticeiro, Bruxo, Mago |
| `wind-wall` | Muralha de Vento | Wind Wall | Evocação | Druida, Patrulheiro |
| `stinking-cloud` | Névoa Fétida | Stinking Cloud | Conjuração | Bardo, Feiticeiro, Mago |
| `hypnotic-pattern` | Padrão Hipnótico | Hypnotic Pattern | Ilusão | Bardo, Feiticeiro, Bruxo, Mago |
| `mass-healing-word` | Palavra Curativa em Massa | Mass Healing Word | Abjuração | Bardo, Clérigo |
| `tiny-hut` | Pequena Cabana | Tiny Hut | Evocação | Bardo, Mago |
| `blink` | Piscar | Blink | Transmutação | Feiticeiro, Mago |
| `protection-from-energy` | Proteção contra Energia | Protection from Energy | Abjuração | Clérigo, Druida, Patrulheiro, Feiticeiro, Mago |
| `lightning-bolt` | Relâmpago | Lightning Bolt | Evocação | Feiticeiro, Mago |
| `remove-curse` | Remover Maldição | Remove Curse | Abjuração | Clérigo, Paladino, Bruxo, Mago |
| `water-breathing` | Respirar na Água | Water Breathing | Transmutação | Druida, Patrulheiro, Feiticeiro, Mago |
| `revivify` | Revivificar | Revivify | Necromancia | Clérigo, Druida, Paladino, Patrulheiro |
| `bestow-curse` | Rogar Maldição | Bestow Curse | Necromancia | Bardo, Clérigo, Mago |
| `beacon-of-hope` | Sinal de Esperança | Beacon of Hope | Abjuração | Clérigo |
| `sleet-storm` | Tempestade de Granizo | Sleet Storm | Conjuração | Druida, Feiticeiro, Mago |
| `vampiric-touch` | Toque Vampírico | Vampiric Touch | Necromancia | Feiticeiro, Bruxo, Mago |
| `haste` | Velocidade | Haste | Transmutação | Feiticeiro, Mago |
| `fly` | Voo | Fly | Transmutação | Feiticeiro, Bruxo, Mago |

#### 4º nível (34)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `divination` | Adivinhação | Divination | Adivinhação | Clérigo, Druida, Mago |
| `phantasmal-killer` | Assassino Fantasmagórico | Phantasmal Killer | Ilusão | Bardo, Mago |
| `aura-of-life` | Aura de Vida | Aura of Life | Abjuração | Clérigo, Paladino |
| `banishment` | Banimento | Banishment | Abjuração | Clérigo, Paladino, Feiticeiro, Bruxo, Mago |
| `secret-chest` | Baú Secreto | Secret Chest | Conjuração | Mago |
| `faithful-hound` | Cão Fiel | Faithful Hound | Conjuração | Mago |
| `compulsion` | Compulsão | Compulsion | Encantamento | Bardo |
| `confusion` | Confusão | Confusion | Encantamento | Bardo, Druida, Feiticeiro, Mago |
| `conjure-minor-elementals` | Conjurar Elementais Menores | Conjure Minor Elementals | Conjuração | Druida, Mago |
| `conjure-woodland-beings` | Conjurar Seres da Floresta | Conjure Woodland Beings | Conjuração | Druida, Patrulheiro |
| `control-water` | Controlar Água | Control Water | Transmutação | Clérigo, Druida, Mago |
| `dominate-beast` | Dominar Fera | Dominate Beast | Encantamento | Druida, Patrulheiro, Feiticeiro |
| `charm-monster` | Enfeitiçar Monstro | Charm Monster | Encantamento | Bardo, Druida, Feiticeiro, Bruxo, Mago |
| `fire-shield` | Escudo de Fogo | Fire Shield | Evocação | Druida, Feiticeiro, Mago |
| `resilient-sphere` | Esfera Resiliente | Resilient Sphere | Abjuração | Mago |
| `vitriolic-sphere` | Esfera Vitriólica | Vitriolic Sphere | Evocação | Feiticeiro, Mago |
| `fabricate` | Fabricar | Fabricate | Transmutação | Mago |
| `guardian-of-faith` | Guardião da Fé | Guardian of Faith | Conjuração | Clérigo |
| `giant-insect` | Inseto Gigante | Giant Insect | Conjuração | Druida |
| `greater-invisibility` | Invisibilidade Maior | Greater Invisibility | Ilusão | Bardo, Feiticeiro, Mago |
| `freedom-of-movement` | Liberdade de Movimento | Freedom of Movement | Abjuração | Bardo, Clérigo, Druida, Patrulheiro |
| `locate-creature` | Localizar Criatura | Locate Creature | Adivinhação | Bardo, Clérigo, Druida, Paladino, Patrulheiro, Mago |
| `polymorph` | Metamorfose | Polymorph | Transmutação | Bardo, Druida, Feiticeiro, Mago |
| `stone-shape` | Moldar Rochas | Stone Shape | Transmutação | Clérigo, Druida, Mago |
| `wall-of-fire` | Muralha de Fogo | Wall of Fire | Evocação | Druida, Feiticeiro, Mago |
| `arcane-eye` | Olho Arcano | Arcane Eye | Adivinhação | Mago |
| `stoneskin` | Pele de Pedra | Stoneskin | Transmutação | Druida, Patrulheiro, Feiticeiro, Mago |
| `dimension-door` | Porta Dimensional | Dimension Door | Conjuração | Bardo, Feiticeiro, Bruxo, Mago |
| `blight` | Praga | Blight | Necromancia | Druida, Feiticeiro, Bruxo, Mago |
| `death-ward` | Proteção contra a Morte | Death Ward | Abjuração | Clérigo, Paladino |
| `private-sanctum` | Santuário Particular | Private Sanctum | Abjuração | Mago |
| `ice-storm` | Tempestade de Gelo | Ice Storm | Evocação | Druida, Feiticeiro, Mago |
| `black-tentacles` | Tentáculos Negros | Black Tentacles | Conjuração | Mago |
| `hallucinatory-terrain` | Terreno Alucinatório | Hallucinatory Terrain | Ilusão | Bardo, Druida, Bruxo, Mago |

#### 5º nível (38)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `animate-objects` | Animar Objetos | Animate Objects | Transmutação | Bardo, Feiticeiro, Mago |
| `seeming` | Aparência Falsa | Seeming | Ilusão | Bardo, Feiticeiro, Mago |
| `tree-stride` | Caminhar em Árvores | Tree Stride | Conjuração | Druida, Patrulheiro |
| `teleportation-circle` | Círculo de Teletransporte | Teleportation Circle | Conjuração | Bardo, Feiticeiro, Bruxo, Mago |
| `flame-strike` | Coluna de Chamas | Flame Strike | Evocação | Clérigo |
| `commune` | Comunhão | Commune | Adivinhação | Clérigo |
| `commune-with-nature` | Comunhão com a Natureza | Commune with Nature | Adivinhação | Druida, Patrulheiro |
| `antilife-shell` | Concha Antivida | Antilife Shell | Abjuração | Druida |
| `cone-of-cold` | Cone de Frio | Cone of Cold | Evocação | Druida, Feiticeiro, Mago |
| `conjure-elemental` | Conjurar Elemental | Conjure Elemental | Conjuração | Druida, Mago |
| `hallow` | Consagrar | Hallow | Abjuração | Clérigo |
| `contagion` | Contágio | Contagion | Necromancia | Clérigo, Druida |
| `contact-other-plane` | Contatar Outro Plano | Contact Other Plane | Adivinhação | Bruxo, Mago |
| `creation` | Criação | Creation | Ilusão | Feiticeiro, Mago |
| `passwall` | Criar Passagem | Passwall | Transmutação | Mago |
| `mass-cure-wounds` | Curar Ferimentos em Massa | Mass Cure Wounds | Abjuração | Bardo, Clérigo, Druida |
| `awaken` | Despertar | Awaken | Transmutação | Bardo, Druida |
| `dispel-evil-and-good` | Dissipar o Bem e o Mal | Dispel Evil and Good | Abjuração | Clérigo, Paladino |
| `dominate-person` | Dominar Pessoa | Dominate Person | Encantamento | Bardo, Feiticeiro, Mago |
| `telepathic-bond` | Elo Telepático | Telepathic Bond | Adivinhação | Bardo, Mago |
| `mislead` | Enganar | Mislead | Ilusão | Bardo, Bruxo, Mago |
| `summon-dragon` | Invocar Dragão | Summon Dragon | Conjuração | Mago |
| `legend-lore` | Lendas e Histórias | Legend Lore | Adivinhação | Bardo, Clérigo, Mago |
| `planar-binding` | Ligação Planar | Planar Binding | Abjuração | Bardo, Clérigo, Druida, Bruxo, Mago |
| `arcane-hand` | Mão Arcana | Arcane Hand | Evocação | Feiticeiro, Mago |
| `geas` | Missão | Geas | Encantamento | Bardo, Clérigo, Druida, Paladino, Mago |
| `modify-memory` | Modificar Memória | Modify Memory | Encantamento | Bardo, Mago |
| `wall-of-force` | Muralha de Força | Wall of Force | Evocação | Mago |
| `wall-of-stone` | Muralha de Pedra | Wall of Stone | Evocação | Druida, Feiticeiro, Mago |
| `cloudkill` | Névoa Mortal | Cloudkill | Conjuração | Feiticeiro, Mago |
| `hold-monster` | Paralisar Monstro | Hold Monster | Encantamento | Bardo, Feiticeiro, Bruxo, Mago |
| `insect-plague` | Praga de Insetos | Insect Plague | Conjuração | Clérigo, Druida, Feiticeiro |
| `reincarnate` | Reencarnação | Reincarnate | Necromancia | Druida |
| `greater-restoration` | Restauração Maior | Greater Restoration | Abjuração | Bardo, Clérigo, Druida, Paladino, Patrulheiro |
| `raise-dead` | Reviver os Mortos | Raise Dead | Necromancia | Bardo, Clérigo, Paladino |
| `dream` | Sonho | Dream | Ilusão | Bardo, Bruxo, Mago |
| `telekinesis` | Telecinese | Telekinesis | Transmutação | Feiticeiro, Mago |
| `scrying` | Vidência | Scrying | Adivinhação | Bardo, Clérigo, Druida, Bruxo, Mago |

#### 6º nível (31)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `planar-ally` | Aliado Planar | Planar Ally | Conjuração | Clérigo |
| `heroes-feast` | Banquete dos Heróis | Heroes' Feast | Conjuração | Bardo, Clérigo, Druida |
| `blade-barrier` | Barreira de Lâminas | Blade Barrier | Evocação | Clérigo |
| `wind-walk` | Caminhar no Vento | Wind Walk | Transmutação | Druida |
| `flesh-to-stone` | Carne para Pedra | Flesh to Stone | Transmutação | Druida, Feiticeiro, Mago |
| `circle-of-death` | Círculo da Morte | Circle of Death | Necromancia | Feiticeiro, Bruxo, Mago |
| `conjure-fey` | Conjurar Feérico | Conjure Fey | Conjuração | Druida |
| `contingency` | Contingência | Contingency | Abjuração | Mago |
| `instant-summons` | Convocação Instantânea | Instant Summons | Conjuração | Mago |
| `chain-lightning` | Corrente de Relâmpagos | Chain Lightning | Evocação | Feiticeiro, Mago |
| `create-undead` | Criar Mortos-Vivos | Create Undead | Necromancia | Clérigo, Bruxo, Mago |
| `heal` | Cura Completa | Heal | Abjuração | Clérigo, Druida |
| `irresistible-dance` | Dança Irresistível | Irresistible Dance | Encantamento | Bardo, Mago |
| `disintegrate` | Desintegrar | Disintegrate | Transmutação | Feiticeiro, Mago |
| `find-the-path` | Encontrar o Caminho | Find the Path | Adivinhação | Bardo, Clérigo, Druida |
| `freezing-sphere` | Esfera Congelante | Freezing Sphere | Evocação | Feiticeiro, Mago |
| `harm` | Ferir | Harm | Necromancia | Clérigo |
| `globe-of-invulnerability` | Globo de Invulnerabilidade | Globe of Invulnerability | Abjuração | Feiticeiro, Mago |
| `guards-and-wards` | Guardiões e Proteções | Guards and Wards | Abjuração | Bardo, Mago |
| `programmed-illusion` | Ilusão Programada | Programmed Illusion | Ilusão | Bardo, Mago |
| `move-earth` | Mover Terra | Move Earth | Transmutação | Druida, Feiticeiro, Mago |
| `wall-of-thorns` | Muralha de Espinhos | Wall of Thorns | Conjuração | Druida |
| `wall-of-ice` | Muralha de Gelo | Wall of Ice | Evocação | Mago |
| `eyebite` | Olhar Penetrante | Eyebite | Necromancia | Bardo, Feiticeiro, Bruxo, Mago |
| `word-of-recall` | Palavra de Retorno | Word of Recall | Conjuração | Clérigo |
| `forbiddance` | Proibição | Forbiddance | Abjuração | Clérigo |
| `sunbeam` | Raio Solar | Sunbeam | Evocação | Clérigo, Druida, Feiticeiro, Mago |
| `magic-jar` | Recipiente Arcano | Magic Jar | Necromancia | Mago |
| `mass-suggestion` | Sugestão em Massa | Mass Suggestion | Encantamento | Bardo, Feiticeiro, Mago |
| `transport-via-plants` | Transportar pelas Plantas | Transport via Plants | Conjuração | Druida |
| `true-seeing` | Visão da Verdade | True Seeing | Adivinhação | Bardo, Clérigo, Feiticeiro, Bruxo, Mago |

#### 7º nível (20)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `delayed-blast-fireball` | Bola de Fogo Retardada | Delayed Blast Fireball | Evocação | Feiticeiro, Mago |
| `conjure-celestial` | Conjurar Celestial | Conjure Celestial | Conjuração | Clérigo |
| `finger-of-death` | Dedo da Morte | Finger of Death | Necromancia | Feiticeiro, Bruxo, Mago |
| `arcane-sword` | Espada Arcana | Arcane Sword | Evocação | Bardo, Mago |
| `etherealness` | Forma Etérea | Etherealness | Conjuração | Bardo, Clérigo, Feiticeiro, Bruxo, Mago |
| `reverse-gravity` | Inverter a Gravidade | Reverse Gravity | Transmutação | Druida, Feiticeiro, Mago |
| `sequester` | Isolamento | Sequester | Transmutação | Mago |
| `forcecage` | Jaula de Força | Forcecage | Evocação | Bardo, Bruxo, Mago |
| `magnificent-mansion` | Mansão Magnífica | Magnificent Mansion | Conjuração | Bardo, Mago |
| `mirage-arcane` | Miragem Arcana | Mirage Arcane | Ilusão | Bardo, Druida, Mago |
| `plane-shift` | Mudança de Plano | Plane Shift | Conjuração | Clérigo, Druida, Feiticeiro, Bruxo, Mago |
| `divine-word` | Palavra Divina | Divine Word | Evocação | Clérigo |
| `project-image` | Projetar Imagem | Project Image | Ilusão | Bardo, Mago |
| `regenerate` | Regeneração | Regenerate | Transmutação | Bardo, Clérigo, Druida |
| `resurrection` | Ressurreição | Resurrection | Necromancia | Bardo, Clérigo |
| `symbol` | Símbolo | Symbol | Abjuração | Bardo, Clérigo, Druida, Mago |
| `simulacrum` | Simulacro | Simulacrum | Ilusão | Mago |
| `prismatic-spray` | Spray Prismático | Prismatic Spray | Evocação | Bardo, Feiticeiro, Mago |
| `teleport` | Teletransporte | Teleport | Conjuração | Bardo, Feiticeiro, Mago |
| `fire-storm` | Tempestade de Fogo | Fire Storm | Evocação | Clérigo, Druida, Feiticeiro |

#### 8º nível (17)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `antipathy-sympathy` | Antipatia/Simpatia | Antipathy/Sympathy | Encantamento | Bardo, Druida, Mago |
| `holy-aura` | Aura Sagrada | Holy Aura | Abjuração | Clérigo |
| `antimagic-field` | Campo Antimagia | Antimagic Field | Abjuração | Clérigo, Mago |
| `clone` | Clone | Clone | Necromancia | Mago |
| `befuddlement` | Confusão Mental | Befuddlement | Encantamento | Bardo, Druida, Bruxo, Mago |
| `control-weather` | Controlar o Clima | Control Weather | Transmutação | Clérigo, Druida, Mago |
| `dominate-monster` | Dominar Monstro | Dominate Monster | Encantamento | Bardo, Feiticeiro, Bruxo, Mago |
| `sunburst` | Explosão Solar | Sunburst | Evocação | Clérigo, Druida, Feiticeiro, Mago |
| `animal-shapes` | Formas Animais | Animal Shapes | Transmutação | Druida |
| `glibness` | Lábia | Glibness | Encantamento | Bardo, Bruxo |
| `maze` | Labirinto | Maze | Conjuração | Mago |
| `mind-blank` | Limpar a Mente | Mind Blank | Abjuração | Bardo, Mago |
| `incendiary-cloud` | Nuvem Incendiária | Incendiary Cloud | Conjuração | Druida, Feiticeiro, Mago |
| `power-word-stun` | Palavra de Poder Atordoar | Power Word Stun | Encantamento | Bardo, Feiticeiro, Bruxo, Mago |
| `demiplane` | Semiplano | Demiplane | Conjuração | Feiticeiro, Bruxo, Mago |
| `earthquake` | Terremoto | Earthquake | Transmutação | Clérigo, Druida, Feiticeiro |
| `tsunami` | Tsunami | Tsunami | Conjuração | Druida |

#### 9º nível (16)

| Código (`cat`) | Nome | Inglês | Escola | Listas |
|---|---|---|---|---|
| `imprisonment` | Aprisionamento | Imprisonment | Abjuração | Bruxo, Mago |
| `meteor-swarm` | Chuva de Meteoros | Meteor Swarm | Evocação | Feiticeiro, Mago |
| `mass-heal` | Cura Completa em Massa | Mass Heal | Abjuração | Clérigo |
| `wish` | Desejo | Wish | Conjuração | Feiticeiro, Mago |
| `true-polymorph` | Metamorfose Verdadeira | True Polymorph | Transmutação | Bardo, Bruxo, Mago |
| `shapechange` | Mudança de Forma | Shapechange | Transmutação | Druida, Mago |
| `prismatic-wall` | Muralha Prismática | Prismatic Wall | Abjuração | Bardo, Mago |
| `power-word-heal` | Palavra de Poder Curar | Power Word Heal | Encantamento | Bardo, Clérigo |
| `power-word-kill` | Palavra de Poder Matar | Power Word Kill | Encantamento | Bardo, Feiticeiro, Bruxo, Mago |
| `time-stop` | Parar o Tempo | Time Stop | Transmutação | Feiticeiro, Mago |
| `gate` | Portal | Gate | Conjuração | Clérigo, Feiticeiro, Bruxo, Mago |
| `foresight` | Presciência | Foresight | Adivinhação | Bardo, Druida, Bruxo, Mago |
| `astral-projection` | Projeção Astral | Astral Projection | Necromancia | Clérigo, Bruxo, Mago |
| `true-resurrection` | Ressurreição Verdadeira | True Resurrection | Necromancia | Clérigo, Druida |
| `weird` | Sofrimento Mortal | Weird | Ilusão | Bruxo, Mago |
| `storm-of-vengeance` | Tempestade da Vingança | Storm of Vengeance | Conjuração | Druida |

## 11. Checklist antes de importar

- [ ] JSON válido (sem comentários, sem vírgula sobrando, aspas duplas).
- [ ] `species`, `background`, `classId`, `subclass` e todos os códigos existem neste manual.
- [ ] `classSkills` tem exatamente a quantidade da classe e não repete perícias do antecedente.
- [ ] Especializações (`skillProf` = 2) dentro do limite da classe.
- [ ] Truques e magias preparadas `"class"` dentro da tabela; nenhuma magia acima do nível máximo.
- [ ] `hp.current` é `null`.
- [ ] Cada arma tem `weaponId` no inventário e um ataque em `attacks`.
- [ ] Aumentos de Atributo em `abilityExtra` batem com talentos `asi` em `feats`.
- [ ] Quantidade de talentos e Estilos de Luta dentro das vagas do nível, com pré-requisitos atendidos.
- [ ] Maestrias (`mastery`) dentro do limite da classe e só em armas com proficiência.

## 12. Exemplo mínimo (Elfa Maga nível 1)

Repare: 3 truques e 4 magias preparadas (limite do Mago 1), mais 2 magias só no grimório (`prepared: false`), totalizando 6.

```json
{
  "app": "grimorio-fichas",
  "version": 1,
  "exportedAt": "",
  "sheets": [
    {
      "id": "",
      "createdAt": 0,
      "updatedAt": 0,
      "name": "Exemplo",
      "player": "",
      "photo": "",
      "level": 1,
      "xp": 0,
      "alignment": "",
      "species": "elf",
      "speciesChoices": {
        "lineage": "high",
        "keen": "perception"
      },
      "size": "",
      "background": "sage",
      "bgMode": "21",
      "bg2": "int",
      "bg1": "con",
      "classId": "wizard",
      "subclass": "",
      "classChoices": {},
      "classSkills": [
        "investigation",
        "insight"
      ],
      "abilityMethod": "pointbuy",
      "abilities": {
        "str": 8,
        "dex": 14,
        "con": 13,
        "int": 15,
        "wis": 12,
        "cha": 10
      },
      "abilityExtra": {
        "str": 0,
        "dex": 0,
        "con": 0,
        "int": 0,
        "wis": 0,
        "cha": 0
      },
      "saveProf": {},
      "saveBonus": 0,
      "skillProf": {},
      "extraSkills": 0,
      "extraExpertise": 0,
      "hp": {
        "current": null,
        "temp": 0,
        "maxOverride": null,
        "bonus": 0
      },
      "hitDiceUsed": 0,
      "deathSaves": {
        "s": 0,
        "f": 0
      },
      "exhaustion": 0,
      "inspiration": false,
      "conditions": [],
      "armor": "none",
      "shield": false,
      "acBonus": 0,
      "speedBonus": 0,
      "initBonus": 0,
      "attacks": [
        {
          "id": "",
          "weaponId": "dagger",
          "name": "Adaga"
        }
      ],
      "mastery": {},
      "spellAbility": "",
      "spells": [
        {
          "id": "",
          "cat": "fire-bolt",
          "source": "class",
          "prepared": true,
          "name": "Raio de Fogo",
          "level": 0,
          "school": "Evocação",
          "time": "",
          "range": "",
          "dur": "",
          "conc": false,
          "ritual": false,
          "notes": ""
        },
        {
          "id": "",
          "cat": "mage-hand",
          "source": "class",
          "prepared": true,
          "name": "Mãos Mágicas",
          "level": 0,
          "school": "Conjuração",
          "time": "",
          "range": "",
          "dur": "",
          "conc": false,
          "ritual": false,
          "notes": ""
        },
        {
          "id": "",
          "cat": "light",
          "source": "class",
          "prepared": true,
          "name": "Luz",
          "level": 0,
          "school": "Evocação",
          "time": "",
          "range": "",
          "dur": "",
          "conc": false,
          "ritual": false,
          "notes": ""
        },
        {
          "id": "",
          "cat": "magic-missile",
          "source": "class",
          "prepared": true,
          "name": "Mísseis Mágicos",
          "level": 1,
          "school": "Evocação",
          "time": "",
          "range": "",
          "dur": "",
          "conc": false,
          "ritual": false,
          "notes": ""
        },
        {
          "id": "",
          "cat": "shield",
          "source": "class",
          "prepared": true,
          "name": "Escudo Arcano",
          "level": 1,
          "school": "Abjuração",
          "time": "",
          "range": "",
          "dur": "",
          "conc": false,
          "ritual": false,
          "notes": ""
        },
        {
          "id": "",
          "cat": "mage-armor",
          "source": "class",
          "prepared": true,
          "name": "Armadura Arcana",
          "level": 1,
          "school": "Abjuração",
          "time": "",
          "range": "",
          "dur": "",
          "conc": false,
          "ritual": false,
          "notes": ""
        },
        {
          "id": "",
          "cat": "sleep",
          "source": "class",
          "prepared": true,
          "name": "Sono",
          "level": 1,
          "school": "Encantamento",
          "time": "",
          "range": "",
          "dur": "",
          "conc": false,
          "ritual": false,
          "notes": ""
        },
        {
          "id": "",
          "cat": "detect-magic",
          "source": "class",
          "prepared": false,
          "name": "Detectar Magia",
          "level": 1,
          "school": "Adivinhação",
          "time": "",
          "range": "",
          "dur": "",
          "conc": false,
          "ritual": false,
          "notes": ""
        },
        {
          "id": "",
          "cat": "feather-fall",
          "source": "class",
          "prepared": false,
          "name": "Queda Suave",
          "level": 1,
          "school": "Transmutação",
          "time": "",
          "range": "",
          "dur": "",
          "conc": false,
          "ritual": false,
          "notes": ""
        }
      ],
      "slotsUsed": [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      "pactUsed": 0,
      "resUsed": {},
      "customRes": [],
      "inventory": [
        {
          "id": "",
          "name": "Adaga",
          "weaponId": "dagger",
          "qty": 2,
          "weight": 1,
          "equipped": true,
          "notes": ""
        },
        {
          "id": "",
          "name": "Grimório",
          "qty": 1,
          "weight": 3,
          "equipped": false,
          "notes": ""
        }
      ],
      "coins": {
        "pc": 0,
        "pp": 0,
        "pe": 0,
        "po": 15,
        "pl": 0
      },
      "feats": [],
      "languages": [
        "Comum",
        "Élfico",
        "Dracônico"
      ],
      "toolProfs": "",
      "otherProfs": "",
      "bio": {
        "age": "",
        "height": "",
        "weight": "",
        "eyes": "",
        "hair": "",
        "skin": "",
        "gender": "",
        "faith": "",
        "appearance": "",
        "personality": "",
        "ideals": "",
        "bonds": "",
        "flaws": "",
        "backstory": "Uma aprendiz de biblioteca que fugiu com um grimório proibido.",
        "allies": "",
        "notes": ""
      },
      "equipAdded": {}
    }
  ]
}
```
