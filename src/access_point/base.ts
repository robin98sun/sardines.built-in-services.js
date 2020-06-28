import { Sardines } from 'sardines-core'

export interface AccessPointServiceRuntimeOptions {
  isDefaultVersion: boolean,
  loadBalance?: Sardines.Runtime.LoadBalancingStrategy
  weight?: number
}

export abstract class AccessPoint {
  public abstract async start(options: any):Promise<boolean>
  public abstract async registerAccessPoint(options: any): Promise<any>
  public abstract async removeAccessPoint(options: any): Promise<any>
  public abstract async registerServiceRuntimes(runtimes: Sardines.Runtime.Service[], options: AccessPointServiceRuntimeOptions):Promise<Sardines.Runtime.Service[]>
  public abstract async removeServiceRuntimes(runtimes: Sardines.Runtime.Service[]):Promise<Sardines.Runtime.Service[]>
}