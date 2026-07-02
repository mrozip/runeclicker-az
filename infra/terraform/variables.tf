variable "resource_group_name" {
  description = "Name of the resource group that will contain the site resources."
  type        = string
  default     = "rg-runeclicker-app-prod"
}

variable "static_web_app_name" {
  description = "Name of the Azure Static Web App resource."
  type        = string
  default     = "swa-runeclicker-app-prod"

  validation {
    condition     = can(regex("^[A-Za-z0-9][A-Za-z0-9-]{0,58}[A-Za-z0-9]$", var.static_web_app_name))
    error_message = "static_web_app_name must be 2-60 characters and contain only letters, numbers, and hyphens."
  }
}

variable "location" {
  description = "Azure region for the resource group and Static Web App."
  type        = string
  default     = "eastus2"
}

variable "sku" {
  description = "Azure Static Web Apps SKU. Use Free for the lowest-cost static app footprint."
  type        = string
  default     = "Free"

  validation {
    condition     = contains(["Free", "Standard"], var.sku)
    error_message = "sku must be either Free or Standard."
  }
}

variable "tags" {
  description = "Tags applied to Azure resources."
  type        = map(string)
  default = {
    managed_by = "terraform"
    project    = "runeclicker"
  }
}
