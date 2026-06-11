schema "cygnus_dev" {}

table "admin_appointments" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "salon_name" {
    type = varchar(255)
  }
  column "title" {
    type = varchar(255)
  }
  column "date" {
    type = date
  }
  column "time" {
    type = varchar(5)
    null = true
  }
  column "status" {
    type    = enum("scheduled", "done", "cancelled")
    default = "scheduled"
  }
  column "notes" {
    type = text
    null = true
  }
  column "result" {
    type = text
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
  index "idx_date" {
    columns = [column.date]
  }
}
