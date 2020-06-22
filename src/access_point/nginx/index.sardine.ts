import * as proc from 'process'
import * as path from 'path'


import { NginxReverseProxy, NginxConfig } from './nginx_reverse_proxy'


let proxy: NginxReverseProxy|null = null

export const setup = async (
  nginxConfig: NginxConfig,
  nginxConfigFilePath:string = '/etc/nginx/nginx.conf', 
  nginxConfigDir: string = '/etc/nginx/conf.d/',
  sslCrt: string = '',
  sslKey: string = '',
) => {
  proxy = new NginxReverseProxy(nginxConfig, nginxConfigFilePath, nginxConfigDir, sslCrt, sslKey)
  return await proxy.start({initalizeConfigFile: true})
}

export const execCmd = async(cmd:string) => {
  if (!proxy) return null
  else return await proxy.exec(cmd)
}

export const test = async() => {
  return `current dir: ${proc.cwd()}, key dir: ${path.resolve(proc.cwd(), './keys')}`
}