table "daily_sales" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "store_id" {
    type     = bigint
    unsigned = true
  }
  column "date" {
    type = date
  }
  column "total_sales" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "client_count" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "tech_sales" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "retail_sales" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "created_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_daily_sales_store" {
    columns     = [column.store_id]
    ref_columns = [table.stores.column.id]
    on_delete   = CASCADE
  }
  index "idx_daily_sales_store_date" {
    columns = [column.store_id, column.date]
    unique  = true
  }
}

table "staff_daily_sales" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "staff_id" {
    type     = bigint
    unsigned = true
  }
  column "store_id" {
    type     = bigint
    unsigned = true
  }
  column "date" {
    type = date
  }
  column "total_sales" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "client_count" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "unit_price" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "retail_sales" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "created_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_staff_daily_sales_staff" {
    columns     = [column.staff_id]
    ref_columns = [table.staffs.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_staff_daily_sales_store" {
    columns     = [column.store_id]
    ref_columns = [table.stores.column.id]
    on_delete   = CASCADE
  }
  index "idx_staff_daily_sales_unique" {
    columns = [column.staff_id, column.date]
    unique  = true
  }
}

table "staff_menu_sales" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "staff_daily_sale_id" {
    type     = bigint
    unsigned = true
  }
  column "menu_id" {
    type     = bigint
    unsigned = true
  }
  column "count" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "amount" {
    type     = int
    unsigned = true
    default  = 0
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_staff_menu_sales_daily" {
    columns     = [column.staff_daily_sale_id]
    ref_columns = [table.staff_daily_sales.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_staff_menu_sales_menu" {
    columns     = [column.menu_id]
    ref_columns = [table.menus.column.id]
    on_delete   = RESTRICT
  }
}
