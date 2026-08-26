package com.cubeage.erp.inventory.entity;

import com.cubeage.erp.common.base.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "inventory_items", uniqueConstraints = @UniqueConstraint(name = "uk_inventory_item_tenant_sku", columnNames = {"tenant_id", "sku"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItem extends BaseEntity {
	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(nullable = false, length = 50)
	private String sku;

	@Column(nullable = false, length = 150)
	private String name;

	@Column(nullable = false, length = 80)
	private String category;

	@Column(name = "warehouse_code", nullable = false, length = 30)
	private String warehouseCode;

	@Column(name = "warehouse_name", nullable = false, length = 100)
	private String warehouseName;

	@Column(nullable = false, precision = 19, scale = 3)
	private BigDecimal quantity;

	@Column(name = "minimum_level", nullable = false, precision = 19, scale = 3)
	private BigDecimal minimumLevel;

	@Column(nullable = false, length = 20)
	private String unit;

	@Column(name = "cost_price", nullable = false, precision = 19, scale = 2)
	private BigDecimal costPrice;
}
