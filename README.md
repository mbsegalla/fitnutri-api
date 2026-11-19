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

### Perfis e ofertas no Postman

Com o token do profissional, envie `PUT /professionals/me` com `{"displayName":"Ana","slug":"ana-nutri","biography":"Consultoria online","specialties":["Esporte"],"modalities":["NUTRITION"],"formats":["ONLINE"]}`. Um atendimento `IN_PERSON` requer cidade e UF na publicação. A foto aceita uma URL HTTPS. O rascunho pode ser parcial e permanece privado até `PUT /professionals/me/publication`.

Cadastre uma oferta com `POST /professionals/me/offers` e `{"title":"Mensal","description":"Plano individual","modality":"NUTRITION","priceMinor":15000,"currency":"BRL","durationDays":30,"included":["Consulta"]}`. O preço está em unidades mínimas da moeda. Como visitante, use `GET /professionals?q=Ana&format=ONLINE&page=1&limit=20` e `GET /professionals/ana-nutri` para consultar o perfil e obter o ID da oferta. `PUT /professionals/me/unpublish` retira o perfil da busca e do detalhe público.

### Contratação e vínculo no Postman

Como cliente, envie `POST /contracts` com `offerId` e `requestKey` (UUID novo para cada contratação, reutilizado em retries). Com o token do profissional, consulte `GET /contracts` e envie `PATCH /contracts/{id}` com `{"action":"ACCEPT"}` ou `DECLINE`. O cliente pode usar `CANCEL` enquanto pendente. Após o aceite, ambos podem usar `END`. A oferta gratuita é ativada no aceite. Uma oferta paga aceita permanece inativa até confirmação financeira. Consulte o vínculo e as condições originais em `GET /contracts/{id}`.

### Avaliações e arquivos privados no Postman

Em um contrato gratuito aceito, use o token do cliente em `PUT /contracts/{id}/intake` com `{"goal":"Ganhar força","routine":"Expediente comercial"}`. Há campos específicos para hábitos alimentares ou experiência de treino. O profissional consulta e marca como revisada em `PUT /contracts/{id}/intake/review`, e registra medidas em `POST /contracts/{id}/assessments` com `assessedAt`, `notes` e `measures` (itens com `label`, `value` e `unit`).

Como cliente, envie **form-data** em `POST /contracts/{id}/documents`, campos `kind=EXAM` e `file` do tipo File (PDF, JPEG ou PNG, até 5 MiB). Para foto, use `PROGRESS_PHOTO` e JPEG ou PNG. O binário fica no PostgreSQL privado. Como profissional, baixe em `GET /contracts/{id}/documents/{documentId}/file` e envie `PUT .../{documentId}/analysis` com `{"text":"Devolutiva do profissional","publish":true}`. O cliente consulta o texto publicado em `GET /contracts/{id}/documents`. Outro vínculo exige autorização independente.

### Plano alimentar e execução no Postman

No contrato de nutrição, o profissional envia `POST /contracts/{id}/nutrition/plans` com `{"title":"Semana 1","meals":[{"name":"Almoço","foods":[{"name":"Arroz","portion":"3 colheres","substitutions":["Batata"]}]}]}`. Publique com `PUT .../plans/{planId}/publication`. Como cliente, consulte `GET .../nutrition/day?day=AAAA-MM-DD` (dia UTC) e registre `PUT .../plans/{planId}/logs` com `{"day":"AAAA-MM-DD","mealIndex":0,"status":"ADAPTED","comment":"Usei a substituição"}`. Use a data real. A ausência de registro indica refeição ainda sem resposta.

Para revisar, o profissional usa `POST .../plans/{planId}/copies`, edita a cópia com `PUT .../plans/{novoId}` e a publica. `GET .../nutrition/logs?from=AAAA-MM-DD&to=AAAA-MM-DD` mantém o ID da versão executada. O histórico publicado pode ser consultado depois do encerramento.

### Treino e diário no Postman

No vínculo de treino, use `POST /contracts/{id}/training/plans` como personal, com `{"title":"Semana A","workouts":[{"name":"Segunda","weekdays":[1],"exercises":[{"key":"agachamento","name":"Agachamento","mode":"REPS","sets":3,"reps":10,"restSeconds":60}]}]}`. Para tempo, informe `mode=TIME` e `seconds`. `GET .../training/exercises` devolve exercícios reutilizáveis do profissional. Publique em `PUT .../plans/{planId}/publication`.

