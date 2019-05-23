import { Pool } from 'pg'
import * as utils from 'sardines-utils'
import { StorageBase } from './base'

export interface TableStructure {
    CONSTRAINTS?: string[]
    UNIQUE?: string[]
    PRIMARY?: string[]
    CHECK?: string
    REFERENCES?: string
    [column: string]: string|string[]|undefined
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
            SQL += `${colName} ${colType}, `
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
    private getColumnType(table: string, colName: string): string {
        const tableStruct = this.structure[table]
        if (!tableStruct) {
            throw utils.unifyErrMesg(`Do not have table structure for table [${table}]`, 'postgres', 'database structure')
        }
        const colType = tableStruct[colName]
        if (typeof colType === 'undefined') {
            throw utils.unifyErrMesg(`Invalid column [${colName}], which is not defined in the table structure of table [${table}]`, 'postgres', 'sql statement')
        } else if (typeof colType !== 'string') {
            throw utils.unifyErrMesg(`Invalid column definition for column [${colName}] in table [${table}]`, 'postgres', 'table structure')
        } else if (colType.toUpperCase() === 'CONSTRAINTS') {
            throw utils.unifyErrMesg(`Invalid column name [${colName}] for table [${table}], which is a reserved keyword`, 'postgres', 'sql statement')
        }
        return colType.toUpperCase()
    }
    
    private parseValueForSQLStatement = (table: string, colName: string, value: any): string => {
        const colType = this.getColumnType(table, colName)
        let result = ''
        switch (typeof value) {
            case 'object':
            // result = `'${JSON.stringify(value).replace(/'/g, '"')}'`
            result = `'${JSON.stringify(value)}'`
            if (colType === 'JSONB') result += '::jsonb'
            break
    
            case 'string':
            if (value in builtInFunctions) result = value
            else result = `'${value}'`
            break
    
            default:
            result = `${value}`
            break
        }
        return result
    }

    private parseIdentities (table: string, identities: any) {
        let SQL = ''
        if (identities) {
            let cnt = 0
            for (let key in identities) {
                const value = this.parseValueForSQLStatement(table, key, identities[key])
                if (cnt === 0) SQL += ' WHERE '
                else SQL += ' AND '
                SQL += `${key} = ${value}`
                cnt++
            }
        }
        return SQL
    }

    private getFullTableName(table:string) {
        return (this.settings.schema) ? `${this.settings.schema}.${table}` : table
    }

    // Public interfaces
    async get(table: string, identities?: any): Promise<any> {
        const exists = await this.tableExists(table)
        if (!exists) return null

        const fullTableName = this.getFullTableName(table)
        let SQL = `SELECT * FROM ${fullTableName}`

        if (identities) SQL += this.parseIdentities(table, identities)
        
        SQL += ';'

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
            for (let key in obj) {
                SQL += `${key}, `
            }

            if (SQL[SQL.length-1] === ' ') SQL = SQL.substr(0, SQL.length-2)
            else throw utils.unifyErrMesg(`Invalid insert command for empty object`, 'postgres', 'sql statement')

            SQL += ') VALUES ('
            for(let key in obj) {
                const value = this.parseValueForSQLStatement(table, key, obj[key])
                console.log(`${table}.${key}: ${value}`)
                SQL += `${value}, `
            }
            if (SQL[SQL.length-1] === ' ') SQL = SQL.substr(0, SQL.length-2)
            SQL += ');'
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
        return res
    }
}
