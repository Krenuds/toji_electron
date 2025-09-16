import { OpenCodePanel } from './components/OpenCodePanel'
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
          <OpenCodePanel className="opencode-section" />
        </div>

        <div className="right-panel">
          <SimpleChatTerminal className="chat-section" />
        </div>
      </div>
    </div>
  )
}

export default App
