table "plans" {
  schema = schema.cygnus_dev
  column "id" {
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "name" {
    type = varchar(100)
  }
  column "max_staff_count" {
    type     = int
    unsigned = true
    null     = true
  }
  column "created_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
}

table "subscriptions" {
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
  column "plan_id" {
    type     = bigint
    unsigned = true
  }
  column "status" {
    type    = enum("active", "cancelled", "expired")
    default = "active"
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
  foreign_key "fk_subscriptions_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_subscriptions_plan" {
    columns     = [column.plan_id]
    ref_columns = [table.plans.column.id]
    on_delete   = RESTRICT
  }
  index "idx_subscriptions_salon" {
    columns = [column.salon_id]
    unique  = true
  }
}

table "invitations" {
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
  column "invited_by_staff_id" {
    type     = bigint
    unsigned = true
  }
  column "email" {
    type = varchar(255)
  }
  column "token" {
    type = varchar(255)
  }
  column "role" {
    type    = enum("admin", "staff")
    default = "staff"
  }
  column "status" {
    type    = enum("pending", "accepted", "expired")
    default = "pending"
  }
  column "expires_at" {
    type = datetime
  }
  column "created_at" {
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "fk_invitations_salon" {
    columns     = [column.salon_id]
    ref_columns = [table.salons.column.id]
    on_delete   = CASCADE
  }
  foreign_key "fk_invitations_staff" {
    columns     = [column.invited_by_staff_id]
    ref_columns = [table.staffs.column.id]
    on_delete   = CASCADE
  }
  index "idx_invitations_token" {
    columns = [column.token]
    unique  = true
  }
  index "idx_invitations_email_salon" {
    columns = [column.salon_id, column.email]
  }
}
