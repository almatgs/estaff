function InitLoadedVacancy( vacancy )
{
	vacancy.state_id = global_settings.staff_connector.default_vacancy_state_id;

	if ( AppModuleUsed( 'module_efko' ) )
	{
		vacancy.receipt_date = CurDate;

		if ( ! global_settings.hide_vacancy_work_start_date && ! vacancy.work_start_date.HasValue )
			vacancy.work_start_date = CurDate;

		record = vacancy.records.AddChild();
		record.date = CurDate;
		record.type_id = 'state_change';
		record.state_id = vacancy.state_id;
	}
	
	metricsSet = GuessVacancyRecruitMetricsSet( vacancy );
	if ( metricsSet != undefined )
		vacancy.recruit_metrics_set_id = metricsSet.id;

	if ( vacancy.recruit_metrics_set_id.HasValue )
		UpdateVacancyTermDatesByMetrics( vacancy, false );
}


function HandleGuessVacancyRecruitMetricsSet( vacancy )
{
	if ( ArrayCount( lib_voc.get_sorted_voc( recruit_metrics_sets ) ) == 0 )
		throw UiError( UiText.errors.recruit_metrics_sets_voc_empty );

	array = GetVacancyMacthingRecruitMetrics( vacancy );

	if ( ArrayCount( array ) == 0 )
		throw UiError( UiText.errors.no_matching_recruit_metrics_sets_for_vacancy );

	if ( ArrayCount( array ) > 1 )
	{
		lib_base.show_warning_message( ActiveScreen, UiText.errors.multiple_matching_recruit_metrics_sets_for_vacancy );
		metricsSet = lib_base.select_elem( array );
	}
	else
	{
		metricsSet = ArrayFirstElem( array );
	}

	vacancy.recruit_metrics_set_id = metricsSet.id;
	UpdateVacancyTermDatesByMetrics( vacancy, false );
	vacancy.Doc.SetChanged( true );
}


function GuessVacancyRecruitMetricsSet( vacancy )
{
	return ArrayOptFirstElem( GetVacancyMacthingRecruitMetrics( vacancy ) );
}


function GetVacancyMacthingRecruitMetrics( vacancy )
{
	array = lib_voc.get_sorted_voc( recruit_metrics_sets );
	if ( vacancy.group_id.HasValue )
		array = ArraySelect( array, '! target_group_id.HasValue || target_group_id.ByValueExists( vacancy.group_id )' );
	else
		array = ArraySelect( array, '! target_group_id.HasValue' );

	if ( vacancy.user_id.ForeignElem.access_role_id.HasValue )
		array = ArraySelect( array, '! target_access_role_id.HasValue || target_access_role_id.ByValueExists( vacancy.user_id.ForeignElem.access_role_id )' );
	else
		array = ArraySelect( array, '! target_access_role_id.HasValue' );

	if ( vacancy.recruit_type_id.HasValue )
		array = ArraySelect( array, '! target_recruit_type_id.HasValue || target_recruit_type_id.ByValueExists( vacancy.recruit_type_id )' );
	else
		array = ArraySelect( array, '! target_recruit_type_id.HasValue' );

	array = ArraySort( array, 'target_group_id.HasValue || target_access_role_id.HasValue || target_recruit_type_id.HasValue', '-' );
	return array;
}


function UpdateVacancyTermDatesByMetrics( vacancy, replaceExisting )
{
	if ( vacancy.recruit_metrics_set_id.HasValue )
	{
		metricsSet = vacancy.recruit_metrics_set_id.ForeignElem;

		for ( vtt in rcr_common.active_vacancy_term_types )
		{
			if ( ! replaceExisting && vacancy.Child( vtt.orig_max_term_field_name ).length.HasValue )
				continue;

			vacancy.Child( vtt.orig_max_term_field_name ).AssignElem( GetVacancyMetricsField( vacancy, metricsSet, vtt.max_term_field_name ) );
		}
	}
	else if ( vacancy.recruit_type_id.HasValue )
	{
		if ( vacancy.recruit_type_id.ForeignElem.max_work_term.length.HasValue )
		{
			vtt = GetLegacyVacancyTermType();

			if ( replaceExisting || ! vacancy.Child( vtt.orig_max_term_field_name ).length.HasValue )
			{
				vacancy.Child( vtt.orig_max_term_field_name ).AssignElem( vacancy.recruit_type_id.ForeignElem.max_work_term );

				if ( vacancy.is_mp_vacancy && vacancy.instances.ChildNum > 1 && global_settings.mp_vacancy_term_multiplier.HasValue )
					vacancy.Child( vtt.orig_max_term_field_name ).length += Math.round( vacancy.Child( vtt.orig_max_term_field_name ).length * ( vacancy.instances.ChildNum - 1 ) * global_settings.mp_vacancy_term_multiplier );
			}
		}

		if ( vacancy.recruit_type_id.ForeignElem.max_job_offer_term.length.HasValue ) // !!! mdm
		{
			if ( replaceExisting || ! vacancy.orig_max_term_job_offer.length.HasValue )
				vacancy.vacancy.orig_max_term_job_offer.AssignElem( vacancy.recruit_type_id.ForeignElem.max_job_offer_term );
		}
	}

	UpdateVacancyTermDatesByOrigMaxTerms( vacancy, replaceExisting );
}


