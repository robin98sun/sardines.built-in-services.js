/**
 * @author Robin Sun
 * @email robin@naturewake.com
 * @create date 2020-06-15 14:42:59
 * @modify date 2020-07-01 17:20:00
 * @desc config nginx server to be a reverse proxy server
 * @desc nginx doc: https://nginx.org/en/docs/
 */

import { exec } from 'child_process'
import * as fs from 'fs'
import * as syspath from 'path'
import { Sardines } from 'sardines-core'

import { AccessPointProvider } from '../base'

import {
  NginxReversedProxyRouteTable,
  NginxServer,
  NginxReversedProxyServiceRuntimeOptions,
  NginxReversedProxySupportedProtocol,
  NginxReversedProxySupprotedProviderInfo
} from './nginx_reversed_proxy_routetable'

export {
  NginxServer,
  NginxReversedProxyServiceRuntimeOptions,
  NginxReversedProxyRouteTable,
  NginxReversedProxySupportedProtocol,
  NginxReversedProxySupprotedProviderInfo
} from './nginx_reversed_proxy_routetable'

const execCmd = async (cmd: string) => {
  return new Promise((res, rej) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        const errMsg = `error while executing shell command [${cmd}]: ${error.message}; stdout: ${stdout}, stderr: ${stderr}`
        rej(errMsg);
      }
      if (stderr) {
        const errMsg = `stderr output of shell command [${cmd}]: ${stderr}`
        rej(errMsg)
      }
      res(stdout)
    });
  })
}

const stopNginx = async() => {
  await execCmd('/usr/sbin/service nginx stop')
}
const startNginx = async() => {
  await execCmd(`/usr/sbin/service nginx start`)
}
const isNginxRunning = async() => {
  let restartResult: any = ''
  restartResult = await execCmd('/usr/sbin/service nginx status')
  if (restartResult === 'nginx is running.\n') {
    this.isRunning = true
    return true
  }
  return false
}

export interface NginxConfig {
  user?: string
  worker_processes?: number
  worker_connections?: number
  default_type?: string
  sendfile?: string
  keepalive_timeout?: number
  pid?: string
  types?: string
  tcp_nopush?: string
  gzip?: string
  serversDir?: string
  sardinesServersFileName?: string
  error_log?: string
  access_log?: string
  log_format?: string[]
  ssl_session_cache?: string
  ssl_session_timeout?: string
  root?: string
}

export const defaultNginxConfig: NginxConfig = {
  user: 'nginx',
  worker_processes: 1,
  error_log: '/var/log/nginx/error.log',
  pid: '/var/run/nginx.pid',
  worker_connections: 1024,
  types: '/etc/nginx/mime.types',
  default_type: 'application/octet-stream',
  log_format: [
    '\'$remote_addr - $remote_user [$time_local] "$request"\'', 
    '\'$status $body_bytes_sent "$http_referer"\'',
    '\'"$http_user_agent" "$http_x_forwarded_for"\''
  ],
  access_log: '/var/log/nginx/access.log',
  sendfile: 'on',
  tcp_nopush: 'off',
  keepalive_timeout: 65,
  gzip: 'on',
  serversDir: '/etc/nginx/conf.d',
  sardinesServersFileName: 'sardines_servers.conf',
  ssl_session_cache: 'shared:SSL:10m',
  ssl_session_timeout: '10m',
  root: '/'
}

const generateNginxConfigFile = async (
  configFilePath: string = '/etc/nginx/nginx.conf', 
  configSettings: NginxConfig = defaultNginxConfig )=> {
  const config: NginxConfig = Object.assign({}, defaultNginxConfig, configSettings)
  if (!fs.existsSync(configFilePath)) {
    throw `Can not access nginx config file [${configFilePath}]`
  }
  let content: string = `
    user ${config.user};
    worker_processes ${config.worker_processes};
    error_log ${config.error_log} warn;
    pid ${config.pid};
    events {
      worker_connections ${config.worker_connections};
    }
    http {
      include ${config.types};
      default_type ${config.default_type};
      log_format main ${config.log_format!.join('\n\t\t\t')};
      access_log ${config.access_log} main;
      sendfile ${config.sendfile};
      tcp_nopush ${config.tcp_nopush};
      gzip ${config.gzip};
      include ${config.serversDir}/*.conf;
    }
  `
  fs.writeFileSync(configFilePath, content, {encoding: 'utf8'})
}

