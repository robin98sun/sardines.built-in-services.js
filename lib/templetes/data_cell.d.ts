import { RedisCache, RedisServerSettings } from '../storage/redis';
import { PostgreSQL, PostgresServerSettings, PostgresDatabaseStructure } from '../storage/index';
export interface DataCellSettings {
    database?: PostgresServerSettings;
    cache?: RedisServerSettings;
    tableStructure?: PostgresDatabaseStructure;
}
export declare class DataCell {
    db: PostgreSQL | null;
    cache: RedisCache | null;
    constructor(settings: DataCellSettings);
    private createInstances;
    setup(): Promise<void>;
}
//# sourceMappingURL=data_cell.d.ts.map