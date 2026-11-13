# Grimório de Fichas — D&D 5e (2024)

Gerenciador de fichas interativas em HTML/CSS/JS puro, sem build e sem dependências.

**Recebeu em .zip?** Extraia primeiro (botão direito → *Extrair tudo…*). Abrir o `index.html` de dentro do zip não funciona, porque o Windows copia só esse arquivo, sem as pastas `css/` e `js/`.

**Como usar:** abra `index.html` no navegador (ou rode `python3 -m http.server` nesta pasta e acesse http://localhost:8000).
Os dados ficam no `localStorage` do navegador. Use **Exportar** na lista de fichas para fazer backup em `.json`.

## Estrutura
- `js/data.js`: dados de regras do Livro do Jogador 2024 (espécies, antecedentes, classes/subclasses, talentos, armas, armaduras, tabelas de magia)
- `js/rules.js`: cálculos derivados (modificadores, CA, PV, perícias, salvaguardas, ataques, espaços de magia, recursos)
- `js/app.js`: interface, abas, armazenamento, rolagens de dados
- `css/style.css`: estilos
- `js/spells.js`: catálogo de magias

## Créditos
O catálogo de magias usa o *System Reference Document 5.2* da Wizards of the Coast LLC, licenciado sob
[Creative Commons Attribution 4.0 International (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/).
Os nomes em português e os resumos são tradução/adaptação própria; o texto oficial em inglês acompanha cada magia.
