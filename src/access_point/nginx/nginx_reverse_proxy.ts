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
import { Sardines, utils } from 'sardines-core'

import { AccessPointProvider, AccessPointServiceRuntimeOptions } from '../base'

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
  port?: number
}

export interface NginxReverseProxyUpstreamCacheItem {
  upstreamName: string
  loadBalancing?: Sardines.Runtime.LoadBalancingStrategy
  items?: NginxReverseProxyUpstreamItem[]
  protocol?: NginxReverseProxySupportedProtocol
  root?: string
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

export interface NginxServerProxyOptions {
  name: string
  value: string
}

export const defaultProxyOptions = [

]

export interface NginxReverseProxyLocationItem {
  upstream?: NginxReverseProxyUpstreamCacheItem
  proxyOptions?: NginxServerProxyOptions[]
}

export interface NginxReverseProxyServerCacheItem {
  options: NginxServer
  locations: {
    [path: string]: NginxReverseProxyLocationItem
  }
}

export interface NginxReverseProxyServerCache {
  [nginxServerKey: string]: NginxReverseProxyServerCacheItem
}

export interface NginxReverseProxyServerReverseCache {
  [upstreamName: string]: {
    [serverKey: string]: {
      locations: string[]
      options: NginxServer
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
  servers: {
    serverCache: NginxReverseProxyServerCache
    reverseServerCache: NginxReverseProxyServerReverseCache
  }
}

export const keyOfNginxServer = (vap: NginxServer): string =>{
  let key = ''
  if (!vap.interfaces || !vap.interfaces.length || !vap.name) return key
  key += '@' + vap.interfaces.map((i:NginxServerInterface) => (
    `${i.addr||'0.0.0.0'}:${i.port||80}:${i.ssl?'ssl':'non-ssl'}`
  ))
  .filter((i:string)=>i.length).sort((a,b)=>(a<b)?1:-1).join(',')
  if (key === '@') return ''
  key += '@' + vap.name
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
        if (upstreamItem.server.indexOf(':')>0) {
          const parts = upstreamItem.server.split(':')
          upstreamItem.port = Number(parts[1])
          upstreamItem.server = parts[0]
          if(Number.isNaN(upstreamItem.port)) {
            continue
          }
        }
        const reverseUpstreamCacheKey = `${upstreamItem.server}${upstreamItem.port?':'+upstreamItem.port:''}`
        if (!reverseUpstreamCache[reverseUpstreamCacheKey]) {
          reverseUpstreamCache[reverseUpstreamCacheKey] = {}
        }
        reverseUpstreamCache[reverseUpstreamCacheKey][upstreamName] = {
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

const parseServers = (content: string, upstreamCache: NginxReverseProxyUpstreamCache): {serverCache: NginxReverseProxyServerCache, reverseServerCache: NginxReverseProxyServerReverseCache} => {
  const serverCache: NginxReverseProxyServerCache = {}
  const reverseServerCache: NginxReverseProxyServerReverseCache = {}
  const result: {serverCache: NginxReverseProxyServerCache, reverseServerCache: NginxReverseProxyServerReverseCache} = {
    serverCache,
    reverseServerCache
  }
  
  // let matches = content.match(/server[\s]+{[^}]+(location[\s]+[\S]+[\s]+{[^}]+}[\n|\s]+)+[\s|\n]*}/gmi)
  const locationBlockRegexStr = 'location[\\s]+[\\S]+[\\s]+{[^}]+}[\\n|\\s]*'
  const serverBlockRegexStr = `(server[\\s]+{[^}]+(${locationBlockRegexStr})+[\\s|\\n]*})|(server[\\s]+{[^}]+})`
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
    if (serverCache[serverKey]) continue
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
    const server: NginxReverseProxyServerCacheItem = {
      options: serverOptions,
      locations: {}
    }
    const locationMatches = serverBlock.match(new RegExp(locationBlockRegexStr, 'gmi'))
    if (locationMatches && locationMatches.length) {
      for (let locationBlockStr of locationMatches) {
        const locationPath = locationBlockStr.replace(/location[\s]+([\S]+)[\s]+{[^}]+}[\n|\s]*/gmi, '$1')
        // ignore duplicated path
        if (server.locations[locationPath]) continue
        // parse location block
        const locationBlock = locationBlockStr.replace(/location[\s]+[\S]+[\s]+{([^}]+)}[\n|\s]*/gmi, '$1')
                                  .split(/[\n|\r]/)
        for (let linestr of locationBlock) {
          const line = linestr.trim().replace(/(.+);/g, '$1').split(/[\s]+/g)
          if (line.length >= 2 && line[0] === 'proxy_pass') {
            // parse upstream name
            let parts = line[1].split('://')
            if (parts.length !== 2) continue
            const protocol = parts[0].toLowerCase()
            const upstreamStr = parts[1]
            let upstreamName = upstreamStr
            let upstreamRoot = ''
            
            if (upstreamStr.indexOf('/') > 0) {
              upstreamRoot = upstreamStr.substr(parts[1].indexOf('/'))
              upstreamName = upstreamStr.substr(0, parts[1].indexOf('/'))
            }
            if (upstreamName.indexOf(':')>0) {
              // upstream in location can not contain port number
              // or it would conflict with the port number of upstream settings
              continue
            }

            // ignore nonsense upstreams
            if (!upstreamCache[upstreamName]) continue
            // validate upstream's protocol
            const upstreamObj = Object.assign({}, upstreamCache[upstreamName])
            // if (upstreamObj.protocol && upstreamObj.protocol.toLowerCase() !== protocol ) continue
            // update upstream's protocol if it's empty
            // if (!upstreamObj.protocol) 
            upstreamObj.protocol = <NginxReverseProxySupportedProtocol>(protocol as keyof typeof NginxReverseProxySupportedProtocol)
            if (upstreamRoot) upstreamObj.root = upstreamRoot
            // save upstream
            if (!server.locations[locationPath]) server.locations[locationPath] = {}
            server.locations[locationPath].upstream = upstreamObj
            // save to reverse cache
            if (!reverseServerCache[upstreamName]) reverseServerCache[upstreamName] = {}
            if (!reverseServerCache[upstreamName][serverKey]) reverseServerCache[upstreamName][serverKey] = {
              locations: [],
              options: serverOptions
            }
            if (reverseServerCache[upstreamName][serverKey].locations.indexOf(locationPath)<0) {
              reverseServerCache[upstreamName][serverKey].locations.push(locationPath)
            }
          } else if (line.length>1) {
            const proxyOptionName = line[0]
            const proxyOptionValue = line.slice(1).join(' ')
            if (!server.locations[locationPath]) server.locations[locationPath] = {}
            if (!server.locations[locationPath].proxyOptions) server.locations[locationPath].proxyOptions = []
            server.locations[locationPath].proxyOptions.push({
              name: proxyOptionName,
              value: proxyOptionValue
            })
          }
        }
        
      }
    }
    // save valid server
    serverCache[serverKey] = server
  }
  return result
}

export const readRouteTable = async(routeTableFilePath: string): Promise<NginxReverseProxyRouteTable> => {
  if (!routeTableFilePath || !fs.existsSync(routeTableFilePath)) {
    return {upstreams: {upstreamCache: {}, reverseUpstreamCache: {}}, servers: {serverCache: {}, reverseServerCache: {}}}
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

export const writeRouteTable = async(routeTableFilePath: string, routetable: NginxReverseProxyRouteTable, options: {appendDefaultProxyOptions: boolean} = {appendDefaultProxyOptions: true}) => {
  if (!routetable) {
    throw `error when writing nginx server config file: empty routetable object`
  }

  if (!routetable.servers || !routetable.servers.serverCache || !routetable.upstreams || !routetable.upstreams.upstreamCache) {
    throw `error when writing nginx server config file: invalid routable object`
  }

  try {
    // write upstreams
    fs.writeFileSync(routeTableFilePath, `# sardines access points\n`)
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
        let sourceStr = `${source.server}${source.port?':'+source.port:''}${source.weight>1?' weight='+source.weight:''};`
        appendline(`    server ${sourceStr}`)
      }
      appendline(`}\n`)
    }
    // write servers
    for (let serverKey of Object.keys(routetable.servers.serverCache)) {
      const serverObj = routetable.servers.serverCache[serverKey]
      if (!serverObj.options) continue
      appendline('server {')
      // write server options
      const topProps = ['interfaces', 'name']
      if (serverObj.options.interfaces) {
        for (let inf of serverObj.options.interfaces) {
          if (!inf || !inf.port) continue
          appendline(`    listen ${inf.addr&& inf.addr!=='0.0.0.0'?inf.addr+':':''}${inf.port}${inf.ssl?' ssl':''};`)
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
        if (!locationObj.upstream || !locationObj.upstream.protocol || !locationObj.upstream.upstreamName) continue
        appendline(`\n    location ${location} {`)
        let upstreamStr = `${locationObj.upstream.protocol}://${locationObj.upstream.upstreamName}`
        
        if (locationObj.upstream.root) {
          upstreamStr += locationObj.upstream.root
        }
        appendline(`        proxy_pass ${upstreamStr};`)
        if (locationObj.proxyOptions && locationObj.proxyOptions.length) {
          for (let op of locationObj.proxyOptions) {
            appendline(`        ${op.name} ${op.value};`)
          }
        }
        appendline(`    }`)

      }
      appendline(`}\n`)
    }
  } catch (e) {
    throw `unexpected error when writing nginx server config file at [${routeTableFilePath}]: ${e}`
  }
}

const updateRouteTableFile = async(routeTableFilePath: string, routable: NginxReverseProxyRouteTable) => {
  await writeRouteTable(routeTableFilePath, routable)
  const updatedRouteTable = await readRouteTable(routeTableFilePath)
  await writeRouteTable(routeTableFilePath, updatedRouteTable)
  return updatedRouteTable
}

export interface NginxReverseProxySupprotedProviderInfo {
  protocol: NginxReverseProxySupportedProtocol
  host: string
  port: number
  driver: string
  root?: string
  weight?: number
  type?: Sardines.Runtime.ServiceEntryType
}

export interface NginxReverseProxySupportedServiceRuntime {
  protocol: NginxReverseProxySupportedProtocol
  serviceIdentity: Sardines.ServiceIdentity
  providers: NginxReverseProxySupprotedProviderInfo[]
}

const validServiceRuntime = async (sr: Sardines.Runtime.Service, options: {noEmptyProviders: boolean, acceptAsteriskVersion: boolean} = {noEmptyProviders: true, acceptAsteriskVersion: false}): Promise<NginxReverseProxySupportedServiceRuntime> => {
  if (!sr.identity || !sr.entries || !Array.isArray(sr.entries) || !sr.entries.length
    || !sr.identity.application || !sr.identity.module || !sr.identity.name 
    || !sr.identity.version || (sr.identity.version === '*' && !(options && options.acceptAsteriskVersion))
    ) {
    throw `invalid service runtime`
  }
  
  let protocol: NginxReverseProxySupportedProtocol|null = null
  let providers: NginxReverseProxySupprotedProviderInfo[] = []
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
    const tmpProtocol = <NginxReverseProxySupportedProtocol>(pvdr.protocol.toLowerCase() as keyof typeof NginxReverseProxySupportedProtocol)
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

  return {protocol: protocol!, serviceIdentity: sr.identity, providers}
}


const createUpstreamName = () => {
  return `${Date.now()}_${Math.round(Math.random()*1000)}`
}
const createUpstreamObject = (
  copy: NginxReverseProxyUpstreamCacheItem|null = null,
  options: {loadBalance: Sardines.Runtime.LoadBalancingStrategy, protocol: NginxReverseProxySupportedProtocol} = {loadBalance: Sardines.Runtime.LoadBalancingStrategy.evenWorkload, protocol: NginxReverseProxySupportedProtocol.HTTP}
  ):NginxReverseProxyUpstreamCacheItem => {
  if (copy) {
    const newUpstreamObj:NginxReverseProxyUpstreamCacheItem = Object.assign({}, copy)
    if (copy.items) {
      newUpstreamObj.items = []
      for (let i=0; i <copy.items.length;i++) {
        const item = copy.items[i]
        newUpstreamObj.items.push(Object.assign({}, item))
      }
    }
    newUpstreamObj.upstreamName = createUpstreamName()
    return newUpstreamObj
  } else {
    const newUpstreamObj: NginxReverseProxyUpstreamCacheItem = {
      upstreamName: createUpstreamName(),
      loadBalancing: options.loadBalance,
      items: [],
      protocol: options.protocol,
    }
    return newUpstreamObj
  }
}

const saveUpstreamObject = (routetable: NginxReverseProxyRouteTable,  upstreamObj : NginxReverseProxyUpstreamCacheItem, serverKey: string|null = null, location: string|null = null) => {
  let hasRouteTableModified = false
  if (!routetable || !routetable.upstreams || !routetable.upstreams.upstreamCache || !routetable.upstreams.reverseUpstreamCache) return hasRouteTableModified
  if (!upstreamObj || !upstreamObj.upstreamName || !upstreamObj.items || !upstreamObj.items.length) return hasRouteTableModified
  if (routetable.upstreams.upstreamCache[upstreamObj.upstreamName]) return hasRouteTableModified
  routetable.upstreams.upstreamCache[upstreamObj.upstreamName] = upstreamObj
  for (let item of upstreamObj.items) {
    const itemKey = `${item.server}${item.port?':'+item.port:''}`
    if (!routetable.upstreams.reverseUpstreamCache[itemKey]) {
      routetable.upstreams.reverseUpstreamCache[itemKey] = {}
    }
    if (!routetable.upstreams.reverseUpstreamCache[itemKey][upstreamObj.upstreamName]) {
      routetable.upstreams.reverseUpstreamCache[itemKey][upstreamObj.upstreamName] = {
        weight: item.weight,
        loadBalancing: upstreamObj.loadBalancing
      }
    }
    if (serverKey && location) {
      if (routetable.servers && routetable.servers.serverCache[serverKey] 
        && routetable.servers.serverCache[serverKey].locations[location]
        ) {
        routetable.servers.serverCache[serverKey].locations[location].upstream = upstreamObj
        if (!routetable.servers.reverseServerCache[upstreamObj.upstreamName]) {
          routetable.servers.reverseServerCache[upstreamObj.upstreamName] = {}
        }
        if (!routetable.servers.reverseServerCache[upstreamObj.upstreamName][serverKey]) {
          routetable.servers.reverseServerCache[upstreamObj.upstreamName][serverKey] = {
            locations: [],
            options: routetable.servers.serverCache[serverKey].options
          }
        }
        if (routetable.servers.reverseServerCache[upstreamObj.upstreamName][serverKey].locations.indexOf(location)<0) {
          routetable.servers.reverseServerCache[upstreamObj.upstreamName][serverKey].locations.push(location)
        }
      }
    }
  }
  hasRouteTableModified = true
  return hasRouteTableModified
}

const removeItemFromUpstreamObject = (routetable: NginxReverseProxyRouteTable,  upstream : NginxReverseProxyUpstreamCacheItem, serverKey: string, location: string, pvdr: NginxReverseProxySupprotedProviderInfo) => {
  let upstreamObj = upstream
  let hasRouteTableModified = false
  if (!routetable || !upstreamObj || !upstreamObj.upstreamName || !serverKey || !location || !pvdr) return hasRouteTableModified
  if (!routetable.servers.serverCache[serverKey]) return hasRouteTableModified
  if (!routetable.servers.serverCache[serverKey].locations[location]) return hasRouteTableModified

  const locationObj = routetable.servers.serverCache[serverKey].locations[location]
  // ignore invalid location
  if (!locationObj.upstream) {
    console.log('WARNING: routetable structure is broken at server [', serverKey,'], location: [', location,'], which should has a valid upstream object')
    return hasRouteTableModified
  }
  if (!routetable.upstreams.upstreamCache[upstreamObj.upstreamName]) {
    console.log('WARNING: routetable structure is broken in its upstream cache, which should contain upstream named:', upstreamObj.upstreamName)
    return hasRouteTableModified
  }
  let upstreamName = upstreamObj.upstreamName
  // check the reverse server cache of the upstream
  if (!routetable.servers.reverseServerCache[upstreamName]) {
    console.log('WARNING: routetable structure is broken for upstream:', upstreamName, ', which does not exist in the reverse sever cache')
    return hasRouteTableModified
  }
  if (!routetable.servers.reverseServerCache[upstreamName][serverKey]) {
    console.log('WARNING: routetable structure is broken for upstream:', upstreamName, ', which reverse server cache item should contains server key:', serverKey)
    return hasRouteTableModified
  }
  if (routetable.servers.reverseServerCache[upstreamName][serverKey].locations.indexOf(location) < 0){
    console.log('WARNING: routetable structure is broken for upstream:', upstreamName, ', in which reverse server cache item should contains path [', location, '] in its server key', serverKey)
    return hasRouteTableModified
  }
  // locate the provider item in the location
  const port = (pvdr.port)?pvdr.port: (pvdr.protocol.toLowerCase() === 'https')? 443: 80
  let itemIndex = -1
  for (let i = upstreamObj.items.length - 1; i>=0; i--) {
    const item = upstreamObj.items[i]
    if (item.port === port && item.server === pvdr.host) {
      itemIndex = i
      break
    }
  }
  if (itemIndex < 0) return hasRouteTableModified
  
  // duplicate the upstream object, if it is referenced by other locations
  if (routetable.servers.reverseServerCache[upstreamName][serverKey].locations.length > 1) {
    // remove the location in the reverse server cache of the upstream
    const locationIndex = routetable.servers.reverseServerCache[upstreamName][serverKey].locations.indexOf(location)
    routetable.servers.reverseServerCache[upstreamName][serverKey].locations.splice(locationIndex,1)
    upstreamObj = createUpstreamObject(upstreamObj)
    upstreamName = upstreamObj.upstreamName
    let saved = saveUpstreamObject(routetable, upstreamObj, serverKey, location)
    if (!saved) {
      return hasRouteTableModified
    }
  }
  // remove the server item from the upstream obj
  upstreamObj.items.splice(itemIndex,1)
  // remove non-useful pvdr from reverse upstream cache
  const pvdrKey = `${pvdr.host}${pvdr.port?':'+pvdr.port:''}`
  if (routetable.upstreams.reverseUpstreamCache[pvdrKey][upstreamName]) {
    delete routetable.upstreams.reverseUpstreamCache[pvdrKey][upstreamName]
  }
  if (Object.keys(routetable.upstreams.reverseUpstreamCache[pvdrKey]).length === 0) {
    delete routetable.upstreams.reverseUpstreamCache[pvdrKey]
  }

  // remove empty upstream object
  if (upstreamObj.items.length === 0) {
    delete routetable.upstreams.upstreamCache[upstreamName]
    // remove all locations which reference this upstream
    for (let s of Object.keys(routetable.servers.reverseServerCache[upstreamName])) {
      for (let l of routetable.servers.reverseServerCache[upstreamName][s].locations) {
        delete routetable.servers.serverCache[s].locations[l]
      }
    }
    // make sure the target location is removed
    if (routetable.servers.serverCache[serverKey].locations[location]) {
      delete routetable.servers.serverCache[serverKey].locations[location]
    }
    // remove the upstream in cache
    delete routetable.servers.reverseServerCache[upstreamName]
  }
  

}

const findUpstreamForServiceRuntime = async (routetable: NginxReverseProxyRouteTable, serviceRuntime: Sardines.Runtime.Service, options: AccessPointServiceRuntimeOptions): Promise<{
  serviceRuntime: NginxReverseProxySupportedServiceRuntime,
  upstreamItem: NginxReverseProxyUpstreamCacheItem,
  serviceDriver: string
  serviceRoot?: string
}> => {
    // validate service runtime data
    const sr = await validServiceRuntime(serviceRuntime)
      // generate upstream group
    const newUpstreamItem: NginxReverseProxyUpstreamCacheItem = createUpstreamObject(null, {
      loadBalance: options.loadBalance,
      protocol: sr.protocol
    })
    
    let root = ''
    let driver = ''
    for (let pvdr of sr.providers) {
      const item: NginxReverseProxyUpstreamItem = {
        server: pvdr.host,
        weight: pvdr.weight
      }
      if ((sr.protocol === NginxReverseProxySupportedProtocol.HTTP && pvdr.port!== 80)
      ||(sr.protocol === NginxReverseProxySupportedProtocol.HTTPS && pvdr.port!== 443)) {
        item.port = pvdr.port
      }
      newUpstreamItem.items.push(item)
      if (pvdr.root) root = pvdr.root
      if (!driver) driver = pvdr.driver
    }
    // search an existing upstream
    const candidateUpstreamItemsCache: {[upstreamName:string]:NginxReverseProxyUpstreamCacheItem} = {}
    for (let item of newUpstreamItem.items) {
      const reverseUpstreamCacheKey = `${item.server}${item.port?':'+item.port:''}`
      if (routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey]) {
        for (let upstreamName of Object.keys(routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey])) {
          if (!candidateUpstreamItemsCache[upstreamName]) {
            candidateUpstreamItemsCache[upstreamName] = routetable.upstreams.upstreamCache[upstreamName]
          }
        }
      }
    }
    for (let upstreamKey of Object.keys(candidateUpstreamItemsCache)) {
      const upstreamObj = routetable.upstreams.upstreamCache[upstreamKey]
      if (upstreamObj.items) {
       if (upstreamObj.items.length === newUpstreamItem.items.length) {
         if (utils.isEqual(upstreamObj.items.map(i=>`${i.server}${i.port?':'+i.port:''}`), newUpstreamItem.items.map(i=>`${i.server}${i.port?':'+i.port:''}`))) {
            newUpstreamItem.upstreamName = upstreamObj.upstreamName
            break
          }
        }
      }
    }

