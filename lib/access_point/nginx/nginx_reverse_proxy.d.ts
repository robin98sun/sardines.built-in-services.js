export interface ServiceRuntimeIdentityInReverseProxy {
    application: string;
    module: string;
    name: string;
    version: string;
    method?: string;
    tags?: string[];
    address: string;
    port: number;
    priority?: number;
}
export interface NginxConfig {
    user?: string;
    worker_processes?: number;
    worker_connections?: number;
    default_type?: string;
    sendfile?: string;
    keepalive_timeout?: number;
    pid?: string;
    types?: string;
    tcp_nopush?: string;
    gzip?: string;
    servers?: string;
    error_log?: string;
    access_log?: string;
    log_format?: string[];
}
export declare const defaultNginxConfig: NginxConfig;
export declare class NginxReverseProxy {
    private nginxConfigFilePath;
    private nginxConfigDir;
    private ipaddress;
    private port;
    private auth;
    private nginxConfig;
    constructor(ipaddr?: string, port?: number, auth?: any, nginxConfigFilePath?: string, nginxConfigDir?: string, nginxConfigSettings?: NginxConfig);
    exec(cmd: string): Promise<unknown>;
    start(): Promise<boolean>;
}
//# sourceMappingURL=nginx_reverse_proxy.d.ts.map