import * as origin from './index.sardine'
import { Core } from 'sardines-core'
import { NginxConfig } from './nginx_reverse_proxy'

export const setup = async (nginxConfig: NginxConfig, nginxConfigFilePath:string = '/etc/nginx/nginx.conf', nginxConfigDir: string = '/etc/nginx/conf.d/', sslCrt: string = '', sslKey: string = '') => {
    if (Core.isRemote('sardines-built-in-services', '/access_point/nginx', 'setup')) {
        return await Core.invoke({
            identity: {
                application: 'sardines-built-in-services',
                module: '/access_point/nginx',
                name: 'setup',
                version: '*'
            },
            entries: []
        }, nginxConfig, nginxConfigFilePath, nginxConfigDir, sslCrt, sslKey)
    } else {
        return await origin.setup(nginxConfig, nginxConfigFilePath, nginxConfigDir, sslCrt, sslKey)
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

export const test = async () => {
    if (Core.isRemote('sardines-built-in-services', '/access_point/nginx', 'test')) {
        return await Core.invoke({
            identity: {
                application: 'sardines-built-in-services',
                module: '/access_point/nginx',
                name: 'test',
                version: '*'
            },
            entries: []
        })
    } else {
        return await origin.test()
    }
}
