import { Database as PostgreSQL, ServerSettings as PostgresSettings } from './postgresql';
export { Database as PostgreSQL, ServerSettings as PostgresServerSettings, DatabaseStructure as PostgresDatabaseStructure, TableStructure as PostgresTableStructure } from './postgresql';
export { RedisCache, RedisServerSettings, RedisDataType, RedisOperationOptions } from '../storage/redis';
import { FileStorageSettings, FileStorage } from './file_storage';
export { FileStorageSettings, FileIdentity, FileObject, FileStorageReturnType } from './file_storage';
export declare enum StorageType {
    Postgres = "postgres",
    File = "file"
}
export interface StorageSettings {
    type: StorageType | string;
    settings: PostgresSettings | FileStorageSettings;
}
export { StorageBase as Storage } from './base';
export declare const setup: (storageSettings: StorageSettings, databaseStructure?: any) => PostgreSQL | FileStorage;
//# sourceMappingURL=index.d.ts.map