package com.cubeage.erp.purchase.entity;

import com.cubeage.erp.purchase.enums.VendorStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
        name = "purchase_vendors",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_purchase_vendor_code",
                columnNames = {"tenant_id", "vendor_code"}
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "vendor_code", nullable = false, length = 30)
    private String vendorCode;

    @Column(nullable = false)
    private String vendorName;

    @Column(nullable = false)
    private String contactName;

    private String phone;

    private String email;

    private String city;

    private String address;

    private String category;

    private String gstin;

    private String pan;

    private String paymentTerms;

    @Column(precision = 19, scale = 2)
    private BigDecimal creditLimit;

    @Column(nullable = false)
    private BigDecimal rating;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VendorStatus status;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}
