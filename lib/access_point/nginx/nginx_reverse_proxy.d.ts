export interface ServiceRuntimeIdentityInHttpReverseProxy {
    application: string;
    module: string;
    name: string;
    version: string;
    method?: string;
    tags?: string[];
    source: {
        server: string;
        port: number;
    };
    priority?: number;
    target: {
        server: string;
        port: number;
    };
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
    private nginxConfig;
    sslCrt: string;
    sslKey: string;
    constructor(nginxConfigSettings: NginxConfig | undefined, nginxConfigFilePath: string | undefined, nginxConfigDir: string | undefined, sslCrtLines: string[], sslKeyLines: string[]);
    exec(cmd: string): Promise<unknown>;
    start(option?: {
        initalizeConfigFile: boolean;
    }): Promise<boolean>;
}
//# sourceMappingURL=nginx_reverse_proxy.d.ts.map