    const result:{
      serviceRuntime: NginxReverseProxySupportedServiceRuntime,
      upstreamItem: NginxReverseProxyUpstreamCacheItem,
      serviceDriver: string
      serviceRoot?: string
    } = {
      serviceRuntime: sr,
      upstreamItem: newUpstreamItem,
      serviceDriver: driver
    }
    if (root) result.serviceRoot = root

    return result
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

  public async restart(routetable: NginxReverseProxyRouteTable|null = null) {
    this.isRunning = false
    await stopNginx()
    let newRoutetable : NginxReverseProxyRouteTable|null = null
    if (routetable) newRoutetable = await updateRouteTableFile(this.routeTableFilePath, routetable)
    await startNginx()
    if (await isNginxRunning()) {
      this.isRunning = true
    }
    return newRoutetable
  }

  private rootForServiceRuntime(sr: Sardines.ServiceIdentity, isDefault: boolean = false, options: NginxReverseProxyServiceRuntimeOptions) {
    if (isDefault || !sr.version || sr.version === '*') {
      return `/${this.root||'/'}/${options.root||'/'}/`.replace(/\/+/g, '/')
    } else {
      return `/${this.root||'/'}/${options.root||'/'}/${sr.version}/`.replace(/\/+/g, '/')
    }
  }

