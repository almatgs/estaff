function OnInit()
{
	small_calendar.host_ref = Doc.TopElem;
	load_stored_filters();

	set_flex_date( DateNewTime( CurDate ) );

	last_single_date = DateNewTime( CurDate );
}


function build()
{
	view.dummy_rooms.ObtainChildByKey( null );

	target_dates.Clear();
	time_rows.Clear();
	entries.Clear();

	if ( cn_local_views.calendar_type_id == 'day' )
	{
		targetDate = target_dates.AddChild();
		targetDate.date = start_date;
		targetDate.week_day = WeekDay( start_date );
	}
	else if ( cn_local_views.calendar_type_id == 'work_week' )
	{
		curDate = start_date;

		for ( i = 0; i < 7; i++ )
		{
			targetDate = target_dates.AddChild();
			targetDate.date = curDate;
			targetDate.week_day = WeekDay( curDate );

			curDate = DateOffset( curDate, 86400 );
		}

		end_date = DateOffset( start_date, 86400 * 6 );
	}
	else if ( cn_local_views.calendar_type_id == 'week' )
	{
		curDate = start_date;

		for ( i = 0; i < 7; i++ )
		{
			targetDate = target_dates.AddChild();
			targetDate.date = curDate;
			targetDate.week_day = WeekDay( curDate );

			curDate = DateOffset( curDate, 86400 );
		}
	}
	else if ( cn_local_views.calendar_type_id == 'month' )
	{
		startWeekDay = WeekDay( start_date );

		if ( startWeekDay == 0 )
			headDaysNum = 6;
		else
			headDaysNum = startWeekDay - 1;

		for ( i = 0; i < headDaysNum; i++ )
		{
			targetDate = target_dates.AddChild();
			targetDate.date = DateOffset( start_date, 0 - 86400 * ( headDaysNum - i ) );
			targetDate.week_day = WeekDay( targetDate.date );
		}

		for ( i = 0; ; i++ )
		{
			curDate = DateOffset( start_date, 86400 * i );
			if ( Month( curDate ) != Month( start_date ) )
				break;

			targetDate = target_dates.AddChild();
			targetDate.date = curDate;
			targetDate.week_day = WeekDay( targetDate.date );
		}

		tailDaysNum = 42 - target_dates.ChildNum;

		for ( i = 0; i < tailDaysNum; i++ )
		{
			targetDate = target_dates.AddChild();
			targetDate.date = curDate;
			targetDate.week_day = WeekDay( targetDate.date );

			curDate = DateOffset( curDate, 86400 );
		}
	}

	fill_time_rows( local_settings.calendar_start_minutes, local_settings.calendar_end_minutes );

	if ( lib_user.active_user_access.prohibit_view_other_user_events && filter.user_id != lib_user.active_user_info.id )
		filter.user_id = lib_user.active_user_info.id;
	else if ( lib_user.active_user_access.prohibit_view_other_group_events && ! lib_user.active_user_info.matches_group( filter.group_id ) )
		filter.group_id = lib_user.active_user_info.main_group_id;

	target_rooms.Clear();

	for ( room in rooms )
	{
		target_rooms.AddChild().room_id = room.id;
	}

	build_events();
	//check_conflicts();

	bind_entries();

	if ( cn_local_views.group_entries_by_time )
	{
		for ( entry in entries )
			build_event_group_entry( entry.src_entry );
	}

	if ( cn_local_views.calendar_type_id == 'day' || cn_local_views.calendar_type_id == 'work_week' )
		build_free_rooms();

	if ( cn_local_views.calendar_type_id == 'work_week' )
	{
		if ( entries.ChildNum == 0 || ( WeekDay( entries[entries.ChildNum - 1].date ) != 0 && WeekDay( entries[entries.ChildNum - 1].date ) != 6 ) )
		{
			target_dates[6].Delete();
			target_dates[5].Delete();
			end_date = DateOffset( end_date, 0 - 86400 * 2 );
		}
	}

	if ( AppModuleUsed( 'crm' ) )
		build_tasks();

	if ( true || cn_local_views.calendar_type_id != 'month' )
	{
		small_calendar.sel_start_date = start_date;
		small_calendar.sel_end_date = end_date;
	}
}



