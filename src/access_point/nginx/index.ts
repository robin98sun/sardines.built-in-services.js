import * as proc from 'process'
import * as path from 'path'
import { utils } from 'sardines-core'


import { 
  NginxReverseProxy, 
  NginxConfig
} from './nginx_reversed_proxy'

export {
  NginxReverseProxySupportedProtocol, 
  NginxReverseProxyServiceRuntimeOptions,
  NginxReverseProxyAccessPoint
} from './nginx_reversed_proxy'


let proxy: NginxReverseProxy|null = null

export const setup = async (
  nginxConfig: NginxConfig,
  nginxConfigFilePath:string = '/etc/nginx/nginx.conf'
) => {
  proxy = new NginxReverseProxy(nginxConfig, nginxConfigFilePath)
  let res = null
  try {
    res = await proxy.start({initalizeConfigFile: true})
  }catch(e) {
    res = {error: e}
  }

  return {
    res: res,
    timestamp: Date.now()
  }
}