const getServerConfDir = (configServer: string) => {
  if (!configServer) return ''
  if (configServer.length > 7 && configServer.substr(configServer.length-7) === '/*.conf') {
    return configServer.substr(0, configServer.length - 7)
  } else if (configServer[configServer.length - 1] === '/') {
    return configServer.substr(0, configServer.length - 1)
  } else {
    return configServer
  }
}

export interface NginxServerActionOptions {
  restart?: boolean, 
  returnRouteTable?: boolean, 
  writeServerConfigFileWithoutRestart?: boolean,
  verbose?: boolean
} 
export const defaultNginxServerActionOptions: NginxServerActionOptions = {
  restart: true, 
  returnRouteTable: false, 
  writeServerConfigFileWithoutRestart: false,
  verbose: false
}

export interface NginxReversedProxySupportedServiceRuntime {
  protocol: NginxReversedProxySupportedProtocol
  serviceIdentity: Sardines.ServiceIdentity
  providers: NginxReversedProxySupprotedProviderInfo[],
  sourceRoot?: string,
  sourcePath?: string
}

export class NginxReversedProxy extends AccessPointProvider{
  private nginxConfigFilePath: string
  private nginxConfig: NginxConfig
  private routeTableFilePath: string
  public isRunning: boolean
  public root: string
  private routetable: NginxReversedProxyRouteTable

  constructor(
    nginxConfigSettings: NginxConfig = defaultNginxConfig,
    nginxConfigFilePath:string = '/etc/nginx/nginx.conf'
  ) {
    super()
    this.nginxConfigFilePath = nginxConfigFilePath
    this.nginxConfig = Object.assign({}, defaultNginxConfig, nginxConfigSettings)
    this.nginxConfig.serversDir = getServerConfDir(this.nginxConfig.serversDir!)
    this.routeTableFilePath = syspath.resolve(this.nginxConfig.serversDir!, `./${this.nginxConfig.sardinesServersFileName!}`)
    this.isRunning = false
    this.root = this.nginxConfig.root!
    this.routetable = new NginxReversedProxyRouteTable(this.routeTableFilePath)
  }

  public async start(option: {initalizeConfigFile: boolean}) {    
    // check the nginx config file
    if (!fs.existsSync(this.nginxConfigFilePath)) {
      throw (`Nginx configuration file [${this.nginxConfigFilePath}] does not exist`)
    }

    if (!fs.existsSync(this.nginxConfig.serversDir!)) {
      // throw (`Nginx configuration directory [${this.nginxConfigDir}] does not exist`)
      await execCmd(`mkdir -p ${this.nginxConfig.serversDir!}`)
    }
    
    // generate the config file using the initialization parameters
    if (option.initalizeConfigFile) {
      await stopNginx()
      await generateNginxConfigFile(this.nginxConfigFilePath, this.nginxConfig)
      await startNginx()
    }
    
    if (await isNginxRunning()) {
      return true
    }
    throw `nginx is not started`
  }

  public async restart() {
    this.isRunning = false
    await stopNginx()
    await this.routetable.updateRouteTableFile()
    await startNginx()
    if (await isNginxRunning()) {
      this.isRunning = true
    }
  }

  private rootForServiceRuntime(sr: Sardines.ServiceIdentity, isDefault: boolean = false, options: NginxReversedProxyServiceRuntimeOptions) {
    if (isDefault || !sr.version || sr.version === '*') {
      return `/${this.root||'/'}/${options.root||'/'}/`.replace(/\/+/g, '/')
    } else {
      return `/${this.root||'/'}/${options.root||'/'}/${sr.version}/`.replace(/\/+/g, '/')
    }
  }

  private subPathForServiceRuntime(sr: Sardines.ServiceIdentity) {
    return `/${sr.application}/${sr.module}/${sr.name}`.replace(/\/+/g, '/')
  }

  private pathForServiceRuntime(sr: Sardines.ServiceIdentity, isDefault: boolean = false, options: NginxReversedProxyServiceRuntimeOptions) {
    const root = this.rootForServiceRuntime(sr, isDefault, options)
    return `/${root}/${this.subPathForServiceRuntime(sr)}`.replace(/\/+/g, '/')
  }

