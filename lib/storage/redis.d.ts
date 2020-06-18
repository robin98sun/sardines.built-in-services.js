import { StorageBase } from './base';
export interface RedisServerSettings {
    host?: string;
    port?: number;
    password?: string;
    path?: string;
    url?: string;
    string_numbers?: boolean;
    return_buffers?: boolean;
    detect_buffers?: boolean;
    enable_offline_queue?: boolean;
    retry_unfulfilled_commands?: boolean;
    family?: string;
    disable_resubscribing?: boolean;
    retry_strategy?: any;
    db?: number;
    [key: string]: any;
}
export declare enum RedisDataType {
    string = "string",
    number = "number",
    boolean = "boolean",
    object = "object"
}
export interface RedisOperationOptions {
    dataType?: RedisDataType;
    expire?: number;
}
export declare const defaultRedisOperationOptions: {
    dataType: RedisDataType;
    expire: number;
};
export declare class RedisCache extends StorageBase {
    protected serverSettings: any;
    protected client: any;
    protected max_reconnect_retry_time: number;
    protected max_reconnect_attempts: number;
    protected max_reconnect_interval: number;
    constructor(serverSettings: RedisServerSettings);
    get connected(): any;
    connect(serverSettings?: RedisServerSettings | null): Promise<any>;
    get(key: string, options?: RedisOperationOptions): Promise<any>;
    del(key: string): Promise<any>;
    set(key: string, obj: any, options?: RedisOperationOptions): Promise<any>;
}
//# sourceMappingURL=redis.d.ts.map