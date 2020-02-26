import {
  PostgresServerSettings,
  PostgresDatabaseStructure,
  RedisServerSettings
} from '../../src/storage/index'

// Postgres settings
export const testDbSettings: PostgresServerSettings = {
  host: "nw-test02",
  port: 5432,
  database: "rd_test",
  schema: "rd",
  user: "rd",
  password: "Sardines2020"
}

export const testTableStruct: PostgresDatabaseStructure = {
    account_test: {
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
    token_test: {
        account_id: 'UUID',
        token: 'VARCHAR(100) UNIQUE NOT NULL',
        expire_on: 'TIMESTAMP(3)'
    }
}

// Redis Settings
export const testRedisServerSettings: RedisServerSettings = {
  host: 'nw-test02',
  password: 'Startup@2020',
  db: 3
}

// Data Cell
import {
  DataCellSettings
} from '../../src/templetes/data_cell'

export const testDataCellSettings: DataCellSettings = {
  database: testDbSettings,
  tableStructure: testTableStruct,
  cache: testRedisServerSettings
}