function UpdateVacancyTermDatesByOrigMaxTerms( vacancy, replaceExisting )
{
	for ( t in rcr_common.active_vacancy_term_types )
	{
		origTerm = vacancy.Child( t.orig_max_term_field_name );
		term = vacancy.Child( t.max_term_field_name );

		if ( term.length.HasValue && ! replaceExisting )
			continue;

		term.unit_id = origTerm.unit_id;
		term.length = origTerm.length;

		if ( term.unit_id == 'd' )
		{
			if ( AppModuleUsed( 'module_efko' ) )
			{
			}
			else
			{
				if ( vacancy.suspended_days_num > 0 )
					term.length += vacancy.suspended_days_num;
			}

			if ( vacancy.term_adjustments_sum_day_num > 0 && ! global_settings.manually_apply_vacancy_term_adjustments )
				term.length += vacancy.term_adjustments_sum_day_num;
		}
		else if ( term.unit_id == 'wd' )
		{
			if ( AppModuleUsed( 'module_efko' ) )
			{
			}
			else
			{
				if ( vacancy.suspended_wdays_num > 0 )
					term.length += vacancy.suspended_wdays_num;
			}

			if ( vacancy.term_adjustments_sum_wday_num > 0 && ! global_settings.manually_apply_vacancy_term_adjustments )
				term.length += vacancy.term_adjustments_sum_wday_num;
		}
	}
	
	UpdateVacancyTermDatesByMaxTerms( vacancy, replaceExisting );
}


function UpdateVacancyTermDatesByMaxTerms( vacancy, replaceExisting )
{
	//vacancy.UpdateValues();

	if ( global_settings.hide_vacancy_work_start_date )
		vacancy.work_start_date = vacancy.start_date;
		
	startDate = vacancy.work_start_date;
	if ( startDate == null )
		return;

	for ( vtt in rcr_common.active_vacancy_term_types )
	{
		reqDateField = vacancy.Child( vtt.req_date_field_name );
		if ( reqDateField.HasValue && ! replaceExisting )
			continue;
		
		if ( vacancy.Child( vtt.max_term_field_name ).length.HasValue )
		{
			reqDateField.Value = GetWorkTermDateOffset( startDate, vacancy.Child( vtt.max_term_field_name ) );
		}
	}

	if ( ! vacancy.max_work_term.length.HasValue )	// For compatibility with old resports
		vacancy.max_work_term.AssignElem( vacancy.max_term_to_vacancy_close );

	if ( vacancy.is_mp_vacancy )
	{
		for ( instance in vacancy.instances )
		{
			if ( ! instance.is_active )
				continue;
			
			instance.max_work_term.AssignElem( vacancy.max_term_to_vacancy_close );

			if ( ! instance.work_start_date.HasValue )
				instance.work_start_date = vacancy.work_start_date;

			if ( instance.max_work_term.length.HasValue )
				instance.req_close_date = GetWorkTermDateOffset( instance.work_start_date, instance.max_work_term );

			if ( instance.req_close_date.HasValue && vacancy.term_adjustments_sum_wday_num.HasValue && ! global_settings.manually_apply_vacancy_term_adjustments )
				instance.req_close_date = lib_calendar.get_date_wdays_offset( instance.req_close_date, vacancy.term_adjustments_sum_wday_num );
		}
	}
}


function GetWorkTermDateOffset( startDate, term )
{
	if ( rcr_config.use_low_adjusted_vacancy_max_work_terms && ( term.unit_id == 'd' || term.unit_id == 'wd' ) && term.length > 0 )
	{
		term = term.Clone();
		term.length--;
	}

	return lib_base.get_term_date_offset( startDate, term );
}


function GetLegacyVacancyTermType()
{
	if ( global_settings.use_vacancy_work_end_final_candidate_state && global_settings.vacancy_work_end_final_candidate_state == 'job_offer' )
		vtt = rcr_common.vacancy_term_types.GetChildByKey( 'job_offer' );
	else if ( global_settings.use_vacancy_work_end_final_candidate_state && global_settings.vacancy_work_end_final_candidate_state == 'job_offer' )
		vtt = rcr_common.vacancy_term_types.GetChildByKey( 'job_offer_acceptance' );
	else
		vtt = rcr_common.vacancy_term_types.GetChildByKey( 'vacancy_close' );

	return vtt;
}


function GetVacancyMetricsFieldDesc( vacancy, metricsSet, fieldName )
{
	field = GetVacancyMetricsField( vacancy, metricsSet, fieldName );
	if ( field == undefined )
		return '-'

	if ( ! field.length.HasValue )
		return '-';

	return field.get_desc();
}


function GetVacancyMetricsField( vacancy, metricsSet, fieldName )
{
	targetStaffCategory = metricsSet.target_staff_categories.GetOptChildByKey( vacancy.staff_category_id );
	if ( targetStaffCategory != undefined )
	{
		field = targetStaffCategory.Child( fieldName );
		if ( field.length.HasValue )
			return field;
	}

	field = metricsSet.Child( fieldName );
	return field;
}


