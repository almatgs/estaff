function OnInit()
{
	this.UpdateLegacyFields();

	if ( UseLds && lib_user.active_user_access.prohibit_view_vacancy_revenue )
	{
		revenue.Clear();
		payment_date.Clear();
	}

	if ( final_candidate_id.HasValue )
		multi_final_candidate_id.ObtainByValue( final_candidate_id );

	if ( ! final_candidate_id.HasValue )
		check_next_final_candidate();
}


function OnCheckReadAccess()
{
	if ( LdsCurUser.Name == 'person' && ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) || AppModuleUsed( 'w4' ) ) )
		return;

	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	check_exclusive_read_access( LdsCurUser );

	//DebugMsg( accessType );

	if ( AppModuleUsed( 'module_rgs' ) && accessType == 'read' )
	{
		match = OpenCodeLib( '//module_rgs/rgs_lib_rgs.js' ).check_object_custom_access( this, LdsCurUser, 'read' );
		if ( match == true )
			return;
		else if ( match == false )
			Cancel();
	}

	if ( userAccess.prohibit_view_other_user_vacancies && user_id != LdsCurUser.id )
		Cancel();

	if ( userAccess.prohibit_view_other_group_vacancies && ! LdsCurUser.matches_group( group_id ) )
		Cancel();

	if ( userAccess.prohibit_view_other_division_vacancies && ! lib_base.is_catalog_hier_child_or_self( divisions, division_id, lib_user.active_user_info.person_id.ForeignElem.division_id ) )
		Cancel();

	if ( userAccess.restrict_view_vacancies_with_recruit_type )
	{
		if ( user_id != LdsCurUser.id && recruit_type_id.HasValue && ! userAccess.vacancy_recruit_type_id.ByValueExists( recruit_type_id ) )
			Cancel();
	}
}


function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;
	recruit_type_id = lib_user.active_user_info.main_group_id.ForeignElem.recruit_type_id;
	lib_base.init_new_card_object( This );

	start_date = CurDate;

	if ( global_settings.vacancy_default_max_work_period.length.HasValue )
	{
		if ( ! this.state_id.ForeignElem.set_object_tentative )
			this.work_start_date = this.start_date;

		orig_max_term_to_vacancy_close.AssignElem( global_settings.vacancy_default_max_work_period );
		lib_vacancy.UpdateVacancyTermDatesByOrigMaxTerms( this );
	}

	if ( global_settings.use_multi_currencies.position_salary )
		salary_currency_id = global_settings.default_currency_id;
}


function OnUpdateSecondaryData( srcObject )
{
	ft_secondary_text.Clear();

	if ( global_settings.is_agency && org_id.HasValue )
		ft_secondary_text = org_id.ForeignDispName;
}


function OnBeforeSave()
{
	is_active = check_active();
	update_start_date();

	if ( state_id.ForeignElem.close_object )
		close_date = state_date;
	else
		close_date = null;

	lib_vacancy.UpdateVacancyFinalCandidateDepData( this );
	//update_periods();

	vtt = lib_vacancy.GetLegacyVacancyTermType();
	maxTermField = this.Child( vtt.max_term_field_name );
	if ( maxTermField.length.HasValue )
		this.max_work_term.AssignElem( maxTermField );

	if ( is_mp_vacancy && ! is_mass_vacancy )
	{
		for ( instance in instances )
		{
			if ( ! instance.id.HasValue )
				instance.id = UniqueID();

			instance.is_active = instance.check_active();
			if ( instance.state_id.ForeignElem.close_object )
				instance.close_date = instance.state_date;
			else
				instance.close_date = null;
			//instance.update_final_candidate_dep_data();
			//instance.update_periods();
		}
	}

	if ( is_mp_vacancy )
	{
		if ( is_mass_vacancy )
		{
			active_req_quantity_f = active_req_quantity;
		}
		else
		{
			this.req_quantity = this.get_req_quantity();

			if ( global_settings.use_fractional_mp_vacancies )
			{
				active_req_quantity_f = get_active_req_quantity_f();
				active_req_quantity = active_req_quantity_f;
			}
			else
			{
				active_req_quantity = get_active_req_quantity();
				active_req_quantity_f = active_req_quantity;
			}
		}
	}
	else
	{
		this.req_quantity = 1;
		active_req_quantity = ( is_active ? 1 : 0 );
	}

	if ( global_settings.use_positions && position_id.HasValue && ( global_settings.force_vacancy_position_names || name == '' ) )
		name = position_id.ForeignElem.name;
	else if ( global_settings.use_position_types && position_type_id.HasValue && ! name.HasValue )
		name = position_type_id.ForeignDispName;

	rr_persons_desc = '';
	rr_persons_phone_desc = '';

	for ( rrPerson in ArraySelectAll( rr_persons ) )
	{
		person = rrPerson.person_id.OptForeignElem;
		if ( person == undefined )
		{
			//rrPerson.Delete();
			continue;
		}

		if ( rr_persons_desc != '' )
			rr_persons_desc += ', ';

		rr_persons_desc += person.fullname;

		if ( rr_persons_phone_desc != '' )
			rr_persons_phone_desc += '; ';

		rr_persons_phone_desc += person.disp_phone;
	}


	if ( inet_data.is_active )
	{
		if ( ArrayOptFind( inet_data.target_sites, 'eid.HasValue' ) == undefined )
			inet_data.is_active = false;
	}

	inet_target_sites.Clear();
	inet_is_active = inet_data.is_active;

	if ( inet_data.is_active )
	{
		for ( targetSite in inet_data.target_sites )
		{
			if ( ! targetSite.is_enabled && targetSite.last_publish_date == null )
				continue;

			inetTragetSite = inet_target_sites.AddChild();
			inetTragetSite.AssignElem( targetSite );
		}
	}

	//if ( inet_data.html_comment.HasValue )
		//inet_data.html_comment = lib_html.adjust_to_simple_formatting( inet_data.html_comment );

	inet_uid.Clear();

	for ( targetSite in inet_data.target_sites )
	{
		if ( targetSite.eid.HasValue )
			inet_uid.Add().Value = targetSite.site_id + ':' + targetSite.eid;

		for ( targetLocation in targetSite.target_locations )
		{
			if ( targetLocation.eid.HasValue )
				inet_uid.ObtainByValue( targetSite.site_id + ':' + targetLocation.eid );
		}
	}

	if ( user_id.HasValue && ( ! group_id.HasValue || global_settings.update_vacancy_group_by_user ) )
		group_id = user_id.ForeignElem.main_group_id;

	lib_voc.update_idata_by_voc( group_id );

	if ( final_candidate_id.HasValue )
	{
		candidate = GetForeignElem( candidates, final_candidate_id );
		if ( ! candidate.spots.ChildByKeyExists( id ) )
			final_candidate_id.Clear();
	}

	for ( candidateID in ArraySelectAll( multi_final_candidate_id ) )
	{
		candidate = GetForeignElem( candidates, candidateID );
		if ( ! candidate.spots.ChildByKeyExists( id ) )
			multi_final_candidate_id.DeleteByValue( candidateID );
	}
}


