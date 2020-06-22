import { NginxConfig } from './nginx_reverse_proxy';
export declare const setup: (nginxConfig: NginxConfig, nginxConfigFilePath?: string, nginxConfigDir?: string, sslCrt?: string, sslKey?: string) => Promise<boolean>;
export declare const execCmd: (cmd: string) => Promise<unknown>;
export declare const test: () => Promise<string>;
//# sourceMappingURL=index.sardine.d.ts.map