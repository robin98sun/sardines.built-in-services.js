import * as origin from './index.sardine'
import { Core } from 'sardines-core'
import { StorageSettings } from './index.sardine'
import { Database as PostgreSQL } from './postgresql'
import { FileStorage } from './file_storage'
import { ServerSettings as PostgresSettings } from './postgresql'
import { FileStorageSettings } from './file_storage'
export { Database as PostgreSQL } from './postgresql'
export { ServerSettings as PostgresServerSettings } from './postgresql'
export { DatabaseStructure as PostgresDatabaseStructure } from './postgresql'
export { TableStructure as PostgresTableStructure } from './postgresql'
export { RedisCache } from '../storage/redis'
export { RedisServerSettings } from '../storage/redis'
export { RedisDataType } from '../storage/redis'
export { RedisOperationOptions } from '../storage/redis'
export { FileStorageSettings } from './file_storage'
export { FileIdentity } from './file_storage'
export { FileObject } from './file_storage'
export { FileStorageReturnType } from './file_storage'
export { StorageBase as Storage } from './base'
export { StorageType } from './index.sardine'
export { StorageSettings } from './index.sardine'

export const setup =  (storageSettings: StorageSettings, databaseStructure?: any) => {
    if (Core.isRemote('sardines-built-in-services', '/storage', 'setup')) {
        return new Promise((resolve, reject) => {
            Core.invoke({
                identity: {
                    application: 'sardines-built-in-services',
                    module: '/storage',
                    name: 'setup',
                    version: '*'
                },
                entries: []
            }, storageSettings, databaseStructure).then(res => resolve(res)).catch(e => reject(e))
        })
    } else {
        return  origin.setup(storageSettings, databaseStructure)
    }
}
