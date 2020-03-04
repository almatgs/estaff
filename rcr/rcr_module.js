function OnModuleLoad()
{
	FetchForm( '//base2/base2_general.xmd' ).EvalPath( 'access_role_base' ).Inherit( FetchForm( 'rcr_fields_access_role.xmd' ).EvalPath( 'access_role_extension' ) );

	FetchForm( '//base2/base2_org.xmd' ).TopElem.Inherit( FetchForm( 'rcr_fields_org.xmd' ).EvalPath( 'org_base' ) );
	FetchForm( '//base2/base2_person.xmd' ).TopElem.Inherit( FetchForm( 'rcr_fields_person.xmd' ).EvalPath( 'person_base' ) );
	FetchForm( '//base2/base2_event.xmd' ).TopElem.Inherit( FetchForm( 'rcr_fields_event.xmd' ).EvalPath( 'event_base' ) );
	FetchForm( '//base2/base2_user.xmd' ).TopElem.Inherit( FetchForm( 'rcr_fields_user.xmd' ).EvalPath( 'user_base' ) );
	FetchForm( '//base2/base2_group.xmd' ).TopElem.Inherit( FetchForm( 'rcr_fields_group.xmd' ).EvalPath( 'group_base' ) );

	FetchForm( '//base1/base1_general_stat.xmd' ).EvalPath( 'stat_base.settings' ).Inherit( FetchForm( 'rcr_fields_stat_settings.xmd' ).EvalPath( 'stat_settings_base' ) );
	FetchForm( '//base1/base1_general_stat.xmd' ).EvalPath( 'stat_result_v2_base.spec.settings' ).Inherit( FetchForm( 'rcr_fields_stat_settings.xmd' ).EvalPath( 'stat_settings_base' ) );

	//FetchForm( '//base2/base2_workflow_document.xmd' ).EvalPath( 'workflow_document.data' ).Inherit( FetchForm( 'rcr_vacancy_request_data.xmd' ) );

	FetchDoc( '//base2/base2_std_view_events.xml' ).TopElem.AssignElem( OpenDoc( 'rcr_std_view_events.xml' ).TopElem );
}


function OnModulePrepare()
{
	lib_app2.RegisterAppFeature( 'classic_recruit', UiText.titles.classic_recruit );
	lib_app2.RegisterAppFeature( 'mass_recruit', UiText.titles.mass_recruit );
	lib_app2.RegisterAppFeature( 'imod', UiText.titles.imod__long );
	lib_app2.RegisterAppFeature( 'rr_recruit', UiText.titles.rr_recruit_interface );
	//lib_app2.RegisterAppFeature( 'ras', UiText.titles.automated_search );

	if ( ! UseLds && lib_recruit.old_app_data_exists() )
	{
		EvalCodeUrl( 'rcr_old.js', 'LoadOldDataPrepare()' );
	}

	lib_csd.register_object_csd( '//base2/base2_org.xmd' );
	lib_csd.register_object_csd( '//base2/base2_person.xmd' );
	lib_csd.register_object_csd( '//base2/base2_event.xmd' );
	lib_csd.register_object_csd( '//base2/base2_expense.xmd' );
	lib_csd.register_object_csd( '//base2/base2_agreement.xmd' );

	lib_csd.register_object_csd( '//staff/staff_division.xmd' );
	lib_csd.register_object_csd( '//staff/staff_position.xmd' );

	lib_csd.register_object_csd( '//rcr/rcr_candidate.xmd' );
	lib_csd.register_object_csd( '//rcr/rcr_vacancy.xmd' );

	lib_csd.register_object_csd( '//rcr/rcr_vacancy_request.xmd' );
}


