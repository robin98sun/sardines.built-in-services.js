import * as path from 'path'
import {utils} from 'sardines-core'
import { 
  test_case_register_service_runtimes_correct_1
} from '../../conf/nginx_service_runtimes'

import {
  NginxReverseProxy,
  NginxConfig,
} from '../../../src/access_point/nginx/nginx_reverse_proxy'

// const routetable_filepath = path.resolve('./test/conf/nginx_sardines_server.conf')
// const tmp_routetable_filepath = path.resolve('./test/tmp_nginx_sardines_server.conf')
const nginxConfig: NginxConfig = {}
nginxConfig.serversDir = path.resolve('./test/')
nginxConfig.sardinesServersFileName = 'tmp_nginx_sardines_server.conf'
nginxConfig.root = '/server/root'

describe('[nginx] service runtime', async () => {
  it('should register service runtimes', async() => {
    const proxy = new NginxReverseProxy(nginxConfig)
    let {
      accessPoint,
      runtimes,
      options
    } = test_case_register_service_runtimes_correct_1
    let result = await proxy.registerServiceRuntimes(accessPoint, runtimes, options, {restart: false, returnRouteTable: true, writeServerConfigFileWithoutRestart: true})
    // console.log(utils.inspect(result))
  })
})