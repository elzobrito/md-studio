# Design System Audit — Botões MD Studio

Data: 2026-09-19  
Onda: 0C UI Polish  
Task: `MD-UI-BUTTONS-001`

## Objetivo
Auditoria e mapeamento dos hotspots de botões da interface chrome para o componente unificado `Button` (`src/components/ui/Button.tsx`).

## Tabela de Migração de Hotspots

| Componente | Botão / Ação | Variant Atual | Variant Alvo | Status |
|------------|--------------|---------------|--------------|--------|
| `FileExplorer.tsx` | Abrir pasta | `.btn-primary` (tag `<button>`) | `Button variant="primary" size="md" fullWidth` | ✅ Migrado |
| `FileExplorer.tsx` | Abrir arquivo | `.btn-secondary` (tag `<button>`) | `Button variant="secondary" size="md" fullWidth` | ✅ Migrado |
| `WelcomeScreen.tsx` | Abrir pasta | `.empty-state-btn.primary` | `Button variant="primary" size="md"` | ✅ Migrado |
| `WelcomeScreen.tsx` | Abrir arquivo | `.empty-state-btn.secondary` | `Button variant="secondary" size="md"` | ✅ Migrado |
| `WelcomeScreen.tsx` | Novo Documento | `.empty-state-btn.ghost` | `Button variant="ghost" size="md"` | ✅ Migrado |
| `EmptyState.tsx` | Escrever Novo Documento | `.empty-state-btn.secondary` | `Button variant="secondary" size="md"` | ✅ Migrado |
| `ViewModeToggle.tsx` | Markdown / Formatado / Dividida | `.view-mode-btn` | `Button variant="primary" / "ghost" size="sm"` | ✅ Migrado |
| `SaveButton.tsx` | Salvar / Salvo / Salvando | `.save-btn` | `Button variant="primary" / "secondary" size="sm"` | ✅ Migrado |
| `NewDocumentModal.tsx` | Cancelar / Criar Documento | Sem footer com botões | `Button variant="secondary" / "primary" size="md"` | ✅ Migrado |

## Tokens Visuais e Consistência
- **Border Radius**: `--radius-btn: 6px` unificado em `src/styles/button.css`.
- **Tipografia**: `font-weight: 500`, tamanhos `12px` (sm) e `13px` (md).
- **Temas**: Compatível com dark (`Catppuccin Mocha`) e light (`Latte`) através dos tokens CSS já definidos (`--color-accent`, `--bg-secondary`, `--border`, `--text-primary`, `--color-hover`).
- **Fora do escopo**: Barra de formatação CM6 da Onda 0B (`FormattingToolbar`) preservada para evitar regressão na edição rica.
