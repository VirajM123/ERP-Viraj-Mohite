Imports System
Imports System.Data
Imports System.Data.SqlClient
Public Class CompileCheck
    'Seed only missing sales stock keys; Add_Sales performs the quantity deduction.
    'Use the final fixed-width payload so IMEI grouping and saved keys stay identical.
    Private Sub EnsureSalesImportStockRows(ByVal salesCommand As SqlCommand)
        Using stockCommand As New SqlCommand()
            stockCommand.Connection = salesCommand.Connection
            stockCommand.Transaction = salesCommand.Transaction
            stockCommand.CommandTimeout = salesCommand.CommandTimeout
            stockCommand.CommandText = _
                "SET NOCOUNT ON;" & vbCrLf & _
                "IF UPPER(LTRIM(RTRIM(@AllowNegativeStock))) IN ('Y','YES','TRUE','1')" & vbCrLf & _
                "BEGIN" & vbCrLf & _
                "    DECLARE @StockIndex int = 0, @StockOffset int;" & vbCrLf & _
                "    WHILE @StockIndex < @Times" & vbCrLf & _
                "    BEGIN" & vbCrLf & _
                "        SET @StockOffset = @StockIndex * 20 + 1;" & vbCrLf & _
                "        IF RTRIM(SUBSTRING(@strEntType,@StockOffset,20)) = 'SAL'" & vbCrLf & _
                "        BEGIN" & vbCrLf & _
                "            INSERT INTO Mas_Stock" & vbCrLf & _
                "                (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)" & vbCrLf & _
                "            SELECT @GDCode, s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt," & vbCrLf & _
                "                CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20))," & vbCrLf & _
                "                CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,'N'," & vbCrLf & _
                "                CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20))," & vbCrLf & _
                "                CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))" & vbCrLf & _
                "            FROM (SELECT" & vbCrLf & _
                "                CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode," & vbCrLf & _
                "                CONVERT(varchar(20),SUBSTRING(@StrBatch,@StockOffset,20)) AS Batch," & vbCrLf & _
                "                CONVERT(decimal(18,2),SUBSTRING(@StrMRP,@StockOffset,20)) AS MRP," & vbCrLf & _
                "                CONVERT(datetime,SUBSTRING(@StrExpDt,@StockOffset,20)) AS ExpDt," & vbCrLf & _
                "                CONVERT(datetime,SUBSTRING(@StrMfgDt,@StockOffset,20)) AS MfgDt) s" & vbCrLf & _
                "            WHERE NOT EXISTS (SELECT 1 FROM Mas_Stock WITH (UPDLOCK,HOLDLOCK)" & vbCrLf & _
                "                WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);" & vbCrLf & _
                "" & vbCrLf & _
                "            IF CONVERT(decimal(18,3),SUBSTRING(@StrFrQty,@StockOffset,20)) <> 0" & vbCrLf & _
                "            BEGIN" & vbCrLf & _
                "                INSERT INTO Mas_Stock" & vbCrLf & _
                "                    (GDCode,SysProdCode,Batch,MRP,ExpDt,MfgDt,PRate,SRate,Qty,IsLocked,BoxPack,InBoxPack)" & vbCrLf & _
                "                SELECT @GDCode,s.SysProdCode,s.Batch,s.MRP,s.ExpDt,s.MfgDt," & vbCrLf & _
                "                    CONVERT(decimal(18,2),SUBSTRING(@StrPRate,@StockOffset,20))," & vbCrLf & _
                "                    CONVERT(decimal(18,2),SUBSTRING(@StrSRate,@StockOffset,20)),0,'N'," & vbCrLf & _
                "                    CONVERT(int,SUBSTRING(@StrBoxPack,@StockOffset,20))," & vbCrLf & _
                "                    CONVERT(int,SUBSTRING(@StrInBoxPack,@StockOffset,20))" & vbCrLf & _
                "                FROM (SELECT" & vbCrLf & _
                "                    CONVERT(int,SUBSTRING(@StrSysProdCode,@StockOffset,20)) AS SysProdCode," & vbCrLf & _
                "                    CONVERT(varchar(20),SUBSTRING(@StrFrBatch,@StockOffset,20)) AS Batch," & vbCrLf & _
                "                    CONVERT(decimal(18,2),SUBSTRING(@StrFrMrp,@StockOffset,20)) AS MRP," & vbCrLf & _
                "                    CONVERT(datetime,SUBSTRING(@StrFrExpDt,@StockOffset,20)) AS ExpDt," & vbCrLf & _
                "                    CONVERT(datetime,SUBSTRING(@StrFrMfgdt,@StockOffset,20)) AS MfgDt) s" & vbCrLf & _
                "                WHERE NOT EXISTS (SELECT 1 FROM Mas_Stock WITH (UPDLOCK,HOLDLOCK)" & vbCrLf & _
                "                    WHERE GDCode=@GDCode AND SysProdCode=s.SysProdCode AND Batch=s.Batch AND MRP=s.MRP);" & vbCrLf & _
                "            END;" & vbCrLf & _
                "        END;" & vbCrLf & _
                "        SET @StockIndex = @StockIndex + 1;" & vbCrLf & _
                "    END;" & vbCrLf & _
                "END;"
            Dim names As String() = {"@AllowNegativeStock", "@Times", "@strEntType", "@GDCode", "@StrPRate", "@StrSRate", "@StrBoxPack", "@StrInBoxPack", "@StrSysProdCode", "@StrBatch", "@StrMRP", "@StrExpDt", "@StrMfgDt", "@StrFrQty", "@StrFrBatch", "@StrFrMrp", "@StrFrExpDt", "@StrFrMfgdt"}
            For Each name As String In names
                Dim original As SqlParameter = salesCommand.Parameters(name)
                stockCommand.Parameters.Add(DirectCast(DirectCast(original, ICloneable).Clone(), SqlParameter))
            Next
            stockCommand.ExecuteNonQuery()
        End Using
    End Sub

End Class