  public async registerAccessPoints(accessPointList: NginxServer[], options: NginxServerActionOptions = defaultNginxServerActionOptions) {
    if (!Array.isArray(accessPointList)) throw `invalid access point list`
    if (!accessPointList || !accessPointList.length) throw `empty access point list`
    await this.routetable.readRouteTable()
    const registered: NginxServer[] = []
    for (let accessPointOptions of accessPointList) {
      if (!accessPointOptions) continue
      if (this.routetable.hasServer(accessPointOptions)) continue
      // write ssl files if needed
      try {
        for (let sslProp of ['ssl_certificate','ssl_certificate_key']) {
          if (accessPointOptions[sslProp]) {
            if (Array.isArray(accessPointOptions[sslProp]) || accessPointOptions[sslProp].length > 500) {
              // write content to file
              const content = Array.isArray(accessPointOptions[sslProp])
                                ? accessPointOptions[sslProp].join('\n')
                                : accessPointOptions[sslProp]
              const filename = `${accessPointOptions.name}.${sslProp==='ssl_certificate'?'crt':'key'}`
              const filepath = syspath.resolve(`${this.nginxConfig.serversDir}/`, `./${filename}`)
              fs.writeFileSync(filepath, content)
              // change the prop value from content to filename
              accessPointOptions[sslProp] = filename
            } else {
              if (!fs.existsSync(syspath.resolve(`${this.nginxConfig.serversDir}/`, accessPointOptions[sslProp]))) {
                throw `${sslProp} file [${accessPointOptions[sslProp]}] does not exist`
              }
            }
          }

        }
      } catch (e) {
        console.log(`Error while writing ssl files:`, e)
        continue
      }
      // remove conflicting options
      for (let prop of ['location', 'locations']) {
        if (accessPointOptions[prop]) delete accessPointOptions[prop]
      }
      // write to route table
      this.routetable.saveServer(accessPointOptions)
      registered.push(accessPointOptions)
    }
    if (registered.length && !(options && !options.restart)) {
      await this.restart()
    } else if (registered.length && options && options.writeServerConfigFileWithoutRestart) {
      await this.routetable.updateRouteTableFile()
    }

    if (options && options.returnRouteTable) {
      return this.routetable
    } else {
      return registered.filter((i:NginxServer) => {
        return this.routetable.hasServer(i)
      })
    }
  }

  public async removeAccessPoints(accessPointList: NginxServer[], options: NginxServerActionOptions = defaultNginxServerActionOptions) {
    if (!Array.isArray(accessPointList)) throw `invalid access point list`
    if (!accessPointList || !accessPointList.length) {
      throw 'empty access point list'
    }

    let result : NginxServer[] = []
    await this.routetable.readRouteTable()
    if (!this.routetable.isEmpty) {
      for (let ap of accessPointList) {
        if (this.routetable.hasServer(ap)) {
          this.routetable.removeServer(ap)
          result.push(ap)
        }
      }
      if (result.length && options.restart) {
       await this.restart()
      } else if (result.length && options && options.writeServerConfigFileWithoutRestart) {
        await this.routetable.updateRouteTableFile()
      }
      if (options && options.returnRouteTable) {
        return this.routetable
      } else {
        return result.filter((i:NginxServer) => {
          return !this.routetable.hasServer(i)
        })
      }
    }
  }


