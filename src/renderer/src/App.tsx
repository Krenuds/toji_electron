import { OpenCodePanel } from './components/OpenCodePanel'
import electronLogo from './assets/toji.png'
import './assets/opencode.css'

function App(): React.JSX.Element {
  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <OpenCodePanel className="opencode-section" />
    </>
  )
}

export default App
