"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var origin = require("./index.sardine");
var sardines_core_1 = require("sardines-core");
var postgresql_1 = require("./postgresql");
exports.PostgreSQL = postgresql_1.Database;
var redis_1 = require("../storage/redis");
exports.RedisCache = redis_1.RedisCache;
var redis_2 = require("../storage/redis");
exports.RedisDataType = redis_2.RedisDataType;
var file_storage_1 = require("./file_storage");
exports.FileStorageReturnType = file_storage_1.FileStorageReturnType;
var base_1 = require("./base");
exports.Storage = base_1.StorageBase;
var index_sardine_1 = require("./index.sardine");
exports.StorageType = index_sardine_1.StorageType;
exports.setup = function (storageSettings, databaseStructure) {
    if (sardines_core_1.Core.isRemote('sardines-built-in-services', '/storage', 'setup')) {
        return new Promise(function (resolve, reject) {
            sardines_core_1.Core.invoke({
                identity: {
                    application: 'sardines-built-in-services',
                    module: '/storage',
                    name: 'setup',
                    version: '*'
                },
                entries: []
            }, storageSettings, databaseStructure).then(function (res) { return resolve(res); }).catch(function (e) { return reject(e); });
        });
    }
    else {
        return origin.setup(storageSettings, databaseStructure);
    }
};
