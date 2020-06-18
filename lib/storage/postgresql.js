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
var pg_1 = require("pg");
var sardines_core_1 = require("sardines-core");
var base_1 = require("./base");
var DDLKeywords = {
    'CONSTRAINTS': true,
    'UNIQUE': true,
    'CHECK': true,
    'PRIMARY': true,
    'REFERENCES': true
};
var builtInFunctions = {
    'CURRENT_TIMESTAMP': true
};
var getPgTimeSting = function (t) {
    var str = t.getFullYear() + "-" + (t.getMonth() < 9 ? '0' : '') + (t.getMonth() + 1) + "-" + (t.getDate() < 10 ? '0' : '') + t.getDate();
    str += " " + (t.getHours() < 10 ? '0' : '') + t.getHours() + ":" + (t.getMinutes() < 10 ? '0' : '') + t.getMinutes() + ":" + (t.getSeconds() < 10 ? '0' : '') + t.getSeconds();
    str += " " + (t.getTimezoneOffset() >= 0 ? '-' : '+') + (t.getTimezoneOffset() / 60 < 10 ? '0' : '') + Math.abs(Math.round(t.getTimezoneOffset() / 60)) + ":" + (t.getTimezoneOffset() < 10 ? '0' : '') + t.getTimezoneOffset() % 60;
    return str;
};
var Database = (function (_super) {
    __extends(Database, _super);
    function Database(settings, dbStruct) {
        var _this = _super.call(this) || this;
        _this.composeValueForSQLStatement = function (colType, value, tableName, colName) {
            var result = '';
            if (typeof value === 'undefined' || value === null)
                return 'NULL';
            if (typeof colType === 'string') {
                if (colType.indexOf('[]') < 0) {
                    switch (typeof value) {
                        case 'object':
                            if (colType === 'JSONB' || colType === 'JSON') {
                                result = "'" + JSON.stringify(value) + "'";
                                result += "::" + colType;
                            }
                            else if (value instanceof Date) {
                                return _this.composeValueForSQLStatement(colType, value.getTime(), tableName, colName);
                            }
                            else if (colType === 'POINT') {
                            }
                            break;
                        case 'string':
                        case 'number':
                            if (typeof value === 'string' && !value)
                                result = 'NULL';
                            else if (typeof value === 'string' && value in builtInFunctions)
                                result = value;
                            else if (colType.toLowerCase().indexOf('timestamp') === 0) {
                                var v = (typeof value === 'number') ? value.toString() : value;
                                if (v.match(/^\d+$/)) {
                                    if (['timestamp', 'timestamptz'].indexOf(colType.toLowerCase()) >= 0) {
                                        result = "'" + getPgTimeSting(new Date(Number(v))) + "'";
                                    }
                                    else
                                        result = "to_timestamp(" + Number(v) / 1000 + ")";
                                }
                                else
                                    result = "'" + v + "'::" + colType;
                            }
                            else
                                result = "'" + value + "'";
                            break;
                        default:
                            result = "" + value;
                            break;
                    }
                }
                else if (Array.isArray(value)) {
                    if (value.length > 0) {
                        result = 'ARRAY[';
                        var subColType = colType.substr(0, colType.indexOf('[]'));
                        for (var i = 0; i < value.length; i++) {
                            var item = value[i];
                            result += _this.composeValueForSQLStatement(subColType, item, tableName, colName);
                            if (i < value.length - 1)
                                result += ', ';
                        }
                        result += ']';
                    }
                    else {
                        result = 'NULL';
                    }
                }
            }
            else if (typeof colType === 'object') {
                if (Array.isArray(colType) && colType.length === 1 && Array.isArray(value)) {
                    if (value.length > 0) {
                        result = 'ARRAY[';
                        var compositeType = colType[0];
                        for (var i = 0; i < value.length; i++) {
                            var item = value[i];
                            result += _this.composeValueForSQLStatement(compositeType, item, tableName, colName);
                            if (i < value.length - 1)
                                result += ', ';
                        }
                        result += ']';
                    }
                    else {
                        result = 'NULL';
                    }
                }
                else if (!Array.isArray(colType) && !Array.isArray(value) && typeof value === 'object') {
                    result = 'ROW(';
                    var validKeyCnt = 0;
                    for (var key in colType) {
                        var subType = colType[key];
                        var subValue = 'NULL';
                        if (key in value) {
                            if (typeof value[key] === 'undefined')
                                continue;
                            validKeyCnt++;
                            subValue = _this.composeValueForSQLStatement(subType, value[key], tableName, colName + "_" + key);
                        }
                        result += subValue + ', ';
                    }
                    if (!validKeyCnt)
                        result = 'NULL';
                    else {
                        if (result.substr(-2) === ', ')
                            result = result.substr(0, result.length - 2);
                        result += ")::" + (_this.settings.schema ? _this.settings.schema + '.' : '') + tableName + "_" + colName;
                    }
                }
            }
            return result;
        };
        _this.parseValueForSQLStatement = function (table, colName, value) {
            var colType = _this.getColumnType(table, colName);
            return _this.composeValueForSQLStatement(colType, value, table, colName);
        };
        _this.pool = new pg_1.Pool(settings);
        _this.settings = settings;
        _this.existingTables = {};
        _this.structure = dbStruct;
        return _this;
    }
    Database.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.pool.end()];
                    case 1:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    Database.mergeDbStructs = function (baseStruct, extraStruct) {
        var struct = {};
        for (var t in baseStruct) {
            if (!extraStruct[t])
                struct[t] = baseStruct[t];
            else
                struct[t] = {};
        }
        for (var t in extraStruct) {
            if (!baseStruct[t])
                struct[t] = extraStruct[t];
        }
        for (var t in struct) {
            var baseTable = baseStruct[t];
            var extraTable = extraStruct[t];
            if (baseTable && extraTable) {
                for (var col in baseTable) {
                    if (!extraTable[col])
                        struct[t][col] = baseTable[col];
                }
                for (var col in extraTable) {
                    struct[t][col] = extraTable[col];
                }
            }
        }
        return struct;
    };
    Database.prototype.query = function (sql) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                _this.pool.query(sql, function (err, res) {
                    if (err) {
                        err.query = sql;
                        reject(sardines_core_1.utils.unifyErrMesg(err, 'postgres', 'query'));
                    }
                    else {
                        resolve(res);
                    }
                });
            }
            catch (err) {
                err.query = sql;
                reject(sardines_core_1.utils.unifyErrMesg(err, 'postgres', 'database'));
            }
        });
    };
    Database.prototype.tableExists = function (table) {
        return __awaiter(this, void 0, void 0, function () {
            var exists, SQL, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        exists = false;
                        if (!(typeof this.existingTables[table] === 'undefined')) return [3, 2];
                        SQL = "SELECT EXISTS (\n                SELECT 1\n                FROM   information_schema.tables \n                WHERE  table_name = '" + table + "'";
                        if (this.settings.schema) {
                            SQL += " AND table_schema = '" + this.settings.schema + "'";
                        }
                        SQL += ');';
                        return [4, this.query(SQL)];
                    case 1:
                        res = _a.sent();
                        exists = res.rows[0].exists;
                        this.existingTables[table] = exists;
                        return [3, 3];
                    case 2:
                        exists = this.existingTables[table];
                        _a.label = 3;
                    case 3: return [2, exists];
                }
            });
        });
    };
    Database.prototype.hasTableDefinition = function (table) {
        return (typeof this.structure[table] !== 'undefined');
    };
    Database.prototype.createCompositeType = function (typeName, definition) {
        return __awaiter(this, void 0, void 0, function () {
            var SQL, typeFullName, _a, _b, _i, col, type, subType, subTypeName, subTypeName;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        SQL = null;
                        typeFullName = "" + (this.settings.schema ? this.settings.schema + '.' : '') + typeName;
                        _a = [];
                        for (_b in definition)
                            _a.push(_b);
                        _i = 0;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3, 10];
                        col = _a[_i];
                        if (DDLKeywords[col.toUpperCase()])
                            return [3, 9];
                        if (!SQL)
                            SQL = "CREATE TYPE " + typeFullName + " AS (";
                        type = definition[col];
                        if (!(typeof type === 'string')) return [3, 2];
                        SQL += " " + col + " " + type + ", ";
                        return [3, 9];
                    case 2:
                        if (!Array.isArray(type)) return [3, 7];
                        if (type.length > 1)
                            return [3, 9];
                        subType = type[0];
                        if (!(typeof subType === 'string')) return [3, 3];
                        SQL += " " + col + " " + subType + "[], ";
                        return [3, 6];
                    case 3:
                        if (!Array.isArray(subType)) return [3, 4];
                        return [3, 9];
                    case 4:
                        subTypeName = typeName + "_" + col;
                        return [4, this.createCompositeType(subTypeName, subType)];
                    case 5:
                        _c.sent();
                        SQL += " " + col + " " + (this.settings.schema ? this.settings.schema + '.' : '') + subTypeName + "[], ";
                        _c.label = 6;
                    case 6: return [3, 9];
                    case 7:
                        subTypeName = typeName + "_" + col;
                        return [4, this.createCompositeType(subTypeName, type)];
                    case 8:
                        _c.sent();
                        SQL += " " + col + " " + (this.settings.schema ? this.settings.schema + '.' : '') + subTypeName + ", ";
                        _c.label = 9;
                    case 9:
                        _i++;
                        return [3, 1];
                    case 10:
                        if (!SQL) return [3, 13];
                        SQL = SQL.substr(0, SQL.length - 2);
                        SQL += ');';
                        return [4, this.query("DROP TYPE IF EXISTS " + typeFullName + ";")];
                    case 11:
                        _c.sent();
                        return [4, this.query(SQL)];
                    case 12: return [2, _c.sent()];
                    case 13: throw sardines_core_1.utils.unifyErrMesg("Can not create composite type [" + typeName + "]", 'postgres', 'table structure');
                }
            });
        });
    };
    Database.prototype.createTable = function (table) {
        return __awaiter(this, void 0, void 0, function () {
            var tableStruct, SQL, _a, _b, _i, colName, colType, subTypeName, subTypeName, _c, _d, colName, _e, _f, colName, _g, _h, constraint, res;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        if (!this.hasTableDefinition(table)) {
                            return [2, Promise.reject(sardines_core_1.utils.unifyErrMesg("Can not create table [" + table + "] because of lacking table structure", 'postgres', 'table structure'))];
                        }
                        tableStruct = this.structure[table];
                        SQL = "CREATE TABLE ";
                        if (this.settings.schema)
                            SQL += this.settings.schema + ".";
                        SQL += table + " (";
                        _a = [];
                        for (_b in tableStruct)
                            _a.push(_b);
                        _i = 0;
                        _j.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3, 10];
                        colName = _a[_i];
                        if (DDLKeywords[colName.toUpperCase()])
                            return [3, 9];
                        colType = tableStruct[colName];
                        if (!(typeof colType === 'string')) return [3, 2];
                        SQL += colName + " " + colType + ", ";
                        return [3, 9];
                    case 2:
                        if (!(Array.isArray(colType) && colType.length !== 1)) return [3, 3];
                        return [3, 9];
                    case 3:
                        if (!(Array.isArray(colType) && typeof colType[0] === 'string')) return [3, 4];
                        SQL += colName + " " + colType[0] + "[], ";
                        return [3, 9];
                    case 4:
                        if (!(Array.isArray(colType) && Array.isArray(colType[0]))) return [3, 5];
                        return [3, 9];
                    case 5:
                        if (!Array.isArray(colType)) return [3, 7];
                        subTypeName = table + "_" + colName;
                        return [4, this.createCompositeType(subTypeName, colType[0])];
                    case 6:
                        _j.sent();
                        SQL += colName + " " + (this.settings.schema ? this.settings.schema + '.' : '') + subTypeName + "[], ";
                        return [3, 9];
                    case 7:
                        if (!(!Array.isArray(colType) && typeof colType === 'object' && colType)) return [3, 9];
                        subTypeName = table + "_" + colName;
                        return [4, this.createCompositeType(subTypeName, colType)];
                    case 8:
                        _j.sent();
                        SQL += colName + " " + (this.settings.schema ? this.settings.schema + '.' : '') + subTypeName + ", ";
                        _j.label = 9;
                    case 9:
                        _i++;
                        return [3, 1];
                    case 10:
                        if (SQL[SQL.length - 1] !== ' ')
                            throw sardines_core_1.utils.unifyErrMesg("Table structure shall not be empty", 'postgres', 'table structure');
                        if (typeof tableStruct.CHECK !== 'undefined') {
                            SQL += "CHECK " + tableStruct.CHECK + ", ";
                        }
                        if (typeof tableStruct.REFERENCES !== 'undefined') {
                            SQL += "REFERENCES " + tableStruct.REFERENCES + ", ";
                        }
                        if (typeof tableStruct.UNIQUE !== 'undefined') {
                            SQL += 'UNIQUE (';
                            for (_c = 0, _d = tableStruct.UNIQUE; _c < _d.length; _c++) {
                                colName = _d[_c];
                                if (!(colName in tableStruct)) {
                                    throw sardines_core_1.utils.unifyErrMesg("Invalid column [" + colName + "] in UNIQUE constraint", 'postgres', 'table structure');
                                }
                                SQL += colName + ", ";
                            }
                            SQL = SQL.substr(0, SQL.length - 2);
                            SQL += '), ';
                        }
                        if (typeof tableStruct.PRIMARY !== 'undefined') {
                            SQL += 'PRIMARY KEY (';
                            for (_e = 0, _f = tableStruct.PRIMARY; _e < _f.length; _e++) {
                                colName = _f[_e];
                                if (!(colName in tableStruct)) {
                                    throw sardines_core_1.utils.unifyErrMesg("Invalid column [" + colName + "] in UNIQUE constraint", 'postgres', 'table structure');
                                }
                                SQL += colName + ", ";
                            }
                            SQL = SQL.substr(0, SQL.length - 2);
                            SQL += '), ';
                        }
                        if (typeof tableStruct.CONSTRAINTS !== 'undefined') {
                            for (_g = 0, _h = tableStruct.CONSTRAINTS; _g < _h.length; _g++) {
                                constraint = _h[_g];
                                SQL += "CONSTRAINT " + constraint + ", ";
                            }
                        }
                        SQL = SQL.substr(0, SQL.length - 2);
                        SQL += ');';
                        return [4, this.query(SQL)];
                    case 11:
                        res = _j.sent();
                        if (res) {
                            this.existingTables[table] = true;
                        }
                        return [2, res];
                }
            });
        });
    };
    Database.prototype.getColumnType = function (table, colName) {
        var tableStruct = this.structure[table];
        if (!tableStruct) {
            throw sardines_core_1.utils.unifyErrMesg("Do not have table structure for table [" + table + "]", 'postgres', 'database structure');
        }
        var colType = tableStruct[colName];
        if (typeof colType === 'undefined') {
            throw sardines_core_1.utils.unifyErrMesg("Invalid column [" + colName + "], which is not defined in the table structure of table [" + table + "]", 'postgres', 'sql statement');
        }
        else if (typeof colType === 'string' && colType.toUpperCase() === 'CONSTRAINTS') {
            throw sardines_core_1.utils.unifyErrMesg("Invalid column name [" + colName + "] for table [" + table + "], which is a reserved keyword", 'postgres', 'sql statement');
        }
        if (typeof colType === 'string')
            return colType.toUpperCase();
        else
            return colType;
    };
    Database.prototype.parseIdentities = function (table, identities) {
        var SQL = '';
        if (!identities)
            return SQL;
        var cnt = 0;
        for (var key in identities) {
            var value = identities[key];
            var op = null;
            var colType = this.getColumnType(table, key);
            if (cnt === 0)
                SQL += ' WHERE ';
            else
                SQL += ' AND ';
            cnt++;
            if (colType.indexOf('[]') > 0) {
                if (value == null) {
                    SQL += key + " IS NULL";
                }
                else {
                    var valueList = value;
                    if (!Array.isArray(valueList)) {
                        valueList = [value];
                    }
                    for (var i = 0; i < valueList.length; i++) {
                        var v = valueList[i];
                        if (i > 0) {
                            SQL += ' AND ';
                        }
                        if (Number.isNaN(Number(v))) {
                            SQL += "'" + v + "' = ANY (" + key + ")";
                        }
                        else {
                            SQL += v + " = ANY (" + key + ")";
                        }
                    }
                }
            }
            else {
                if (typeof value === 'string' && value.length > 3 && value[2] === ':') {
                    op = value.substr(0, 2).toLowerCase();
                    value = value.substr(3);
                }
                else if (value && Array.isArray(value) && value.length) {
                    op = 'IN';
                    var valueStr = '';
                    for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
                        var v = value_1[_i];
                        var s = this.parseValueForSQLStatement(table, key, v);
                        if (!s)
                            continue;
                        if (valueStr === '')
                            valueStr = s;
                        else
                            valueStr += ", " + s;
                    }
                    value = valueStr;
                }
                else if (colType === 'JSONB') {
                    op = '@>';
                    if (value && typeof value === 'object') {
                        value = JSON.stringify(value);
                    }
                }
                if (op !== 'IN') {
                    value = this.parseValueForSQLStatement(table, key, value);
                }
                if (typeof value === 'undefined' || value === null || value === '') {
                    op = 'IS';
                    value = 'NULL';
                }
                if (!op)
                    SQL += key + " = " + value;
                else if (op === 'ne')
                    SQL += key + " != " + value;
                else if (op === 'ge')
                    SQL += key + " >= " + value;
                else if (op === 'le')
                    SQL += key + " <= " + value;
                else if (op === 'gt')
                    SQL += key + " > " + value;
                else if (op === 'lt')
                    SQL += key + " < " + value;
                else if (op === 'IN')
                    SQL += key + " IN (" + value + ")";
                else if (op === 'IS' || op === '@>')
                    SQL += key + " " + op + " " + value;
                else
                    SQL += key + " = " + value;
            }
        }
        return SQL;
    };
    Database.prototype.parseOrderby = function (table, orderby) {
        var SQL = '';
        if (!orderby)
            return SQL;
        for (var key in orderby) {
            var colType = this.getColumnType(table, key);
            if (!colType)
                continue;
            SQL += (SQL === '' ? ' ORDER BY' : ',') + " " + key + " " + (orderby[key] > 0 ? 'ASC' : 'DESC');
        }
        return SQL;
    };
    Database.prototype.getFullTableName = function (table) {
        return (this.settings.schema) ? this.settings.schema + "." + table : table;
    };
    Database.prototype.get = function (table, identities, orderby, limitLines, offset, distinct) {
        if (orderby === void 0) { orderby = null; }
        if (limitLines === void 0) { limitLines = -1998; }
        if (offset === void 0) { offset = 0; }
        if (distinct === void 0) { distinct = []; }
        return __awaiter(this, void 0, void 0, function () {
            var limit, exists, fullTableName, SQL, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        limit = limitLines;
                        if (limit === -1998 && distinct.length === 0) {
                            limit = 1;
                        }
                        else if (limit === -1998) {
                            limit = 0;
                        }
                        return [4, this.tableExists(table)];
                    case 1:
                        exists = _a.sent();
                        if (!exists)
                            return [2, null];
                        fullTableName = this.getFullTableName(table);
                        SQL = '';
                        if (distinct.length === 0) {
                            SQL = "SELECT * FROM " + fullTableName;
                        }
                        else {
                            SQL = "SELECT DISTINCT " + distinct.join(', ') + " FROM " + fullTableName;
                        }
                        if (identities)
                            SQL += this.parseIdentities(table, identities);
                        if (orderby && typeof orderby === 'object') {
                            SQL += this.parseOrderby(table, orderby);
                        }
                        SQL += " LIMIT " + (limit <= 0 ? 'ALL' : limit) + " OFFSET " + offset + ";";
                        console.log('SQL of query:', SQL);
                        return [4, this.query(SQL)];
                    case 2:
                        res = _a.sent();
                        if (res && res.rows) {
                            if (res.rows.length === 0)
                                return [2, null];
                            if (res.rows.length === 1)
                                return [2, res.rows[0]];
                            else
                                return [2, res.rows];
                        }
                        return [2, res];
                }
            });
        });
    };
    Database.prototype.set = function (table, obj, identities) {
        return __awaiter(this, void 0, void 0, function () {
            var tableStruct, SQL, tableExists, fullTableName, insertItemKey, insertItemValue, _i, obj_1, item, key, value, res, arr;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tableStruct = this.structure[table];
                        if (!tableStruct) {
                            throw sardines_core_1.utils.unifyErrMesg("Do not have table structure for table [" + table + "]", 'postgres', 'database structure');
                        }
                        SQL = '';
                        return [4, this.tableExists(table)];
                    case 1:
                        tableExists = _a.sent();
                        if (!tableExists && identities)
                            return [2, null];
                        fullTableName = this.getFullTableName(table);
                        if (!(!identities && obj)) return [3, 4];
                        if (!!tableExists) return [3, 3];
                        return [4, this.createTable(table)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        SQL = "INSERT INTO " + fullTableName + " (";
                        insertItemKey = function (item) {
                            for (var key in item) {
                                SQL += key + ", ";
                            }
                            if (SQL[SQL.length - 1] === ' ')
                                SQL = SQL.substr(0, SQL.length - 2);
                            else
                                throw sardines_core_1.utils.unifyErrMesg("Invalid insert command for empty object", 'postgres', 'sql statement');
                        };
                        if (Array.isArray(obj) && obj.length > 0) {
                            insertItemKey(obj[0]);
                        }
                        else if (!Array.isArray(obj)) {
                            insertItemKey(obj);
                        }
                        else {
                            throw sardines_core_1.utils.unifyErrMesg("Invalid insert command for empty object", 'postgres', 'sql statement');
                        }
                        SQL += ') VALUES (';
                        insertItemValue = function (item) {
                            for (var key in item) {
                                var value = _this.parseValueForSQLStatement(table, key, item[key]);
                                SQL += value + ", ";
                            }
                            if (SQL[SQL.length - 1] === ' ')
                                SQL = SQL.substr(0, SQL.length - 2);
                        };
                        if (Array.isArray(obj) && obj.length > 0) {
                            SQL = SQL.substr(0, SQL.length - 1);
                            for (_i = 0, obj_1 = obj; _i < obj_1.length; _i++) {
                                item = obj_1[_i];
                                SQL += '(';
                                insertItemValue(item);
                                SQL += '), ';
                            }
                            if (SQL[SQL.length - 1] === ' ')
                                SQL = SQL.substr(0, SQL.length - 3);
                        }
                        else if (!Array.isArray(obj)) {
                            insertItemValue(obj);
                        }
                        else {
                            throw sardines_core_1.utils.unifyErrMesg("Invalid insert command for empty object", 'postgres', 'sql statement');
                        }
                        if (tableStruct['id'] || tableStruct['ID'] || tableStruct['Id']) {
                            SQL += ') RETURNING id;';
                        }
                        else {
                            SQL += ');';
                        }
                        return [3, 5];
                    case 4:
                        if (identities && obj) {
                            SQL = "UPDATE " + fullTableName + " SET ";
                            for (key in obj) {
                                value = obj[key];
                                SQL += key + " = " + this.parseValueForSQLStatement(table, key, value) + ", ";
                            }
                            if (SQL[SQL.length - 1] === ' ')
                                SQL = SQL.substr(0, SQL.length - 2);
                            SQL += " " + this.parseIdentities(table, identities) + ";";
                        }
                        else if (identities && !obj) {
                            SQL = "DELETE from " + fullTableName + " " + this.parseIdentities(table, identities) + ";";
                        }
                        _a.label = 5;
                    case 5: return [4, this.query(SQL)];
                    case 6:
                        res = _a.sent();
                        if (Array.isArray(res.rows) && res.rows.length > 0) {
                            if (Array.isArray(obj) && obj.length === res.rows.length) {
                                arr = obj.map(function (item, i) { return Object.assign({}, item, res.rows[i]); });
                                return [2, arr];
                            }
                            else if (!Array.isArray(obj) && res.rows.length === 1) {
                                return [2, Object.assign({}, obj, res.rows[0])];
                            }
                            else {
                                throw sardines_core_1.utils.unifyErrMesg("Unmatched inserted number of objects, number of source data items: " + (Array.isArray(obj) ? obj.length : 1) + ", number of inserted objects: " + res.rows.length, 'postgres', 'sql execution');
                            }
                        }
                        return [2, res];
                }
            });
        });
    };
    return Database;
}(base_1.StorageBase));
exports.Database = Database;
