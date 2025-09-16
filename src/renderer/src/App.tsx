import { OpenCodePanel } from './components/OpenCodePanel'
import { ChatPanel } from './components/ChatPanel'
import electronLogo from './assets/toji.png'
import './assets/opencode.css'
import './assets/chat.css'

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
          <ChatPanel className="chat-section" />
        </div>
      </div>
    </div>
  )
}

export default App
