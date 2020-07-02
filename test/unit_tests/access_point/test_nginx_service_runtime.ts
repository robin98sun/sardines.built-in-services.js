import * as path from 'path'
import {utils, Sardines} from 'sardines-core'
import 'mocha'
import { expect } from 'chai'

import { 
  test_case_register_service_runtimes_correct_1,
  test_case_remove_service_runtimes_correct_1
} from '../../conf/nginx_service_runtimes'

import {
  NginxReverseProxy,
  NginxConfig,
  NginxReverseProxyRouteTable
} from '../../../src/access_point/nginx/nginx_reverse_proxy'

// const routetable_filepath = path.resolve('./test/conf/nginx_sardines_server.conf')
// const tmp_routetable_filepath = path.resolve('./test/tmp_nginx_sardines_server.conf')
const nginxConfig: NginxConfig = {}
nginxConfig.serversDir = path.resolve('./test/')
nginxConfig.sardinesServersFileName = 'tmp_nginx_sardines_server.conf'
nginxConfig.root = '/server/root'

describe('[nginx] service runtime', async () => {
  let proxy = null
  before('preparing proxy instance', async() => {
    proxy = new NginxReverseProxy(nginxConfig)
  })
  it('should register service runtimes', async() => {
    let {
      accessPoint,
      runtimes,
      options
    } = test_case_register_service_runtimes_correct_1
    let routetable = <NginxReverseProxyRouteTable>await proxy.registerServiceRuntimes(accessPoint, runtimes, options, {restart: false, returnRouteTable: true, writeServerConfigFileWithoutRestart: false})
    // console.log(utils.inspect(routetable))
    expect(routetable).to.be.an.instanceof(Object)
    expect(routetable).to.has.property('upstreams')
    expect(routetable).to.has.property('servers')
    expect(routetable.upstreams).to.has.property('upstreamCache')
    expect(routetable.upstreams).to.has.property('reverseUpstreamCache')
    expect(Object.keys(routetable.upstreams.upstreamCache).length).to.equal(1)
    const upstreamName = Object.keys(routetable.upstreams.upstreamCache)[0]
    const upstreamObj = routetable.upstreams.upstreamCache[upstreamName]
    expect(upstreamObj).to.has.property('upstreamName', upstreamName)
    expect(upstreamObj).to.has.property('loadBalancing', 'evenWorkload')
    expect(upstreamObj).to.has.property('items')
    expect(upstreamObj.items.length).to.equal(3)
    expect(upstreamObj.items[0]).to.has.property('weight', 3)
    expect(upstreamObj.items[1]).to.has.property('weight', 1)
    expect(upstreamObj.items[2]).to.has.property('weight', 3)
    expect(upstreamObj.items[0]).to.has.property('server', 'inner-server-1')
    expect(upstreamObj.items[1]).to.has.property('server', 'inner-server-1')
    expect(upstreamObj.items[2]).to.has.property('server', 'inner-server-2')
    expect(upstreamObj.items[0]).to.has.property('port', 8080)
    expect(upstreamObj.items[1]).to.has.property('port', 8081)
    expect(upstreamObj.items[2]).to.has.property('port', 8000)
    expect(Object.keys(routetable.servers.serverCache).length).to.equal(1)
    expect(routetable.servers.serverCache).to.has.property('@0.0.0.0:80:non-ssl@nginx-reverse-proxy-server.domain')
    const serverObj = routetable.servers.serverCache['@0.0.0.0:80:non-ssl@nginx-reverse-proxy-server.domain']
    expect(Object.keys(serverObj.locations).length).to.eq(6)
    expect(serverObj.locations).to.has.property('/server/root/some/place/on/proxy/server/1.0.3/test-application/module1/service2')
    const locationObj = serverObj.locations['/server/root/some/place/on/proxy/server/1.0.3/test-application/module1/service2']
    expect(locationObj.upstream).to.has.property('upstreamName', upstreamName)
    expect(locationObj.upstream).to.has.property('root', '/dir/on/inner/server/test-application/module1/service2')
    expect(locationObj.upstream).to.has.property('protocol','http')

    let result = <Sardines.Runtime.Service[]> await proxy.registerServiceRuntimes(accessPoint, runtimes, options, {restart: false, returnRouteTable: false, writeServerConfigFileWithoutRestart: true})
    expect(result).to.be.instanceOf(Array)
    expect(result.length).to.eq(3)
    const sr = result[1]
    expect(sr).to.be.instanceOf(Object)
    expect(sr).to.has.property('identity')
    expect(sr).to.has.property('entries')
    expect(Object.keys(sr.identity).length).to.eq(4)
    expect(sr.identity).to.has.property('application','test-application')
    expect(sr.identity).to.has.property('module','module1')
    expect(sr.identity).to.has.property('name','service2')
    expect(sr.identity).to.has.property('version','1.0.3')
    expect(sr.entries).to.be.instanceOf(Array)
    expect(sr.entries.length).to.eq(2)
    expect(sr.entries[0]).to.be.instanceOf(Object)
    expect(sr.entries[1]).to.be.instanceOf(Object)
    expect(sr.entries[0]).to.has.property('type','proxy')
    expect(sr.entries[1]).to.has.property('type','proxy')
    expect(sr.entries[0]).to.has.property('providerInfo')
    expect(sr.entries[1]).to.has.property('providerInfo')
    expect(sr.entries[0].providerInfo).to.has.property('host','nginx-reverse-proxy-server.domain')
    expect(sr.entries[1].providerInfo).to.has.property('host','nginx-reverse-proxy-server.domain')
    expect(sr.entries[0].providerInfo).to.has.property('port',80)
    expect(sr.entries[1].providerInfo).to.has.property('port',80)
    expect(sr.entries[0].providerInfo).to.has.property('protocol','http')
    expect(sr.entries[1].providerInfo).to.has.property('protocol','http')
    expect(sr.entries[0].providerInfo).to.has.property('driver','inner-service-http-driver')
    expect(sr.entries[1].providerInfo).to.has.property('driver','inner-service-http-driver')
    expect(sr.entries[0].providerInfo).to.has.property('root','/server/root/some/place/on/proxy/server/1.0.3/')
    expect(sr.entries[1].providerInfo).to.has.property('root','/server/root/some/place/on/proxy/server/')
  })

  it('should remove service runtimes', async() => {
    let {
      accessPoint,
      runtimes,
      options
    } = test_case_remove_service_runtimes_correct_1
    // let routetable = <NginxReverseProxyRouteTable>await proxy.removeServiceRuntimes(accessPoint, runtimes, options, {restart: false, returnRouteTable: true, writeServerConfigFileWithoutRestart: true}) 
    // console.log(utils.inspect(routetable))
    let result = <NginxReverseProxyRouteTable>await proxy.removeServiceRuntimes(accessPoint, runtimes, options, {restart: false, returnRouteTable: false, writeServerConfigFileWithoutRestart: false}) 
    console.log(utils.inspect(result))
  })
})