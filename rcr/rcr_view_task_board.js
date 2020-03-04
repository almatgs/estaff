function BuildView()
{
	if ( lib_user.active_user_access.prohibit_view_other_user_events && filter.user_id != lib_user.active_user_info.id )
		filter.user_id = lib_user.active_user_info.id;
	else if ( lib_user.active_user_access.prohibit_view_other_group_events && ! lib_user.active_user_info.matches_group( filter.group_id ) )
		filter.group_id = lib_user.active_user_info.main_group_id;

	activeTasks.Clear();

	ProcessEventsWithReminder();
	ProcessCandidates();
	ProcessOtherEventsOfUserDuty();
	
	
	activeTaskCount = activeTasks.ChildNum;
	closeToDeadlineTaskCount = 0;
	overdueTaskCount = 0;

	for ( activeTask in activeTasks )
	{
		if ( activeTask.orderIndex == null )
			activeTask.orderIndex = 3;

		if ( activeTask.isCloseToDeadline )
		{
			activeTask.timeToDeadlineBkColor = lib_event.bk_color_reached;
			closeToDeadlineTaskCount++;
		}
		else if ( activeTask.isOverdue )
		{
			activeTask.timeToDeadlineBkColor = lib_event.bk_color_expired;
			overdueTaskCount++;
		}
	}

	activeTasks.Sort( 'orderIndex', '+', 'dueDate.HasValue', '-', 'dueDate', '+', 'date', '-' );
}


function ProcessEventsWithReminder()
{
	curDate = CurDate;

	queryStr = 'for $elem in events';
	queryStr += ' where $elem/reminder_date >= ' + XQueryLiteral( DateOffset( DateNewTime( curDate ), 0 - 14 * 86400 ) );

	queryStr = ApplyQueryFilters( queryStr, events );

	queryStr += ' return $elem/Fields( "id","is_derived","is_calendar_entry","creation_date","date","end_date","type_id","occurrence_id","state_name","user_id","group_id","candidate_id","contacts_desc","vacancy_id","state_text_color","reminder_date","is_exact_time_reminder" )';

	this.reminderEvents = XQuery( queryStr );

	for ( event in this.reminderEvents )
	{
		if ( event.reminder_date > curDate )
			continue;

		activeTask = activeTasks.AddChild();
		activeTask.event = event;
		activeTask.object = event;
		activeTask.date = event.reminder_date;

		activeTask.name = event.state_name;
		activeTask.rawTimeInStatus = DateDiff( curDate, event.creation_date );

		activeTask.hasReminder = true;

		if ( event.is_exact_time_reminder || Hour( event.reminder_date ) > 0 )
		{
			activeTask.dueDate = event.reminder_date;
			activeTask.timeToDeadlineDescription = StrLowerCase( lib_base.DateOffsetFromTodayDescription( activeTask.dueDate, 'd|h' ) );

			diff = DateDiff( CurDate, event.reminder_date );

			activeTask.orderIndex = 1;
			
			if ( diff >= 0 )
			{
				if ( diff < ( event.is_exact_time_reminder ? 5 * 60 : 3600 ) )
				{
					activeTask.timeToDeadlineBkColor = lib_event.bk_color_reached;
					activeTask.isCloseToDeadline = true;
				}
				else
				{
					activeTask.timeToDeadlineBkColor = lib_event.bk_color_expired;
					activeTask.isOverdue = true;

					if ( DateNewTime( curDate ) != DateNewTime( event.reminder_date ) )
						activeTask.orderIndex = 2;
				}
			}
		}
		else
		{
			activeTask.dueDate = event.reminder_date;

			if ( DateNewTime( curDate ) == DateNewTime( event.reminder_date ) )
			{
				activeTask.timeToDeadlineDescription = StrLowerCase( UiText.titles.today );
				activeTask.isCloseToDeadline = true;
			}
			else
			{
				activeTask.timeToDeadlineDescription = StrLowerCase( lib_base.DateOffsetFromTodayDescription( activeTask.dueDate, 'd|h' ) );

				diff = DateDiff( CurDate, event.reminder_date );
			
				if ( diff >= 0 )
				{
					activeTask.timeToDeadlineBkColor = lib_event.bk_color_expired;
					activeTask.isOverdue = true;
				}
			}

			activeTask.orderIndex = 2;
		}
	}
}


