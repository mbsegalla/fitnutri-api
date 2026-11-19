# Fit Nutri API

Backend do Fit Nutri em NestJS e TypeScript.

## Desenvolvimento local

Use Node.js 24 e a versão do pnpm indicada em `package.json`.

```sh
pnpm install
pnpm start:dev
```

A API escuta na porta 3000 por padrão. Defina `PORT` para usar outra porta.

## Verificações

| Comando             | O que verifica                       |
| ------------------- | ------------------------------------ |
| `pnpm typecheck`    | Tipos do TypeScript                  |
| `pnpm lint`         | Regras do ESLint e ordem dos imports |
| `pnpm format:check` | Formatação com Prettier              |
| `pnpm test`         | Testes unitários                     |
| `pnpm test:e2e`     | Inicialização da aplicação HTTP      |
| `pnpm build`        | Compilação para produção             |

Use `pnpm lint:fix` e `pnpm format` para aplicar correções automáticas.

## Commits

Prepare os arquivos com `git add` e execute `pnpm commit` para usar o assistente do Commitizen.
Também é possível usar `git commit -m "chore: configura ambiente de desenvolvimento"`.

O Husky executa as verificações de tipos, lint e formatação antes de cada commit.
O commitlint valida o padrão Conventional Commits e limita o cabeçalho a 100 caracteres.
