function open_calendar_entry_ext( entry )
{
	return lib_event.open_event_ext( entry );
}


function open_calendar_entry( entry )
{
	return lib_event.open_event( entry );
}


function delete_calendar_entry( entry )
{
	DeleteDoc( DefaultDb.GetRecordPrimaryObjectUrl( entry ) );

	if ( lib_ext_calendar.is_ext_calendar_enabled() && entry.Child( local_settings.ext_calendar_type_id + '_eid' ).HasValue && lib_base.ask_question( ActiveScreen, StrReplace( UiText.messages.should_delete_corr_entry_in_ext_calendar_xxx, '%s', lib_ext_calendar.calendar_app_name() ) ) )
		lib_ext_calendar.delete_ext_calendar_entry( entry );

}


function select_date_and_room( prevDate, options )
{
	eventType = options.GetOptProperty( 'eventType' );
	filterUserID = options.GetOptProperty( 'user_id', null );
	
	dlgDoc = OpenDoc( '//cn/cn_view_calendar.xml' );
	dlgDoc.TopElem.is_dlg = true;

	if ( eventType != undefined && eventType.use_room )
	{
		dlgDoc.TopElem.check_rooms = true;
		dlgDoc.TopElem.auto_select_room = options.GetOptProperty( 'autoSelectRoom', false );
	}

	if ( filterUserID != null )
	{
		prevFilterUserID = dlgDoc.TopElem.filter.user_id;
		dlgDoc.TopElem.filter.user_id = filterUserID;
	}

	//dlgDoc.TopElem.sel_date = DateNewTime( CurDate );
	
	if ( prevDate != undefined && prevDate != null )
	{
		dlgDoc.TopElem.set_flex_date( DateNewTime( prevDate ) );
		//dlgDoc.TopElem.sel_date = prevDate;
		//dlgDoc.TopElem.calendar.sel_date = DateNewTime( dlgDoc.TopElem.sel_date );
	}
	else
	{
		dlgDoc.TopElem.set_flex_date( DateNewTime( CurDate ) );
	}

	ActiveScreen.ModalDlg( dlgDoc );
	
	resp = new Object;
	resp.date = dlgDoc.TopElem.sel_date;
	resp.room_id = dlgDoc.TopElem.sel_room_id;
	resp.filter_user_id = dlgDoc.TopElem.filter.user_id;

	if ( eventType != undefined && ! eventType.use_room )
		resp.room_id = null;

	if ( filterUserID != null )
		dlgDoc.TopElem.filter.user_id = prevFilterUserID;

	return resp;
}


function select_date( prevDate )
{
	return select_date_and_room( prevDate, undefined ).date;
}


function calendar_item_bk_color()
{
	return 'white';
}


function get_non_working_days( startDate, endDate )
{
	destArray = new Array;

	for ( year = Year( startDate ); year <= Year( endDate ); year++ )
		scan_non_working_days( destArray, year, startDate, endDate );

	return destArray;
}


function scan_non_working_days( destArray, year, startDate, endDate )
{
	annualHolidayMap = ArrayOptFindByKey( get_active_annual_holiday_maps(), year, 'year' );
	if ( annualHolidayMap == undefined )
		publicHolidayMap = ArrayOptFind( get_active_public_holiday_maps(), '( start_year == null || year >= start_year ) && ( end_year == null || year <= end_year )' );

	if ( Year( startDate ) == year )
		startDate = DateNewTime( startDate );
	else
		startDate = Date( year, 1, 1 );

	if ( Year( endDate ) == year )
		endDate = DateNewTime( endDate );
	else
		endDate = Date( year, 12, 31 );

	for ( date = startDate; date <= endDate; date = DateOffset( date, 86400 ) )
	{
		if ( annualHolidayMap != undefined )
		{
			item = annualHolidayMap.items.GetOptChildByKey( Month( date ) * 100 + Day( date ) );
			if ( item != undefined )
			{
				if ( ! item.is_working_day )
					destArray.push( date );

				continue;
			}
		}
		else if ( publicHolidayMap != undefined )
		{
			item = publicHolidayMap.items.GetOptChildByKey( Month( date ) * 100 + Day( date ) );
			if ( item != undefined )
			{
				destArray.push( date );
				continue;
			}
		}

		weekDay = WeekDay( date );
		if ( weekDay == local_settings.weekend_day1 || weekDay == local_settings.weekend_day2 )
			destArray.push( date );
	}
}


function is_wday( date )
{
	array = obtain_annual_day_mask( Year( date ) ).mask_array_ref.Object;
	return ( array[build_date_mask_index( date )] == 0 );
}


