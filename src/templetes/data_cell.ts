import { 
  RedisCache, 
  RedisServerSettings,
  RedisDataType,
  RedisOperationOptions
} from '../storage/redis'

import { 
  PostgreSQL, 
  PostgresServerSettings,
  PostgresDatabaseStructure
} from '../storage/index'

export interface DataCellSettings {
  database?: PostgresServerSettings
  cache?: RedisServerSettings
  tableStructure?: PostgresDatabaseStructure
}

export class DataCell {

  protected db: PostgreSQL
  protected cache: RedisCache

  constructor(settings: DataCellSettings) {
    this.setupInstances(settings)
  }

  private setupInstances(settings: DataCellSettings) {
    if (settings && settings.database && settings.tableStructure) {
      this.db = new PostgreSQL(settings.database, settings.tableStructure)
    }
    if (settings && settings.cache) {
      this.cache = new RedisCache(settings.cache)
    }
  }

}