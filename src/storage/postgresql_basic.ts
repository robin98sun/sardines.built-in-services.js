import { Pool } from 'pg'
import * as utils from 'sardines-utils'
import { StorageBase } from './base'

export interface TableStructure {
    CONSTRAINTS?: string[]
    UNIQUE?: string[]
    PRIMARY?: string[]
    CHECK?: string
    REFERENCES?: string
    [column: string]: any
}

export interface DatabaseStructure {
    [table: string]: TableStructure
}

export interface ServerSettings {
    user: string
    host: string
    database: string
    password: string
    port: number
    schema?: string
}

const DDLKeywords: {[key: string]: boolean} = {
    'CONSTRAINTS': true,
    'UNIQUE': true,
    'CHECK': true,
    'PRIMARY': true,
    'REFERENCES': true
}

const builtInFunctions = {
    'CURRENT_TIMESTAMP': true
}

export const getPgTimeSting = (t: Date): string => {
    let str = `${t.getFullYear()}-${t.getMonth()<9?'0':''}${t.getMonth()+1}-${t.getDate()<10?'0':''}${t.getDate()}`
    str += ` ${t.getHours()<10?'0':''}${t.getHours()}:${t.getMinutes()<10?'0':''}${t.getMinutes()}:${t.getSeconds()<10?'0':''}${t.getSeconds()}`
    str += ` ${t.getTimezoneOffset()>=0?'-':'+'}${t.getTimezoneOffset()/60<10?'0':''}${Math.abs(Math.round(t.getTimezoneOffset()/60))}:${t.getTimezoneOffset()<10?'0':''}${t.getTimezoneOffset()%60}`
    return str
}

export class Database extends StorageBase {
    private pool: any
    private settings: ServerSettings
    private existingTables: {[tablename: string]: any}
    private structure: DatabaseStructure

    constructor(settings: ServerSettings, dbStruct: DatabaseStructure) {
        super()
        // Create the Pool
        this.pool = new Pool(settings)
        this.settings = settings
        this.existingTables = {}
        this.structure = dbStruct
    }

    public static mergeDbStructs(baseStruct:DatabaseStructure, extraStruct:DatabaseStructure) {
        let struct: DatabaseStructure = {}
        // Get all tables first
        for (let t in baseStruct) {
            if (!extraStruct[t]) struct[t] = baseStruct[t]
            else struct[t] = {}
        }
        for (let t in extraStruct) {
            if (!baseStruct[t]) struct[t] = extraStruct[t]
        }
        // Merge tables
        for (let t in struct) {
            let baseTable = baseStruct[t]
            let extraTable = extraStruct[t]
            if (baseTable && extraTable) {
                for (let col in baseTable) {
                    if (!extraTable[col]) struct[t][col] = baseTable[col]
                }
                for (let col in extraTable) {
                    struct[t][col] = extraTable[col]
                }
            }
        }
        return struct
    }

