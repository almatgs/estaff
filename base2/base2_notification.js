function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;
}


function OnCheckReadAccess()
{
	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	if ( user_id != LdsCurUser.id )
		Cancel();
}


function image_url()
{
	if ( is_read )
		return '//base_pict/notification_inactive.ico';
	else
		return '//base_pict/notification.ico';
}


function get_subject()
{
	if ( subject != '' )
		return subject;

	if ( type_id == 'new_object' )
	{
		if ( object_type_id == 'vacancy' )
			return UiText.actions.new_vacancy;
	}
	else if ( type_id == 'state_change' || type_id == 'end_reach' )
	{
		state = get_object_state();
		if ( state == undefined )
			return '';

		return state.name;
	}
	else if ( type_id == 'user_change' )
	{
		if ( object_type_id == 'vacancy' )
			return UiText.titles.vacancy_assigned;
	}

	return '';
}


function get_text_color()
{
	if ( text_color != '' )
		return text_color;

	if ( type_id == 'state_change' || type_id == 'end_reach' )
	{
		state = get_object_state();
		if ( state == undefined )
			return '';

		return state.text_color;
	}
}


function get_bk_color()
{
	if ( bk_color != '' )
		return bk_color;

	if ( type_id == 'state_change' )
	{
		state = get_object_state();
		if ( state == undefined )
			return '';

		return state.bk_color;
	}
	else if ( type_id == 'end_reach' )
	{
		state = get_object_state();
		if ( state == undefined )
			return '';

		return lib_event.build_dyn_state_bk_color( state, null, event_end_date );
	}
}


function get_object_state()
{
	statesVoc = DefaultDb.GetOptCatalog( object_type_id + '_states' );
	if ( statesVoc == undefined )
		return undefined;

	return GetForeignElem( statesVoc, object_state_id );
}


function set_read_state( newReadState, screen )
{
	if ( newReadState == is_read )
		return;

	try
	{
		doc = DefaultDb.OpenObjectDoc( 'notification', id );
	}
	catch ( e )
	{
		return;
	}

	doc.TopElem.is_read = newReadState;
	doc.Save();

	if ( screen != undefined )
		screen.Update();

	lib_agent.kick_agent( 'notifications_updater' );
}


