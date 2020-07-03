/**
 * @author Robin Sun
 * @email robin@naturewake.com
 * @create date 2020-07-03 09:52:07
 * @modify date 2020-07-03 09:52:07
 * @desc [description]
 */

import * as fs from 'fs'
import { Sardines, utils } from 'sardines-core'
import { AccessPointServiceRuntimeOptions } from '../base'

export enum NginxReverseProxySupportedProtocol {
  HTTP = 'http',
  HTTPS = 'https'
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


export interface NginxReverseProxySupprotedProviderInfo {
  protocol: NginxReverseProxySupportedProtocol
  host: string
  port: number
  driver: string
  root?: string
  weight?: number
  type?: Sardines.Runtime.ServiceEntryType
}

export const defaultProxyOptions = [

]

// export interface NginxReverseProxyRouteTable {
//   upstreams: {
//     upstreamCache: NginxReverseProxyUpstreamCache,
//     reverseUpstreamCache: NginxReverseProxyUpstreamReverseCache
//   },
//   servers: {
//     serverCache: NginxReverseProxyServerCache
//     reverseServerCache: NginxReverseProxyServerReverseCache
//   }
// }

export interface NginxReverseProxySupportedServiceRuntime {
  protocol: NginxReverseProxySupportedProtocol
  serviceIdentity: Sardines.ServiceIdentity
  providers: NginxReverseProxySupprotedProviderInfo[]
}

export const validServiceRuntime = async (sr: Sardines.Runtime.Service, options: {noEmptyProviders: boolean, acceptAsteriskVersion: boolean} = {noEmptyProviders: true, acceptAsteriskVersion: false}): Promise<NginxReverseProxySupportedServiceRuntime> => {
  if (!sr.identity || !sr.entries || !Array.isArray(sr.entries) || (!sr.entries.length && options && options.noEmptyProviders)
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

export class NginxReverseProxyRouteTable {
  private routeTableFilePath: string
  public upstreams: {
    upstreamCache: NginxReverseProxyUpstreamCache
    reverseUpstreamCache: NginxReverseProxyUpstreamReverseCache
  }
  public servers: {
    serverCache: NginxReverseProxyServerCache
    reverseServerCache: NginxReverseProxyServerReverseCache
  }
  constructor(filepath: string) {
    this.routeTableFilePath = filepath
    this.servers = {serverCache: {}, reverseServerCache: {}}
    this.upstreams = {upstreamCache: {}, reverseUpstreamCache: {}}
  }

  get isEmpty() {
    return !this.servers || !this.servers.serverCache || !Object.keys(this.servers.serverCache).length
  }

  findDuplicatedUpstream (newUpstreamItem: NginxReverseProxyUpstreamCacheItem): NginxReverseProxyUpstreamCacheItem|null {
    const candidateUpstreamItemsCache: {[upstreamName:string]:NginxReverseProxyUpstreamCacheItem} = {}
    for (let item of newUpstreamItem.items) {
      const reverseUpstreamCacheKey = `${item.server}${item.port?':'+item.port:''}`
      if (this.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey]) {
        for (let upstreamName of Object.keys(this.upstreams.reverseUpstreamCache[reverseUpstreamCacheKey])) {
          if (!candidateUpstreamItemsCache[upstreamName]) {
            candidateUpstreamItemsCache[upstreamName] = this.upstreams.upstreamCache[upstreamName]
          }
        }
      }
    }
    for (let upstreamKey of Object.keys(candidateUpstreamItemsCache)) {
      const upstreamObj = this.upstreams.upstreamCache[upstreamKey]
      if (upstreamObj.items) {
        if (upstreamObj.items.length === newUpstreamItem.items.length) {
          if (utils.isEqual(upstreamObj.items.map(i=>`${i.server}${i.port?':'+i.port:''}`), newUpstreamItem.items.map(i=>`${i.server}${i.port?':'+i.port:''}`))) {
            return upstreamObj
          }
        }
      }
    }
    return null
  }

  async saveUpstreamObject (upstreamObj : NginxReverseProxyUpstreamCacheItem, serverKey: string|null = null, location: string|null = null) {
    let hasRouteTableModified = false
    if ( !this.upstreams || !this.upstreams.upstreamCache || !this.upstreams.reverseUpstreamCache) return hasRouteTableModified
    if (!upstreamObj || !upstreamObj.upstreamName || !upstreamObj.items || !upstreamObj.items.length) return hasRouteTableModified
    if (this.upstreams.upstreamCache[upstreamObj.upstreamName]) return hasRouteTableModified
    // save upstream object
    this.upstreams.upstreamCache[upstreamObj.upstreamName] = upstreamObj
    for (let item of upstreamObj.items) {
      const itemKey = `${item.server}${item.port?':'+item.port:''}`
      if (!this.upstreams.reverseUpstreamCache[itemKey]) {
        this.upstreams.reverseUpstreamCache[itemKey] = {}
      }
      if (!this.upstreams.reverseUpstreamCache[itemKey][upstreamObj.upstreamName]) {
        this.upstreams.reverseUpstreamCache[itemKey][upstreamObj.upstreamName] = {
          weight: item.weight,
          loadBalancing: upstreamObj.loadBalancing
        }
      }
      if (serverKey && location) {
        if (this.servers && this.servers.serverCache[serverKey] 
          && this.servers.serverCache[serverKey].locations[location]
          ) {
          this.servers.serverCache[serverKey].locations[location].upstream = upstreamObj
          if (!this.servers.reverseServerCache[upstreamObj.upstreamName]) {
            this.servers.reverseServerCache[upstreamObj.upstreamName] = {}
          }
          if (!this.servers.reverseServerCache[upstreamObj.upstreamName][serverKey]) {
            this.servers.reverseServerCache[upstreamObj.upstreamName][serverKey] = {
              locations: [],
              options: this.servers.serverCache[serverKey].options
            }
          }
          if (this.servers.reverseServerCache[upstreamObj.upstreamName][serverKey].locations.indexOf(location)<0) {
            this.servers.reverseServerCache[upstreamObj.upstreamName][serverKey].locations.push(location)
          }
        }
      }
    }
    hasRouteTableModified = true
    return hasRouteTableModified
  }

  async removeItemFromUpstreamObject ( upstream : NginxReverseProxyUpstreamCacheItem, serverKey: string, location: string, pvdr: NginxReverseProxySupprotedProviderInfo|null = null) {
    let upstreamObj = upstream
    let hasRouteTableModified = false
    if (!upstreamObj || !upstreamObj.upstreamName || !serverKey || !location) return hasRouteTableModified
    if (!this.servers.serverCache[serverKey]) return hasRouteTableModified
    if (!this.servers.serverCache[serverKey].locations[location]) return hasRouteTableModified
  
    const locationObj = this.servers.serverCache[serverKey].locations[location]
    // ignore invalid location
    if (!locationObj.upstream) {
      console.log('WARNING: routetable structure is broken at server [', serverKey,'], location: [', location,'], which should has a valid upstream object')
      return hasRouteTableModified
    }
    if (!this.upstreams.upstreamCache[upstreamObj.upstreamName]) {
      console.log('WARNING: routetable structure is broken in its upstream cache, which should contain upstream named:', upstreamObj.upstreamName)
      return hasRouteTableModified
    }
    let upstreamName = upstreamObj.upstreamName
    // check the reverse server cache of the upstream
    if (!this.servers.reverseServerCache[upstreamName]) {
      console.log('WARNING: routetable structure is broken for upstream:', upstreamName, ', which does not exist in the reverse sever cache')
      return hasRouteTableModified
    }
    if (!this.servers.reverseServerCache[upstreamName][serverKey]) {
      console.log('WARNING: routetable structure is broken for upstream:', upstreamName, ', which reverse server cache item should contains server key:', serverKey)
      return hasRouteTableModified
    }
    const locationIndexInReverseServerCache = this.servers.reverseServerCache[upstreamName][serverKey].locations.indexOf(location)
    if (locationIndexInReverseServerCache < 0){
      console.log('WARNING: routetable structure is broken for upstream:', upstreamName, ', in which reverse server cache item should contains path [', location, '] in its server key', serverKey)
      return hasRouteTableModified
    }
    if (pvdr) {
      // locate the provider item in the location
      let itemIndex = -1
      const port = (pvdr.port)?pvdr.port: (pvdr.protocol.toLowerCase() === 'https')? 443: 80
      for (let i = upstreamObj.items.length - 1; i>=0; i--) {
        const item = upstreamObj.items[i]
        if (item.port === port && item.server === pvdr.host) {
          itemIndex = i
          break
        }
      }
      if (itemIndex < 0) return hasRouteTableModified
      // duplicate the upstream object, if it is referenced by other locations
      if (this.servers.reverseServerCache[upstreamName][serverKey].locations.length > 1) {
        // remove the location in the reverse server cache of the upstream
        const locationIndex = this.servers.reverseServerCache[upstreamName][serverKey].locations.indexOf(location)
        // remove old one reverse server cache
        this.servers.reverseServerCache[upstreamName][serverKey].locations.splice(locationIndex,1)
        let newUpstreamObj = createUpstreamObject(this.servers.serverCache[serverKey].locations[location].upstream)
        // remove the server item from the upstream obj
        newUpstreamObj.items.splice(itemIndex,1)
        // ignore duplication
        const found = this.findDuplicatedUpstream(newUpstreamObj)
        if (found) {
          newUpstreamObj = found
          // add the new one into the reverse server cache
          if (!this.servers.reverseServerCache[newUpstreamObj.upstreamName][serverKey]) {
            this.servers.reverseServerCache[newUpstreamObj.upstreamName][serverKey] = {
              locations: [],
              options: this.servers.serverCache[serverKey].options
            }
          }
          this.servers.reverseServerCache[newUpstreamObj.upstreamName][serverKey].locations.push(location)
        } 
        let saved = this.saveUpstreamObject(newUpstreamObj, serverKey, location)
        if (!saved) {
          return hasRouteTableModified
        }
  
        // move points to new upstream object
        upstreamName = newUpstreamObj.upstreamName
        upstreamObj = newUpstreamObj
      }
      // remove non-useful pvdr from reverse upstream cache
      const pvdrKey = `${pvdr.host}${pvdr.port?':'+pvdr.port:''}`
      if (this.upstreams.reverseUpstreamCache[pvdrKey][upstreamName]) {
        delete this.upstreams.reverseUpstreamCache[pvdrKey][upstreamName]
      }
      if (Object.keys(this.upstreams.reverseUpstreamCache[pvdrKey]).length === 0) {
        delete this.upstreams.reverseUpstreamCache[pvdrKey]
      }
      // remove empty upstream object
      if (upstreamObj.items.length === 0) {
        delete this.upstreams.upstreamCache[upstreamName]
        // remove all locations which reference this upstream
        for (let s of Object.keys(this.servers.reverseServerCache[upstreamName])) {
          for (let l of this.servers.reverseServerCache[upstreamName][s].locations) {
            delete this.servers.serverCache[s].locations[l]
          }
        }
        // remove the upstream in cache
        delete this.servers.reverseServerCache[upstreamName]
      }
    } else {
      delete this.servers.serverCache[serverKey].locations[location]
      this.servers.reverseServerCache[upstreamName][serverKey].locations.splice(locationIndexInReverseServerCache,1)
    }
    if (this.servers.reverseServerCache[upstreamName]) {
      // clear empty reverse server cache
      const serverKeyList =  Object.keys(this.servers.reverseServerCache[upstreamName]).map(k=>k.toString())
      for (let s of serverKeyList) {
        const serverCache = this.servers.reverseServerCache[upstreamName][s]
        if (!serverCache.locations || !serverCache.locations.length) {
          delete this.servers.reverseServerCache[upstreamName][s]
          // console.log('empty server', s, 'in reverse server cache for upstream', upstreamName, 'has been removed')
        }
      }
      if (Object.keys(this.servers.reverseServerCache[upstreamName]).length === 0) {
        delete this.servers.reverseServerCache[upstreamName]
        // console.log('empty upstream item', upstreamName, 'in the reverse server cache has been removed')
        for (let item of upstreamObj.items) {
          const itemKey = `${item.server}${item.port?':'+item.port:''}`
          if (this.upstreams.reverseUpstreamCache[itemKey] && this.upstreams.reverseUpstreamCache[itemKey][upstreamName]) {
            delete this.upstreams.reverseUpstreamCache[itemKey][upstreamName]
            // console.log('empty upstream', upstreamName, 'has been removed from its reverse upstream cache for pvdr item:', itemKey)
          }
          if (!Object.keys(this.upstreams.reverseUpstreamCache[itemKey]).length) {
            delete this.upstreams.reverseUpstreamCache[itemKey]
            // console.log('empty pvdr item', itemKey, 'has been removed in the reverse upstream cache')
          }
        }
        delete this.upstreams.upstreamCache[upstreamName]
        // console.log('empty upstream item', upstreamName, 'has been removed')
      }
    }
  
    hasRouteTableModified = true
    return hasRouteTableModified
  }

  async findUpstreamForServiceRuntime (serviceRuntime: Sardines.Runtime.Service, options: AccessPointServiceRuntimeOptions): Promise<{
    serviceRuntime: NginxReverseProxySupportedServiceRuntime,
    upstreamItem: NginxReverseProxyUpstreamCacheItem,
    serviceDriver: string
    serviceRoot?: string
    isReusedExistingUpstreamObject?: boolean
  }> {
      // validate service runtime data
      const sr = await validServiceRuntime(serviceRuntime)
        // generate upstream group
      const newUpstreamItem: NginxReverseProxyUpstreamCacheItem = createUpstreamObject(null, {
        loadBalance: options.loadBalance,
        protocol: sr.protocol
      })
      let isReusedExistingUpstreamObject = false
      
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
      const found = this.findDuplicatedUpstream(newUpstreamItem)
      if (found) {
        newUpstreamItem.upstreamName = found.upstreamName
        isReusedExistingUpstreamObject = true
      }
  
      const result:{
        serviceRuntime: NginxReverseProxySupportedServiceRuntime,
        upstreamItem: NginxReverseProxyUpstreamCacheItem,
        serviceDriver: string
        serviceRoot?: string
        isReusedExistingUpstreamObject?: boolean
      } = {
        serviceRuntime: sr,
        upstreamItem: newUpstreamItem,
        serviceDriver: driver,
        isReusedExistingUpstreamObject
      }
      if (root) result.serviceRoot = root
  
      return result
  }

  async updateRouteTableFile (){
    await this.writeRouteTable()
    await this.readRouteTable()
    // await this.writeRouteTable()
    return this
  }

  async writeRouteTable (options: {appendDefaultProxyOptions?: boolean, newFilePath?: string} = {appendDefaultProxyOptions: true}) {
    if (!this.servers || !this.servers.serverCache || !Object.keys(this.servers.serverCache).length) {
      throw `error when writing nginx server config file: empty routetable`
    }
    if (options && options.newFilePath) {
      this.routeTableFilePath = options.newFilePath
    }
  
    try {
      // write upstreams
      fs.writeFileSync(this.routeTableFilePath, `# sardines access points\n`)
      const appendline = (line: string) => {
        fs.writeFileSync(this.routeTableFilePath, line + '\n', {flag: 'a'})
      }
      appendline(`# updated at ${new Date()}`)
      for (let upstreamKey of Object.keys(this.upstreams.upstreamCache)) {
        const upstreamObj = this.upstreams.upstreamCache[upstreamKey]
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
      for (let serverKey of Object.keys(this.servers.serverCache)) {
        const serverObj = this.servers.serverCache[serverKey]
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
      throw `unexpected error when writing nginx server config file at [${this.routeTableFilePath}]: ${e}`
    }
  }

  async readRouteTable (): Promise<NginxReverseProxyRouteTable> {
    if (!this.routeTableFilePath || !fs.existsSync(this.routeTableFilePath)) {
      this.upstreams = {upstreamCache: {}, reverseUpstreamCache: {}}
      this.servers ={serverCache: {}, reverseServerCache: {}}
      return this
    }
    
    try {
      const content = fs.readFileSync(this.routeTableFilePath, {encoding: 'utf8'})
      .toString().replace(/#[^\n]*/gm, '')
  
      // search upstream apps
      this.upstreams = parseUpstreams(content)
  
      // search servers
      this.servers = parseServers(content, this.upstreams.upstreamCache)
      return this
    } catch(e) {
      throw `unexpected error when reading nginx server config file at [${this.routeTableFilePath}]: ${e}`
    }
  }
}