function OnModuleInit()
{
	if ( ! System.IsWebClient )
		RegisterFormMapping( 'x-app://rcr/rcr_testing.xmd', 'x-app://staff/staff_testing.xmd' );

	if ( LdsIsClient )
	{
		MergeScreenForm( '//base2/base2_access_role.xms', 'rcr_fields_access_role.xms', 'AccessFieldsAnchor' );

		//str = LoadUrlData( '//base2/base2_event.xms' );
		//str = StrReplaceOne( str, 'RESIZE', 'MAXIMIZED' );
	}

	srcDoc = OpenDoc( 'rcr_std_vocs.xml' );
	for ( stdVoc in srcDoc.TopElem )
		lib_voc.register_voc( stdVoc );

	if ( ! UseLds )
	{
		//lib_voc.get_voc_info_by_id( 'org_roles' ).no_edit = true;

		lib_voc.init_voc_std_data( access_roles, lib_factory_options.BuildStdAccessRoles() );
		lib_voc.init_voc_std_data( agents, OpenDoc( 'rcr_std_agents.xml' ).TopElem );
		lib_voc.init_voc_std_data( card_object_types, lib_factory_options.BuildStdCardObjectTypes() );
		lib_voc.init_voc_std_data( card_attachment_types, OpenDoc( 'rcr_std_card_attachment_types.xml' ).TopElem );
		lib_voc.init_voc_std_data( object_actions, lib_factory_options.BuildStdObjectActions() );
		lib_voc.init_voc_std_data( candidate_entrance_types, OpenDoc( 'rcr_std_candidate_entrance_types.xml' ).TopElem );
		lib_voc.init_voc_std_data( candidate_sources, lib_factory_options.BuildStdCandidateSources() );
		lib_voc.init_voc_std_data( candidate_reject_reasons, OpenDoc( 'rcr_std_candidate_reject_reasons.xml' ).TopElem );
		lib_voc.init_voc_std_data( candidate_withdrawal_reasons, OpenDoc( 'rcr_std_candidate_withdrawal_reasons.xml' ).TopElem );

		lib_voc.init_voc_std_data( event_types, lib_factory_options.BuildStdEventTypes() );
		lib_voc.init_voc_std_data( candidate_states, FetchDoc( 'rcr_std_candidate_states.xml' ).TopElem );
		lib_event.update_object_states_by_event_types( 'candidate' );

		lib_recruit.init_org_types();



		lib_voc.init_voc_std_data( recruit_types, lib_factory_options.BuildStdRecruitTypes() );
		lib_voc.init_voc_std_data( vacancy_reasons, OpenDoc( 'rcr_std_vacancy_reasons.xml' ).TopElem );
		lib_voc.init_voc_std_data( work_types, OpenDoc( 'rcr_std_work_types.xml' ).TopElem );
		lib_voc.init_voc_std_data( work_schedule_types, OpenDoc( 'rcr_std_work_schedule_types.xml' ).TopElem );
		lib_voc.init_voc_std_data( vacancy_difficulty_levels, OpenDoc( 'rcr_std_vacancy_difficulty_levels.xml' ).TopElem );
		lib_voc.init_voc_std_data( vacancy_priorities, OpenDoc( 'rcr_std_vacancy_priorities.xml' ).TopElem );
		lib_voc.init_voc_std_data( vacancy_states, FetchDoc( 'rcr_std_vacancy_states.xml' ).TopElem );
		lib_voc.init_voc_std_data( vacancy_recruit_phases, OpenDoc( 'rcr_std_vacancy_recruit_phases.xml' ).TopElem );
		
		lib_voc.init_voc_std_data( vacancy_term_adjustment_reasons, FetchDoc( '//rcr/rcr_std_vacancy_term_adjustment_reasons.xml' ).TopElem );

		lib_voc.init_voc_std_data( mail_templates, lib_factory_options.BuildStdMailTemplates() );

		lib_voc.init_voc_std_data( workflow_document_types, OpenDoc( 'rcr_std_workflow_document_types.xml' ).TopElem );


		//lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_events.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_events_expired.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_events_of_candidate.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_phone_call_records_of_candidate.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_events_with_type.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_calendar_entries_with_type.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_rr_polls_with_type.xml' ).TopElem );
		
		//if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
			lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_group_interviews.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, FetchDoc( 'rcr_std_view_vacancies.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, FetchDoc( 'rcr_std_view_vacancies_active.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_vacancies_inactive.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_vacancies_tentative.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_vacancies_active_of_org.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_vacancies_of_org.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_vacancies_of_division.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_vacancies_active_with_candidates.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, FetchDoc( 'rcr_std_view_vacancy_instances.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, FetchDoc( 'rcr_std_view_external_vacancies.xml' ).TopElem );

		if ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) || AppModuleUsed( 'module_hoff' ) )
			lib_voc.init_voc_std_elem( views, OpenDoc( '//rcr/rcr_std_view_vacancy_requests.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( '//rcr/rcr_std_view_users_with_workload.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidates.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidates_with_state.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidates_with_state_all.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidates_new.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidates_of_profession.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, FetchDoc( 'rcr_std_view_candidates_of_vacancy.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, FetchDoc( 'rcr_std_view_candidates_of_vacancy_2.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, FetchDoc( 'rcr_std_view_candidates_search.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidates_duty.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidates_call_again.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidates_expired.xml' ).TopElem );

		//if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
			lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidates_from_call_center.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidate_events_of_org.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_candidate_events_of_vacancy.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_professions_with_candidates.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_parsed_messages.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_parsed_messages_of_raw_mailbox_storage.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_parsed_messages_of_raw_folder_storage.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'rcr_std_view_budgets.xml' ).TopElem );

		//if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
			lib_voc.init_voc_std_elem( views, FetchDoc( '//staff/staff_std_view_divisions_with_mass_recruit.xml' ).TopElem );



		lib_voc.init_voc_std_data( stat_sections, OpenDoc( 'rcr_std_stat_sections.xml' ).TopElem );
		if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
			lib_voc.init_voc_std_data( stat_sections, OpenDoc( 'rcr_std_stat_sections_mass_recruit.xml' ).TopElem );

		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_current_vacancies_by_user.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_current_vacancies_by_division.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_current_vacancies_by_org.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_current_users_workload.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_recruit_current_progress.xml' ).TopElem );

		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_summary_2_by_user.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_summary_2_by_division.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_summary_2_by_org.xml' ).TopElem );

		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_with_terms_2_by_division.xml' ).TopElem );

		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_recruit_funnel.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_recruit_rejections.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_candidate_reject_reasons.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_candidate_withdrawal_reasons.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_dismissal_on_probation.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_with_events.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_with_events_2.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_with_candidates.xml' ).TopElem );


		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_summary.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_with_close_terms.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancy_instances_with_close_terms.xml' ).TopElem );

		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_closed.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_by_recruit_types.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_by_difficulty_levels.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_by_professions.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_by_users.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_vacancies_by_candidate_sources.xml' ).TopElem );

		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_candidates_by_sources.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_candidates_by_sources_2.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_candidates_by_professions.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_candidates_with_source_persons.xml' ).TopElem );

		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_recruiters_with_events.xml' ).TopElem );

		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_expenses.xml' ).TopElem );
		lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_budgets.xml' ).TopElem );

		if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
		{
			lib_voc.init_voc_std_elem( stats, FetchDoc( '//staff/staff_std_stat_mass_staff_distribution.xml' ).TopElem );

			lib_voc.init_voc_std_elem( stats, FetchDoc( 'rcr_std_stat_mass_recruit_funnel.xml' ).TopElem );
		}
	}

	vocInfo = vocs.GetOptChildByKey('task_priorities');
	if (vocInfo != undefined)
		vocInfo.section_id = 'hidden';

	if (LdsIsClient)
	{
		base1_config.std_mail_template_entries.AssignElem( OpenDoc( 'rcr_std_mail_template_entries.xml' ).TopElem );
	}

	section = base1_config.voc_sections.AddChild();
	section.id = 'vacancies';
	section.name = UiText.titles.vacancies;

	section = base1_config.voc_sections.AddChild();
	section.id = 'candidates';
	section.name = UiText.titles.candidates;

	section = base1_config.voc_sections.AddChild();
	section.id = 'integration';
	section.name = UiText.sections.vocs_integration;


	csdAnchor = base1_config.csd_anchors.AddChild();
	csdAnchor.id = 'PreStateCsdAnchor';
	csdAnchor.name = UiText.sections.general + ' (PreState)';
	csdAnchor.target_object_type_id.ObtainByValue( 'vacancy' );
}


