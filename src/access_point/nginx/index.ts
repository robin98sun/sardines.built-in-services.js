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
    key: proxy.sslKey,
    crt: proxy.sslCrt,
    random: 1234,
  }
}

export const execCmd = async(cmd:string) => {
  if (!proxy) return null
  else return await proxy.exec(cmd)
}

export const test = async() => {
  if (!proxy) return null
  return `current dir: ${proc.cwd()}, key dir: ${path.resolve(proc.cwd(), './keys')}, key: ${proxy!.sslKey}, crt: ${proxy!.sslCrt}`
}