function OnSave()
{
	lib_base.update_object_secondary_data( 'org', org_id );

	if ( global_settings.use_mp_vacancies )
		build_instances();
}


function OnDelete()
{
	if ( global_settings.use_mp_vacancies )
		delete_instances();
}



function image_url()
{
	if ( is_tentative )
		return '//base_pict/vacancy_tentative.ico';
	else if ( is_active )
		return '//base_pict/vacancy.ico';
	else
		return '//base_pict/vacancy_inactive.ico';
}


function handle_before_ui_save()
{
	fields_usage.check_object_required_fields( id.Parent );

	if ( UseLds && this.state_id == 'vacancy_opened' && ! this.user_id.HasValue )
		throw UiError( UiText.errors.recruiter_not_specified );

	if ( AppModuleUsed( 'module_zest' ) )
	{
		fields_usage.check_object_required_attc( id.Parent );
	}

	for ( termAdjustment in term_adjustments )
	{
		if ( termAdjustment.reason_id.ForeignElem.require_comment )
		{
			if ( termAdjustment.comment == '' )
				throw UiError( UiText.errors.field_is_empty + ': ' + UiText.titles.term_adjustments + ', ' + UiText.fields.comment );
		}
	}


	
	if ( AppModuleUsed( 'ras' ) && this.use_ras )
	{
		lib_ras.CheckUiVacancyRasInfo( this );
		lib_agent.EnsureAgentHasSchedule( 'automated_resume_search', {unit_id:'minute',length:60} );
		if ( this.ras_info.bot_appointment.use_orig_rr_person || this.ras_info.bot_appointment.use_rr_persons )
			lib_agent.EnsureAgentHasSchedule( 'sync_with_ext_calendars', {unit_id:'minute',length:30} );
	}

	check_duplicate_mass_vacancies();
	check_required_template();

	if ( view.prev_data.is_active )
	{
		lib_vacancy_publish.CheckVacancyAutoDelete( id.Parent );
		check_deactivate();
	}

	if ( Doc.NeverSaved )
	{
		check_create_notif();

		if ( rcr_config.use_vacancy_recruit_phases )
			lib_vacancy.update_vacancy_recruit_phase( this );
	}

	if ( global_settings.use_vacancy_recruit_plans )
		lib_vacancy.UpdateVacancyRecruitPlanDeviation( this );

	lib_vacancy_publish.CheckVacancyAutoPublish( id.Parent );
}


function active_req_quantity_desc()
{
	if ( this.is_mass_vacancy )
		return active_req_quantity;
	else if ( this.is_mp_vacancy )
		return this.active_req_quantity + '/' + this.req_quantity;
	else
		return ( this.is_active ? '1/1' : '-/1' );
}


function days_in_state()
{
	if ( state_date == null || state_date >= CurDate )
		return 0;

	return lib_base.get_date_days_diff( CurDate, state_date );
}


function wdays_in_state()
{
	if ( state_date == null || state_date >= CurDate )
		return 0;

	return lib_calendar.get_date_wdays_diff( CurDate, state_date );
}


