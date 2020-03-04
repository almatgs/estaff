function Init()
{
	this.widthMeasure = '120zr';
	this.heightMeasure = '60zr';

	if ( this.reminderOnly )
	{
		this.widthMeasure = '130zr';
		return;
	}

	//if ( eventType.use_end_date )
		//return;

	if ( eventType.occurrences.ChildNum <= 1 )
		return;

	for ( occurrence in eventType.occurrences )
	{
		if ( ! occurrence.is_active )
			continue;

		if ( occurrence.id == 'scheduled' )
			continue;

		if ( existingEvent != undefined && eventType.use_end_date && eventType.has_long_duration )
		{
			if ( occurrence.id == existingEvent.occurrence_id )
				continue;
		}

		if ( occurrence.not_occurred || occurrence.id == 'cancelled' || occurrence.id == 'call_failed' || occurrence.id == 'call_later' )
			groupIndex = 2;
		else if ( occurrence.id == '' || occurrence.id == 'succeeded' || occurrence.id == 'reserve' )
			groupIndex = 0;
		else
			groupIndex = 1;

		for ( typicalNextState in occurrence.typical_next_states )
		{
			nextEventType = typicalNextState.event_type_id.OptForeignElem;
			if ( nextEventType == undefined )
				continue;

			nextEventOccurrence = nextEventType.get_opt_occurrence( typicalNextState.event_occurrence_id );
			if ( nextEventOccurrence == undefined )
				continue;

			eventResult = event_results.AddChild();
			eventResult.occurrence = occurrence;
			eventResult.nextEventType = nextEventType;
			eventResult.nextEventOccurrence = nextEventOccurrence;
			
			if ( typicalNextState.action_name.HasValue )
				eventResult.title = typicalNextState.action_name;
			else
				eventResult.title = StrTitleCase( nextEventOccurrence.get_state_name() );

			eventResult.group_index = groupIndex;
		}

		eventResult = event_results.AddChild();
		eventResult.occurrence = occurrence;
			
		if ( occurrence.action_name.HasValue )
		{
			eventResult.title = StrTitleCase( occurrence.action_name );
		}
		else if ( occurrence.id == '' && ( occurrence.typical_next_states.ChildNum != 0 || eventType.has_occurrence( 'succeeded' ) ) )
		{
			eventResult.needDecideLater = true;
			eventResult.title = UiText.actions.decide_later;
		}
		else
		{
			eventResult.title = StrTitleCase( occurrence.get_name() );
		}

		eventResult.group_index = groupIndex;

		if ( occurrence.allow_state_reminder )
			eventResult.useReminder = true;
	}

	for ( i = 0; i < 3; i++ )
	{
		eventResults = ArraySelectByKey( event_results, i, 'group_index' );
		if ( eventResults.length == 0 )
			continue;

		if ( i == 0 )
		{
			if ( ( index = eventResults.FindIndexByKey( true, 'needDecideLater' ) ) >= 0 )
			{
				eventResult = eventResults[index];
				eventResults.splice( index, 1 );
				eventResults.push( eventResult );
			}
		}

		group = event_result_groups.AddChild();
		group.eventResults = eventResults;
		group.maxWidth = ArrayOptMax( ArrayExtract( eventResults, 'CalcTextScreenWidth( This.title )' ) ) + 20;
		
		if ( i == 0 )
			group.maxWidth = Max( group.maxWidth, 150 );
	}

	if ( event_result_groups.ChildNum == 3 )
	{
		event_result_groups[0].widthMeasure = ( event_result_groups[0].maxWidth + 40 ) + 'px';
		event_result_groups[1].widthMeasure = '100%';
		event_result_groups[2].widthMeasure = ( event_result_groups[2].maxWidth + 10 ) + 'px';
	}
	else if ( event_result_groups.ChildNum == 2 )
	{
		event_result_groups[0].widthMeasure = ( event_result_groups[0].maxWidth + 40 ) + 'px';
		event_result_groups[1].widthMeasure = '100%';
	}
	else
	{
		event_result_groups[0].widthMeasure = '100%';
	}

	maxGroupResultsNum = ArrayMax( event_result_groups, 'This.eventResults.length' ).eventResults.length;

	this.widthMeasure = '130zr';
	this.heightMeasure = ( 64 + maxGroupResultsNum * 2 ) + 'zr';

	//DebugMsg( maxGroupResultsNum + ' ' + this.heightMeasure );

	if ( this.init_occurrence_id.HasValue )
		this.selectedEventResult = ArrayOptFind( event_results, 'This.occurrence.id == init_occurrence_id' );
}


function Finish()
{
	if ( this.reminderOnly && ! reminder_data.date.HasValue )
	{
		lib_base.show_error_message( ActiveScreen, UiText.errors.date_not_specified );
		Cancel();
	}

	if ( this.selectedEventResult == undefined && this.event_results.ChildNum != 0 )
		Cancel();

	if ( this.reminderOnly || ( selectedEventResult != undefined && selectedEventResult.useReminder && reminder_data.date.HasValue ) )
	{
		if ( reminder_data.time.hour.HasValue )
			reminderDate = DateNewTime( reminder_data.date, reminder_data.time.hour, ( reminder_data.time.minute.HasValue ? reminder_data.time.minute : 0 ) );
		else
			reminderDate = DateNewTime( reminder_data.date, 0, 0 );

		if ( reminderDate < CurDate )
		{
			lib_base.show_error_message( ActiveScreen, UiText.errors.date_in_past );
			Cancel();
		}

		this.reminder_date = reminderDate;

		if ( ! reminder_data.time.hour.HasValue )
			is_exact_time_reminder = false;
	}
	
	if ( ! this.reminderOnly )
	{
		lib_event.check_event_comment( this, this.selectedOccurence );
		
		if ( lib_event.IsRejectOccurrence( this.eventType, this.selectedOccurence.id ) && this.selectedOccurence.require_reject_reason && ! this.candidate_reject_reason_id.HasValue )
		{
			lib_base.show_error_message( ActiveScreen, UiText.errors.reject_reason_not_specified );
			Cancel();
		}

		if ( lib_event.IsWithdrawalOccurrence( this.eventType, this.selectedOccurence.id ) && this.selectedOccurence.require_withdrawal_reason && ! this.candidate_withdrawal_reason_id.HasValue )
		{
			lib_base.show_error_message( ActiveScreen, UiText.errors.withdrawal_reason_not_specified );
			Cancel();
		}
	}
}


function UpdateReminderDataOnOffsetChange( reminderData )
{
	minuteOffset = 0;

	if ( reminderData.hour_offset.HasValue )
		minuteOffset += reminderData.hour_offset * 60;

	if ( reminderData.minute_offset.HasValue )
		minuteOffset += reminderData.minute_offset;

	if ( minuteOffset == 0 )
		return;

	date = DateOffset( CurDate, minuteOffset * 60 );
	reminderData.date = DateNewTime( date );
	reminderData.time.hour = Hour( date );
	reminderData.time.minute = Minute( date );
}
