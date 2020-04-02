import * as origin from './index.sardine';
import { FileStorage } from './file_storage';
export { Database as PostgreSQL } from './postgresql';
export { ServerSettings as PostgresServerSettings } from './postgresql';
export { DatabaseStructure as PostgresDatabaseStructure } from './postgresql';
export { TableStructure as PostgresTableStructure } from './postgresql';
export { RedisCache } from '../storage/redis';
export { RedisServerSettings } from '../storage/redis';
export { RedisDataType } from '../storage/redis';
export { RedisOperationOptions } from '../storage/redis';
export { FileStorageSettings } from './file_storage';
export { FileIdentity } from './file_storage';
export { FileObject } from './file_storage';
export { FileStorageReturnType } from './file_storage';
export { StorageBase as Storage } from './base';
export { StorageType } from './index.sardine';
export { StorageSettings } from './index.sardine';
export declare const setup: (storageSettings: origin.StorageSettings, databaseStructure?: any) => Promise<unknown> | origin.PostgreSQL | FileStorage;
//# sourceMappingURL=index.d.ts.map