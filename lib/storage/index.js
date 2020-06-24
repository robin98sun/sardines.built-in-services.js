"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = exports.StorageType = void 0;
var postgresql_1 = require("./postgresql");
var postgresql_2 = require("./postgresql");
Object.defineProperty(exports, "PostgreSQL", { enumerable: true, get: function () { return postgresql_2.Database; } });
var redis_1 = require("../storage/redis");
Object.defineProperty(exports, "RedisCache", { enumerable: true, get: function () { return redis_1.RedisCache; } });
Object.defineProperty(exports, "RedisDataType", { enumerable: true, get: function () { return redis_1.RedisDataType; } });
var file_storage_1 = require("./file_storage");
var file_storage_2 = require("./file_storage");
Object.defineProperty(exports, "FileStorageReturnType", { enumerable: true, get: function () { return file_storage_2.FileStorageReturnType; } });
var StorageType;
(function (StorageType) {
    StorageType["Postgres"] = "postgres";
    StorageType["File"] = "file";
})(StorageType = exports.StorageType || (exports.StorageType = {}));
var base_1 = require("./base");
Object.defineProperty(exports, "Storage", { enumerable: true, get: function () { return base_1.StorageBase; } });
exports.setup = function (storageSettings, databaseStructure) {
    var storageInstance = null;
    if (storageSettings.type.toLowerCase() === StorageType.Postgres && databaseStructure) {
        storageInstance = new postgresql_1.Database(storageSettings.settings, databaseStructure);
    }
    else if (storageSettings.type.toLowerCase() === StorageType.File) {
        storageInstance = new file_storage_1.FileStorage(storageSettings.settings);
    }
    return storageInstance;
};
