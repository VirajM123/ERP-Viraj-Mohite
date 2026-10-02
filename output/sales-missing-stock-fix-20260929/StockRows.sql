SET NOCOUNT ON;
IF UPPER(LTRIM(RTRIM(@AllowNegativeStock))) IN ('Y','YES','TRUE','1')
BEGIN
    DECLARE @StockIndex int = 0, @StockOffset int;
    WHILE @StockIndex < @Times
    BEGIN
        SET @StockOffset = @StockIndex * 20 + 1;
        IF RTRIM(SUBSTRING(@strEntType,@StockOffset,20)) = 'SAL'
        BEGIN
            INSERT INTO Mas_Stock
                (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
            SELECT @GDCode, s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,'N',
                CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
            FROM (SELECT
                CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                CONVERT(varchar(20),SUBSTRING(@StrBatch,@StockOffset,20)) AS Batch,
                CONVERT(decimal(18,2),SUBSTRING(@StrMRP,@StockOffset,20)) AS MRP,
                CONVERT(datetime,SUBSTRING(@StrExpDt,@StockOffset,20)) AS ExpDt,
                CONVERT(datetime,SUBSTRING(@StrMfgDt,@StockOffset,20)) AS MfgDt) s
            WHERE NOT EXISTS (SELECT 1 FROM Mas_Stock WITH (UPDLOCK,HOLDLOCK)
                WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);

            IF CONVERT(decimal(18,3),SUBSTRING(@StrFrQty,@StockOffset,20)) <> 0
            BEGIN
                INSERT INTO Mas_Stock
                    (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)
                SELECT @GDCode,s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt,
                    CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20)),
                    CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,'N',
                    CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20)),
                    CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))
                FROM (SELECT
                    CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode,
                    CONVERT(varchar(20),SUBSTRING(@StrFrBatch,@StockOffset,20)) AS Batch,
                    CONVERT(decimal(18,2),SUBSTRING(@StrFrMrp,@StockOffset,20)) AS MRP,
                    CONVERT(datetime,SUBSTRING(@StrFrExpDt,@StockOffset,20)) AS ExpDt,
                    CONVERT(datetime,SUBSTRING(@StrFrMfgdt,@StockOffset,20)) AS MfgDt) s
                WHERE NOT EXISTS (SELECT 1 FROM Mas_Stock WITH (UPDLOCK,HOLDLOCK)
                    WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);
            END;
        END;
        SET @StockIndex = @StockIndex + 1;
    END;
END;