function build_events()
{
	query = 'for $elem in calendar_entries where ';

	if ( cn_local_views.calendar_type_id == 'day' || cn_local_views.calendar_type_id == 'work_week' )
		query = query + ' (';

	query += ' $elem/date >= ' + XQueryLiteral( start_date ) + ' and $elem/date <= ' + XQueryLiteral( DateNewTime( end_date, 23,59,59 ) );

	if ( cn_local_views.calendar_type_id == 'day' || cn_local_views.calendar_type_id == 'work_week' )
		query = query + ' or $elem/end_date >= ' + XQueryLiteral( start_date ) + ' )';

	if ( filter.user_id.HasValue )
		query += ' and $elem/user_id = ' + filter.user_id.XQueryLiteral;
	else if ( filter.group_id.HasValue )
		query += ' and $elem/group_id = ' + filter.group_id.XQueryLiteral;
		
	if ( filter.room_id.HasValue )
		query += ' and $elem/room_id = ' + filter.room_id.XQueryLiteral;

	query += ' return $elem';

	cur_query = query;
	//alert( query );

	foundEvents = XQuery( query );
	//foundEvents = ArraySort( foundEvents, 'date', '+' );
	foundEvents = ArraySort( foundEvents, 'GetCalendarDate( date, local_date, This )', '+' );

	prevEvent = undefined;


	for ( event in foundEvents )
	{
		if ( event.occurrence_id == 'cancelled' && ! cn_global_settings.show_cancelled_events )
			continue;

		if ( event.is_delegate && ! cn_local_views.show_delegate_entries )
			continue;

		if ( event.date == null )
			continue;

		//eventDate = event.date;
		eventDate = GetCalendarDate( event.date, event.local_date, event );

		if ( event.end_date.HasValue )
			eventEndDate = GetCalendarDate( event.end_date, ( event.local_date.HasValue ? DateOffset( event.local_date, DateDiff( event.end_date, event.date ) ) : null, event ) );
		else
			eventEndDate = null;

		if ( eventDate > DateNewTime( end_date, 23, 59, 59 ) )
			continue;

		rangeStartDate = eventDate;
		if ( Hour( rangeStartDate ) == undefined )
			rangeStartDate = DateNewTime( rangeStartDate, 0, 0, 0 )
				
		if ( eventEndDate != null && eventEndDate > eventDate )
			rangeEndDate = eventEndDate;
		else
			rangeEndDate = DateOffset( eventDate, local_settings.calendar_step_length * 60 );

		prevMainEntry = undefined;

		build_range( rangeStartDate, rangeEndDate, event, false, false, prevMainEntry );

		if ( event.type_id.ForeignElem.use_road_time && ( cn_local_views.calendar_type_id == 'day' || cn_local_views.calendar_type_id == 'work_week' ) )
		{
			if ( event.road_time.length.HasValue )
				build_range( lib_base.get_term_date_neg_offset( rangeStartDate, event.road_time ), rangeStartDate, event, true, false, undefined );

			if ( event.return_road_time.length > 0 )
				build_range( rangeEndDate, lib_base.get_term_date_offset( rangeEndDate, event.return_road_time ), event, true, true, undefined );
		}

		prevEvent = event;
		prevRangeStartDate = rangeStartDate;
		prevRangeEndDate = rangeEndDate;
	}
}


function check_conflicts()
{
	prevEntry = undefined;

	for ( entry in entries )
	{
		if ( prevEntry != undefined && prevEntry.end_date > entry.date )
		{
			prevEntry.has_conflicts = true;
			entry.has_conflicts = true;
		}

		prevEntry = entry;
	}
}