function UpdateLegacyFields()
{
	if ( ! start_date.HasValue )
		start_date = Doc.TopElem.creation_date;

	if ( ! this.state_id.ForeignElem.set_object_tentative )
	{
		if ( this.start_date != null && ! this.work_start_date.HasValue )
			this.work_start_date = this.start_date;
	}

	if ( ! this.state_date.HasValue )
	{
		if ( this.state_id.ForeignElem.close_object )
			this.state_date = this.close_date;
		else if ( ! this.state_id.ForeignElem.deactivate_object )
			this.state_date = this.start_date;
	}

	if ( this.is_mp_vacancy && ! this.is_mass_vacancy )
	{
		for ( instance in this.instances )
		{
			if ( ! instance.state_date.HasValue )
				instance.state_date = this.state_date;
		}
	}

	if ( this.max_work_term.length.HasValue )
	{
		if ( global_settings.vacancy_work_end_final_candidate_state == 'job_offer' )
		{
		}
		else if ( global_settings.vacancy_work_end_final_candidate_state == 'job_offer:succeeded' )
		{
		}
		else
		{
			if ( ! max_term_to_vacancy_close.length.HasValue )
				max_term_to_vacancy_close.AssignElem( this.max_work_term );
		}
	}

	lib_vacancy.UpdateVacancyWorkDaysNum( this );
}



function check_duplicate_mass_vacancies()
{
	if ( ! global_settings.prohibit_duplicate_mass_vacancies )
		return;
	
	if ( ! profession_id.ForeignElem.use_mass_recruiting )
		return;

	if ( ! global_settings.is_agency )
		return;

	if ( ! org_id.HasValue )
		return;

	queryStr = 'for $elem in vacancies where $elem/org_id = ' + org_id + ' and $elem/profession_id = ' + profession_id + ' return $elem';
	array = XQuery( queryStr );
	array = ArraySelect( array, 'This.id != ' + id );

	if ( ArrayOptFirstElem( array ) != undefined )
		throw UiError( UiText.errors.duplicate_mass_vacancy_found );
}


function check_required_template()
{
	if ( ! global_settings.require_vacancy_templates )
		return;

	if ( template_id.HasValue )
	{
		load_data_from_template();
		return;
	}

	if ( ! profession_id.HasValue )
		return;

	array = ArraySelectByKey( vacancy_templates, profession_id, 'profession_id' );
	if ( ArrayCount( array ) == 0 )
		return;

	if ( ArrayCount( array ) > 1 && location_id.HasValue )
	{
		array2 = ArraySelectByKey( array, location_id, 'location_id' );
		if ( ArrayCount( array2 ) != 0 )
			array = array2;
	}

	if ( ArrayCount( array ) == 1 )
	{
		template = ArrayFirstElem( array );
	}
	else
	{
		template = lib_base.select_elem( array );
	}

	template_id = template.id;
	load_data_from_template();
}


function handle_ui_save()
{
	if ( view.send_create_notif )
		send_create_notif();

	check_change_state_notif();

	if ( UseLds && is_active && user_id != view.prev_data.user_id && user_id != LdsCurUserID )
	{
		if ( lib_base.ask_question( Screen, UiText.messages.send_vacancy_change_user_notif ) )
		{
			lib_notif.create_notification( UiText.titles.vacancy_assigned, id.Parent );
		}
	}
	
	view.prev_data.AssignElem( id.Parent );
	DropXQueryCache( ObjectDocUrl( 'data', 'vacancy_instance', 1 ) );
}


function check_change_state_notif()
{
	if ( ! global_settings.use_vacancy_change_state_notif )
		return;

	if ( user_id != lib_user.active_user_info.id && view.prev_data.state_id.HasValue && state_id != view.prev_data.state_id )
	{
		if ( ! global_settings.confirm_vacancy_change_state_notif || lib_base.ask_question( ActiveScreen, UiText.messages.send_vacancy_change_state_notif ) )
			lib_notif.create_notification( UiText.titles.vacancy_state_changed + ': ' + state_id.ForeignDispName, id.Parent );
	}
}


