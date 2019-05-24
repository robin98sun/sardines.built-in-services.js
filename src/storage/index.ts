import { 
    Database as PostgresSQL,
    ServerSettings as PostgresSettings
} from './postgresql'

export enum StorageType {
    Postgres = 'postgres'
}

export interface StorageSettings {
    type: StorageType|string
    settings: PostgresSettings|any
}

export { StorageBase as StorageBaseClass } from './base'

export {
    Database as PostgresSQL,
    ServerSettings as PostgresServerSettings,
    DatabaseStructure as PostgresDatabaseStructure,
    TableStructure as PostgresTableStructure
} from './postgresql'

import * as utils from 'sardines-utils'

let storageInstance: any = null
export const setup = (storageSettings: StorageSettings, databaseStructure?: any): PostgresSQL|any => {
    if (storageInstance) return storageInstance
    if (storageSettings.type.toLocaleLowerCase() === StorageType.Postgres && databaseStructure) {
        storageInstance = new PostgresSQL(storageSettings.settings, databaseStructure)
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