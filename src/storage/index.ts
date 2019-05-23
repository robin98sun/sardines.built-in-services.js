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

export {
    Database as PostgresSQL,
    ServerSettings as PostgresServerSettings,
    DatabaseStructure as PostgresDatabaseStructure,
    TableStructure as PostgresTableStructure
} from './postgresql'

import { StorageBase } from './base'
import * as utils from 'sardines-utils'

export class Storage extends StorageBase {
    private store: any
    constructor(storageSettings: StorageSettings, databaseStructure?: any) {
        super()
        if (storageSettings.type.toLocaleLowerCase() === StorageType.Postgres && databaseStructure) {
            this.store = new PostgresSQL(storageSettings.settings, databaseStructure)
        }
    }

    async get(table:string, identities?: any): Promise<any> {
        if (this.store) return await this.store.get(table, identities)
        else throw utils.unifyErrMesg('Storage has not been initialized', utils.logo, 'storage')
    }

    async set(table:string, obj: any, identities?: any): Promise<any> {
        if (this.store) return await this.store.set(table, obj, identities)
        else throw utils.unifyErrMesg('Storage has not been initialized', utils.logo, 'storage')
    }
}