Como cliente, consulte `GET .../training/day?day=AAAA-MM-DD`, inicie ou retome com `POST .../plans/{planId}/sessions` (`day` UTC de hoje e `workoutIndex:0`). Em `PUT .../training/sessions/{sessionId}/sets` envie `{"exerciseIndex":0,"setIndex":0,"reps":10,"loadKg":20}` e varie os índices e valores. O mesmo índice atualiza a série. Use `PUT .../sessions/{sessionId}/exercises` para observação ou exercício pulado, e `PUT .../sessions/{sessionId}/completion` para concluir. O personal compara execução e prescrição em `GET .../training/sessions?from=AAAA-MM-DD&to=AAAA-MM-DD&exerciseKey=agachamento`.

### Check-in, evolução e painel no Postman

Com o token do cliente, envie `PUT /contracts/{id}/check-ins` com `{"weekStart":"2026-11-16","adherence":3,"difficulty":"Viagem"}`. Use a segunda-feira da semana desejada e adesão de 1 a 5. Com o token profissional, abra `GET /professionals/me/dashboard`, siga o campo `href` do item e envie `PUT /contracts/{id}/check-ins/{checkId}/reply` com `{"reply":"Vamos ajustar o almoço nos dias de viagem."}`. Atualize o painel e consulte `GET /contracts/{id}/check-ins` como cliente.

Consulte `GET /contracts/{id}/timeline?from=2026-11-16&to=2026-11-22` para os eventos e `GET /contracts/{id}/evolution` com o mesmo período para os registros. Dias sem registro não contam como refeição ou exercício pulado.

### Conversa e notificações no Postman

Como cliente, use `POST /contracts/{id}/messages` com `{"requestKey":"<UUID>","body":"Consegui fazer o treino de hoje."}`. Mantenha o mesmo UUID ao reenviar. Com o token profissional, consulte `GET /contracts/{id}/messages?limit=20`. O retorno inclui as mensagens mais recentes, o total não lido e o cursor para a próxima página em `?before={next}`. Marque a leitura com `PUT /contracts/{id}/messages/{messageId}/read`. Cada conta consulta sua caixa em `GET /notifications` e confirma a leitura com `PUT /notifications/{notificationId}/read`. A caixa também recebe publicações de planos e respostas aos check-ins.

### Agenda e videochamada no Postman

1. Rode `pnpm env:setup` e `docker compose --profile video up -d livekit`. A API e o LiveKit leem a mesma chave local gerada no `.env`. Para um provedor hospedado, configure `LIVEKIT_URL` com `wss://`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`. O Compose atende clientes que rodam na própria máquina.
2. Como profissional, use `POST /professionals/me/availability` com `{"startsAt":"2026-12-01T09:00:00-03:00","endsAt":"2026-12-01T09:45:00-03:00","timeZone":"America/Sao_Paulo","format":"ONLINE"}`. Troque a data por um horário futuro. A API retorna o instante em UTC e o fuso IANA para exibição.
3. Como cliente, abra `GET /contracts/{id}/availability` e envie `POST /contracts/{id}/appointments` com `{"slotId":"<UUID>","requestKey":"<UUID>"}`. Os dois participantes podem consultar `GET /contracts/{id}/appointments` e `GET /notifications`. Para reagendar, envie `PUT .../appointments/{appointmentId}/schedule` com `slotId` e `expectedRevision`. Para cancelar, use `PUT .../appointments/{appointmentId}/cancellation`.
4. Entre 15 minutos antes do início e o fim da consulta, cada participante usa seu próprio Bearer em `POST .../appointments/{appointmentId}/room`. Passe o `url` e o `token` recebidos ao cliente LiveKit (`room.connect(url, token)`). Os dois tokens autorizam a mesma sala privada e identificam pessoas diferentes. O token de entrada vale até dois minutos. Para validar o servidor pelo Postman, use `GET http://127.0.0.1:7880/rtc/validate` com o token **da sala** em Bearer.

### Webhooks do Stripe em sandbox

O receptor registra o ID, o tipo, o objeto, a conta de origem quando informada e o instante de cada evento assinado de teste. A mesma entrega pode ser repetida sem criar um segundo registro. O evento fica disponível para conciliação pelo ID no Stripe. A assinatura de uso da plataforma pelo profissional e a compra de consultoria pelo cliente são produtos distintos. Até a definição de titularidade e repasse, a oferta paga aceita fica com pagamento pendente e o vínculo permanece inativo.

Com a Stripe CLI autenticada no sandbox, execute `stripe listen --events checkout.session.completed,invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:3000/billing/stripe/webhook`. Copie o `whsec_...` exibido para `STRIPE_TEST_WEBHOOK_SECRET` no `.env` e reinicie a API. Em outro terminal, use `stripe trigger invoice.paid` ou `stripe trigger invoice.payment_failed`. O listener deve mostrar HTTP 200. Requisições sem assinatura válida ou com evento de produção recebem 400. O teste e2e verifica duplicatas simultâneas, eventos fora de ordem e assinatura inválida sem chave de conta.
