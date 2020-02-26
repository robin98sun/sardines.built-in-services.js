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
    const res = dc.cache.set(key, value)
    expect(res).to.equal('OK')
    const valueInRedis = dc.cache.get(key)
    expect(valueInRedis).to.equal(value)
  })

})

