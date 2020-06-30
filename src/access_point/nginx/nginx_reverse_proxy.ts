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
  loadBalancing?: Sardines.Runtime.LoadBalancingStrategy
  items?: NginxReverseProxyUpstreamItem[]
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

export interface NginxServerProxyOptions {
  [key: string]: string
}

export const defaultProxySettings = {

}

export interface NginxReverseProxyServerCacheItem {
  options: NginxServer
  locations: {
    [path: string]: {
      upstream?: NginxReverseProxyUpstreamCacheItem
      proxyOptions?: NginxServerProxyOptions
    }
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
            const parts = line[1].split('://')
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
            if (!server.locations[locationPath].proxyOptions) server.locations[locationPath].proxyOptions = {}
            server.locations[locationPath].proxyOptions[proxyOptionName] = proxyOptionValue
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

export const writeRouteTable = async(routeTableFilePath: string, routetable: NginxReverseProxyRouteTable) => {
  if (!routetable) {
    throw `error when writing nginx server config file: empty routetable object`
  }

  if (!routetable.servers || !routetable.servers.serverCache || !routetable.upstreams || !routetable.upstreams.upstreamCache) {
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
        appendline(`        proxy_pass ${locationObj.upstream.protocol}://${locationObj.upstream.upstreamName};`)
        if (locationObj.proxyOptions) {
          for (let optionName of Object.keys(locationObj.proxyOptions)) {
            appendline(`        ${optionName} ${locationObj.proxyOptions[optionName]};`)
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

  private pathForServiceRuntime(sr: Sardines.Runtime.Service, isDefault: boolean = false, options: NginxReverseProxyServiceRuntimeOptions) {
    if (isDefault || !sr.identity.version) {
      return `/${options.root}/${sr.identity.application}/${sr.identity.module}/${sr.identity.name}`.replace(/\/\//g, '/')
    } else {
      return `/${options.root}/${sr.identity.application}/${sr.identity.module}/${sr.identity.name}/${sr.identity.version}`.replace(/\/\//g, '/')
    }
  }

  private parseProviderInfo(pvdrInfo: any):string|string[] {
    if (!pvdrInfo) return ''
    if (typeof pvdrInfo !== 'object') return ''
    if (Array.isArray(pvdrInfo) && pvdrInfo.length) {
      const result = []
      for (let subPvdrInfo of <Array<any>>pvdrInfo) {
        result.push(this.parseProviderInfo(subPvdrInfo))
      }
      return result
    } else {
      let result = `${typeof pvdrInfo.protocol === 'string'?pvdrInfo.protocol.toLowerCase():'http'}://${pvdrInfo.host}`
      if (pvdrInfo.protocol && pvdrInfo.port) {
        if ((pvdrInfo.protocol.toLowerCase() === 'http' && pvdrInfo.port !== 80)
          ||(pvdrInfo.protocol.toLowerCase() === 'https' && pvdrInfo.port !== 443)){
          result+=`:${pvdrInfo.port}`
        }
      }
      return result
    }
    
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

  public async registerServiceRuntimes(accessPoint: NginxServer, runtimes: Sardines.Runtime.Service[], options: NginxReverseProxyServiceRuntimeOptions):Promise<Sardines.Runtime.Service[]> {
    if (!runtimes || !Array.isArray(runtimes) || !runtimes.length) {
      throw 'Invalid service runtime data'
    }
    const result:Sardines.Runtime.Service[] = []

    // register access point if needed
    const serverKey = keyOfNginxServer(accessPoint)
    if (!serverKey) {
      throw 'Invalid access point'
    }
    const routetable: NginxReverseProxyRouteTable = <NginxReverseProxyRouteTable> await this.registerAccessPoints([accessPoint], {returnRouteTable: true})
    if (!routetable.servers.serverCache[serverKey]) {
      throw 'Invalid access point'
    }
    const server = routetable.servers.serverCache[serverKey]

    // Register service runtimes
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
        const defaultPath = this.pathForServiceRuntime(sr, true, options)
        const pathList = [ this.pathForServiceRuntime(sr, false, options) ]
        if (options.isDefaultVersion) {
          pathList.push(defaultPath)
        }
        for (let path of pathList) {
          // register service runtime on the path
          if (!server.locations[path]) {
            // create a upstream

          } else {
            // update current upstream
            const upstream = server.locations[path]

          }

        }
      }
    }

    if (hasRouteTableModified) {
      await writeRouteTable(this.routeTableFilePath, routetable)
    }

    return result
  }

  public async removeServiceRuntimes(accessPoint: NginxServer, runtimes: Sardines.Runtime.Service[]):Promise<Sardines.Runtime.Service[]> {
    const result: Sardines.Runtime.Service[] = []

    return result
  }
}