  public static async validServiceRuntime (sr: Sardines.Runtime.Service, options: {noEmptyProviders: boolean, acceptAsteriskVersion: boolean} = {noEmptyProviders: true, acceptAsteriskVersion: false}): Promise<NginxReversedProxySupportedServiceRuntime>{
    if (!sr.identity || !sr.entries || !Array.isArray(sr.entries) || (!sr.entries.length && options && options.noEmptyProviders)
      || !sr.identity.application || !sr.identity.module || !sr.identity.name 
      || !sr.identity.version || (sr.identity.version === '*' && !(options && options.acceptAsteriskVersion))
      ) {
      throw `invalid service runtime`
    }
    
    let protocol: NginxReversedProxySupportedProtocol|null = null
    let providers: NginxReversedProxySupprotedProviderInfo[] = []
    let providerCache: {[key: string]: boolean} = {}
    let root: string|null = null
    let driver: string|null = null
    for (let entry of sr.entries) {
      const pvdr = entry.providerInfo
      if (!pvdr.protocol) continue
      if (typeof pvdr.protocol !== 'string') continue
      if (['http', 'https'].indexOf(pvdr.protocol.toLowerCase()) < 0) continue
      if (!pvdr.host || typeof pvdr.host !== 'string') continue
      if (!pvdr.port || typeof pvdr.port !== 'number') continue
      if (!pvdr.driver || typeof pvdr.driver !== 'string') continue
      if (pvdr.root && typeof pvdr.root !== 'string') continue
      if (pvdr.weight && typeof pvdr.weight !== 'number') continue
      const tmpProtocol = <NginxReversedProxySupportedProtocol>(pvdr.protocol.toLowerCase() as keyof typeof NginxReversedProxySupportedProtocol)
      if (!protocol) {
        protocol = tmpProtocol
      } else if (protocol !== tmpProtocol) {
        throw `service runtime have multiple entries in different protocols`
      }
      const pvdrKey = `${tmpProtocol}://${pvdr.host}:${pvdr.port}`
      if (!pvdr.weight) pvdr.weight = 1
      if (!providerCache[pvdrKey]) {
        if (root === null) {
          root = pvdr.root
        } else if (root !== pvdr.root) {
          throw `service runtime have multiple entries on different root paths`
        }
  
        if (driver === null) {
          driver = pvdr.driver
        } else if (driver !== pvdr.driver && options && options.noEmptyProviders) {
          throw `service runtime have multiple entries using different drivers`
        }
        if (entry.type) pvdr.type = entry.type
        providers.push(pvdr)
        providerCache[pvdrKey] = true
      }
    }
    if (!providers.length && options && options.noEmptyProviders) {
      throw `no valid provider in the service runtime information`
    }
  
    const result: NginxReversedProxySupportedServiceRuntime = {protocol: protocol!, serviceIdentity: sr.identity, providers}
    if (root) result.sourceRoot = root
    result.sourcePath = `${root||''}/${sr.identity.application}/${sr.identity.module}/${sr.identity.name}`.replace(/\/+/g, '/')
    return result
  }

  // return the newly registered service runtimes
  // which means they have the same identities
  // while their provider information in the enties are replaced 
  // with the reverse proxy's public information
  public async registerServiceRuntimes(accessPoint: NginxServer, runtimes: Sardines.Runtime.Service[], options: NginxReversedProxyServiceRuntimeOptions, actionOptions: NginxServerActionOptions = defaultNginxServerActionOptions):Promise<Sardines.Runtime.Service[]|NginxReversedProxyRouteTable> {
    if (!runtimes || !Array.isArray(runtimes) || !runtimes.length) {
      throw 'Invalid service runtime data'
    }
    const result:Sardines.Runtime.Service[] = []

    // register access point if needed
    await this.routetable.readRouteTable()
    await this.registerAccessPoints([accessPoint], {returnRouteTable: true, restart: false, writeServerConfigFileWithoutRestart: false})
    if (!this.routetable.hasServer(accessPoint)) {
      throw 'Invalid access point'
    }

    // // Register service runtimes
    let hasRouteTableModified = false
    
    // // update route table
    for (let serviceRuntime of runtimes) {
      try {
        const x = await NginxReversedProxy.validServiceRuntime(serviceRuntime, {
          noEmptyProviders: true,
          acceptAsteriskVersion: false
        })
        // find the path in the route table
        const defaultPath = {
          path: this.pathForServiceRuntime(serviceRuntime.identity, true, options),
          root: this.rootForServiceRuntime(serviceRuntime.identity, true, options),
          isDefault: true,
        }
        const pathList = [{
          path: this.pathForServiceRuntime(serviceRuntime.identity, false, options),
          root: this.rootForServiceRuntime(serviceRuntime.identity, false, options),
          isDefault: false,
        }]

        if (options.isDefaultVersion) {
          pathList.push(defaultPath)
        }
        let isValidServiceRuntime = true
        const entries: Sardines.Runtime.ServiceEntry[] = []
        for (let p of pathList) {
          const subentries = this.routetable.registerReversedProxyEntries(accessPoint, p, x.providers, {
            sourcePath: x.sourcePath,
            protocol: x.protocol,
            loadBalance: options.loadBalance||Sardines.Runtime.LoadBalancingStrategy.random
          }, options.proxyOptions)
          if (!subentries || !subentries.length) {
            isValidServiceRuntime = false
            break
          } else {
            Array.prototype.push.apply(entries, subentries)
          }
        }
        if (!isValidServiceRuntime) {
          throw `service runtime's protocol or root path does not match with current proxy server's protocol or root path`
        } else {
          if (!hasRouteTableModified) hasRouteTableModified = true
          const sr: Sardines.Runtime.Service = {
            entries,
            identity: serviceRuntime.identity
          }
          result.push(sr)
        }
      } catch (e) {
        console.log('WARNING: error while registering service runtime', serviceRuntime, 'error:', e)
        continue
      }
    }

    if (hasRouteTableModified) {
      if (actionOptions && actionOptions.restart) {
        await this.restart()
      } else if (actionOptions && actionOptions.writeServerConfigFileWithoutRestart) {
        await this.routetable.updateRouteTableFile()
      }
    }
    if (actionOptions && actionOptions.returnRouteTable) return this.routetable
    return result
  }