function build_free_rooms()
{
	if ( ! check_rooms || target_rooms.ChildNum == 0 )
		return;

	busyEntries = lib_calendar.get_room_busy_entries( start_date, end_date );
	for ( busyEntry in busyEntries )
	{
		timeRow = obtain_time_row( busyEntry.date, false );
		endTimeRow = obtain_end_time_row( busyEntry.end_date, false );

		startIndex = timeRow.ChildIndex;
		endIndex = endTimeRow.ChildIndex;

		busyDate = DateNewTime( busyEntry.date );

		for ( i = startIndex; i <= endIndex; i++ )
		{
			timeRow = time_rows[i];

			if ( timeRow.get_opt_busy_room( busyEntry.room_id, busyDate ) != undefined )
				continue;

			busyRoom = timeRow.busy_rooms.AddChild();
			busyRoom.room_id = busyEntry.room_id;
			busyRoom.date = busyDate;
		}
	}
}



function build_tasks()
{
	query = 'for $elem in tasks where';

	//if ( cn_local_views.calendar_type_id == 'day' || cn_local_views.calendar_type_id == 'work_week' )
		//query = query + ' (';

	query += ' $elem/req_end_date >= date( \'' + start_date + '\' ) and $elem/req_end_date <= date( \'' + DateNewTime( end_date, 23,59,59 ) + '\' )';

	//if ( cn_local_views.calendar_type_id == 'day' || cn_local_views.calendar_type_id == 'work_week' )
		//query = query + ' or $elem/end_date >= ' + XQueryLiteral( start_date ) + ' )';

	if ( filter.user_id.HasValue )
		query += ' and $elem/user_id = ' + filter.user_id.XQueryLiteral;
	else if ( filter.group_id.HasValue )
		query += ' and $elem/group_id = ' + filter.group_id.XQueryLiteral;
		
	query += ' return $elem';

	//cur_query = query;
	//alert( query );

	foundTasks = XQuery( query );
	foundTasks = ArraySort( foundTasks, 'req_end_date', '+' );

	for ( task in foundTasks )
	{
		if ( task.req_end_date > DateNewTime( end_date, 23, 59, 59 ) )
			continue;

		targetDate = target_dates.GetOptChildByKey( DateNewTime( task.req_end_date ) );

		targetDate.tasks_num++;

		if ( task.req_effort.length.HasValue )
			targetDate.sum_task_seconds += task.req_effort.get_seconds_num();
		else
			targetDate.sum_task_seconds += local_settings.calendar_step_length * 60;
	}
}



function build_range( rangeStartDate, rangeEndDate, event, isRoadTime, isReturnRoadTime, prevMainEntry )
{
	if ( rangeStartDate > DateNewTime( end_date, 23, 59, 59 ) )
		return;

	if ( rangeEndDate < start_date )
		return;

	isTail = false;
	hasTail = false;

	if ( rangeStartDate < start_date )
	{
		timeRow = time_rows[0];
		rangeStartDate = DateNewTime( start_date, timeRow.hour, timeRow.minute, 0 );
		isTail = true;
	}

	if ( rangeEndDate > DateNewTime( end_date, 23, 59, 59 ) )
	{
		timeRow = time_rows[time_rows.ChildNum - 1];
		rangeEndDate = DateOffset( DateNewTime( end_date, timeRow.hour, timeRow.minute, 0 ), local_settings.calendar_step_length * 60 );
		hasTail = true;
	}

	targetDate = target_dates.GetOptChildByKey( DateNewTime( rangeStartDate ) );
	if ( targetDate == undefined )
	{
		LogEvent( '', 'build_range() failed: ' + StrXmlDate( rangeStartDate, {ShowTimeZone:true} ) );
		return;
	}

	targetDateIndex = targetDate.ChildIndex;

	for ( ; targetDateIndex < target_dates.ChildNum; targetDateIndex++ )
	{
		targetDate = target_dates[targetDateIndex];

		entry = entries.AddChild();
		entry.id = event.id;
		entry.src_entry_ref = event;
		entry.target_date_index = targetDateIndex;

		if ( DateNewTime( targetDate.date ) == DateNewTime( rangeStartDate ) )
		{
			entry.date = rangeStartDate;
			entry.is_tail = isTail;
		}
		else
		{
			timeRow = time_rows[0];
			entry.date = DateNewTime( targetDate.date, timeRow.hour, timeRow.minute, 0 );
		}

		if ( DateNewTime( targetDate.date ) == DateNewTime( rangeEndDate ) )
		{
			entry.end_date = rangeEndDate;
			entry.has_tail = hasTail;
		}
		else
		{
			timeRow = time_rows[time_rows.ChildNum - 1];
			entry.end_date = DateOffset( DateNewTime( targetDate.date, timeRow.hour, timeRow.minute, 0 ), local_settings.calendar_step_length * 60 );
			if ( DateNewTime( entry.end_date ) != DateNewTime( targetDate.date ) )
				entry.end_date = DateNewTime( targetDate.date, 23, 59, 59 );
		}

		entry.is_road_time = isRoadTime;
		entry.is_return_road_time = isReturnRoadTime;

		targetDate.sum_entry_seconds += DateDiff( entry.end_date, entry.date );

		if ( ! isRoadTime && ! isReturnRoadTime )
			targetDate.entries_num++;

		if ( DateNewTime( targetDate.date ) == DateNewTime( rangeEndDate ) )
			break;

		if ( Hour( rangeEndDate ) == 0 && Minute( rangeEndDate ) == 0 && DateOffset( DateNewTime( targetDate.date ), 86400 ) == DateNewTime( rangeEndDate ) )
			break;
	}
}


