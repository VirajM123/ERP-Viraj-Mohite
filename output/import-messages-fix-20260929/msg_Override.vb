Imports System.Windows.Forms

Public Class msg_Override
    Private SelectionMade As Boolean = False

    Private Sub SelectOverride(ByVal result As DialogResult)
        SelectionMade = True
        Me.DialogResult = result
        Me.Close()
    End Sub

    Private Sub Yes_Button_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Yes_Button.Click
        SelectOverride(DialogResult.Yes) 'Override All
    End Sub

    Private Sub No_Button_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles No_Button.Click
        SelectOverride(DialogResult.No) 'Override Only Edit Bills (changed NetAmt)
    End Sub

    Private Sub Cancel_Button_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Cancel_Button.Click
        SelectOverride(DialogResult.Cancel) 'Update One by One Bill
    End Sub

    Private Sub BtnNewRecord_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles BtnNewRecord.Click
        SelectOverride(DialogResult.OK) 'New Records Only
    End Sub

    Protected Overrides Sub OnFormClosing(ByVal e As FormClosingEventArgs)
        'The title-bar X must not be mistaken for the one-by-one button.
        If Not SelectionMade Then Me.DialogResult = DialogResult.Abort
        MyBase.OnFormClosing(e)
    End Sub
End Class
