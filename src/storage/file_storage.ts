import * as utils from 'sardines-utils'
import { StorageBase } from './base'
import * as fs from 'fs'
import * as path from 'path'
import * as proc from 'process'
import { Stream } from 'stream';

export interface FileStorageSettings {
    root: string
}

export interface FileObject {
    path?: string
    content?: string
    stream?: Stream
}

export enum FileStorageReturnType {
    path = 'path',
    content = 'content',
    stream = 'stream'
}

export interface FileIdentity {
    name: string
    subId?: FileIdentity
    returnType?: FileStorageReturnType
}

export const parsePathIntoFileIdentity = (filepath: string): FileIdentity|null => {
    let id: FileIdentity|null = null
    if (!filepath || filepath === '/') return null
    let subdirs = (filepath[0] === '/' ? filepath.substr(1) : filepath).split('/')
    let pre: FileIdentity|null = id
    for (let item of subdirs) {
        if (!id) {
            id = {name: item}
            pre = id!
        } else {
            pre!.subId = {name: item}
            pre = pre!.subId
        }
    }
    return id!
}

export const parseFileIdentityIntoPath = (identity: FileIdentity): string => {
    let result = ''
    let pre = identity
    result += '/' + pre.name
    while (pre.subId) {
        pre = pre.subId
        result += '/' + pre.name
    }
    return result
}

const mkdir = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true})
    } else if (!fs.lstatSync(dir).isDirectory()) {
        throw utils.unifyErrMesg(`Invalid file storage directory ${dir}`, 'storage', 'file')
    }
}

export class FileStorage extends StorageBase {
    private root: string
    constructor(settings: FileStorageSettings) {
        super()
        this.root = path.resolve(proc.cwd(), settings.root)
        mkdir(this.root)
    }

    async get(tableName: string, identity: FileIdentity): Promise<FileObject|null> {
        let result: FileObject|null = null
        const baseDir = path.resolve(this.root, tableName?`./${tableName}`:'')
        if (!fs.existsSync(baseDir) || !fs.lstatSync(baseDir).isDirectory()) {
            throw utils.unifyErrMesg(`table ${tableName} does not exist`, 'storage', 'file')
        }
        const filepath = path.resolve(baseDir, './' + (typeof identity === 'string'? identity:parseFileIdentityIntoPath(identity)))
        if (!fs.existsSync(filepath) || !fs.lstatSync(filepath).isFile()) {
            // throw utils.unifyErrMesg(`invalid file identity`, 'storage', 'file')
            return result
        }
        const returnType: FileStorageReturnType = identity.returnType ? identity.returnType : FileStorageReturnType.content
        switch(returnType) {
            case FileStorageReturnType.content:
                result = {
                    content: fs.readFileSync(filepath, {encoding: 'utf8'})
                }
                break
            case FileStorageReturnType.path:
                result = {path: filepath}
                break
            case FileStorageReturnType.stream:
                result = {
                    stream: fs.createReadStream(filepath, {encoding: 'utf8'})
                }
                break
            default:
                break
        }
        return result
    }

    async set(tableName: string, obj: FileObject|null, identity: FileIdentity|string) {
        const baseDir = path.resolve(this.root, tableName?`./${tableName}`:'')
        mkdir(baseDir)
        const filepath = path.resolve(baseDir, './' + (typeof identity === 'string'? identity:parseFileIdentityIntoPath(identity)))
        if (!obj && fs.existsSync(filepath)) fs.unlinkSync(filepath)
        else if (obj && obj.content) {
            fs.writeFileSync(filepath, obj.content, {encoding: 'utf8'})
        } else if (obj && obj.path && fs.existsSync(obj.path) && fs.lstatSync(obj.path).isFile()) {
            fs.createReadStream(obj.path, {encoding: 'utf8'}).pipe(fs.createWriteStream(filepath, {encoding: 'utf8', autoClose: true}))
        } else if (obj && obj.stream) {
            obj.stream.pipe(fs.createWriteStream(filepath, {encoding: 'utf8', autoClose: true}))
        }
    }
}