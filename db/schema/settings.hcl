table "notification_settings" {
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
  column "inventory_alert" {
    type    = bool
    default = true
  }
  column "order_complete" {
    type    = bool
    default = true
  }
  column "daily_report" {
    type    = bool
    default = false
  }
  column "updated_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_notification_settings_staff" {
    columns     = [column.staff_id]
    ref_columns = [table.staffs.column.id]
    on_delete   = CASCADE
  }
  index "idx_notification_settings_staff" {
    columns = [column.staff_id]
    unique  = true
  }
}

table "pos_integrations" {
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
  column "pos_system" {
    type = enum("smaregi", "square", "other")
  }
  column "account_id" {
    type = varchar(255)
    null = true
  }
  column "status" {
    type    = enum("connected", "disconnected")
    default = "disconnected"
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
  foreign_key "fk_pos_integrations_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
  index "idx_pos_integrations_unique" {
    columns = [column.salon_id, column.pos_system]
    unique  = true
  }
}

table "business_hours" {
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
  column "open_time" {
    type = time
  }
  column "close_time" {
    type = time
  }
  column "closed_weekday" {
    type    = tinyint
    null    = true
  }
  column "updated_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_business_hours_store" {
    columns     = [column.store_id]
    ref_columns = [table.stores.column.id]
    on_delete   = CASCADE
  }
  index "idx_business_hours_store" {
    columns = [column.store_id]
    unique  = true
  }
}
