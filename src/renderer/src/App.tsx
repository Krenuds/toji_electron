import Versions from './components/Versions'
import { OpenCodePanel } from './components/OpenCodePanel'
import electronLogo from './assets/toji.png'
import './assets/opencode.css'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Hi, I&#39;m Toji.</div>
      <div className="text">
        Your computer&nbsp;
        <span className="react">everywhere</span>
        &nbsp;with you.
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="actions">
        <div className="action"></div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>
      
      <OpenCodePanel className="opencode-section" />
      
      <Versions></Versions>
    </>
  )
}

export default App
