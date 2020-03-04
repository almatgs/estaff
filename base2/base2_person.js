function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;

	lib_base.init_new_card_object( This );
}


function OnCheckReadAccess()
{
	if ( LdsCurUser.Name == 'person' ) //!!!
		return;

	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	check_exclusive_read_access( LdsCurUser );

	if ( is_candidate )
	{
		if ( userAccess.prohibit_view_other_user_candidates && user_id != LdsCurUser.id )
			Cancel();

		if ( ( userAccess.prohibit_view_other_group_candidates || ( userAccess.prohibit_open_other_group_candidates && OptDoc != undefined ) ) && ! LdsCurUser.matches_group( group_id ) )
			Cancel();
	}

	if ( is_own_person || ! org_id.HasValue )
		return;

	if ( userAccess.prohibit_view_other_group_orgs && ! LdsCurUser.matches_group( group_id ) )
		Cancel();
}


function OnBeforeSave()
{
	if ( org_id != null && ( org = org_id.OptForeignElem ) != undefined )
		is_tentative = org.is_tentative;

	update_position_secondary_data();

	if ( ChildExists( 'candidate_id' ) && candidate_id.HasValue )
	{
		is_derived = false;
		is_candidate = false;
	}

	if ( true )
	{
		multi_role_id.SetValues( ArrayExtract( ArraySelect( roles, 'This' ), 'Name' ) );
	}

	this.sys_login = StrLowerCase( this.sys_login );
}


function OnSave()
{
	lib_base.update_object_secondary_data( 'org', org_id, id.Parent );
	lib_base.update_object_secondary_data( 'position', position_id, id.Parent );

	if ( prev_position_id.HasValue && prev_position_id != position_id )
		lib_base.update_object_secondary_data( 'position', prev_position_id, id.Parent );
}


function object_title()
{
	if ( is_own_person )
		return UiText.objects.employee;

	return UiText.objects.person;
}


function image_url()
{
	if ( is_own_person )
		return ( is_active ? '//base_pict/own_person.ico' : '//base_pict/own_person_inactive.ico' );

	if ( is_candidate )
		return ( is_active ? '//base_pict/candidate.ico' : '//base_pict/candidate_inactive.ico' );

	if ( is_tentative )
		return '//base_pict/contact_person_tentative.ico';
	else if ( is_active )
		return '//base_pict/contact_person.ico';
	else
		return '//base_pict/contact_person_inactive.ico';
}


function check_active()
{
	if ( is_candidate )
		return is_active;

	if ( is_own_person )
	{
		return ! dismissal_date.HasValue || dismissal_date > CurDate;
	}

	return ! contact_is_lost;
}


function birth_date_rest_days_bk_color()
{
	daysNum = birth_date_rest_days_num;

	if ( daysNum == null )
		return '';

	if ( daysNum == 0 )
		return GetForeignElem( base2_common.event_expiration_states, 'reached' ).bk_color;

	if ( daysNum <= 2 )
		return GetForeignElem( base2_common.event_occurrences, 'scheduled' ).bk_color;

	return '';
}


function update_position_secondary_data()
{
	if ( global_settings.use_positions && position_id.HasValue && ( position = position_id.OptForeignElem ) != undefined )
	{
		division_id = position.division_id;
		position_name = position.name;
		is_division_head = position.is_division_head;
	}
}


function check_duplicates()
{
	array = XQuery( 'for $person in persons where $person/fullname = ' + fullname.XQueryLiteral + ' return $person' );
	if ( ArrayCount( array ) != 0 )
		lib_base.ask_warning_to_continue( Screen, UiText.messages.person_with_fullname_already_exists );
}


function guess_gender_by_names()
{
	if ( StrEnds( middlename, UiText.titles.rus_male_middlename_suffix ) )
	{
		gender_id = 0;
	}
	else if ( StrEnds( middlename, UiText.titles.rus_female_middlename_suffix ) )
	{
		gender_id = 1;
	}
	else if ( firstname != '' )
	{
		try
		{
			gender_id = FirstnameGender( firstname );
		}
		catch ( e )
		{
		}
	}
}



