# WriteIt

Jogo educacional de elicitação de requisitos de software.

## Como rodar localmente (sandbox)

### Pré-requisitos

- Node.js 18+ e npm
- MySQL 8.0.13+

### 1. Clone o repositório

```sh
git clone <URL_DO_REPOSITORIO>
cd writeit
```

### 2. Instale as dependências

```sh
npm install
```

### 3. Configure o banco de dados sandbox

O arquivo `.env.sandbox` já vem configurado para MySQL local:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=writeit_sandbox
DB_USER=root
DB_PASSWORD=
```

Ajuste `DB_USER` e `DB_PASSWORD` conforme sua instalação do MySQL.

### 4. Crie o banco e execute as migrations

```sh
# Instala as dependências de migração (só precisa fazer uma vez)
npm install mysql2 dotenv

# Roda as migrations no banco sandbox
npm run db:migrate:sandbox
```

Isso irá:
- Criar o banco `writeit_sandbox` (se não existir)
- Criar todas as tabelas
- Inserir o cenário PoneyZap e a configuração padrão de jogo

### 5. Suba o frontend

```sh
npm run dev
```

O app abrirá em `http://localhost:8080` no modo **sandbox** (MySQL local).

---

## Ambientes disponíveis

| Comando               | Ambiente   | Banco                      |
|-----------------------|------------|----------------------------|
| `npm run dev`         | sandbox    | MySQL localhost             |
| `npm run dev:sandbox` | sandbox    | MySQL localhost             |
| `npm run dev:prod`    | production | MySQL produção (`.env.production`) |

## Migrations de banco de dados

| Comando                      | Descrição                          |
|------------------------------|------------------------------------|
| `npm run db:migrate:sandbox` | Roda migrations no banco sandbox   |
| `npm run db:migrate:prod`    | Roda migrations no banco produção  |

Os arquivos de migration estão em `mysql/migrations/`:

| Arquivo                       | Conteúdo                              |
|-------------------------------|---------------------------------------|
| `001_create_tables.sql`       | Todas as tabelas do schema            |
| `002_create_procedures.sql`   | Triggers e stored procedures          |
| `003_seed_data.sql`           | Dados iniciais (cenário PoneyZap)     |

## Build para produção

```sh
# Gerar build de produção
npm run build:prod

# Antes do deploy, configure .env.production com as credenciais reais
# e rode as migrations de produção:
npm run db:migrate:prod
```

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn-ui + Tailwind CSS
- **Banco**: MySQL 8.0+
- **Estado**: TanStack React Query

## Projeto Lovable

URL do projeto: https://lovable.dev/projects/e263614e-e286-4fe9-9c4f-21e7c21d165f
