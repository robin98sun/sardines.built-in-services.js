import 'mocha'
import { expect } from 'chai'
import { 
  RedisCache, 
  RedisServerSettings, 
  RedisDataType, 
  RedisOperationOptions 
} from '../../../src/storage/redis'

import { testRedisServerSettings } from '../../conf/settings'

describe('[redis] connect to test server', () => {
  it('should return true when connected', async () => {
    const redis = new RedisCache(testRedisServerSettings)
    const connectRes = await redis.connect()
    expect(connectRes).to.equal(true)
  })
})

describe('[redis] basic operations', () => {
  const redis = new RedisCache(testRedisServerSettings)
  before(async () => {
    await redis.connect()
  })

  it('should set and get a string', async() => {
    const key = 'theStr'
    const value = 'theValue'
    const resSet = await redis.set(key, value)
    expect(resSet).to.equal('OK')
    const valueInRedis = await redis.get(key)
    expect(valueInRedis).to.equal(value)
  })

  it('should set and get a number in default behavior model', async() => {
    const key = 'theNum'
    const value = 123456789
    const resSet = await redis.set(key, value)
    expect(resSet).to.equal('OK')
    const valueInRedis = await redis.get(key)
    expect(valueInRedis).to.equal(value.toString())
    expect(Number(valueInRedis)).to.equal(value)
  })

  it('should set and get a number in number type', async() => {
    const key = 'theNum'
    const value = 123456789
    const resSet = await redis.set(key, value)
    expect(resSet).to.equal('OK')
    const valueInRedis = await redis.get(key, {dataType: RedisDataType.number})
    expect(valueInRedis).to.equal(value)
  })

  it('should set and get a boolean true value', async() => {
    const key = 'theBool'
    const value = true
    const resSet = await redis.set(key, value)
    expect(resSet).to.equal('OK')
    const valueInRedis = await redis.get(key, {dataType: RedisDataType.boolean})
    expect(valueInRedis).to.equal(value)
  })

  it('should set and get a boolean false value', async() => {
    const key = 'theBool'
    const value = false
    const resSet = await redis.set(key, value)
    expect(resSet).to.equal('OK')
    const valueInRedis = await redis.get(key, {dataType: RedisDataType.boolean})
    expect(valueInRedis).to.equal(value)
  })

  it('should delete the keys above', async() => {
    const keys = ['theStr', 'theNum', 'theBool']
    for (let key of keys) {
      const res = await redis.del(key)
      expect(res).to.equal(1)
    }
    for (let key of keys) {
      const value = await redis.get(key)
      expect(value).to.be.null
    }
  })

  it('should get a number value NaN from null', async() => {
    const key = 'theNum'
    const valueInRedis = await redis.get(key, {dataType: RedisDataType.number})
    expect(valueInRedis).to.be.NaN
  })

  it('should get a boolean false value from null', async() => {
    const key = 'theBool'
    const valueInRedis = await redis.get(key, {dataType: RedisDataType.boolean})
    expect(valueInRedis).to.equal(false)
  })

  it('should set and get and delete an object', async() => {
    const key = 'theObj'
    await redis.del(key)
    const value = {
      a: 'dont',
      b: 'worry',
      c: 'be',
      d: 'happy'
    }
    const resSet = await redis.set(key, value)
    expect(resSet).to.equal('OK')
    const valueInRedis = await redis.get(key, { dataType: RedisDataType.object })
    expect(typeof valueInRedis).to.equal('object')
    expect(JSON.stringify(valueInRedis)).to.equal(JSON.stringify(value))

    const resDel = await redis.del(key)
    expect(resDel).to.equal(1)
  })

  it('should the key NOT expire', (done) => {
    const key = 'theExpire'
    const value = 'the value'
    const expire = 1
    redis.del(key).then(() => {
      redis.set(key, value, { expire }).then((res) => {
        expect(res).to.equal('OK')
        setTimeout(()=> {
          redis.get(key).then((valueInRedis) => {
            expect(valueInRedis).to.equal(value)
            done()
          })
        }, 800)
      })
    })
  })

  it('should the key DO expire', (done) => {
    const key = 'theExpire'
    const value = 'the value'
    const expire = 1
    redis.del(key).then(() => {
      redis.set(key, value, { expire }).then((res) => {
        expect(res).to.equal('OK')
        setTimeout(()=> {
          redis.get(key).then((valueInRedis) => {
            expect(valueInRedis).to.be.null
            redis.del(key).then(done)
          })
        }, 1200)
      })
    })
  })
})