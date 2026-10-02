Imports System
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
 Private strSeqNo As String
 Private strTrn As String
 Private strProdId As String
 Private strProdCode As String
 Private strProdName As String
 Private strBatch As String
 Private strMRP As String
 Private strExpDt As String
 Private strMfgDt As String
 Private strUnit As String
 Private strQty As String
 Private strFrQty As String
 Private strRate As String
 Private strAmt As String
 Private strTPRPer As String
 Private strTPRAmt As String
 Private StrSchPer As String
 Private strSchAmt As String
 Private StrCDPer As String
 Private strCDAmt As String
 Private StrTaxable As String
 Private strBtmAmt As String
 Private strStarAmt As String
 Private strVat As String
 Private strVatAmt As String
 Private strVatType As String
 Private strWeight As String
 Private strPrCompCode As String
 Private strBox As String
 Private strInBox As String
 Private strBoxNm As String
 Private strInBoxNm As String
 Private strSchNo As String
 Private strSchName As String
 Private strSRate As String
 Private strPRate As String
 Private strLoadQty As String
 Private strLoadFrQty As String
 Private strOQty As String
 Private strORate As String
 Private strRatePer As String
 Private strFrBatch As String
 Private strFrMrp As String
 Private strFrExpDt As String
 Private strFrMfgDt As String
 Private strRelation As String
 Private strAddOthAmt As String
 Private strLessOthAmt As String
 Private strACode As String
 Private StrSalPrCode As String
 Private StrSalRetPrCode As String
 Private StrVatPrCode As String
 Private StrMTPer As String
 Private StrCess As String
 Private StrCessAmt As String
 Private StrCessPerPCS As String
 Private StrCessPerPCSAmt As String
 Private StrCGST As String
 Private StrSGST As String
 Private StrIGST As String
 Private StrCGSTSysAcCode As String
 Private StrSGSTSysAcCode As String
 Private StrIGSTSysAcCode As String
 Private StrCrateSize As String
 Private StrCrateQty As String
 Private StrCrateSysProdCode As String
 Private StrStarPer1 As String
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
  strSeqNo = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strTrn = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strProdId = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strProdCode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strProdName = String.Concat(New String() {"0".PadRight(40), "0".PadRight(40), "0".PadRight(40), "0".PadRight(40), "0".PadRight(40), "0".PadRight(40)})
  strBatch = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strMRP = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strExpDt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strMfgDt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strUnit = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strQty = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strFrQty = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strRate = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strTPRPer = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strTPRAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrSchPer = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strSchAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCDPer = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strCDAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrTaxable = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strBtmAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strStarAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strVat = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strVatAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strVatType = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strWeight = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strPrCompCode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strBox = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strInBox = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strBoxNm = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strInBoxNm = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strSchNo = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strSchName = String.Concat(New String() {"0".PadRight(50), "0".PadRight(50), "0".PadRight(50), "0".PadRight(50), "0".PadRight(50), "0".PadRight(50)})
  strSRate = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strPRate = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strLoadQty = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strLoadFrQty = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strOQty = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strORate = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strRatePer = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strFrBatch = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strFrMrp = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strFrExpDt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strFrMfgDt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strRelation = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strAddOthAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strLessOthAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  strACode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrSalPrCode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrSalRetPrCode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrVatPrCode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrMTPer = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCess = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCessAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCessPerPCS = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCessPerPCSAmt = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCGST = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrSGST = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrIGST = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCGSTSysAcCode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrSGSTSysAcCode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrIGSTSysAcCode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCrateSize = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCrateQty = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrCrateSysProdCode = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
  StrStarPer1 = String.Concat(New String() {"0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20), "0".PadRight(20)})
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
  Require(strSeqNo.Length = ItemCount * 20, "strSeqNo fixed width preserved")
  Require(strTrn.Length = ItemCount * 20, "strTrn fixed width preserved")
  Require(strProdId.Length = ItemCount * 20, "strProdId fixed width preserved")
  Require(strProdCode.Length = ItemCount * 20, "strProdCode fixed width preserved")
  Require(strProdName.Length = ItemCount * 40, "strProdName fixed width preserved")
  Require(strBatch.Length = ItemCount * 20, "strBatch fixed width preserved")
  Require(strMRP.Length = ItemCount * 20, "strMRP fixed width preserved")
  Require(strExpDt.Length = ItemCount * 20, "strExpDt fixed width preserved")
  Require(strMfgDt.Length = ItemCount * 20, "strMfgDt fixed width preserved")
  Require(strUnit.Length = ItemCount * 20, "strUnit fixed width preserved")
  Require(strQty.Length = ItemCount * 20, "strQty fixed width preserved")
  Require(strFrQty.Length = ItemCount * 20, "strFrQty fixed width preserved")
  Require(strRate.Length = ItemCount * 20, "strRate fixed width preserved")
  Require(strAmt.Length = ItemCount * 20, "strAmt fixed width preserved")
  Require(strTPRPer.Length = ItemCount * 20, "strTPRPer fixed width preserved")
  Require(strTPRAmt.Length = ItemCount * 20, "strTPRAmt fixed width preserved")
  Require(StrSchPer.Length = ItemCount * 20, "StrSchPer fixed width preserved")
  Require(strSchAmt.Length = ItemCount * 20, "strSchAmt fixed width preserved")
  Require(StrCDPer.Length = ItemCount * 20, "StrCDPer fixed width preserved")
  Require(strCDAmt.Length = ItemCount * 20, "strCDAmt fixed width preserved")
  Require(StrTaxable.Length = ItemCount * 20, "StrTaxable fixed width preserved")
  Require(strBtmAmt.Length = ItemCount * 20, "strBtmAmt fixed width preserved")
  Require(strStarAmt.Length = ItemCount * 20, "strStarAmt fixed width preserved")
  Require(strVat.Length = ItemCount * 20, "strVat fixed width preserved")
  Require(strVatAmt.Length = ItemCount * 20, "strVatAmt fixed width preserved")
  Require(strVatType.Length = ItemCount * 20, "strVatType fixed width preserved")
  Require(strWeight.Length = ItemCount * 20, "strWeight fixed width preserved")
  Require(strPrCompCode.Length = ItemCount * 20, "strPrCompCode fixed width preserved")
  Require(strBox.Length = ItemCount * 20, "strBox fixed width preserved")
  Require(strInBox.Length = ItemCount * 20, "strInBox fixed width preserved")
  Require(strBoxNm.Length = ItemCount * 20, "strBoxNm fixed width preserved")
  Require(strInBoxNm.Length = ItemCount * 20, "strInBoxNm fixed width preserved")
  Require(strSchNo.Length = ItemCount * 20, "strSchNo fixed width preserved")
  Require(strSchName.Length = ItemCount * 50, "strSchName fixed width preserved")
  Require(strSRate.Length = ItemCount * 20, "strSRate fixed width preserved")
  Require(strPRate.Length = ItemCount * 20, "strPRate fixed width preserved")
  Require(strLoadQty.Length = ItemCount * 20, "strLoadQty fixed width preserved")
  Require(strLoadFrQty.Length = ItemCount * 20, "strLoadFrQty fixed width preserved")
  Require(strOQty.Length = ItemCount * 20, "strOQty fixed width preserved")
  Require(strORate.Length = ItemCount * 20, "strORate fixed width preserved")
  Require(strRatePer.Length = ItemCount * 20, "strRatePer fixed width preserved")
  Require(strFrBatch.Length = ItemCount * 20, "strFrBatch fixed width preserved")
  Require(strFrMrp.Length = ItemCount * 20, "strFrMrp fixed width preserved")
  Require(strFrExpDt.Length = ItemCount * 20, "strFrExpDt fixed width preserved")
  Require(strFrMfgDt.Length = ItemCount * 20, "strFrMfgDt fixed width preserved")
  Require(strRelation.Length = ItemCount * 20, "strRelation fixed width preserved")
  Require(strAddOthAmt.Length = ItemCount * 20, "strAddOthAmt fixed width preserved")
  Require(strLessOthAmt.Length = ItemCount * 20, "strLessOthAmt fixed width preserved")
  Require(strACode.Length = ItemCount * 20, "strACode fixed width preserved")
  Require(StrSalPrCode.Length = ItemCount * 20, "StrSalPrCode fixed width preserved")
  Require(StrSalRetPrCode.Length = ItemCount * 20, "StrSalRetPrCode fixed width preserved")
  Require(StrVatPrCode.Length = ItemCount * 20, "StrVatPrCode fixed width preserved")
  Require(StrMTPer.Length = ItemCount * 20, "StrMTPer fixed width preserved")
  Require(StrCess.Length = ItemCount * 20, "StrCess fixed width preserved")
  Require(StrCessAmt.Length = ItemCount * 20, "StrCessAmt fixed width preserved")
  Require(StrCessPerPCS.Length = ItemCount * 20, "StrCessPerPCS fixed width preserved")
  Require(StrCessPerPCSAmt.Length = ItemCount * 20, "StrCessPerPCSAmt fixed width preserved")
  Require(StrCGST.Length = ItemCount * 20, "StrCGST fixed width preserved")
  Require(StrSGST.Length = ItemCount * 20, "StrSGST fixed width preserved")
  Require(StrIGST.Length = ItemCount * 20, "StrIGST fixed width preserved")
  Require(StrCGSTSysAcCode.Length = ItemCount * 20, "StrCGSTSysAcCode fixed width preserved")
  Require(StrSGSTSysAcCode.Length = ItemCount * 20, "StrSGSTSysAcCode fixed width preserved")
  Require(StrIGSTSysAcCode.Length = ItemCount * 20, "StrIGSTSysAcCode fixed width preserved")
  Require(StrCrateSize.Length = ItemCount * 20, "StrCrateSize fixed width preserved")
  Require(StrCrateQty.Length = ItemCount * 20, "StrCrateQty fixed width preserved")
  Require(StrCrateSysProdCode.Length = ItemCount * 20, "StrCrateSysProdCode fixed width preserved")
  Require(StrStarPer1.Length = ItemCount * 20, "StrStarPer1 fixed width preserved")
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
    'Sales-only consolidation of the ALREADY CALCULATED stored-procedure payload.
    'Source rows, invoice totals, tax rounding, validation and purchase code stay intact.
    Private SalesGroupedSerialSeq As New System.Collections.Generic.Dictionary(Of Integer, Integer)()

    Private Sub GroupSalesIMEIDetailsForSave()
        SalesGroupedSerialSeq.Clear()
        If CmbEntry.SelectedIndex <> 0 OrElse d1 Is Nothing OrElse Not d1.Columns.Contains("IMEI") OrElse ItemCount < 2 Then Return
        Dim sourceRows As New System.Collections.Generic.List(Of Integer)()
        For row As Integer = start To k
            If Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "SysProdCode")) > 0 AndAlso Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "SchNo")) = 0 Then sourceRows.Add(row)
        Next
        If sourceRows.Count <> ItemCount Then Throw New InvalidOperationException("Sales detail/source row count mismatch.")
        Dim payload As New DataTable()
        payload.Columns.Add("strSeqNo", GetType(String))
        If strSeqNo.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strSeqNo")
        payload.Columns.Add("strTrn", GetType(String))
        If strTrn.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strTrn")
        payload.Columns.Add("strProdId", GetType(String))
        If strProdId.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strProdId")
        payload.Columns.Add("strProdCode", GetType(String))
        If strProdCode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strProdCode")
        payload.Columns.Add("strProdName", GetType(String))
        If strProdName.Length <> ItemCount * 40 Then Throw New InvalidOperationException("Sales detail length mismatch: strProdName")
        payload.Columns.Add("strBatch", GetType(String))
        If strBatch.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strBatch")
        payload.Columns.Add("strMRP", GetType(String))
        If strMRP.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strMRP")
        payload.Columns.Add("strExpDt", GetType(String))
        If strExpDt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strExpDt")
        payload.Columns.Add("strMfgDt", GetType(String))
        If strMfgDt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strMfgDt")
        payload.Columns.Add("strUnit", GetType(String))
        If strUnit.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strUnit")
        payload.Columns.Add("strQty", GetType(String))
        If strQty.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strQty")
        payload.Columns.Add("strFrQty", GetType(String))
        If strFrQty.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strFrQty")
        payload.Columns.Add("strRate", GetType(String))
        If strRate.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strRate")
        payload.Columns.Add("strAmt", GetType(String))
        If strAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strAmt")
        payload.Columns.Add("strTPRPer", GetType(String))
        If strTPRPer.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strTPRPer")
        payload.Columns.Add("strTPRAmt", GetType(String))
        If strTPRAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strTPRAmt")
        payload.Columns.Add("StrSchPer", GetType(String))
        If StrSchPer.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrSchPer")
        payload.Columns.Add("strSchAmt", GetType(String))
        If strSchAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strSchAmt")
        payload.Columns.Add("StrCDPer", GetType(String))
        If StrCDPer.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCDPer")
        payload.Columns.Add("strCDAmt", GetType(String))
        If strCDAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strCDAmt")
        payload.Columns.Add("StrTaxable", GetType(String))
        If StrTaxable.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrTaxable")
        payload.Columns.Add("strBtmAmt", GetType(String))
        If strBtmAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strBtmAmt")
        payload.Columns.Add("strStarAmt", GetType(String))
        If strStarAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strStarAmt")
        payload.Columns.Add("strVat", GetType(String))
        If strVat.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strVat")
        payload.Columns.Add("strVatAmt", GetType(String))
        If strVatAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strVatAmt")
        payload.Columns.Add("strVatType", GetType(String))
        If strVatType.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strVatType")
        payload.Columns.Add("strWeight", GetType(String))
        If strWeight.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strWeight")
        payload.Columns.Add("strPrCompCode", GetType(String))
        If strPrCompCode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strPrCompCode")
        payload.Columns.Add("strBox", GetType(String))
        If strBox.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strBox")
        payload.Columns.Add("strInBox", GetType(String))
        If strInBox.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strInBox")
        payload.Columns.Add("strBoxNm", GetType(String))
        If strBoxNm.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strBoxNm")
        payload.Columns.Add("strInBoxNm", GetType(String))
        If strInBoxNm.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strInBoxNm")
        payload.Columns.Add("strSchNo", GetType(String))
        If strSchNo.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strSchNo")
        payload.Columns.Add("strSchName", GetType(String))
        If strSchName.Length <> ItemCount * 50 Then Throw New InvalidOperationException("Sales detail length mismatch: strSchName")
        payload.Columns.Add("strSRate", GetType(String))
        If strSRate.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strSRate")
        payload.Columns.Add("strPRate", GetType(String))
        If strPRate.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strPRate")
        payload.Columns.Add("strLoadQty", GetType(String))
        If strLoadQty.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strLoadQty")
        payload.Columns.Add("strLoadFrQty", GetType(String))
        If strLoadFrQty.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strLoadFrQty")
        payload.Columns.Add("strOQty", GetType(String))
        If strOQty.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strOQty")
        payload.Columns.Add("strORate", GetType(String))
        If strORate.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strORate")
        payload.Columns.Add("strRatePer", GetType(String))
        If strRatePer.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strRatePer")
        payload.Columns.Add("strFrBatch", GetType(String))
        If strFrBatch.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strFrBatch")
        payload.Columns.Add("strFrMrp", GetType(String))
        If strFrMrp.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strFrMrp")
        payload.Columns.Add("strFrExpDt", GetType(String))
        If strFrExpDt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strFrExpDt")
        payload.Columns.Add("strFrMfgDt", GetType(String))
        If strFrMfgDt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strFrMfgDt")
        payload.Columns.Add("strRelation", GetType(String))
        If strRelation.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strRelation")
        payload.Columns.Add("strAddOthAmt", GetType(String))
        If strAddOthAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strAddOthAmt")
        payload.Columns.Add("strLessOthAmt", GetType(String))
        If strLessOthAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strLessOthAmt")
        payload.Columns.Add("strACode", GetType(String))
        If strACode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: strACode")
        payload.Columns.Add("StrSalPrCode", GetType(String))
        If StrSalPrCode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrSalPrCode")
        payload.Columns.Add("StrSalRetPrCode", GetType(String))
        If StrSalRetPrCode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrSalRetPrCode")
        payload.Columns.Add("StrVatPrCode", GetType(String))
        If StrVatPrCode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrVatPrCode")
        payload.Columns.Add("StrMTPer", GetType(String))
        If StrMTPer.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrMTPer")
        payload.Columns.Add("StrCess", GetType(String))
        If StrCess.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCess")
        payload.Columns.Add("StrCessAmt", GetType(String))
        If StrCessAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCessAmt")
        payload.Columns.Add("StrCessPerPCS", GetType(String))
        If StrCessPerPCS.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCessPerPCS")
        payload.Columns.Add("StrCessPerPCSAmt", GetType(String))
        If StrCessPerPCSAmt.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCessPerPCSAmt")
        payload.Columns.Add("StrCGST", GetType(String))
        If StrCGST.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCGST")
        payload.Columns.Add("StrSGST", GetType(String))
        If StrSGST.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrSGST")
        payload.Columns.Add("StrIGST", GetType(String))
        If StrIGST.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrIGST")
        payload.Columns.Add("StrCGSTSysAcCode", GetType(String))
        If StrCGSTSysAcCode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCGSTSysAcCode")
        payload.Columns.Add("StrSGSTSysAcCode", GetType(String))
        If StrSGSTSysAcCode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrSGSTSysAcCode")
        payload.Columns.Add("StrIGSTSysAcCode", GetType(String))
        If StrIGSTSysAcCode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrIGSTSysAcCode")
        payload.Columns.Add("StrCrateSize", GetType(String))
        If StrCrateSize.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCrateSize")
        payload.Columns.Add("StrCrateQty", GetType(String))
        If StrCrateQty.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCrateQty")
        payload.Columns.Add("StrCrateSysProdCode", GetType(String))
        If StrCrateSysProdCode.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrCrateSysProdCode")
        payload.Columns.Add("StrStarPer1", GetType(String))
        If StrStarPer1.Length <> ItemCount * 20 Then Throw New InvalidOperationException("Sales detail length mismatch: StrStarPer1")
        Dim eligible As New System.Collections.Generic.List(Of Boolean)()
        Dim serialProducts As New System.Collections.Generic.Dictionary(Of Integer, Boolean)()
        For detailIndex As Integer = 0 To sourceRows.Count - 1
            Dim record As DataRow = payload.NewRow()
            record("strSeqNo") = strSeqNo.Substring(detailIndex * 20, 20)
            record("strTrn") = strTrn.Substring(detailIndex * 20, 20)
            record("strProdId") = strProdId.Substring(detailIndex * 20, 20)
            record("strProdCode") = strProdCode.Substring(detailIndex * 20, 20)
            record("strProdName") = strProdName.Substring(detailIndex * 40, 40)
            record("strBatch") = strBatch.Substring(detailIndex * 20, 20)
            record("strMRP") = strMRP.Substring(detailIndex * 20, 20)
            record("strExpDt") = strExpDt.Substring(detailIndex * 20, 20)
            record("strMfgDt") = strMfgDt.Substring(detailIndex * 20, 20)
            record("strUnit") = strUnit.Substring(detailIndex * 20, 20)
            record("strQty") = strQty.Substring(detailIndex * 20, 20)
            record("strFrQty") = strFrQty.Substring(detailIndex * 20, 20)
            record("strRate") = strRate.Substring(detailIndex * 20, 20)
            record("strAmt") = strAmt.Substring(detailIndex * 20, 20)
            record("strTPRPer") = strTPRPer.Substring(detailIndex * 20, 20)
            record("strTPRAmt") = strTPRAmt.Substring(detailIndex * 20, 20)
            record("StrSchPer") = StrSchPer.Substring(detailIndex * 20, 20)
            record("strSchAmt") = strSchAmt.Substring(detailIndex * 20, 20)
            record("StrCDPer") = StrCDPer.Substring(detailIndex * 20, 20)
            record("strCDAmt") = strCDAmt.Substring(detailIndex * 20, 20)
            record("StrTaxable") = StrTaxable.Substring(detailIndex * 20, 20)
            record("strBtmAmt") = strBtmAmt.Substring(detailIndex * 20, 20)
            record("strStarAmt") = strStarAmt.Substring(detailIndex * 20, 20)
            record("strVat") = strVat.Substring(detailIndex * 20, 20)
            record("strVatAmt") = strVatAmt.Substring(detailIndex * 20, 20)
            record("strVatType") = strVatType.Substring(detailIndex * 20, 20)
            record("strWeight") = strWeight.Substring(detailIndex * 20, 20)
            record("strPrCompCode") = strPrCompCode.Substring(detailIndex * 20, 20)
            record("strBox") = strBox.Substring(detailIndex * 20, 20)
            record("strInBox") = strInBox.Substring(detailIndex * 20, 20)
            record("strBoxNm") = strBoxNm.Substring(detailIndex * 20, 20)
            record("strInBoxNm") = strInBoxNm.Substring(detailIndex * 20, 20)
            record("strSchNo") = strSchNo.Substring(detailIndex * 20, 20)
            record("strSchName") = strSchName.Substring(detailIndex * 50, 50)
            record("strSRate") = strSRate.Substring(detailIndex * 20, 20)
            record("strPRate") = strPRate.Substring(detailIndex * 20, 20)
            record("strLoadQty") = strLoadQty.Substring(detailIndex * 20, 20)
            record("strLoadFrQty") = strLoadFrQty.Substring(detailIndex * 20, 20)
            record("strOQty") = strOQty.Substring(detailIndex * 20, 20)
            record("strORate") = strORate.Substring(detailIndex * 20, 20)
            record("strRatePer") = strRatePer.Substring(detailIndex * 20, 20)
            record("strFrBatch") = strFrBatch.Substring(detailIndex * 20, 20)
            record("strFrMrp") = strFrMrp.Substring(detailIndex * 20, 20)
            record("strFrExpDt") = strFrExpDt.Substring(detailIndex * 20, 20)
            record("strFrMfgDt") = strFrMfgDt.Substring(detailIndex * 20, 20)
            record("strRelation") = strRelation.Substring(detailIndex * 20, 20)
            record("strAddOthAmt") = strAddOthAmt.Substring(detailIndex * 20, 20)
            record("strLessOthAmt") = strLessOthAmt.Substring(detailIndex * 20, 20)
            record("strACode") = strACode.Substring(detailIndex * 20, 20)
            record("StrSalPrCode") = StrSalPrCode.Substring(detailIndex * 20, 20)
            record("StrSalRetPrCode") = StrSalRetPrCode.Substring(detailIndex * 20, 20)
            record("StrVatPrCode") = StrVatPrCode.Substring(detailIndex * 20, 20)
            record("StrMTPer") = StrMTPer.Substring(detailIndex * 20, 20)
            record("StrCess") = StrCess.Substring(detailIndex * 20, 20)
            record("StrCessAmt") = StrCessAmt.Substring(detailIndex * 20, 20)
            record("StrCessPerPCS") = StrCessPerPCS.Substring(detailIndex * 20, 20)
            record("StrCessPerPCSAmt") = StrCessPerPCSAmt.Substring(detailIndex * 20, 20)
            record("StrCGST") = StrCGST.Substring(detailIndex * 20, 20)
            record("StrSGST") = StrSGST.Substring(detailIndex * 20, 20)
            record("StrIGST") = StrIGST.Substring(detailIndex * 20, 20)
            record("StrCGSTSysAcCode") = StrCGSTSysAcCode.Substring(detailIndex * 20, 20)
            record("StrSGSTSysAcCode") = StrSGSTSysAcCode.Substring(detailIndex * 20, 20)
            record("StrIGSTSysAcCode") = StrIGSTSysAcCode.Substring(detailIndex * 20, 20)
            record("StrCrateSize") = StrCrateSize.Substring(detailIndex * 20, 20)
            record("StrCrateQty") = StrCrateQty.Substring(detailIndex * 20, 20)
            record("StrCrateSysProdCode") = StrCrateSysProdCode.Substring(detailIndex * 20, 20)
            record("StrStarPer1") = StrStarPer1.Substring(detailIndex * 20, 20)
            payload.Rows.Add(record)
            Dim row As Integer = sourceRows(detailIndex)
            Dim product As Integer = CInt(Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "SysProdCode")))
            Dim hasIMEI As Boolean = GetSalesIMEIList(VsfgSelect(row, VsfgSelect.Cols.IndexOf("IMEI"))).Count > 0
            Dim canGroup As Boolean = False
            If hasIMEI AndAlso Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "Qty")) > 0 Then
                If Not serialProducts.ContainsKey(product) Then serialProducts.Add(product, IsSalesSerialNoProduct(product))
                canGroup = serialProducts(product)
            End If
            eligible.Add(canGroup)
        Next
        Dim sequenceMap As New System.Collections.Generic.List(Of Integer)()
        Dim grouped As DataTable = ConsolidateSalesPayload(payload, eligible, sequenceMap)
        If grouped.Rows.Count = payload.Rows.Count Then Return
        'Build every output before publishing the source-row-to-detail mapping.
        strSeqNo = JoinSalesPayload(grouped, "strSeqNo")
        strTrn = JoinSalesPayload(grouped, "strTrn")
        strProdId = JoinSalesPayload(grouped, "strProdId")
        strProdCode = JoinSalesPayload(grouped, "strProdCode")
        strProdName = JoinSalesPayload(grouped, "strProdName")
        strBatch = JoinSalesPayload(grouped, "strBatch")
        strMRP = JoinSalesPayload(grouped, "strMRP")
        strExpDt = JoinSalesPayload(grouped, "strExpDt")
        strMfgDt = JoinSalesPayload(grouped, "strMfgDt")
        strUnit = JoinSalesPayload(grouped, "strUnit")
        strQty = JoinSalesPayload(grouped, "strQty")
        strFrQty = JoinSalesPayload(grouped, "strFrQty")
        strRate = JoinSalesPayload(grouped, "strRate")
        strAmt = JoinSalesPayload(grouped, "strAmt")
        strTPRPer = JoinSalesPayload(grouped, "strTPRPer")
        strTPRAmt = JoinSalesPayload(grouped, "strTPRAmt")
        StrSchPer = JoinSalesPayload(grouped, "StrSchPer")
        strSchAmt = JoinSalesPayload(grouped, "strSchAmt")
        StrCDPer = JoinSalesPayload(grouped, "StrCDPer")
        strCDAmt = JoinSalesPayload(grouped, "strCDAmt")
        StrTaxable = JoinSalesPayload(grouped, "StrTaxable")
        strBtmAmt = JoinSalesPayload(grouped, "strBtmAmt")
        strStarAmt = JoinSalesPayload(grouped, "strStarAmt")
        strVat = JoinSalesPayload(grouped, "strVat")
        strVatAmt = JoinSalesPayload(grouped, "strVatAmt")
        strVatType = JoinSalesPayload(grouped, "strVatType")
        strWeight = JoinSalesPayload(grouped, "strWeight")
        strPrCompCode = JoinSalesPayload(grouped, "strPrCompCode")
        strBox = JoinSalesPayload(grouped, "strBox")
        strInBox = JoinSalesPayload(grouped, "strInBox")
        strBoxNm = JoinSalesPayload(grouped, "strBoxNm")
        strInBoxNm = JoinSalesPayload(grouped, "strInBoxNm")
        strSchNo = JoinSalesPayload(grouped, "strSchNo")
        strSchName = JoinSalesPayload(grouped, "strSchName")
        strSRate = JoinSalesPayload(grouped, "strSRate")
        strPRate = JoinSalesPayload(grouped, "strPRate")
        strLoadQty = JoinSalesPayload(grouped, "strLoadQty")
        strLoadFrQty = JoinSalesPayload(grouped, "strLoadFrQty")
        strOQty = JoinSalesPayload(grouped, "strOQty")
        strORate = JoinSalesPayload(grouped, "strORate")
        strRatePer = JoinSalesPayload(grouped, "strRatePer")
        strFrBatch = JoinSalesPayload(grouped, "strFrBatch")
        strFrMrp = JoinSalesPayload(grouped, "strFrMrp")
        strFrExpDt = JoinSalesPayload(grouped, "strFrExpDt")
        strFrMfgDt = JoinSalesPayload(grouped, "strFrMfgDt")
        strRelation = JoinSalesPayload(grouped, "strRelation")
        strAddOthAmt = JoinSalesPayload(grouped, "strAddOthAmt")
        strLessOthAmt = JoinSalesPayload(grouped, "strLessOthAmt")
        strACode = JoinSalesPayload(grouped, "strACode")
        StrSalPrCode = JoinSalesPayload(grouped, "StrSalPrCode")
        StrSalRetPrCode = JoinSalesPayload(grouped, "StrSalRetPrCode")
        StrVatPrCode = JoinSalesPayload(grouped, "StrVatPrCode")
        StrMTPer = JoinSalesPayload(grouped, "StrMTPer")
        StrCess = JoinSalesPayload(grouped, "StrCess")
        StrCessAmt = JoinSalesPayload(grouped, "StrCessAmt")
        StrCessPerPCS = JoinSalesPayload(grouped, "StrCessPerPCS")
        StrCessPerPCSAmt = JoinSalesPayload(grouped, "StrCessPerPCSAmt")
        StrCGST = JoinSalesPayload(grouped, "StrCGST")
        StrSGST = JoinSalesPayload(grouped, "StrSGST")
        StrIGST = JoinSalesPayload(grouped, "StrIGST")
        StrCGSTSysAcCode = JoinSalesPayload(grouped, "StrCGSTSysAcCode")
        StrSGSTSysAcCode = JoinSalesPayload(grouped, "StrSGSTSysAcCode")
        StrIGSTSysAcCode = JoinSalesPayload(grouped, "StrIGSTSysAcCode")
        StrCrateSize = JoinSalesPayload(grouped, "StrCrateSize")
        StrCrateQty = JoinSalesPayload(grouped, "StrCrateQty")
        StrCrateSysProdCode = JoinSalesPayload(grouped, "StrCrateSysProdCode")
        StrStarPer1 = JoinSalesPayload(grouped, "StrStarPer1")
        ItemCount = grouped.Rows.Count
        For detailIndex As Integer = 0 To sourceRows.Count - 1
            SalesGroupedSerialSeq.Add(sourceRows(detailIndex), sequenceMap(detailIndex))
        Next
    End Sub

    Private Function ConsolidateSalesPayload(ByVal payload As DataTable, ByVal eligible As System.Collections.Generic.List(Of Boolean), ByVal sequenceMap As System.Collections.Generic.List(Of Integer)) As DataTable
        Dim sums As New System.Collections.Generic.HashSet(Of String)(StringComparer.OrdinalIgnoreCase)
        For Each name As String In New String() {"strQty", "strFrQty", "strAmt", "strTPRAmt", "strSchAmt", "strCDAmt", "strBtmAmt", "strStarAmt", "StrTaxable", "strVatAmt", "strLoadQty", "strLoadFrQty", "strOQty", "strAddOthAmt", "strLessOthAmt", "StrCessAmt", "StrCessPerPCSAmt", "StrCGST", "StrSGST", "StrIGST", "StrCrateQty"}
            sums.Add(name)
        Next
        Dim result As DataTable = payload.Clone()
        Dim groups As New System.Collections.Generic.Dictionary(Of String, Integer)(StringComparer.Ordinal)
        sequenceMap.Clear()
        For index As Integer = 0 To payload.Rows.Count - 1
            Dim source As DataRow = payload.Rows(index)
            Dim key As New System.Text.StringBuilder()
            'Every non-additive field must match: product, batch, rates, tax,
            'discount percentages, unit, dates, accounts and scheme metadata.
            For Each column As DataColumn In payload.Columns
                If column.ColumnName <> "strSeqNo" AndAlso Not sums.Contains(column.ColumnName) Then
                    Dim value As String = CStr(source(column))
                    key.Append(value.Length).Append(":"c).Append(value)
                End If
            Next
            Dim groupKey As String = key.ToString()
            Dim targetIndex As Integer
            If eligible(index) AndAlso groups.TryGetValue(groupKey, targetIndex) Then
                Dim target As DataRow = result.Rows(targetIndex)
                For Each name As String In sums
                    Dim total As Decimal = SalesPayloadNumber(CStr(target(name))) + SalesPayloadNumber(CStr(source(name)))
                    target(name) = SalesPayloadField(total)
                Next
            Else
                targetIndex = result.Rows.Count
                result.ImportRow(source)
                result.Rows(targetIndex)("strSeqNo") = SalesPayloadField(targetIndex + 1)
                If eligible(index) Then groups.Add(groupKey, targetIndex)
            End If
            sequenceMap.Add(targetIndex + 1)
        Next
        Return result
    End Function

    Private Function SalesPayloadNumber(ByVal value As String) As Decimal
        'Match the existing VB Format/Conversions culture used by MakeStringSal.
        Return Decimal.Parse(value.Trim(), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.CurrentCulture)
    End Function

    Private Function SalesPayloadField(ByVal value As Decimal) As String
        Dim text As String = value.ToString("0.############################", System.Globalization.CultureInfo.CurrentCulture)
        If text.Length > 20 Then Throw New InvalidOperationException("Grouped sales value exceeds the 20-character detail field.")
        Return text.PadRight(20)
    End Function

    Private Function JoinSalesPayload(ByVal payload As DataTable, ByVal name As String) As String
        Dim result As New System.Text.StringBuilder()
        For Each row As DataRow In payload.Rows
            result.Append(CStr(row(name)))
        Next
        Return result.ToString()
    End Function

    Private Function NormalizeSalesIMEI(ByVal RawIMEI As Object) As String
        Try
            If RawIMEI Is Nothing OrElse IsDBNull(RawIMEI) Then Return ""

            If IsNumeric(RawIMEI) Then
                Try
                    Return Convert.ToDecimal(RawIMEI).ToString("0")
                Catch
                    Return RawIMEI.ToString().Trim()
                End Try
            End If

            Return RawIMEI.ToString().Trim()
        Catch
            Return ""
        End Try
    End Function

    Private Function GetSalesIMEIList(ByVal RawIMEI As Object) As System.Collections.Generic.List(Of String)
        Dim Result As New System.Collections.Generic.List(Of String)()

        Dim IMEIText As String = NormalizeSalesIMEI(RawIMEI)
        If IMEIText = "" Then Return Result

        Dim Normalized As String = IMEIText.Replace(vbCrLf, "|")
        Normalized = Normalized.Replace(vbCr, "|")
        Normalized = Normalized.Replace(vbLf, "|")
        Normalized = Normalized.Replace(",", "|")
        Normalized = Normalized.Replace(";", "|")

        Dim Parts() As String = Normalized.Split("|"c)

        For Each Part As String In Parts
            Dim OneIMEI As String = Part.Trim()
            If OneIMEI <> "" Then
                Result.Add(OneIMEI)
            End If
        Next

        Return Result
    End Function


End Class
