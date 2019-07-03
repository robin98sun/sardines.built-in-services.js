/**
 * @author Robin Sun
 * @email robin@naturewake.com
 * @create date 2019-06-24 12:09:45
 * @modify date 2019-06-24 12:09:45
 * @desc [description]
 */

import * as bcrypt from 'bcrypt';
import {
    DatabaseStructure,
    ServerSettings,
    Database
} from './postgresql_basic'

const cryptPassword = async (password: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(10, function(err, salt) {
            if (err) reject(err)
            bcrypt.hash(password, salt, function(err, hash) {
                if (err) reject(err)
                else resolve(hash)
            });
        });
    })
};

const comparePassword = (plainPass:string, hashword:string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        bcrypt.compare(plainPass, hashword, function(err, isPasswordMatch) {
            if (err) reject(err)
            else resolve(isPasswordMatch)
        })
    })
};

const tokenAlphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const genToken = (length: number) => {
    let token = ''
    for (let i = 0; i<length; i++) {
        token += tokenAlphabet[Math.round(Math.random()*(tokenAlphabet.length - 1))]
    }
    return token
}

export const basePostgresDBStruct: DatabaseStructure = {
    account: {
        id: 'UUID PRIMARY KEY DEFAULT uuid_generate_v4()',
        create_on: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
        last_access_on: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
        name: 'VARCHAR(30) UNIQUE NOT NULL',
        password: 'VARCHAR(64) NOT NULL',
        password_expire_on: 'TIMESTAMP(3)',
        email: 'VARCHAR(100) UNIQUE',
        is_email_varified: 'Boolean NOT NULL DEFAULT false',
        mobile: 'VARCHAR(20) UNIQUE',
        is_mobile_varified: 'Boolean NOT NULL DEFAULT false',
        can_login: 'Boolean NOT NULL DEFAULT true',
        can_manage_accounts: 'Boolean NOT NULL DEFAULT false'
    },
    token: {
        account_id: 'UUID',
        token: 'VARCHAR(100) UNIQUE NOT NULL',
        expire_on: 'TIMESTAMP(3)'
    }
}

export interface Account {
    id?: string
    name?: any
    email?: any 
    mobile?: any
    can_login?: boolean
    can_manage_accounts?: boolean
    password?: string
}

export interface Token {
    account_id: string
    token: string
    expire_on?: number
}

export class TempleteAccount {
    protected db: Database|null = null
    protected isInited: boolean = false
    protected tokenCache: Map<string, Token>
    protected dbStruct: DatabaseStructure = basePostgresDBStruct

    constructor() {
        this.tokenCache = new Map()
    }

    protected async setupDB(serverSettings: ServerSettings, dbStruct?: DatabaseStructure) {
        if (dbStruct) {
            this.dbStruct = Database.mergeDbStructs(basePostgresDBStruct, dbStruct)
        }
        this.db = new Database(serverSettings, this.dbStruct)
    }

    protected async touch(tableName: string, obj: any) {
        if (!tableName || !this.dbStruct[tableName]) return
        if (Array.isArray(obj)) {
            for (let o of obj) {
                await this.touch(tableName, o)
            }
        } else {
            let objId: {id: string|null}= {id: null}
            if (typeof obj === 'string') {
                objId.id = obj
            } else if (typeof obj === 'object' && obj && obj.id) {
                objId.id = obj.id
            }
            if (objId.id) {
                try {
                    const colType = this.db!.getColumnType(tableName, 'last_access_on')
                    if (colType) {
                        await this.db!.set(tableName, {last_access_on: 'CURRENT_TIMESTAMP'}, objId)
                    }
                } catch (e) {
                    if (e) return 
                }
            }
        }
    }

    protected async queryAccount(account: Account) {
        let accountForQuery: Account = Object.assign({}, account)
        if (accountForQuery.password) delete accountForQuery.password
        return await this.db!.get('account', accountForQuery)
    }

    protected async createOrUpdateAccount(account: Account) {
        if (account.password) account.password = await cryptPassword(account.password)
        else if (!account.id) throw 'password is required to create account'
        if (!account.id) return await this.db!.set('account', account)
        else return this.db!.set('account', account, {id: account.id})
    }

    // Account

    protected validatePassword(password: string) {
        if (!password) {
            throw 'Password can not be empty'
        } else if (password.length < 6) {
            throw 'Password shall be longer than 6'
        }
    }

    async signUp(account: Account, password: string) {
        // Validate account and password
        this.validatePassword(password)

        // Check whether account exists
        let accountInst = await this.queryAccount(account)
        if (accountInst) {
            throw 'Account already exists'
        } else {
            let accountObj = Object.assign({}, account)
            accountObj.password = password
            accountInst = await this.createOrUpdateAccount(accountObj)
            const tokenObj = await this.createToken(accountInst.id)
            return tokenObj.token
        }
    }

    protected async createToken(accountId: string): Promise<Token> {
        let tokenQuery = {
            account_id: accountId,
            token: genToken(30)
        }
        let tokenInDb = await this.db!.get('token', tokenQuery)
        while (tokenInDb) {
            tokenQuery.token = genToken(32)
            tokenInDb = await this.db!.get('token', tokenQuery)
        }
        let tokenObj: Token = tokenQuery
        tokenObj.expire_on = Date.now() + 1800000
        await this.db!.set('token', tokenObj)
        this.tokenCache.set(tokenObj.token, tokenObj)
        return tokenObj
    }

    protected async validateToken(token: string, update: boolean = false): Promise<Token> {
        if (!token) 'token is empty'
        let tokenObj: Token|null = null
        if (this.tokenCache.has(token)) {
            tokenObj = this.tokenCache.get(token)!
        } else {
            tokenObj = await this.db!.get('token', {token})
        }
        if (!tokenObj) {
            throw 'Invalid token'
        } else if (tokenObj.expire_on && tokenObj.expire_on - Date.now() < 0) {
            throw 'token expired'
        } else {
            if (update) {
                tokenObj.expire_on = Date.now() + 1800000
                await this.db!.set('token', tokenObj, {account_id: tokenObj.account_id, token: tokenObj.token})
                this.tokenCache.set(token, tokenObj)
            }
            return tokenObj
        }
    }

    async signIn(account: Account, password: string): Promise<string> {
        this.validatePassword(password)
        let accountInst = await this.queryAccount(account)
        if (accountInst) {
            if (await comparePassword(password, accountInst.password)) {
                // Find a still alive token
                let tokenObj = await this.db!.get('token', {account_id: accountInst.id}, {expire_on: -1})
                if (!tokenObj || tokenObj.expire_on.getTime() <= Date.now() + 30000 ) {
                    // Get token
                    tokenObj = await this.createToken(accountInst.id)
                }
                await this.touch('account', {id: accountInst.id})
                return tokenObj.token
            } else {
                throw 'Password is invalid'
            }
        } else {
            throw 'Account does not exist'
        }
    }

    async signOut(token: string) {
        let tokenObj = await this.validateToken(token)
        if (this.tokenCache.has(token)) {
            this.tokenCache.delete(token)
        } 
        await this.db!.set('token', null, {account_id: tokenObj.account_id})
    }
}
