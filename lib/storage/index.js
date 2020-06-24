"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = void 0;
var origin = require("./index.sardine");
var sardines_core_1 = require("sardines-core");
var postgresql_1 = require("./postgresql");
Object.defineProperty(exports, "PostgreSQL", { enumerable: true, get: function () { return postgresql_1.Database; } });
var redis_1 = require("../storage/redis");
Object.defineProperty(exports, "RedisCache", { enumerable: true, get: function () { return redis_1.RedisCache; } });
var redis_2 = require("../storage/redis");
Object.defineProperty(exports, "RedisDataType", { enumerable: true, get: function () { return redis_2.RedisDataType; } });
var file_storage_1 = require("./file_storage");
Object.defineProperty(exports, "FileStorageReturnType", { enumerable: true, get: function () { return file_storage_1.FileStorageReturnType; } });
var base_1 = require("./base");
Object.defineProperty(exports, "Storage", { enumerable: true, get: function () { return base_1.StorageBase; } });
var index_sardine_1 = require("./index.sardine");
Object.defineProperty(exports, "StorageType", { enumerable: true, get: function () { return index_sardine_1.StorageType; } });
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
