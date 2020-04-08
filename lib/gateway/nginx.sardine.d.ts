export declare enum NginxProtocol {
    HTTP = "HTTP",
    HTTPS = "HTTPS"
}
export interface NginxConfig {
    config_file?: string;
    log_dir?: string;
    error_log?: string;
    worker_processes?: number;
    worker_connections?: number;
    protocol?: NginxProtocol;
}
export declare const echo: (msg: string) => string;
export declare const config: (configData?: any) => Promise<any>;
//# sourceMappingURL=nginx.sardine.d.ts.map