function build_event_group_entry( event )
{
	combMinute = get_best_comb_minute( event.date );
	timeRow = time_rows.GetOptChildByKey( combMinute );
	if ( timeRow == undefined )
		return;

	dateEntry = timeRow.date_entries.ObtainChildByKey( DateNewTime( event.date ) );
	dateEntry.grouped_entries.AddChild().event = event;
}


function bind_entries()
{
	entries.Sort( 'date', '+' );
	
	for ( i = 0; i < target_dates.ChildNum; i++ )
		distribute_target_date_entries( i );

	for ( i = 0; i < target_dates.ChildNum; i++ )
		bind_target_date_entries( i );
}


function distribute_target_date_entries( targetDateIndex )
{
	srcEntries = ArraySelectByKey( entries, targetDateIndex, 'target_date_index' );

	if ( srcEntries.length == 0 )
		return;

	fill_time_rows( get_best_comb_minute( srcEntries[0].date ), time_rows[0].comb_minute );
	fill_time_rows( time_rows[time_rows.ChildNum - 1].comb_minute + local_settings.calendar_step_length, get_best_comb_minute( srcEntries[srcEntries.length - 1].end_date ) );

	nextFreeRowIndex = 0;

	//alert( time_rows.ChildNum );

	for ( i = 0; i < srcEntries.length; i++ )
	{
		entry = srcEntries[i];

		if ( i + 1 < srcEntries.length )
			nextEntry = srcEntries[i + 1];
		else
			nextEntry = undefined;

		entry.comb_minute = get_best_comb_minute( entry.date );

		if ( nextEntry != undefined && nextEntry.date < entry.end_date )
		{
			nextCombMinute = get_best_comb_minute( nextEntry.date );

			if ( nextCombMinute > entry.comb_minute )
			{
				entry.end_comb_minute = nextCombMinute - local_settings.calendar_step_length;
			}
			else
			{
				entry.end_comb_minute = entry.comb_minute;
			}
		}
		else
		{
			entry.end_comb_minute = get_best_comb_minute( entry.end_date ) - local_settings.calendar_step_length;
			if ( entry.end_comb_minute < entry.comb_minute )
				entry.end_comb_minute = entry.comb_minute;
		}

		//alert( entry.Xml );

		while ( nextFreeRowIndex < time_rows.ChildNum && time_rows[nextFreeRowIndex].comb_minute < entry.comb_minute )
			nextFreeRowIndex++;

		if ( nextFreeRowIndex >= time_rows.ChildNum || ( time_rows[nextFreeRowIndex].comb_minute > entry.comb_minute && ! cn_local_views.group_entries_by_time ) )
		{
			timeRow = time_rows.InsertChild( nextFreeRowIndex );
			timeRow.comb_minute = entry.comb_minute 
		}

		nextFreeRowIndex++;
	}
}