function OnModuleStart()
{
	if ( UseLds && lib_user.is_person_login )
		throw UiError( 'Not allowed for this login' );

	if ( ! UseLds )
		lib_recruit_provider.Init();

	if ( ! UseLds )
	{
		LoadAppUiSchema();
	}

	if ( UseLds || base1_config.sn_owner == 'test' )
		lib_recruit.set_catalog_constraints();

	if ( UseLds )
	{
		if ( LdsCurUserID != null )
		{
			set_default_view_filters( 'candidates_from_call_center' );
		}
	}

	register_field_usage_fragments();

	if ( LdsIsClient && AppConfig.GetOptProperty( 'rcr4' ) == '1' && System.ClientMajorVersion >= 2 && ! System.IsWebClient )
	{
		FetchAppModule( 'ui' );
		//AppUi.Init();

		//doc = FetchDoc('rcr_application.xml');
		//doc.TopElem.start_url = "x-app://ui/ui_view_root.xml";
	}

	if ( LdsIsClient )
	{
		register_global_settings_sections();

		FetchDoc( 'rcr_view_task_board.xml' ).SetShared();
	}

	if ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) )
	{
		vocInfo = vocs.GetOptChildByKey( 'workflow_types' );
		if ( vocInfo != undefined )
			vocInfo.section_id = '';
	}

	if ( LdsIsServer )
	{
		FetchDoc( 'rcr_view_main.xml' ).TopElem.check_old_data();
	}
}


