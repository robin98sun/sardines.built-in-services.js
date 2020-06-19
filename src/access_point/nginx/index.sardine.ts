import { NginxReverseProxy, NginxConfig } from './nginx_reverse_proxy'
let proxy: NginxReverseProxy|null = null

export const setup = async (
  ipaddr: string = '0.0.0.0', port: number = 80, auth: any, 
  nginxConfigFilePath:string = '/etc/nginx/nginx.conf', 
  nginxConfigDir: string = '/etc/nginx/conf.d/',
  nginxConfig: NginxConfig
) => {
  proxy = new NginxReverseProxy(ipaddr, port, auth, nginxConfigFilePath, nginxConfigDir, nginxConfig)
  return await proxy.start({initalizeConfigFile: true})
}

export const execCmd = async(cmd:string) => {
  if (!proxy) return null
  else return await proxy.exec(cmd)
}