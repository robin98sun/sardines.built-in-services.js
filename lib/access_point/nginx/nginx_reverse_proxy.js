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
var child_process_1 = require("child_process");
var fs = require("fs");
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
var NginxReverseProxy = (function () {
    function NginxReverseProxy(ipaddr, port, auth, nginxConfigFilePath, nginxConfigDir) {
        if (ipaddr === void 0) { ipaddr = '0.0.0.0'; }
        if (port === void 0) { port = 80; }
        if (auth === void 0) { auth = null; }
        if (nginxConfigFilePath === void 0) { nginxConfigFilePath = '/etc/nginx/nginx.conf'; }
        if (nginxConfigDir === void 0) { nginxConfigDir = '/etc/nginx/conf.d/'; }
        this.nginxConfigFilePath = nginxConfigFilePath;
        this.nginxConfigDir = nginxConfigDir;
        this.ipaddress = ipaddr;
        this.port = port;
        this.auth = auth;
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
    Object.defineProperty(NginxReverseProxy.prototype, "info", {
        get: function () {
            return this.ipaddress + ":" + this.port + ", auth=" + JSON.stringify(this.auth);
        },
        enumerable: true,
        configurable: true
    });
    NginxReverseProxy.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var nginxRuntime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, execCmd('pwd ; id; ls')];
                    case 1:
                        nginxRuntime = _a.sent();
                        if (!nginxRuntime) {
                            throw ('No nginx runtime detected');
                        }
                        if (!fs.existsSync(this.nginxConfigFilePath)) {
                            throw ("Nginx configuration file [" + this.nginxConfigFilePath + "] does not exist");
                        }
                        if (!fs.existsSync(this.nginxConfigDir)) {
                            throw ("Nginx configuration directory [" + this.nginxConfigDir + "] does not exist");
                        }
                        return [2, [this.auth, this.ipaddress, this.port]];
                }
            });
        });
    };
    return NginxReverseProxy;
}());
exports.NginxReverseProxy = NginxReverseProxy;
