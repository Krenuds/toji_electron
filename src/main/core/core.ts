export interface Service {
  name: string
  start(): Promise<void>
  stop(): Promise<void>
  getStatus(): ServiceStatus
}

export interface ServiceStatus {
  running: boolean
  healthy?: boolean
  error?: string
  lastCheck?: Date
}

export interface CoreStatus {
  services: Record<string, ServiceStatus>
  currentWorkspace?: string
}

export class Core {
  private services = new Map<string, Service>()
  private currentWorkspace?: string

  constructor() {
    // Services will be registered here
  }

  registerService(service: Service): void {
    this.services.set(service.name, service)
  }

  async startService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`)
    }
    await service.start()
  }

  async stopService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`)
    }
    await service.stop()
  }

  getServiceStatus(serviceName: string): ServiceStatus {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`)
    }
    return service.getStatus()
  }

  getAllStatus(): CoreStatus {
    const services: Record<string, ServiceStatus> = {}
    for (const [name, service] of this.services) {
      services[name] = service.getStatus()
    }
    return {
      services,
      currentWorkspace: this.currentWorkspace
    }
  }

  setWorkspace(path: string): void {
    this.currentWorkspace = path
    // TODO: Notify services about workspace change
  }

  getCurrentWorkspace(): string | undefined {
    return this.currentWorkspace
  }

  // Helper to get a specific service
  getService<T extends Service>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T
  }
}