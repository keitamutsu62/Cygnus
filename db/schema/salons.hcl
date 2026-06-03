schema "cygnus_dev" {}

table "salons" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "name" {
    type = varchar(255)
  }
  column "shimei_charge" {
    type     = int
    unsigned = true
    default  = 1100
  }
  column "closing_day" {
    type     = tinyint
    unsigned = true
    default  = 20
  }
  column "created_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
}

table "stores" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "salon_id" {
    type     = bigint
    unsigned = true
  }
  column "name" {
    type = varchar(255)
  }
  column "address" {
    type = varchar(500)
    null = true
  }
  column "phone" {
    type = varchar(20)
    null = true
  }
  column "created_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_stores_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
  index "idx_stores_salon_id" {
    columns = [column.salon_id]
  }
}

table "staffs" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "salon_id" {
    type     = bigint
    unsigned = true
  }
  column "store_id" {
    type     = bigint
    unsigned = true
    null     = true
  }
  column "name" {
    type = varchar(255)
  }
  column "email" {
    type = varchar(255)
  }
  column "password_hash" {
    type = varchar(255)
  }
  column "role" {
    type    = enum("owner", "admin", "staff")
    default = "staff"
  }
  column "avatar_initials" {
    type = varchar(4)
    null = true
  }
  column "shimei_charge" {
    type     = int
    unsigned = true
    null     = true
  }
  column "created_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_staffs_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_staffs_store" {
    columns     = [column.store_id]
    ref_columns = [table.stores.column.id]
    on_delete   = SET_NULL
  }
  index "idx_staffs_email" {
    columns = [column.email]
    unique  = true
  }
}

table "customers" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "salon_id" {
    type     = bigint
    unsigned = true
  }
  column "name" {
    type = varchar(255)
  }
  column "phone" {
    type = varchar(20)
    null = true
  }
  column "ex_line_id" {
    type = varchar(255)
    null = true
  }
  column "created_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_customers_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
}
