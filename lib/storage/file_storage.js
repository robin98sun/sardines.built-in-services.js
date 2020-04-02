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
var sardines_core_1 = require("sardines-core");
var base_1 = require("./base");
var fs = require("fs");
var path = require("path");
var proc = require("process");
var FileStorageReturnType;
(function (FileStorageReturnType) {
    FileStorageReturnType["path"] = "path";
    FileStorageReturnType["content"] = "content";
    FileStorageReturnType["stream"] = "stream";
})(FileStorageReturnType = exports.FileStorageReturnType || (exports.FileStorageReturnType = {}));
exports.parsePathIntoFileIdentity = function (filepath) {
    var id = null;
    if (!filepath || filepath === '/')
        return null;
    var subdirs = (filepath[0] === '/' ? filepath.substr(1) : filepath).split('/');
    var pre = id;
    for (var _i = 0, subdirs_1 = subdirs; _i < subdirs_1.length; _i++) {
        var item = subdirs_1[_i];
        if (!id) {
            id = { name: item };
            pre = id;
        }
        else {
            pre.subId = { name: item };
            pre = pre.subId;
        }
    }
    return id;
};
exports.parseFileIdentityIntoPath = function (identity) {
    var result = '';
    var pre = identity;
    result += '/' + pre.name;
    while (pre.subId) {
        pre = pre.subId;
        result += '/' + pre.name;
    }
    return result;
};
var mkdir = function (dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    else if (!fs.lstatSync(dir).isDirectory()) {
        throw sardines_core_1.utils.unifyErrMesg("Invalid file storage directory " + dir, 'storage', 'file');
    }
};
var FileStorage = (function (_super) {
    __extends(FileStorage, _super);
    function FileStorage(settings) {
        var _this = _super.call(this) || this;
        _this.root = path.resolve(proc.cwd(), settings.root);
        mkdir(_this.root);
        return _this;
    }
    FileStorage.prototype.get = function (tableName, identity) {
        return __awaiter(this, void 0, void 0, function () {
            var result, baseDir, filepath, returnType;
            return __generator(this, function (_a) {
                result = null;
                baseDir = path.resolve(this.root, tableName ? "./" + tableName : '');
                if (!fs.existsSync(baseDir) || !fs.lstatSync(baseDir).isDirectory()) {
                    throw sardines_core_1.utils.unifyErrMesg("table " + tableName + " does not exist", 'storage', 'file');
                }
                filepath = path.resolve(baseDir, './' + (typeof identity === 'string' ? identity : exports.parseFileIdentityIntoPath(identity)));
                if (!fs.existsSync(filepath) || !fs.lstatSync(filepath).isFile()) {
                    return [2, result];
                }
                returnType = identity.returnType ? identity.returnType : FileStorageReturnType.content;
                switch (returnType) {
                    case FileStorageReturnType.content:
                        result = {
                            content: fs.readFileSync(filepath, { encoding: 'utf8' })
                        };
                        break;
                    case FileStorageReturnType.path:
                        result = { path: filepath };
                        break;
                    case FileStorageReturnType.stream:
                        result = {
                            stream: fs.createReadStream(filepath, { encoding: 'utf8' })
                        };
                        break;
                    default:
                        break;
                }
                return [2, result];
            });
        });
    };
    FileStorage.prototype.set = function (tableName, obj, identity) {
        return __awaiter(this, void 0, void 0, function () {
            var baseDir, filepath;
            return __generator(this, function (_a) {
                baseDir = path.resolve(this.root, tableName ? "./" + tableName : '');
                mkdir(baseDir);
                filepath = path.resolve(baseDir, './' + (typeof identity === 'string' ? identity : exports.parseFileIdentityIntoPath(identity)));
                if (!obj && fs.existsSync(filepath))
                    fs.unlinkSync(filepath);
                else if (obj && obj.content) {
                    fs.writeFileSync(filepath, obj.content, { encoding: 'utf8' });
                }
                else if (obj && obj.path && fs.existsSync(obj.path) && fs.lstatSync(obj.path).isFile()) {
                    fs.createReadStream(obj.path, { encoding: 'utf8' }).pipe(fs.createWriteStream(filepath, { encoding: 'utf8', autoClose: true }));
                }
                else if (obj && obj.stream) {
                    obj.stream.pipe(fs.createWriteStream(filepath, { encoding: 'utf8', autoClose: true }));
                }
                return [2];
            });
        });
    };
    return FileStorage;
}(base_1.StorageBase));
exports.FileStorage = FileStorage;
