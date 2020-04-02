import { DatabaseStructure, ServerSettings, Database } from '../storage/postgresql';
export declare const basePostgresDBStruct: DatabaseStructure;
export interface Account {
    id?: string;
    name?: any;
    email?: any;
    mobile?: any;
    can_login?: boolean;
    can_manage_accounts?: boolean;
    password?: string;
}
export interface Token {
    account_id: string;
    token: string;
    expire_on?: number;
}
export declare class TempleteAccount {
    protected db: Database | null;
    protected isInited: boolean;
    protected tokenCache: Map<string, Token>;
    protected dbStruct: DatabaseStructure;
    protected tokenExpireInSeconds: number;
    constructor();
    protected setupDB(serverSettings: ServerSettings, dbStruct?: DatabaseStructure): Promise<Database>;
    protected touch(tableName: string, obj: any): Promise<void>;
    protected queryAccount(account: Account): Promise<any>;
    protected createOrUpdateAccount(account: Account): Promise<any>;
    protected validatePassword(password: string): void;
    signUp(account: Account, password: string): Promise<string>;
    protected createToken(accountId: string, expireInSeconds?: number): Promise<Token>;
    protected validateToken(token: string, update?: boolean): Promise<Token>;
    signIn(account: Account, password: string): Promise<string>;
    signOut(token: string): Promise<void>;
}
//# sourceMappingURL=postgresql_templete_account.d.ts.map