function load_data_from_template()
{
	if ( ! template_id.HasValue )
		return;

	templateDoc = OpenDoc( template_id.ForeignObjectUrl );
	template = templateDoc.TopElem;

	if ( ! profession_id.HasValue )
		profession_id = template.profession_id;

	if ( ! location_id.HasValue )
		location_id = template.location_id;

	if ( ! inet_data.position_name.HasValue || global_settings.require_vacancy_templates )
		inet_data.position_name = template.inet_data.position_name;

	if ( ! inet_data.location_id.HasValue || ( global_settings.require_vacancy_templates && template.inet_data.location_id.HasValue ) )
		inet_data.location_id.SetValues( template.inet_data.location_id );

	//if ( ! inet_data.brand_id.HasValue )
		//inet_data.brand_id.SetValues( template.inet_data.brand_id );

	//if ( ! inet_data.work_type_id.HasValue || global_settings.require_vacancy_templates )
		inet_data.work_type_id = template.inet_data.work_type_id;

	if ( ! inet_data.work_schedule_type_id.HasValue || global_settings.require_vacancy_templates )
		inet_data.work_schedule_type_id = template.inet_data.work_schedule_type_id;

	if ( ! inet_data.min_salary.HasValue || global_settings.require_vacancy_templates )
	{
		inet_data.min_salary = template.inet_data.min_salary;
		inet_data.max_salary = template.inet_data.max_salary;
		inet_data.salary_currency_id = template.inet_data.salary_currency_id;
	}

	if ( ! inet_data.min_age.HasValue || global_settings.require_vacancy_templates )
	{
		inet_data.min_age = template.inet_data.min_age;
		inet_data.max_age = template.inet_data.max_age;
	}

	if ( ! inet_data.educ_type_id.HasValue || global_settings.require_vacancy_templates )
		inet_data.educ_type_id = template.inet_data.educ_type_id;

	if ( ! inet_data.min_exp_years.HasValue || global_settings.require_vacancy_templates )
		inet_data.min_exp_years = template.inet_data.min_exp_years;

	if ( ! inet_data.html_comment.HasValue || global_settings.require_vacancy_templates )
		inet_data.html_comment = template.inet_data.html_comment;
	
	if ( ! inet_data.comment_req.HasValue || global_settings.require_vacancy_templates )
	{
		inet_data.comment_req = template.inet_data.comment_req;
		inet_data.comment_duty = template.inet_data.comment_duty;
		inet_data.comment_cond = template.inet_data.comment_cond;
	}

	for ( srcTargetSite in template.inet_data.target_sites )
	{
		targetSite = inet_data.target_sites.ObtainChildByKey( srcTargetSite.site_id );

		if ( global_settings.require_vacancy_templates )
			targetSite.is_enabled = srcTargetSite.is_enabled;

		if ( ! targetSite.multi_site_profession_id.HasValue || global_settings.require_vacancy_templates )
			targetSite.multi_site_profession_id.SetValues( srcTargetSite.multi_site_profession_id );
	}
}


function GetTermAdjustmentsSumDaysNum()
{
	return ArraySum( term_adjustments, 'period.days_num' );
}


function GetTermAdjustmentsSumWDaysNum()
{
	return ArraySum( term_adjustments, 'period.wdays_num' );
}


function handle_candidate_changed( srcCandidate )
{
}


function handle_event_changed( srcEvent )
{
}


function handle_ui_event_changed( srcEvent )
{
}


function update_start_date()
{
	if ( ! is_mp_vacancy || ! global_settings.update_mp_vacancy_start_date )
		return;

	instance = ArrayOptFirstElem( ArraySort( ArraySelect( instances, 'is_active' ), 'start_date', '+' ) );
	if ( instance == undefined )
		return;

	start_date = instance.start_date;
}


function get_hot_event_data( eventTypeID, occurrenceID ) // For compatibility with old views
{
	return CreateElem( '//rcr/rcr_general.xmd', 'vacancy_obsolete_fields.hot_events.hot_event' );
}


function get_hot_event_list_bk_color( eventTypeID, occurrenceID ) // For compatibility with old views
{
	return '';
}


function candidates_num() // For compatibility with old views
{
	return null;
}



function get_events_array()
{
	return XQuery( 'for $elem in events where $elem/vacancy_id = ' + id.XQueryLiteral + ' return $elem' )
}


function get_candidates_array()
{
	XQuery( 'for $elem in candidates where MatchSome( $elem/spots/spot/vacancy_id, ' + id + ' ) return $elem' );
}





function build_instances()
{
	newArray = new Array();

	if ( is_mp_vacancy )
	{
		if ( ! is_mass_vacancy )
		{
			for ( srcInstance in instances )
			{
				instance = OpenNewDoc( 'rcr_vacancy_instance.xmd', 'separate=1' ).TopElem;
				instance.AssignElem( id.Parent );
				instance.AssignElem( srcInstance );
				instance.vacancy_id = id;

				if ( instance.close_date > instance.start_date )
					instance.work_days_num = DateDiff( instance.close_date, instance.start_date ) / 86400;
				else
					instance.work_days_num = null;

				if ( ! instance.priority_id.HasValue )
					instance.priority_id = priority_id;

				if ( ! instance.user_id.HasValue )
					instance.user_id = user_id;

				newArray.push( instance );
			}
		}
	}
	else
	{
		instance = OpenNewDoc( 'rcr_vacancy_instance.xmd', 'separate=1' ).TopElem;
		instance.AssignElem( id.Parent );
		instance.vacancy_id = id;

		newArray.push( instance );
	}

	curArray = ArraySelectAll( get_instances_array() );

	for ( newInstance in newArray )
	{
		curInstance = ArrayOptFindByKey( curArray, newInstance.id, 'id' );
		if ( curInstance != undefined )
		{
			if ( true || ! curInstance.EqualToElem( newInstance ) )
			{
				instanceDoc = OpenDoc( curInstance.ObjectUrl );
				instanceDoc.TopElem.AssignElem( newInstance );

				if ( instanceDoc.TopElem.id == id )
					instanceDoc.WriteFt = false;

				instanceDoc.Save();
			}

			curArray = ArraySelect( curArray, 'id != ' + newInstance.id );
		}
		else
		{
			instanceDoc = DefaultDb.OpenNewObjectDoc( 'vacancy_instance', newInstance.id );
			instanceDoc.TopElem.AssignElem( newInstance );
			
			if ( instanceDoc.TopElem.id == id )
				instanceDoc.WriteFt = false;
			
			instanceDoc.Save();
		}
	}

	for ( curInstance in curArray )
	{
		DeleteDoc( curInstance.ObjectUrl );
	}
}


