variable "NODE_ENV" {
  default = "production"
}

variable "JWT_SECRET" {
  sensitive = true
}

variable "ADMIN_PASSWORD" {
  sensitive = true
}

variable "DATABASE_URL" {
  sensitive = true
}

variable "REDIS_URL" {
  sensitive = true
}

variable "APP_URL" {}