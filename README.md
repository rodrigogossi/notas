# Notas

[![License: MIT](https://img.shields.io/github/license/rodrigogossi/notas)](LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/rodrigogossi/notas)](https://hub.docker.com/r/rodrigogossi/notas)
[![Docker Image Size](https://img.shields.io/docker/image-size/rodrigogossi/notas/latest)](https://hub.docker.com/r/rodrigogossi/notas)
[![Publish Docker image](https://github.com/rodrigogossi/notas/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/rodrigogossi/notas/actions/workflows/docker-publish.yml)

App de notas self-hosted, estilo Apple Notes/Bear: notas em Markdown e notas manuscritas
(caneta/stylus), com sincronização entre dispositivos e funcionamento 100% offline. Um único
container Docker cuida de tudo — frontend, API e o próprio armazenamento — sem depender de nenhum
serviço externo (nem banco de dados, nem storage de terceiros). Os seus dados ficam só na sua
máquina.

## Recursos

- **Markdown com visualização única** — sem alternar entre "editar" e "pré-visualizar": o texto
  formatado aparece formatado o tempo todo, e os caracteres de sintaxe (`**`, `#`, `` ` ``...) só
  aparecem quando você clica em cima, igual ao Bear Notes.
- **Notas manuscritas** com caneta e marca-texto, cores personalizadas, ferramenta de mão pra
  navegar sem desenhar, e a página cresce pra baixo conforme você escreve. Caneta preta adaptativa
  ao tema (preta no claro, branca no escuro).
- **Pastas** para organizar as notas.
- **Sincronização em tempo real** entre dispositivos (Server-Sent Events) — uma edição aparece em
  outro aparelho em segundos, sem precisar recarregar a página.
- **Offline-first**: PWA instalável, funciona sem internet (IndexedDB local) e sincroniza quando a
  conexão volta.
- **Tema claro/escuro/automático**, com um clique.
- **Zero configuração pro usuário final** — o próprio servidor injeta o token de acesso na página
  que serve; ninguém precisa digitar URL nem senha pra usar o app depois de instalado.

## Como funciona

Um único container roda três coisas no mesmo processo Node:

1. O **backend** (Express), que serve a API e o build do frontend.
2. Um **servidor WebDAV real** embutido (biblioteca `webdav-server`, sem Apache nem imagem
   externa), que é onde as notas de fato ficam gravadas — mas só acessível via loopback dentro do
   próprio container, nunca exposto pra fora.
3. O **frontend** (React + Vite), servido como PWA estática pelo próprio backend.

As notas e pastas são arquivos JSON simples, sincronizados por um algoritmo "quem editou por
último vence" (last-write-wins) comparando timestamps atribuídos pelo servidor.

## Instalação (produção)

Requer Docker. A imagem é publicada em
[`rodrigogossi/notas`](https://hub.docker.com/r/rodrigogossi/notas) (multi-arquitetura:
`linux/amd64` e `linux/arm64` — funciona em servidores Intel/AMD comuns e em Macs Apple Silicon).

Crie um `docker-compose.yml`:

```yaml
services:
  notas:
    image: rodrigogossi/notas:latest
    container_name: notas
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      ALLOWED_ORIGIN: https://notas.seudominio.com
    volumes:
      - ./data:/data
```

```bash
docker compose up -d
```

Abra `http://<host>:4000` — o app já abre pronto pra usar, sem nenhum cadastro ou configuração.
As notas ficam salvas em `./data` (no host), organizadas em `data/Notes/*.json` e
`data/Folders/*.json`. As credenciais do WebDAV interno e o token da API são gerados
automaticamente na primeira execução e ficam salvos ali dentro também (reaproveitados nas próximas
vezes que o container subir).

### Atrás de um reverse proxy existente (Caddy, Nginx, Traefik...)

Se você já tem um proxy reverso rodando em Docker, não é preciso publicar a porta — só colocar o
`notas` na mesma rede Docker que o proxy já usa:

```yaml
services:
  notas:
    image: rodrigogossi/notas:latest
    container_name: notas
    restart: unless-stopped
    environment:
      ALLOWED_ORIGIN: https://notas.seudominio.com
    volumes:
      - ./data:/data
    networks:
      - proxy_net

networks:
  proxy_net:
    external: true
```

Exemplo de configuração no Caddy:

```
notas.seudominio.com {
    reverse_proxy notas:4000
}
```

### Alternativa: usando o `docker-compose.yml` do repositório

Se preferir gerenciar a configuração com um arquivo `.env` versionável (em vez de editar valores
direto no compose), o repositório já vem com um `docker-compose.yml` e `.env.example` prontos:

```bash
curl -O https://raw.githubusercontent.com/rodrigogossi/notas/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/rodrigogossi/notas/main/.env.example
# edite o .env com seus valores
docker compose up -d
```

Não precisa clonar o repositório inteiro — só esses dois arquivos.

### Configuração (variáveis de ambiente)

Todas são opcionais — o app funciona com os padrões abaixo.

| Variável              | Padrão                | Descrição                                                                 |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `ALLOWED_ORIGIN`       | `http://localhost:5173`| Domínio real de onde o app é servido (CORS). Ajuste em produção.          |
| `DATA_DIR`             | `/data` na imagem      | Onde as notas, pastas e segredos gerados ficam gravados.                  |
| `WEBDAV_USERNAME`      | `notas`                | Usuário do servidor WebDAV interno (não usado de fora do container).     |
| `WEBDAV_PASSWORD`      | gerado automaticamente | Senha do WebDAV interno. Persistida em `DATA_DIR` se não for definida.    |
| `API_TOKEN`            | gerado automaticamente | Token que protege a API. Persistido em `DATA_DIR` se não for definido.    |
| `PORT`                 | `4000`                 | Porta em que o servidor escuta dentro do container.                      |
| `WEBDAV_NOTES_DIR`     | `/Notes`                | Subpasta (dentro de `DATA_DIR`) onde as notas ficam.                      |
| `WEBDAV_FOLDERS_DIR`   | `/Folders`              | Subpasta (dentro de `DATA_DIR`) onde as pastas ficam.                     |
| `INTERNAL_WEBDAV_PORT` | `8080`                  | Porta interna (loopback) do servidor WebDAV embutido.                    |

Recomendado definir pelo menos `ALLOWED_ORIGIN` com o domínio real em produção. Deixar
`WEBDAV_PASSWORD`/`API_TOKEN` em branco é seguro e é o uso recomendado — cada instalação gera os
seus próprios valores únicos na primeira execução.

## Desenvolvimento local

Requer Node 20+.

O app não tem tela de configuração — cliente e API são sempre a mesma origem, e o próprio
servidor injeta o token na página que ele serve. Por isso o teste local também passa por esse
mesmo caminho: build do client + backend servindo tudo (não dá pra usar o Vite dev server
isolado, já que ele ficaria numa origem diferente da API).

```bash
npm install --workspaces

cp server/.env.example server/.env   # deixe API_TOKEN em branco = gerado automaticamente

npm run build --workspace client
mkdir -p server/public && cp -r client/dist/* server/public/

npm run dev:server   # ou: npm run build --workspace server && npm start --workspace server
```

Abra `http://localhost:4000` (ou `http://<IP-da-sua-máquina>:4000` de outro dispositivo na mesma
rede). Ao alterar código do `client`, repita o `build`+`cp` antes de recarregar a página.

## Publicando a própria imagem (fork)

A imagem é publicada automaticamente pelo GitHub Actions
(`.github/workflows/docker-publish.yml`) a cada push na branch `main` ou tag `vX.Y.Z`. Pra
publicar num fork: configure em Settings → Secrets and variables → Actions os segredos
`DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` (um access token gerado em hub.docker.com → Account
Settings → Security), ajuste o nome da imagem no workflow, e dê push.

## Estrutura

- `client/` — React + Vite + TS, PWA (Dexie/IndexedDB para offline, `perfect-freehand` para tinta
  vetorial, CodeMirror para Markdown).
- `server/` — Express (API + serve o build do `client` em produção) e um servidor WebDAV real
  rodando no mesmo processo (`webdav-server`, biblioteca Node, sem Apache/imagem externa),
  gravando os arquivos em `DATA_DIR`.
- `docker-compose.yml` / `Dockerfile` — um único serviço, com um único volume onde o usuário
  escolhe o local real de armazenamento.
- `.github/workflows/docker-publish.yml` — builda e publica a imagem multi-arquitetura no Docker
  Hub a cada push na `main`/tag `vX.Y.Z`.

## Segurança

- O servidor WebDAV interno nunca é exposto fora do container (só loopback).
- Toda a API exige um token (`API_TOKEN`), gerado automaticamente e nunca hardcoded na imagem.
- HTTPS deve ser feito pelo seu reverse proxy (Caddy/Nginx/Traefik) — o container em si serve HTTP
  puro, pra ser colocado atrás de um proxy que já cuida disso.

## Licença

[MIT](LICENSE).
