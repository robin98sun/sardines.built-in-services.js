import * as utils from 'sardines-utils'

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

export { StorageBase as StorageBaseClass } from './base'
let storageInstance: any = null
export const setup = (storageSettings: StorageSettings, databaseStructure?: any): PostgresSQL|any => {
    if (storageInstance) return storageInstance
    if (storageSettings.type.toLocaleLowerCase() === StorageType.Postgres && databaseStructure) {
        storageInstance = new PostgresSQL(<PostgresSettings>storageSettings.settings, databaseStructure)
    } else if (storageSettings.type.toLowerCase() === StorageType.File) {
        storageInstance = new FileStorage(<FileStorageSettings>storageSettings.settings)
    }
    return storageInstance
}

export const get = async (table:string, identities?: any): Promise<any> => {
    if (storageInstance) return await storageInstance.get(table, identities)
    else throw utils.unifyErrMesg('Storage is not setup yet', utils.logo, 'storage')
}

export const set = async (table:string, obj: any, identities?: any): Promise<any> => {
    if (storageInstance) return await storageInstance.set(table, obj, identities)
    else throw utils.unifyErrMesg('Storage is not setup yet', utils.logo, 'storage')
}