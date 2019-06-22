// Postgres
import { 
    Database as PostgresSQL,
    ServerSettings as PostgresSettings
} from './postgresql_basic'

export {
    Database as PostgresSQL,
    ServerSettings as PostgresServerSettings,
    DatabaseStructure as PostgresDatabaseStructure,
    TableStructure as PostgresTableStructure
} from './postgresql_basic'

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
export const setup = (storageSettings: StorageSettings, databaseStructure?: any): PostgresSQL|FileStorage => {
    let storageInstance: any = null
    if (storageSettings.type.toLowerCase() === StorageType.Postgres && databaseStructure) {
        storageInstance = new PostgresSQL(<PostgresSettings>storageSettings.settings, databaseStructure)
    } else if (storageSettings.type.toLowerCase() === StorageType.File) {
        storageInstance = new FileStorage(<FileStorageSettings>storageSettings.settings)
    }
    return storageInstance
}