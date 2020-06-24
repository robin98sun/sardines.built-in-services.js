import { NginxConfig } from './nginx_reverse_proxy';
export declare const setup: (nginxConfig: NginxConfig, nginxConfigFilePath: string | undefined, nginxConfigDir: string | undefined, sslCrtLines: string[], sslKeyLines: string[]) => Promise<{
    res: boolean | {
        error: any;
    };
    timestamp: number;
}>;
export declare const execCmd: (cmd: string) => Promise<unknown>;
//# sourceMappingURL=index.sardine.d.ts.map