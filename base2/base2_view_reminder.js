function GetEntries()
{
	array = lib_reminder.entries;

	if ( isDateOnlyReminder )
	{
		array = ArraySelect( array, '!isCalendarEntry' );
		array = ArraySelect( array, 'date <= CurDate' );
		array = ArraySort( array, 'DateNewTime( date )', '+', 'Hour( date ) > 0', '-', 'date', '+' );
	}
	else
	{
		array = ArraySort( array, 'date', '+' );
		nextEntry = ArrayOptFind( array, 'This.date >= CurDate' );
		nextDate = ( nextEntry != undefined ? nextEntry.date : CurDate );

		array = ArraySelect( array, 'This.date <= nextDate' );

		array = ArraySort( array, 'date', '-' );
	}

	return array;
}