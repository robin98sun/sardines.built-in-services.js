// Postgres
import { 
    Database as PostgreSQL,
    ServerSettings as PostgresSettings
} from './postgresql'

export {
    Database as PostgreSQL,
    ServerSettings as PostgresServerSettings,
    DatabaseStructure as PostgresDatabaseStructure,
    TableStructure as PostgresTableStructure
} from './postgresql'

// Redis
export { 
  RedisCache, 
  RedisServerSettings,
  RedisDataType,
  RedisOperationOptions
} from '../storage/redis'

// FileStorage
import {
    FileStorageSettings,
    FileStorage
} from './file_storage'

export {
    FileStorageSettings,
    FileIdentity,
    FileObject,
    FileStorageReturnType
} from './file_storage'

// Storage interfaces
export enum StorageType {
    Postgres = 'postgres',
    File = 'file'
}

export interface StorageSettings {
    type: StorageType|string
    settings: PostgresSettings|FileStorageSettings
}

export { StorageBase as Storage } from './base'
export const setup = (storageSettings: StorageSettings, databaseStructure?: any): PostgreSQL|FileStorage => {
    let storageInstance: any = null
    if (storageSettings.type.toLowerCase() === StorageType.Postgres && databaseStructure) {
        storageInstance = new PostgreSQL(<PostgresSettings>storageSettings.settings, databaseStructure)
    } else if (storageSettings.type.toLowerCase() === StorageType.File) {
        storageInstance = new FileStorage(<FileStorageSettings>storageSettings.settings)
    }
    return storageInstance
}