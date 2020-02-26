/*
 * Created on 2020-02-18
 * Author: Robin <robin@naturewake.com>
 */

import * as redis from 'redis'
import { ReplyError } from 'redis'
import { promisify } from 'util'
import { StorageBase } from './base'

// Server settings
export interface RedisServerSettings {
  host?: string
  port?: number
  password?: string
  path?: string
  url?: string
  string_numbers?: boolean
  return_buffers?: boolean
  detect_buffers?: boolean
  enable_offline_queue?: boolean
  retry_unfulfilled_commands?: boolean
  family?: string
  disable_resubscribing?: boolean
  retry_strategy?: any
  db?: number
}

const defaultServerSettings:RedisServerSettings = {
  host: '127.0.0.1',
  port: 6379,
  return_buffers: false,
  detect_buffers: false,
  family: 'IPv4',
  retry_strategy: null,
  db: 0
}

const mergeDefaultServerSettings = (serverSettings: RedisServerSettings):RedisServerSettings => {
  const newSettings = Object.assign({}, defaultServerSettings, serverSettings)
  const redundentKeys = ['host', 'port']
  if (typeof serverSettings.host === 'undefined') {
    for (const key of redundentKeys) {
      delete newSettings[key]
    }
  }
  return newSettings
}

// Operation options
export enum RedisDataType {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  object = 'object'
}

export interface RedisOperationOptions {
  dataType?: RedisDataType
  expire?: number
}

export const defaultRedisOperationOptions = {
  dataType: RedisDataType.string,
  expire: -1
}

const mergeDefaultRedisOperationOptions = (options: RedisOperationOptions): RedisOperationOptions => {
  const newOptions = Object.assign({}, defaultRedisOperationOptions, options)
  return newOptions
}

// the class
export class RedisCache extends StorageBase{

  protected serverSettings: any
  protected client: any
  protected max_reconnect_retry_time: number = 1000 * 60 * 60
  protected max_reconnect_attempts: number = 10
  protected max_reconnect_interval: number = 5000

  constructor(serverSettings: RedisServerSettings) {
    super()
    this.serverSettings = mergeDefaultServerSettings(serverSettings)
  }

  async connect(serverSettings: RedisServerSettings = null): Promise<any> {
    if (serverSettings) {
      this.serverSettings = mergeDefaultServerSettings(serverSettings)
    }

    // Set default retry_strategy
    if (!this.serverSettings.retry_strategy && this.serverSettings.retry_strategy !== false) {
      const that = this
      this.serverSettings.retry_strategy = function(options) {
        if (options.error && options.error.code === "ECONNREFUSED") {
          // End reconnecting on a specific error and flush all commands with
          // a individual error
          return new Error("The server refused the connection");
        }
        if (options.total_retry_time > that.max_reconnect_retry_time) {
          // End reconnecting after a specific timeout and flush all commands
          // with a individual error
          return new Error("Retry time exhausted");
        }
        if (options.attempt > that.max_reconnect_attempts) {
          // End reconnecting with built in error
          return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, that.max_reconnect_interval);
      }
    }

    // connect to redis server
    this.client = redis.createClient(this.serverSettings)
    // When connecting to a Redis server that requires authentication, the AUTH command must be sent as the first command after connecting.
    return new Promise((resolve, reject) => {
      if (this.serverSettings.password) {
        this.client.auth(this.serverSettings.password, (err: any) => {
          if (err) {
            console.error('redis auth error:', err)
            reject(err)
          }
        })
      }

      if (typeof this.serverSettings.db !== 'undefined') {
        try {
          this.client.select(this.serverSettings.db, (err:any) => {
            if (err) {
              console.error('redis select db error:', err)
              reject(err)
            }
          })
        } catch (e) {
          reject(e)
        }
      }

      this.client.on('error', (err) => {
        console.error('redis connection error:', err)
        reject(err)
      })

      this.client.on('ready', () => {
        resolve(this.client.connected)
      })
    })
  }

  async get(key:string, options?: RedisOperationOptions): Promise<any> {
    const theOptions = mergeDefaultRedisOperationOptions(options)
    return new Promise((resolve, reject) => {
      let handler = this.client.get
      if (theOptions.dataType === RedisDataType.object) {
        handler = this.client.hgetall
      }
      const args = [key, (err, res) => {
        if (err) reject(err)
        switch(theOptions.dataType) {
        case RedisDataType.number:
          resolve((res === null) ? Number.NaN : Number(res))
          break
        case RedisDataType.boolean:
          resolve((res === 'true'?true:false))
          break
        default:
          resolve(res)
          break
        }
      }]
      handler.apply(this.client, args)
    })
  }

  async del(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, res) => {
        if (err) reject(err)
        resolve(res)
      })
    })
  }
  
  async set(key:string, obj: any, options?: RedisOperationOptions): Promise<any> {
    const theOptions = mergeDefaultRedisOperationOptions(options)
    return new Promise((resolve, reject) => {
      const args: any[] = [key]
      let handler = this.client.set

      if (theOptions.dataType === RedisDataType.object 
        || (typeof obj === 'object' && Object.keys(obj).length > 0)) {
        for (let k of Object.keys(obj)) {
          args.push(k)
          args.push(obj[k])
        }
        handler = this.client.hmset
      } else {
        args.push(obj)
      }

      if (theOptions.expire > 0) {
        args.push('EX')
        args.push(theOptions.expire)
      }
      
      args.push((err, res) => {
        if (err) reject(err)
        resolve(res)
      })

      handler.apply(this.client, args)
    })
    
  }

}