function GetVacancyWorkloadMultiplier( vacancy )
{
	if ( vacancy.recruit_metrics_set_id.HasValue )
		metricsSet = vacancy.recruit_metrics_set_id.ForeignElem;
	else
		metricsSet = lib_vacancy.GuessVacancyRecruitMetricsSet( vacancy );
		
	workloadMultiplier = 1;

	if ( metricsSet != undefined )
	{
		targetStaffCategory = metricsSet.target_staff_categories.GetOptChildByKey( vacancy.staff_category_id );
		if ( targetStaffCategory != undefined && targetStaffCategory.workload_multiplier.HasValue )
			workloadMultiplier = targetStaffCategory.workload_multiplier;
	}

	return workloadMultiplier;
}


function handle_add_new_vacancy()
{		
	lib_user.check_real_user();
	if ( lib_user.active_user_access.prohibit_create_vacancies )
		throw UiError( UiText.errors.permission_denied );

	doc = DefaultDb.OpenNewObjectDoc( 'vacancy' );
	vacancy = doc.TopElem;

	if ( lib_user.active_user_access.assign_vacancies_to_users )
		vacancy.user_id.Clear();

	//alert( lib_user.active_user_info.Xml );
	//alert( lib_user.active_user_access.Xml );

	if ( lib_user.active_user_access.restrict_vacancy_orgs_to_own && lib_user.active_user_info.id.HasValue )
	{
		orgsArray = lib_base.query_records_by_key( orgs, lib_user.active_user_info.id, 'user_id' );
		if ( ArrayCount( orgsArray ) == 1 )
		{
			vacancy.org_id = ArrayFirstElem( orgsArray ).id;
			vacancy.handle_org_selected();
		}
	}

	CreateDocScreen( doc );
}


function GuessVacancyRecruitPlan( vacancy )
{
	if ( vacancy.recruit_plan_id.HasValue )
		return;

	array = lib_voc.get_sorted_voc( recruit_plans );
	if ( ArrayCount( array ) == 0 )
		return;
	
	if ( ArrayCount( array ) > 1 )
		array = ArraySelect( array, 'This.recruit_type_id == vacancy.recruit_type_id' );

	if ( ArrayCount( array ) > 1 )
		array = ArraySelect( array, 'This.location_id == vacancy.location_id' );

	if ( AppModuleUsed( 'module_vtb24' ) )
	{
		if ( ArrayCount( array ) > 1 )
			array = ArraySelect( array, 'This.use_agency == ( vacancy.cs_seach_category_id == 1003 )' );
	}

	if ( ArrayCount( array ) == 0 )
		return;

	vacancy.recruit_plan_id = ArrayOptFirstElem( array ).id;
}


function UpdateVacancyPlan( vacancy )
{
	if ( ! vacancy.recruit_plan_id.HasValue )
		return;

	recruitPlan = vacancy.recruit_plan_id.ForeignElem;

	if ( AppModuleUsed( 'module_vtb24' ) )
		startDate = vacancy.work_start_date;
	else
		startDate = vacancy.start_date;
	
	if ( startDate == null )
		return;

	vacancy.plan.target_recruit_phases.Clear();
	curStartDate = DateNewTime( startDate );

	for ( srcTargetRecruitPhase in ArraySort( recruitPlan.target_recruit_phases, 'recruit_phase_id.ForeignElem.order_index', '+' ) )
	{
		targetRecruitPhase = vacancy.plan.target_recruit_phases.AddChild();
		targetRecruitPhase.recruit_phase_id = srcTargetRecruitPhase.recruit_phase_id;
		
		targetRecruitPhase.wdays_num = srcTargetRecruitPhase.wdays_num;
		targetRecruitPhase.effort_hours = srcTargetRecruitPhase.effort_hours;

		if ( ! targetRecruitPhase.wdays_num.HasValue )
			continue;

		if ( vacancy.is_mp_vacancy && vacancy.instances.ChildNum > 1 )
		{
			if ( srcTargetRecruitPhase.add_instance_wdays_num.HasValue )
				targetRecruitPhase.wdays_num += srcTargetRecruitPhase.add_instance_wdays_num * ( vacancy.instances.ChildNum - 1 );

			if ( srcTargetRecruitPhase.add_instance_effort_hours.HasValue )
				targetRecruitPhase.effort_hours += srcTargetRecruitPhase.add_instance_effort_hours * ( vacancy.instances.ChildNum - 1 );
		}

		targetRecruitPhase.start_date = curStartDate;
		targetRecruitPhase.end_date = lib_calendar.get_date_wdays_offset( curStartDate, targetRecruitPhase.wdays_num );
		curStartDate = targetRecruitPhase.end_date;
	}

	for ( termAdjustment in vacancy.term_adjustments )
	{
	}
}


