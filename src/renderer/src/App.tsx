import React from 'react'
import { BinaryInstaller, AgentControl, ChatTerminal } from './components/features'
import { ErrorBoundary } from './components/ErrorBoundary'
import electronLogo from './assets/toji.png'
import './assets/opencode.css'
import './assets/modern-components.css'
import './assets/chat-terminal.css'
import './assets/layout.css'
import './assets/error-boundary.css'

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <img alt="Toji Logo" className="logo" src={electronLogo} />
            <div className="header-text">
              <h1>Toji System Agent</h1>
              <p className="header-subtitle">AI-Powered Development Assistant</p>
            </div>
          </div>
        </header>

        <main className="app-content">
          <aside className="sidebar">
            <ErrorBoundary>
              <section className="sidebar-section">
                <BinaryInstaller />
              </section>
            </ErrorBoundary>

            <ErrorBoundary>
              <section className="sidebar-section">
                <AgentControl />
              </section>
            </ErrorBoundary>
          </aside>

          <ErrorBoundary>
            <section className="main-content">
              <ChatTerminal />
            </section>
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App
