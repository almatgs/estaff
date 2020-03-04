function OnCheckWriteAccess( Url, UserDocUrl, Doc, Action )
{
	//userDoc = OpenDoc( UserDocUrl );
	user = CurAuthObject;
	
	if ( user.Name == 'person' )
	{
		if ( StrContains( Url, '/vacancy_request/' ) )
		{
		}
		else
		{
			Cancel();
		}

		return;
	}
	
	userAccess = user.access_role_id.ForeignElem;

	//if ( Doc == undefined && ! userAccess.allow_change_trash && StrContains( Url, '/trash/' ) )
		//Cancel();

	if ( UrlSchema( Url ) == 'x-db-obj' && StrContains( Url, '/user/' ) )
		return CheckWriteAccessOnUser( user, userAccess, Doc.TopElem, Action );

	if ( UrlSchema( Url ) == 'x-db-obj' && StrContains( Url, '/access_role/' ) && base1_config.use_security_admin_role )
		Cancel();

	if ( userAccess.allow_all )
		return;

	if ( userAccess.read_only )
		Cancel();

	if ( userAccess.prohibit_delete_all && Action == 'delete' )
		Cancel();

	if ( lib_base.object_change_prohibited( Doc.TopElem ) )
		Cancel();

	if ( ! userAccess.allow_change_global_settings )
	{
		if ( StrContains( Url, '/global_settings.xml' ) || StrContains( Url, '/csd/' ) || StrContains( Url, '//data/static/' ) )
			Cancel();

		if ( lib_voc.get_opt_voc_info( lib_base.object_name_to_catalog_name( Doc.TopElem.Name ) ) != undefined )
			Cancel();
	}

	if ( UrlSchema( Url ) != 'x-db-obj' )
		return;

	if ( Doc != undefined )
		coreData = Doc.TopElem;
	else
		coreData = undefined;

	if ( StrContains( Url, '/org/' ) )
	{
		if ( userAccess.prohibit_change_orgs )
			Cancel();
	}
	else if ( StrContains( Url, '/division/' ) )
	{
		if ( userAccess.prohibit_change_divisions )
			Cancel();
	}
	else if ( StrContains( Url, '/person_struct_role/' ) )
	{
		Cancel();
	}
	else if ( StrContains( Url, '/vacancy/' ) && userAccess.prohibit_change_other_user_vacancies )
	{
		coreData = get_doc_core_data( Url, 'vacancy' );

		if ( coreData != undefined && userAccess.prohibit_change_other_user_vacancies && coreData.user_id != user.id )
			Cancel();
	}
	else if ( StrContains( Url, '/candidate/' ) && ( userAccess.prohibit_view_other_user_candidates || userAccess.prohibit_change_other_user_candidates || userAccess.prohibit_change_other_user_active_candidates || userAccess.prohibit_view_other_group_candidates || userAccess.prohibit_open_other_group_candidates ) )
	{
		//coreData = get_doc_core_data( Url, 'candidate' );

		if ( coreData != undefined && coreData.user_id != user.id && ( userAccess.prohibit_view_other_user_candidates || userAccess.prohibit_change_other_user_candidates ) )
			Cancel();

		if ( coreData != undefined && coreData.user_id != user.id && coreData.is_active && userAccess.prohibit_change_other_user_active_candidates )
			Cancel();
	}
	else if ( StrContains( Url, '/event/' ) )
	{
		coreData = get_doc_core_data( Url, 'event' );
	}
	else if ( StrContains( Url, '/calendar_entry/' ) )
	{
		coreData = get_doc_core_data( Url, 'calendar_entry' );
	}
	else if ( StrContains( Url, '/rr_poll/' ) )
	{
		coreData = get_doc_core_data( Url, 'rr_poll' );
	}
	else if ( ( StrContains( Url, '/user/' ) || StrContains( Url, '/group/' ) ) && ! userAccess.allow_change_users )
	{
		Cancel();
	}
	else if ( StrContains( Url, '/access_role/' ) )
	{
		Cancel();
	}
	else if ( StrContains( Url, '/external_account/' ) )
	{
		coreData = get_doc_core_data( Url, 'external_account' );

		if ( coreData != undefined && coreData.user_id != user.id )
			Cancel();
	}

	if ( AppModuleUsed( 'module_rgs' ) && coreData != undefined && coreData.PropertyExists( 'OnCheckReadAccess' ) )
	{
		if ( ! coreData.CheckAccess( user, 'write' ) )
			Cancel();
	}
}


