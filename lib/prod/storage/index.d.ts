import { ServerSettings as PostgresSettings } from './postgresql';
export declare enum StorageType {
    Postgres = "postgres"
}
export interface StorageSettings {
    type: StorageType | string;
    settings: PostgresSettings | any;
}
export { StorageBase as StorageBaseClass } from './base';
export { Database as PostgresSQL, ServerSettings as PostgresServerSettings, DatabaseStructure as PostgresDatabaseStructure, TableStructure as PostgresTableStructure } from './postgresql';
export declare const setup: (storageSettings: StorageSettings, databaseStructure?: any) => any;
export declare const get: (table: string, identities?: any) => Promise<any>;
export declare const set: (table: string, obj: any, identities?: any) => Promise<any>;
//# sourceMappingURL=index.d.ts.map