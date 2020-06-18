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
        const errMsg = `error while executing shell command [${cmd}]: ${error.message}`
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

export class NginxReverseProxy {
  private nginxConfigFilePath: string
  private nginxConfigDir: string
  private ipaddress: string
  private port: number
  private auth: any

  constructor(ipaddr: string = '0.0.0.0', port: number = 80, auth: any, 
              nginxConfigFilePath:string = '/etc/nginx/nginx.conf', 
              nginxConfigDir: string = '/etc/nginx/conf.d/'
  ) {
    this.nginxConfigFilePath = nginxConfigFilePath
    this.nginxConfigDir = nginxConfigDir
    this.ipaddress = ipaddr
    this.port = port
    this.auth = auth
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
      throw (`Nginx configuration directory [${this.nginxConfigDir}] does not exist`)
    }

    // check the privileges of restart nginx and operating config file

    // send signal to repository to require service runtimes

    
    return [this.auth, this.ipaddress, this.port]
  }

  // private getPathForServiceRuntime(sr: ServiceRuntimeIdentityInReverseProxy) {
  //   return `/${this.root}/${sr.application}/${sr.module}/${sr.name}`.replace(/\/\//g, '/')
  // }

  // public loadServiceRuntimes(arrayOfServiceRuntimes: ServiceRuntimeIdentityInReverseProxy[], auth: any) {


  // }
}