import { 
  RedisCache, 
  RedisServerSettings,
  // RedisDataType,
  // RedisOperationOptions
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

  public db: PostgreSQL|null = null
  public cache: RedisCache|null = null

  constructor(settings: DataCellSettings) {
    this.createInstances(settings)
  }

  private createInstances(settings: DataCellSettings) {
    if (settings && settings.database && settings.tableStructure) {
      this.db = new PostgreSQL(settings.database, settings.tableStructure)
    }
    if (settings && settings.cache) {
      this.cache = new RedisCache(settings.cache)
    }
  }

  public async setup() {
    if (this.cache) {
      await this.cache.connect()
    }
  }

}