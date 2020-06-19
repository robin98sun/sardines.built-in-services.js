import { NginxConfig } from './nginx_reverse_proxy';
export declare const setup: (ipaddr: string | undefined, port: number | undefined, auth: any, nginxConfigFilePath: string | undefined, nginxConfigDir: string | undefined, nginxConfig: NginxConfig) => Promise<boolean>;
export declare const execCmd: (cmd: string) => Promise<unknown>;
//# sourceMappingURL=index.sardine.d.ts.map