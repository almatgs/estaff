function OnModulePrepare()
{
	base1_config.use_security_admin_role = ( AppServerConfig.GetOptProperty( 'security-admin-role' ) == '1' );
	if ( base1_config.use_security_admin_role )
		base1_config.use_security_admin_role.LockAsReadOnly();
	
	base1_config.log_ext_security_events = ( AppServerConfig.GetOptProperty( 'log-ext-security-events' ) == '1' );
	if ( base1_config.log_ext_security_events )
		base1_config.log_ext_security_events.LockAsReadOnly();

	if ( ! AppModuleUsed( 'rcr' ) )
	{
		lib_csd.register_object_csd( '//base2/base2_org.xmd' );
		lib_csd.register_object_csd( '//base2/base2_person.xmd' );
		lib_csd.register_object_csd( '//base2/base2_event.xmd' );
	}
}


function OnModuleInit()
{
	srcDoc = FetchDoc( 'base2_std_vocs.xml' );
	for ( stdVoc in srcDoc.TopElem )
		lib_voc.register_voc( stdVoc );

	if ( ! UseLds )
	{
		lib_voc.init_voc_std_data( object_actions, OpenDoc( 'base2_std_object_actions.xml' ).TopElem );
		lib_voc.init_voc_std_data( card_object_types, FetchDoc( 'base2_std_card_object_types.xml' ).TopElem );
		lib_voc.init_voc_std_data( card_attachment_types, OpenDoc( 'base2_std_card_attachment_types.xml' ).TopElem );

		//if ( AppUiLangID == 'ru' )
			//lib_voc.init_voc_std_data( locations, FetchDoc( 'base2_std_locations.xml' ).TopElem );

		lib_voc.init_voc_std_data( countries, base2_common.countries );

		lib_voc.init_voc_std_data( industries, FetchDoc( 'base2_std_industries.xml' ).TopElem );
		lib_voc.init_voc_std_data( org_sizes, OpenDoc( 'base2_std_org_sizes.xml' ).TopElem );
		lib_voc.init_voc_std_data( person_roles, OpenDoc( 'base2_std_person_roles.xml' ).TopElem );
		lib_voc.init_voc_std_data( payment_states, OpenDoc( 'base2_std_payment_states.xml' ).TopElem );
		lib_voc.init_voc_std_data( workflow_document_states, OpenDoc( 'base2_std_workflow_document_states.xml' ).TopElem );
		lib_voc.init_voc_std_data( task_states, OpenDoc( 'base2_std_task_states.xml' ).TopElem );
		lib_voc.init_voc_std_data( task_priorities, OpenDoc( 'base2_std_task_priorities.xml' ).TopElem );
		lib_voc.init_voc_std_data( agents, OpenDoc( 'base2_std_agents.xml' ).TopElem );
		lib_voc.init_voc_std_data( contact_types, OpenDoc( 'base2_std_contact_types.xml' ).TopElem );


		lib_voc.init_voc_std_elem( views, FetchDoc( 'base2_std_view_orgs.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_orgs_active.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_orgs_tentative.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_orgs_lost.xml' ).TopElem );
		//lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_orgs_partner.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_persons.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_persons_base.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_persons_base_active.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_persons_base_inactive.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, FetchDoc( 'base2_std_view_persons_own.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_persons_other.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_persons_birthdays.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_persons_of_org.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_agreements.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_agreements_of_org.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_expenses.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, FetchDoc( 'base2_std_view_events.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_events_of_org.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_events_of_person.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_tasks.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_notifications.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_workflow_documents.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_users.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_groups.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_groups_of_group.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_contact_lists.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_external_accounts.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_phone_call_records.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_email_messages.xml' ).TopElem );
		if ( AppModuleUsed( 'rcr' ) )
			lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_email_messages_of_candidate.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_email_messages_of_person.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'base2_std_view_email_messages_of_org.xml' ).TopElem );
	}

	lib_csd.register_attr_csd_form( person_roles, '//base2/base2_person.xmd', 'roles' );
	lib_csd.register_attr_csd_form( person_roles, persons.Form.Url, 'person.roles' );

	section = base1_config.voc_sections.AddChild();
	section.id = 'org';
	section.name = UiText.sections.vocs_org;

	InitSecurityModel();
	lib_user.init_active_user();
}


function OnModuleStart()
{
	if ( UseLds /*|| AppModuleUsed( 'module_adecco' )*/ )
	{
		lib_user.set_catalog_constraints();
		
		if ( LdsCurUserID != null )
		{
			set_default_view_filters( 'events' );
			set_default_view_filters( 'events_expired' );
		}
	}

	if ( LdsIsClient )
	{
		lib_agent.kick_agent( 'notifications_updater' );
		lib_reminder.Init();
	}

	if ( LdsIsClient && ! AppModuleUsed( 'ras' ) ) // !!!
	{
		base2_common.external_account_types.DeleteChildByKey( 'google' );
	}
}


function set_default_view_filters( viewID )
{
	storedView = lib_view.get_store_view( viewID );
	storedElem = storedView.filter.OptChild( "user_id" );
	if ( storedElem == undefined )
	{
		storedElem = storedView.filter.AddDynamicChild( "user_id", 'integer' );
		storedElem.Value = LdsCurUserID;
		storedView.Doc.SetChanged( true );
	}
}


function InitSecurityModel()
{
	if ( UseLds || ! base1_config.use_security_admin_role )
		return;

	str = AppServerConfig.GetOptProperty( 'security-admin-logins' );
	if ( str == undefined || str == '' )
	{
		LogEvent( '', 'WARNING: Security administrators have not been assigned' );
		return;
	}

	for ( login in String( str ).split( ',' ) )
	{
		user = ArrayOptFindByKey( users, login, 'login' );
		if ( user == undefined )
			LogEvent( '', 'WARNING: Security admin is not found: ' + login );
		else if ( ! user.is_active )
			LogEvent( '', 'WARNING: Security admin account is disabled: ' + login );

		base1_config.security_admins.AddChild().login = login;
	}

	base1_config.security_admins.LockAsReadOnly();
}