  private pathForServiceRuntime(sr: Sardines.ServiceIdentity, isDefault: boolean = false, options: NginxReverseProxyServiceRuntimeOptions) {
    const root = this.rootForServiceRuntime(sr, isDefault, options)
    return `/${root}/${sr.application}/${sr.module}/${sr.name}`.replace(/\/+/g, '/')
  }

  public async registerAccessPoints(accessPointList: NginxServer[], options: NginxServerActionOptions = defaultNginxServerActionOptions) {
    if (!Array.isArray(accessPointList)) throw `invalid access point list`
    if (!accessPointList || !accessPointList.length) throw `empty access point list`
    let routetable = await readRouteTable(this.routeTableFilePath)
    const registered: NginxServer[] = []
    for (let accessPointOptions of accessPointList) {
      if (!accessPointOptions) continue
      const key = keyOfNginxServer(accessPointOptions)
      if (!key) continue
      if (routetable.servers.serverCache[key]) continue
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
      routetable.servers.serverCache[key]= {options: accessPointOptions, locations: {}}
      registered.push(accessPointOptions)
    }
    if (registered.length && !(options && !options.restart)) {
      routetable = await this.restart(routetable)
    } else if (registered.length && options && options.writeServerConfigFileWithoutRestart) {
      routetable = await updateRouteTableFile(this.routeTableFilePath, routetable)
    }

    if (options && options.returnRouteTable) {
      return routetable
    } else {
      return registered.filter((i:NginxServer) => {
        const key = keyOfNginxServer(i)
        return (key && routetable.servers.serverCache[key])
      })
    }
  }

