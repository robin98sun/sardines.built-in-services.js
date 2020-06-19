import * as origin from './index.sardine'
import { Core } from 'sardines-core'
import { NginxConfig } from './nginx_reverse_proxy'

export const setup = async (ipaddr: string = '0.0.0.0', port: number = 80, auth: any, nginxConfigFilePath:string = '/etc/nginx/nginx.conf', nginxConfigDir: string = '/etc/nginx/conf.d/', nginxConfig: NginxConfig) => {
    if (Core.isRemote('sardines-built-in-services', '/access_point/nginx', 'setup')) {
        return await Core.invoke({
            identity: {
                application: 'sardines-built-in-services',
                module: '/access_point/nginx',
                name: 'setup',
                version: '*'
            },
            entries: []
        }, ipaddr, port, auth, nginxConfigFilePath, nginxConfigDir, nginxConfig)
    } else {
        return await origin.setup(ipaddr, port, auth, nginxConfigFilePath, nginxConfigDir, nginxConfig)
    }
}

export const execCmd = async (cmd:string) => {
    if (Core.isRemote('sardines-built-in-services', '/access_point/nginx', 'execCmd')) {
        return await Core.invoke({
            identity: {
                application: 'sardines-built-in-services',
                module: '/access_point/nginx',
                name: 'execCmd',
                version: '*'
            },
            entries: []
        }, cmd)
    } else {
        return await origin.execCmd(cmd)
    }
}
