function OnCheckAuth( Url, Login, Password, AuthType )
{
	return lib_auth.OnCheckAuth( Url, Login, Password, AuthType, Request );
}


function OnGetClientAppInfo( Request )
{
	if ( CurRequest == undefined )
	{
		if ( AppConfig.GetOptProperty( 'rcr4' ) == '1' )
		{
			appInfo = new Object;
			appInfo.start_url = 'x-app://ui/ui_view_root.xml';
			appInfo.ui_style = 'portal';
			appInfo.use_mdi = true;
			return appInfo;
		}

		return undefined;
	}

	if ( AppModuleUsed( 'w4' ) && CurRequest.AuthUserID != null && CurRequest.AuthObject.Name == 'person' )
	{
		appInfo = new Object;

		appInfo.start_url = 'x-app://ui/ui_view_root.xml';
		appInfo.ui_style = 'portal';
		//appInfo.use_mdi = true;

		return appInfo;
	}

	if ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) && CurRequest.AuthUserID != null && CurRequest.AuthObject.Name == 'person' )
	{
		appInfo = new Object;

		appInfo.start_url = 'x-app://ui/ui_view_root.xml';
		appInfo.ui_style = 'portal';
		appInfo.use_mdi = true;

		return appInfo;
	}
	
	return undefined;
}


function OnCheckWriteAccess()
{
	lib_access.OnCheckWriteAccess( Url, UserDocUrl, Doc, Action );
}


function OnWebRequest( Param )
{
	/*if ( ( obj = StrOptScan( Request.UrlPath, '/services/UrlService/GetAppUrl/%s/%s' ) ) != undefined )
	{
		query = UrlQuery( Request.Url );

		Request.HandlerUrl = Url( 'x-app', obj[0], '/' + obj[1] );
		return;
	}*/

	if ( ( obj = StrOptScan( Request.UrlPath, '/module_%s/%s' ) ) != undefined )
	{
		query = UrlQuery( Request.Url );

		Request.HandlerUrl = Url( 'x-app', 'module_' + obj[0], '/web/' + obj[1] );
		return;
	}

	switch ( Request.UrlPath )
	{
		case '/active_position.xml':
		case '/active_positions.xml':
		case '/candidate.xml':
		case '/change_candidate_record.xml':
			Request.HandlerUrl = Url( 'x-app', 'rcr', '/web30' + Request.UrlPath );
			break;
	}

	if ( ! StrBegins( Request.UrlPath, '/services/' ) && AppModuleUsed( 'ws' ) && lib_ws.on_web_request( Request ) )
		return;

	if ( AppModuleUsed( 'w4' ) && lib_w4.OnWebRequest( Request ) )
		return;

	if ( lib_telephony.OnWebRequest( Request ) )
		Cancel();

	if ( lib_mcaller.OnWebRequest( Request ) )
		Cancel();

	if ( lib_server_api.OnWebRequest( Request ) )
		return;

	if ( StrContains( Request.UrlParam, 'outer_person_id=0x' ) && ( Request.UrlPath == '/services/LdsService' || Request.UrlPath == '/sxw/service/get_doc.htm' || Request.UrlPath == '/sxw/service/create_doc.htm' || Request.UrlPath == '/spxml_web/service/create_doc.htm' ) )
	{
		//DebugMsg( Request.UrlParam );
		outerPersonEid = UrlQuery( Request.Url ).outer_person_id;
		//DebugMsg( personEid );

		lib_ipc.check_outer_auth( Request, outerPersonEid );
	}
}


function get_window_title()
{
	if ( ( str = AppConfig.GetOptProperty( 'alt-app-name' ) ) != undefined )
		return str;

	title = AppName;
	
	if ( app2_config.trial_sub_name.HasValue )
		title += ' - ' + app2_config.trial_sub_name;
	
	if ( base1_config.app_instance_sub_title != '' )
		title += ' - ' + base1_config.app_instance_sub_title;

	return title;
}


function check_init_global_settings()
{
	if ( global_settings.is_inited )
		return;

	if ( System.IsWebClient )
		return;

	dlgDoc = OpenDoc('rcr_dlg_init_wizard.xml');
	Screen.ModalDlg( dlgDoc );

	global_settings.is_inited = true;

	if ( ! global_settings.is_agency )
		global_settings.use_other_orgs = true;

	global_settings.Doc.Save();

	/*
	if ( global_settings.default_location_id.HasValue )
	{
		if ( global_settings.default_location_id.ForeignElem.has_metro )
		{
			lib_location.load_location_metro_stations( global_settings.default_location_id );
		}
		else
		{
			fields_usage.set_use_object_field( 'org', 'metro_station_id', false );
			fields_usage.set_use_object_field( 'vacancy', 'metro_station_id', false );
			fields_usage.set_use_object_field( 'candidate', 'metro_station_id', false );

			fields_usage.Doc.Save();
		}
	}
	*/

	lib_recruit.init_org_types();

	InitViews();
}


function InitViews()
{
	filterElem = CreateDynamicElem( 'is_candidate', 'bool' );
	filterElem.Value = false;

	lib_view.store_filter_elem( 'persons_base', filterElem );
}


function check_init_local_settings()
{
	if ( System.IsWebClient )
		return;

	settingsChanged = false;

	if ( ! local_settings.browser_plugins.explorer_plugin_proposed && lib_base.is_explorer_default_browser() && ! lib_base.is_explorer_plugin_registered() )
	{
		if ( lib_base.ask_question( Screen, UiText.messages.should_register_explorer_plugin ) )
			lib_base.register_explorer_plugin();
		
		local_settings.browser_plugins.explorer_plugin_proposed = true;
		settingsChanged = true;
	}

	lib_base.check_plugin_proposed( 'firefox' );
	lib_base.check_plugin_proposed( 'chrome' );

	if ( ! local_settings.mail_plugins.outlook_plugin_proposed && lib_outlook.is_outlook_installed() && ! lib_outlook.is_outlook_plugin_registered() )
	{
		if ( lib_base.ask_question( Screen, UiText.messages.should_register_outlook_plugin ) )
			lib_outlook.register_outlook_plugin();
		
		local_settings.mail_plugins.outlook_plugin_proposed = true;
		settingsChanged = true;
	}

	lib_base.check_plugin_proposed( 'thunderbird' );

	if ( settingsChanged || local_settings.Doc.IsChanged )
		local_settings.Doc.Save();
}


function check_old_data()
{
	if ( lib_recruit.old_app_data_exists() )
	{
		EvalCodeUrl( 'rcr_old.js', 'LoadOldData()' );
		MoveFile( FilePath( AppDirectoryPath(), 'data' ), FilePath( AppDirectoryPath(), 'data_converted' ) );
	}

	if ( lib_recruit.old_heap_data_exists() )
	{
		EvalCodeUrl( 'rcr_old.js', 'LoadOldHeapData()' );
		MoveFile( FilePath( AppDirectoryPath(), 'data_h' ), FilePath( AppDirectoryPath(), 'data_h_converted' ) );
	}

	if ( ! global_settings.conv_old_41_done )
		OpenCodeLib( 'rcr_old_41.js' ).ConvertOldData41();
}