function handle_set_vacancy_state( vacancy, stateID, options )
{
	state = GetForeignElem( vacancy_states, stateID );
	options = adjust_state_func_options( options, state );

	if ( lib_user.active_user_access.prohibit_change_vacancy_state && ! options.isOnClose )
		throw UiError( UiText.errors.permission_denied );

	if ( stateID == vacancy.state_id && ! options.isManual )
		return;

	set_vacancy_state_prepare( vacancy, state );

	if ( stateID == 'vacancy_opened' && AppModuleUsed( 'module_efko' ) )
	{
		vacancy.user_id = SelectUserByCurrentWorkload();
	}

	if ( stateID == 'vacancy_suspended' && vacancy.ChildExists( 'suspend_reason_id' ) )
		vacancy.suspend_reason_id = lib_voc.select_voc_elem( vacancy.suspend_reason_id.ForeignArray );

	stateDate = CurDate;
	comment = '';

	if ( options.showInitDlg )
	{
		dlgDoc = OpenDoc( '//base2/base2_dlg_record.xml' );
		dlgDoc.TopElem.state_ref = state;
		dlgDoc.TopElem.date = stateDate;

		ActiveScreen.ModalDlg( dlgDoc );

		stateDate = dlgDoc.TopElem.date;
		comment = dlgDoc.TopElem.comment;
	}

	if ( ! options.isManual )
		run_vacancy_state_core_actions( vacancy, state, 0 );

	if ( vacancy.state_id == 'vacancy_suspended' && ! state.deactivate_object && stateDate >= vacancy.state_date )
	{
		addSuspenedDaysNum = lib_base.get_date_days_diff( stateDate, vacancy.state_date );
		if ( vacancy.suspended_days_num != null )
			vacancy.suspended_days_num += addSuspenedDaysNum;
		else
			vacancy.suspended_days_num = addSuspenedDaysNum;

		addSuspenedWDaysNum = lib_calendar.get_date_wdays_diff( stateDate, vacancy.state_date );
		if ( vacancy.suspended_wdays_num != null )
			vacancy.suspended_wdays_num += addSuspenedWDaysNum;
		else
			vacancy.suspended_wdays_num = addSuspenedWDaysNum;
	}

	if ( AppModuleUsed( 'module_rgs' ) && stateID == 'cs_vacancy_reopened_2' )
	{
		vacancy.records.Clear();
		vacancy.start_date = stateDate;
	}

	//prevStateID = RValue( vacancy.state_id );

	vacancy.state_id = stateID;
	vacancy.state_date = stateDate;

	if ( options.registerRecord )
	{
		record = vacancy.records.AddChild();
		record.date = stateDate;
		record.type_id = 'state_change';
		record.state_id = stateID;
		record.comment = comment;
	}

	if ( AppModuleUsed( 'module_efko' ) && stateID == 'vacancy_reopened' )
	{
		vacancy.work_start_date = CurDate;
		UpdateVacancyTermDatesByMetrics( vacancy, true );
	}

	if ( vacancy.is_mp_vacancy && ! vacancy.is_mass_vacancy )
	{
		for ( instance in vacancy.instances )
		{
			if ( instance.state_id != stateID && ( ( state.deactivate_object && instance.state_id == 'vacancy_opened' ) || ( ! state.deactivate_object && instance.state_id == 'vacancy_suspended' ) ) )
			{
				instance.state_id = stateID;
				instance.state_date = stateDate;
			}
		}
	}

	vacancy.is_active = vacancy.check_active();
	
	if ( ! vacancy.is_active )
		lib_vacancy_publish.OnVacancyDeactivate( vacancy );

	if ( vacancy.OptScreen != undefined )
		vacancy.OptScreen.SaveDoc();
	else
		vacancy.Doc.Save();

	if ( ! options.isManual )
		run_vacancy_state_core_actions( vacancy, state, 1 );
}


function adjust_state_func_options( options, state )
{
	if ( options == undefined )
		options = new Object;

	options.askConfirmation = options.GetOptProperty( 'askConfirmation' )
	options.isManual = options.GetOptProperty( 'isManual', false );
	options.showInitDlg = options.GetOptProperty( 'showInitDlg', state.show_init_dlg );
	options.registerRecord = options.GetOptProperty( 'registerRecord', true );
	options.isOnClose = options.GetOptProperty( 'isOnClose', false );

	return options;
}


function set_vacancy_state_prepare( vacancy, state )
{
	if ( lib_user.active_user_access.prohibit_change_other_user_vacancies && vacancy.user_id != lib_user.active_user_info.id )
		throw UiError( UiText.errors.permission_denied );

	if ( state.prohibit_unfinished_candidates )
		CheckVacancyUnfinishedCandidates( vacancy, state );

	if ( state.show_init_warning )
		lib_base.ask_warning_to_continue( ActiveScreen, StrReplaceOne( UiText.messages.set_vacancy_state_to_xxx, '%s', state.name ) );

	if ( vacancy.Doc.NeverSaved )
	{
		if ( vacancy.OptScreen != undefined )
			vacancy.OptScreen.SaveDoc();
		else
			vacancy.Doc.Save();
	}
}


