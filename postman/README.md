# Postman Role-Based API Check

## Files

- `CK_Franchise_Workflows.postman_collection.json`
- `local.postman_environment.json`

## Import

1. Open Postman.
2. Import both files above.
3. Select environment `Local - CK Franchise`.
4. Update credentials in environment variables (username/password for each role).

## Run by role

Each folder starts with `Login - <Role>`.

Run folders in this order:

1. `01 - Store Staff`
2. `02 - Central Kitchen`
3. `03 - Supply Coordinator`
4. `04 - Manager`
5. `05 - Admin`

## Notes

- `baseUrl` default is `http://localhost:5001/api`.
- Login requests automatically save role tokens to environment variables:
  - `storeToken`, `centralToken`, `supplyToken`, `managerToken`, `adminToken`.
- Update `deliveryDate` before running Supply folder.

## Optional: Newman CLI

```bash
newman run postman/CK_Franchise_Workflows.postman_collection.json -e postman/local.postman_environment.json
```