function delete_instances()
{
	for ( instance in ArraySelectAll( get_instances_array() ) )
		DeleteDoc( instance.ObjectUrl, true );
}


function get_instances_array()
{
	XQuery( 'for $elem in vacancy_instances where $elem/vacancy_id = ' + id + ' return $elem' )
}


function get_req_quantity()
{
	return ArraySum( instances, 'req_quantity' );
}


function get_active_req_quantity()
{
	return ArraySum( ArraySelect( instances, 'is_active' ), 'req_quantity' );
}


function get_req_quantity_f()
{
	return ArraySum( instances, 'req_quantity_f.HasValue ? req_quantity_f : 1' );
}


function get_active_req_quantity_f()
{
	return ArraySum( ArraySelect( instances, 'is_active' ), 'req_quantity_f.HasValue ? req_quantity_f : Real( 1 )' );
}


function handle_add_instances()
{
	dlgDoc = OpenNewDoc( 'rcr_dlg_vacancy_instance.xml' );
	dlgDoc.TopElem.instance.start_date = CurDate;
	dlgDoc.TopElem.instance.priority_id = priority_id;
	dlgDoc.TopElem.instance.user_id = user_id;

	dlgDoc.TopElem.instance.max_work_term.AssignElem( max_work_term );

	if ( work_start_date.HasValue && work_start_date > CurDate )
		dlgDoc.TopElem.instance.work_start_date = work_start_date;
	else
		dlgDoc.TopElem.instance.work_start_date = DateNewTime( CurDate );

	recruitType = recruit_type_id.ForeignElem;
	if ( recruitType.max_work_term.length.HasValue )
	{
		dlgDoc.TopElem.instance.max_work_term.AssignElem( recruitType.max_work_term );
		dlgDoc.TopElem.instance.update_req_close_date_by_max_work_term();
	}

	dlgDoc.TopElem.is_new = true;


	ActiveScreen.ModalDlg( dlgDoc );

	instance = instances.AddChild();
	instance.id = UniqueID();
	instance.AssignElem( dlgDoc.TopElem.instance );
	//if ( global_settings.use_fractional_mp_vacancies )
		//instance.req_quantity_f = dlgDoc.TopElem.req_num_f;
	instance.is_active = instance.check_active();

	update_start_date();

	//if ( AppModuleUsed( 'module_vtb24' ) )
		//lib_vacancy.UpdateVacancyTermDatesByMetrics( this, false );

	Doc.SetChanged( true );
}


function handle_open_instance( instance )
{
	dlgDoc = OpenNewDoc( 'rcr_dlg_vacancy_instance.xml' );
	dlgDoc.TopElem.instance.AssignElem( instance );

	ActiveScreen.ModalDlg( dlgDoc );

	/*
	if ( ! Doc.NeverSaved && user_id != lib_user.active_user_info.id && instance.state_id != dlgDoc.TopElem.instance.state_id )
	{
		if ( lib_base.ask_question( Screen, UiText.messages.send_vacancy_instance_change_state_notif ) )
			lib_notif.create_notification( UiText.titles.vacancy_instance_state_changed + ': ' + instance.state_id.ForeignDispName, id.Parent );
	}
	*/

	instance.AssignElem( dlgDoc.TopElem.instance );
	Doc.SetChanged( true );
	Screen.Update();
}


function adjust_instances_for_day_ratio( instance, candidate )
{
	candidateDayRatio = ( candidate.day_ratio.HasValue ? candidate.day_ratio : Real( 1 ) );
	if ( candidateDayRatio == instance.req_quantity_f )
		return;

	if ( candidateDayRatio < instance.req_quantity_f )
	{
		newInstance = instances.InsertChild( instance.ChildIndex + 1 );
		newInstance.AssignElem( instance );
		newInstance.id = UniqueID();
		newInstance.final_candidate_id.Clear();
		newInstance.req_quantity_f -= candidateDayRatio;

		instance.req_quantity_f = candidateDayRatio;
		return;
	}

	restQuantity = candidateDayRatio - instance.req_quantity_f;
	instance.req_quantity_f = candidateDayRatio;

	for ( i = instance.ChildIndex + 1; i < instances.ChildNum; )
	{
		otherInstance = instances[i];
		if ( ! otherInstance.is_active )
		{
			i++;
			continue;
		}

		if ( otherInstance.final_candidate_id.HasValue )
		{
			i++;
			continue;
		}

		if ( otherInstance.req_quantity_f > restQuantity )
		{
			otherInstance.req_quantity_f -= restQuantity;
			break;
		}

		restQuantity -= otherInstance.req_quantity_f;
		otherInstance.Delete();
	}
}


