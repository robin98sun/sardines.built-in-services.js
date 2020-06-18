import { NginxReverseProxy } from './nginx_reverse_proxy'
let proxy: NginxReverseProxy|null = null

export const setup = async (
  ipaddr: string = '0.0.0.0', port: number = 80, auth: any, 
  nginxConfigFilePath:string = '/etc/nginx/nginx.conf', 
  nginxConfigDir: string = '/etc/nginx/conf.d/'
) => {
  proxy = new NginxReverseProxy(ipaddr, port, auth, nginxConfigFilePath, nginxConfigDir)
  return await proxy.start()
}

export const info = async () => {
  return (proxy||{}).info
}

export const execCmd = async(cmd:string) => {
  if (!proxy) return null
  else return await proxy.exec(cmd)
}