function ProcessCandidates()
{
	reminderTasks = ArraySelectAll( activeTasks );

	curDate = CurDate;

	queryStr = 'for $elem in candidates';
	queryStr += ' where ( $elem/is_user_duty = true()'
			
	queryStr += ' or ( $elem/max_state_date < ' + XQueryLiteral( curDate );
	queryStr += ' and $elem/max_state_date >= ' + XQueryLiteral( DateOffset( DateNewTime( curDate ), 0 - 60 * 86400 ) );
	queryStr += ' ) )';

	queryStr += ' and $elem/state_date >= ' + XQueryLiteral( DateOffset( DateNewTime( curDate ), 0 - 60 * 86400 ) );

	queryStr = ApplyQueryFilters( queryStr, candidates );

	queryStr += ' return $elem/Fields( "id","is_active","image_url","state_id","state_date","user_id","group_id","fullname","main_vacancy_id" )';

	array = XQuery( queryStr );

	for ( candidate in array )
	{
		if ( candidate.state_date > curDate )
			continue;

		reminderEvent = ArrayOptFindByKey( reminderEvents, candidate.id, 'candidate_id' );
		if ( reminderEvent != undefined )
		{
			//DebugMsg( candidate.fullname );
			if ( reminderEvent.state_id == candidate.state_id && reminderEvent.state_date == candidate.state_date )
			{
				activeTask = ArrayOptFind( reminderTasks, 'This.event.candidate_id == ' + CodeLiteral( candidate.id ) );
				if ( activeTask != undefined )
				{
					activeTask.name = candidate.state_id.ForeignDispName;
					activeTask.rawTimeInStatus = DateDiff( curDate, candidate.state_date );
					if ( candidate.max_state_date.HasValue )
					{
						if ( DateNewTime( candidate.max_state_date ) < DateNewTime( curDate ) )
							activeTask.timeInStatusBkColor = lib_event.bk_color_expired;
					}
				}

				continue;
			}
		}

		activeTask = activeTasks.AddChild();
		activeTask.candidate = candidate;
		activeTask.object = candidate;
		activeTask.date = candidate.state_date;

		activeTask.name = candidate.state_id.ForeignDispName;
		activeTask.rawTimeInStatus = DateDiff( curDate, candidate.state_date );

		if ( candidate.max_state_date.HasValue )
		{
			activeTask.dueDate = DateNewTime( candidate.max_state_date );
			activeTask.timeToDeadlineDescription = StrLowerCase( lib_base.DateOffsetFromTodayDescription( activeTask.dueDate, 'd' ) );

			if ( activeTask.dueDate == DateNewTime( curDate ) )
			{
				activeTask.isCloseToDeadline = true;
			}
			else if ( activeTask.dueDate < DateNewTime( curDate ) )
			{
				activeTask.isOverdue = true;
				activeTask.timeInStatusBkColor = lib_event.bk_color_expired;
			}
		}
	}
}


