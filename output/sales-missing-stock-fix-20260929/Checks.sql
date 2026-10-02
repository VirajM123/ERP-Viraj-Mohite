SET NOCOUNT ON; SET XACT_ABORT ON;
SELECT TOP (0) * INTO #Stock FROM dbo.Mas_Stock;
DECLARE @AllowNegativeStock varchar(10)='Y', @Times int=1, @GDCode varchar(10)='TEST';
DECLARE @strEntType varchar(max)='SAL                 ';
DECLARE @StrSysProdCode varchar(max)='123                 ';
DECLARE @StrBatch varchar(max)='A''B                 ';
DECLARE @StrMRP varchar(max)='99.50               ';
DECLARE @StrExpDt varchar(max)='                    ';
DECLARE @StrMfgDt varchar(max)='                    ';
DECLARE @StrPRate varchar(max)='70                  ';
DECLARE @StrSRate varchar(max)='80                  ';
DECLARE @StrBoxPack varchar(max)='12                  ';
DECLARE @StrInBoxPack varchar(max)='1                   ';
DECLARE @StrFrQty varchar(max)='0                   ';
DECLARE @StrFrBatch varchar(max)='FREE                ';
DECLARE @StrFrMrp varchar(max)='0                   ';
DECLARE @StrFrExpDt varchar(max)='                    ';
DECLARE @StrFrMfgdt varchar(max)='                    ';
BEGIN TRAN;
EXEC sp_executesql N'SET NOCOUNT ON;
IF UPPER(LTRIM(RTRIM(@AllowNegativeStock))) IN (''Y'',''YES'',''TRUE'',''1'')
BEGIN
    DECLARE @StockIndex int = 0, @StockOffset int;
    WHILE @StockIndex < @Times
    BEGIN
        SET @StockOffset = @StockIndex * 20 + 1;
        IF RTRIM(SUBSTRING(@strEntType,@StockOffset,20)) = ''SAL''
        BEGIN
            INSERT INTO #Stock
                (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
            SELECT @GDCode, s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
            FROM (SELECT
                CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                CONVERT(varchar(20),SUBSTRING(@StrBatch,@StockOffset,20)) AS Batch,
                CONVERT(decimal(18,2),SUBSTRING(@StrMRP,@StockOffset,20)) AS MRP,
                CONVERT(datetime,SUBSTRING(@StrExpDt,@StockOffset,20)) AS ExpDt,
                CONVERT(datetime,SUBSTRING(@StrMfgDt,@StockOffset,20)) AS MfgDt) s
            WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);

            IF CONVERT(decimal(18,3),SUBSTRING(@StrFrQty,@StockOffset,20)) <> 0
            BEGIN
                INSERT INTO #Stock
                    (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
                SELECT @GDCode,s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                    CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                    CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                    CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                    CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
                FROM (SELECT
                    CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                    CONVERT(varchar(20),SUBSTRING(@StrFrBatch,@StockOffset,20)) AS Batch,
                    CONVERT(decimal(18,2),SUBSTRING(@StrFrMrp,@StockOffset,20)) AS MRP,
                    CONVERT(datetime,SUBSTRING(@StrFrExpDt,@StockOffset,20)) AS ExpDt,
                    CONVERT(datetime,SUBSTRING(@StrFrMfgdt,@StockOffset,20)) AS MfgDt) s
                WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                    WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);
            END;
        END;
        SET @StockIndex = @StockIndex + 1;
    END;
