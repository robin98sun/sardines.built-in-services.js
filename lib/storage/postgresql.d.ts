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
    close(): Promise<void>;
    static mergeDbStructs(baseStruct: DatabaseStructure, extraStruct: DatabaseStructure): DatabaseStructure;
    query(sql: string): Promise<any>;
    tableExists(table: string): Promise<any>;
    private hasTableDefinition;
    private createCompositeType;
    private createTable;
    getColumnType(table: string, colName: string): any;
    private composeValueForSQLStatement;
    private parseValueForSQLStatement;
    private parseIdentities;
    private parseOrderby;
    private getFullTableName;
    get(table: string, identities?: any, orderby?: any, limitLines?: number, offset?: number, distinct?: string[]): Promise<any>;
    set(table: string, obj: any, identities?: any): Promise<any>;
}
//# sourceMappingURL=postgresql.d.ts.map