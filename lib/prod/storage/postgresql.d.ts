import { StorageBase } from './base';
export interface TableStructure {
    CONSTRAINTS?: string[];
    UNIQUE?: string[];
    PRIMARY?: string[];
    CHECK?: string;
    REFERENCES?: string;
    [column: string]: any;
}
export interface DatabaseStructure {
    [table: string]: TableStructure;
}
export interface ServerSettings {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
    schema?: string;
}
export declare class Database extends StorageBase {
    private pool;
    private settings;
    private existingTables;
    private structure;
    constructor(settings: ServerSettings, dbStruct: DatabaseStructure);
    query(sql: string): Promise<any>;
    private tableExists;
    private hasTableDefinition;
    private createCompositeType;
    private createTable;
    private getColumnType;
    private parseValueForSQLStatement;
    private parseIdentities;
    private getFullTableName;
    get(table: string, identities?: any): Promise<any>;
    set(table: string, obj: any, identities?: any): Promise<any>;
}
//# sourceMappingURL=postgresql.d.ts.map