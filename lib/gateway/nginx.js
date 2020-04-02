"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var origin = require("./nginx.sardine");
var sardines_core_1 = require("sardines-core");
exports.echo = function (msg) {
    if (sardines_core_1.Core.isRemote('sardines-built-in-services', '/gateway/nginx', 'echo')) {
        return new Promise(function (resolve, reject) {
            sardines_core_1.Core.invoke({
                identity: {
                    application: 'sardines-built-in-services',
                    module: '/gateway/nginx',
                    name: 'echo',
                    version: '*'
                },
                entries: []
            }, msg).then(function (res) { return resolve(res); }).catch(function (e) { return reject(e); });
        });
    }
    else {
        return origin.echo(msg);
    }
};
