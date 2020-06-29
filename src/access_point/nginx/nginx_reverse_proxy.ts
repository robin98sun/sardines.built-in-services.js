/**
 * @author Robin Sun
 * @email robin@naturewake.com
 * @create date 2020-06-15 14:42:59
 * @modify date 2020-06-15 14:42:59
 * @desc config nginx server to be a reverse proxy server
 * @desc nginx doc: https://nginx.org/en/docs/
 */

import { exec } from 'child_process'
import * as fs from 'fs'
import * as syspath from 'path'
import { Sardines, utils } from 'sardines-core'

import { AccessPoint, AccessPointServiceRuntimeOptions } from '../base'

export const execCmd = async (cmd: string) => {
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
  error_log?: string
  access_log?: string
  log_format?: string[]
  ssl_session_cache?: string
  ssl_session_timeout?: string
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
  ssl_session_cache: 'shared:SSL:10m',
  ssl_session_timeout: '10m'
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

const getServiceSourcePath = (service:Sardines.ServiceIdentity, providerInfo: {
  protocol: string
  host: string
  root: string
  port: number
}) => {
  return `${providerInfo.protocol}://${providerInfo.host}:${providerInfo.port}/${providerInfo.root}/${service.application}/${service.module}/${service.name}`.replace(/\/+/g, '/')
}

export enum NginxReverseProxySupportedProtocol {
  HTTP = 'http',
  HTTPS = 'https'
}


export interface NginxReverseProxyServiceRuntimeOptions extends AccessPointServiceRuntimeOptions {
  root?: string
  server?: string
  port?: number
  protocol?: NginxReverseProxySupportedProtocol
}

export interface NginxReverseProxyUpstreamItem {
  server: string
  weight: number
}

export interface NginxReverseProxyUpstreamCacheItem {
  upstreamName: string
  loadBalancing: Sardines.Runtime.LoadBalancingStrategy
  items: NginxReverseProxyUpstreamItem[]
  protocol?: NginxReverseProxySupportedProtocol
}

export interface NginxReverseProxyUpstreamCache {
  [upstreamName: string]: NginxReverseProxyUpstreamCacheItem
}


export interface NginxServerInterface {
  addr?: string
  port?: number
  ssl?: boolean
}

export interface NginxServer {
  interfaces?: NginxServerInterface[]
  name?: string
  ssl_certificate?: string
  ssl_certificate_key?: string
  [key:string]: any
}

export interface NginxReverseProxyServerCache {
  [nginxServerKey: string]: {
    options: NginxServer
    locations: {
      [path: string]: NginxReverseProxyUpstreamCacheItem
    }
  }
}

export interface NginxReverseProxyUpstreamReverseCache {
  [server: string]: {
    [upstreamName: string]: {
      weight: number
      protocol?: NginxReverseProxySupportedProtocol
      loadBalancing?: Sardines.Runtime.LoadBalancingStrategy
    }
  }
}

export interface NginxReverseProxyRouteTable {
  upstreams: {
    upstreamCache: NginxReverseProxyUpstreamCache,
    reverseUpstreamCache: NginxReverseProxyUpstreamReverseCache
  },
  servers: NginxReverseProxyServerCache
}

const keyOfNginxServer = (vap: NginxServer): string =>{
  let key = ''
  if (vap.interfaces && vap.interfaces.length) {
    key += '@' + vap.interfaces.map((i:NginxServerInterface) => (
      `${i.addr||'0.0.0.0'}:${i.port||80}:${i.ssl?'ssl':'non-ssl'}`
    ))
    .sort((a,b)=>(a<b)?1:-1).join(',')
    
  }
  if (vap.name) key += '@' + vap.name

  return key
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

const parseUpstreams = (content: string): {upstreamCache: NginxReverseProxyUpstreamCache, reverseUpstreamCache: NginxReverseProxyUpstreamReverseCache} => {
  const upstreamCache:NginxReverseProxyUpstreamCache = {}
  const reverseUpstreamCache: NginxReverseProxyUpstreamReverseCache = {}
  const result = {upstreamCache, reverseUpstreamCache}
  let matches = content.match(/upstream +[\w]+ *{[^{]*}/gmi)
  if (!matches || !matches.length) return result

  for (let upstreamBlock of matches) {
    let subMatches = upstreamBlock.match(/ [\w]+ /gmi)
    if (!subMatches || !subMatches.length) continue
    const upstreamName = subMatches[0].trim()

    subMatches = upstreamBlock.match(/{[^{]*}/gmi)
    if (!subMatches || !subMatches.length) continue
    const upstreamBody = subMatches[0].replace(/{[\s]+([^}]+)[\s]+}/gmi, '$1')
                          .split(/[\n|\r|;]+/)
                          .map((i:string)=>i.trim()).filter((i:string) => i.length)
                          .map((i:string)=>i.split(/[\s]+/g))
    const upstreamObj = {
      upstreamName,
      loadBalancing: Sardines.Runtime.LoadBalancingStrategy.random,
      items: []
    }
    for(let item of upstreamBody) {
      if (!item.length) continue
      if (item.length === 1) {
        if (item[0].toLowerCase() === 'least_conn') {
          upstreamObj.loadBalancing = Sardines.Runtime.LoadBalancingStrategy.evenWorkload
        } else if (item[0].toLowerCase() === 'ip_hash') {
          upstreamObj.loadBalancing = Sardines.Runtime.LoadBalancingStrategy.workloadFocusing
        }
      } else if (item.length >= 2) {
        if (item[0].toLowerCase() !== 'server') continue
        const upstreamItem: NginxReverseProxyUpstreamItem = {
          weight: 1,
          server: item[1]
        }
        if (item.length > 2) {
          const parts = item[2].split(/\s*=\s*/g)
          if (parts.length === 2 && parts[0].toLowerCase() === 'weight') {
            upstreamItem.weight = Number(parts[1])
          }
        }
        if (!reverseUpstreamCache[upstreamItem.server]) {
          reverseUpstreamCache[upstreamItem.server] = {}
        }
        reverseUpstreamCache[upstreamItem.server][upstreamName] = {
          weight: upstreamItem.weight,
          loadBalancing: upstreamObj.loadBalancing
        }
        upstreamObj.items.push(upstreamItem)
      }
    }
    upstreamCache[upstreamName] = upstreamObj
  }
  return result
}

const parseServers = (content: string, upstreamCache: NginxReverseProxyUpstreamCache): NginxReverseProxyServerCache => {
  const result: NginxReverseProxyServerCache = {}
  // let matches = content.match(/server[\s]+{[^}]+(location[\s]+[\S]+[\s]+{[^}]+}[\n|\s]+)+[\s|\n]*}/gmi)
  const locationBlockRegexStr = 'location[\\s]+[\\S]+[\\s]+{[^}]+}[\\n|\\s]*'
  const serverBlockRegexStr = `server[\\s]+{[^}]+(${locationBlockRegexStr})+[\\s|\\n]*}`
  let matches = content.match(new RegExp(serverBlockRegexStr, 'gmi'))
  if (!matches || !matches.length) return result
  for (let serverBlockStr of matches) {
    const serverBlock = serverBlockStr.replace(/server[\s]+{([^]+)}/gmi, '$1')
    // parse server options
    const serverOptionList= serverBlock.replace(/([^{]+)location[^]+/gmi, '$1')
                                .split(/[\n|\r]+/)
                                .map((i:string)=>i.trim().replace(/([^;]+);/g, '$1'))
                                .filter((i:string)=>i.length)
                                .map((i:string)=>i.split(/\s+/g))
                                .map((i:string[])=>({
                                  name: i[0].toLowerCase(),
                                  values: i.slice(1)
                                }))
    const serverOptions: NginxServer = {}
    for (let option of serverOptionList) {
      if (option.name === 'listen') {
        const interfaceAndPort = option.values[0]
        const isSsl = (option.values.length > 1 && option.values[1].toLowerCase() === 'ssl')
        if (!serverOptions.interfaces) serverOptions.interfaces = []
        if (interfaceAndPort.indexOf(':') > 0) {
          const parts = interfaceAndPort.split(':')
          serverOptions.interfaces.push({
            addr: parts[0],
            port: Number(parts[1]),
            ssl: isSsl
          })
        } else {
          serverOptions.interfaces.push({
            port: Number(interfaceAndPort),
            ssl: isSsl
          })
        }
      } else if (option.name === 'server_name') {
        serverOptions.name = option.values[0]
      } else {
        serverOptions[option.name] = option.values.join(' ')
      }
    }

    const serverKey = keyOfNginxServer(serverOptions)
    // ignore duplicated servers
    if (result[serverKey]) continue
    // by default, 80 is only used for http, and 443 is only used for https
    let valid = true
    if (serverOptions.interfaces && serverOptions.interfaces.length) {
      for (let inf of serverOptions.interfaces) {
        if (inf.port === 80 && inf.ssl) valid = false
        else if (inf.port === 443 && !inf.ssl) valid = false
        if (!valid) break
      }
    }
    if (!valid) continue
    // ignore localhost server_name
    if (serverOptions.name && serverOptions.name.toLowerCase() === 'localhost') continue

    // parse server locations
    const locationMatches = serverBlock.match(new RegExp(locationBlockRegexStr, 'gmi'))
    if (!locationMatches || !locationMatches.length) continue
    const server = {
      options: serverOptions,
      locations: {}
    }
    for (let locationBlockStr of locationMatches) {
      const locationPath = locationBlockStr.replace(/location[\s]+([\S]+)[\s]+{[^}]+}[\n|\s]*/gmi, '$1')
      // ignore duplicated path
      if (server.locations[locationPath]) continue
      // parse location block
      const locationBlock = locationBlockStr.replace(/location[\s]+[\S]+[\s]+{([^}]+)}[\n|\s]*/gmi, '$1')
                                .trim().replace(/(.+);/g, '$1').split(/[\s]+/g)
      if (locationBlock.length >= 2 && locationBlock[0] === 'proxy_pass') {
        // parse upstream name
        const parts = locationBlock[1].split('://')
        if (parts.length !== 2) continue
        const protocol = parts[0].toLowerCase()
        const upstreamName = parts[1]
        // ignore nonsense upstreams
        if (!upstreamCache[upstreamName]) continue
        // validate upstream's protocol
        const upstreamObj = upstreamCache[upstreamName]
        if (upstreamObj.protocol && upstreamObj.protocol.toLowerCase() !== protocol ) continue
        // update upstream's protocol if it's empty
        if (!upstreamObj.protocol) {
          upstreamObj.protocol = <NginxReverseProxySupportedProtocol>(protocol as keyof typeof NginxReverseProxySupportedProtocol)
        }
        // save upstream
        server.locations[locationPath] = {
          upstreamName,
          protocol
        }
      }
    }
    // save valid server
    result[serverKey] = server
  }
  return result
}

export const readRouteTable = async(routeTableFilePath: string): Promise<NginxReverseProxyRouteTable> => {
  if (!routeTableFilePath || !fs.existsSync(routeTableFilePath)) {
    throw `nginx sever config file does not exist at [${routeTableFilePath}]`
  }
  
  try {
    const content = fs.readFileSync(routeTableFilePath, {encoding: 'utf8'})
    .toString().replace(/#[^\n]*/gm, '')

    // search upstream apps
    const upstreams = parseUpstreams(content)

    // search servers
    const servers = parseServers(content, upstreams.upstreamCache)
    const result:NginxReverseProxyRouteTable = {upstreams, servers}
    return result
  } catch(e) {
    throw `unexpected error when reading nginx server config file at [${routeTableFilePath}]: ${e}`
  }
}

export const writeRouteTable = async(routeTableFilePath: string, routetable: NginxReverseProxyRouteTable) => {
  if (!routetable) {
    throw `error when writing nginx server config file: empty routetable object`
  }

  if (!routetable.servers || !routetable.upstreams || !routetable.upstreams.upstreamCache) {
    throw `error when writing nginx server config file: invalid routable object`
  }

  try {
    // write upstreams
    fs.writeFileSync(routeTableFilePath, `# sardines access points`)
    const appendline = (line: string) => {
      fs.writeFileSync(routeTableFilePath, line + '\n', {flag: 'a'})
    }
    appendline(`# updated at ${new Date()}`)
    for (let upstreamKey of Object.keys(routetable.upstreams.upstreamCache)) {
      const upstreamObj = routetable.upstreams.upstreamCache[upstreamKey]
      appendline(`upstream ${upstreamObj.upstreamName} {`)
      if (upstreamObj.loadBalancing === Sardines.Runtime.LoadBalancingStrategy.evenWorkload) {
        appendline(`    least_conn;`)
      } else if (upstreamObj.loadBalancing === Sardines.Runtime.LoadBalancingStrategy.workloadFocusing) {
        appendline(`    ip_hash;`)
      }
      for (let source of upstreamObj.items) {
        appendline(`    server ${source.server}${source.weight?' weight='+source.weight:''};`)
      }
      appendline(`}\n`)
    }
    // write servers
    for (let serverKey of Object.keys(routetable.servers)) {
      const serverObj = routetable.servers[serverKey]
      if (!serverObj.options) continue
      appendline('server {')
      // write server options
      const topProps = ['interfaces', 'name']
      if (serverObj.options.interfaces) {
        for (let inf of serverObj.options.interfaces) {
          if (!inf || !inf.port) continue
          appendline(`    listen ${inf.addr?inf.addr+':':''}${inf.port}${inf.ssl?' ssl':''};`)
        }
      }
      if (serverObj.options.name) {
        appendline(`    server_name ${serverObj.options.name};`)
      }
      for (let key of Object.keys(serverObj.options)) {
        if (topProps.indexOf(key)>=0) continue
        appendline(`    ${key} ${serverObj.options[key]};`)
      }
      // write locations
      let locationList = Object.keys(serverObj.locations)
      locationList.sort((a,b) => {
        if (!a && !b) return 0
        else if (!a) return -1
        else if (!b) return 1
        else if (a === b) return 0
        else if (a.length !== b.length) return b.length - a.length
        else if (a < b) return 1
        else if (a > b) return -1
        return 0
      })
      for (let location of locationList) {
        const locationObj = serverObj.locations[location]
        appendline(`\n    location ${location} {`)
        appendline(`        proxy_pass ${locationObj.protocol}://${locationObj.upstreamName};`)
        appendline(`    }`)
      }
      appendline(`}\n`)
    }
  } catch (e) {
    throw `unexpected error when writing nginx server config file at [${routeTableFilePath}]: ${e}`
  }
}

export class NginxReverseProxy extends AccessPoint{
  private nginxConfigFilePath: string
  private nginxConfig: NginxConfig
  private routeTableFilePath: string

  constructor(
    nginxConfigSettings: NginxConfig = defaultNginxConfig,
    nginxConfigFilePath:string = '/etc/nginx/nginx.conf'
  ) {
    super()
    this.nginxConfigFilePath = nginxConfigFilePath
    this.nginxConfig = Object.assign({}, defaultNginxConfig, nginxConfigSettings)
    this.nginxConfig.serversDir = getServerConfDir(this.nginxConfig.serversDir!)
    this.routeTableFilePath = syspath.resolve(this.nginxConfig.serversDir!, './sardines_servers.conf')
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
      await execCmd('/usr/sbin/service nginx stop')
      await generateNginxConfigFile(this.nginxConfigFilePath, this.nginxConfig)
      await execCmd(`/usr/sbin/service nginx start`)
    }
    
    // restart nginx service
    let restartResult: any = ''
    restartResult = await execCmd('/usr/sbin/service nginx status')
    if (restartResult === 'nginx is running.\n') {
      return true
    }
    throw `nginx is not started`
  }

  private pathForServiceRuntime(sr: Sardines.Runtime.Service, isDefault: boolean = false, options: NginxReverseProxyServiceRuntimeOptions) {
    if (isDefault || !sr.identity.version) {
      return `/${options.root}/${sr.identity.application}/${sr.identity.module}/${sr.identity.name}`.replace(/\/\//g, '/')
    } else {
      return `/${options.root}/${sr.identity.application}/${sr.identity.module}/${sr.identity.name}/${sr.identity.version}`.replace(/\/\//g, '/')
    }
  }

  public async registerAccessPoint(options: NginxServer) {

  }

  public async removeAccessPoint(options: NginxServer) {

  }

  public async registerServiceRuntimes(runtimes: Sardines.Runtime.Service[], options: NginxReverseProxyServiceRuntimeOptions):Promise<Sardines.Runtime.Service[]> {
    if (!runtimes || !Array.isArray(runtimes) || !runtimes.length) {
      throw 'Invalid service runtime data'
    }

    const result:Sardines.Runtime.Service[] = []

    // read the route table file(conf.d/*.conf) and cache into memory
    const routetable: NginxReverseProxyRouteTable = await readRouteTable(this.routeTableFilePath)

    let hasRouteTableModified = false
    // update the route table    
    for (let sr of runtimes) {
      // validate service runtime data
      if (!sr.identity || !sr.entries || !Array.isArray(sr.entries) || !sr.entries.length
        || !sr.identity.application || !sr.identity.module || !sr.identity.name 
        || !sr.identity.version || sr.identity.version === '*'
        ) {
        continue
      }
      // iterate the entries of the service runtime
      for (let entry of sr.entries) {
        // ignore proxied entries
        if (entry.type === Sardines.Runtime.ServiceEntryType.proxy) {
          continue
        }
        // ignore invalid entries
        if (!entry.providerInfo || typeof entry.providerInfo !== 'object') {
          continue
        }
        // Get provider key
        const pvdr = entry.providerInfo
        // ignore non-http provider
        if (!pvdr.protocol || !pvdr.host || !pvdr.port
          || typeof pvdr.port !== 'number' || typeof pvdr.protocol !== 'string'
          || !(pvdr.protocol.toLowerString() in NginxReverseProxySupportedProtocol)
          || typeof pvdr.host !== 'string'
          ) {
          continue
        }
        // prepare the upstream item for the provider
        // const upstreamItem: NginxReverseProxyUpstreamItem = this.upstreamItemForProvider(pvdr)

        // find the path in the route table
        const pathList = [ this.pathForServiceRuntime(sr, false, options) ]
        if (options.isDefaultVersion) {
          pathList.push(this.pathForServiceRuntime(sr, true, options))
        }
        for (let path of pathList) {
          
        }
      }
    }

    if (hasRouteTableModified) {
      await writeRouteTable(this.routeTableFilePath, routetable)
    }

    return result
  }

  public async removeServiceRuntimes(runtimes: Sardines.Runtime.Service[]):Promise<Sardines.Runtime.Service[]> {
    const result: Sardines.Runtime.Service[] = []

    return result
  }
}