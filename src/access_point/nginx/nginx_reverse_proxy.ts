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

import { AccessPointProvider, AccessPointServiceRuntimeOptions } from '../base'

import {
  NginxReverseProxyRouteTable,
  NginxReverseProxySupportedProtocol,
  NginxServer,
  keyOfNginxServer,
  NginxReverseProxyLocationItem,
  validServiceRuntime
} from './nginx_reverse_proxy_routetable'

export {
  NginxServer
} from './nginx_reverse_proxy_routetable'

export interface NginxReverseProxyServiceRuntimeOptions extends AccessPointServiceRuntimeOptions {
  root?: string
  server?: string
  port?: number
  protocol?: NginxReverseProxySupportedProtocol
}

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
  writeServerConfigFileWithoutRestart?: boolean
} 
export const defaultNginxServerActionOptions: NginxServerActionOptions = {
  restart: true, 
  returnRouteTable: false, 
  writeServerConfigFileWithoutRestart: false
}

export class NginxReverseProxy extends AccessPointProvider{
  private nginxConfigFilePath: string
  private nginxConfig: NginxConfig
  private routeTableFilePath: string
  public isRunning: boolean
  public root: string
  private routetable: NginxReverseProxyRouteTable

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
    this.routetable = new NginxReverseProxyRouteTable(this.routeTableFilePath)
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

  private rootForServiceRuntime(sr: Sardines.ServiceIdentity, isDefault: boolean = false, options: NginxReverseProxyServiceRuntimeOptions) {
    if (isDefault || !sr.version || sr.version === '*') {
      return `/${this.root||'/'}/${options.root||'/'}/`.replace(/\/+/g, '/')
    } else {
      return `/${this.root||'/'}/${options.root||'/'}/${sr.version}/`.replace(/\/+/g, '/')
    }
  }

  private subPathForServiceRuntime(sr: Sardines.ServiceIdentity) {
    return `/${sr.application}/${sr.module}/${sr.name}`.replace(/\/+/g, '/')
  }