  public async removeAccessPoints(accessPointList: NginxServer[], options: NginxServerActionOptions = defaultNginxServerActionOptions) {
    if (!Array.isArray(accessPointList)) throw `invalid access point list`
    if (!accessPointList || !accessPointList.length) {
      throw 'empty access point list'
    }

    let result : NginxServer[] = []
    let routetable = await readRouteTable(this.routeTableFilePath)
    if (routetable && routetable.servers && routetable.servers.serverCache && routetable.servers.reverseServerCache && Object.keys(routetable.servers.serverCache).length > 0) {
      for (let ap of accessPointList) {
        let serverkey = keyOfNginxServer(ap)
        if (routetable.servers.serverCache[serverkey]) {
          const serverObj = routetable.servers.serverCache[serverkey]
          // remove the unused upstreams
          for (let locationKey of Object.keys(serverObj.locations)) {
            const locationObj = serverObj.locations[locationKey]
            if (!locationObj || !locationObj.upstream || !locationObj.upstream.upstreamName) continue
            const upstreamCache = routetable.servers.reverseServerCache[locationObj.upstream.upstreamName]
            if (upstreamCache[serverkey]) {
              delete upstreamCache[serverkey]
            }
            if (!upstreamCache || !Object.keys(upstreamCache).length) {
              // remove the upstream
              if (routetable.upstreams && routetable.upstreams.upstreamCache) {
                if (routetable.upstreams.upstreamCache[locationObj.upstream.upstreamName]) {
                  delete routetable.upstreams.upstreamCache[locationObj.upstream.upstreamName]
                }
              }
            }
          }
          // remove the server
          delete routetable.servers.serverCache[serverkey]
          result.push(ap)
        }
      }
      if (result.length && options.restart) {
        routetable = await this.restart(routetable)
      } else if (result.length && options && options.writeServerConfigFileWithoutRestart) {
        routetable = await updateRouteTableFile(this.routeTableFilePath, routetable)
      }
      if (options && options.returnRouteTable) {
        return routetable
      } else {
        return result.filter((i:NginxServer) => {
          const key = keyOfNginxServer(i)
          return (key && !routetable.servers.serverCache[key])
        })
      }
    }
  }

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
    let routetable: NginxReverseProxyRouteTable = <NginxReverseProxyRouteTable> await this.registerAccessPoints([accessPoint], {returnRouteTable: true, restart: false, writeServerConfigFileWithoutRestart: false})
    if (!routetable.servers.serverCache[serverKey]) {
      throw 'Invalid access point'
    }
    const server = routetable.servers.serverCache[serverKey]
    if (!server.options.interfaces || !server.options.interfaces.length || !server.options.name) {
      throw 'Invalid access point'
    }

