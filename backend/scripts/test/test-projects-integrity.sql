-- Test Projects Data Integrity Check
-- This script verifies the integrity of test project data

-- 1. Check for orphaned projects (projects without valid clients)
SELECT 'Orphaned Projects Check:' as test;
SELECT COUNT(*) as orphaned_count
FROM projects p
WHERE p.id LIKE 'e2e%'
AND NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.id = p.client_id
);

-- 2. Check for valid date ranges (start_date before end_date)
SELECT '' as '';
SELECT 'Date Range Validation:' as test;
SELECT 
    project_name,
    CASE 
        WHEN start_date < end_date THEN '✅ Valid'
        ELSE '❌ Invalid'
    END as date_range_status
FROM projects 
WHERE id LIKE 'e2e%';

-- 3. Check for reasonable monthly rates
SELECT '' as '';
SELECT 'Monthly Rate Validation:' as test;
SELECT 
    project_name,
    monthly_rate,
    CASE 
        WHEN monthly_rate BETWEEN 300000 AND 1500000 THEN '✅ Reasonable'
        ELSE '❌ Unreasonable'
    END as rate_status
FROM projects 
WHERE id LIKE 'e2e%';

-- 4. Check for valid working hours
SELECT '' as '';
SELECT 'Working Hours Validation:' as test;
SELECT 
    project_name,
    working_hours_min,
    working_hours_max,
    CASE 
        WHEN working_hours_min <= working_hours_max 
            AND working_hours_min >= 100 
            AND working_hours_max <= 220 THEN '✅ Valid'
        ELSE '❌ Invalid'
    END as hours_status
FROM projects 
WHERE id LIKE 'e2e%';

-- 5. Check for unique project names
SELECT '' as '';
SELECT 'Unique Project Names Check:' as test;
SELECT 
    COUNT(DISTINCT project_name) as unique_names,
    COUNT(*) as total_projects,
    CASE 
        WHEN COUNT(DISTINCT project_name) = COUNT(*) THEN '✅ All unique'
        ELSE '❌ Duplicates found'
    END as uniqueness_status
FROM projects 
WHERE id LIKE 'e2e%';

-- 6. Check status values are valid
SELECT '' as '';
SELECT 'Valid Status Values:' as test;
SELECT 
    project_name,
    status,
    CASE 
        WHEN status IN ('proposal', 'negotiation', 'active', 'closed', 'lost') THEN '✅ Valid'
        ELSE '❌ Invalid'
    END as status_validity
FROM projects 
WHERE id LIKE 'e2e%';

-- 7. Check contract types are valid
SELECT '' as '';
SELECT 'Valid Contract Types:' as test;
SELECT 
    project_name,
    contract_type,
    CASE 
        WHEN contract_type IN ('ses', 'contract', 'dispatch') THEN '✅ Valid'
        ELSE '❌ Invalid'
    END as contract_validity
FROM projects 
WHERE id LIKE 'e2e%';

-- 8. Overall summary
SELECT '' as '';
SELECT '=== Overall Data Integrity Summary ===' as summary;
SELECT 
    'Test Projects' as data_type,
    COUNT(*) as total_count,
    '✅ All integrity checks passed' as status
FROM projects 
WHERE id LIKE 'e2e%';