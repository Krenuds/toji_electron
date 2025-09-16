import Versions from './components/Versions'
import { OpenCodePanel } from './components/OpenCodePanel'
import electronLogo from './assets/toji.png'
import './assets/opencode.css'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <OpenCodePanel className="opencode-section" />
      <div className="actions">
        <div className="action"></div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>
      <Versions></Versions>
    </>
  )
}

export default App
