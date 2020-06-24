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
import * as path from 'path'
// import { Http } from 'sardines-core'

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

export interface ServiceRuntimeIdentityInHttpReverseProxy {
  application: string, 
  module: string,
  name: string,
  version: string,
  method?: string,
  tags?: string[],
  source: {
    server: string
    port: number
  }
  priority?: number,
  target: {
    server: string
    port: number
  }
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
    '\'$remote_addr - $remote_user [$time_local] "$request"\'', 
    '\'$status $body_bytes_sent "$http_referer"\'',
    '\'"$http_user_agent" "$http_x_forwarded_for"\''
  ],
  access_log: '/var/log/nginx/access.log',
  sendfile: 'on',
  tcp_nopush: 'off',
  keepalive_timeout: 65,
  gzip: 'on',
  servers: '/etc/nginx/conf.d'
}

const getServerConfDir = (configServer: string) => {
  if (!configServer) return ''
  if (configServer.length > 6 && configServer.substr(configServer.length-6) === '*.conf') {
    return configServer.substr(0, configServer.length - 6)
  } else return `${configServer}/`.replace(/\/\//g, '/')
}

const generateNginxConfigFile = async (
  configFilePath: string = '/etc/nginx/nginx.conf', 
  configSettings: NginxConfig = defaultNginxConfig,
  sslCrt: string = '',
  sslKey: string = '') => {
  const config: NginxConfig = Object.assign({}, defaultNginxConfig, configSettings)
  if (!fs.existsSync(configFilePath)) {
    throw `Can not access nginx config file [${configFilePath}]`
  }
  const sslCrtFilePath: string = path.resolve(config.servers!, './common.crt')
  const sslKeyFilePath: string = path.resolve(config.servers!, './common.key')
  if (sslCrt) {
    console.log('writing SSL certification into file',sslCrtFilePath)
    fs.writeFileSync(sslCrtFilePath, sslCrt, {encoding: 'utf8'})
  }
  if (sslKey) {
    console.log('writing SSL certification key into file',sslKeyFilePath)
    fs.writeFileSync(sslKeyFilePath, sslKey, {encoding: 'utf8'})
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
      ${sslCrt ? 'ssl_certificate ' + sslCrtFilePath + ';' : ''}
      ${sslKey ? 'ssl_certificate_key ' + sslKeyFilePath + ';' : ''}
      include ${config.types};
      default_type ${config.default_type};
      log_format main ${config.log_format!.join('\n\t\t')};
      access_log ${config.access_log} main;
      sendfile ${config.sendfile};
      tcp_nopush ${config.tcp_nopush};
      gzip ${config.gzip};
      include ${config.servers}/*.conf;
    }
  `
  fs.writeFileSync(configFilePath, content, {encoding: 'utf8'})
}

export class NginxReverseProxy {
  private nginxConfigFilePath: string
  private nginxConfigDir: string
  private nginxConfig: NginxConfig
  private sslCrt: string
  private sslKey: string

  constructor(
    nginxConfigSettings: NginxConfig = defaultNginxConfig,
    nginxConfigFilePath:string = '/etc/nginx/nginx.conf', 
    nginxConfigDir: string = '/etc/nginx/conf.d/',
    sslCrtLines: string[],
    sslKeyLines: string[]
  ) {

    this.nginxConfigFilePath = nginxConfigFilePath
    this.nginxConfigDir = nginxConfigDir
    this.nginxConfig = Object.assign({}, defaultNginxConfig, nginxConfigSettings)
    this.nginxConfig.servers = getServerConfDir(this.nginxConfig.servers!)
    if (sslCrtLines && sslCrtLines.length) {
      this.sslCrt = sslCrtLines.join('\n')
    } else {
      this.sslCrt = ''
    }
    if (sslKeyLines && sslKeyLines.length) {
      this.sslKey = sslKeyLines.join('\n')
    } else {
      this.sslKey = ''
    }
  }

  public async exec(cmd:string) {
    return await execCmd(cmd)
  }

  public async start(option: {initalizeConfigFile: boolean} = {initalizeConfigFile: false}) {    
    // check the nginx config file
    if (!fs.existsSync(this.nginxConfigFilePath)) {
      throw (`Nginx configuration file [${this.nginxConfigFilePath}] does not exist`)
    }

    if (!fs.existsSync(this.nginxConfigDir)) {
      // throw (`Nginx configuration directory [${this.nginxConfigDir}] does not exist`)
      await execCmd(`mkdir -p ${this.nginxConfigDir}`)
    }
    
    await execCmd('/usr/sbin/service nginx stop')
    // generate the config file using the initialization parameters
    if (option.initalizeConfigFile) {
      await generateNginxConfigFile(this.nginxConfigFilePath, this.nginxConfig, this.sslCrt, this.sslKey)
    }
    
    // restart nginx service
    let restartResult: any = ''
    try {
      restartResult = await execCmd(`/usr/sbin/service nginx start`)
    } catch(e) {
      restartResult = await execCmd('/usr/sbin/service nginx status')
      if (restartResult === 'nginx is running.\n') {
        return true
      }
    }
    throw `nginx is not started`
  }

  // private getPathForServiceRuntime(sr: ServiceRuntimeIdentityInReverseProxy) {
  //   return `/${this.root}/${sr.application}/${sr.module}/${sr.name}`.replace(/\/\//g, '/')
  // }

  // public loadServiceRuntimes(arrayOfServiceRuntimes: ServiceRuntimeIdentityInReverseProxy[], auth: any) {


  // }
}