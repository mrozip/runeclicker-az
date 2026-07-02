resource "azurerm_resource_group" "site" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_static_web_app" "site" {
  name                = var.static_web_app_name
  resource_group_name = azurerm_resource_group.site.name
  location            = azurerm_resource_group.site.location
  sku_tier            = var.sku
  sku_size            = var.sku
  tags                = var.tags
}
