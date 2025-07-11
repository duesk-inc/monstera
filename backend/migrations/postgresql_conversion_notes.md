# PostgreSQL Migration Notes

## AUTO_INCREMENT → SERIAL Conversion

### Summary
Converted 2 occurrences of AUTO_INCREMENT to PostgreSQL SERIAL type:

1. **industries** table (line 3): `id INT AUTO_INCREMENT` → `id SERIAL`
2. **processes** table (line 13): `id INT AUTO_INCREMENT` → `id SERIAL`

### Key Changes Made:

1. **AUTO_INCREMENT → SERIAL**
   - MySQL: `id INT AUTO_INCREMENT PRIMARY KEY`
   - PostgreSQL: `id SERIAL PRIMARY KEY`

2. **Removed MySQL-specific syntax**
   - Removed `ENGINE=InnoDB`
   - Removed `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
   - Removed `CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci` from column definitions
   - Removed `COMMENT` clauses (PostgreSQL uses COMMENT ON separately)

3. **Removed ON UPDATE CURRENT_TIMESTAMP**
   - PostgreSQL doesn't support this directly
   - Will need to be implemented with triggers in a later task

4. **Changed DATETIME(3) to TIMESTAMP(3)**
   - MySQL: `DATETIME(3)`
   - PostgreSQL: `TIMESTAMP(3)`

5. **Added sequence reset commands**
   - After inserting explicit IDs, reset sequences:
   ```sql
   SELECT setval('industries_id_seq', (SELECT MAX(id) FROM industries));
   SELECT setval('processes_id_seq', (SELECT MAX(id) FROM processes));
   ```

### Notes:
- Most tables already use UUID (VARCHAR(36)) as primary keys, which is PostgreSQL-compatible
- Only master tables (industries, processes) use auto-incrementing integers
- The INSERT statements with explicit IDs work with SERIAL columns, but sequences need to be reset afterward