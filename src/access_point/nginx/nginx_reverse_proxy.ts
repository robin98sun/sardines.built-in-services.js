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

export interface ServiceRuntimeIdentityInReverseProxy {
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
  servers?: string
  error_log?: string
  access_log?: string
  log_format?: string[]
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
    '$remote_addr - $remote_user [$time_local] "$request" ', 
    '$status $body_bytes_sent "$http_referer" ',
    '"$http_user_agent" "$http_x_forwarded_for"'
  ],
  access_log: '/var/log/nginx/access.log',
  sendfile: 'on',
  tcp_nopush: 'off',
  keepalive_timeout: 65,
  gzip: 'on',
  servers: '/etc/nginx/conf.d/*.conf'
}

const generateNginxConfigFile = async (configFilePath: string = '/etc/nginx/nginx.conf', configSettings: NginxConfig = defaultNginxConfig) => {
  const config: NginxConfig = Object.assign({}, defaultNginxConfig, configSettings)
  if (!fs.existsSync(configFilePath)) {
    throw `Can not access nginx config file [${configFilePath}]`
  }
  let content: string = `
    user ${config.user};
    work_processes ${config.worker_processes};
    error_log ${config.error_log} warn;
    pid ${config.pid};
    events {
      work_connections ${config.worker_connections};
    }
    http {
      include ${config.types};
      default_type ${config.default_type};
      log_format main ${config.log_format!.join('\n\t\t')};
      access_log ${config.access_log} main;
      sendfile ${config.sendfile};
      tcp_nopush ${config.tcp_nopush};
      gzip ${config.gzip};
      include ${config.servers}
    }
  `
  fs.writeFileSync(configFilePath, content, {encoding: 'utf8'})
}

export class NginxReverseProxy {
  private nginxConfigFilePath: string
  private nginxConfigDir: string
  private ipaddress: string
  private port: number
  private auth: any
  private nginxConfig: NginxConfig

  constructor(
    ipaddr: string = '0.0.0.0', 
    port: number = 80, 
    auth: any = null, 
    nginxConfigFilePath:string = '/etc/nginx/nginx.conf', 
    nginxConfigDir: string = '/etc/nginx/conf.d/',
    nginxConfigSettings: NginxConfig = defaultNginxConfig
  ) {

    this.nginxConfigFilePath = nginxConfigFilePath
    this.nginxConfigDir = nginxConfigDir
    this.ipaddress = ipaddr
    this.port = port
    this.auth = auth
    this.nginxConfig = Object.assign({}, defaultNginxConfig, nginxConfigSettings)
  }

  public async exec(cmd:string) {
    return await execCmd(cmd)
  }

  public async start() {
    // check the nginx runtime environment
    const nginxRuntime = await execCmd('pwd ; id; ls')
    if (!nginxRuntime) {
      throw('No nginx runtime detected')
    }
    // check the nginx config file
    if (!fs.existsSync(this.nginxConfigFilePath)) {
      throw (`Nginx configuration file [${this.nginxConfigFilePath}] does not exist`)
    }

    if (!fs.existsSync(this.nginxConfigDir)) {
      // throw (`Nginx configuration directory [${this.nginxConfigDir}] does not exist`)
      await execCmd(`mkdir -p ${this.nginxConfigDir}`)
    }
    
    // generate the config file using the initialization parameters
    await execCmd('/usr/sbin/service nginx stop')
    await generateNginxConfigFile(this.nginxConfigFilePath, this.nginxConfig)
    const newConfigFileContent = await fs.readFileSync(this.nginxConfigFilePath, {encoding: 'utf8'})
    
    // restart nginx service
    // const restartResult = await execCmd(`/usr/sbin/service nginx restart`)

    // read the current config file
    return {nginxConfigFile: newConfigFileContent }
    // return {nginxConfigFile: newConfigFileContent, serviceRestartResult: restartResult}
  }

  // private getPathForServiceRuntime(sr: ServiceRuntimeIdentityInReverseProxy) {
  //   return `/${this.root}/${sr.application}/${sr.module}/${sr.name}`.replace(/\/\//g, '/')
  // }

  // public loadServiceRuntimes(arrayOfServiceRuntimes: ServiceRuntimeIdentityInReverseProxy[], auth: any) {


  // }
}