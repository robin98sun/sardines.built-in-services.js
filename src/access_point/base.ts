import { Sardines } from 'sardines-core'

export interface AccessPointServiceRuntimeOptions {
  isDefaultVersion: boolean,
  loadBalance?: Sardines.Runtime.LoadBalancingStrategy
  proxyOptions?: any
}

export abstract class AccessPointProvider {
  public abstract async start(options: any):Promise<boolean>
  public abstract async registerAccessPoints(options: any[]): Promise<any>
  public abstract async removeAccessPoints(options: any[]): Promise<any>
  public abstract async registerServiceRuntimes(accessPoint: any, runtimes: Sardines.Runtime.Service[], options: AccessPointServiceRuntimeOptions):Promise<any>
  public abstract async removeServiceRuntimes(accessPoint: any, runtimes: Sardines.Runtime.Service[]):Promise<any>
}