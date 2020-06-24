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
exports.TempleteAccount = exports.basePostgresDBStruct = void 0;
var bcrypt = require("bcryptjs");
var postgresql_1 = require("../storage/postgresql");
var cryptPassword = function (password) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2, new Promise(function (resolve, reject) {
                bcrypt.genSalt(10, function (err, salt) {
                    if (err)
                        reject(err);
                    bcrypt.hash(password, salt, function (err, hash) {
                        if (err)
                            reject(err);
                        else
                            resolve(hash);
                    });
                });
            })];
    });
}); };
var comparePassword = function (plainPass, hashword) {
    return new Promise(function (resolve, reject) {
        bcrypt.compare(plainPass, hashword, function (err, isPasswordMatch) {
            if (err)
                reject(err);
            else
                resolve(isPasswordMatch);
        });
    });
};
var tokenAlphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
var genToken = function (length) {
    var token = '';
    for (var i = 0; i < length; i++) {
        token += tokenAlphabet[Math.round(Math.random() * (tokenAlphabet.length - 1))];
    }
    return token;
};
exports.basePostgresDBStruct = {
    account: {
        id: 'UUID PRIMARY KEY DEFAULT uuid_generate_v4()',
        create_on: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
        last_access_on: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
        name: 'VARCHAR(30) UNIQUE NOT NULL',
        password: 'VARCHAR(64) NOT NULL',
        password_expire_on: 'TIMESTAMP(3)',
        email: 'VARCHAR(100) UNIQUE',
        is_email_varified: 'Boolean NOT NULL DEFAULT false',
        mobile: 'VARCHAR(20) UNIQUE',
        is_mobile_varified: 'Boolean NOT NULL DEFAULT false',
        can_login: 'Boolean NOT NULL DEFAULT true',
        can_manage_accounts: 'Boolean NOT NULL DEFAULT false'
    },
    token: {
        account_id: 'UUID',
        token: 'VARCHAR(100) UNIQUE NOT NULL',
        expire_on: 'TIMESTAMP(3)'
    }
};
var TempleteAccount = (function () {
    function TempleteAccount() {
        this.db = null;
        this.isInited = false;
        this.dbStruct = exports.basePostgresDBStruct;
        this.tokenExpireInSeconds = 1800;
        this.tokenCache = new Map();
    }
    TempleteAccount.prototype.setupDB = function (serverSettings, dbStruct) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (dbStruct) {
                    this.dbStruct = postgresql_1.Database.mergeDbStructs(exports.basePostgresDBStruct, dbStruct);
                }
                this.db = new postgresql_1.Database(serverSettings, this.dbStruct);
                return [2, this.db];
            });
        });
    };
    TempleteAccount.prototype.touch = function (tableName, obj) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, obj_1, o, objId, colType, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!tableName || !this.dbStruct[tableName])
                            return [2];
                        if (!Array.isArray(obj)) return [3, 5];
                        _i = 0, obj_1 = obj;
                        _a.label = 1;
                    case 1:
                        if (!(_i < obj_1.length)) return [3, 4];
                        o = obj_1[_i];
                        return [4, this.touch(tableName, o)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3, 1];
                    case 4: return [3, 10];
                    case 5:
                        objId = { id: null };
                        if (typeof obj === 'string') {
                            objId.id = obj;
                        }
                        else if (typeof obj === 'object' && obj && obj.id) {
                            objId.id = obj.id;
                        }
                        if (!objId.id) return [3, 10];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 9, , 10]);
                        colType = this.db.getColumnType(tableName, 'last_access_on');
                        if (!colType) return [3, 8];
                        return [4, this.db.set(tableName, { last_access_on: 'CURRENT_TIMESTAMP' }, objId)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [3, 10];
                    case 9:
                        e_1 = _a.sent();
                        if (e_1)
                            return [2];
                        return [3, 10];
                    case 10: return [2];
                }
            });
        });
    };
    TempleteAccount.prototype.queryAccount = function (account) {
        return __awaiter(this, void 0, void 0, function () {
            var accountForQuery;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        accountForQuery = Object.assign({}, account);
                        if (accountForQuery.password)
                            delete accountForQuery.password;
                        return [4, this.db.get('account', accountForQuery)];
                    case 1: return [2, _a.sent()];
                }
            });
        });
    };
    TempleteAccount.prototype.createOrUpdateAccount = function (account) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!account.password) return [3, 2];
                        _a = account;
                        return [4, cryptPassword(account.password)];
                    case 1:
                        _a.password = _b.sent();
                        return [3, 3];
                    case 2:
                        if (!account.id)
                            throw 'password is required to create account';
                        _b.label = 3;
                    case 3:
                        if (!!account.id) return [3, 5];
                        return [4, this.db.set('account', account)];
                    case 4: return [2, _b.sent()];
                    case 5: return [2, this.db.set('account', account, { id: account.id })];
                }
            });
        });
    };
    TempleteAccount.prototype.validatePassword = function (password) {
        if (!password) {
            throw 'Password can not be empty';
        }
        else if (password.length < 6) {
            throw 'Password shall be longer than 6';
        }
    };
    TempleteAccount.prototype.signUp = function (account, password) {
        return __awaiter(this, void 0, void 0, function () {
            var accountInst, accountObj, tokenObj;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.validatePassword(password);
                        return [4, this.queryAccount(account)];
                    case 1:
                        accountInst = _a.sent();
                        if (!accountInst) return [3, 2];
                        throw 'Account already exists';
                    case 2:
                        accountObj = Object.assign({}, account);
                        accountObj.password = password;
                        return [4, this.createOrUpdateAccount(accountObj)];
                    case 3:
                        accountInst = _a.sent();
                        return [4, this.createToken(accountInst.id)];
                    case 4:
                        tokenObj = _a.sent();
                        return [2, tokenObj.token];
                }
            });
        });
    };
    TempleteAccount.prototype.createToken = function (accountId, expireInSeconds) {
        if (expireInSeconds === void 0) { expireInSeconds = this.tokenExpireInSeconds; }
        return __awaiter(this, void 0, void 0, function () {
            var tokenQuery, tokenInDb, tokenObj;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokenQuery = {
                            account_id: accountId,
                            token: genToken(30)
                        };
                        return [4, this.db.get('token', tokenQuery)];
                    case 1:
                        tokenInDb = _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!tokenInDb) return [3, 4];
                        tokenQuery.token = genToken(32);
                        return [4, this.db.get('token', tokenQuery)];
                    case 3:
                        tokenInDb = _a.sent();
                        return [3, 2];
                    case 4:
                        tokenObj = tokenQuery;
                        if (expireInSeconds > 0) {
                            tokenObj.expire_on = Date.now() + 1000 * expireInSeconds;
                        }
                        else {
                            tokenObj.expire_on = Number.MAX_SAFE_INTEGER;
                        }
                        return [4, this.db.set('token', tokenObj)];
                    case 5:
                        _a.sent();
                        this.tokenCache.set(tokenObj.token, tokenObj);
                        return [2, tokenObj];
                }
            });
        });
    };
    TempleteAccount.prototype.validateToken = function (token, update) {
        if (update === void 0) { update = false; }
        return __awaiter(this, void 0, void 0, function () {
            var tokenObj;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!token)
                            'token is empty';
                        tokenObj = null;
                        if (!this.tokenCache.has(token)) return [3, 1];
                        tokenObj = this.tokenCache.get(token);
                        return [3, 3];
                    case 1: return [4, this.db.get('token', { token: token })];
                    case 2:
                        tokenObj = _a.sent();
                        _a.label = 3;
                    case 3:
                        if (!!tokenObj) return [3, 4];
                        throw 'Invalid token';
                    case 4:
                        if (!(tokenObj.expire_on && tokenObj.expire_on - Date.now() < 0)) return [3, 5];
                        throw 'token expired';
                    case 5:
                        if (!update) return [3, 7];
                        tokenObj.expire_on = Date.now() + 1000 * this.tokenExpireInSeconds;
                        return [4, this.db.set('token', tokenObj, { account_id: tokenObj.account_id, token: tokenObj.token })];
                    case 6:
                        _a.sent();
                        this.tokenCache.set(token, tokenObj);
                        _a.label = 7;
                    case 7: return [2, tokenObj];
                }
            });
        });
    };
    TempleteAccount.prototype.signIn = function (account, password) {
        return __awaiter(this, void 0, void 0, function () {
            var accountInst, tokenObj;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.validatePassword(password);
                        return [4, this.queryAccount(account)];
                    case 1:
                        accountInst = _a.sent();
                        if (!accountInst) return [3, 9];
                        return [4, comparePassword(password, accountInst.password)];
                    case 2:
                        if (!_a.sent()) return [3, 7];
                        return [4, this.db.get('token', { account_id: accountInst.id }, { expire_on: -1 })];
                    case 3:
                        tokenObj = _a.sent();
                        if (!(!tokenObj || tokenObj.expire_on.getTime() <= Date.now() + 30000)) return [3, 5];
                        return [4, this.createToken(accountInst.id)];
                    case 4:
                        tokenObj = _a.sent();
                        _a.label = 5;
                    case 5: return [4, this.touch('account', { id: accountInst.id })];
                    case 6:
                        _a.sent();
                        return [2, tokenObj.token];
                    case 7: throw 'Password is invalid';
                    case 8: return [3, 10];
                    case 9: throw 'Account does not exist';
                    case 10: return [2];
                }
            });
        });
    };
    TempleteAccount.prototype.signOut = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenObj;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.validateToken(token)];
                    case 1:
                        tokenObj = _a.sent();
                        if (this.tokenCache.has(token)) {
                            this.tokenCache.delete(token);
                        }
                        return [4, this.db.set('token', null, { account_id: tokenObj.account_id })];
                    case 2:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    return TempleteAccount;
}());
exports.TempleteAccount = TempleteAccount;
