import 'mocha'
import { expect } from 'chai'
import { 
  TableStructure,
  DatabaseStructure,
  ServerSettings,
  Database
} from '../../../src/storage/postgresql'

import { testTableStruct, testDbSettings } from '../../conf/settings'

describe('[postgresql] connect to database', () => {
  it('should connect to database', (done)=> {
    const db = new Database(testDbSettings, testTableStruct)
    expect(db).not.to.be.null
    db.query('SELECT NOW()').then((res) => {
      expect(res).to.have.property('rows')
      const rows = res.rows
      expect(rows.length).to.equal(1)
      const value = rows[0]
      expect(value).to.have.property('now')
      expect(value.now).not.to.be.null
      done()
    })
  })
})

describe('[postgresql] Basic operations on data', () => {
  const db = new Database(testDbSettings, testTableStruct)
  const clearing = async() => {
    for (const table of Object.keys(testTableStruct)) {
      if (await db.tableExists(table)) {
        await db.query(`DROP TABLE ${table}`)
      }
    }
  }

  before(async() => {
    await clearing()
  })

  it('should insert a row and return the inserted data', (done)=> {
    const account = {name: 'robin', password: 'this is a password'}
    db.set('account_test', account).then((res) => {
      expect(res).not.be.null
      for(let key of Object.keys(account)) {
        expect(res).has.property(key)
        expect(res[key]).to.equal(account[key])
      }
      expect(res).has.property('id')
      done()
    }).catch((e) => {
      expect(e).to.be.null
    })
  })

  after(async() => {
    await clearing()
    await db.close()
  })
})