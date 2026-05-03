# 🦊 Finança Projeto Fox

Assistente financeiro pessoal via WhatsApp. Registre gastos, rendas e consulte resumos enviando mensagens naturais.

**Fase 1** - MVP funcional com registro de transações e consultas básicas.

---

## Requisitos

- Node.js 18+
- npm

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Copiar arquivo de configuração
cp .env.example .env

# 3. Editar o .env com suas chaves (veja seção Configuração)

# 4. Criar o banco de dados
npx prisma migrate dev --name init

# 5. Rodar o servidor
npm run dev
```

## Configuração do .env

```env
# Porta do servidor
PORT=3000

# Banco de dados (SQLite local)
DATABASE_URL="file:./dev.db"

# IA - Coloque sua chave da OpenAI
OPENAI_API_KEY=sk-sua-chave-aqui

# Evolution API (WhatsApp) - preencha quando conectar
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_INSTANCE=financa-fox
EVOLUTION_API_KEY=sua-chave-aqui
```

> **Sem chave da OpenAI?** O sistema funciona com fallback por regex. Só não vai interpretar mensagens ambíguas tão bem.

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Roda em modo desenvolvimento com hot-reload |
| `npm run build` | Compila TypeScript para JavaScript |
| `npm start` | Roda a versão compilada (produção) |
| `npx prisma migrate dev` | Roda migrações do banco |
| `npx prisma studio` | Abre interface visual do banco |

## Testando com Postman/Insomnia

O webhook funciona localmente sem WhatsApp real. Envie POST para:

```
POST http://localhost:3000/webhook/whatsapp
Content-Type: application/json
```

### Exemplo 1 - Registrar despesa (formato Evolution API)

```json
{
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    },
    "pushName": "Ygor",
    "message": {
      "conversation": "gastei 35 reais no mercado"
    }
  }
}
```

### Exemplo 2 - Registrar renda (formato simplificado)

```json
{
  "phone": "5511999999999",
  "text": "recebi 2890 de salário"
}
```

### Exemplo 3 - Compra no crédito

```json
{
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    },
    "pushName": "Ygor",
    "message": {
      "conversation": "comprei uma camiseta de 120 no crédito"
    }
  }
}
```

### Exemplo 4 - Resumo do mês

```json
{
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    },
    "message": {
      "conversation": "resumo do mês"
    }
  }
}
```

### Exemplo 5 - Resumo de hoje

```json
{
  "phone": "5511999999999",
  "text": "quanto gastei hoje?"
}
```

### Exemplo 6 - Ajuda

```json
{
  "phone": "5511999999999",
  "text": "/ajuda"
}
```

### Exemplo 7 - Mensagem não reconhecida

```json
{
  "phone": "5511999999999",
  "text": "bom dia"
}
```

## Conectando na Evolution API

1. Instale e configure a [Evolution API](https://github.com/EvolutionAPI/evolution-api)
2. Crie uma instância e conecte seu WhatsApp
3. Configure o webhook da instância apontando para:
   ```
   https://seu-dominio.com/webhook/whatsapp
   ```
   (ou use ngrok/cloudflared para expor localhost)
4. Preencha no `.env`:
   - `EVOLUTION_API_URL` = URL base da Evolution API
   - `EVOLUTION_INSTANCE` = nome da instância criada
   - `EVOLUTION_API_KEY` = chave de API da Evolution

## Deploy gratuito no Railway (recomendado)

Railway é a forma mais simples de hospedar sem usar seu próprio PC. Tem $5/mês grátis — suficiente para um bot leve.

### Passo a passo

**1. Crie uma conta em [railway.app](https://railway.app) (login com GitHub)**

**2. Suba o projeto no GitHub**
```bash
cd WhatsappOrganizador
git init
git add .
git commit -m "feat: Finança Projeto Fox - Fase 1"
# Crie um repositório no GitHub e conecte:
git remote add origin https://github.com/SEU-USUARIO/financa-fox.git
git push -u origin main
```

**3. No Railway: New Project → Deploy from GitHub repo → selecione o repositório**

**4. Adicione um banco PostgreSQL**
- No projeto Railway: `+ New` → `Database` → `Add PostgreSQL`
- Clique no banco → aba `Connect` → copie a `DATABASE_URL`

**5. Configure as variáveis de ambiente no Railway**

No serviço da sua aplicação → aba `Variables`, adicione:
```
PORT=3000
DATABASE_URL=<cole a URL do PostgreSQL copiada acima>
GEMINI_API_KEY=sua-chave-gemini
AI_PROVIDER=gemini
EVOLUTION_API_URL=http://sua-evolution-api
EVOLUTION_INSTANCE=financa-fox
EVOLUTION_API_KEY=sua-chave-evolution
TZ=America/Sao_Paulo
```

**6. Troque o provider do banco para PostgreSQL**

Edite `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"   // ← mude de "sqlite" para "postgresql"
  url      = env("DATABASE_URL")
}
```

Faça commit e push — o Railway vai redeployar automaticamente.

**7. Pegue a URL pública do bot**
- No Railway → aba `Settings` → `Networking` → `Generate Domain`
- Sua URL será algo como: `https://financa-fox.up.railway.app`
- O webhook ficará em: `https://financa-fox.up.railway.app/webhook/whatsapp`

**8. Configure esse webhook na Evolution API**

---

## Deploy na Vercel

1. Faça push do projeto para o GitHub
2. Importe no Vercel
3. Configure as variáveis de ambiente no painel da Vercel
4. Troque `DATABASE_URL` para o PostgreSQL do Supabase:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/db"
   ```
5. No `prisma/schema.prisma`, troque `provider = "sqlite"` para `provider = "postgresql"`
6. Rode `npx prisma migrate dev` contra o banco Supabase

## Mensagens aceitas

| Tipo | Exemplos |
|------|----------|
| Despesa | "gastei 35 no mercado", "paguei 12,50 no ônibus", "comprei camiseta de 120 no crédito" |
| Renda | "recebi 2890 de salário", "entrou 200 de bico" |
| Resumo hoje | "quanto gastei hoje?" |
| Resumo mês | "resumo", "quanto gastei esse mês?", "saldo do mês" |
| Ajuda | "/ajuda" |

## Fase 2 (planejada)

- Cartão de crédito e parcelas
- Contas fixas recorrentes
- Metas de economia
- Dashboard web
- Alertas automáticos
- Orçamento por categoria
- Importação de extrato bancário
