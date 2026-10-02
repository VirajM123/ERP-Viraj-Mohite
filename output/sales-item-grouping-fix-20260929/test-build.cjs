const fs=require('fs'), path=require('path'), assert=require('assert/strict');
const dir=__dirname, fields=require('./fields.json');
const full=fs.readFileSync(path.join(dir,'WinImportData.vb'),'utf8');
const helper=fs.readFileSync(path.join(dir,'GroupingHelpers.vb'),'utf8');
const orig=fs.readFileSync('C:/Users/Total Solution/.codex/attachments/9bd4fc6b-7c9d-4915-97f1-b5b11fd91459/Pasted text.txt','utf8');
const sale=orig.slice(orig.indexOf('"Add_Sales"'),orig.indexOf('"Add_Purchase"',orig.indexOf('"Add_Sales"')));
for(const m of sale.matchAll(/Parameters.Add\("@[^"\r\n]+"[^\r\n]*\.Value = (\w+)/g)){
 if(/^str/i.test(m[1]) && !/^(strbt|strmst)/i.test(m[1])) assert(fields.some(([n])=>n.toLowerCase()===m[1].toLowerCase()),m[1]);
}
const normalize=orig.slice(orig.indexOf('    Private Function NormalizeSalesIMEI'),orig.indexOf('    Private Function IsSalesSerialNoProduct'));
const pre=`Imports System
Imports System.Data
Imports System.Collections.Generic
Public Class Grid
 Public Table As DataTable
 Public ReadOnly Property Cols As DataColumnCollection
  Get
   Return Table.Columns
  End Get
 End Property
 Default Public ReadOnly Property Item(ByVal row As Integer, ByVal col As Integer) As Object
  Get
   Return Table.Rows(row - 1)(col)
  End Get
 End Property
End Class
Public Class Combo
 Public SelectedIndex As Integer
End Class
Public Class Checks
 Private CmbEntry As New Combo()
 Private d1 As DataTable
 Private VsfgSelect As New Grid()
 Private ItemCount, start, k As Integer
${fields.map(([n])=>' Private '+n+' As String').join('\n')}
 Private Function PurchaseIMEICell(ByVal row As Integer, ByVal name As String) As String
  Return Convert.ToString(VsfgSelect(row, VsfgSelect.Cols.IndexOf(name)))
 End Function
 Private Function IsSalesSerialNoProduct(ByVal product As Integer) As Boolean
  Return product <> 999
 End Function
 Private Sub Require(ByVal ok As Boolean, ByVal message As String)
  If Not ok Then Throw New Exception(message)
 End Sub
 Private Sub Setup()
  d1 = New DataTable()
  For Each name As String In New String() {"SysProdCode", "SchNo", "Qty", "IMEI"}
   d1.Columns.Add(name)
  Next
  For index As Integer = 1 To 6
   d1.Rows.Add(101, 0, 1, "35000000000000" & index.ToString())
  Next
  VsfgSelect.Table = d1
  start = 1 : k = 6 : ItemCount = 6 : CmbEntry.SelectedIndex = 0
${fields.map(([n,w])=>`  ${n} = String.Concat(New String() {${Array.from({length:6},()=>`"0".PadRight(${w})`).join(', ')}})`).join('\n')}
  strSeqNo = ""
  For index As Integer = 1 To 6
   strSeqNo &= index.ToString().PadRight(20)
  Next
  strProdId = String.Concat(New String() {"101".PadRight(20), "202".PadRight(20), "101".PadRight(20), "101".PadRight(20), "101".PadRight(20), "101".PadRight(20)})
  d1.Rows(1)("SysProdCode") = 202
  strQty = New String(" "c, 0)
  strOQty = "" : strAmt = "" : StrCGST = "" : StrSGST = "" : strSchAmt = "" : strVatAmt = ""
  For index As Integer = 1 To 6
   strQty &= "1.000".PadRight(20)
   strOQty &= "1.000".PadRight(20)
   strAmt &= "100.01".PadRight(20)
   StrCGST &= "9.01".PadRight(20)
   StrSGST &= "9.00".PadRight(20)
   strVatAmt &= "18.01".PadRight(20)
   strSchAmt &= "0.01".PadRight(20)
  Next
 End Sub
 Public Shared Sub Main()
  Dim tests As New Checks()
  tests.Run()
 End Sub
 Private Sub Run()
  Setup()
  GroupSalesIMEIDetailsForSave()
  Require(ItemCount = 2, "five non-adjacent S26 rows -> one line plus second product")
${fields.map(([n,w])=>`  Require(${n}.Length = ItemCount * ${w}, "${n} fixed width preserved")`).join('\n')}
  Require(SalesPayloadNumber(strQty.Substring(0,20)) = 5D, "combined quantity")
  Require(SalesPayloadNumber(strAmt.Substring(0,20)) = 500.05D, "amount total")
  Require(SalesPayloadNumber(StrCGST.Substring(0,20)) = 45.05D, "original tax rounding preserved")
  Require(SalesPayloadNumber(strSchAmt.Substring(0,20)) = 0.05D, "discount summed")
  Require(SalesGroupedSerialSeq(1) = 1 AndAlso SalesGroupedSerialSeq(6) = 1 AndAlso SalesGroupedSerialSeq(2) = 2, "all five IMEIs use same detail sequence")
  Require(d1.Rows.Count = 6 AndAlso CInt(d1.Rows(0)("Qty")) = 1, "source validation input unchanged")
  Setup() : CmbEntry.SelectedIndex = 1
  GroupSalesIMEIDetailsForSave()
  Require(ItemCount = 6 AndAlso SalesGroupedSerialSeq.Count = 0, "purchase bypass and stale mapping cleared")
  Setup() : d1.Columns.Remove("IMEI")
  GroupSalesIMEIDetailsForSave()
  Require(ItemCount = 6, "no IMEI bypass")
  Setup()
  strRate = "99.0000".PadRight(20) & strRate.Substring(20)
  GroupSalesIMEIDetailsForSave()
  Require(ItemCount = 3, "different selling rate separate")
  Setup()
  strBatch = "BATCH2".PadRight(20) & strBatch.Substring(20)
  GroupSalesIMEIDetailsForSave()
  Require(ItemCount = 3, "different batch separate")
  Setup()
  strVat = "18.00".PadRight(20) & strVat.Substring(20)
  GroupSalesIMEIDetailsForSave()
  Require(ItemCount = 3, "different tax separate")
  Setup()
  d1.Rows(0)("Qty") = 2
  d1.Rows(0)("IMEI") = "350000000000001|350000000000007"
  strQty = "2.000".PadRight(20) & strQty.Substring(20)
  strOQty = "2.000".PadRight(20) & strOQty.Substring(20)
  GroupSalesIMEIDetailsForSave()
  Require(SalesPayloadNumber(strQty.Substring(0,20)) = 6D AndAlso GetSalesIMEIList(d1.Rows(0)("IMEI")).Count = 2, "already combined IMEI rows remain supported")
  Setup()
  For Each row As DataRow In d1.Rows
   row("SysProdCode") = 999
  Next
  GroupSalesIMEIDetailsForSave()
  Require(ItemCount = 6, "nonserial product unchanged")
  Setup()
  d1.Rows(0)("IMEI") = ""
  GroupSalesIMEIDetailsForSave()
  Require(ItemCount = 3, "blank serial preserved for existing validation")
  Setup()
  d1.Rows(5)("IMEI") = d1.Rows(0)("IMEI")
  GroupSalesIMEIDetailsForSave()
  Require(CStr(d1.Rows(5)("IMEI")) = CStr(d1.Rows(0)("IMEI")), "duplicate IMEI retained for rejection")
  Setup()
  strQty = "broken"
  Dim rejected As Boolean = False
  Try
   GroupSalesIMEIDetailsForSave()
  Catch ex As InvalidOperationException
   rejected = True
  End Try
  Require(rejected, "malformed payload rejected")
  Setup()
  GroupSalesIMEIDetailsForSave()
  Setup()
  For index As Integer = 0 To 5
   d1.Rows(index)("SysProdCode") = 999
  Next
  GroupSalesIMEIDetailsForSave()
  Require(SalesGroupedSerialSeq.Count = 0, "mapping does not leak across bills")
  Console.WriteLine("PASS: actual VB helper compiled; grouping, totals, tax rounding, serial sequence mapping, separation, purchase/nonserial bypass, validation input preservation and retry reset.")
 End Sub
`;
fs.writeFileSync(path.join(dir,'Checks.vb'),pre+helper+'\n'+normalize+'\nEnd Class\n');
console.log('All Add_Sales detail strings covered; executable VB tests generated.');
