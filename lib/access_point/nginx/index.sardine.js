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
var proc = require("process");
var path = require("path");
var nginx_reverse_proxy_1 = require("./nginx_reverse_proxy");
var proxy = null;
exports.setup = function (nginxConfig, nginxConfigFilePath, nginxConfigDir, sslCrtLines, sslKeyLines) {
    if (nginxConfigFilePath === void 0) { nginxConfigFilePath = '/etc/nginx/nginx.conf'; }
    if (nginxConfigDir === void 0) { nginxConfigDir = '/etc/nginx/conf.d/'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var res, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    proxy = new nginx_reverse_proxy_1.NginxReverseProxy(nginxConfig, nginxConfigFilePath, nginxConfigDir, sslCrtLines, sslKeyLines);
                    res = null;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4, proxy.start({ initalizeConfigFile: true })];
                case 2:
                    res = _a.sent();
                    return [3, 4];
                case 3:
                    e_1 = _a.sent();
                    res = { error: e_1 };
                    return [3, 4];
                case 4: return [2, {
                        res: res,
                        key: proxy.sslKey,
                        crt: proxy.sslCrt,
                        random: 1234,
                        inputKey: sslKeyLines,
                        inputCrt: sslCrtLines,
                        fakeInput: [
                            [
                                "-----BEGIN CERTIFICATE-----",
                                "MIIDnTCCAoWgAwIBAgIULh9ytvFibu+no3ItFiKFdCIHDzUwDQYJKoZIhvcNAQEL",
                                "BQAwXjELMAkGA1UEBhMCQ04xETAPBgNVBAgMCFNoYW5kb25nMQ4wDAYDVQQHDAVK",
                                "aW5hbjEaMBgGA1UECgwRTmF0dXJlV2FrZSBDbyBMdGQxEDAOBgNVBAMMB253LXRl",
                                "c3QwHhcNMjAwNjIyMDMyMzAwWhcNMjEwNjIyMDMyMzAwWjBeMQswCQYDVQQGEwJD",
                                "TjERMA8GA1UECAwIU2hhbmRvbmcxDjAMBgNVBAcMBUppbmFuMRowGAYDVQQKDBFO",
                                "YXR1cmVXYWtlIENvIEx0ZDEQMA4GA1UEAwwHbnctdGVzdDCCASIwDQYJKoZIhvcN",
                                "AQEBBQADggEPADCCAQoCggEBAKJ73QiZUqLQ7jYLds6hUZxx9gYEA033OgmiN1he",
                                "xEdXAVQbF7czknxH7m24ESMpllHw8ZkSOgRtGAbIta3Oq0OQySO2BNKr9vHwEfYL",
                                "xpeRZL45SIAPw2T/yWGzC2lEJY7a+2m4EW3lY8cf0ReYjOvgtFb+6r9b5IBZBgkl",
                                "B8n1MGlaalwMCmXLYrAH2aI+6qJ0t8sPgP36u7STMUFgfZ8Kdetw0p/1Vf8QgFEH",
                                "Bzuf7Ocf9o0JOu5pRW2Q00zg+tza4DN/HMO3F4EICBVI/zqYAFOt8V00pihuN2SM",
                                "fgbBIExYODLPSJv3gA6NZcfkgjqgKyMFkZYMH/lKSTtBEA0CAwEAAaNTMFEwHQYD",
                                "VR0OBBYEFD9HqQC4mZGXIFI/OIkK5p5Q/sguMB8GA1UdIwQYMBaAFD9HqQC4mZGX",
                                "IFI/OIkK5p5Q/sguMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEB",
                                "AFcZs7qCq/LoTAJnOHeF70rtawzgyGOaUWBOT+zlp+UeOdPjDlxA9BCIyKap/rJ2",
                                "rmjNZyrKS3X8Ii3sQOaxVg5aT4/+8AHX3or4wd7QtElYvD4lNlz+0e4cYXsr+BoY",
                                "M2UO5SSjX+JB+o6WaQxPjYEyw2eUpkKUchRReKUoTczRa7+PB2T7xxyySpTQhrJw",
                                "Hk3xdPDMFd68+vJa1uN8Yj6vNoerlaVp/rxbwoODhWxBXs2+Z/SWwXoE6txaFvwW",
                                "s9D6MUT0PoC+rlBcDqkCWFqkuQEJxSCYV2vp30pVSjqnG020gWxiwmEF8cZNVGai",
                                "a6uNB4X9xN+cYJ9kteZkjM8=",
                                "-----END CERTIFICATE-----"
                            ],
                            [
                                "-----BEGIN PRIVATE KEY-----",
                                "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCie90ImVKi0O42",
                                "C3bOoVGccfYGBANN9zoJojdYXsRHVwFUGxe3M5J8R+5tuBEjKZZR8PGZEjoEbRgG",
                                "yLWtzqtDkMkjtgTSq/bx8BH2C8aXkWS+OUiAD8Nk/8lhswtpRCWO2vtpuBFt5WPH",
                                "H9EXmIzr4LRW/uq/W+SAWQYJJQfJ9TBpWmpcDAply2KwB9miPuqidLfLD4D9+ru0",
                                "kzFBYH2fCnXrcNKf9VX/EIBRBwc7n+znH/aNCTruaUVtkNNM4Prc2uAzfxzDtxeB",
                                "CAgVSP86mABTrfFdNKYobjdkjH4GwSBMWDgyz0ib94AOjWXH5II6oCsjBZGWDB/5",
                                "Skk7QRANAgMBAAECggEBAIQgrzwn2e/2cE9YgTNEMWZDsalwp/NFoFdnJxRgc8ID",
                                "eVwYb++VK4COyc9FCAKM9eUKRpyQGsewowIZQsvkrJZT7YxxnnhmSHizHRf0uXhV",
                                "ThP15wPkTaMa8XrWKuhd9yC06A8vFFVGXR32vIQwlB/X6S55OxGDO0w3mFXlW/EY",
                                "elv+1G2McjtSEKqe9EcAvpAz3xy+Supd1R80sZ/x8NbIrtj/rtuuamI++NNFQxD0",
                                "wVpnmvpJbSFaYaVncnmV1xJI2sBie31u7wtyo89x5iycNFpaXMfkh9uB34vW3FoF",
                                "TVpmPO55AsPhLS8emBTwFL9vmiFM6S7zC6/5Pb3fue0CgYEA1H3hmgSAnudeyrId",
                                "xtLT4qfys37acHbuISgfIaY6ePkmC1OIBQjklkb8vkrkTFS/hxr1+xDOFIfigwZo",
                                "SzxZNCDGFNH+QJyNi56C7qGo1/NtU13g8ZjDlrD9VDiXYjQ7EjIQbeutfpDoAFBI",
                                "OXzLFRfDoBDzmoMf3F9bTtwaNL8CgYEAw8C7rG7Y/qxobw/Fcj6EMxFAQOgvIQA2",
                                "ZJlPC4Pc0km93TvOiZo/uSskRb9+NrH61J8RVApvlGPs2KAnKb2DMf6RlAhCphL3",
                                "PZCIdLcpSNkfji48N4qF0qqzqs/jmnOU3iFViVuv3+8TKfLtvvXKc4g54Acxzlvn",
                                "RSD2xpLU8jMCgYBSgdpielMS4FXfMI/9Tol1Xa8QYTYiKxvFhhWodCoKJPvPtAyB",
                                "n/VaIJAst1m0BcgkhqRyaxEJycV7CLbgV7tvUTZ4iR1HK0KOruq6C81KpLuTfkVE",
                                "qgNv9KM424x0VkGFjCjy9Wr1VQCwdnvEzp7wPrz33v0nxrhNUj1a/n2ycwKBgDB+",
                                "0v/JBmExfT3mflfrPP0ZzP1HiEV4tAEAKiEELfS66Bqi8mwMlrTdB0NwSWhrd2St",
                                "c7GKVFJC3y5bntgsZxA/rPkrgrd6A15xLB0eM1Ak2jhzI9/upXCncZNjpVNiRwMw",
                                "5uv8lvm3VNwTnuqsIde1bAEgRyqEgisSG5DeV3sZAoGBAKMjGmhu05mcRMOCbFMD",
                                "XBuMMtRK/qMem3OQp7XyZwbGRTWu8naTcRbpjTRFasYoj9QqCbzZ//1eCY0rNIYK",
                                "uoVPbLoNzyYLKXgO2mjVbW15f2hfqj6rKAY9a2GL9QkYA+R1xEgS4r+IErd1iMo+",
                                "PzKWdWi9OuYkbLdaQgqjlqQV",
                                "-----END PRIVATE KEY-----"
                            ]
                        ]
                    }];
            }
        });
    });
};
exports.execCmd = function (cmd) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!!proxy) return [3, 1];
                return [2, null];
            case 1: return [4, proxy.exec(cmd)];
            case 2: return [2, _a.sent()];
        }
    });
}); };
exports.test = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (!proxy)
            return [2, null];
        return [2, "current dir: " + proc.cwd() + ", key dir: " + path.resolve(proc.cwd(), './keys') + ", key: " + proxy.sslKey + ", crt: " + proxy.sslCrt];
    });
}); };
