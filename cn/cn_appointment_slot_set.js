function image_url()
{
	if ( is_disabled )
		return '//base_pict/generic_item_inactive.ico';
	else
		return '//base_pict/generic_item.ico';
}


function CalcSlotsNum()
{
	return 0;
}


function HandleAddNewSlot()
{
	dlgDoc = OpenDoc( '//cn/cn_view_calendar.xml' );
	dlgDoc.TopElem.is_dlg = true;
	dlgDoc.TopElem.select_multi_rows = true;

	Screen.ModalDlg( dlgDoc );

	for ( timeRow in dlgDoc.TopElem.selTimeRows )
		AddDateSlot( dlgDoc.TopElem.sel_date, timeRow.comb_minute, local_settings.calendar_step_length );

	this.Doc.SetChanged( true );
}


function AddDateSlot( date, combMinute, size )
{
	slotDate = slot_dates.ObtainChildByKey( date );

	for ( i = 0; i < slotDate.slots.ChildNum; i++ )
	{
		slot = slotDate.slots[i];

		if ( slot.comb_minute == combMinute )
		{
			slotDate.size = size;
			return;
		}
		
		if ( slot.comb_minute > combMinute )
		{
			slot = slotDate.slots.InsertChild();
			slotDate.size = size;
			slotDate.combMinute = combMinute;
			return;
		}
	}

	slot = slotDate.slots.AddChild();
	slot.comb_minute = combMinute;
	slot.size = size;
}

