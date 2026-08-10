# ERP_Backend (SmartERP AI)

Spring Boot backend structured to mirror the SmartERP AI frontend modules:
crm, sales, purchase, inventory, manufacturing, finance, hr, projects,
reports, documents, settings — plus auth, tenant, company, notification, and ai.

## Run
```
./mvnw spring-boot:run
```

## Structure
Package-by-feature. Each business module has its own
controller / service / repository / entity / dto / mapper package,
so it maps 1:1 to the matching frontend module and its *.service.jsx file.
