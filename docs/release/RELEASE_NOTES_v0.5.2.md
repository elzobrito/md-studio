## MD Studio v0.5.2

Linha local 0.5.2 a partir de 0.5.1 + hotfixes de interface (`b5e2cab`) e o feedback de um tester na 0.2.2 pública.

Esta preparação **não** faz push, tag GitHub nem upload Snap Store. Isso fica em `MD-V052-PUBLISH-UA-001`.

### Correções do feedback

- **Matemática GitHub visível.** O preview já emitia HTML KaTeX; faltava `katex/dist/katex.min.css`. Fórmulas `$...$` e `$$...$$` (incluindo o README FuelControl) passam a ter layout KaTeX.
- **Novo documento sem perda silenciosa.** O `+` / Ctrl+N abre o modal com blank pré-selecionado. Cards só selecionam. A ação primária cria em branco. Substituição de buffer dirty pede confirmação. O botão do header usa `FilePlusIcon` e o rótulo “Novo documento”.
- **Sumário no modo atual.** Clique no outline em Markdown chama `editorStore.goToLine` e **não** troca para Formatado. Em Formatado e Dividida o preview continua rolando até o heading.
- **Inserir equação.** Botão exclusivo **Equação** na toolbar, com sabor GitHub (`$` / `$$`) ou LaTeX (`\(` `\)` / `\[` `\]`), inline/display e paleta (fração, raiz, somatório, integral, grego, desigualdades).

### Já incluído desta linha (pós-0.5.1)

- Splash no boot, chrome de documento longo, split visível entre 901 e 960 px, ações globais só no header.

### Empacotamento local

- Versão 0.5.2 em `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` e `snap/snapcraft.yaml`.
- Binário de release instalado em `~/.local/bin/md-studio`.
- Desktop Exec permanece `/usr/bin/env WEBKIT_DISABLE_DMABUF_RENDERER=1 /home/elzobrito/.local/bin/md-studio %F`.
