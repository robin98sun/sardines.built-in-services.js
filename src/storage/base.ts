export abstract class StorageBase {
    abstract async get(table:string, identities?: any): Promise<any>;
    abstract async set(table:string, obj: any, identities?: any): Promise<any>;
}