function get_date_wdays_offset( date, wDaysNum )
{
	if ( true )
	{
		if ( wDaysNum == 0 )
			return date;
		
		if ( wDaysNum > 0 )
		{
			step = 86400;
			maxCount = wDaysNum;
		}
		else
		{
			step = 0 - 86400;
			maxCount = 0 - wDaysNum;
		}

		curDate = date;
		count = 0;
	
		while ( true )
		{
			curDate = DateOffset( curDate, step );

			if ( ! is_wday( curDate ) )
				continue;

			count++;

			if ( count >= maxCount )
				break;
		}

		return curDate;
	}
	else
	{
		curDate = date;
		count = 0;
	
		while ( count < wDaysNum )
		{
			if ( is_wday( curDate ) )
				count++;

			curDate = DateOffset( curDate, 86400 );
		}

		return curDate;
	}
}


function get_date_wdays_diff( date1, date2 )
{
	if ( date1 < date2 )
		return 0 - get_date_wdays_diff( date2, date1 );

	monthSeqNo1 = BuildMonthSeqNo( Year( date1 ), Month( date1 ) );
	monthSeqNo2 = BuildMonthSeqNo( Year( date2 ), Month( date2 ) );

	if ( monthSeqNo1 - monthSeqNo2 <= 1 )
		return get_date_wdays_diff_core( date1, date2 );

	wDaysNum = get_date_wdays_diff_core( lib_base.get_month_date_offset( Date( Year( date2 ), Month( date2 ), 1 ), 1 ), date2 );

	for ( monthSeqNo = monthSeqNo2 + 1; monthSeqNo <= monthSeqNo1 - 1; monthSeqNo++ )
	{
		monthStats = obtain_annual_day_mask( monthSeqNo / 12 ).month_stats;
		wDaysNum += monthStats[( monthSeqNo % 12 )].wdays_num;
	}

	wDaysNum += get_date_wdays_diff_core( date1, Date( Year( date1 ), Month( date1 ), 1 ) );
	return wDaysNum;
}


function get_date_wdays_diff_core( date1, date2 )
{
	curDate = DateNewTime( date2 );
	wDaysNum = 0;
	
	while ( true )
	{
		if ( curDate >= DateNewTime( date1 ) )
			break;

		if ( is_wday( curDate ) )
			wDaysNum++;

		curDate = DateOffset( curDate, 86400 );
	}

	return wDaysNum;
}


function BuildMonthSeqNo( year, month )
{
	return year * 12 + month - 1;
}




function get_week_start_date( date )
{
	curDate = DateNewTime( date );

	while ( true )
	{
		if ( WeekDay( curDate ) == 1 )
			break;

		curDate = DateOffset( curDate, 0 - 86400 );
	}

	return curDate;
}


function show_plugin_events( srcData )
{
	item = srcData.items[0];

	//alert( item.Xml );

	entry = ArrayOptFirstElem( XQuery( 'for $elem in calendar_entries where $elem/outlook_eid = ' + XQueryLiteral( item.id ) + ' return $elem' ) );
	if ( event == undefined )
		throw UserError( 'Matching event does not exist in E-Staff' );

	open_calendar_entry_ext( entry );
}


function get_room_busy_entries( startDate, endDate )
{
	str = CallServerMethod( 'lib_calendar', 'get_room_busy_entries_xml', [startDate, endDate] );
	//alert( str );
	return OpenDocFromStr( str, 'form=cn_service_room_busy_info.xmd' ).TopElem.busy_entries;
}


"META:ALLOW-CALL-FROM-CLIENT:1";

function get_room_busy_entries_xml( startDate, endDate )
{
	destDoc = OpenNewDoc( 'cn_service_room_busy_info.xmd' );

	query = 'for $elem in calendar_entries where ';

	query = query + ' (';

	query += ' $elem/date >= ' + XQueryLiteral( startDate ) + ' and $elem/date <= ' + XQueryLiteral( DateNewTime( endDate, 23,59,59 ) );

	query = query + ' or $elem/end_date >= ' + XQueryLiteral( startDate ) + ' )';

	query += ' return $elem';

	foundEntries = XQuery( query );
	//foundEvents = ArraySort( foundEvents, 'date', '+' );

	for ( entry in foundEntries )
	{
		if ( entry.date > DateNewTime( endDate, 23, 59, 59 ) )
			continue;

		if ( ! entry.room_id.HasValue )
			continue;

		busyEntry = destDoc.TopElem.busy_entries.AddChild();
		busyEntry.AssignElem( entry );
		
		if ( ! busyEntry.end_date.HasValue )
			busyEntry.end_date = DateOffset( busyEntry.date, 30 * 60 );
	}

	return destDoc.TopElem.Xml;
}


