import { useState } from 'react'
import './App.css'
import { CorsSimulator } from './components/CorsSimulator'
import { CoepSimulator } from './components/CoepSimulator'
import { CoopSimulator } from './components/CoopSimulator'

function App() {
  const [activeTab, setActiveTab] = useState<'cors' | 'coep' | 'coop'>('cors')

  return (
    <div className="app">
      <header>
        <h1>CORS, COEP, COOP 学習ツール</h1>
        <p className="subtitle">Webセキュリティをインタラクティブに理解する</p>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'cors' ? 'active' : ''}
          onClick={() => setActiveTab('cors')}
        >
          CORS
        </button>
        <button
          className={activeTab === 'coep' ? 'active' : ''}
          onClick={() => setActiveTab('coep')}
        >
          COEP
        </button>
        <button
          className={activeTab === 'coop' ? 'active' : ''}
          onClick={() => setActiveTab('coop')}
        >
          COOP
        </button>
      </nav>

      <main>
        {activeTab === 'cors' && <CorsSimulator />}
        {activeTab === 'coep' && <CoepSimulator />}
        {activeTab === 'coop' && <CoopSimulator />}
      </main>

      <footer>
        <p>Chrome準拠の動作をシミュレートしています</p>
      </footer>
    </div>
  )
}

export default App
