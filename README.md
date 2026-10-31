# Treinamento de CRUD — CITi

API de exemplo com um **CRUD de usuários** para o treinamento de back-end dos aspirantes.

**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL · Docker

> **CRUD** = **C**reate, **R**ead, **U**pdate e **D**elete: as quatro operações básicas de qualquer cadastro (criar, listar/buscar, editar e remover).

| Arquivo | O que tem |
|---|---|
| `README.md` (este) | Como rodar o projeto e como o CRUD de usuários funciona |
| [`DESAFIO.md`](DESAFIO.md) | O enunciado do desafio Folhagem & Cia: o que construir e entregar |

---

## ✅ Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/): roda a API e o banco em containers. **Deixe ele aberto** sempre que for rodar o projeto.
- [Node.js 20+](https://nodejs.org): para rodar os comandos `yarn` na sua máquina.
- Yarn: `npm install -g yarn`
- Um cliente HTTP para testar as rotas: [Thunder Client](https://www.thunderclient.com/) (extensão do VS Code), Insomnia ou Postman.

---

## ⚙️ Como rodar

Com o Docker Desktop aberto, rode na raiz do projeto:

```bash
# 1. Crie o .env a partir do modelo
cp .env.example .env        # no PowerShell ou CMD: copy .env.example .env

# 2. Instale as dependências na sua máquina
#    (sem isso, o yarn migration dá "cross-env não é reconhecido")
yarn

# 3. Suba a API e o banco
docker compose up -d --build

# 4. Crie as tabelas no banco a partir das migrations
yarn migration
```

Para conferir, abra `http://localhost:3001` no navegador. Deve aparecer:

```json
{ "message": "API do treinamento de CRUD do CITi 🚀" }
```

### O `.env`

O `.env` guarda as configurações do projeto e **não vai para o git**. Os valores do `.env.example` já funcionam na sua máquina, então não precisa trocar nada. As únicas variáveis que você pode querer mexer:

| Variável | Quando mexer |
|---|---|
| `SERVER_PORT` | A porta 3001 já está em uso |
| `DATABASE_PORT` | A porta 5432 já está em uso (por exemplo, por um Postgres instalado na máquina) |

> **Por que o host do banco é `treinamento-crud-db` e não `localhost`?** A API roda *dentro* do Docker e enxerga o banco pelo nome do container. Os comandos que rodam na sua máquina (`yarn migration` e `yarn studio`) trocam o host para `localhost` sozinhos.

### Comandos do dia a dia

| Comando | O que faz |
|---|---|
| `docker compose up -d` | Sobe a API e o banco |
| `docker compose logs -f server` | Mostra os logs da API (é aqui que os erros aparecem) |
| `docker compose down` | Derruba os containers (os dados do banco continuam salvos) |
| `yarn migration` | Cria uma migration a partir do `schema.prisma` e aplica no banco |
| `yarn studio` | Abre o Prisma Studio para ver o banco no navegador |
| `yarn typecheck` | Procura erros de tipo no TypeScript |

A API recarrega sozinha quando você salva um arquivo em `src/`. Só precisa rodar `docker compose up -d --build` de novo se mudar o `package.json` ou o `Dockerfile`.

> Prefere npm? Todos os comandos funcionam com `npm install` e `npm run <comando>`.

---

## 📁 Estrutura

```
prisma/
  schema.prisma          # Models (tabelas) do banco
  migrations/            # Histórico de mudanças no banco, gerado pelo yarn migration
src/
  server.ts              # Cria o app Express e sobe o servidor
  routes.ts              # Liga cada rota HTTP a uma função do controller
  database/index.ts      # Conexão com o banco (Prisma Client)
  controllers/           # Recebe a requisição, valida e responde
  repositories/          # Única camada que conversa com o banco
```

O caminho de uma requisição:

```
Requisição → routes.ts → Controller → Repository → Banco
                              ↓
Resposta  ←───────────────────┘  (status HTTP + JSON)
```

---

## 🔌 CRUD de usuários

| Campo | Tipo | Observação |
|---|---|---|
| `id` | número | Gerado pelo banco (1, 2, 3...) |
| `nome` | texto | Obrigatório |
| `conta` | `"CPF"` ou `"CNPJ"` | Obrigatório, em maiúsculas |
| `documento` | texto | Obrigatório e único (não pode repetir) |
| `createdAt` / `updatedAt` | data | Preenchidos pelo banco |

| Método | Rota | O que faz | Sucesso | Erros |
|---|---|---|---|---|
| `POST` | `/users` | Cadastra um usuário | `201` | `400` se faltar campo |
| `GET` | `/users` | Lista todos os usuários | `200` | |
| `GET` | `/users/:id` | Busca um usuário pelo id | `200` | `404` se o id não existir |
| `PATCH` | `/users/:id` | Edita só os campos enviados | `200` | `404` se o id não existir |
| `DELETE` | `/users/:id` | Remove o usuário | `204` | `404` se o id não existir |

Qualquer erro inesperado responde `500`.

Exemplo de corpo para `POST /users`:

```json
{
  "nome": "Maria Silva",
  "conta": "CPF",
  "documento": "12345678900"
}
```

Para o `PATCH`, envie só o que vai mudar: `{ "nome": "Maria S. Silva" }`.

### Testando no Thunder Client

1. Crie uma requisição, escolha o método (`POST`, `GET`...) e use a URL `http://localhost:3001/users`.
2. Para `POST` e `PATCH`, vá em **Body → JSON** e cole o JSON **puro**, sem aspas em volta e sem `\"`.
3. Para as rotas com `:id`, troque pelo número do usuário: `http://localhost:3001/users/1`.

---

## 🆘 Problemas comuns

| Erro | O que fazer |
|---|---|
| `'cross-env' não é reconhecido como um comando` | Faltou instalar as dependências na sua máquina: rode `yarn`. |
| `Environment variable not found: DATABASE_URL` | Falta o `.env` na raiz do projeto: `cp .env.example .env`. |
| `failed to connect to the docker API` | O Docker Desktop está fechado. Abra e espere ele ficar pronto. |
| `port is already allocated` | Troque `SERVER_PORT` ou `DATABASE_PORT` no `.env` e suba de novo. |
| `Can't reach database server` | Os containers não estão de pé: `docker compose up -d`. |
| `Property 'user' does not exist on type 'PrismaClient'` | Rode `yarn migration` e, no VS Code, **Ctrl+Shift+P → Restart TS Server**. |
| A API não responde em `localhost:3001` | Veja o erro em `docker compose logs -f server`. |
| `500` ao criar ou editar depois de mudar o `schema.prisma` | O banco ainda está com as colunas antigas: rode `yarn migration`. |
| `SyntaxError: ... is not valid JSON` ou `req.body` chega `undefined` | O corpo não foi como JSON. Cole o JSON puro em **Body → JSON**. |

> Dica: rode `yarn typecheck` antes de testar. A API não mostra erros de tipo ao rodar, mas o `typecheck` mostra todos de uma vez.
