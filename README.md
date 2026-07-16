# Notas

App de notas pessoal (estilo Apple Notes): notas em Markdown e notas manuscritas (caneta/stylus),
PWA instalável, offline-first com IndexedDB, sincronizando com um servidor WebDAV. O backend cria
seu próprio servidor WebDAV internamente (mesmo processo) — não depende de nenhum serviço externo.

## Rodando localmente para teste

O app não tem tela de configuração — cliente e API são sempre a mesma origem, e o próprio
servidor injeta o token na página que ele serve. Por isso o teste local também precisa passar
por esse mesmo caminho: build do client + backend servindo tudo (não dá pra usar o Vite dev
server isolado, já que ele ficaria numa origem diferente da API).

Requer Node 20+.

```bash
npm install --workspaces

cp server/.env.example server/.env   # ajuste API_TOKEN se quiser (ou deixe em branco = sem auth)

npm run build --workspace client
mkdir -p server/public && cp -r client/dist/* server/public/

npm run dev:server   # ou: npm run build --workspace server && npm start --workspace server
```

Abra `http://localhost:4000` (ou `http://<IP-da-sua-máquina>:4000` de outro dispositivo na mesma
rede). Já abre logado — nada para digitar.

Ao alterar código do `client`, repita o `build`+`cp` antes de recarregar a página.

## Deploy em produção (Docker Compose no M1)

Um único container cuida de tudo: build do frontend, backend Express e o servidor WebDAV (interno,
só em loopback dentro do próprio container — nunca exposto).

```bash
cp .env.example .env
```

Ajuste no `.env`:
- `NOTES_DATA_DIR` — pasta no host (M1) onde as notas ficam gravadas de fato. Pode ser qualquer
  caminho (outro disco, pasta já incluída no seu backup, etc.) — é o único lugar que você precisa
  escolher onde os dados realmente residem.
- `WEBDAV_USERNAME` / `WEBDAV_PASSWORD` — credenciais do WebDAV interno (não usadas de fora).
- `API_TOKEN`, `ALLOWED_ORIGIN`, `CADDY_NETWORK_NAME`.

```bash
docker compose up -d --build
```

Adicione ao `Caddyfile` existente:

```
notas.seudominio.com {
    reverse_proxy app:4000
}
```

Depois, abra `https://notas.seudominio.com` — já abre logado (o servidor injeta o token
automaticamente na página, não tem nada para configurar). Nesse ponto o app pode ser instalado
como PWA.

## Estrutura

- `client/` — React + Vite + TS, PWA (Dexie/IndexedDB para offline, `perfect-freehand` para tinta
  vetorial, CodeMirror para Markdown).
- `server/` — Express (API + serve o build do `client` em produção via `SERVE_CLIENT=true`) e um
  servidor WebDAV real rodando no mesmo processo (`webdav-server`, biblioteca Node, sem Apache/
  imagem externa), gravando os arquivos em `DATA_DIR`.
- `docker-compose.yml` / `Dockerfile` — um único serviço (`app`), com um único volume
  (`NOTES_DATA_DIR` → `/data`) onde o usuário escolhe o local real de armazenamento.

Detalhes de arquitetura e decisões de design (LWW, soft-delete, segurança) estão documentados no
plano original da sessão de desenvolvimento.
