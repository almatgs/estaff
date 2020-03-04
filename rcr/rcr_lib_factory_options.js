function BuildStdAccessRoles()
{
	array = FetchDoc( 'rcr_std_access_roles.xml' ).TopElem;

	if ( ! base1_config.use_security_admin_role )
	{
		elem = array.GetOptChildByKey( 'security_admin' );
		if ( elem != undefined )
			elem.Delete();
	}

	return array;
}


function BuildStdCardObjectTypes()
{
	array = FetchDoc( 'rcr_std_card_object_types.xml' ).TopElem;

	if ( ! lib_app2.AppFeatureEnabled( 'rr_recruit' ) )
	{
		array.GetChildByKey( 'vacancy_request' ).Delete();
	}

	return array;
}


function BuildStdObjectActions()
{
	array = FetchDoc( 'rcr_std_object_actions.xml' ).TopElem;

	if ( ! AppModuleUsed( 'cbot' ) )
	{
		array.GetChildByKey( 'send_to_cbot_first_contact' ).Delete();
	}

	return array;
}


function BuildStdEventTypes()
{
	array = FetchDoc( 'rcr_std_event_types.xml' ).TopElem;

	if ( ! lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
	{
		array.GetChildByKey( 'group_training' ).Delete();
		array.GetChildByKey( 'training' ).Delete();
	}

	if ( ! lib_app2.AppFeatureEnabled( 'rr_recruit' ) )
	{
		array.GetChildByKey( 'comment' ).Delete();
	}

	if ( ! AppModuleUsed( 'cbot' ) )
	{
		array.GetChildByKey( 'cbot_first_contact' ).Delete();
	}

	return array;
}


function BuildStdRecruitTypes()
{
	array = FetchDoc( 'rcr_std_recruit_types.xml' ).TopElem;

	if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
	{
		if ( ! lib_app2.AppFeatureEnabled( 'classic_recruit' ) )
		{
			array = ArraySelect( array, 'id == \'selection\'' );
		}

		elem = ArrayOptFindByKey( array, 'selection', 'id' );

		elem.use_candidate_position_type = true;
		elem.use_candidate_desired_division = true;
		elem.prohibit_spots = true;
	}

	return array;
}


function BuildStdDivisionTypes()
{
	array = OpenDoc( '//staff/staff_std_division_types.xml' ).TopElem;

	if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
	{
		elem = array.GetChildByKey( 'shop' );
		elem.is_mass_recruit_division = true;
	}

	return array;
}


function BuildStdMailTemplates()
{
	if ( AppUiLangID == 'ru' )
		array = OpenDoc( 'rcr_std_mail_templates_ru.xml' ).TopElem;
	else if ( AppUiLangID == 'en' )
		array = OpenDoc( 'rcr_std_mail_templates_en.xml' ).TopElem;
	else if ( AppUiLangID == 'et' )
		array = OpenDoc( 'rcr_std_mail_templates_et.xml' ).TopElem;

	array2 = OpenDoc( 'rcr_std_mail_templates_2.xml', 'ui-text-values=1' ).TopElem;

	if ( ! lib_app2.AppFeatureEnabled( 'rr_recruit' ) )
	{
		elem = array2.GetChildByKey( 'notify_resp_person_on_workflow_document' );
		elem.Delete();

		elem = array2.GetChildByKey( 'notify_orig_person_on_workflow_document_state' );
		elem.Delete();

		elem = array2.GetChildByKey( 'notify_resp_person_on_workflow_document_cancel' );
		elem.Delete();
	}

	return ArrayUnion( array, array2 );
}


function BuildStdCandidateSources()
{
	array = OpenDoc( 'rcr_std_candidate_sources.xml' ).TopElem;
	stdBaseElem = array.GetChildByKey( 'site' );

	if ( global_settings.country_id == 'UKR' )
	{
		stdElem = stdBaseElem.std_candidate_sources.ObtainChildByKey( 'hh.ru' );
		stdElem.name = 'hh.ua';
		stdElem.is_site = true;
		stdElem.keywords.ObtainChildByValue( 'hh.ua' );
		stdElem.keywords.ObtainChildByValue( 'hh.kz' );

		stdElem = stdBaseElem.std_candidate_sources.ObtainChildByKey( 'work.ua' );
		stdElem.name = stdElem.id;
		stdElem.is_site = true;

		stdElem = stdBaseElem.std_candidate_sources.ObtainChildByKey( 'ukrjob.net' );
		stdElem.name = stdElem.id;
		stdElem.is_site = true;

		stdElem = stdBaseElem.std_candidate_sources.ObtainChildByKey( 'job.ukr.net' );
		stdElem.name = stdElem.id;
		stdElem.is_site = true;
	}
	else if ( global_settings.country_id == 'RUS' || ! base1_config.is_int_version )
	{
		stdElem = stdBaseElem.std_candidate_sources.ObtainChildByKey( 'hh.ru' );
		stdElem.name = stdElem.id;
		stdElem.is_site = true;
		stdElem.keywords.ObtainChildByValue( 'hh.ua' );
		stdElem.keywords.ObtainChildByValue( 'hh.kz' );

		stdElem = stdBaseElem.std_candidate_sources.ObtainChildByKey( 'superjob.ru' );
		stdElem.name = stdElem.id;
		stdElem.is_site = true;

		stdElem = stdBaseElem.std_candidate_sources.ObtainChildByKey( 'rabota.ru' );
		stdElem.name = stdElem.id;
		stdElem.is_site = true;

		stdElem = stdBaseElem.std_candidate_sources.ObtainChildByKey( 'zarplata.ru' );
		stdElem.name = stdElem.id;
		stdElem.is_site = true;

		stdElem = stdBaseElem.std_candidate_sources.ObtainChildByKey( 'job.ru' );
		stdElem.name = stdElem.id;
		stdElem.is_site = true;
	}

	return array;
}

