table "menus" {
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
  column "price" {
    type     = int
    unsigned = true
    default  = 0
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
  foreign_key "fk_menus_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
}

table "materials" {
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
  column "brand" {
    type = varchar(255)
    null = true
  }
  column "category" {
    type = enum("カラー", "パーマ", "シャンプー・トリートメント", "スタイリング", "物販", "その他")
  }
  column "size_amount" {
    type     = int
    unsigned = true
    null     = true
  }
  column "size_unit" {
    type = varchar(10)
    null = true
  }
  column "stock_unit" {
    type = varchar(10)
    default = "本"
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
  foreign_key "fk_materials_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
}

table "menu_materials" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "menu_id" {
    type     = bigint
    unsigned = true
  }
  column "material_id" {
    type     = bigint
    unsigned = true
  }
  column "required_quantity" {
    type     = decimal(8, 2)
    unsigned = true
    null     = true
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_menu_materials_menu" {
    columns     = [column.menu_id]
    ref_columns = [table.menus.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_menu_materials_material" {
    columns     = [column.material_id]
    ref_columns = [table.materials.column.id]
    on_delete   = CASCADE
  }
  index "idx_menu_materials_unique" {
    columns = [column.menu_id, column.material_id]
    unique  = true
  }
}