function CheckVacancyUnfinishedCandidates( vacancy, state )
{
	queryStr = 'for $elem in candidates';
	queryStr += ' where MatchSome( $elem/spots/spot/vacancy_id, ' + XQueryLiteral( vacancy.id ) + ' )';
	queryStr += ' return $elem/Fields( "id","state_id","fullname","spots" )';

	failedCandidatesArray = new Array;

	candidatesArray = XQuery( queryStr );
	for ( candidate in candidatesArray )
	{
		spot = candidate.spots.GetOptChildByKey( vacancy.id );
		if ( spot == undefined )
			continue;

		if ( spot.state_id.ForeignElem.max_duration.length.HasValue || spot.state_id.ForeignElem.event_occurrence_id == 'scheduled' )
			failedCandidatesArray.push( candidate );
	}

	if ( failedCandidatesArray.length != 0 )
	{
		failedCandidatesArray = ArraySort( failedCandidatesArray, 'fullname', '+' );
		throw UiError( state.prohibit_unfinished_candidates.Title + ':\r\n\r\n' + ArrayMerge( failedCandidatesArray, 'fullname', '\r\n' ) );
	}
}


function run_vacancy_state_core_actions( vacancy, state, phaseID )
{
	for ( coreAction in state.core_actions )
	{
		if ( coreAction.phase_id != phaseID )
			continue;

		if ( coreAction.exist_req_expr.HasValue && ! eval( coreAction.exist_req_expr ) )
			continue;

		if ( coreAction.type_id == 'send_mail' || coreAction.type_id == 'send_sms' )
		{
			if ( coreAction.type_id == 'send_mail' )
			{
				if ( coreAction.templates.ChildNum > 1 )
				{
					array = ArrayExtract( coreAction.templates, 'mail_template_id.ForeignElem' );
					
					try
					{
						template = lib_base.select_elem( array );
					}
					catch ( e )
					{
						if ( ! IsCancelError( e ) )
							throw e;

						template = undefined;
					}

					if ( template == undefined )
					{
						if ( phaseID == 0 )
							Cancel();
						else
							continue;
					}
				}
				else if ( coreAction.templates.ChildNum == 1 )
				{
					template = coreAction.templates[0].mail_template_id.ForeignElem;
				}
				else
				{
					template = coreAction.mail_template_id.ForeignElem;
				}

				if ( ! template.id.HasValue )
					throw UserError( 'Mail template is not specified' )
			}
			else
			{
				template = coreAction.sms_template_id.ForeignElem;
			}

			//if ( coreAction.type_id == 'send_mail' && template.dest_type == 'vacancy' && ! vacancy.email.HasValue && phaseID != 0 )
				//continue;

			//if ( coreAction.type_id == 'send_sms' && template.dest_type == 'vacancy' && ! vacancy.mobile_phone.HasValue )
				//continue;

			if ( coreAction.send_to_rr_persons )
			{
				destPersonsArray = ArrayExtract( ArraySelect( vacancy.rr_persons, 'person_id != vacancy.orig_rr_person_id' ), 'person_id.ForeignElem' );

				if ( coreAction.send_to_orig_rr_person && vacancy.orig_rr_person_id.HasValue )
					destPersonsArray.push( vacancy.orig_rr_person_id.ForeignElem );

				msgStr = UiText.messages.send_contact_person_message_xxx;
			}
			else if ( coreAction.send_to_orig_rr_person )
			{
				if ( vacancy.orig_rr_person_id.HasValue )
					destPersonsArray = [vacancy.orig_rr_person_id.ForeignElem];
				else
					destPersonsArray = [];

				msgStr = UiText.messages.send_contact_person_message_xxx;
			}
			else if ( template.dest_type == 'user' )
			{
				destPersonsArray = [vacancy.user_id.ForeignElem.person_id.ForeignElem];
				msgStr = UiText.messages.send_user_message_xxx;
			}
			else if ( template.dest_type == 'fixed_email' )
			{
				destPersonsArray = [CreateElem( '//base2/base2_person.xmd', 'person' )];
				msgStr = UiText.messages.send_message_xxx;
			}
			else
			{
				destPersonsArray = [];
				msgStr = UiText.messages.send_message_xxx;
			}

			if ( coreAction.ask_to_do && ! lib_base.ask_question( ActiveScreen, StrReplace( msgStr, '%s', template.name ) ) )
				continue;

			envObject = build_vacancy_mail_env_object( vacancy );
			
			if ( coreAction.type_id == 'send_mail' )
			{
				if ( coreAction.use_mass_mail )
				{
					for ( destPerson in destPersonsArray )
					{
						if ( destPerson.email == '' && template.dest_type != 'fixed_email' )
							continue;

						mailMessage = lib_mail.build_mail_message( template, destPerson.email, destPerson, envObject );
						lib_mail.send_mail_message( mailMessage, {RunAsync:true} );
					}
				}
				else
				{
					if ( ArrayCount( destPersonsArray ) != 0 )
						recipientData = destPersonsArray[0];
					else
						recipientData = CreateElem( '//base2/base2_person.xmd', 'person' );

					mailMessage = lib_mail.build_mail_message( template, '', recipientData, envObject );

					for ( destPerson in destPersonsArray )
					{
						if ( destPerson.email == '' )
							continue;

						mailMessage.recipients.AddChild().address = destPerson.email;
					}

					lib_mail.show_mail_message( mailMessage );
				}
			}
			else
			{
				if ( coreAction.use_mass_mail )
				{
					for ( destPerson in destPersonsArray )
					{
						if ( destPerson.mobile_phone == '' )
							continue;

						smsMessage = lib_sms.build_sms_message( template, destPerson.mobile_phone, destPerson, envObject );
						lib_sms.send_sms_message( smsMessage, {RunAsync:true} );
					}
				}
				else
				{
					for ( destPerson in destPersonsArray )
					{
						if ( destPerson.mobile_phone == '' )
							continue;

						smsMessage = lib_sms.build_sms_message( template, destPerson.mobile_phone, destPerson, envObject );
						lib_sms.show_sms_message( smsMessage );
					}
				}
			}
		}
		else if ( coreAction.type_id == 'run_code' )
		{
			eval( coreAction.code );
		}
	}
}


