package com.cubeage.erp.projects.specification;

import com.cubeage.erp.projects.dto.request.ProjectSearchRequest;
import com.cubeage.erp.projects.entity.Project;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.Locale;

public final class ProjectSpecification {
    private ProjectSpecification() { }

    public static Specification<Project> from(Long tenantId, ProjectSearchRequest request) {
        return (root, query, builder) -> {
            var predicates = new ArrayList<Predicate>();
            predicates.add(builder.equal(root.get("tenantId"), tenantId));
            if (request == null) return builder.and(predicates.toArray(Predicate[]::new));
            if (request.getStatus() != null) predicates.add(builder.equal(root.get("status"), request.getStatus()));
            if (request.getPriority() != null) predicates.add(builder.equal(root.get("priority"), request.getPriority()));
            if (request.getManagerId() != null) predicates.add(builder.equal(root.get("managerId"), request.getManagerId()));
            if (request.getStartsAfter() != null) predicates.add(builder.greaterThanOrEqualTo(root.get("startDate"), request.getStartsAfter()));
            if (request.getEndsBefore() != null) predicates.add(builder.lessThanOrEqualTo(root.get("endDate"), request.getEndsBefore()));
            if (request.getQuery() != null && !request.getQuery().isBlank()) {
                String term = "%" + request.getQuery().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(builder.or(builder.like(builder.lower(root.get("name")), term), builder.like(builder.lower(root.get("code")), term)));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
