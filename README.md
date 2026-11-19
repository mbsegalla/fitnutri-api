# Fit Nutri API

Backend do Fit Nutri em NestJS e TypeScript.

## Desenvolvimento local

Use Node.js 24, pnpm 10.32.1 e Docker com Compose v2. Na raiz do clone, crie `.env` a partir de `.env.example` (`cp .env.example .env` no Bash ou `Copy-Item .env.example .env` no PowerShell). Depois execute:

```sh
pnpm install --frozen-lockfile
docker compose up -d --wait db
pnpm prisma:generate
pnpm start:dev
```

O Compose expõe o PostgreSQL de desenvolvimento em `127.0.0.1:5432` e mantém os dados em um volume. A API lê `DATABASE_URL` e `PORT` na inicialização. A porta padrão da API é 3000.

### Documentação da API

Com a API em execução, abra [Swagger UI](http://localhost:3000/docs). Em **Health**, selecione uma operação e clique em **Try it out** e **Execute** para ver a resposta do seu ambiente. Para importar o contrato no Postman, use o [documento OpenAPI em JSON](http://localhost:3000/docs-json).

A interface e o JSON ficam disponíveis por padrão em desenvolvimento. Com `NODE_ENV=production`, ficam desativados por padrão. Defina `SWAGGER_ENABLED=true` ou `SWAGGER_ENABLED=false` para escolher explicitamente e reinicie a aplicação.

### Verificar a API

Acesse os endpoints no navegador ou no Postman:

| Requisição                               | Resultado esperado                                                    |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `GET http://localhost:3000/health/live`  | HTTP 200 com `{"status":"ok"}` enquanto o processo responde           |
| `GET http://localhost:3000/health/ready` | HTTP 200 com `{"status":"ready"}` quando a consulta ao banco funciona |

Com a API aberta, execute `docker compose stop db` em outro terminal. A readiness passa a responder HTTP 503 e a liveness continua respondendo HTTP 200. Execute `docker compose up -d --wait db` para recuperar a readiness.

### Prisma e migrations

O schema inicial contém apenas o gerador do client e o datasource PostgreSQL. Após adicionar um modelo em `prisma/schema.prisma`, use `pnpm prisma:migrate --name nome_da_mudanca` em desenvolvimento, versione a migration e execute `pnpm prisma:generate` para atualizar o client. Em ambientes com migrations versionadas, use `pnpm prisma:deploy` para aplicá-las. Gere o client antes das verificações de tipos e do build em um clone novo.

## Verificações

Os testes unitários rodam sem banco. Para os testes e2e, inicie o serviço isolado com `docker compose --profile test up -d --wait db-test` e execute `pnpm test:e2e`. A suíte usa `fitnutri_test` na porta 5433 em um volume temporário. Para usar outro PostgreSQL de teste, defina `TEST_DATABASE_URL` no ambiente do terminal.

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
Também é possível usar `git commit -m "chore: configure development environment"`.

O Husky executa as verificações de tipos, lint e formatação antes de cada commit.
O commitlint valida o padrão Conventional Commits e limita o cabeçalho a 100 caracteres.
