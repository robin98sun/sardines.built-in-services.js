import { NginxConfig } from './nginx_reverse_proxy';
export declare const setup: (nginxConfig: NginxConfig, nginxConfigFilePath?: string, nginxConfigDir?: string, sslCrtLines?: string[], sslKeyLines?: string[]) => Promise<{
    res: boolean | {
        error: any;
    };
    key: string;
    crt: string;
    inputKey: string[];
    inputCrt: string[];
}>;
export declare const execCmd: (cmd: string) => Promise<unknown>;
export declare const test: () => Promise<string | null>;
//# sourceMappingURL=index.sardine.d.ts.map