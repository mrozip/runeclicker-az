output "resource_group_name" {
  description = "Name of the Azure resource group."
  value       = azurerm_resource_group.site.name
}

output "static_web_app_name" {
  description = "Name of the Azure Static Web App."
  value       = azurerm_static_web_app.site.name
}

output "static_web_app_default_host_name" {
  description = "Default hostname assigned by Azure Static Web Apps."
  value       = azurerm_static_web_app.site.default_host_name
}

output "static_web_app_url" {
  description = "Default HTTPS URL assigned by Azure Static Web Apps."
  value       = "https://${azurerm_static_web_app.site.default_host_name}"
}

output "deployment_token" {
  description = "Deployment token for the GitHub Actions AZURE_STATIC_WEB_APPS_API_TOKEN secret."
  value       = azurerm_static_web_app.site.api_key
  sensitive   = true
}
