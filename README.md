# Fit Nutri API

Backend do Fit Nutri em NestJS e TypeScript.

## Desenvolvimento local

Use Node.js 24, pnpm 10.32.1 e Docker com Compose v2. Na raiz do clone, execute:

```sh
pnpm install --frozen-lockfile
pnpm env:setup
docker compose up -d --wait db
pnpm prisma:generate
pnpm prisma:deploy
pnpm start:dev
```

O comando `pnpm env:setup` cria o `.env` local ou completa as variáveis ausentes usando `.env.example`. Na primeira execução, substitui `AUTH_JWT_SECRET` vazio ou de exemplo por um segredo aleatório de 64 caracteres hexadecimais. As próximas execuções preservam sua chave. `pnpm start:dev` e `pnpm start:debug` executam essa preparação automaticamente.

Para produção, configure um segredo próprio no ambiente de deploy. Você pode gerar a chave com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

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

### Identidade no Postman

Use `http://localhost:3000` como URL base e selecione **Body → raw → JSON** nas requisições POST. Cada conta pode atuar como cliente e, futuramente, ter um perfil profissional.

1. Envie `POST /auth/register` com o corpo abaixo. A API remove espaços nas extremidades do nome e do e-mail e converte o e-mail para minúsculas. A senha aceita de 12 a 128 caracteres e preserva espaços. A resposta `201` contém `id`, `name` e `email`. Um e-mail já cadastrado retorna `409`.

   ```json
   {
     "name": "Ana Silva",
     "email": "Ana@example.com",
     "password": "Exemplo de senha local!"
   }
   ```

2. Envie `POST /auth/login` com o mesmo e-mail e senha. A resposta `200` contém `accessToken`, `tokenType` e `expiresIn` em segundos. Copie o valor de `accessToken`.

   ```json
   {
     "email": "ana@example.com",
     "password": "Exemplo de senha local!"
   }
   ```

3. Em `GET /auth/me`, selecione **Authorization → Bearer Token**, cole o token e envie. A resposta `200` traz a conta identificada pelo token. Para testar no Swagger, use **Authorize**. Credenciais incorretas no login ou um token inválido ou expirado em `/auth/me` retornam `401`.

O token expira após 900 segundos por padrão. Configure `AUTH_ACCESS_TOKEN_TTL_SECONDS` com um inteiro entre 1 e 86400 para ajustar a validade. Depois de expirar, faça login novamente.

### Prisma e migrations

Após adicionar um modelo em `prisma/schema.prisma`, use `pnpm prisma:migrate --name nome_da_mudanca` em desenvolvimento, versione a migration e execute `pnpm prisma:generate` para atualizar o client. Em ambientes com migrations versionadas, use `pnpm prisma:deploy` para aplicá-las. Gere o client antes das verificações de tipos e do build em um clone novo.

## Verificações

Os testes unitários rodam sem banco. Para os testes e2e, inicie o serviço isolado com `docker compose --profile test up -d --wait db-test` e execute `pnpm test:e2e`. A suíte aplica as migrations no banco de teste e usa `fitnutri_test` na porta 5433 em um volume temporário. Para usar outro PostgreSQL de teste, defina `TEST_DATABASE_URL` no ambiente do terminal.

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