function build_vacancy_mail_env_object( vacancy )
{
	object = new Object;
	object.vacancy = vacancy;
		
	return object;
}


function SetVacancyRecruitPhase( vacancy, recruitPhaseID )
{
	if ( vacancy.recruit_phase_id == recruitPhaseID )
		return;

	vacancy.recruit_phase_id = recruitPhaseID;

	if ( ! AppModuleUsed( 'module_vtb24' ) )
		return;

	recordDate = CurDate;

	if ( vacancy.recruit_phase_records.ChildNum != 0 )
	{
		prevRecord = vacancy.recruit_phase_records[vacancy.recruit_phase_records.ChildNum - 1];
		if ( ! prevRecord.end_date.HasValue )
			prevRecord.end_date = recordDate;
	}

	if ( recruitPhaseID == '' )
		return;

	record = vacancy.recruit_phase_records.AddChild();
	record.date = recordDate;
	record.recruit_phase_id = recruitPhaseID;
}


function update_vacancy_recruit_phase( vacancy )
{
	if ( ! vacancy.is_active || vacancy.is_mass_vacancy )
	{
		SetVacancyRecruitPhase( vacancy, '' );
		return;
	}

	SetVacancyRecruitPhase( vacancy, calc_vacancy_recruit_phase( vacancy ) );
	UpdateVacancyRecruitPlanDeviation( vacancy );
}


function calc_vacancy_recruit_phase( vacancy )
{
	candidatesArray = get_vacancy_active_candidates_array( vacancy.id );
	eventsArray = ArraySelect( vacancy.get_events_array(), 'candidate_id.HasValue && occurrence_id != \'cancelled\'' );
	
	recruitPhasesArray = lib_voc.get_sorted_voc( vacancy_recruit_phases );
	matchedRecruitPhasesNum = 0;

	for ( candidate in candidatesArray )
	{
		for ( i = recruitPhasesArray.length - 1; i >= matchedRecruitPhasesNum; i-- )
		{
			if ( candidate_matches_recruit_phase( candidate, recruitPhasesArray[i], vacancy, eventsArray ) )
			{
				matchedRecruitPhasesNum = i + 1;
				break;
			}
		}

		if ( matchedRecruitPhasesNum >= recruitPhasesArray.length )
			break;
	}

	if ( matchedRecruitPhasesNum == 0 )
	{
		if ( recruitPhasesArray.length != 0 && recruitPhasesArray[0].req_candidate_conditions.ChildNum == 0 )
			return recruitPhasesArray[0].id;

		return '';
	}

	return recruitPhasesArray[matchedRecruitPhasesNum - 1].id;
}


function GetMaxVacancyRecruitPhaseByEvent( event, candidate )
{
	recruitPhasesArray = lib_voc.get_sorted_voc( vacancy_recruit_phases );

	for ( i = recruitPhasesArray.length - 1; i >= 0; i-- )
	{
		if ( RecruitPhaseMatchesEvent( recruitPhasesArray[i], event, candidate ) )
			return recruitPhasesArray[i];
	}

	return undefined;
}


function RecruitPhaseMatchesEvent( recruitPhase, event, candidate )
{
	if ( recruitPhase.req_candidate_conditions.ChildNum == 0 )
		return true;

	for ( condition in recruitPhase.req_candidate_conditions )
	{
		if ( condition.event_type_id == event.type_id )
			return true;
	}

	return false;
}


function candidate_matches_recruit_phase( candidate, recruitPhase, vacancy, eventsArray )
{
	if ( recruitPhase.req_candidate_conditions.ChildNum == 0 )
		return true;

	eventsArray2 = ArraySelectByKey( eventsArray, candidate.id, 'candidate_id' );

	for ( condition in recruitPhase.req_candidate_conditions )
	{
		if ( ArrayOptFindByKey( eventsArray2, condition.event_type_id, 'type_id' ) != undefined )
			return true;
	}

	return false;
}


function UpdateVacancyRecruitPlanDeviation( vacancy )
{
	if ( ! AppModuleUsed( 'module_vtb24' ) )
		return;

	vacancy.recruit_plan_deviation_wdays_num = CalcVacancyRecruitPlanDeviationWDaysNum( vacancy );
}


