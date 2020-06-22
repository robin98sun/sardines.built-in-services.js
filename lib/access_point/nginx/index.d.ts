import { NginxConfig } from './nginx_reverse_proxy';
export declare const setup: (nginxConfig: NginxConfig, nginxConfigFilePath?: string, nginxConfigDir?: string, sslCrtLines?: string[], sslKeyLines?: string[]) => Promise<any>;
export declare const execCmd: (cmd: string) => Promise<any>;
export declare const test: () => Promise<any>;
//# sourceMappingURL=index.d.ts.map