function handle_ext_calendar_entry_date_changed( entry )
{
	if ( entry.type.target_object_type_id.ByValueExists( 'candidate' ) && entry.ChildExists( 'candidate_id' ) && entry.candidate_id.HasValue )
	{
		candidate = ObtainUiDoc( entry.candidate_id.ForeignObjectUrl ).TopElem;
		lib_candidate.RunCandidateStateCoreActions( candidate, entry, entry.occurrence, 1 );
	}
}


function init_calendar_regional_settings( settings )
{
	if ( ! base1_config.is_int_version )
	{
		settings.first_week_day = 1;
		settings.weekend_day1 = 6;
		settings.weekend_day2 = 0;
		return;
	}

	settings.first_week_day = SystemLocaleInfo.FirstDayOfWeek;
	
	switch ( lib_location.get_sys_country_id() )
	{
		case 'DZA':
		case 'BHR':
		case 'BGD':
		case 'EGY':
		case 'IRQ':
		case 'ISR':
		case 'KWT':
		case 'LBY':
		case 'MDV':
		case 'MRT':
		case 'OMN':
		case 'PSE':
		case 'QAT':
		case 'SAU':
		case 'SDN':
		case 'SYR':
		case 'ARE':
		case 'YEM':
			settings.weekend_day1 = 5;
			settings.weekend_day2 = 6;
			break;

		case 'IRN':
			settings.weekend_day1 = 5;
			settings.weekend_day2 = null;
			break;

		case 'MEX':
			settings.weekend_day1 = 0;
			settings.weekend_day2 = null;
			break;

		default:
			settings.weekend_day1 = 6;
			settings.weekend_day2 = 0;
	}
}


function get_sorted_week_day_ids()
{
	array = new Array;

	id = local_settings.first_week_day;
	if ( id == null )
		id = 1;

	for ( ; id < 7; id++ )
		array.push( id );

	for ( id = 0; array.length < 7; id++ )
		array.push( id );

	return array;
}


function get_sorted_week_days()
{
	return ArrayExtract( get_sorted_week_day_ids(), 'base1_common.week_days.GetChildByKey( This )' );
}


function check_load_default_public_holidays()
{
	if ( ! global_settings.country_id.HasValue )
		return;

	if ( ! lib_location.get_country_package_spec( global_settings.country_id ).has_public_holiday_map )
		return;

	load_country_public_holidays( global_settings.country_id );
}


function load_country_public_holidays( countryID )
{
	stdElem = OpenDoc( '//regional/' + StrLowerCase( countryID ) + '/public_holidays_' + StrLowerCase( countryID ) + '.xml' ).TopElem;
	lib_voc.init_voc_std_elem( public_holiday_maps, stdElem );
	
	invalidate_annual_day_masks();
}


function handle_load_std_public_holidays()
{
	country = lib_base.select_elem( ArraySelect( base2_common.countries, 'lib_location.get_country_package_spec( id ).has_public_holiday_map' ) );
	load_country_public_holidays( country.id );
}


function check_load_default_annual_holidays()
{
	if ( ! global_settings.country_id.HasValue )
		return;

	if ( ! lib_location.get_country_package_spec( global_settings.country_id ).has_annual_holiday_map )
		return;

	load_country_annual_holidays( global_settings.country_id );
}


function load_country_annual_holidays( countryID )
{
	stdArray = OpenDoc( '//regional/' + StrLowerCase( countryID ) + '/annual_holidays_' + StrLowerCase( countryID ) + '.xml' ).TopElem;
	
	for ( stdElem in stdArray )
	{
		elemID = StrLowerCase( countryID ) + '_' + stdElem.year;

		elem = ArrayOptFindByKey( annual_holiday_maps, elemID, 'id' );
		if ( elem != undefined )
		{
			if ( elem.was_customized )
				continue;

			doc = DefaultDb.OpenObjectDoc( 'annual_holiday_map', elemID );
		}
		else
		{
			doc = DefaultDb.OpenNewObjectDoc( 'annual_holiday_map', elemID );
		}

		elem = doc.TopElem;

		elem.country_id = stdElem.country_id;
		elem.year = stdElem.year;
		elem.items.Clear();

		for ( srcItem in stdElem.holidays )
		{
			item = elem.items.AddChild();
			item.month = srcItem / 100;
			item.day = srcItem % 100;
			item.is_working_day = false;
		}

		for ( srcItem in stdElem.working_days )
		{
			item = elem.items.AddChild();
			item.month = srcItem / 100;
			item.day = srcItem % 100;
			item.is_working_day = true;
		}

		elem.is_std = true;
		doc.Save();
	}

	invalidate_annual_day_masks();
}