    // Register service runtimes
    let hasRouteTableModified = false
    let somethingWrong = false
    
    // update route table
    for (let serviceRuntime of runtimes) {
      try {
        const x = await findUpstreamForServiceRuntime(routetable, serviceRuntime, options)
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
            if (!routetable.upstreams.upstreamCache[x.upstreamItem.upstreamName]) {
              routetable.upstreams.upstreamCache[x.upstreamItem.upstreamName] = x.upstreamItem
              // cache items of upstream in reverse cache
              for (let item of x.upstreamItem.items) {
                const reverseUpstreamCacheKey = `${item.server}${item.port?':'+item.port:''}`
                if (!routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey]) {
                  routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey] = {}
                }
                if (!routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey][x.upstreamItem.upstreamName]) {
                  routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey][x.upstreamItem.upstreamName] = {
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
              routetable.upstreams.upstreamCache[upstreamName] = x.upstreamItem
            } else {
              const upstreamObj = routetable.upstreams.upstreamCache[upstreamName]
              // merge newUpstream items into exinsting upstream items
              for (let item of x.upstreamItem.items) {
                const reverseUpstreamCacheKey = `${item.server}${item.port?':'+item.port:''}`
                const reverseUpstreamCacheItem = routetable.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey]
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
        routetable = await this.restart(routetable)
      } else if (actionOptions && actionOptions.writeServerConfigFileWithoutRestart) {
        routetable = await updateRouteTableFile(this.routeTableFilePath, routetable)
      }
    }
    if (actionOptions && actionOptions.returnRouteTable) return routetable
    return result
  }

