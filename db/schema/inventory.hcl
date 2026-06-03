table "dealers" {
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
  column "contact_method" {
    type = enum("LINE", "email")
  }
  column "contact_info" {
    type = varchar(255)
  }
  column "status" {
    type    = enum("active", "inactive", "pending")
    default = "active"
  }
  column "closing_day" {
    type = tinyint
    unsigned = true
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
  foreign_key "fk_dealers_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
}

table "inventories" {
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
  column "material_id" {
    type     = bigint
    unsigned = true
  }
  column "quantity" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "threshold" {
    type     = int
    unsigned = true
    default  = 0
  }
  column "status" {
    type    = enum("要発注", "注意", "正常", "過剰")
    default = "正常"
  }
  column "updated_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_inventories_store" {
    columns     = [column.store_id]
    ref_columns = [table.stores.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_inventories_material" {
    columns     = [column.material_id]
    ref_columns = [table.materials.column.id]
    on_delete   = CASCADE
  }
  index "idx_inventories_store_material" {
    columns = [column.store_id, column.material_id]
    unique  = true
  }
}

table "orders" {
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
  }
  column "dealer_id" {
    type     = bigint
    unsigned = true
  }
  column "status" {
    type    = enum("pending", "sent", "received", "delivered")
    default = "pending"
  }
  column "is_next_month_invoice" {
    type    = bool
    default = false
  }
  column "sent_at" {
    type = datetime
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
  foreign_key "fk_orders_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_orders_store" {
    columns     = [column.store_id]
    ref_columns = [table.stores.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_orders_dealer" {
    columns     = [column.dealer_id]
    ref_columns = [table.dealers.column.id]
    on_delete   = RESTRICT
  }
  index "idx_orders_store_status" {
    columns = [column.store_id, column.status]
  }
}

table "order_items" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "order_id" {
    type     = bigint
    unsigned = true
  }
  column "material_id" {
    type     = bigint
    unsigned = true
  }
  column "quantity" {
    type     = int
    unsigned = true
  }
  column "unit" {
    type = varchar(10)
  }
  column "estimated_cost" {
    type     = int
    unsigned = true
    null     = true
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_order_items_order" {
    columns     = [column.order_id]
    ref_columns = [table.orders.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_order_items_material" {
    columns     = [column.material_id]
    ref_columns = [table.materials.column.id]
    on_delete   = RESTRICT
  }
}