function get_opened_instances_num()
{
	return ArrayCount( ArraySelectByKey( instances, 'vacancy_opened', 'state_id' ) ); 
}


function get_closed_instances_num()
{
	return ArrayCount( ArraySelect( instances, 'state_id.ForeignElem.close_object' ) ); 
}


function opened_instances()
{
	return ArraySelectByKey( instances, 'vacancy_opened', 'state_id' );
}


function free_opened_instances()
{
	return ArraySelectByKey( opened_instances, null, 'final_candidate_id' );
}


function get_first_opened_instance()
{
	return ArrayOptFirstElem( ArraySort( opened_instances, 'start_date', '+' ) );
}


function get_first_free_opened_instance()
{
	return ArrayOptFirstElem( ArraySort( free_opened_instances, 'start_date', '+' ) );
}


function HandleAddSourceAgencies()
{
	filter = new Object;
	filter.is_recruiting_agency = true;

	for ( orgID in lib_base.select_objects_from_view( 'orgs', filter ) )
	{
		sourceAgency = source_agencies.ObtainChildByKey( orgID );
		if ( sourceAgency.work_start_date.HasValue )
			continue;
		
		sourceAgency.work_start_date = CurDate;

		if ( AppModuleUsed( 'module_sanofi' ) )
			SendSourceAgencyStartNotif( sourceAgency );
	}

	Doc.SetChanged( true );
}


function SendSourceAgencyStartNotif( sourceAgency )
{
	template = ArrayOptFindByKey( mail_templates, 'cs_agency_notif_on_vacancy' );
	if ( template == undefined )
		throw UserError( 'Mail template not found' );

	array = XQuery( 'for $elem in persons where $elem/org_id = ' + XQueryLiteral( sourceAgency.org_id ) + ' and $elem/is_active = true() return $elem' );
	array2 = ArraySelect( array, 'org_person_priority >= 1' );
	if ( array2.length != 0 )
		array = array2;

	person = ArrayOptFirstElem( array );
	if ( person == undefined )
		person = GetForeignElem( persons, null );

	envObject = new Object;
	envObject.vacancy = this;

	mailMessage = lib_mail.build_mail_message( template, person.email, person, envObject );
	lib_mail.show_mail_message( mailMessage );
}


function show_multi_final_candidate()
{
	if ( ! multi_final_candidate_id.HasValue )
		return false;

	if ( ! final_candidate_id.HasValue )
		return true;

	if ( ArrayCount( multi_final_candidate_id ) == 1 && ArrayFirstElem( multi_final_candidate_id ) === final_candidate_id )
		return false;

	return true;
}


function handle_org_selected()
{
	if ( ! org_id.HasValue )
		return;

	if ( global_settings.auto_load_vacancy_rr_persons_by_org )
		load_rr_persons_by_org();

	org = org_id.ForeignElem;
	if ( ! location_id.HasValue )
	{
		location_id = org.location_id;
		lib_voc.update_idata_by_voc( location_id );
	}

	if ( ! metro_station_id.HasValue )
		metro_station_id.SetValues( org.metro_station_id );
}


function select_rr_person()
{
	if ( global_settings.is_agency )
		personID = lib_base.select_object_from_view( 'persons_base', ( org_id.HasValue ? {org_id:org_id} : undefined ) );
	else
		personID = lib_base.select_object_from_view( 'persons_own_with_division', ( division_id.HasValue ? {division_id:division_id} : undefined ) );

	rr_persons.ObtainChildByKey( personID, 'person_id' );

	if ( global_settings.is_agency )
	{
		if ( ! org_id.HasValue )
			org_id = GetForeignElem( persons, personID ).org_id;
	}
	else
	{
		if ( ! division_id.HasValue )
			division_id = GetForeignElem( persons, personID ).division_id;
	}
}


function load_rr_persons_by_org()
{
	rr_persons.Clear();

	array = XQuery( 'for $elem in persons where $elem/org_id = ' + XQueryLiteral( org_id ) + ' and $elem/is_active = true() return $elem' );
	array2 = ArraySelect( array, 'org_person_priority >= 1' );
	if ( array2.length != 0 )
		array = array2;

	for ( person in array )
		rr_persons.ObtainChildByKey( person.id, 'person_id' );
}


function load_rr_persons_by_division()
{
	rr_persons.Clear();
	count = 0;

	for ( person in XQuery( 'for $elem in persons where $elem/division_id = ' + XQueryLiteral( division_id ) + ' return $elem' ) )
	{
		if ( ( person.is_division_head && ! global_settings.require_rr_person_flag ) || ( person.is_rr_person && global_settings.use_rr_person_flag ) )
			rr_persons.ObtainChildByKey( person.id, 'person_id' );

		count++;
	}

	if ( count == 1 && rr_persons.ChildNum == 0 )
		rr_persons.ObtainChildByKey( person.id, 'person_id' );
}