function CheckWriteAccessOnUser( user, userAccess, object, action )
{
	if ( ! base1_config.use_security_admin_role )
	{
		if ( userAccess.allow_all )
			return;

		if ( userAccess.read_only )
			Cancel();

		if ( userAccess.prohibit_delete_all && action == 'delete' )
			Cancel();

		if ( lib_base.object_change_prohibited( Doc.TopElem ) )
			Cancel();

		if ( ! userAccess.allow_change_users )
			Cancel();

		return;
	}

	if ( action == 'delete' )
	{
		if ( lib_user.IsUserSecurityAdmin( user ) )
			Cancel();

		if ( userAccess.allow_all )
		{
			LogEvent( "auth-events", "user deleted\tLDS\t" + user.login + "\t" + CurRequest.RemoteIP + "\tlogin:" + object.login );
			return;
		}

		if ( userAccess.read_only )
			Cancel();

		if ( userAccess.prohibit_delete_all )
			Cancel();

		if ( ! userAccess.allow_change_users )
			Cancel();

		LogEvent( "auth-events", "user deleted\tLDS\t" + user.login + "\t" + CurRequest.RemoteIP + "\tlogin:" + object.login );
		return;
	}

	prevObject = undefined;
	if ( ! object.Doc.NeverSaved )
	{
		try
		{
			prevObjectDoc = OpenDoc( object.Doc.Url );
			prevObject = prevObjectDoc.TopElem;
		}
		catch ( e )
		{
			LogEvent( '', 'WARNING: Unable to open object ' + object.Doc.Url + '. ' + e );
		}
	}

	if ( lib_user.IsUserSecurityAdmin( user ) )
	{
		if ( prevObject == undefined )
			throw UiError( 'Security administrator is not allowed to create users' );

		prevObject1 = prevObject.Clone();
		prevObject1.need_approval.AssignElem( object.need_approval );
		prevObject1.access_role_id.AssignElem( object.access_role_id );
		prevObject1.creation_date.AssignElem( object.creation_date );
		prevObject1.last_mod_date.AssignElem( object.last_mod_date );
		prevObject1.doc_info.AssignElem( object.doc_info );

		if ( ! prevObject1.EqualToElem( object ) )
			throw UiError( 'Security administrator is not allowed to change user basic data' );// +  prevObject1.Xml + '\r\n' + object.Xml );

		if ( ! object.need_approval && prevObject.need_approval )
			LogEvent( "auth-events", "user approved\tLDS\t" + user.login + "\t" + CurRequest.RemoteIP + "\tlogin:" + object.login + ",access_role_id:" + object.access_role_id );
		else if ( object.need_approval && ! prevObject.need_approval )
			LogEvent( "auth-events", "user approval revoked\tLDS\t" + user.login + "\t" + CurRequest.RemoteIP + "\tlogin:" + object.login + ",access_role_id:" + object.access_role_id );
		else if ( ! prevObject.EqualToElem( object ) )
			LogEvent( "auth-events", "user modified\tLDS\t" + user.login + "\t" + CurRequest.RemoteIP + "\tlogin:" + object.login + ",access_role_id:" + object.access_role_id );
	}
	else
	{
		if ( ! userAccess.allow_all )
		{
			if ( userAccess.read_only )
				Cancel();

			if ( ! userAccess.allow_change_users )
				Cancel();
		}

		if ( prevObject == undefined )
		{
			if ( ! object.need_approval )
				throw UiError( 'Only security administrator is allowed to approve user' );

			LogEvent( "auth-events", "user created\tLDS\t" + user.login + "\t" + CurRequest.RemoteIP + "\tlogin:" + object.login + ",access_role_id:" + object.access_role_id );
		}
		else
		{
			if ( object.need_approval != prevObject.need_approval )
				throw UiError( 'Only security administrator is allowed to approve user' );

			if ( object.access_role_id != prevObject.access_role_id )
				throw UiError( 'Only security administrator is allowed to change access role' );

			if ( ( object.login != prevObject.login ) && ! object.need_approval )
				throw UiError( 'Changing login of an approved user is not permitted' );

			if ( ! prevObject.EqualToElem( object ) )
				LogEvent( "auth-events", "user modified\tLDS\t" + user.login + "\t" + CurRequest.RemoteIP + "\tlogin:" + object.login );
		}
	}
}


