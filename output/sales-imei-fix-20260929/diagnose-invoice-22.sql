-- Read-only: run against the SAME server/database displayed by the importer.
SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName;

DECLARE @IMEI varchar(100) = '359470360571444';
SELECT TS.*, MP.ProdCode, MP.ProdName,
       LEN(TS.ProdSrNo) AS SerialLength,
       DATALENGTH(TS.ProdSrNo) AS SerialBytes
FROM T_SerialNo TS
LEFT JOIN Mas_Product MP ON MP.SysProdCode = TS.SysProdCode
WHERE LTRIM(RTRIM(TS.ProdSrNo)) = @IMEI;

SELECT SysProdCode, ProdCode, ProdName, ProdType
FROM Mas_Product WHERE SysProdCode = 189;

SELECT * FROM T_CommonProduct WHERE SysProdCode = 189;

-- Compare these results with the import grid's SysProdCode and ProdCode.
-- If the import reads a different IMEI (for example a rounded Excel value),
-- restore that value from the source as text; do not guess missing digits.