function select_final_candidates()
{
	candidateID = lib_base.select_object_from_view( 'candidates' );

	if ( GetForeignElem( candidates, candidateID ).spots.GetOptChildByKey( id ) == undefined )
		throw UiError( UiText.errors.candidate_not_selected_for_this_vacancy );

	if ( ! final_candidate_id.HasValue )
		final_candidate_id = candidateID;

	multi_final_candidate_id.ObtainByValue( candidateID );
}


function check_next_final_candidate()
{
	if ( ( finalCandidateID = ArrayOptFirstElem( multi_final_candidate_id ) ) != undefined )
		final_candidate_id = finalCandidateID;
	else
		final_candidate_id.Clear();
}


function check_deactivate()
{
	if ( is_active )
		return;

	restCandidatesArray = new Array();

	for ( candidate in get_candidates_array() )
	{
		if ( ! is_mp_vacancy && candidate.id == final_candidate_id )
			continue;

		spot = candidate.spots.GetOptChildByKey( id );
		if ( spot == undefined )
			continue;

		if ( spot.state_id == 'new' )
			continue;

		if ( spot.state_id.ForeignElem.deactivate_object || spot.state_id.ForeignElem.change_vacancy_state )
			continue;

		restCandidatesArray.push( candidate );
	}

	if ( ArrayCount( restCandidatesArray ) == 0 )
		return;

	if ( ! state_id.ForeignElem.failed_candidate_state_id.HasValue )
		return;

	newState = state_id.ForeignElem.failed_candidate_state_id.ForeignElem;
	
	if ( ! state_id.ForeignElem.confirm_failed_candidate_state || lib_base.ask_question( ActiveScreen, StrReplace( UiText.messages.set_failed_candidates_state_xxx, '%s', newState.name ) ) )
	{
		date = CurDate;

		for ( candidate in restCandidatesArray )
		{
			candidateDoc = OpenDoc( candidate.ObjectUrl );
			candidate = candidateDoc.TopElem;

			eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
			eventDoc.TopElem.date = date;
			eventDoc.TopElem.type_id = lib_event.get_event_id_from_state_id( state_id.ForeignElem.failed_candidate_state_id );
			eventDoc.TopElem.occurrence_id = lib_event.get_occurrence_id_from_state_id( state_id.ForeignElem.failed_candidate_state_id );
			eventDoc.TopElem.candidate_id = candidate.id;
			eventDoc.TopElem.vacancy_id = id;
			eventDoc.Save();

			prevStateID = RValue( candidate.state_id );
			candidate.update_state();
			
			if ( candidate.state_id != prevStateID )
				candidateDoc.Save();

			lib_recruit.run_triggers_on_candidate_state_changed( candidate.id );
		}

		UpdateScreens( '*', '*candidates*' );
	}

	if ( state_id.ForeignElem.failed_candidate_notif_template_id.HasValue && ( ! state_id.ForeignElem.confirm_failed_candidate_notif || lib_base.ask_question( ActiveScreen, StrReplace( UiText.messages.send_failed_candidates_message_xxx, '%s', state_id.ForeignElem.failed_candidate_notif_template_id.ForeignDispName ) ) ) )
	{
		lib_mail.send_mass_mail( ArrayExtract( restCandidatesArray, 'ObjectUrl' ), state_id.ForeignElem.failed_candidate_notif_template_id, {vacancy:this} );
	}
}


function check_create_notif()
{
	if ( ! AppModuleUsed( 'module_sanofi' ) )
		return;

	//if ( user_id.ForeignElem.main_group_id.ForeignElem.name == 'HR Recruitment' )
		//return;

	lib_base.ask_warning_to_continue( Screen, 'Уведомление о вновь созданной вакансии будет отправлено сотрудникам группы "HR Recruitment". Продолжить?' );
	view.send_create_notif = true;
}


function send_create_notif()
{
	template = ArrayOptFindByKey( mail_templates, 'notify_vacancy_create' );
	if ( template == undefined )
		throw UserError( 'Mail template not found' );

	targetGroup = ArrayOptFindByKey( groups, 'HR Recruitment', 'name' );
	if ( targetGroup == undefined )
		throw UserError( 'Target group not found' );

	for ( user in users )
	{
		if ( ! user.is_active || user.main_group_id != targetGroup.id )
			continue;

		destPerson = user.person_id.ForeignElem;
		if ( destPerson.email == '' )
			continue;

		env = lib_mail.build_default_env( destPerson );
		env.vacancy = id.Parent;

		message = lib_mail.build_mail_message( template, destPerson.email, destPerson, env );
		lib_mail.send_mail_message( message );
	}
}


function Publish( siteIDArray, options )
{
	lib_vacancy_publish.PublishVacancy( this, siteIDArray, options );
}


function DeletePublishing( siteIDArray, options )
{
	lib_vacancy_publish.DeleteVacancyPublishing( this, siteIDArray, options );
}


