import 'mocha'
import { expect } from 'chai'
import { 
  NginxReverseProxy,
  readRouteTable,
  NginxReverseProxyRouteTable
} from '../../../src/access_point/nginx/nginx_reverse_proxy'
import {utils} from 'sardines-core'

import * as fs from 'fs'
import * as path from 'path'

const routetable_filepath = path.resolve('./test/conf/nginx_sardines_server.conf')

describe('[nginx] routetable', () => {
  it('should read routetable', async () => {
    const routetable = await readRouteTable(routetable_filepath)
    console.log(utils.inspect(routetable))
    expect(routetable).to.be.an.instanceof(Object)
  })
})
