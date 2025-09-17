import { InstallerComponent } from './components/InstallerComponent'
import { AgentPanel } from './components/AgentPanel'
import { SimpleChatTerminal } from './components/SimpleChatTerminal'
import electronLogo from './assets/toji.png'
import './assets/opencode.css'

function App(): React.JSX.Element {
  return (
    <div className="app-container">
      <div className="app-header">
        <img alt="logo" className="logo" src={electronLogo} />
        <h1>Toji System Agent</h1>
      </div>

      <div className="app-content">
        <div className="left-panel">
          <InstallerComponent className="installer-section" />
          <AgentPanel className="agent-section" />
        </div>

        <div className="right-panel">
          <SimpleChatTerminal className="chat-section" />
        </div>
      </div>
    </div>
  )
}

export default App
