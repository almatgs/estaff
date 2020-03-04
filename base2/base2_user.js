function OnCreate()
{
	is_active = true;

	if ( base1_config.use_security_admin_role )
		need_approval = true;
}


function OnBeforeSave()
{
	if ( base1_config.use_security_admin_role )
	{
		if ( CurRequest == undefined && ! LdsIsClient )
			throw UiError( "User cannot be modified outside a security context" );

		if ( need_approval && lib_user.IsUserSecurityAdmin( this ) )
			need_approval = false;
	}

	if ( password.HasValue && ! password_hash.HasValue )
	{
		password_hash = PasswordHash( password );
		password.Clear();
	}

	if ( person_id != null && ( person = person_id.OptForeignElem ) != undefined )
	{
		lastname = person.lastname;
		firstname = person.firstname;
		middlename = person.middlename;
	}

	if ( base1_config.log_ext_security_events && ! base1_config.use_security_admin_role )
	{
		lib_access.OnUserSave( this );
	}
}


function OnSave()
{
	//if ( main_group_id.HasValue && main_group_id.ForeignElem.members.ChildByKeyExists( id ) )
}


function OnDelete()
{
	if ( base1_config.log_ext_security_events && ! base1_config.use_security_admin_role )
	{
		lib_access.OnUserDelete( this );
	}
}


function GetPrimaryDispName()
{
	str = GetObjectProperty( this, global_settings.user_primary_disp_name );
	if ( str != '' )
		return str;
	else
		return this.login;
}


function image_url()
{
	if ( is_active )
	{
		return ( need_approval ? '//base_pict/user_tentative.ico' : '//base_pict/user.ico' );
	}
	else
	{
		return '//base_pict/user_inactive.ico';
	}
}


function handle_before_ui_save()
{
	if ( send_email_notif )
	{ 
		if ( ! person_id.HasValue )
			throw UiError( UiText.errors.user_person_not_specified );

		if ( ! person_id.ForeignElem.email.HasValue )
			throw UiError( UiText.errors.user_person_email_not_specified );
	}

	if ( this.is_active != view.prev_data.is_active )
		this.last_is_active_change_date = CurDate;

	//if ( view.prev_data.password.HasValue && this.password != view.prev_data.password )
		//this.last_password_change_date = CurDate;
}


function on_ui_save()
{
	view.prev_data.AssignElem( this );
}


function matches_group( groupID )
{
	if ( main_group_id == groupID )
		return true;
	
	if ( ! main_group_id.HasValue )
		return false;

	return ( ArrayOptFindByKey( main_group_id.ForeignElem.get_implicit_groups_array(), groupID, 'id' ) != undefined );
}


function handle_select_base_divisions()
{
	for ( divisionID in lib_base.select_objects_from_view( 'divisions' ) )
	{
		if ( base_divisions.GetOptChildByKey( divisionID ) != undefined )
			continue;

		if ( ArrayCount( ArrayIntersect( base_divisions, lib_base.get_hier_chain( divisions, divisionID ), 'division_id', 'id' ) ) != 0 )
		{
			lib_base.show_warning_message( ActiveScreen, StrReplaceOne( UiText.messages.division_xxx_already_in_base_divisions, '%s', GetForeignElem( divisions, divisionID ).name ) );
			continue;
		}

		base_divisions.AddChild().division_id = divisionID;
		Doc.SetChanged( true );
	}
}