function job_desc()
{
	if ( ( attachment = attachments.GetOptChildByKey( 'vacancy_desc', 'type_id' ) ) != undefined )
		return attachment.resolve_plain_text();

	return '';
}


function public_job_desc()
{
	return inet_data.text_comment;
}


function restore_suspended_days_num_from_records()
{
	suspended_days_num = 0;
	suspended_wdays_num = 0;

	records.Sort( 'date', '+' );
	lastDeactivateDate = null;

	for ( record in records )
	{
		if ( record.type_id != 'state_change' )
			continue;

		if ( record.state_id.ForeignElem.deactivate_object )
		{
			if ( lastDeactivateDate == null )
				lastDeactivateDate = record.date;
		}
		else
		{
			if ( lastDeactivateDate != null )
			{
				suspended_days_num += lib_base.get_date_days_diff( record.date, lastDeactivateDate );
				suspended_wdays_num += lib_calendar.get_date_wdays_diff( record.date, lastDeactivateDate );
				lastDeactivateDate = null;
			}
		}
	}

	if ( suspended_days_num == 0 )
		suspended_days_num.Clear();

	if ( suspended_wdays_num == 0 )
		suspended_wdays_num.Clear();
}			


function clean_up_records_from_old_40()
{
	for ( record in ArraySelectAll( records ) )
	{
		if ( record.type_id.OptForeignElem == undefined )
			record.Delete();
	}
}


function HandleSelectReceiptDate()
{
	this.receipt_date = lib_base.select_date_value( this.receipt_date.Title, this.receipt_date );

	this.Doc.SetChanged( true );
	Screen.Update();
}


function HandleSelectWorkStartDate()
{
	if ( global_settings.hide_vacancy_work_start_date )
		return;

	this.work_start_date = lib_base.select_date_value( this.work_start_date.Title, this.work_start_date );

	lib_vacancy.UpdateVacancyTermDatesByMetrics( this, false );
	lib_vacancy.UpdateVacancyWorkDaysNum( this );
	lib_vacancy.GuessVacancyRecruitPlan( this );
	lib_vacancy.UpdateVacancyPlan( this );

	this.Doc.SetChanged( true );
	Screen.Update();
}


function BuildStoredInstancesArray()
{
	/*queryStr = 'for $elem in vacancy_instances where $elem/vacancy_id = ' + this.id.XQueryLiteral;
	queryStr += ' return $elem/Fields( "id","start_date" )';

	this.view.storedInstancesArray = ArraySelectAll( XQuery( queryStr ) );
	this.view.absentStoredInstancesArray = undefined;
	
	for ( storedInstance in this.view.storedInstancesArray )
	{
		instance = this.instances.GetOptChildByKey( storedInstance.id );
		if ( instance == undefined )
		{
			if ( this.view.absentStoredInstancesArray == undefined )
				this.view.absentStoredInstancesArray = new Array;

			this.view.absentStoredInstancesArray.push( storedInstance );
		}
	}

	if ( this.view.absentStoredInstancesArray != undefined )
	{
		//this.instances.Sort( 'start_date', '+', 'close_date', '+' );
		lib_base.show_warning_message( ActiveScreen, UiText.warnings.vacancy_has_stored_instances_mismatch );
	}
	*/
}


function GetUiLine2DensityLevel()
{
	if ( fields_usage.use_object_field( 'vacancy', 'min_salary', 'common' ) && fields_usage.use_object_field( 'vacancy', 'country_id', 'common' ) && fields_usage.use_object_field( 'vacancy', 'location_id', 'common' ) && fields_usage.use_object_field( 'vacancy', 'country_id', 'metro_station_id' ) && fields_usage.use_object_field( 'vacancy', 'work_type_id', 'common' ) && fields_usage.use_object_field( 'vacancy', 'work_schedule_type_id', 'common' ) )
	{
		if ( fields_usage.use_object_field( 'vacancy', 'salary', 'common' ) && fields_usage.use_object_field( 'vacancy', 'req_empl_start_date', 'common' ) )
			return 3;

		if ( fields_usage.use_object_field( 'vacancy', 'salary', 'common' ) || fields_usage.use_object_field( 'vacancy', 'req_empl_start_date', 'common' ) )
			return 2;
	}

	return 1;
}


function OnUserChanged()
{
	if ( this.is_mp_vacancy && ! this.is_mass_vacancy && ArrayOptFind( this.instances, 'is_active && This.user_id != ' + CodeLiteral( this.user_id ) ) != undefined )
	{
		if ( lib_base.ask_question( ActiveScreen, UiText.questions.change_recruiter_for_vacancy_instances ) )
		{
			for ( instance in this.instances )
			{
				if ( instance.is_active )
					instance.user_id = this.user_id;
			}
		}
	}
	
	if ( AppModuleUsed( 'module_efko' ) )
	{
		record = this.records.AddChild();
		record.date = CurDate;
		record.type_id = 'user_change';
		record.comment = user_id.ForeignDispName;
	}

	if ( user_id.HasValue && ( ! group_id.HasValue || global_settings.update_vacancy_group_by_user ) )
		group_id = user_id.ForeignElem.main_group_id;
}