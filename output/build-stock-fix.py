from pathlib import Path
src = Path(r'C:\Users\Total Solution\.codex\attachments\6717701d-31f3-402d-86f0-d7cc47b4222d\Pasted text.txt').read_text(encoding='utf-8-sig')
out = Path('output/sales-missing-stock-fix-20260929')
out.mkdir(exist_ok=True)
sql = '''SET NOCOUNT ON;
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
END;'''
import re
params = list(dict.fromkeys(re.findall(r'@(AllowNegativeStock|Times|strEntType|GDCode|Str\w+)',sql,re.I)))
helper = '''    'Seed only missing sales stock keys; Add_Sales performs the quantity deduction.
    'Use the final fixed-width payload so IMEI grouping and saved keys stay identical.
    Private Sub EnsureSalesImportStockRows(ByVal salesCommand As SqlCommand)
        Using stockCommand As New SqlCommand()
            stockCommand.Connection = salesCommand.Connection
            stockCommand.Transaction = salesCommand.Transaction
            stockCommand.CommandTimeout = salesCommand.CommandTimeout
            stockCommand.CommandText = _
'''
helper += ' & vbCrLf & _\n'.join('                "'+line.replace('"','""')+'"' for line in sql.splitlines())+'\n'
helper += '            Dim names As String() = {'+', '.join('"@'+x+'"' for x in params)+'}\n'
helper += '''            For Each name As String In names
                Dim original As SqlParameter = salesCommand.Parameters(name)
                stockCommand.Parameters.Add(DirectCast(DirectCast(original, ICloneable).Clone(), SqlParameter))
            Next
            stockCommand.ExecuteNonQuery()
        End Using
    End Sub

'''
anchor='    Private Sub VerifySalesSave(ByVal connection As SqlConnection)'
assert src.count(anchor)==1
modified=src.replace(anchor,helper+anchor.replace('SqlConnection)','SqlConnection, Optional ByVal transaction As SqlTransaction = Nothing)'))
line='        Using command As New SqlCommand("SELECT SysCompCode,SysAcCode,NetAmt FROM T_Sal_Header WHERE TrnNo=@Number AND LTRIM(RTRIM(ISNULL(TrnSeries,\'\'))) =@Series", connection)'
# Only the command within VerifySalesSave receives the optional transaction.
pos=modified.index('    Private Sub VerifySalesSave(')
end=modified.index('    End Sub',pos)
modified=modified[:pos]+modified[pos:end].replace('@Series", connection)','@Series", connection, transaction)')+modified[end:]
old='''                    Try
                        Ultimate.Mod_DataBase.Cmd.ExecuteNonQuery()
                        If SalesImportActive Then VerifySalesSave(Ultimate.Mod_DataBase.Conn)
                    Finally
                        Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)
                    End Try'''
new='''                    Try
                        Using stockTransaction As SqlTransaction = Ultimate.Mod_DataBase.Conn.BeginTransaction()
                            Ultimate.Mod_DataBase.Cmd.Transaction = stockTransaction
                            Try
                                EnsureSalesImportStockRows(Ultimate.Mod_DataBase.Cmd)
                                Dim saveResult As SqlParameter = Ultimate.Mod_DataBase.Cmd.Parameters.Add("@SalesImportReturnValue", SqlDbType.Int)
                                saveResult.Direction = ParameterDirection.ReturnValue
                                Ultimate.Mod_DataBase.Cmd.ExecuteNonQuery()
                                If Convert.ToInt32(saveResult.Value) <> 0 Then
                                    Throw New InvalidOperationException("Add_Sales failed; the bill and new stock rows were rolled back.")
                                End If
                                If SalesImportActive Then VerifySalesSave(Ultimate.Mod_DataBase.Conn, stockTransaction)
                                stockTransaction.Commit()
                            Catch
                                'Add_Sales can already have rolled back the SQL transaction.
                                Try
                                    If stockTransaction.Connection IsNot Nothing Then stockTransaction.Rollback()
                                Catch
                                    'Preserve the original save error.
                                End Try
                                Throw
                            Finally
                                Ultimate.Mod_DataBase.Cmd.Transaction = Nothing
                            End Try
                        End Using
                    Finally
                        Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)
                    End Try'''
assert modified.count(old)==1
modified=modified.replace(old,new)
for name in ['WinImportData.vb','WinImportData.txt']:
    (out/name).write_text(modified,encoding='utf-8-sig',newline='\r\n')
(out/'StockRows.sql').write_text(sql,encoding='utf-8')
# Check all changes are confined to the helper, verification transaction and Sales save.
restored=modified.replace(new,old).replace(helper,'').replace('SqlConnection, Optional ByVal transaction As SqlTransaction = Nothing)','SqlConnection)').replace('@Series", connection, transaction)','@Series", connection)')
assert restored==src
(out/'StockRowsHelper.vb').write_text(helper,encoding='utf-8')
print('Complete files generated; unchanged source verified outside the three intended changes.')
