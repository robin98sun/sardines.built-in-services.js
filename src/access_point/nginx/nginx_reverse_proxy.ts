/**
 * @author Robin Sun
 * @email robin@naturewake.com
 * @create date 2020-06-15 14:42:59
 * @modify date 2020-06-15 14:42:59
 * @desc config nginx server to be a reverse proxy server
 * @desc nginx doc: https://nginx.org/en/docs/
 */

interface ServiceRuntimeIdentityInReverseProxy {
  application: string, 
  module: string,
  name: string,
  version: string,
  method?: string,
  tags?: string[],
  address: string,
  port: number,
  priority?: number
}

interface NginxConfig {
  
}

class NginxReverseProxy {
  private nginxConfigFilePath: string
  private ipaddress: string
  private port: number
  private root: string
  private auth: any

  constructor(ipaddr: string = '0.0.0.0', port: number = 80, root: string = '/', auth: any, nginxConfig:string = '') {
    this.nginxConfigFilePath = nginxConfig
    this.ipaddress = ipaddr
    this.port = port
    this.root = root
    this.auth = auth
  }

  public start() {
    // check the nginx runtime environment

    // check the nginx config file

    // check the privileges of restart nginx and operating config file

    // send signal to repository to require service runtimes



  }

  private getPathForServiceRuntime(sr: ServiceRuntimeIdentityInReverseProxy) {
    return `/${this.root}/${sr.application}/${sr.module}/${sr.name}`.replace(/\/\//g, '/')
  }

  public loadServiceRuntimes(arrayOfServiceRuntimes: ServiceRuntimeIdentityInReverseProxy[], auth: any) {


  }
}