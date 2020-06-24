"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NginxReverseProxy = exports.defaultNginxConfig = void 0;
var child_process_1 = require("child_process");
var fs = require("fs");
var path = require("path");
var execCmd = function (cmd) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2, new Promise(function (res, rej) {
                child_process_1.exec(cmd, function (error, stdout, stderr) {
                    if (error) {
                        var errMsg = "error while executing shell command [" + cmd + "]: " + error.message + "; stdout: " + stdout + ", stderr: " + stderr;
                        rej(errMsg);
                    }
                    if (stderr) {
                        var errMsg = "stderr output of shell command [" + cmd + "]: " + stderr;
                        rej(errMsg);
                    }
                    res(stdout);
                });
            })];
    });
}); };
exports.defaultNginxConfig = {
    user: 'nginx',
    worker_processes: 1,
    error_log: '/var/log/nginx/error.log',
    pid: '/var/run/nginx.pid',
    worker_connections: 1024,
    types: '/etc/nginx/mime.types',
    default_type: 'application/octet-stream',
    log_format: [
        '\'$remote_addr - $remote_user [$time_local] "$request"\'',
        '\'$status $body_bytes_sent "$http_referer"\'',
        '\'"$http_user_agent" "$http_x_forwarded_for"\''
    ],
    access_log: '/var/log/nginx/access.log',
    sendfile: 'on',
    tcp_nopush: 'off',
    keepalive_timeout: 65,
    gzip: 'on',
    servers: '/etc/nginx/conf.d'
};
var getServerConfDir = function (configServer) {
    if (!configServer)
        return '';
    if (configServer.length > 6 && configServer.substr(configServer.length - 6) === '*.conf') {
        return configServer.substr(0, configServer.length - 6);
    }
    else
        return (configServer + "/").replace(/\/\//g, '/');
};
var generateNginxConfigFile = function (configFilePath, configSettings, sslCrt, sslKey) {
    if (configFilePath === void 0) { configFilePath = '/etc/nginx/nginx.conf'; }
    if (configSettings === void 0) { configSettings = exports.defaultNginxConfig; }
    if (sslCrt === void 0) { sslCrt = ''; }
    if (sslKey === void 0) { sslKey = ''; }
    return __awaiter(void 0, void 0, void 0, function () {
        var config, sslCrtFilePath, sslKeyFilePath, content;
        return __generator(this, function (_a) {
            config = Object.assign({}, exports.defaultNginxConfig, configSettings);
            if (!fs.existsSync(configFilePath)) {
                throw "Can not access nginx config file [" + configFilePath + "]";
            }
            sslCrtFilePath = path.resolve(config.servers, './common.crt');
            sslKeyFilePath = path.resolve(config.servers, './common.key');
            if (sslCrt) {
                console.log('writing SSL certification into file', sslCrtFilePath);
                fs.writeFileSync(sslCrtFilePath, sslCrt, { encoding: 'utf8' });
            }
            if (sslKey) {
                console.log('writing SSL certification key into file', sslKeyFilePath);
                fs.writeFileSync(sslKeyFilePath, sslKey, { encoding: 'utf8' });
            }
            content = "\n    user " + config.user + ";\n    worker_processes " + config.worker_processes + ";\n    error_log " + config.error_log + " warn;\n    pid " + config.pid + ";\n    events {\n      worker_connections " + config.worker_connections + ";\n    }\n    http {\n      " + (sslCrt ? 'ssl_certificate ' + sslCrtFilePath + ';' : '') + "\n      " + (sslKey ? 'ssl_certificate_key ' + sslKeyFilePath + ';' : '') + "\n      include " + config.types + ";\n      default_type " + config.default_type + ";\n      log_format main " + config.log_format.join('\n\t\t') + ";\n      access_log " + config.access_log + " main;\n      sendfile " + config.sendfile + ";\n      tcp_nopush " + config.tcp_nopush + ";\n      gzip " + config.gzip + ";\n      include " + config.servers + ";\n    }\n  ";
            fs.writeFileSync(configFilePath, content, { encoding: 'utf8' });
            return [2];
        });
    });
};
var NginxReverseProxy = (function () {
    function NginxReverseProxy(nginxConfigSettings, nginxConfigFilePath, nginxConfigDir, sslCrtLines, sslKeyLines) {
        if (nginxConfigSettings === void 0) { nginxConfigSettings = exports.defaultNginxConfig; }
        if (nginxConfigFilePath === void 0) { nginxConfigFilePath = '/etc/nginx/nginx.conf'; }
        if (nginxConfigDir === void 0) { nginxConfigDir = '/etc/nginx/conf.d/'; }
        this.nginxConfigFilePath = nginxConfigFilePath;
        this.nginxConfigDir = nginxConfigDir;
        this.nginxConfig = Object.assign({}, exports.defaultNginxConfig, nginxConfigSettings);
        this.nginxConfig.servers = getServerConfDir(this.nginxConfig.servers);
        if (sslCrtLines && sslCrtLines.length) {
            this.sslCrt = sslCrtLines.join('\n');
        }
        else {
            this.sslCrt = '';
        }
        if (sslKeyLines && sslKeyLines.length) {
            this.sslKey = sslKeyLines.join('\n');
        }
        else {
            this.sslKey = '';
        }
    }
    NginxReverseProxy.prototype.exec = function (cmd) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, execCmd(cmd)];
                    case 1: return [2, _a.sent()];
                }
            });
        });
    };
    NginxReverseProxy.prototype.start = function (option) {
        if (option === void 0) { option = { initalizeConfigFile: false }; }
        return __awaiter(this, void 0, void 0, function () {
            var restartResult, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!fs.existsSync(this.nginxConfigFilePath)) {
                            throw ("Nginx configuration file [" + this.nginxConfigFilePath + "] does not exist");
                        }
                        if (!!fs.existsSync(this.nginxConfigDir)) return [3, 2];
                        return [4, execCmd("mkdir -p " + this.nginxConfigDir)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4, execCmd('/usr/sbin/service nginx stop')];
                    case 3:
                        _a.sent();
                        if (!option.initalizeConfigFile) return [3, 5];
                        return [4, generateNginxConfigFile(this.nginxConfigFilePath, this.nginxConfig, this.sslCrt, this.sslKey)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        restartResult = '';
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 10]);
                        return [4, execCmd("/usr/sbin/service nginx start")];
                    case 7:
                        restartResult = _a.sent();
                        return [3, 10];
                    case 8:
                        e_1 = _a.sent();
                        return [4, execCmd('/usr/sbin/service nginx status')];
                    case 9:
                        restartResult = _a.sent();
                        if (restartResult === 'nginx is running.\n') {
                            return [2, true];
                        }
                        return [3, 10];
                    case 10: throw "nginx is not started";
                }
            });
        });
    };
    return NginxReverseProxy;
}());
exports.NginxReverseProxy = NginxReverseProxy;