  public async removeServiceRuntimes(accessPoint: NginxServer, runtimes: Sardines.Runtime.Service[], options: NginxReverseProxyServiceRuntimeOptions = {isDefaultVersion: false}, actionOptions: NginxServerActionOptions = defaultNginxServerActionOptions):Promise<Sardines.Runtime.Service[]|NginxReverseProxyRouteTable> {
    if (!accessPoint || !accessPoint.interfaces || !accessPoint.interfaces.length || !accessPoint.name) {
      throw `invalid access point`
    }
    let routetable = await readRouteTable(this.routeTableFilePath)
    const serverKey = keyOfNginxServer(accessPoint)
    const server = routetable.servers.serverCache[serverKey]
    if (!server) {
      throw `access point does not exist`
    }

    const result: Sardines.Runtime.Service[] = []
    if (!server.locations) {
      if (actionOptions && actionOptions.returnRouteTable) return routetable
      else return result  
    }
    let hasRouteTableModified = false
    for (let runtime of runtimes) {
      try {
        const sr = await validServiceRuntime(runtime, {noEmptyProviders: false, acceptAsteriskVersion: true})

        // get upstream object from server location object
        let defaultPath = this.pathForServiceRuntime(sr.serviceIdentity, true, options)
        let pathList = [this.pathForServiceRuntime(sr.serviceIdentity, false, options)]
        if (options && options.isDefaultVersion && pathList[0] !== defaultPath) pathList.push(defaultPath)
        if (sr.providers.length) {
          // remove upstream server items one by one
          const entries: Sardines.Runtime.ServiceEntry[] = []
          for (let pvdr of sr.providers) {
            // ignore non-exist providers
            const pvdrKey = `${pvdr.host}${pvdr.port?':'+pvdr.port:''}`
            if (!routetable.upstreams.reverseUpstreamCache[pvdrKey]) continue
            for (let path of pathList) {
              // ignore non-exist path
              if (!server.locations[path]) continue
              // remove pvdr from location
              const locationObj = server.locations[path]
              let upstreamName = locationObj.upstream.upstreamName
              let upstreamObj = routetable.upstreams.upstreamCache[upstreamName]
              const saved = removeItemFromUpstreamObject(routetable, upstreamObj, serverKey, path, pvdr)
              if (!saved) continue
              if (!hasRouteTableModified) hasRouteTableModified = true
              const type = pvdr.type || Sardines.Runtime.ServiceEntryType.dedicated
              if (pvdr.type) delete pvdr.type
              entries.push({
                type: type,
                providerInfo: pvdr
              })
            }
          }
          if (entries.length) {
            result.push({
              identity: sr.serviceIdentity,
              entries
            })
          }
        } else {
          // remove entire path for the service runtime

        }
      } catch (e) {
        console.log('WARNING: error while validating service runtime:', runtime, ', error:', e)
        continue
      }
    }
    return result
  }
}