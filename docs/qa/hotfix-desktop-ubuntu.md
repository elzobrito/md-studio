# Hotfix Ubuntu desktop — cursor e controles da janela

Data: 2026-09-19

## Sintomas confirmados

- O launcher `md-studio.desktop` abria `~/.local/bin/md-studio`, compilado às
  17:52, enquanto o hotfix do cursor foi gravado no workspace às 18:41. O
  aplicativo instalado, portanto, não continha a correção já validada no
  código-fonte.
- A sessão real é Ubuntu GNOME sobre Wayland. Nessa combinação, Tauri/TAO
  0.35.x possui um defeito conhecido em que minimizar, maximizar e fechar na
  decoração nativa ficam sem resposta até a janela ser maximizada ou
  redimensionada.

Referências upstream:

- <https://github.com/tauri-apps/tauri/issues/13440>
- <https://github.com/tauri-apps/tao/pull/1218>

## Correção

O template Linux inicia o binário com `GDK_BACKEND=x11`. O aplicativo continua
rodando no desktop Wayland por XWayland, evitando o defeito da decoração GTK
sem trocar a barra nativa nem perder `%F` para abertura de arquivos Markdown.
O template foi ligado ao pacote Debian em `tauri.conf.json`; o bundler também o
reutiliza ao montar o AppImage.

O release é reconstruído depois do hotfix do cursor e instalado em
`~/.local/bin/md-studio`. O desktop entry user-local é atualizado e a entrada
global antiga é ocultada por override user-local, de modo que “Mostrar
aplicativos” tenha uma única origem efetiva.

## Evidências de verificação

- `pnpm test`: 31 arquivos, 178 testes aprovados.
- `pnpm typecheck`: aprovado.
- `pnpm build`: aprovado.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 6 testes aprovados.
- `pnpm tauri build --bundles deb`: aprovado; pacote gerado em
  `src-tauri/target/release/bundle/deb/MD Studio_0.1.0_amd64.deb`.
- Desktop entry dentro do `.deb`: contém
  `Exec=/usr/bin/env GDK_BACKEND=x11 md-studio %F`.
- Binário release e binário instalado possuem o mesmo SHA-256:
  `21e7625aec8f9e7b9a091aec31bdd0c3fc3f8da65bb267e858a4b174ab6d34a1`.
- `desktop-file-validate`: sem erro (somente hint opcional de categoria).
- `gio mime text/markdown`: `md-studio.desktop` permanece o aplicativo
  padrão e recomendado.
- Teste pelo caminho real do launcher (`gtk-launch md-studio`): processo
  `/home/elzobrito/.local/bin/md-studio`, ambiente `GDK_BACKEND=x11` e janela
  XWayland `md-studio` dentro de `mutter-x11-frames` confirmados.
- A entrada global antiga `/usr/share/applications/MD Studio.desktop` foi
  ocultada por override user-local; o arquivo global não foi alterado.

## Limite da automação

O ambiente conseguiu provar a criação da janela XWayland, mas o compositor
GNOME não aceita injeção XTest nos botões da decoração do Mutter. O clique
humano final nos três controles continua sendo a aceitação visual do desktop;
o caminho de execução que causava o bug (GTK nativo em Wayland) deixou de ser
usado pelo launcher.