function handle_load_std_annual_holidays()
{
	country = lib_base.select_elem( ArraySelect( base2_common.countries, 'lib_location.get_country_package_spec( id ).has_annual_holiday_map' ) );
	load_country_annual_holidays( country.id );
}


function get_active_annual_holiday_maps()
{
	return ArraySelect( annual_holiday_maps, 'country_id == global_settings.country_id && is_active' );
}


function get_active_public_holiday_maps()
{
	return ArraySelect( public_holiday_maps, 'country_id == global_settings.country_id && is_active' );
}


function IsValidCalendarYear( year )
{
	return ( year < 2038 );
}


function obtain_annual_day_mask( year )
{
	if ( ! IsValidCalendarYear( year ) )
		return;

	return EvalCs( 'obtain_annual_day_mask_core( year )' );
}


function invalidate_annual_day_masks()
{
	return EvalCs( 'annual_day_masks.Clear()' );
}


function obtain_annual_day_mask_core( year )
{
	mask = annual_day_masks.ObtainChildByKey( year );
	if ( ! mask.mask_array_ref.HasValue )
		build_annual_day_mask( mask );
	
	return mask;
}


function build_annual_day_mask( mask )
{
	maskArray = new Array( 32 * 12 );

	startDate = Date( mask.year, 1, 1 );
	endDate = Date( mask.year, 12, 31 );

	for ( date = startDate; date <= endDate; date = DateOffset( date, 86400 ) )
	{
		weekDay = WeekDay( date );
		if ( weekDay == local_settings.weekend_day1 || weekDay == local_settings.weekend_day2 )
			maskArray[build_date_mask_index( date )] = 1;
		else
			maskArray[build_date_mask_index( date )] = 0;
	}

	if ( ( annualHolidayMap = ArrayOptFindByKey( get_active_annual_holiday_maps(), mask.year, 'year' ) ) != undefined )
	{
		for ( item in annualHolidayMap.items )
			maskArray[build_date_mask_index( Date( mask.year, item.month, item.day ) )] = ( item.is_working_day ? 0 : 1 );
	}
	else if ( ( publicHolidayMap = ArrayOptFind( get_active_public_holiday_maps(), '( start_year == null || mask.year >= start_year ) && ( end_year == null || mask.year <= end_year )' ) ) != undefined )
	{
		for ( item in publicHolidayMap.items )
		{
			date = Date( mask.year, item.month, item.day );
			maskArray[build_date_mask_index( date )] = 1;

			weekDay = WeekDay( date );

			if ( publicHolidayMap.observance_policy_id.HasValue && ( weekDay == local_settings.weekend_day1 || weekDay == local_settings.weekend_day2 ) )
			{
				if ( publicHolidayMap.observance_policy_id == 11 )
				{
					nextDate = DateOffset( date, 86400 );
					if ( WeekDay( nextDate ) == local_settings.weekend_day1 || WeekDay( nextDate ) == local_settings.weekend_day2 )
						nextDate = DateOffset( nextDate, 86400 );

					maskArray[build_date_mask_index( nextDate )] = 1;
				}
			}
		}
	}

	mask.mask_array_ref = maskArray;


	for ( i = 0; i < 12; i++ )
		mask.month_stats.AddChild().wdays_num = 0;
	
	for ( date = startDate; date <= endDate; date = DateOffset( date, 86400 ) )
	{
		if ( maskArray[build_date_mask_index( date )] == 0 )
			mask.month_stats[Month( date ) - 1].wdays_num++;
	}
}


function build_date_mask_index( date )
{
	return ( Month( date ) - 1 ) * 31 + Day( date ) - 1;
}


function set_catalog_constraints()
{
	if ( lib_user.active_user_access.prohibit_view_other_user_events )
	{
		filterConstraint = lib_base.register_catalog_filter_constraint( 'calendar_entries', 'user_id' );
		filterConstraint.value.ObtainByValue( lib_user.active_user_info.id );
	}
	else if ( lib_user.active_user_access.prohibit_view_other_group_events )
	{
		lib_user.register_catalog_filter_group_constraint( 'calendar_entries' );
	}
}