  // return the deleted service runtimes on the reverse proxy
  public async removeServiceRuntimes(accessPoint: NginxServer, runtimes: Sardines.Runtime.Service[], options: NginxReversedProxyServiceRuntimeOptions = {isDefaultVersion: false}, actionOptions: NginxServerActionOptions = defaultNginxServerActionOptions):Promise<Sardines.Runtime.Service[]|NginxReversedProxyRouteTable> {
    if (!accessPoint || !accessPoint.interfaces || !accessPoint.interfaces.length || !accessPoint.name) {
      throw `invalid access point`
    }
    await this.routetable.readRouteTable()
    const server = this.routetable.hasServer(accessPoint)
    if (!server) {
      throw `access point does not exist`
    }

    const result: Sardines.Runtime.Service[] = []
    let hasRouteTableModified = false
    if (server.locations) {
      for (let runtime of runtimes) {
        try {
          const sr = await NginxReversedProxy.validServiceRuntime(runtime, {noEmptyProviders: false, acceptAsteriskVersion: true})
          const entries: Sardines.Runtime.ServiceEntry[] = []
          const defaultPath = {
            path: this.pathForServiceRuntime(sr.serviceIdentity, true, options),
            root: this.rootForServiceRuntime(sr.serviceIdentity, true, options),
            isDefault: true
          }
          const nonDefaultPath = {
            path: this.pathForServiceRuntime(sr.serviceIdentity, false, options),
            root: this.rootForServiceRuntime(sr.serviceIdentity, false, options),
            isDefault: false
          }
          const pathlist = []
          let isRemovingAllVersions = false
          if (options.isDefaultVersion) pathlist.push(defaultPath)
          if (nonDefaultPath.path !== defaultPath.path) pathlist.push(nonDefaultPath) 
          else isRemovingAllVersions = true
          for (let p of pathlist) {
            if (actionOptions.verbose) {
              console.log('==========================')
              console.log('removing service runtime:',sr.serviceIdentity.version, sr.serviceIdentity.application, sr.serviceIdentity.module, sr.serviceIdentity.name, sr.providers.map(p=>`${p.host}:${p.port}`).join(','))
              console.log('path:', p)
            }
            
            const subentries = this.routetable.removeReversedProxyEntries(accessPoint, p, sr.providers, {
              sourcePath: sr.sourcePath,
              protocol: sr.protocol,
              loadBalance: options.loadBalance || Sardines.Runtime.LoadBalancingStrategy.random,
              allVersions: isRemovingAllVersions
            }, actionOptions.verbose)
            if (actionOptions.verbose) {
              console.log('--------------------------')
              console.log('')
            }
            if (subentries) {
              if (!hasRouteTableModified) hasRouteTableModified = true
              Array.prototype.push.apply(entries, subentries)
            }
          }
          
          if (entries.length) {
            result.push({
              identity: sr.serviceIdentity,
              entries
            })
          }
        } catch (e) {
          console.log('WARNING: error while validating service runtime:', runtime, ', error:', e)
          continue
        }
      }
    }
    if (hasRouteTableModified && actionOptions && actionOptions.restart) {
      await this.restart()
    } else if (hasRouteTableModified && actionOptions && actionOptions.writeServerConfigFileWithoutRestart) {
      await this.routetable.updateRouteTableFile()
    }
    if (actionOptions && actionOptions.returnRouteTable) return this.routetable
    else return result 
  }
}