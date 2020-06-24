import * as proc from 'process'
import * as path from 'path'
import { utils } from 'sardines-core'


import { NginxReverseProxy, NginxConfig } from './nginx_reverse_proxy'


let proxy: NginxReverseProxy|null = null

export const setup = async (
  nginxConfig: NginxConfig,
  nginxConfigFilePath:string = '/etc/nginx/nginx.conf', 
  nginxConfigDir: string = '/etc/nginx/conf.d/',
  sslCrtLines: string[],
  sslKeyLines: string[],
) => {
  proxy = new NginxReverseProxy(nginxConfig, nginxConfigFilePath, nginxConfigDir, sslCrtLines, sslKeyLines)
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

export const execCmd = async(cmd:string) => {
  if (!proxy) return null
  else return await proxy.exec(cmd)
}