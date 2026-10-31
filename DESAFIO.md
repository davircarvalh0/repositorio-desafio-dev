# 🌿 Desafio: Folhagem & Cia — Loja de Plantas

A **Folhagem & Cia** vende plantas pela internet e controla tudo numa planilha. Já deu problema: a loja vendeu uma samambaia que não existia mais no estoque. A missão de vocês é construir a API que substitui essa planilha.

O CRUD de usuários deste repositório (`UserController.ts` e `UserRepository.ts`) é o modelo: quase tudo que vocês vão fazer nas plantas tem um equivalente lá.

**Para começar:** crie o **seu** repositório pelo botão **Use this template → Create a new repository** no GitHub, clone e siga o [README](README.md) para rodar.

---

## 1. A entidade `Planta`

| Campo | Tipo | Exemplo | Observação |
|---|---|---|---|
| `id` | Int (autoincrement) | `1` | Gerado pelo banco |
| `nome` | String | `"Costela-de-adão"` | Nome popular |
| `especie` | String | `"Monstera deliciosa"` | Nome científico |
| `preco` | Int | `8990` | Em **centavos** (`8990` = R$ 89,90) |
| `estoque` | Int | `12` | Vasos disponíveis |
| `luminosidade` | Enum `Luminosidade` | `"MEIA_SOMBRA"` | `SOMBRA`, `MEIA_SOMBRA` ou `SOL_PLENO` |
| `petFriendly` | Boolean | `true` | Segura para cães e gatos? |
| `regaACadaDias` | Int | `3` | De quantos em quantos dias regar |
| `createdAt` / `updatedAt` | DateTime | | Automáticos, como no `User` |

---

## 2. Rotas

| Método | Rota | O que faz | Sucesso |
|---|---|---|---|
| `POST` | `/plantas` | Cadastra uma planta | `201` |
| `GET` | `/plantas` | Lista as plantas, com filtros opcionais `?luminosidade=` e `?petFriendly=` (sozinhos ou juntos) | `200` |
| `GET` | `/plantas/:id` | Busca uma planta | `200` |
| `PATCH` | `/plantas/:id` | Edita só os campos enviados | `200` |
| `DELETE` | `/plantas/:id` | Remove uma planta | `204` |
| `POST` | `/plantas/:id/venda` | Recebe `{ "quantidade": 2 }` e diminui o estoque | `200` |
| `GET` | `/plantas/estoque/valor-total` | Soma `preco × estoque` e o total de vasos: `{ "valorTotalEmCentavos": 154300, "totalDeVasos": 37 }` | `200` |

---

## 3. Regras de negócio

1. Todos os campos são obrigatórios no cadastro. Na edição, nenhum é, mas os que vierem passam pelas mesmas regras.
2. `preco` maior que zero; `regaACadaDias` pelo menos `1`.
3. `estoque` não pode ser negativo, mas **pode ser zero** (planta esgotada).
4. `luminosidade` só aceita os três valores do enum.
5. Dados inválidos (no cadastro, na edição, nos filtros ou na venda) retornam `400` com uma mensagem clara.
6. Um `id` que não existe retorna `404`.
7. A venda nunca deixa o estoque negativo: sem estoque suficiente, retorna `400` e não altera nada.

---

## 4. Bônus (só depois do obrigatório)

- 🔎 Busca por nome sem diferenciar maiúsculas: `?nome=costela`
- ↕️ Ordenação: `?ordem=preco` ou `?ordem=nome`
- 🏷️ Rota `GET /plantas/esgotadas`, que lista as plantas com estoque zero
- 🌱 Script de *seed* com plantas de exemplo

Os bônus contam pontos extras, mas não compensam requisitos obrigatórios faltando.

---

## 5. Entregáveis

São **dois**, enviados juntos pelo canal e no prazo informados pelos instrutores.

### 📦 1. O repositório

- Criado pelo **Use this template**, com o código na branch `main`.
- Sobe do zero com `docker compose up -d --build` + `yarn migration`, com a migration da `Planta` commitada.
- Nomes de campos e rotas iguais aos deste enunciado.
- `yarn typecheck` sem erros; sem `console.log` de teste, imports sem uso ou código comentado.
- Commits pequenos e com mensagens claras; `.env` fora do git.
- Público, ou com acesso liberado para os instrutores.

### 📝 2. O documento da API

- **Visão geral:** o que a API faz e a stack usada.
- **Como rodar:** passo a passo para subir o projeto do zero.
- **Modelo de dados:** os campos da `Planta` e o enum `Luminosidade`.
- **Rotas:** para cada uma, método, URL, parâmetros/filtros, exemplo de corpo da requisição e de resposta.
- **Erros e status HTTP:** quais erros cada rota pode retornar (`400`, `404`, `500`) e em que situação.
- **Decisões e bônus:** o que foi feito além do obrigatório e qualquer decisão diferente do enunciado (por exemplo, como tratou duas vendas simultâneas do último vaso).

---

## 6. Como vamos avaliar

| Critério | O que olhamos |
|---|---|
| **Funcionamento** | Todas as rotas funcionam |
| **Status HTTP** | O status certo em cada caso |
| **Validações** | Regras respeitadas, mensagens claras |
| **Organização** | Controller e repository separados |
| **Prisma** | Model, migration, `where` e enum |
| **Código limpo** | Nomes claros, sem código morto, commits organizados |
| **Documento** | Completo, claro e fiel ao que a API realmente faz |

Boa sorte e boas regas! 🪴