function LoadAppUiSchema()
{
	if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
	{
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_fragment_call_center_candidate.xml' );
	}

	if ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) )
	{
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_main.xml' );
		
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_object_person.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_object_division.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_object_vacancy.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_object_candidate.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_object_vacancy_request.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_object_event.xml' );
		
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_employees.xml' );

		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancies.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancies_hm.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancies_hm_my.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancies_hm_my_active.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancies_hm_my_inactive.xml' );

		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_candidates.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_candidates_hm_my.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_candidates_hm_my_active.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_candidates_hm_my_inactive.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_candidates_hm_my_todo.xml' );

		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_comments_hm_my.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_comments_hm_subscribed.xml' );

		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_events_my.xml' );

		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancy_requests.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancy_requests_my.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancy_requests_my_active.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancy_requests_my_inactive.xml' );
		ui_builder_server.RegisterUiTemplateFromFile( '//rcr3/rcr3_list_vacancy_requests_todo.xml' );

		//PreloadUiForms();
	}
}


function PreloadUiForms()
{
	ui_builder_server.GetUiTemplateScreenForm( 'Main' );
}


function register_field_usage_fragments()
{
	base1_config.field_usage_fragments.AddChild().object_type_id = 'org';
	base1_config.field_usage_fragments.AddChild().object_type_id = 'person';

	base1_config.field_usage_fragments.AddChild().object_type_id = 'division';
	base1_config.field_usage_fragments.AddChild().object_type_id = 'position';
	base1_config.field_usage_fragments.AddChild().object_type_id = 'vacancy';
	base1_config.field_usage_fragments.AddChild().object_type_id = 'candidate';

	if ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) )
		base1_config.field_usage_fragments.AddChild().object_type_id = 'vacancy_request';

	for ( fragment in base1_config.field_usage_fragments )
		fragment.name = GetForeignElem( card_object_types, fragment.object_type_id ).name;
}


function register_global_settings_sections()
{
	doc = FetchDoc( '//base1/base1_view_global_settings.xml' );

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_policy;
	section.holder = 'global_settings';
	section.screen_form = '//rcr/rcr_global_settings_policy.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_staff;
	section.holder = 'global_settings';
	section.screen_form = '//rcr/rcr_global_settings_staff.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_recruit;
	section.holder = 'global_settings';
	section.screen_form = '//rcr/rcr_global_settings_recruit.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_candidates;
	section.holder = 'global_settings';
	section.screen_form = '//rcr/rcr_global_settings_candidates.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_region;
	section.holder = 'global_settings';
	section.screen_form = '//base1/base1_global_settings_region.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_calendar;
	section.holder = 'cn_global_settings';
	section.screen_form = '//cn/cn_global_settings.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_field_usage;
	section.holder = 'fields_usage';
	section.screen_form = '//base1/base1_fields_usage.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_auto_mailing;
	section.holder = 'global_settings.auto_mailing';
	section.screen_form = '//base1/base1_global_settings_auto_mailing.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_resume_parsing;
	section.holder = 'global_settings.rparse';
	section.screen_form = '//rcr/rcr_global_settings_rparse.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_staff_connector;
	section.holder = 'global_settings.staff_connector';
	section.screen_form = '//rcr/rcr_global_settings_staff_connector.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.global_settings_web;
	section.holder = 'global_settings.web';
	section.screen_form = '//base1/base1_global_settings_web.xms';

	if ( rcr_config.use_imod )
	{
		section = doc.TopElem.sections.AddChild();
		section.name = UiText.sections.global_settings_imod;
		section.holder = 'imod_global_settings';
		section.screen_form = '//imod/imod_global_settings.xms';
	}

	if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
	{
		section = doc.TopElem.sections.AddChild();
		section.name = UiText.titles.call_center;
		section.holder = 'global_settings.call_center';
		section.screen_form = '//rcr/rcr_global_settings_call_center.xms';
	}

	if ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) )
	{
		section = doc.TopElem.sections.AddChild();
		section.name = UiText.titles.rr_recruit_interface;
		section.holder = 'global_settings.hm_recruit';
		section.screen_form = '//rcr/rcr_global_settings_hm_recruit.xms';
	}

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.titles.pd_processing;
	section.holder = 'global_settings.pd_processing';
	section.screen_form = '//rcr/rcr_global_settings_pd_processing.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.sections.mailbox_scanner;
	section.holder = 'global_settings.mailbox_scanner';
	section.screen_form = '//rcr/rcr_global_settings_mailbox_scanner.xms';

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.titles.mobile_app;
	section.holder = 'global_settings.mcaller';
	section.screen_form = '//conn_mcaller/mcaller_global_settings_mcaller.xms';

	if ( rcr_config.use_imod )
	{
		section = doc.TopElem.sections.AddChild();
		section.name = UiText.sections.settings_avito;
		section.holder = 'imod_global_settings.avito';
		section.screen_form = '//imod/imod_global_settings_avito.xms';
	}

	if ( base1_config.use_backup )
	{
		section = doc.TopElem.sections.AddChild();
		section.name = UiText.sections.global_settings_backup;
		section.holder = 'global_settings.backup';
		section.screen_form = '//base1/base1_global_settings_backup.xms';
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