function bind_target_date_entries( targetDateIndex )
{
	srcEntries = ArraySelectByKey( entries, targetDateIndex, 'target_date_index' );

	nextFreeRowIndex = 0;

	for ( i = 0; i < srcEntries.length; i++ )
	{
		entry = srcEntries[i];

		while ( time_rows[nextFreeRowIndex].comb_minute < entry.comb_minute )
			nextFreeRowIndex++;

		entry.row_index = nextFreeRowIndex;
		entry.end_row_index = entry.row_index + ( entry.end_comb_minute - entry.comb_minute ) / local_settings.calendar_step_length;

		nextFreeRowIndex++;
	}
}


function obtain_time_row( date, autoExpand )
{
	//combMinute = Hour( date ) * 60 + ( Minute( date ) < 30 ? 0 : 30 );
	combMinute = get_comb_minute( date );

	timeRow = time_rows.GetOptChildByKey( combMinute );
	if ( timeRow != undefined )
		return timeRow;

	if ( combMinute < time_rows[0].comb_minute )
	{
		if ( ! autoExpand )
			return time_rows[0];

		fill_time_rows( combMinute, time_rows[0].comb_minute );
	}
	else if ( combMinute > time_rows[time_rows.ChildNum - 1].comb_minute )
	{
		if ( ! autoExpand )
			return time_rows[time_rows.ChildNum - 1];

		fill_time_rows( time_rows[time_rows.ChildNum - 1].comb_minute + local_settings.calendar_step_length, combMinute + local_settings.calendar_step_length );
	}
	else
	{
		throw 'Unknown error';
	}

	timeRow = time_rows.GetChildByKey( combMinute );
	return timeRow;
}


function obtain_end_time_row( date, autoExpand )
{
	if ( Minute( date ) == undefined )
		date = DateNewTime( date, 23, 59, 59 );

	combMinute = get_comb_minute( date );

	if ( Minute( date ) % local_settings.calendar_step_length == 0 )
		combMinute -= local_settings.calendar_step_length;

	timeRow = time_rows.GetOptChildByKey( combMinute );
	if ( timeRow != undefined )
		return timeRow;

	if ( combMinute < time_rows[0].comb_minute )
	{
		if ( ! autoExpand )
			return time_rows[0];

		fill_time_rows( combMinute, time_rows[0].comb_minute );
	}
	else if ( combMinute > time_rows[time_rows.ChildNum - 1].comb_minute )
	{
		if ( ! autoExpand )
			return time_rows[time_rows.ChildNum - 1];

		fill_time_rows( time_rows[time_rows.ChildNum - 1].comb_minute + local_settings.calendar_step_length, combMinute + local_settings.calendar_step_length );
	}
	else
	{
		throw 'Unknown error';
	}

	timeRow = time_rows.GetChildByKey( combMinute );
	return timeRow;
}


function get_best_comb_minute( date )
{
	if ( Hour( date ) != undefined )
		combMinute = Hour( date ) * 60 + Minute( date );
	else
		combMinute = 0;

	lowCombMinute = ( combMinute / local_settings.calendar_step_length ) * local_settings.calendar_step_length;
	highCombMinute = lowCombMinute + local_settings.calendar_step_length;

	if ( combMinute - lowCombMinute <= highCombMinute - combMinute )
		return lowCombMinute;
	else
		return highCombMinute;
}


function get_best_end_comb_minute( date )
{
	combMinute = Hour( date ) * 60 + Minute( date );

	lowCombMinute = ( combMinute / local_settings.calendar_step_length ) * local_settings.calendar_step_length;
	highCombMinute = lowCombMinute + local_settings.calendar_step_length;

	if ( combMinute - lowCombMinute <= highCombMinute - combMinute )
		return lowCombMinute;
	else
		return highCombMinute;
}


function get_comb_minute( date )
{
	combMinute = Hour( date ) * 60 + ( Minute( date ) / local_settings.calendar_step_length ) * local_settings.calendar_step_length;
}


