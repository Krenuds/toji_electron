import { OpenCodePanel } from './components/OpenCodePanel'
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
        <OpenCodePanel className="opencode-section" />
      </div>
    </div>
  )
}

export default App
