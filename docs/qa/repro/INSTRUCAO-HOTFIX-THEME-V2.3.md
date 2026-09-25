# INSTRUCAO-HOTFIX-THEME-V2.3

Este parágrafo introdutório precisa permanecer visível no mesmo slide do título. Ele descreve o hotfix de tema claro e o Presentation Mode.

## 3. Impacto cruzado

A tabela abaixo é o critério visual do modo claro. Cada célula precisa ser lida por inteiro.

| Superfície | Token | Efeito esperado |
| --- | --- | --- |
| Fundo do slide | --slide-bg | Latte #eff1f5 |
| Texto de tabela | --slide-text | Latte #4c4f69 |
| Heading | --slide-heading | Latte #1e66f5 |

- Item de lista que não pode sumir abaixo do heading.
- Segundo item, com texto suficiente para ocupar outra linha do slide.
- Terceiro item, usado para detectar corte por overflow.

```
diagrama ascii
  +------+
  | corpo|
  +------+
```

```ts
const contraste = "o bloco com linguagem permanece no slide";
```

Parágrafo final do slide de impacto. Se só o heading aparecer, o corpo foi cortado ou descartado.
