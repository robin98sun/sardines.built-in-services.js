export declare class NginxReverseProxy {
    private nginxConfigFilePath;
    private nginxConfigDir;
    private ipaddress;
    private port;
    private auth;
    constructor(ipaddr: string | undefined, port: number | undefined, auth: any, nginxConfigFilePath?: string, nginxConfigDir?: string);
    get info(): string;
    start(): Promise<any[]>;
}
//# sourceMappingURL=nginx_reverse_proxy.d.ts.map