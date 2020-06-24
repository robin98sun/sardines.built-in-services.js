"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sardinesConfig = exports.drivers = void 0;
var sardines_core_1 = require("sardines-core");
var driver_0 = require("sardines-service-driver-http");
var driver_source_0 = require("../../node_modules/sardines-service-driver-http/lib/index.js");
var getClassFromPackage = function (packageName) {
    var pkgcls = null;
    switch (packageName) {
        case 'sardines-service-driver-http':
            pkgcls = sardines_core_1.utils.getDefaultClassFromPackage(driver_0);
            if (!pkgcls) {
                pkgcls = sardines_core_1.utils.getDefaultClassFromPackage(driver_source_0);
            }
            break;
    }
    return pkgcls;
};
exports.drivers = {
    "sardines-service-driver-http": getClassFromPackage('sardines-service-driver-http'),
};
var sardines_core_2 = require("sardines-core");
exports.sardinesConfig = {
    "application": "sardines-built-in-services",
    "platform": "nodejs",
    "exeDir": "./lib",
    "srcRootDir": "./src",
    "sardinesDir": "sardines",
    "remoteServices": {},
    "repositoryEntries": [
        {
            "providerInfo": {
                "protocol": "http",
                "host": "nw-test",
                "port": 8080,
                "root": "/",
                "driver": "sardines-service-driver-http"
            },
            "user": "sardines-shoal",
            "password": "Sardines@2019"
        }
    ],
    "drivers": [
        {
            "name": "sardines-service-driver-http",
            "locationType": "npm",
            "protocols": [
                "http",
                "htpps"
            ]
        }
    ]
};
sardines_core_2.RepositoryClient.setupRepositoryEntriesBySardinesConfig(exports.sardinesConfig);
sardines_core_2.RepositoryClient.setupDrivers(exports.drivers);
