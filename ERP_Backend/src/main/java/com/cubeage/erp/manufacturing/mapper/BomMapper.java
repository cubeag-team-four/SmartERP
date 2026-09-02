package com.cubeage.erp.manufacturing.mapper;

import com.cubeage.erp.manufacturing.dto.response.BomDetailsResponse;
import com.cubeage.erp.manufacturing.dto.response.BomItemResponse;
import com.cubeage.erp.manufacturing.dto.response.BomResponse;
import com.cubeage.erp.manufacturing.entity.BillOfMaterial;
import com.cubeage.erp.manufacturing.entity.BomItem;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class BomMapper {

    public BomResponse toResponse(BillOfMaterial bom) {
        String formattedCost = "₹" + String.format("%,.0f", bom.getTotalCost() != null ? bom.getTotalCost() : BigDecimal.ZERO);
        int componentCount = bom.getItems() != null ? bom.getItems().size() : 0;

        return new BomResponse(
                bom.getId(),
                bom.getBomNumber(),
                bom.getProductName(),
                bom.getVersion(),
                componentCount,
                bom.getTotalCost(),
                formattedCost,
                bom.getNotes(),
                bom.getUpdatedAt()
        );
    }

    public BomDetailsResponse toDetailsResponse(BillOfMaterial bom) {
        String formattedCost = "₹" + String.format("%,.0f", bom.getTotalCost() != null ? bom.getTotalCost() : BigDecimal.ZERO);

        List<BomItemResponse> itemResponses = bom.getItems() != null
                ? bom.getItems().stream().map(this::toItemResponse).toList()
                : List.of();

        return new BomDetailsResponse(
                bom.getId(),
                bom.getBomNumber(),
                bom.getProductName(),
                bom.getVersion(),
                itemResponses.size(),
                bom.getTotalCost(),
                formattedCost,
                bom.getNotes(),
                itemResponses,
                bom.getCreatedAt(),
                bom.getUpdatedAt()
        );
    }

    public BomItemResponse toItemResponse(BomItem item) {
        BigDecimal lineTotal = (item.getQuantity() != null && item.getUnitCost() != null)
                ? item.getQuantity().multiply(item.getUnitCost())
                : BigDecimal.ZERO;

        return new BomItemResponse(
                item.getId(),
                item.getProductId(),
                item.getDescription(),
                item.getQuantity(),
                item.getUnitCost(),
                lineTotal
        );
    }
}