import { NginxConfig } from './nginx_reverse_proxy';
export declare const setup: (nginxConfig: NginxConfig, nginxConfigFilePath: string | undefined, nginxConfigDir: string | undefined, sslCrtLines: string[], sslKeyLines: string[]) => Promise<any>;
export declare const execCmd: (cmd: string) => Promise<any>;
//# sourceMappingURL=index.d.ts.map