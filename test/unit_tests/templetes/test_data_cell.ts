import 'mocha'
import { expect } from 'chai'
import { 
  DataCell,
  DataCellSettings
} from '../../../src/templetes/data_cell'

import { testDataCellSettings } from '../../conf/settings'

describe('[data cell] connections', () => {
  const dc = new DataCell(testDataCellSettings)

  it('should connect to postgres database and redis cache', async ()=> {
    await dc.setup()
    expect(dc).not.be.null
  })

  it('should operate cache', async() => {
    const key = 'theKey'
    const value = 'theValue'
    let res = await dc.cache.set(key, value)
    expect(res).to.equal('OK')
    let valueInRedis = await dc.cache.get(key)
    expect(valueInRedis).to.equal(value)
    res = await dc.cache.del(key)
    expect(res).to.equal(1)
    valueInRedis = await dc.cache.get(key)
    expect(valueInRedis).to.be.null
  })

  it('should operate database', async() => {
    expect(await dc.db.tableExists('account_test')).to.be.false
    const account = {name: 'Robin', password: 'this is a password'}
    let res = await dc.db.set('account_test', account)
    expect(res).has.property('id')
    expect(res).has.property('name', account.name)
    expect(res).has.property('password', account.password)
    expect(await dc.db.tableExists('account_test')).to.be.true
    res = await dc.db.query('DROP TABLE account_test')
    expect(res).not.to.be.null
  })

})

