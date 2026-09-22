INSERT INTO product(id,category,name,price)
WITH digits(n) AS (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9),
     sequence_numbers AS (SELECT a.n+10*b.n+100*c.n+1000*d.n AS n
                          FROM digits a CROSS JOIN digits b CROSS JOIN digits c CROSS JOIN digits d)
SELECT n+1, ELT(MOD(n,4)+1,'books','electronics','games','office'), CONCAT('Demo product ',n+1), 10.00+MOD(n,200)
FROM sequence_numbers;
INSERT INTO product_detail(product_id,description)
SELECT id, CONCAT('Deterministic catalog item ',id,'. ',REPEAT('Measured catalog detail. ',10)) FROM product;
