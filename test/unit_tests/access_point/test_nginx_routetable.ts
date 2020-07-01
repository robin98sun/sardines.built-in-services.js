import 'mocha'
import { expect } from 'chai'
import { 
  readRouteTable,
  writeRouteTable,
  NginxReverseProxy,
  NginxConfig,
  NginxServer,
  keyOfNginxServer,
  NginxReverseProxyRouteTable
} from '../../../src/access_point/nginx/nginx_reverse_proxy'
import {utils} from 'sardines-core'

import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'

export const execCmd = async (cmd: string) => {
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

const rmTestConfig = async() => {
  await execCmd(`rm -f ${tmp_routetable_filepath}`)
}

const routetable_filepath = path.resolve('./test/conf/nginx_sardines_server.conf')
const tmp_routetable_filepath = path.resolve('./test/tmp_nginx_sardines_server.conf')
const nginxConfig: NginxConfig = {}
nginxConfig.serversDir = path.resolve('./test/')
nginxConfig.sardinesServersFileName = 'tmp_nginx_sardines_server.conf'

describe('[nginx] routetable', () => {
  it('should read routetable', async () => {
    const routetable = await readRouteTable(routetable_filepath)
    // console.log(utils.inspect(routetable))
    expect(routetable).to.be.an.instanceof(Object)
    expect(routetable).to.has.property('upstreams')
    expect(routetable.upstreams).to.has.property('upstreamCache')
    expect(Object.keys(routetable.upstreams.upstreamCache).length).to.eq(4)
    expect(routetable.upstreams).to.has.property('reverseUpstreamCache')
    expect(routetable.upstreams.upstreamCache).to.has.property('myApp_HTTPS')
    expect(routetable.upstreams.upstreamCache['myApp_HTTPS']).to.has.property('loadBalancing', 'workloadFocusing')
    expect(routetable.upstreams.upstreamCache['myApp_HTTPS']).to.has.property('upstreamName', 'myApp_HTTPS')
    expect(routetable.upstreams.upstreamCache['myApp_HTTPS']).to.has.property('items')
    expect(routetable.upstreams.upstreamCache['myApp_HTTPS'].items).to.be.instanceOf(Array)
    expect(routetable.upstreams.upstreamCache['myApp_HTTPS'].items.length).to.equal(3)
    expect(routetable.upstreams.upstreamCache['myApp1'].items).to.be.instanceOf(Array)
    expect(routetable.upstreams.upstreamCache['myApp1']).to.has.property('loadBalancing', 'random')
    expect(routetable.upstreams.upstreamCache['myApp1'].items.length).to.equal(3)
    expect(routetable.upstreams.upstreamCache['myApp1'].items[0]).to.has.property('weight', 3)
    expect(routetable.upstreams.upstreamCache['myApp1'].items[0]).to.has.property('server', 'srv1.example.com')
    expect(routetable).to.has.property('servers')
    expect(routetable.servers).to.has.property('serverCache')
    expect(Object.keys(routetable.servers.serverCache).length).to.equal(5)
    expect(routetable.servers.serverCache).to.have.property('@0.0.0.0:80:non-ssl@www.right.com')
    expect(routetable.servers.serverCache).to.have.property('@0.0.0.0:80:non-ssl@www.onlyone.com')
    expect(routetable.servers.serverCache).to.have.property('@0.0.0.0:80:non-ssl@www.example.com')
    expect(routetable.servers.serverCache).to.have.property('@172.20.20.200:443:ssl@inner.https.example.com')
    expect(routetable.servers.serverCache).to.have.property('@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com')
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'])
    .to.have.property('options')
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].options)
    .to.have.property('interfaces')
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].options.interfaces)
    .to.be.instanceOf(Array)
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].options.interfaces.length)
    .to.equal(2)
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].options)
    .to.have.property('name', 'https.example.com')
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].options)
    .to.have.property('ssl_certificate', 'https.example.com.crt')
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].options)
    .to.have.property('ssl_certificate_key', 'https.example.com.key')
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'])
    .to.have.property('locations')
    expect(Object.keys(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].locations).length)
    .to.equal(3)
    expect(routetable.servers).to.has.property('reverseServerCache')
    expect(Object.keys(routetable.servers.reverseServerCache).length).to.equal(4)
    expect(routetable.servers.reverseServerCache).to.have.property('myApp1')
    expect(routetable.servers.reverseServerCache).to.have.property('myApp2')
    expect(routetable.servers.reverseServerCache).to.have.property('myApp_HTTPS')
    expect(Object.keys(routetable.servers.reverseServerCache['myApp_HTTPS']).length).to.equal(2)
    expect(routetable.servers.reverseServerCache['myApp_HTTPS']).to.have.property('@172.20.20.200:443:ssl@inner.https.example.com')
    expect(routetable.servers.reverseServerCache['myApp_HTTPS']).to.have.property('@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com')
    expect(Object.keys(routetable.servers.reverseServerCache['myApp_HTTPS']['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com']).length).to.equal(2)
    expect(routetable.servers.reverseServerCache['myApp_HTTPS']['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com']).to.has.property('locations')
    expect(routetable.servers.reverseServerCache['myApp_HTTPS']['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com']).to.has.property('options')
    expect(routetable.servers.reverseServerCache['myApp_HTTPS']['@172.20.20.200:443:ssl@inner.https.example.com']).to.has.property('locations')
    expect(routetable.servers.reverseServerCache['myApp_HTTPS']['@172.20.20.200:443:ssl@inner.https.example.com'].locations.length).to.equal(1)
    expect(routetable.servers.reverseServerCache['myApp_HTTPS']['@172.20.20.200:443:ssl@inner.https.example.com'].locations[0]).to.equal('/myapp3_root')

    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']).to.has.property('upstream')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']).to.has.property('proxyOptions')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['upstream']).to.has.property('upstreamName', 'myApp_HTTPS')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['upstream']).to.has.property('protocol', 'https')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['upstream']).to.has.property('loadBalancing', 'workloadFocusing')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['proxyOptions'].length).to.eq(3)
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['proxyOptions'][0]).to.has.property('name', 'proxy_cache')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['proxyOptions'][0]).to.has.property('value', 'cache_zone')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['proxyOptions'][1]).to.has.property('name', 'proxy_cache_key')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['proxyOptions'][1]).to.has.property('value', '$uri')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['proxyOptions'][2]).to.has.property('name', 'proxy_cache_purge')
    expect(routetable.servers.serverCache['@172.20.20.200:443:ssl@inner.https.example.com'].locations['/myapp3_root']['proxyOptions'][2]).to.has.property('value', '$purge_method')

    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].locations['/']['upstream']).does.not.has.property('root')
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].locations['/myApp2_root']['upstream']).to.has.property('root', '/app')
    expect(routetable.servers.serverCache['@0.0.0.0:80:non-ssl,0.0.0.0:443:ssl@https.example.com'].locations['/myApp2_root/myApp1_root']['upstream']).to.has.property('root', '/')

  })

  it('should write routetable to file', async()=> {
    const routetable = await readRouteTable(routetable_filepath)
    await writeRouteTable(tmp_routetable_filepath, routetable, {appendDefaultProxyOptions: false})
    expect(fs.existsSync(tmp_routetable_filepath)).to.be.true
    const newRouteTable = await readRouteTable(tmp_routetable_filepath) 
    // console.log(utils.inspect(newRouteTable))
    expect(utils.isEqual(routetable, newRouteTable)).to.be.true
    await rmTestConfig()
    // expect(fs.existsSync(tmp_routetable_filepath)).to.be.false
  })

  it('should register access points', async() => {
    const routetable = await readRouteTable(routetable_filepath)
    await writeRouteTable(tmp_routetable_filepath, routetable)

    const proxy = new NginxReverseProxy(nginxConfig)
    try {
      await proxy.registerAccessPoints([], {restart: false, returnRouteTable: false})
    } catch (e) {
      expect(e).to.equal('empty access point list')
    }

    try {
      await proxy.registerAccessPoints(<Array<NginxConfig>>{}, {restart: false, returnRouteTable: false})
    } catch (e) {
      expect(e).to.equal('invalid access point list')
    }
    // duplicated server
    let result = await proxy.registerAccessPoints([{
        interfaces: [ { port: 80, ssl: false } ],
        name: 'www.example.com'
      }], {restart: false, returnRouteTable: false})
    expect(result).to.be.instanceOf(Array)
    expect((<NginxServer[]>result).length).to.equal(0)

    // invalid server 
    result = await proxy.registerAccessPoints([{
      interfaces: [ { port: 80, ssl: true } ],
      name: 'www.example.com'
    }], {restart: false, returnRouteTable: false, writeServerConfigFileWithoutRestart: true})
    expect(result).to.be.instanceOf(Array)
    expect((<NginxServer[]>result).length).to.equal(0)

    // valid server
    let testApList = [{
      interfaces: [ { port: 8080, ssl: true } ],
      name: 'www.example.com'
    }, {
      interfaces: [ { port: 443, ssl: true } ],
      name: 'www.example.org'
    }, {
      interfaces: [ { port: 80, ssl: false } ],
      name: 'www.example.net'
    }]
    result = await proxy.registerAccessPoints(testApList, {restart: false, returnRouteTable: false, writeServerConfigFileWithoutRestart: true})
    expect(result).to.be.instanceOf(Array)
    expect((<NginxServer[]>result).length).to.equal(3)
    expect(utils.isEqual(result, testApList)).to.be.true

    // invalid server
    const tmplist = [...testApList]
    tmplist.push({
      interfaces: [ { port: 80, ssl: false } ],
      name: 'localhost'
    })
    result = await proxy.registerAccessPoints(tmplist, {restart: false, returnRouteTable: false, writeServerConfigFileWithoutRestart: true})
    expect(result).to.be.instanceOf(Array)
    expect((<NginxServer[]>result).length).to.equal(0)    
    await rmTestConfig()
  })

  it('should remove access points', async() => {
    let routetable = await readRouteTable(routetable_filepath)
    await writeRouteTable(tmp_routetable_filepath, routetable)

    const nginxConfig: NginxConfig = {}
    nginxConfig.serversDir = path.resolve('./test/')
    nginxConfig.sardinesServersFileName = 'tmp_nginx_sardines_server.conf'

    const proxy = new NginxReverseProxy(nginxConfig)
    try {
      await proxy.removeAccessPoints([], {restart: false, returnRouteTable: false})
    } catch (e) {
      expect(e).to.equal('empty access point list')
    }

    try {
      await proxy.registerAccessPoints(<Array<NginxConfig>>{}, {restart: false, returnRouteTable: false})
    } catch (e) {
      expect(e).to.equal('invalid access point list')
    }
    // servers do not exist
    let testApList = [{
      interfaces: [ { port: 8080, ssl: true } ],
      name: 'www.example.com'
    }, {
      interfaces: [ { port: 443, ssl: true } ],
      name: 'www.example.org'
    }, {
      interfaces: [ { port: 80, ssl: false } ],
      name: 'www.example.net'
    }]
    let result = await proxy.removeAccessPoints(testApList, {restart: false, returnRouteTable: false, writeServerConfigFileWithoutRestart: true})
    expect(result).to.be.instanceOf(Array)
    expect((<NginxServer[]>result).length).to.equal(0)
    // valid server
    testApList = [{
      interfaces: [ { port: 80, ssl: false } ],
      name: 'www.example.com'
    }]
    result = await proxy.removeAccessPoints(testApList, {restart: false, returnRouteTable: false, writeServerConfigFileWithoutRestart: true})
    expect(result).to.be.instanceOf(Array)
    expect((<NginxServer[]>result).length).to.equal(1)
    expect(utils.isEqual(testApList, result)).to.be.true

    // valid server
    routetable = await readRouteTable(tmp_routetable_filepath)
    expect(routetable.upstreams.upstreamCache).has.property('myApp_onlyone')
    testApList = [{
      interfaces: [ { port: 80, ssl: false } ],
      name: 'www.onlyone.com'
    }]
    const key = keyOfNginxServer(testApList[0])
    result = await proxy.removeAccessPoints(testApList, {restart: false, returnRouteTable: true, writeServerConfigFileWithoutRestart: true})
    expect(result).to.be.instanceOf(Object)
    expect((<NginxReverseProxyRouteTable>result).servers.serverCache[key]).to.be.undefined
    expect((<NginxReverseProxyRouteTable>result).upstreams.upstreamCache['myApp_onlyone']).to.be.undefined
    expect(Object.keys((<NginxReverseProxyRouteTable>result).servers.serverCache).length).to.equal(3)
       
    await rmTestConfig()
  })

})
