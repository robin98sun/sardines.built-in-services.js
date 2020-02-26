import 'mocha'
import { expect } from 'chai'
import { 
  DataCell,
  DataCellSettings
} from '../../../src/templetes/data_cell'

import { testDataCellSettings } from '../../conf/settings'

describe('[data cell] connections', () => {
  it('should connect to database and cache', ()=> {
    const dc = new DataCell(testDataCellSettings)
    expect(dc).not.be.null
  })
})
