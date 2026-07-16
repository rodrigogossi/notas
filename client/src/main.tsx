import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { db, requestPersistentStorage } from './db/dexie'
import { startLiveUpdates } from './sync/liveUpdates'
import { startAutoSync } from './sync/syncEngine'

void requestPersistentStorage()

// Se o banco local não conseguir abrir (schema corrompido, versão incompatível etc.), toda
// operação (criar nota, sincronizar) ficaria travada esperando essa promise pra sempre, sem
// nenhum aviso visível — melhor falhar alto aqui do que travar em silêncio.
db.open().catch((err) => {
  console.error('Falha ao abrir o banco local:', err)
  alert(
    'Não foi possível abrir o banco de notas local neste navegador. Tente recarregar a página; se persistir, pode ser necessário limpar os dados do site.',
  )
})

startAutoSync()
startLiveUpdates()

// registerType 'prompt': só ativa o novo service worker quando o usuário confirmar, evitando
// trocar o app no meio de uma sessão com transações IndexedDB em andamento.
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova versão disponível. Recarregar agora?')) void updateSW(true)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