  private pathForServiceRuntime(sr: Sardines.ServiceIdentity, isDefault: boolean = false, options: NginxReverseProxyServiceRuntimeOptions) {
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
      const key = keyOfNginxServer(accessPointOptions)
      if (!key) continue
      if (this.routetable.servers.serverCache[key]) continue
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
      this.routetable.servers.serverCache[key]= {options: accessPointOptions, locations: {}}
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
        const key = keyOfNginxServer(i)
        return (key && this.routetable.servers.serverCache[key])
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
        let serverkey = keyOfNginxServer(ap)
        if (this.routetable.servers.serverCache[serverkey]) {
          const serverObj = this.routetable.servers.serverCache[serverkey]
          // remove the unused upstreams
          for (let locationKey of Object.keys(serverObj.locations)) {
            const locationObj = serverObj.locations[locationKey]
            if (!locationObj || !locationObj.upstream || !locationObj.upstream.upstreamName) continue
            const upstreamCache = this.routetable.servers.reverseServerCache[locationObj.upstream.upstreamName]
            if (upstreamCache[serverkey]) {
              delete upstreamCache[serverkey]
            }
            if (!upstreamCache || !Object.keys(upstreamCache).length) {
              // remove the upstream
              if (this.routetable.upstreams && this.routetable.upstreams.upstreamCache) {
                if (this.routetable.upstreams.upstreamCache[locationObj.upstream.upstreamName]) {
                  delete this.routetable.upstreams.upstreamCache[locationObj.upstream.upstreamName]
                }
              }
            }
          }
          // remove the server
          delete this.routetable.servers.serverCache[serverkey]
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
          const key = keyOfNginxServer(i)
          return (key && !this.routetable.servers.serverCache[key])
        })
      }
    }
  }

  // return the newly registered service runtimes
  // which means they have the same identities
  // while their provider information in the enties are replaced 
  // with the reverse proxy's public information
  public async registerServiceRuntimes(accessPoint: NginxServer, runtimes: Sardines.Runtime.Service[], options: NginxReverseProxyServiceRuntimeOptions, actionOptions: NginxServerActionOptions = defaultNginxServerActionOptions):Promise<Sardines.Runtime.Service[]|NginxReverseProxyRouteTable> {
    if (!runtimes || !Array.isArray(runtimes) || !runtimes.length) {
      throw 'Invalid service runtime data'
    }
    const result:Sardines.Runtime.Service[] = []

    // register access point if needed
    const serverKey = keyOfNginxServer(accessPoint)
    if (!serverKey) {
      throw 'Invalid access point'
    }
    await this.registerAccessPoints([accessPoint], {returnRouteTable: true, restart: false, writeServerConfigFileWithoutRestart: false})
    if (!this.routetable.servers.serverCache[serverKey]) {
      throw 'Invalid access point'
    }
    const server = this.routetable.servers.serverCache[serverKey]
    if (!server.options.interfaces || !server.options.interfaces.length || !server.options.name) {
      throw 'Invalid access point'
    }

    // Register service runtimes
    let hasRouteTableModified = false
    let somethingWrong = false
    
    // update route table
    for (let serviceRuntime of runtimes) {
      try {
        const x = await this.routetable.findUpstreamForServiceRuntime(serviceRuntime, options)
        // find the path in the route table
        const defaultPath = {
          path: this.pathForServiceRuntime(x.serviceRuntime.serviceIdentity, true, options),
          root: this.rootForServiceRuntime(x.serviceRuntime.serviceIdentity, true, options)
        }
        const pathList = [{
          path: this.pathForServiceRuntime(x.serviceRuntime.serviceIdentity, false, options),
          root: this.rootForServiceRuntime(x.serviceRuntime.serviceIdentity, false, options)
        }]
        if (options.isDefaultVersion) {
          pathList.push(defaultPath)
        }
        let isValidServiceRuntime = true
        let locationCache: {[path:string]:NginxReverseProxyLocationItem} = {}
        const serviceSourcePath = `${x.serviceRoot||''}/${x.serviceRuntime.serviceIdentity.application}/${x.serviceRuntime.serviceIdentity.module}/${x.serviceRuntime.serviceIdentity.name}`.replace(/\/+/g, '/')
        const entries: Sardines.Runtime.ServiceEntry[] = []
        for (let p of pathList) {
          // remove invalid location objects
          if (server.locations[p.path] && (!server.locations[p.path].upstream || !server.locations[p.path].upstream.protocol)) {
            delete server.locations[p.path]
          }
          // register service runtime on the path
          if (!server.locations[p.path]) {
            // create a location object
            const locationObj: NginxReverseProxyLocationItem = {}
            if (options.proxyOptions && Array.isArray(options.proxyOptions) && options.proxyOptions.filter(i=>(typeof i === 'object' && typeof i.name !== 'undefined' && typeof i.value !== 'undefined')).length) {
              locationObj.proxyOptions = options.proxyOptions
            }
            locationObj.upstream = x.upstreamItem
            locationObj.upstream.root = serviceSourcePath
            locationCache[p.path] = locationObj
            if (!this.routetable.upstreams.upstreamCache[x.upstreamItem.upstreamName]) {
              this.routetable.upstreams.upstreamCache[x.upstreamItem.upstreamName] = x.upstreamItem
              // cache items of upstream in reverse cache
              for (let item of x.upstreamItem.items) {
                const reverseUpstreamCacheKey = `${item.server}${item.port?':'+item.port:''}`
                if (!this.routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey]) {
                  this.routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey] = {}
                }
                if (!this.routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey][x.upstreamItem.upstreamName]) {
                  this.routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey][x.upstreamItem.upstreamName] = {
                    weight: item.weight,
                    loadBalancing: x.upstreamItem.loadBalancing
                  }
                }
              }
            }
          } else {
            // update current upstream
            const locationObj = server.locations[p.path]
            if (locationObj.upstream.protocol !== x.upstreamItem.protocol) {
              isValidServiceRuntime = false
              break
            }
            if (locationObj.upstream.root !== serviceSourcePath) {
              isValidServiceRuntime = false
              break
            }
            const upstreamName = locationObj.upstream.upstreamName
            if (upstreamName === x.upstreamItem.upstreamName) {
              this.routetable.upstreams.upstreamCache[upstreamName] = x.upstreamItem
            } else {
              const upstreamObj = this.routetable.upstreams.upstreamCache[upstreamName]
              // merge newUpstream items into exinsting upstream items
              for (let item of x.upstreamItem.items) {
                const reverseUpstreamCacheKey = `${item.server}${item.port?':'+item.port:''}`
                const reverseUpstreamCacheItem = this.routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey]
                if (!reverseUpstreamCacheItem || !reverseUpstreamCacheItem[upstreamName]) {
                  upstreamObj.items.push(item)
                }
              }
            }            
            locationCache[p.path] = locationObj
          }
          // generate proxy server's provider informations
          for (let inf of server.options.interfaces) {
            entries.push({
              type: Sardines.Runtime.ServiceEntryType.proxy,
              providerInfo: {
                host: server.options.name,
                port: inf.port,
                protocol: (inf.ssl?NginxReverseProxySupportedProtocol.HTTPS:NginxReverseProxySupportedProtocol.HTTP),
                root:p.root,
                driver: x.serviceDriver,
                isDefault: p.path === defaultPath.path
              }
            })
          }
        }
        if (!isValidServiceRuntime) {
          throw `service runtime's protocl or root path does not match with current proxy server's protocol or root path`
        } else {
          for (let path of Object.keys(locationCache)) {
            server.locations[path] = locationCache[path]
          }
          if (!hasRouteTableModified) hasRouteTableModified = true
          const sr: Sardines.Runtime.Service = {
            entries,
            identity: x.serviceRuntime.serviceIdentity 
          }
          result.push(sr)
        }
      } catch (e) {
        console.log('WARNING: error while registering service runtime', serviceRuntime, 'error:', e)
        continue
      }
    }

    if (hasRouteTableModified && !somethingWrong) {
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
  public async removeServiceRuntimes(accessPoint: NginxServer, runtimes: Sardines.Runtime.Service[], options: NginxReverseProxyServiceRuntimeOptions = {isDefaultVersion: false}, actionOptions: NginxServerActionOptions = defaultNginxServerActionOptions):Promise<Sardines.Runtime.Service[]|NginxReverseProxyRouteTable> {
    if (!accessPoint || !accessPoint.interfaces || !accessPoint.interfaces.length || !accessPoint.name) {
      throw `invalid access point`
    }
    await this.routetable.readRouteTable()
    const serverKey = keyOfNginxServer(accessPoint)
    const server = this.routetable.servers.serverCache[serverKey]
    if (!server) {
      throw `access point does not exist`
    }

    const result: Sardines.Runtime.Service[] = []
    let hasRouteTableModified = false
    if (server.locations) {
      for (let runtime of runtimes) {
        try {
          const sr = await validServiceRuntime(runtime, {noEmptyProviders: false, acceptAsteriskVersion: true})
          const entries: Sardines.Runtime.ServiceEntry[] = []
          // get upstream object from server location object
          const defaultRoot = this.rootForServiceRuntime(sr.serviceIdentity,true, options)
          const subpath = this.subPathForServiceRuntime(sr.serviceIdentity)
          let defaultPath = this.pathForServiceRuntime(sr.serviceIdentity, true, options)
          let pathList = [this.pathForServiceRuntime(sr.serviceIdentity, false, options)]
          if (options && options.isDefaultVersion && pathList[0] !== defaultPath) pathList.push(defaultPath)
          if (sr.providers.length) {
            // remove upstream server items one by one
            for (let pvdr of sr.providers) {
              // ignore non-exist providers
              const pvdrKey = `${pvdr.host}${pvdr.port?':'+pvdr.port:''}`
              if (!this.routetable.upstreams.reverseUpstreamCache[pvdrKey]) continue
              for (let path of pathList) {
                // ignore non-exist path
                if (!server.locations[path]) continue
                // remove pvdr from location
                const locationObj = server.locations[path]
                let upstreamName = locationObj.upstream.upstreamName
                let upstreamObj = this.routetable.upstreams.upstreamCache[upstreamName]
                const saved = this.routetable.removeItemFromUpstreamObject(upstreamObj, serverKey, path, pvdr)
                if (!saved) continue
                if (!hasRouteTableModified) hasRouteTableModified = true

                if (!this.routetable.servers.serverCache[serverKey].locations[path]) {
                  // console.log('location:',path, 'has been removed in server:', serverKey)
                  for (let inf of server.options.interfaces) {
                    entries.push({
                      type: Sardines.Runtime.ServiceEntryType.proxy,
                      providerInfo: {
                        host: server.options.name,
                        port: inf.port,
                        protocol: (inf.ssl)?NginxReverseProxySupportedProtocol.HTTPS:NginxReverseProxySupportedProtocol.HTTP,
                        root: (path.substr(0, path.indexOf(subpath))+'/').replace(/\/+/g, '/')
                      }
                    })
                  }
                } else {
                  // console.log('non-empty location', path, 'in server:', serverKey,'when process sr:',sr.serviceIdentity, "'s provider:", pvdr,', location object:', utils.inspect(routetable.servers.serverCache[serverKey].locations[path]))
                }
              }
            }
          } else {
            // remove all paths for the service runtime
            for (let location of Object.keys(server.locations)) {
              const regexStr = `${defaultRoot}/[version_place_holder]/${subpath}`
                                .replace(/\/+/g, '/')
                                .replace('[version_place_holder]', '[^/]+')
              const regex = new RegExp(regexStr)
              if (regex.test(location) || location === defaultPath) {
                const upstreamName = server.locations[location].upstream.upstreamName
                const upstreamObj = this.routetable.upstreams.upstreamCache[upstreamName]
                const saved = this.routetable.removeItemFromUpstreamObject(upstreamObj, serverKey, location)
                if (!saved) continue
                for(let inf of server.options.interfaces) {
                  entries.push({
                    type: Sardines.Runtime.ServiceEntryType.proxy,
                    providerInfo: {
                      host: server.options.name,
                      port: inf.port,
                      root: (location.substr(0, location.indexOf(subpath))+'/').replace(/\/+/g, '/'),
                      protocol: inf.ssl?NginxReverseProxySupportedProtocol.HTTPS:NginxReverseProxySupportedProtocol.HTTP
                    }
                  })
                }
                if (!hasRouteTableModified) hasRouteTableModified = true
              }
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
    // console.log('routetable before update:', utils.inspect(routetable))
    if (hasRouteTableModified && actionOptions && actionOptions.restart) {
      await this.restart()
    } else if (hasRouteTableModified && actionOptions && actionOptions.writeServerConfigFileWithoutRestart) {
      await this.routetable.updateRouteTableFile()
    }
    if (actionOptions && actionOptions.returnRouteTable) return this.routetable
    else return result 
  }
}