    // SQL Engine
    public query(sql:string): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                this.pool.query(sql, (err: any, res: any) => {
                    if (err) {
                        err.query = sql
                        reject(utils.unifyErrMesg(err, 'postgres', 'query'))
                    } else {
                        resolve(res)
                    }
                })
            } catch (err) {
                err.query = sql
                reject(utils.unifyErrMesg(err, 'postgres', 'database'))
            }
        })
    }

    // DDL
    private async tableExists(table: string): Promise<any> {
        let exists = false
        if (typeof this.existingTables[table] === 'undefined') {
            let SQL = `SELECT EXISTS (
                SELECT 1
                FROM   information_schema.tables 
                WHERE  table_name = '${table}'`
            if (this.settings.schema) {
                SQL += ` AND table_schema = '${this.settings.schema}'`
            }
            SQL += ');'
            const res = await this.query(SQL)
            exists = res.rows[0].exists
            this.existingTables[table] = exists
        } else exists = this.existingTables[table]
        return exists
    }

    private hasTableDefinition(table: string): boolean {
        return (typeof this.structure[table] !== 'undefined')
    }

    private async createCompositeType(typeName: string, definition: TableStructure): Promise<any> {
        let SQL = null
        const typeFullName = `${this.settings.schema?this.settings.schema+'.':''}${typeName}`
        for (let col in definition) {
            if (DDLKeywords[col.toUpperCase()]) continue
            if (!SQL) SQL = `CREATE TYPE ${typeFullName} AS (`
            const type = definition[col]
            if (typeof type === 'string') {
                SQL += ` ${col} ${type}, `
            } else if (Array.isArray(type)) {
                if (type.length > 1) continue
                const subType = type[0]
                if (typeof subType === 'string') {
                    SQL += ` ${col} ${subType}[], `
                } else if (Array.isArray(subType)) continue
                else {
                    const subTypeName = `${typeName}_${col}`
                    await this.createCompositeType(subTypeName, subType)
                    SQL += ` ${col} ${this.settings.schema?this.settings.schema+'.':''}${subTypeName}[], `
                    // SQL += ` ${col} ${subTypeName}[], `
                }                
            } else {
                const subTypeName = `${typeName}_${col}`
                await this.createCompositeType(subTypeName, type)
                SQL += ` ${col} ${this.settings.schema?this.settings.schema+'.':''}${subTypeName}, `
                // SQL += ` ${col} ${subTypeName}, `
            }
        }
        if (SQL) {
            SQL = SQL.substr(0, SQL.length-2)
            SQL += ');'
            
            await this.query(`DROP TYPE IF EXISTS ${typeFullName};`)
            return await this.query(SQL)
        } else {
            throw utils.unifyErrMesg(
                `Can not create composite type [${typeName}]`,
                'postgres',
                'table structure'
            )
        }
    }

    private async createTable(table:string): Promise<any> {
        if (!this.hasTableDefinition(table)) {
            return Promise.reject(utils.unifyErrMesg(
                `Can not create table [${table}] because of lacking table structure`,
                'postgres',
                'table structure'
            ))
        }
        const tableStruct = this.structure[table]
        let SQL = `CREATE TABLE `
        if (this.settings.schema) SQL += `${this.settings.schema}.`
        SQL += `${table} (`
        for (let colName in tableStruct) {
            if (DDLKeywords[colName.toUpperCase()]) continue
            const colType = tableStruct[colName]
            if (typeof colType === 'string') {
                SQL += `${colName} ${colType}, `
            } else if (Array.isArray(colType) && colType.length !== 1) continue
            else if (Array.isArray(colType) && typeof colType[0] === 'string') {
                SQL += `${colName} ${colType[0]}[], `
            } else if (Array.isArray(colType) && Array.isArray(colType[0])) continue
            else if (Array.isArray(colType)) {
                const subTypeName = `${table}_${colName}`
                await this.createCompositeType(subTypeName, colType[0])
                SQL += `${colName} ${this.settings.schema?this.settings.schema+'.':''}${subTypeName}[], `
                // SQL += `${colName} ${subTypeName}[], `
            } else if (!Array.isArray(colType) && typeof colType === 'object' && colType) {
                const subTypeName = `${table}_${colName}`
                await this.createCompositeType(subTypeName, colType)
                SQL += `${colName} ${this.settings.schema?this.settings.schema+'.':''}${subTypeName}, `
                // SQL += `${colName} ${subTypeName}, `
            }
        }
        if (SQL[SQL.length-1] !== ' ') throw utils.unifyErrMesg(`Table structure shall not be empty`, 'postgres', 'table structure')
        if (typeof tableStruct.CHECK !== 'undefined') {
            SQL += `CHECK ${tableStruct.CHECK}, `
        }
        if (typeof tableStruct.REFERENCES !== 'undefined') {
            SQL += `REFERENCES ${tableStruct.REFERENCES}, `
        }
        if (typeof tableStruct.UNIQUE !== 'undefined') {
            SQL += 'UNIQUE ('
            for (let colName of tableStruct.UNIQUE) {
                if (!(colName in tableStruct)) {
                    throw utils.unifyErrMesg(`Invalid column [${colName}] in UNIQUE constraint`, 'postgres', 'table structure')
                }
                SQL += `${colName}, `
            }
            SQL = SQL.substr(0, SQL.length-2)
            SQL += '), '
        }
        if (typeof tableStruct.PRIMARY !== 'undefined') {
            SQL += 'PRIMARY KEY ('
            for (let colName of tableStruct.PRIMARY) {
                if (!(colName in tableStruct)) {
                    throw utils.unifyErrMesg(`Invalid column [${colName}] in UNIQUE constraint`, 'postgres', 'table structure')
                }
                SQL += `${colName}, `
            }
            SQL = SQL.substr(0, SQL.length-2)
            SQL += '), '
        }
        if (typeof tableStruct.CONSTRAINTS !== 'undefined') {
            for (let constraint of tableStruct.CONSTRAINTS) {
                SQL += `CONSTRAINT ${constraint}, `
            }
        }
        SQL = SQL.substr(0, SQL.length-2)
        SQL += ');'
        const res = await this.query(SQL)
        if (res) {
            this.existingTables[table] = true
        }
        return res
    }

    // DML 
    public getColumnType(table: string, colName: string): any {
        const tableStruct = this.structure[table]
        if (!tableStruct) {
            throw utils.unifyErrMesg(`Do not have table structure for table [${table}]`, 'postgres', 'database structure')
        }
        const colType = tableStruct[colName]
        if (typeof colType === 'undefined') {
            throw utils.unifyErrMesg(`Invalid column [${colName}], which is not defined in the table structure of table [${table}]`, 'postgres', 'sql statement')
        // } else if (typeof colType !== 'string') {
            // throw utils.unifyErrMesg(`Invalid column definition for column [${colName}] in table [${table}]`, 'postgres', 'table structure')
        } else if (typeof colType === 'string' && colType.toUpperCase() === 'CONSTRAINTS') {
            throw utils.unifyErrMesg(`Invalid column name [${colName}] for table [${table}], which is a reserved keyword`, 'postgres', 'sql statement')
        }
        if (typeof colType === 'string') return colType.toUpperCase()
        else return colType
    }

    private composeValueForSQLStatement = (colType: any, value: any, tableName: string, colName: string): string|undefined|null => {
        let result = ''
        if (typeof value === 'undefined' || value === null) return value
        if (typeof colType === 'string') {
            if (colType.indexOf('[]') < 0) {
                switch (typeof value) {
                case 'object':
                    if (colType === 'JSONB' || colType === 'JSON') {
                        result = `'${JSON.stringify(value)}'`
                        result += `::${colType}`
                    } else if (value instanceof Date) {
                        return this.composeValueForSQLStatement(colType, value.getTime(), tableName, colName)
                    } else if (colType === 'POINT') {
                        // TODO
                    }
                    break
            
                case 'string': case 'number':
                    if (typeof value === 'string' && value in builtInFunctions) result = value
                    else if (colType.toLowerCase().indexOf('timestamp') === 0) {
                        let v = (typeof value === 'number') ? value.toString() : value
                        if (v.match(/^\d+$/)) {
                            if (['timestamp', 'timestamptz'].indexOf(colType.toLowerCase()) >=0) {
                                result = `'${getPgTimeSting(new Date(Number(v)))}'`
                            } else result = `to_timestamp(${Number(v)/1000})`
                        } else result = `'${v}'::${colType}`
                    } else result = `'${value}'`
                    break
                
                default:
                    result = `${value}`
                    break
                }
            } else if (Array.isArray(value)) {
                if (value.length > 0) {
                    result = 'ARRAY['
                    const subColType = colType.substr(0, colType.indexOf('[]'))

                    for(let i = 0; i<value.length ; i++) {
                        const item = value[i]
                        result += this.composeValueForSQLStatement(subColType, item, tableName, colName)
                        if (i < value.length - 1) result += ', '
                    }
                    result += ']'
                } else {
                    result = 'NULL'
                }
            }
        } else if (typeof colType === 'object') {
            // Composite Type
            if (Array.isArray(colType) && colType.length === 1 && Array.isArray(value)) {
                if (value.length > 0) {
                    result = 'ARRAY['
                    const compositeType = colType[0]
                    for(let i = 0; i<value.length ; i++) {
                        const item = value[i]
                        result += this.composeValueForSQLStatement(compositeType, item, tableName, colName)
                        if (i < value.length - 1) result += ', '
                    }
                    result += ']' 
                } else {
                    result = 'NULL'
                }
            } else if (!Array.isArray(colType) && !Array.isArray(value) && typeof value === 'object') {
                result = 'ROW('
                for (let key in colType) {
                    const subType = colType[key]
                    if (key in value) {
                        const subValue = this.composeValueForSQLStatement(subType, value[key], tableName, `${colName}_${key}`)
                        result += subValue
                    }
                    result += ', '
                }
                if (result.substr(-2) === ', ') result = result.substr(0, result.length - 2)
                result += `)::${this.settings.schema?this.settings.schema+'.':''}${tableName}_${colName}`
            }
        }
        return result
    }
    
    private parseValueForSQLStatement = (table: string, colName: string, value: any): string|undefined|null => {
        const colType = this.getColumnType(table, colName)
        return this.composeValueForSQLStatement(colType, value, table, colName)
    }

    private parseIdentities (table: string, identities: any) {
        let SQL = ''
        if (identities) {
            let cnt = 0
            for (let key in identities) {
                const value = this.parseValueForSQLStatement(table, key, identities[key])
                if (typeof value === 'undefined' || value === null) continue
                if (cnt === 0) SQL += ' WHERE '
                else SQL += ' AND '
                SQL += `${key} = ${value}`
                cnt++
            }
        }
        return SQL
    }

    private parseOrderby (table: string, orderby: any):string {
        let SQL = ''
        if (!orderby) return SQL
        for (let key in orderby) {
            const colType = this.getColumnType(table, key)
            if (!colType) continue
            SQL += `${SQL===''?' ORDER BY':','} ${key} ${orderby[key] > 0 ? 'ASC' : 'DESC'}`
        }
        return SQL
    }

    private getFullTableName(table:string) {
        return (this.settings.schema) ? `${this.settings.schema}.${table}` : table
    }

    // Public interfaces
    async get(table: string, identities?: any, orderby: any = null, limit: number = 1, offset: number = 0): Promise<any> {
        const exists = await this.tableExists(table)
        if (!exists) return null

        const fullTableName = this.getFullTableName(table)
        let SQL = `SELECT * FROM ${fullTableName}`

        if (identities) SQL += this.parseIdentities(table, identities)
        
        if (orderby && typeof orderby === 'object') {
            SQL += this.parseOrderby(table, orderby)
        }

        SQL += ` LIMIT ${limit <=0 ? 'ALL' : limit} OFFSET ${offset};`

        const res = await this.query(SQL)
        if (res && res.rows) {
            if (res.rows.length === 0) return null
            if (res.rows.length === 1) return res.rows[0]
            else return res.rows
        }
        return res
    }

    async set(table:string, obj: any, identities?: any): Promise<any>{
        const tableStruct = this.structure[table]
        if (!tableStruct) {
            throw utils.unifyErrMesg(`Do not have table structure for table [${table}]`, 'postgres', 'database structure')
        }
        let SQL = ''
        const tableExists = await this.tableExists(table)
        const fullTableName = this.getFullTableName(table)
        
        if (!identities && obj) {
            // Insert command
            // If table does not exist, create one if possible
            if (!tableExists) await this.createTable(table)

            SQL = `INSERT INTO ${fullTableName} (`
            const insertItemKey = (item:any) => {
                for (let key in item) {
                    SQL += `${key}, `
                }
                if (SQL[SQL.length-1] === ' ') SQL = SQL.substr(0, SQL.length-2)
                else throw utils.unifyErrMesg(`Invalid insert command for empty object`, 'postgres', 'sql statement')
            }
            if (Array.isArray(obj) && obj.length > 0) {
                insertItemKey(obj[0])
            } else if (!Array.isArray(obj)) {
                insertItemKey(obj)
            } else {
                throw utils.unifyErrMesg(`Invalid insert command for empty object`, 'postgres', 'sql statement')
            }
            
            SQL += ') VALUES ('
            const insertItemValue = (item:any) => {
                for(let key in item) {
                    const value = this.parseValueForSQLStatement(table, key, item[key])
                    SQL += `${value}, `
                }
                if (SQL[SQL.length-1] === ' ') SQL = SQL.substr(0, SQL.length-2)
            }
            if (Array.isArray(obj) && obj.length > 0) {
                SQL = SQL.substr(0, SQL.length -1)
                for (let item of obj) {
                    SQL += '('
                    insertItemValue(item)
                    SQL += '), '
                }
                if (SQL[SQL.length-1] === ' ') SQL = SQL.substr(0, SQL.length-3)
            } else if (!Array.isArray(obj)) {
                insertItemValue(obj)
            } else {
                throw utils.unifyErrMesg(`Invalid insert command for empty object`, 'postgres', 'sql statement')
            }
            if (tableStruct['id'] || tableStruct['ID'] || tableStruct['Id']) {
                SQL += ') RETURNING id;'
            } else {
                SQL += ');'
            }
        } else if (identities && obj) {
            // Update commmand
            SQL = `UPDATE ${fullTableName} SET `
            for (let key in obj) {
                const value = obj[key]
                SQL += `${key} = ${this.parseValueForSQLStatement(table, key, value)}, `
            }
            if (SQL[SQL.length-1] === ' ') SQL = SQL.substr(0, SQL.length-2) 

            SQL += ` ${this.parseIdentities(table, identities)};`
        } else if (identities && !obj) {
            // Delete command
            SQL = `DELETE from ${fullTableName} ${this.parseIdentities(table, identities)};`
        }
        const res = await this.query(SQL)
        if (Array.isArray(res.rows) && res.rows.length > 0) {
            if (Array.isArray(obj) && obj.length === res.rows.length) {
                const arr = obj.map((item,i) => Object.assign({}, item, res.rows[i]))
                return arr
            } else if (!Array.isArray(obj) && res.rows.length === 1) {
                return Object.assign({}, obj, res.rows[0])
            } else {
                throw utils.unifyErrMesg(`Unmatched inserted number of objects, number of source data items: ${Array.isArray(obj)?obj.length:1}, number of inserted objects: ${res.rows.length}`, 'postgres', 'sql execution')
            }
        }
        return res
    }
}
