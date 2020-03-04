function OnModuleInit()
{
	if ( base1_config.is_daemon_control )
		return;

	if ( ! System.IsWebClient )
	{
		if ( UseLds )
			lib_mnt.check_server_version();

		base1_config.use_sql_storage = lib_base.is_sql_storage();
	}

	base1_config.is_setup = ( StrContains( AppConfig.GetOptProperty( 'HOME', '' ), 'stp_view_main.xml' ) );
	if ( base1_config.is_setup )
		return;

	srcDoc = OpenDoc( 'base1_std_vocs.xml' );
	for ( stdVoc in srcDoc.TopElem )
		lib_voc.register_voc( stdVoc );

	if ( ! UseLds )
	{
		if ( base1_config.is_int_version )
			lib_voc.init_voc_std_data( currencies, OpenDoc( 'base1_std_currencies.xml' ).TopElem );
		else
			lib_voc.init_voc_std_data( currencies, OpenDoc( 'base1_std_currencies_rus.xml' ).TopElem );
		
		lib_voc.init_voc_std_data( languages, ArraySelect( OpenDoc( 'base1_std_languages.xml' ).TopElem, 'name.HasValue' ) );

		lib_voc.init_voc_std_data( object_actions, OpenDoc( 'base1_std_object_actions.xml' ).TopElem );

		if ( base1_config.use_backup )
			lib_voc.init_voc_std_data( agents, OpenDoc( 'base1_std_agents.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base1_std_view_agents.xml' ).TopElem );
	}

	section = base1_config.voc_sections.AddChild();
	section.id = 'common';
	section.name = UiText.sections.vocs_common;


	csdAnchor = base1_config.csd_anchors.AddChild();
	csdAnchor.id = 'DefaultCsdAnchor';
	csdAnchor.name = UiText.sections.general;

	csdAnchor = base1_config.csd_anchors.AddChild();
	csdAnchor.id = 'AddInfoCsdAnchor';
	csdAnchor.name = UiText.sections.add_info;
}


function OnModuleStart()
{
	if ( base1_config.is_daemon_control )
		return;

	if ( base1_config.is_setup )
		return;

	base1_config.use_ft_v2 = lib_base.use_ft_v2();
	if ( ! UseLds )
	{
		for ( vocInfo in vocs )
			lib_voc.clean_up_voc_std_elems( vocInfo );
	}

	for ( customVoc in custom_vocs )
		lib_voc.register_voc( customVoc );

	section = base1_config.voc_sections.AddChild();
	section.name = UiText.sections.vocs_misc;

	if ( LdsIsClient )
		lib_csd.register_card_objects_csd_screen_forms();

	if ( ! System.IsWebClient )
		lib_office.init_active_app();

	for ( cardObjectType in ArraySelectAll( card_object_types ) )
	{
		if ( ! UseLds )
		{
			try
			{
				objectName = DefaultDb.GetObjectForm( cardObjectType.id ).Title;
			}
			catch ( e )
			{
				objectName = '';
			}

			if ( cardObjectType.name != objectName )
			{
				doc = DefaultDb.OpenObjectDoc( 'card_object_type', cardObjectType.id );
				doc.TopElem.name = objectName;
				doc.Save();
			}
		}

		lib_base.register_object_coding( cardObjectType.id );
	}

	if ( StrContains( AppConfig.GetOptProperty( 'HOME', '' ), 'stp_view_main.xml' ) )
		return;

	lib_agent.start_agent_manager();
	lib_telephony.Init();
	
	if ( ! UseLds )
	{
		lib_server_api.Init();

		webHandler = base1_config.web_handlers.AddChild();
		webHandler.base_url_path = '/ui_misc/Chart.min.js';
		webHandler.handler_url = 'x-app:/misc/chart/Chart.min.js';
	}

	lib_phone_details.Init();
}


function TriggerOnBeforeSaveDoc( Doc )
{
	if ( ! Doc.WriteDocInfo )
		return;

	if ( UrlSchema( Doc.Url ) != 'x-db-obj' )
		return;

	if ( UrlHost( Doc.Url ) != 'data' )
		return;

	for ( trigger in save_triggers )
	{
		if ( trigger.object_type_id.HasValue && trigger.object_type_id != Doc.TopElem.Name )
			continue;

		if ( trigger.run_on_server )
		{
			if ( UseLds )
				continue;
		}
		else
		{
			if ( LdsIsServer )
				continue;
		}

		if ( trigger.before_save_action_code.HasValue )
		{
			eval( trigger.before_save_action_code );
		}
	}
}


function TriggerOnSaveDoc( Doc )
{
	if ( ! Doc.WriteDocInfo )
		return;

	if ( UrlSchema( Doc.Url ) != 'x-db-obj' )
		return;

	if ( UrlHost( Doc.Url ) != 'data' )
		return;

	for ( trigger in save_triggers )
	{
		if ( trigger.object_type_id.HasValue && trigger.object_type_id != Doc.TopElem.Name )
			continue;

		if ( trigger.run_on_server )
		{
			if ( UseLds )
				continue;
		}
		else
		{
			if ( LdsIsServer )
				continue;
		}

		if ( trigger.action_code.HasValue )
		{
			eval( trigger.action_code );
		}
	}
}



