function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;
	code = lib_base.obtain_new_object_code( Name );
}


function is_active()
{
	switch ( occurrence_id )
	{
		case 'succeeded':
		case 'failed':
			return false;
	}

	return true;
}


function update_req_end_date_by_req_duration()
{
	if ( ! req_duration.length.HasValue || ! req_start_date.HasValue )
		return;

	req_end_date = lib_base.get_term_date_offset( req_start_date, req_duration );
}


function update_req_duration_by_req_end_date()
{
	if ( ! req_end_date.HasValue || ! req_start_date.HasValue || req_end_date < req_start_date )
		return;

	req_duration.set_seconds_num( DateDiff( req_end_date, req_start_date ) );
}


function update_end_date_by_duration()
{
	if ( ! duration.length.HasValue || ! start_date.HasValue )
		return;

	end_date = lib_base.get_term_date_offset( start_date, duration );
}


function update_duration_by_end_date()
{
	if ( ! end_date.HasValue || ! start_date.HasValue || end_date < start_date )
		return;

	duration.set_seconds_num( DateDiff( end_date, start_date ) );
}


function desc()
{
	if ( type_id.HasValue )
	{
		str = type_id.ForeignElem.name;

		if ( name != '' )
			str = str + ' - ' + name;
	}
	else
	{
		str = name;
	}

	return str;
}


