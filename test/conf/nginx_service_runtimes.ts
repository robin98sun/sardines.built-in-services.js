import { Sardines } from 'sardines-core'
// import { AccessPointServiceRuntimeOptions } from '../../src/access_point/base'
import { 
  NginxServer,
  NginxReversedProxyServiceRuntimeOptions,
} from '../../src/access_point/nginx/nginx_reversed_proxy'

export interface NginxReverseProxyServiceRuntimeTestCase {
  accessPoint: NginxServer,
  runtimes: Sardines.Runtime.Service[],
  options: NginxReversedProxyServiceRuntimeOptions
}

const generateServiceRuntimes = (data: {identities: Sardines.ServiceIdentity[], entries: Sardines.Runtime.ServiceEntry[]}) => {
  let result: Sardines.Runtime.Service[] = []
  for (let i of data.identities) {
    result.push({
      identity: i,
      entries: data.entries
    })
  }
  return result
}

export const test_case_register_service_runtimes_correct_1 :NginxReverseProxyServiceRuntimeTestCase = {
  accessPoint: {
    interfaces: [{
      port: 80,
      ssl: false
    }],
    name: 'nginx-reverse-proxy-server.domain'
  },
  runtimes: generateServiceRuntimes({
    identities: [{
        application: 'test-application',
        module: 'module1',
        name: 'service1',
        version: '1.0.3'
      }, {
        application: 'test-application',
        module: 'module1',
        name: 'service2',
        version: '1.0.3'
      }, {
        application: 'test-application',
        module: 'module1',
        name: 'service3',
        version: '1.0.3'
      }], 
    entries: [{
      type: Sardines.Runtime.ServiceEntryType.dedicated,
      providerInfo: {
        host: 'inner-server-1',
        port: 8080,
        protocol: 'http',
        root: '/dir/on/inner/server',
        driver: 'inner-service-http-driver',
        weight: 3
      }
    }, {
      type: Sardines.Runtime.ServiceEntryType.dedicated,
      providerInfo: {
        host: 'inner-server-1',
        port: 8081,
        protocol: 'http',
        root: '/dir/on/inner/server',
        driver: 'inner-service-http-driver'
      }
    }, {
      type: Sardines.Runtime.ServiceEntryType.dedicated,
      providerInfo: {
        host: 'inner-server-2',
        port: 8000,
        protocol: 'http',
        root: '/dir/on/inner/server',
        driver: 'inner-service-http-driver',
        weight: 3
      }
    }]
  }),
  options: {
    isDefaultVersion: true,
    loadBalance: Sardines.Runtime.LoadBalancingStrategy.evenWorkload,
    root: '/some/place/on/proxy/server'
  }
}


export const test_case_remove_service_runtimes_correct_1:NginxReverseProxyServiceRuntimeTestCase = {
  accessPoint: {
    interfaces: [{
      port: 80,
      ssl: false
    }],
    name: 'nginx-reverse-proxy-server.domain'
  },
  runtimes: [{
    identity:{
      application: 'test-application',
      module: 'module1',
      name: 'service3',
      version: '1.0.3'
    },
    entries: []
  }, {
    identity: {
      application: 'test-application',
      module: 'module1',
      name: 'service1',
      version: '1.0.3'
    },
    entries: [{
      type: Sardines.Runtime.ServiceEntryType.dedicated,
      providerInfo: {
        host: 'inner-server-1',
        port: 8081,
        protocol: 'http',
        root: '/dir/on/inner/server',
        driver: 'inner-service-http-driver'
      }
    }, {
      type: Sardines.Runtime.ServiceEntryType.dedicated,
      providerInfo: {
        host: 'inner-server-2',
        port: 8000,
        protocol: 'http',
        root: '/dir/on/inner/server',
        driver: 'inner-service-http-driver',
        weight: 3
      }
    }]
  }],
  options: {
    isDefaultVersion: true,
    root: '/some/place/on/proxy/server'
  }
}
