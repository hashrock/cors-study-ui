import { Routes, Route, NavLink } from 'react-router-dom'
import './App.css'
import { CorsSimulator } from './components/CorsSimulator'
import { CoepSimulator } from './components/CoepSimulator'
import { CoopSimulator } from './components/CoopSimulator'
import { IframeSimulator } from './components/IframeSimulator'
import { CspSimulator } from './components/CspSimulator'
import { ServiceWorkerSimulator } from './components/ServiceWorkerSimulator'

function App() {
  return (
    <div className="app">
      <header>
        <h1>Web セキュリティ学習ツール</h1>
      </header>

      <nav className="tabs">
        <NavLink to="/" end>CORS</NavLink>
        <NavLink to="/coep">COEP</NavLink>
        <NavLink to="/coop">COOP</NavLink>
        <NavLink to="/iframe">iframe</NavLink>
        <NavLink to="/csp">CSP</NavLink>
        <NavLink to="/service-worker">Service Worker</NavLink>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<CorsSimulator />} />
          <Route path="/coep" element={<CoepSimulator />} />
          <Route path="/coop" element={<CoopSimulator />} />
          <Route path="/iframe" element={<IframeSimulator />} />
          <Route path="/csp" element={<CspSimulator />} />
          <Route path="/service-worker" element={<ServiceWorkerSimulator />} />
        </Routes>
      </main>

      <footer>
        <p>Chrome準拠の動作をシミュレートしています</p>
      </footer>
    </div>
  )
}

export default App
