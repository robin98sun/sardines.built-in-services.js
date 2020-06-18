export declare abstract class StorageBase {
    abstract get(table: string, identities?: any, orderby?: any, limit?: number, offset?: number): Promise<any>;
    abstract set(table: string, obj: any, identities?: any, options?: any): Promise<any>;
}
//# sourceMappingURL=base.d.ts.map