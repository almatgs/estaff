function OnModulePrepare()
{
	FetchForm( '//base2/base2_person.xmd' ).TopElem.Inherit( FetchForm( 'staff_fields_person.xmd' ) );

	if ( ! AppModuleUsed( 'rcr' ) )
	{
		lib_csd.register_object_csd( '//staff/staff_division.xmd' );
		lib_csd.register_object_csd( '//staff/staff_position.xmd' );
	}
}


function OnModuleInit()
{
	srcDoc = OpenDoc( 'staff_std_vocs.xml' );
	for ( stdVoc in srcDoc.TopElem )
		lib_voc.register_voc( stdVoc );

	if ( ! UseLds )
	{
		lib_voc.init_voc_std_data( card_object_types, FetchDoc( 'staff_std_card_object_types.xml' ).TopElem );
		lib_voc.init_voc_std_data( skill_types, OpenDoc( 'staff_std_skill_types.xml' ).TopElem );

		lib_voc.init_voc_std_data( testing_systems, OpenDoc( 'staff_std_testing_systems.xml' ).TopElem );

		lib_voc.init_voc_std_data( employee_states, OpenDoc( 'staff_std_employee_states.xml' ).TopElem );

		if ( AppUiLangID == 'ru' )
		{
			lib_voc.init_voc_std_data( division_types, lib_factory_options.BuildStdDivisionTypes() );
			lib_voc.init_voc_std_data( position_types, FetchDoc( 'staff_std_position_types.xml' ).TopElem );
			lib_voc.init_voc_std_data( position_levels, OpenDoc( 'staff_std_position_levels.xml' ).TopElem );
			lib_voc.init_voc_std_data( professions, FetchDoc( 'staff_std_professions.xml' ).TopElem );
		}
		else if ( AppUiLangID == 'ua' )
		{
			lib_voc.init_voc_std_data( professions, FetchDoc( 'staff_std_professions_ua.xml' ).TopElem );
		}
		else if ( AppUiLangID == 'et' )
		{
			lib_voc.init_voc_std_data( professions, FetchDoc( 'staff_std_professions_et.xml' ).TopElem );
		}

		if ( AppUiLangID == 'ru' )
			lib_voc.init_voc_std_data( staff_categories, OpenDoc( 'staff_std_staff_categories.xml' ).TopElem );

		lib_voc.init_voc_std_data( person_struct_role_types, OpenDoc( 'staff_std_person_struct_role_types.xml' ).TopElem );
		lib_voc.init_voc_std_data( agents, FetchDoc( 'staff_std_agents.xml' ).TopElem );

		adjust_std_views();

		lib_voc.init_voc_std_elem( views, FetchDoc( 'staff_std_view_divisions.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'staff_std_view_divisions_of_division.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, FetchDoc( 'staff_std_view_positions.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'staff_std_view_positions_of_division.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, OpenDoc( 'staff_std_view_persons_own_with_division.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'staff_std_view_persons_of_division.xml' ).TopElem );

		//if ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) )
		//{
			lib_voc.init_voc_std_elem( views, OpenDoc( '//staff/staff_std_view_person_struct_roles.xml' ).TopElem );
			lib_voc.init_voc_std_elem( views, OpenDoc( '//staff/staff_std_view_person_struct_roles_of_person.xml' ).TopElem );
		//}

		lib_voc.init_voc_std_elem( views, OpenDoc( 'staff_std_view_testings.xml' ).TopElem );
		lib_voc.init_voc_std_elem( views, OpenDoc( 'staff_std_view_training_groups.xml' ).TopElem );
	}

	section = base1_config.voc_sections.AddChild();
	section.id = 'staff';
	section.name = UiText.sections.vocs_staff;
}


function OnModuleStart()
{
	if ( ! UseLds && ! global_settings.old_divisions_check_done && ArrayOptFirstElem( divisions ) != undefined )
	{
		OpenCodeLib( 'x-app://staff/staff_agent_check_divisions.js' ).RunAgentCheckDivisions();
		global_settings.old_divisions_check_done = true;
		global_settings.Doc.Save();
	}
}



function adjust_std_views()
{
	stdDoc = FetchDoc( 'staff_std_view_divisions.xml' ).TopElem;
	if ( global_settings.use_positions && ArrayCount( stdDoc.frame_sub_view_id ) == 1 )
		ArrayFirstElem( stdDoc.frame_sub_view_id ).Value = 'positions_of_division';
}