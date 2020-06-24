"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var postgresql_1 = require("./postgresql");
var postgresql_2 = require("./postgresql");
exports.PostgreSQL = postgresql_2.Database;
var redis_1 = require("../storage/redis");
exports.RedisCache = redis_1.RedisCache;
exports.RedisDataType = redis_1.RedisDataType;
var file_storage_1 = require("./file_storage");
var file_storage_2 = require("./file_storage");
exports.FileStorageReturnType = file_storage_2.FileStorageReturnType;
var StorageType;
(function (StorageType) {
    StorageType["Postgres"] = "postgres";
    StorageType["File"] = "file";
})(StorageType = exports.StorageType || (exports.StorageType = {}));
var base_1 = require("./base");
exports.Storage = base_1.StorageBase;
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
