"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var redis = require("redis");
var base_1 = require("./base");
var defaultServerSettings = {
    host: '127.0.0.1',
    port: 6379,
    return_buffers: false,
    detect_buffers: false,
    family: 'IPv4',
    retry_strategy: null,
    db: 0
};
var mergeDefaultServerSettings = function (serverSettings) {
    var newSettings = Object.assign({}, defaultServerSettings, serverSettings);
    var redundentKeys = ['host', 'port'];
    if (typeof serverSettings.host === 'undefined') {
        for (var _i = 0, redundentKeys_1 = redundentKeys; _i < redundentKeys_1.length; _i++) {
            var key = redundentKeys_1[_i];
            delete newSettings[key];
        }
    }
    return newSettings;
};
var RedisDataType;
(function (RedisDataType) {
    RedisDataType["string"] = "string";
    RedisDataType["number"] = "number";
    RedisDataType["boolean"] = "boolean";
    RedisDataType["object"] = "object";
})(RedisDataType = exports.RedisDataType || (exports.RedisDataType = {}));
exports.defaultRedisOperationOptions = {
    dataType: RedisDataType.string,
    expire: -1
};
var mergeDefaultRedisOperationOptions = function (options) {
    var newOptions = Object.assign({}, exports.defaultRedisOperationOptions, options);
    return newOptions;
};
var RedisCache = (function (_super) {
    __extends(RedisCache, _super);
    function RedisCache(serverSettings) {
        var _this = _super.call(this) || this;
        _this.max_reconnect_retry_time = 1000 * 60 * 60;
        _this.max_reconnect_attempts = 10;
        _this.max_reconnect_interval = 5000;
        _this.serverSettings = mergeDefaultServerSettings(serverSettings);
        return _this;
    }
    Object.defineProperty(RedisCache.prototype, "connected", {
        get: function () {
            return this.client && this.client.connected;
        },
        enumerable: true,
        configurable: true
    });
    RedisCache.prototype.connect = function (serverSettings) {
        if (serverSettings === void 0) { serverSettings = null; }
        return __awaiter(this, void 0, void 0, function () {
            var that_1;
            var _this = this;
            return __generator(this, function (_a) {
                if (this.connected)
                    return [2];
                if (serverSettings) {
                    this.serverSettings = mergeDefaultServerSettings(serverSettings);
                }
                if (!this.serverSettings.retry_strategy && this.serverSettings.retry_strategy !== false) {
                    that_1 = this;
                    this.serverSettings.retry_strategy = function (options) {
                        if (options.error && options.error.code === "ECONNREFUSED") {
                            return new Error("The server refused the connection");
                        }
                        if (options.total_retry_time > that_1.max_reconnect_retry_time) {
                            return new Error("Retry time exhausted");
                        }
                        if (options.attempt > that_1.max_reconnect_attempts) {
                            return undefined;
                        }
                        return Math.min(options.attempt * 100, that_1.max_reconnect_interval);
                    };
                }
                this.client = redis.createClient(this.serverSettings);
                return [2, new Promise(function (resolve, reject) {
                        if (_this.serverSettings.password) {
                            _this.client.auth(_this.serverSettings.password, function (err) {
                                if (err) {
                                    console.error('redis auth error:', err);
                                    reject(err);
                                }
                            });
                        }
                        if (typeof _this.serverSettings.db !== 'undefined') {
                            try {
                                _this.client.select(_this.serverSettings.db, function (err) {
                                    if (err) {
                                        console.error('redis select db error:', err);
                                        reject(err);
                                    }
                                });
                            }
                            catch (e) {
                                reject(e);
                            }
                        }
                        _this.client.on('error', function (err) {
                            console.error('redis connection error:', err);
                            reject(err);
                        });
                        _this.client.on('ready', function () {
                            resolve(_this.client.connected);
                        });
                    })];
            });
        });
    };
    RedisCache.prototype.get = function (key, options) {
        return __awaiter(this, void 0, void 0, function () {
            var theOptions;
            var _this = this;
            return __generator(this, function (_a) {
                theOptions = mergeDefaultRedisOperationOptions(options);
                return [2, new Promise(function (resolve, reject) {
                        var handler = _this.client.get;
                        if (theOptions.dataType === RedisDataType.object) {
                            handler = _this.client.hgetall;
                        }
                        var args = [key, function (err, res) {
                                if (err)
                                    reject(err);
                                switch (theOptions.dataType) {
                                    case RedisDataType.number:
                                        resolve((res === null) ? Number.NaN : Number(res));
                                        break;
                                    case RedisDataType.boolean:
                                        resolve((res === 'true' ? true : false));
                                        break;
                                    default:
                                        resolve(res);
                                        break;
                                }
                            }];
                        handler.apply(_this.client, args);
                    })];
            });
        });
    };
    RedisCache.prototype.del = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2, new Promise(function (resolve, reject) {
                        _this.client.del(key, function (err, res) {
                            if (err)
                                reject(err);
                            resolve(res);
                        });
                    })];
            });
        });
    };
    RedisCache.prototype.set = function (key, obj, options) {
        return __awaiter(this, void 0, void 0, function () {
            var theOptions;
            var _this = this;
            return __generator(this, function (_a) {
                theOptions = mergeDefaultRedisOperationOptions(options);
                return [2, new Promise(function (resolve, reject) {
                        var args = [key];
                        var handler = _this.client.set;
                        if (theOptions.dataType === RedisDataType.object
                            || (typeof obj === 'object' && Object.keys(obj).length > 0)) {
                            for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
                                var k = _a[_i];
                                args.push(k);
                                args.push(obj[k]);
                            }
                            handler = _this.client.hmset;
                        }
                        else {
                            args.push(obj);
                        }
                        if (typeof theOptions.expire !== 'undefined' && theOptions.expire > 0) {
                            args.push('EX');
                            args.push(theOptions.expire);
                        }
                        args.push(function (err, res) {
                            if (err)
                                reject(err);
                            resolve(res);
                        });
                        handler.apply(_this.client, args);
                    })];
            });
        });
    };
    return RedisCache;
}(base_1.StorageBase));
exports.RedisCache = RedisCache;