function ProcessOtherEventsOfUserDuty()
{
	destEventTypes = ArraySelect( lib_voc.get_sorted_voc( event_types ), '! is_state && ArrayOptFind( This.occurrences, \'This.is_active && This.is_user_duty\' ) != undefined' );
	if ( destEventTypes.length == 0 )
		return;

	curDate = CurDate;

	queryStr = 'for $elem in events';
	queryStr += ' where MatchSome( $elem/type_id, ( ' + ArrayMerge( destEventTypes, 'XQueryLiteral( id )', ',' ) + ' ) )';
	queryStr += ' and $elem/date >= ' + XQueryLiteral( DateOffset( DateNewTime( curDate ), 0 - 30 * 86400 ) );

	queryStr = ApplyQueryFilters( queryStr, events );
	queryStr += ' return $elem/Fields( "id","is_derived","is_calendar_entry","date","end_date","type_id","occurrence_id","state_name","user_id","group_id","candidate_id","contacts_desc","vacancy_id","state_text_color","reminder_date","is_exact_time_reminder" )';

	array = XQuery( queryStr );

	for ( event in array )
	{
		if ( event.reminder_date.HasValue )
			continue;

		occurrence = event.occurrence;
		if ( ! occurrence.is_user_duty )
			continue;

		activeTask = activeTasks.AddChild();
		activeTask.event = event;
		activeTask.object = event;
		activeTask.date = event.date;

		activeTask.name = event.state_name;
		activeTask.rawTimeInStatus = DateDiff( curDate, event.date );

		if ( occurrence.max_duration.length.HasValue )
		{
			activeTask.dueDate = lib_base.get_term_date_offset( event.date, occurrence.max_duration );
			activeTask.timeToDeadlineDescription = StrLowerCase( lib_base.DateOffsetFromTodayDescription( activeTask.dueDate, 'd' ) );

			if ( DateNewTime( activeTask.dueDate ) == DateNewTime( curDate ) )
			{
				activeTask.isCloseToDeadline = true;
			}
			else if ( activeTask.dueDate < curDate )
			{
				activeTask.isOverdue = true;
				activeTask.timeInStatusBkColor = lib_event.bk_color_expired;
			}
		}
	}
}


function ApplyQueryFilters( queryStr, catalog )
{
	if ( filter.user_id.HasValue )
		queryStr += ' and $elem/user_id = ' + filter.user_id.XQueryLiteral;
	else if ( filter.group_id.HasValue )
		queryStr += ' and $elem/group_id = ' + filter.group_id.XQueryLiteral;

	if ( filter.used_fulltext.HasValue )
		queryStr += ' and doc-contains( $elem/id, \'data\', ' + filter.used_fulltext.XQueryLiteral + ', \'' + CatalogNameToObjectName( catalog.Name ) + '\' )';

	return queryStr;
}


function HandleRemindLater( selActiveTasks )
{
	dlgDoc = OpenDoc( '//base2/base2_dlg_event.xml' );
	dlg = dlgDoc.TopElem;
	dlg.reminderOnly = true;
	dlg.showComment = ( selActiveTasks.length > 1 );
	dlg.Init();

	ActiveScreen.ModalDlg( dlgDoc );
	if ( ! dlg.reminder_date.HasValue )
		Cancel();

	for ( activeTask in selActiveTasks )
	{
		if ( activeTask.event != undefined )
		{
			eventDoc = OpenDoc( DefaultDb.GetRecordPrimaryObjectUrl( activeTask.event ) );
			event = eventDoc.TopElem;
		}
		else if ( ( event = activeTask.candidate.get_state_event() ) != undefined )
		{
			eventDoc = OpenDoc( DefaultDb.GetRecordPrimaryObjectUrl( event ) );
			event = eventDoc.TopElem;
		}
		else
		{
			eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
			event = eventDoc.TopElem;
			event.type_id = 'note';
			event.date = CurDate;
			event.candidate_id = activeTask.candidate.id;
			event.vacancy_id = activeTask.candidate.main_vacancy_id;
		}

		if ( dlg.comment.HasValue )
		{
			if ( event.comment.HasValue )
				event.comment += '\r\n\r\n';

			event.comment += dlg.comment;
		}

		event.reminder_date = dlg.reminder_date;
		event.is_exact_time_reminder = dlg.is_exact_time_reminder;
		eventDoc.Save();
	}
}


function HandleDeleteReminder( selActiveTasks )
{
	for ( activeTask in selActiveTasks )
	{
		eventDoc = OpenDoc( DefaultDb.GetRecordPrimaryObjectUrl( activeTask.event ) );
		event = eventDoc.TopElem;
		event.reminder_date.Clear();
		event.is_exact_time_reminder.Clear();
		eventDoc.Save();
	}
}