function CalcVacancyRecruitPlanDeviationWDaysNum( vacancy )
{
	if ( ! vacancy.recruit_phase_id.HasValue )
		return null;

	targetRecruitPhase = vacancy.plan.target_recruit_phases.GetOptChildByKey( vacancy.recruit_phase_id );
	if ( targetRecruitPhase == undefined )
		return null;

	if ( ! targetRecruitPhase.start_date.HasValue )
		return null;

	if ( vacancy.recruit_phase_records.ChildNum == 0 )
		return null;

	lastRecord = vacancy.recruit_phase_records[vacancy.recruit_phase_records.ChildNum - 1];
	return lib_calendar.get_date_wdays_diff( targetRecruitPhase.start_date, lastRecord.date );
}


function GetVacancyRecruitPlanDeviationBkColor( vacancy )
{
	if ( ! vacancy.recruit_plan_deviation_wdays_num.HasValue )
		return '';

	if ( vacancy.recruit_plan_deviation_wdays_num >= 0 )
	{
		absDiff = vacancy.recruit_plan_deviation_wdays_num;

		if ( absDiff <= 1 )
			return '';
		else if ( absDiff <= 5 )
			return '210,255,210';
		else
			return '160,255,160';
	}
	else
	{
		absDiff = 0 - vacancy.recruit_plan_deviation_wdays_num;

		if ( absDiff <= 1 )
			return '';
		else if ( absDiff <= 5 )
			return '255,210,210';
		else
			return '255,50,50';
	}
}


function get_vacancy_active_candidates_array( vacancyID )
{
	array = XQuery( 'for $elem in candidates where $elem/is_active = true() and MatchSome( $elem/spots/spot/vacancy_id, ' + vacancyID + ' ) return $elem' );
	return ArraySelect( array, 'spots.GetChildByKey( vacancyID ).is_active' );
}


function CheckVacancyAgencyOnClose( vacancy, candidate )
{
	source = candidate.source_id.ForeignElem;
	if ( ! source.org_id.HasValue )
		return;

	agency = vacancy.source_agencies.GetOptChildByKey( source.org_id );
	if ( agency == undefined )
		return;

	if ( agency.work_end_date.HasValue )
		return;
	
	agency.work_end_date = CurDate;
	return true;
}


function SelectUserByCurrentWorkload()
{
	lib_recruit.UpdateUsersWorkload();

	userID = lib_base.select_object_from_view( 'users_with_workload' );
	return userID;
}


function UpdateVacancyWorkDaysNum( vacancy )
{
	if ( global_settings.vacancy_work_end_final_candidate_state == 'job_offer' )
		vacancy.work_end_date = vacancy.job_offer_date;
	else if ( global_settings.vacancy_work_end_final_candidate_state == 'job_offer:succeeded' )
		vacancy.work_end_date = vacancy.job_offer_acceptance_date;
	else
		vacancy.work_end_date = vacancy.close_date;

	if ( vacancy.close_date != null && ! vacancy.work_end_date.HasValue )
		vacancy.work_end_date = vacancy.close_date;
	else if ( vacancy.deactivate_date != null && ! vacancy.work_end_date.HasValue )
		vacancy.work_end_date = vacancy.deactivate_date;

	if ( vacancy.work_start_date.HasValue && ! global_settings.hide_vacancy_work_start_date )
		startDate = vacancy.work_start_date;
	else
		startDate = vacancy.start_date;

	if ( ! vacancy.work_end_date.HasValue || startDate == null || vacancy.work_end_date < startDate )
	{
		vacancy.work_days_num.Clear();
		vacancy.work_wdays_num.Clear();
		return;
	}

	vacancy.work_days_num = lib_base.get_date_days_diff( vacancy.work_end_date, startDate );
	vacancy.work_wdays_num = lib_calendar.get_date_wdays_diff( vacancy.work_end_date, startDate );

	if ( vacancy.suspended_days_num.HasValue )
	{
		if ( vacancy.suspended_days_num > vacancy.work_days_num )
			vacancy.suspended_days_num = vacancy.work_days_num;

		vacancy.work_days_num -= vacancy.suspended_days_num;
	}

	if ( vacancy.suspended_wdays_num.HasValue )
	{
		if ( vacancy.suspended_wdays_num > vacancy.work_wdays_num )
			vacancy.suspended_wdays_num = vacancy.work_wdays_num;

		vacancy.work_wdays_num -= vacancy.suspended_wdays_num;
	}
}


function GetVacancyCurWorkDaysNum( vacancy )
{
	if ( vacancy.start_date == null )
		return null;

	if ( vacancy.state_id.ForeignElem.close_object || ( vacancy.state_id.ForeignElem.deactivate_object && vacancy.work_days_num.HasValue ) )
		return vacancy.work_days_num;

	if ( vacancy.state_id.ForeignElem.deactivate_object )
		endDate = vacancy.state_date;
	else
		endDate = CurDate;

	if ( vacancy.work_start_date.HasValue && ! global_settings.hide_vacancy_work_start_date )
		startDate = vacancy.work_start_date;
	else
		startDate = vacancy.start_date;

	if ( startDate > endDate )
		return 0;

	daysNum = lib_base.get_date_days_diff( endDate, startDate );
			
	if ( vacancy.suspended_days_num.HasValue && vacancy.suspended_days_num <= daysNum )
		daysNum -= vacancy.suspended_days_num;

	return daysNum;
}


