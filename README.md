# Publicador YouTube

App web pra fazer upload de videos prontos em 3 canais do YouTube com:
- Geracao de **titulo, descricao e tags** via OpenAI GPT-4o-mini
- Geracao de **thumbnail** via OpenAI gpt-image-1 (1280x720)
- **Agendamento** nativo do YouTube (status=private + publishAt)
- Upload **direto browser -> YouTube** (vai por fora do backend, sem limite de tamanho do Vercel)

## Setup local

```bash
npm install
# preencha as 7 envs no .env.local
npm run dev
```

## Variaveis de ambiente (.env.local)

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=...
YT_REFRESH_TOKEN_CANAL_1=...
YT_REFRESH_TOKEN_CANAL_2=...
YT_REFRESH_TOKEN_CANAL_3=...
YT_CHANNEL_1_NAME=Nome bonito Canal 1
YT_CHANNEL_2_NAME=Nome bonito Canal 2
YT_CHANNEL_3_NAME=Nome bonito Canal 3
```

## Coletar refresh tokens (1 por canal)

```bash
npm run oauth -- 1   # canal 1: abre browser, voce loga na conta Google do canal 1, autoriza
npm run oauth -- 2   # canal 2
npm run oauth -- 3   # canal 3
```

O script salva sozinho no `.env.local` e detecta o nome do canal.

## Cron para postar agendados (TikTok)

Vercel Hobby permite cron **1x/dia** (vercel.json roda meio-dia UTC). Pra precisao de minutos:

1. Cria conta gratis em https://cron-job.org
2. Novo cronjob:
   - URL: `https://publicador-youtube.vercel.app/api/cron/post-due`
   - Schedule: a cada 5 minutos
   - Headers: `Authorization: Bearer <CRON_SECRET>` (pega o valor em Vercel Settings > Env Vars)

## Deploy Vercel

1. `vercel link` (ou conecta o repo GitHub na dashboard)
2. Copia as MESMAS 7 envs em Project Settings > Environment Variables
3. Deploy. URL: `https://publicador-youtube.vercel.app`