function fill_time_rows( bottomCombMinute, topCombMinute )
{
	if ( time_rows.ChildNum != 0 && topCombMinute <= time_rows[0].comb_minute )
	{
		i = 0;

		for ( combMinute = bottomCombMinute; combMinute < topCombMinute; combMinute += local_settings.calendar_step_length )
		{
			timeRow = time_rows.InsertChild( i );
			timeRow.comb_minute = combMinute;
			i++;
		}
	}
	else
	{
		for ( combMinute = bottomCombMinute; combMinute < topCombMinute; combMinute += local_settings.calendar_step_length )
		{
			timeRow = time_rows.AddChild();
			timeRow.comb_minute = combMinute;
		}
	}
	
	//time_rows.Sort( 'comb_minute', '+' );
}


function GetCalendarDate( date, localDate, event )
{
	if ( localDate != null )
		return localDate;

	if ( Hour( date ) == undefined )
		return date;

	return Date( Year( date ), Month( date ), Day( date ), Hour( date ), Minute( date ) );
}


function set_flex_date( newDate )
{
	if ( cn_local_views.calendar_type_id == 'day' )
	{
		start_date = newDate;
		end_date = start_date;
	}
	else if ( cn_local_views.calendar_type_id == 'work_week' )
	{
		start_date = lib_calendar.get_week_start_date( newDate );
		end_date = DateOffset( start_date, 6 * 86400 );
	}
	else if ( cn_local_views.calendar_type_id == 'week' )
	{
		start_date = lib_calendar.get_week_start_date( newDate );
		end_date = DateOffset( start_date, 6 * 86400 );
	}
	else if ( cn_local_views.calendar_type_id == 'month' )
	{
		start_date = Date( Year( newDate ), Month( newDate ), 1 );
		end_date = DateOffset( lib_base.get_month_date_offset( start_date, 1 ), 0 - 86400 );
	}

	small_calendar.expose_date_range( start_date, end_date );
}


function set_calendar_type( newCalendarTypeID )
{
	isExpanding = ( cn_common.calendar_types.GetChildByKey( newCalendarTypeID ).ChildIndex > cn_common.calendar_types.GetChildByKey( cn_local_views.calendar_type_id ).ChildIndex );
	
	if ( ! isExpanding )
	{
		if ( cn_local_views.calendar_type_id == 'day' )
			last_single_date = start_date;

		last_start_date = start_date;
	}

	if ( last_start_date.HasValue )
		last_start_date = last_single_date;

	//alert( last_single_date + '  ' + last_start_date );

	cn_local_views.calendar_type_id = newCalendarTypeID;

	if ( ! isExpanding )
	{
		if ( cn_local_views.calendar_type_id == 'day' && last_single_date >= start_date && last_single_date <= end_date )
			start_date = last_single_date;
		else if ( last_start_date >= start_date && last_start_date <= end_date )
			start_date = last_start_date;
	}

	cn_local_views.Doc.SetChanged( true );
	set_flex_date( start_date );
}


function handle_small_calendar_date_changed( newDate )
{
	set_flex_date( newDate );
}



function get_free_room_id( startDate, endDate )
{
	//alert( target_rooms.ChildNum );

	if ( target_rooms.ChildNum == 0 )
		return null;

	timeRow = find_time_row_by_date( startDate );
	if ( timeRow == undefined )
		return null;
		
	if ( filter.room_id.HasValue && timeRow.get_opt_busy_room( filter.room_id, DateNewTime( startDate ) ) == undefined && lib_ext_calendar.check_room_is_free( filter.room_id.ForeignElem, startDate, endDate ) )
		return filter.room_id;

	for ( targetRoom in target_rooms )
	{
		if ( timeRow.get_opt_busy_room( targetRoom.room_id, DateNewTime( startDate ) ) == undefined && lib_ext_calendar.check_room_is_free( targetRoom.room_id.ForeignElem, startDate, endDate ) )
			return targetRoom.room_id;
	}

	throw UserError( UiText.errors.no_free_room_for_selected_time );
}


function find_time_row_by_date( date )
{
	combMinute = get_comb_minute( date );

	return time_rows.GetOptChildByKey( combMinute );
}