function GetVacancyCurWorkWDaysNum( vacancy )
{
	if ( vacancy.start_date == null )
		return null;

	if ( vacancy.state_id.ForeignElem.close_object || ( vacancy.state_id.ForeignElem.deactivate_object && vacancy.work_wdays_num.HasValue ) )
		return vacancy.work_wdays_num;

	if ( vacancy.state_id.ForeignElem.deactivate_object )
		endDate = vacancy.state_date;
	else
		endDate = CurDate;

	if ( vacancy.work_start_date.HasValue && ! global_settings.hide_vacancy_work_start_date )
		startDate = vacancy.work_start_date;
	else
		startDate = vacancy.start_date;

	if ( startDate > endDate )
		return 0;

	daysNum = lib_calendar.get_date_wdays_diff( CurDate, startDate );
			
	if ( vacancy.suspended_wdays_num.HasValue && vacancy.suspended_wdays_num <= daysNum )
		daysNum -= vacancy.suspended_wdays_num;

	return daysNum;
}


function GetVacancyCloseDateOverdueDaysNum( vacancy )
{
	if ( ! vacancy.req_close_date.HasValue )
		return null;
			
	if ( vacancy.close_date.HasValue )
		endDate = vacancy.close_date;
	else if ( vacancy.deactivate_date != null )
		endDate = vacancy.deactivate_date;
	else
		endDate = CurDate;

	if ( endDate <= vacancy.req_close_date )
		return null;

	return lib_base.get_date_days_diff( endDate, vacancy.req_close_date );
}


function GetVacancyLeftWorkDaysNum( vacancy )
{
	if ( ! vacancy.req_close_date.HasValue )
		return null;
			
	if ( vacancy.state_id.ForeignElem.close_object )
		return null;
	else if ( vacancy.state_id.ForeignElem.deactivate_object )
		return null;
	else
		endDate = CurDate;

	return lib_base.get_date_days_diff( vacancy.req_close_date, CurDate );
}


function GetVacancyCurWorkDaysNumBkColor( vacancy )
{
	if ( ! IsVacancyOverdue( vacancy ) )
		return '';
			
	return GetForeignElem( base2_common.event_expiration_states, 'expired' ).bk_color;
}


function IsVacancyOverdue( vacancy )
{
	if ( ! vacancy.req_close_date.HasValue )
		return false;
			
	if ( vacancy.state_id.ForeignElem.close_object )
		endDate = vacancy.state_date;
	else if ( vacancy.state_id.ForeignElem.deactivate_object )
		return false;
	else
		endDate = CurDate;

	return DateNewTime( endDate ) > DateNewTime( vacancy.req_close_date );
}


function UpdateVacancyFinalCandidateDepData( vacancy )
{
	if ( vacancy.final_candidate_id.HasValue )
	{
		finalCandidate = vacancy.final_candidate_id.ForeignElem;

		vacancy.final_candidate_source_id = finalCandidate.source_id;
		lib_voc.update_idata_by_voc( vacancy.final_candidate_source_id );
				
		spot = finalCandidate.spots.GetOptChildByKey( vacancy.id );
		if ( spot != undefined )
			finalCandidateStateID = spot.state_id;
		else
			finalCandidateStateID = finalCandidate.state_id;

		vacancy.final_candidate_state_id = finalCandidateStateID;
	}
	else
	{
		vacancy.final_candidate_source_id.Clear();
		vacancy.idata_final_candidate_source_id.Clear();
		vacancy.final_candidate_state_id.Clear();
	}
}


function AllowMpVacanies()
{
	if ( ! lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
		return true;

	if ( ! lib_app2.AppFeatureEnabled( 'classic_recruit' ) )
		return false;

	if ( lib_user.active_user_info.main_group_id.ForeignElem.recruit_type_id.ForeignElem.prohibit_spots )
		return false;

	return true;
}


function BuildVacancyDispRecordsArray( vacancy )
{
	if ( ! AppModuleUsed( 'module_efko' ) )
		return ArraySort( vacancy.records, 'date', '-' );

	array = ArraySelectAll( vacancy.records );

	record = CreateElemByFormElem( vacancy.FormElem.EvalPath( 'records.record' ) );
	record.date = vacancy.start_date;
	record.type_id = 'open';
	array.push( record );

	for ( adjustment in vacancy.term_adjustments )
	{
		record = CreateElemByFormElem( vacancy.FormElem.EvalPath( 'records.record' ) );
		record.date = adjustment.date;
		record.comment = adjustment.reason_id.ForeignDispName;
		record.type_id = 'term_adjustment';
		array.push( record );
	}

	return ArraySort( array, 'date', '-' );
}