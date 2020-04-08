/*
 * Operate Nginx server on the machine
 * Author: Robin Sun <robin@naturewake.com>
 * Create on: 2020-03-31
 */

import * as fs from 'fs'
import * as path from 'path'

export enum NginxProtocol {
    HTTP = 'HTTP',
    HTTPS = 'HTTPS'
}

export interface NginxConfig {
    config_file?: string
    log_dir?: string
    error_log?: string
    worker_processes?: number
    worker_connections?: number
    protocol?: NginxProtocol
}

let defaultNginxConfig: NginxConfig = {
    config_file: '/etc/nginx/nginx.conf',
    log_dir: '/logs',
    error_log: '/logs/error.log',
    worker_processes: 1,
    worker_connections: 1024,
    protocol: NginxProtocol.HTTP
}

let nginxConfig: NginxConfig = defaultNginxConfig

export const echo = (msg: string):string => {
     return msg
 }

export const config = async (configData?: any): Promise<any> => {
    const configuration = Object.assign({}, defaultNginxConfig, configData)
    if (configuration) {
        if (configuration.config_file && !fs.existsSync(configuration.config_file)) {
            throw `nginx config file does not exist at [${configuration.config_file}]`
        }
        if (configuration.log_dir && !fs.existsSync(configuration.log_dir)) {
            throw `nginx log directory does not exist at [${configuration.log_dir}]`
        }

        // Finally accept the configuration
        nginxConfig = configuration
    }
    return configuration
}

// export const registerServiceRuntime = async (runtimeList: any[]): Promise<any> => {

// }

// export const removeServiceRuntime = async (runtimeList: any[]): Promise<any> => {

// }


