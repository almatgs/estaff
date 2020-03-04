function HandleCheckPersonSlots( personID )
{
	Int( personID );

	slotSet = ArrayOptFirstElem( XQuery( 'for $elem in appointment_slot_sets where $elem/person_id = ' + XQueryLiteral( personID ) + 'return $elem/Fields( "id" )' ) );
	if ( slotSet != undefined )
	{
		ObtainDocScreen( slotSet.ObjectUrl );
		return;
	}

	slotSetDoc = DefaultDb.OpenNewObjectDoc( 'appointment_slot_set' );
	slotSet = slotSetDoc.TopElem;
	slotSet.person_id = personID;
	slotSetDoc.Save();

	CreateDocScreen( slotSetDoc );
}


function HandleLoadSlotSetFromExtCalendar( slotSet )
{
	if ( ! ras_global_settings.appointment_slots.entry_subject_mask.HasValue )
		throw UiError( UiText.errors.field_is_empty + ': ' + UiText.sections.global_settings + ', ' + UiText.titles.automated_search + ', ' + ras_global_settings.appointment_slots.entry_subject_mask.Title );

	person = slotSet.person_id.ForeignElem;
	if ( ! person.email.HasValue )
		throw UiError( UiText.errors.field_is_empty + ': ' + person.email.Title );

	lib = GetExtCalendarLib();

	if ( ! cn_global_settings.ext_calendar.global_external_account_id.HasValue )
		throw UiError( UiText.errors.field_is_empty + ': ' + UiText.sections.global_settings + ', ' + UiText.titles.calendar + ', ' + cn_global_settings.ext_calendar.global_external_account_id.Title );

	account = OpenDoc( cn_global_settings.ext_calendar.global_external_account_id.ForeignObjectUrl ).TopElem;

	calendarSpec = new Object;
	calendarSpec.SetStrictMode( false );
	calendarSpec.email = person.email;

	qual = new Object;
	qual.SetStrictMode( false );
	qual.min_date = CurDate;

	array = lib.QueryExtCalendarEntries( account, calendarSpec, qual );
	
	slotSet.slot_dates.Clear();

	for ( entry in array )
	{
		if ( ! StrContains( entry.subject, ras_global_settings.appointment_slots.entry_subject_mask, true ) )
			continue;

		combMinute = Hour( entry.date ) * 60 + Minute( entry.date );
		size = DateDiff( entry.end_date, entry.date ) / 60;

		slotSet.AddDateSlot( DateNewTime( entry.date ), combMinute, size );
	}

	slotSet.Doc.SetChanged( true );
}


function GetExtCalendarLib()
{
	if ( ! cn_global_settings.ext_calendar_type_id.HasValue )
		throw UiError( UiText.errors.ext_calendar_not_specified );

	if ( cn_global_settings.ext_calendar_type_id == 'google' )
		libUrl = '//conn_google/google_lib_google_calendar.js';
	else
		throw UserError( 'Extermal calendar is not supported yet' );

	return OpenCodeLib( libUrl );
}


function GetPersonFreeSlots( personID, slotSize, maxAppointmentsPerSlot )
{
	Int( personID );
	destArray = new Array;

	slotSet = ArrayOptFirstElem( XQuery( 'for $elem in appointment_slot_sets where $elem/person_id = ' + XQueryLiteral( personID ) + 'return $elem/Fields( "id" )' ) );
	if ( slotSet == undefined )
		return destArray;
	
	slotSetDoc = OpenDoc( slotSet.ObjectUrl );
	slotSet = slotSetDoc.TopElem;

	curDate = DateNewTime( CurDate );

	for ( slotDate in slotSet.slot_dates )
	{
		if ( slotDate.date <= curDate ) // Exclude today as well
			continue;

		for ( slot in slotDate.slots )
		{
			destCombMinute = ( ( slot.comb_minute + slotSize - 1 ) / slotSize ) * slotSize;
			destSize = slot.size - ( destCombMinute - slot.comb_minute );

			while ( destSize >= slotSize )
			{
				destSlot = new Object;
				destSlot.date = slotDate.date;
				destSlot.comb_minute = destCombMinute;
				destArray.push( destSlot );

				destCombMinute += slotSize;
				destSize -= slotSize;
			}
		}
	}
	
	return destArray;
}


function SyncAllSlotsWithExtCalendars()
{
	LogEvent( 'ext-calendar-sync', 'Started loading free slots from external calendars' );
	
	array = XQuery( 'for $elem in appointment_slot_sets return $elem/Fields( "id" )' );
	for ( slotSet in array )
	{
		slotSetDoc = OpenDoc( slotSet.ObjectUrl );
		slotSet = slotSetDoc.TopElem;

		try
		{
			HandleLoadSlotSetFromExtCalendar( slotSet );
		}
		catch ( e )
		{
			LogEvent( 'ext-calendar-sync', 'ERROR: Unable to load free slots from external calendar for ' + slotSet.person_id.ForeignDispName + '\r\n' + e );
		}

		if ( slotSetDoc.IsChanged )
			slotSetDoc.Save();
	}
	
	LogEvent( 'ext-calendar-sync', 'Finished loading free slots from external calendars' );
}