END;', N'@AllowNegativeStock varchar(max),@Times int,@GDCode varchar(max),@strEntType varchar(max),@StrSysProdCode varchar(max),@StrBatch varchar(max),@StrMRP varchar(max),@StrExpDt varchar(max),@StrMfgDt varchar(max),@StrPRate varchar(max),@StrSRate varchar(max),@StrBoxPack varchar(max),@StrInBoxPack varchar(max),@StrFrQty varchar(max),@StrFrBatch varchar(max),@StrFrMrp varchar(max),@StrFrExpDt varchar(max),@StrFrMfgdt varchar(max)', @AllowNegativeStock,@Times,@GDCode,@strEntType,@StrSysProdCode,@StrBatch,@StrMRP,@StrExpDt,@StrMfgDt,@StrPRate,@StrSRate,@StrBoxPack,@StrInBoxPack,@StrFrQty,@StrFrBatch,@StrFrMrp,@StrFrExpDt,@StrFrMfgdt;
IF (SELECT COUNT(*) FROM #Stock)<>1 THROW 50000,'Missing key not inserted',1;
IF NOT EXISTS(SELECT 1 FROM #Stock WHERE MRP=99.50 AND Batch='A''B' AND Qty=0 AND IsLocked='N') THROW 50000,'Incorrect seeded values',1;
UPDATE #Stock SET Qty=Qty-5;
EXEC sp_executesql N'SET NOCOUNT ON;
IF UPPER(LTRIM(RTRIM(@AllowNegativeStock))) IN (''Y'',''YES'',''TRUE'',''1'')
BEGIN
    DECLARE @StockIndex int = 0, @StockOffset int;
    WHILE @StockIndex < @Times
    BEGIN
        SET @StockOffset = @StockIndex * 20 + 1;
        IF RTRIM(SUBSTRING(@strEntType,@StockOffset,20)) = ''SAL''
        BEGIN
            INSERT INTO #Stock
                (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
            SELECT @GDCode, s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
            FROM (SELECT
                CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                CONVERT(varchar(20),SUBSTRING(@StrBatch,@StockOffset,20)) AS Batch,
                CONVERT(decimal(18,2),SUBSTRING(@StrMRP,@StockOffset,20)) AS MRP,
                CONVERT(datetime,SUBSTRING(@StrExpDt,@StockOffset,20)) AS ExpDt,
                CONVERT(datetime,SUBSTRING(@StrMfgDt,@StockOffset,20)) AS MfgDt) s
            WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);

            IF CONVERT(decimal(18,3),SUBSTRING(@StrFrQty,@StockOffset,20)) <> 0
            BEGIN
                INSERT INTO #Stock
                    (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
                SELECT @GDCode,s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                    CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                    CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                    CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                    CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
                FROM (SELECT
                    CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                    CONVERT(varchar(20),SUBSTRING(@StrFrBatch,@StockOffset,20)) AS Batch,
                    CONVERT(decimal(18,2),SUBSTRING(@StrFrMrp,@StockOffset,20)) AS MRP,
                    CONVERT(datetime,SUBSTRING(@StrFrExpDt,@StockOffset,20)) AS ExpDt,
                    CONVERT(datetime,SUBSTRING(@StrFrMfgdt,@StockOffset,20)) AS MfgDt) s
                WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                    WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);
            END;
        END;
        SET @StockIndex = @StockIndex + 1;
    END;
END;', N'@AllowNegativeStock varchar(max),@Times int,@GDCode varchar(max),@strEntType varchar(max),@StrSysProdCode varchar(max),@StrBatch varchar(max),@StrMRP varchar(max),@StrExpDt varchar(max),@StrMfgDt varchar(max),@StrPRate varchar(max),@StrSRate varchar(max),@StrBoxPack varchar(max),@StrInBoxPack varchar(max),@StrFrQty varchar(max),@StrFrBatch varchar(max),@StrFrMrp varchar(max),@StrFrExpDt varchar(max),@StrFrMfgdt varchar(max)', @AllowNegativeStock,@Times,@GDCode,@strEntType,@StrSysProdCode,@StrBatch,@StrMRP,@StrExpDt,@StrMfgDt,@StrPRate,@StrSRate,@StrBoxPack,@StrInBoxPack,@StrFrQty,@StrFrBatch,@StrFrMrp,@StrFrExpDt,@StrFrMfgdt;
IF (SELECT COUNT(*) FROM #Stock)<>1 OR (SELECT Qty FROM #Stock)<>-5 THROW 50000,'Existing stock changed',1;
SET @GDCode='SECOND';
EXEC sp_executesql N'SET NOCOUNT ON;
IF UPPER(LTRIM(RTRIM(@AllowNegativeStock))) IN (''Y'',''YES'',''TRUE'',''1'')
BEGIN
    DECLARE @StockIndex int = 0, @StockOffset int;
    WHILE @StockIndex < @Times
    BEGIN
        SET @StockOffset = @StockIndex * 20 + 1;
        IF RTRIM(SUBSTRING(@strEntType,@StockOffset,20)) = ''SAL''
        BEGIN
            INSERT INTO #Stock
                (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
            SELECT @GDCode, s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
            FROM (SELECT
                CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                CONVERT(varchar(20),SUBSTRING(@StrBatch,@StockOffset,20)) AS Batch,
                CONVERT(decimal(18,2),SUBSTRING(@StrMRP,@StockOffset,20)) AS MRP,
                CONVERT(datetime,SUBSTRING(@StrExpDt,@StockOffset,20)) AS ExpDt,
                CONVERT(datetime,SUBSTRING(@StrMfgDt,@StockOffset,20)) AS MfgDt) s
            WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);

            IF CONVERT(decimal(18,3),SUBSTRING(@StrFrQty,@StockOffset,20)) <> 0
            BEGIN
                INSERT INTO #Stock
                    (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
                SELECT @GDCode,s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                    CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                    CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                    CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                    CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
                FROM (SELECT
                    CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                    CONVERT(varchar(20),SUBSTRING(@StrFrBatch,@StockOffset,20)) AS Batch,
                    CONVERT(decimal(18,2),SUBSTRING(@StrFrMrp,@StockOffset,20)) AS MRP,
                    CONVERT(datetime,SUBSTRING(@StrFrExpDt,@StockOffset,20)) AS ExpDt,
                    CONVERT(datetime,SUBSTRING(@StrFrMfgdt,@StockOffset,20)) AS MfgDt) s
                WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                    WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);
            END;
        END;
        SET @StockIndex = @StockIndex + 1;
    END;
END;', N'@AllowNegativeStock varchar(max),@Times int,@GDCode varchar(max),@strEntType varchar(max),@StrSysProdCode varchar(max),@StrBatch varchar(max),@StrMRP varchar(max),@StrExpDt varchar(max),@StrMfgDt varchar(max),@StrPRate varchar(max),@StrSRate varchar(max),@StrBoxPack varchar(max),@StrInBoxPack varchar(max),@StrFrQty varchar(max),@StrFrBatch varchar(max),@StrFrMrp varchar(max),@StrFrExpDt varchar(max),@StrFrMfgdt varchar(max)', @AllowNegativeStock,@Times,@GDCode,@strEntType,@StrSysProdCode,@StrBatch,@StrMRP,@StrExpDt,@StrMfgDt,@StrPRate,@StrSRate,@StrBoxPack,@StrInBoxPack,@StrFrQty,@StrFrBatch,@StrFrMrp,@StrFrExpDt,@StrFrMfgdt;
IF (SELECT COUNT(*) FROM #Stock)<>2 THROW 50000,'Godown key mismatch',1;
SET @StrMRP=LEFT('0'+SPACE(20),20); SET @StrFrQty=LEFT('2'+SPACE(20),20);
EXEC sp_executesql N'SET NOCOUNT ON;
IF UPPER(LTRIM(RTRIM(@AllowNegativeStock))) IN (''Y'',''YES'',''TRUE'',''1'')
BEGIN
    DECLARE @StockIndex int = 0, @StockOffset int;
    WHILE @StockIndex < @Times
    BEGIN
        SET @StockOffset = @StockIndex * 20 + 1;
        IF RTRIM(SUBSTRING(@strEntType,@StockOffset,20)) = ''SAL''
        BEGIN
            INSERT INTO #Stock
                (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
            SELECT @GDCode, s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
            FROM (SELECT
                CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                CONVERT(varchar(20),SUBSTRING(@StrBatch,@StockOffset,20)) AS Batch,
                CONVERT(decimal(18,2),SUBSTRING(@StrMRP,@StockOffset,20)) AS MRP,
                CONVERT(datetime,SUBSTRING(@StrExpDt,@StockOffset,20)) AS ExpDt,
                CONVERT(datetime,SUBSTRING(@StrMfgDt,@StockOffset,20)) AS MfgDt) s
            WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);

            IF CONVERT(decimal(18,3),SUBSTRING(@StrFrQty,@StockOffset,20)) <> 0
            BEGIN
                INSERT INTO #Stock
                    (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
                SELECT @GDCode,s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                    CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                    CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                    CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                    CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
                FROM (SELECT
                    CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                    CONVERT(varchar(20),SUBSTRING(@StrFrBatch,@StockOffset,20)) AS Batch,
                    CONVERT(decimal(18,2),SUBSTRING(@StrFrMrp,@StockOffset,20)) AS MRP,
                    CONVERT(datetime,SUBSTRING(@StrFrExpDt,@StockOffset,20)) AS ExpDt,
                    CONVERT(datetime,SUBSTRING(@StrFrMfgdt,@StockOffset,20)) AS MfgDt) s
                WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                    WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);
            END;
        END;
        SET @StockIndex = @StockIndex + 1;
    END;
END;', N'@AllowNegativeStock varchar(max),@Times int,@GDCode varchar(max),@strEntType varchar(max),@StrSysProdCode varchar(max),@StrBatch varchar(max),@StrMRP varchar(max),@StrExpDt varchar(max),@StrMfgDt varchar(max),@StrPRate varchar(max),@StrSRate varchar(max),@StrBoxPack varchar(max),@StrInBoxPack varchar(max),@StrFrQty varchar(max),@StrFrBatch varchar(max),@StrFrMrp varchar(max),@StrFrExpDt varchar(max),@StrFrMfgdt varchar(max)', @AllowNegativeStock,@Times,@GDCode,@strEntType,@StrSysProdCode,@StrBatch,@StrMRP,@StrExpDt,@StrMfgDt,@StrPRate,@StrSRate,@StrBoxPack,@StrInBoxPack,@StrFrQty,@StrFrBatch,@StrFrMrp,@StrFrExpDt,@StrFrMfgdt;
IF (SELECT COUNT(*) FROM #Stock)<>4 THROW 50000,'Zero MRP or free stock missing',1;
SET @StrBatch=LEFT('SKIPPED'+SPACE(20),20); SET @strEntType=LEFT('GDR'+SPACE(20),20);
EXEC sp_executesql N'SET NOCOUNT ON;
IF UPPER(LTRIM(RTRIM(@AllowNegativeStock))) IN (''Y'',''YES'',''TRUE'',''1'')
BEGIN
    DECLARE @StockIndex int = 0, @StockOffset int;
    WHILE @StockIndex < @Times
    BEGIN
        SET @StockOffset = @StockIndex * 20 + 1;
        IF RTRIM(SUBSTRING(@strEntType,@StockOffset,20)) = ''SAL''
        BEGIN
            INSERT INTO #Stock
                (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
            SELECT @GDCode, s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
            FROM (SELECT
                CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                CONVERT(varchar(20),SUBSTRING(@StrBatch,@StockOffset,20)) AS Batch,
                CONVERT(decimal(18,2),SUBSTRING(@StrMRP,@StockOffset,20)) AS MRP,
                CONVERT(datetime,SUBSTRING(@StrExpDt,@StockOffset,20)) AS ExpDt,
                CONVERT(datetime,SUBSTRING(@StrMfgDt,@StockOffset,20)) AS MfgDt) s
            WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);

            IF CONVERT(decimal(18,3),SUBSTRING(@StrFrQty,@StockOffset,20)) <> 0
            BEGIN
                INSERT INTO #Stock
                    (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
                SELECT @GDCode,s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                    CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                    CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                    CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                    CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
                FROM (SELECT
                    CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                    CONVERT(varchar(20),SUBSTRING(@StrFrBatch,@StockOffset,20)) AS Batch,
                    CONVERT(decimal(18,2),SUBSTRING(@StrFrMrp,@StockOffset,20)) AS MRP,
                    CONVERT(datetime,SUBSTRING(@StrFrExpDt,@StockOffset,20)) AS ExpDt,
                    CONVERT(datetime,SUBSTRING(@StrFrMfgdt,@StockOffset,20)) AS MfgDt) s
                WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                    WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);
            END;
        END;
        SET @StockIndex = @StockIndex + 1;
    END;
END;', N'@AllowNegativeStock varchar(max),@Times int,@GDCode varchar(max),@strEntType varchar(max),@StrSysProdCode varchar(max),@StrBatch varchar(max),@StrMRP varchar(max),@StrExpDt varchar(max),@StrMfgDt varchar(max),@StrPRate varchar(max),@StrSRate varchar(max),@StrBoxPack varchar(max),@StrInBoxPack varchar(max),@StrFrQty varchar(max),@StrFrBatch varchar(max),@StrFrMrp varchar(max),@StrFrExpDt varchar(max),@StrFrMfgdt varchar(max)', @AllowNegativeStock,@Times,@GDCode,@strEntType,@StrSysProdCode,@StrBatch,@StrMRP,@StrExpDt,@StrMfgDt,@StrPRate,@StrSRate,@StrBoxPack,@StrInBoxPack,@StrFrQty,@StrFrBatch,@StrFrMrp,@StrFrExpDt,@StrFrMfgdt;
IF (SELECT COUNT(*) FROM #Stock)<>4 THROW 50000,'Return path changed',1;
SET @strEntType=LEFT('SAL'+SPACE(20),20); SET @AllowNegativeStock='N';
EXEC sp_executesql N'SET NOCOUNT ON;
IF UPPER(LTRIM(RTRIM(@AllowNegativeStock))) IN (''Y'',''YES'',''TRUE'',''1'')
BEGIN
    DECLARE @StockIndex int = 0, @StockOffset int;
    WHILE @StockIndex < @Times
    BEGIN
        SET @StockOffset = @StockIndex * 20 + 1;
        IF RTRIM(SUBSTRING(@strEntType,@StockOffset,20)) = ''SAL''
        BEGIN
            INSERT INTO #Stock
                (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
            SELECT @GDCode, s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
            FROM (SELECT
                CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                CONVERT(varchar(20),SUBSTRING(@StrBatch,@StockOffset,20)) AS Batch,
                CONVERT(decimal(18,2),SUBSTRING(@StrMRP,@StockOffset,20)) AS MRP,
                CONVERT(datetime,SUBSTRING(@StrExpDt,@StockOffset,20)) AS ExpDt,
                CONVERT(datetime,SUBSTRING(@StrMfgDt,@StockOffset,20)) AS MfgDt) s
            WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);

            IF CONVERT(decimal(18,3),SUBSTRING(@StrFrQty,@StockOffset,20)) <> 0
            BEGIN
                INSERT INTO #Stock
                    (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
                SELECT @GDCode,s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                    CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                    CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,''N'',
                    CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                    CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
                FROM (SELECT
                    CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                    CONVERT(varchar(20),SUBSTRING(@StrFrBatch,@StockOffset,20)) AS Batch,
                    CONVERT(decimal(18,2),SUBSTRING(@StrFrMrp,@StockOffset,20)) AS MRP,
                    CONVERT(datetime,SUBSTRING(@StrFrExpDt,@StockOffset,20)) AS ExpDt,
                    CONVERT(datetime,SUBSTRING(@StrFrMfgdt,@StockOffset,20)) AS MfgDt) s
                WHERE NOT EXISTS (SELECT 1 FROM #Stock WITH (UPDLOCK,HOLDLOCK)
                    WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);
            END;
        END;
        SET @StockIndex = @StockIndex + 1;
    END;
END;', N'@AllowNegativeStock varchar(max),@Times int,@GDCode varchar(max),@strEntType varchar(max),@StrSysProdCode varchar(max),@StrBatch varchar(max),@StrMRP varchar(max),@StrExpDt varchar(max),@StrMfgDt varchar(max),@StrPRate varchar(max),@StrSRate varchar(max),@StrBoxPack varchar(max),@StrInBoxPack varchar(max),@StrFrQty varchar(max),@StrFrBatch varchar(max),@StrFrMrp varchar(max),@StrFrExpDt varchar(max),@StrFrMfgdt varchar(max)', @AllowNegativeStock,@Times,@GDCode,@strEntType,@StrSysProdCode,@StrBatch,@StrMRP,@StrExpDt,@StrMfgDt,@StrPRate,@StrSRate,@StrBoxPack,@StrInBoxPack,@StrFrQty,@StrFrBatch,@StrFrMrp,@StrFrExpDt,@StrFrMfgdt;
IF (SELECT COUNT(*) FROM #Stock)<>4 THROW 50000,'Negative disabled path changed',1;
ROLLBACK;
IF EXISTS(SELECT 1 FROM #Stock) THROW 50000,'Rollback left stock rows',1;
PRINT 'PASS: missing/zero MRP, quoted batch, duplicate preservation, negative deduction, godown, free stock, return bypass, setting bypass, rollback.';