function OnUserSave( user )
{
	if ( UrlHost( user.Doc.Url ) == 'trash' )
		return;

	//DebugMsg( 'OnUserSave ' + user.Doc.Url );

	object = user;
	prevObject = undefined;
	if ( ! object.Doc.NeverSaved )
	{
		try
		{
			prevObjectDoc = OpenDoc( object.Doc.Url );
			prevObject = prevObjectDoc.TopElem;
		}
		catch ( e )
		{
			LogEvent( '', 'WARNING: Unable to open object ' + object.Doc.Url + '. ' + e );
		}
	}

	if ( prevObject == undefined )
	{
		LogEvent( "auth-events", "user created\tLDS\t" + GetCurAuthUserDesc() + "\tuser:" + object.login + ",access_role_id:" + object.access_role_id );
	}
	else
	{
		if ( object.is_active && ! prevObject.is_active )
			LogEvent( "auth-events", "user activated\tLDS\t" + GetCurAuthUserDesc() + "\tuser:" + object.login );
		else if ( ! object.is_active && prevObject.is_active )
			LogEvent( "auth-events", "user disabled\tLDS\t" + GetCurAuthUserDesc() + "\tuser:" + object.login );

		if ( object.password != prevObject.password || object.password_hash != prevObject.password_hash )
			LogEvent( "auth-events", "user password changed\tLDS\t" + GetCurAuthUserDesc() + "\tuser:" + object.login );

		if ( object.access_role_id != prevObject.access_role_id )
			LogEvent( "auth-events", "user access role changed\tLDS\t" + GetCurAuthUserDesc() + "\tuser:" + object.login + ",access_role_id:" + object.access_role_id );

		if ( object.login != prevObject.login )
			LogEvent( "auth-events", "user login changed\tLDS\t" + GetCurAuthUserDesc() + "\tuser:" + object.login + ",prev_login:" + prevObject.login );

		if ( object.fullname != prevObject.fullname )
			LogEvent( "auth-events", "user fullname changed\tLDS\t" + GetCurAuthUserDesc() + "\tuser:" + object.login );
	}
}


function OnUserDelete( user )
{
	if ( UrlHost( user.Doc.Url ) == 'trash' )
		return;

	LogEvent( "auth-events", "user deleted\tLDS\t" + GetCurAuthUserDesc() + "\tuser:" + user.login );
}


function OnAccessRoleSave( accessRole )
{
	if ( UrlHost( accessRole.Doc.Url ) == 'trash' )
		return;

	//DebugMsg( 'OnUserSave ' + user.Doc.Url );

	object = accessRole;
	prevObject = undefined;
	if ( ! object.Doc.NeverSaved )
	{
		try
		{
			prevObjectDoc = OpenDoc( object.Doc.Url );
			prevObject = prevObjectDoc.TopElem;
		}
		catch ( e )
		{
			LogEvent( '', 'WARNING: Unable to open object ' + object.Doc.Url + '. ' + e );
		}
	}

	if ( prevObject == undefined )
	{
		LogEvent( "auth-events", "access role created\tLDS\t" + GetCurAuthUserDesc() + "\tid:" + object.id + ",name:" + object.name );
	}
	else
	{
		LogEvent( "auth-events", "access role changed\tLDS\t" + GetCurAuthUserDesc() + "\tid:" + object.id + ",name:" + object.name );
	}
}


function OnAccessRoleDelete( accessRole )
{
	if ( UrlHost( accessRole.Doc.Url ) == 'trash' )
		return;

	LogEvent( "auth-events", "access role deleted\tLDS\t" + GetCurAuthUserDesc() + "\tid:" + accessRole.id + ",name:" + accessRole.name );
}


function GetCurAuthUserDesc()
{
	return ( CurRequest != undefined ? CurRequest.AuthLogin : "" ) + "\t" + ( CurRequest != undefined ? CurRequest.RemoteIP : "" );
}


function get_doc_core_data( docUrl, objectName )
{
	try
	{
		return OpenDoc( docUrl, 'separate=1' ).TopElem;
	}
	catch ( e )
	{
		return undefined;
		//coreData = OpenNewDoc( DefaultDb.GetObjectForm( objectName ).Url, 'separate=1' ).TopElem;
		//coreData.u
	}
}


