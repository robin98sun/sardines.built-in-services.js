/// <reference types="node" />
import { StorageBase } from './base';
import { Stream } from 'stream';
export interface FileStorageSettings {
    root: string;
}
export interface FileObject {
    path?: string;
    content?: string;
    stream?: Stream;
}
export declare enum FileStorageReturnType {
    path = "path",
    content = "content",
    stream = "stream"
}
export interface FileIdentity {
    name: string;
    subId?: FileIdentity;
    returnType?: FileStorageReturnType;
}
export declare const parsePathIntoFileIdentity: (filepath: string) => FileIdentity | null;
export declare const parseFileIdentityIntoPath: (identity: FileIdentity) => string;
export declare class FileStorage extends StorageBase {
    private root;
    constructor(settings: FileStorageSettings);
    get(tableName: string, identity: FileIdentity): Promise<FileObject | null>;
    set(tableName: string, obj: FileObject | null, identity: FileIdentity | string): Promise<void>;
}
//# sourceMappingURL=file_storage.d.ts.map