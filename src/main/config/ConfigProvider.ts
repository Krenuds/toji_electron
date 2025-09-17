import Store from 'electron-store'

interface AppConfig {
  opencode: {
    workingDirectory: string
  }
}

export class ConfigProvider {
  private store: Store<AppConfig>

  constructor() {
    this.store = new Store<AppConfig>({
      defaults: {
        opencode: {
          // Use the test target directory
          workingDirectory: 'C:\\Users\\donth\\OneDrive\\Desktop\\tojiTest'
        }
      }
    })
  }

  getOpencodeWorkingDirectory(): string {
    return this.store.get('opencode.workingDirectory')
  }

  setOpencodeWorkingDirectory(path: string): void {
    this.store.set('opencode.workingDirectory', path)
  }

  // Get the entire config for debugging
  getConfig(): AppConfig {
    return this.store.store
  }
}
