# Paleta de cores — MD Studio

Referência implementada em `src/styles/themes/light.css` e `src/styles/themes/dark.css`.
Os nomes seguem Catppuccin Latte (claro) e Mocha (escuro).
Fonte dos valores: [catppuccin/catppuccin](https://github.com/catppuccin/catppuccin).

O realce de código usa Shiki `catppuccin-latte` e `catppuccin-mocha` (`src/markdown/shiki.ts`).

## Superfícies

| Token | Latte | Mocha |
| --- | --- | --- |
| `--bg-base` / `--slide-bg` | `#eff1f5` | `#1e1e2e` |
| `--bg-surface` / `--bg-mantle` | `#e6e9ef` | `#181825` |
| `--bg-overlay` / `--slide-surface` | `#dce0e8` | `#313244` |
| `--bg-crust` | `#dce0e8` | `#11111b` |
| `--code-bg` | `#dce0e8` | `#181825` |

## Texto

| Token | Latte | Mocha |
| --- | --- | --- |
| `--text-primary` / `--slide-text` / `--slide-preformatted` | `#4c4f69` | `#cdd6f4` |
| `--text-secondary` | `#6c6f85` | `#a6adc8` |
| `--text-muted` | `#8c8fa1` | `#7f849c` |
| `--text-disabled` | `#acafc4` | `#585b70` |
| `--text-inverse` | `#eff1f5` | `#1e1e2e` |
| `--slide-heading` / `--color-accent` / `--color-info` | `#1e66f5` | `#89b4fa` |

## Acentos e semântica

| Token | Latte | Mocha |
| --- | --- | --- |
| `--color-accent-2` | `#8839ef` | `#cba6f7` |
| `--color-accent-3` | `#04a5e5` | `#89dceb` |
| `--color-success` | `#40a02b` | `#a6e3a1` |
| `--color-warning` | `#df8e1d` | `#f9e2af` |
| `--color-error` | `#d20f39` | `#f38ba8` |
| `--color-accent-hover` | `#7287fd` | `#b4befe` |
| `--inline-code-color` | `#d20f39` | `#f38ba8` |

## Bordas e interação

| Token | Latte | Mocha |
| --- | --- | --- |
| `--border` / `--slide-border` | `#ccd0da` | `#313244` |
| `--border-strong` | `#acafc4` | `#45475a` |
| `--color-hover` | `#dce0e8` | `#313244` |
| `--color-selection` | `#ccd0da` | `#45475a` |
| `--color-focus` | `#1e66f5` | `#89b4fa` |

## Contraste do texto normal

Cálculo WCAG 2.x (luminância relativa sRGB) feito em 24/09/2026 sobre os tokens efetivos:

| Par | Razão | AA 4.5:1 |
| --- | --- | --- |
| `#4c4f69` sobre `#eff1f5` (texto claro) | 7.06:1 | sim |
| `#cdd6f4` sobre `#1e1e2e` (texto escuro) | 11.34:1 | sim |
| `#4c4f69` sobre `#dce0e8` (código claro) | 6.04:1 | sim |
| `#cdd6f4` sobre `#181825` (código escuro) | 12.14:1 | sim |
| `#d20f39` sobre `#eff1f5` (código inline claro) | 4.80:1 | sim |

O heading claro `#1e66f5` sobre `#eff1f5` mede 4.34:1. No slide ele é negrito e maior que o texto corrido; o critério de 4.5:1 desta rodada vale para o texto normal, que passa.
