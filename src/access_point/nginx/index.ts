import * as origin from './index.sardine'
import { Core } from 'sardines-core'

export const setup = async (ipaddr: string = '0.0.0.0', port: number = 80, auth: any, nginxConfigFilePath:string = '/etc/nginx/nginx.conf', nginxConfigDir: string = '/etc/nginx/conf.d/') => {
    if (Core.isRemote('sardines-built-in-services', '/access_point/nginx', 'setup')) {
        return await Core.invoke({
            identity: {
                application: 'sardines-built-in-services',
                module: '/access_point/nginx',
                name: 'setup',
                version: '*'
            },
            entries: []
        }, ipaddr, port, auth, nginxConfigFilePath, nginxConfigDir)
    } else {
        return await origin.setup(ipaddr, port, auth, nginxConfigFilePath, nginxConfigDir)
    }
}

export const info = async () => {
    if (Core.isRemote('sardines-built-in-services', '/access_point/nginx', 'info')) {
        return await Core.invoke({
            identity: {
                application: 'sardines-built-in-services',
                module: '/access_point/nginx',
                name: 'info',
                version: '*'
            },
            entries: []
        })
    } else {
        return await origin.info()
    }
}
