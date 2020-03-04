function HandleAddCandidateEvent( candidate, eventTypeID, eventData, options )
{
	if ( ! candidate.Doc.HasWriteAccess )
		throw UiError( UiText.errors.permission_denied );

	eventData = AdjustEventData( eventData );
	options = AdjustEventOptions( options );
	eventType = GetForeignElem( event_types, eventTypeID );
	
	eventData.date = CurDate;

	if ( eventType.occurrences.ChildNum == 0 )
		eventType.occurrences.ObtainChildByKey( '' );

	if ( eventData.occurrence_id == undefined )
	{
		if ( eventType.has_occurrence( 'scheduled' ) )
			eventData.occurrence_id = 'scheduled';
		else if ( eventType.has_occurrence( '' ) )
			eventData.occurrence_id = '';
		//if ( eventType.has_occurrence( '' ) && ! eventType.has_occurrence( 'scheduled' ) && eventType.occurrences.ChildNum > 1 && ! eventType.use_end_date )
			//occurrenceID = lib_base.select_elem( eventType.occurrences ).id;
		else
			eventData.occurrence_id = ArrayFirstElem( eventType.get_sorted_occurrences ).id;
	}
	
	occurrence = eventType.get_opt_occurrence( eventData.occurrence_id );
	if ( occurrence == undefined )
		throw 'Unknown occurrence: ' + eventData.occurrence_id;

	if ( eventData.vacancy_id == undefined && ( ! global_settings.use_spot_for_vacancy_events_only || eventType.use_vacancy || occurrence.require_vacancy ) )
		eventData.vacancy_id = candidate.get_screen_target_vacancy_id();

	lib_event.CheckOccurrencePermission( eventType, occurrence );
	SetCandidateStatePrepare( candidate, occurrence, eventData, options );

	if ( lib_recruit.IsHireEventType( eventTypeID, candidate ) )
		AdjustCandidateOnHireEvent( candidate );

	//roomID = '';
	//event = undefined;
	//comment = '';
	//isSharedComment = false;
	//groupEventID = null;
	eventData.user_id = null;

	if ( eventType.is_group_event_reg )
	{
		eventData.group_event_id = HandleSelectCandidateForGroupEvent( candidate, eventType.group_event_type_id );
	}
	else if ( eventType.is_group_event_result && eventType.group_event_type_id.HasValue )
	{
		groupEvent = GetCandidateActiveGroupEvent( candidate, eventType.group_event_type_id );
		eventData.group_event_id = ( groupEvent != undefined ? groupEvent.id : lib_recruit.select_group_event( eventType.group_event_type_id ) );
	}
	else if ( eventType.use_training_group )
	{
		if ( eventData.training_group_id == undefined )
			eventData.training_group_id = HandleSelectCandidateForTrainingGroup( candidate );
	}

	createWithCalendar = eventType.is_calendar_entry && ( eventType.create_with_calendar || ! eventType.use_ext_calendar || ! lib_ext_calendar.is_ext_calendar_enabled() );
	useExtCalendarPlanner = eventType.is_calendar_entry && eventType.use_ext_calendar && lib_ext_calendar.is_ext_calendar_enabled() && eventType.create_with_ext_calendar;

	if ( useExtCalendarPlanner && ! createWithCalendar )
	{
		eventData.date = DateOffset( eventData.date, 3600 );
	}

	if ( createWithCalendar )
	{
		calendarOptions = new Object;
		calendarOptions.eventType = eventType;
		calendarOptions.autoSelectRoom = eventType.create_with_room_auto_selection;
		
		if ( global_settings.use_candidate_user_for_calendar_filter )
			calendarOptions.user_id = candidate.user_id;
		
		resp = lib_calendar.select_date_and_room( undefined, calendarOptions );
		eventData.date = resp.date;
		eventData.room_id = resp.room_id;

		if ( eventData.date < CurDate )
			lib_base.ask_warning_to_continue( ActiveScreen, UiText.messages.past_date_selected );

		if ( global_settings.use_calendar_filter_user )
			eventData.user_id = resp.filter_user_id;
	}
	
	if ( eventData.user_id == null && ( global_settings.use_candidate_user_for_event || LdsCurUserID == null ) )
		eventData.user_id = candidate.user_id;

	prevStateEvent = candidate.get_state_event();
	nextEventType = undefined;

	if ( occurrence.show_init_dlg )
	{
		dlgDoc = OpenDoc( '//base2/base2_dlg_event.xml' );
		dlg = dlgDoc.TopElem;
		dlg.eventType = eventType;
		//dlg.occurrence = occurrence;
		dlg.showComment = true;
		dlg.Init();

		//dlgDoc.TopElem.date = eventData.date;

		dlg.comment = occurrence.default_comment;

		ActiveScreen.ModalDlg( dlgDoc );

		if ( dlg.selectedEventResult != undefined )
		{
			occurrence = dlg.selectedEventResult.occurrence;
			eventData.occurrence_id = occurrence.id;
			nextEventType = dlg.selectedEventResult.nextEventType;
			nextEventOccurrence = dlg.selectedEventResult.nextEventOccurrence;

			if ( dlg.reminder_date.HasValue )
			{
				eventData.reminder_date = dlg.reminder_date;
				eventData.is_exact_time_reminder = dlg.is_exact_time_reminder;
			}
		}

		//eventData.date = dlgDoc.TopElem.date;
		eventData.comment = dlgDoc.TopElem.comment;
		eventData.candidate_reject_reason_id = dlg.candidate_reject_reason_id;
		eventData.candidate_withdrawal_reason_id = dlg.candidate_withdrawal_reason_id;
		eventData.candidate_blacklist_reason_id = dlg.candidate_blacklist_reason_id;
	}

	eventDoc = DefaultDb.OpenNewObjectDoc( eventType.get_object_name() );
	event = eventDoc.TopElem;

	event.type_id = eventType.id;
	event.date = eventData.date;

	if ( eventType.is_poll )
		event.poll_result.spec_id = eventType.poll_spec_id;

	event.occurrence_id = eventData.occurrence_id;
	event.candidate_id = candidate.id;
	
	if ( eventData.vacancy_id != undefined )
		event.vacancy_id = eventData.vacancy_id;
	
	if ( eventData.room_id != undefined )
		event.room_id = eventData.room_id;
	
	if ( eventData.group_event_id != undefined )
		event.group_event_id = eventData.group_event_id;
	
	if ( eventData.training_group_id != undefined )
		event.training_group_id = eventData.training_group_id;

	if ( eventData.comment != undefined )
		event.comment = eventData.comment;

	if ( eventData.candidate_reject_reason_id != undefined )
		event.candidate_reject_reason_id = eventData.candidate_reject_reason_id;

	if ( eventData.candidate_withdrawal_reason_id != undefined )
		event.candidate_withdrawal_reason_id = eventData.candidate_withdrawal_reason_id;

	if ( eventData.candidate_blacklist_reason_id != undefined )
		event.candidate_blacklist_reason_id = eventData.candidate_blacklist_reason_id;

	if ( eventData.reminder_date != undefined )
	{
		event.reminder_date = eventData.reminder_date;
		event.is_exact_time_reminder = eventData.is_exact_time_reminder;
	}

	event.init();

	if ( eventData.user_id != undefined && eventData.user_id != null )
		event.user_id = eventData.user_id;

	lib_recruit.init_event_participants( event );

	RunCandidateStateCoreActions( candidate, event, occurrence, 0 );

	if ( global_settings.update_candidate_user_on_new_event && ! global_settings.use_candidate_user_for_event && lib_user.active_user_info.id.HasValue )
	{
		candidate.user_id = lib_user.active_user_info.id;
		candidate.group_id = lib_user.active_user_info.main_group_id;
	}

	if ( occurrence.create_with_open )
	{
		CreateDocScreen( eventDoc );
		//Screen.ExposeItemBySource( record.comment );
		return event;
	}

	prepareEdit = false;

	if ( eventType.is_calendar_entry && eventType.use_ext_calendar && lib_ext_calendar.is_ext_calendar_enabled && ! ( event.user_id.HasValue && event.user_id != lib_user.active_user_info.id ) )
	{
		prepareEdit = eventType.create_with_ext_calendar;
		lib_ext_calendar.put_entry_to_ext_calendar( event, {prepareEdit:prepareEdit} );
	}

	event.UpdateValues();
	eventDoc.Save();

	candidate.view.target_events_loaded = false;
	candidate.update_state();

	if ( eventData.vacancy_id != null )
		lib_recruit.UpdateVacancyOnCandidateEvent( candidate, event );

	if ( ! useExtCalendarPlanner )
		RunCandidateStateCoreActions( candidate, event, occurrence, 1 );

	if ( prepareEdit )
	{
		editor = lib_ext_calendar.start_ext_calendar_entry_editor( event, candidate.Screen );
		editor.is_new = true;
	}

	if ( nextEventType != undefined && ! options.isNextEvent )
	{
		HandleAddCandidateEvent( candidate, nextEventType.id, {occurrence_id:nextEventOccurrence.id,vacancy_id:eventData.vacancy_id}, {isNextEvent:true} );
	}

	if ( prevStateEvent != undefined && prevStateEvent.reminder_date.HasValue && ( ! prevStateEvent.vacancy_id.HasValue || prevStateEvent.vacancy_id == eventData.vacancy_id ) )
	{
		eventDoc = OpenDoc( DefaultDb.GetRecordPrimaryObjectUrl( prevStateEvent ) );
		event = eventDoc.TopElem;
		event.reminder_date.Clear();
		event.is_exact_time_reminder.Clear();
		//eventDoc.RunActionOnSave = false;
		eventDoc.Save();
	}

	if ( ! options.isNextEvent )
	{
		lib_base.SaveOptScreenObject( candidate );
		lib_reminder.OnEventChanged( this );
		
		if ( candidate.OptScreen != undefined )
			candidate.Screen.Update();
		
		UpdateScreens( '*', '*view*' );
	}

	return event;
}


function HandleAddCandidatesEvents( candidateIDs, eventTypeID, eventData, options )
{
	count = 0;

	for ( candidateID in candidateIDs )
	{
		candidateDoc = ObtainUiDoc( ObjectDocUrl( 'data', 'candidate', candidateID ) );
		candidate = candidateDoc.TopElem;

		event = HandleAddCandidateEvent( candidate, eventTypeID, eventData, options );
		if ( count == 0 )
		{
			if ( event.training_group_id != undefined )
				eventData.training_group_id = event.training_group_id;
		}

		//DebugMsg( candidateDoc.IsChanged );
	}

	lib_base.show_info_message( ActiveScreen, UiText.messages.operation_completed_successfully );
}


function SelectCandidateEventResult( candidate, event, eventData, options )
{
	if ( ! candidate.Doc.HasWriteAccess )
		throw UiError( UiText.errors.permission_denied );

	eventData = AdjustEventData( eventData );
	options = AdjustEventOptions( options );

	eventDoc = OpenDoc( event.PrimaryObjectUrl );
	event = eventDoc.TopElem;

	eventType = event.type;
	occurrence = eventType.get_opt_occurrence( '' );
	if ( occurrence == undefined )
		occurrence = eventType.get_init_occurrence( '' );

	prevOccurrenceID = RValue( event.occurrence_id );

	dlgDoc = OpenDoc( '//base2/base2_dlg_event.xml' );
	dlg = dlgDoc.TopElem;
	dlg.eventType = eventType;
	dlg.existingEvent = event;
	
	if ( eventData.occurrence_id != undefined )
		dlg.init_occurrence_id = eventData.occurrence_id;
	
	dlg.showComment = true;
	dlg.Init();

	//dlgDoc.TopElem.date = eventData.date;

	if ( event.comment.HasValue )
		dlg.comment = event.comment;
	else
		dlg.comment = occurrence.default_comment;

	dlg.candidate_reject_reason_id = event.candidate_reject_reason_id;
	dlg.candidate_withdrawal_reason_id = event.candidate_withdrawal_reason_id;
	dlg.candidate_blacklist_reason_id = event.candidate_blacklist_reason_id;

	ActiveScreen.ModalDlg( dlgDoc );

	occurrence = dlg.selectedEventResult.occurrence;
	event.occurrence_id = occurrence.id;
	nextEventType = dlg.selectedEventResult.nextEventType;
	nextEventOccurrence = dlg.selectedEventResult.nextEventOccurrence;

	event.reminder_date = dlg.reminder_date;
	event.is_exact_time_reminder = dlg.is_exact_time_reminder;

	eventData.vacancy_id = event.vacancy_id;
	lib_event.CheckOccurrencePermission( eventType, occurrence );
	SetCandidateStatePrepare( candidate, occurrence, eventData, options );

	event.comment = dlg.comment;
	event.candidate_reject_reason_id = dlg.candidate_reject_reason_id;
	event.candidate_withdrawal_reason_id = dlg.candidate_withdrawal_reason_id;
	event.candidate_blacklist_reason_id = dlg.candidate_blacklist_reason_id;

	RunCandidateStateCoreActions( candidate, event, occurrence, 0 );

	if ( prevOccurrenceID == 'scheduled' && event.occurrence_id == 'cancelled' )
	{
		//event.date = CurDate;
		//event.end_date.Clear();
		event.creation_date = CurDate;
	}
	else if ( eventType.use_end_date && eventType.has_long_duration && ! event.end_date.HasValue && occurrence.id != '' )
	{
		event.end_date = CurDate;
	}

	event.handle_before_ui_save();
	eventDoc.Save();

	candidate.view.target_events_loaded = false;
	candidate.update_state();

	if ( event.vacancy_id != null )
		lib_recruit.UpdateVacancyOnCandidateEvent( candidate, event );

	RunCandidateStateCoreActions( candidate, event, occurrence, 1 );

	if ( nextEventType != undefined && ! options.isNextEvent )
	{
		HandleAddCandidateEvent( candidate, nextEventType.id, {occurrence_id:nextEventOccurrence.id,vacancy_id:eventData.vacancy_id}, {isNextEvent:true} );
	}
	else if ( occurrence.use_auto_next_state && occurrence.next_state_id.HasValue && ! options.isNextEvent )
	{
		if ( options.chainLevel > 0 )
			throw UserError( 'Event chain is too long' );

		//LogEvent( '', 'handle_state_change ' + state_id + ' ' + prevStateID );
		options.chainLevel = 1;

		Sleep( 1 );

		//HandleSetCandidateState( candidate, occurrence.next_state_id, {vacancy_id:eventData.vacancy_id}, {isNextEvent:true} );
		HandleAddCandidateEvent( candidate, occurrence.next_state_id, {vacancy_id:eventData.vacancy_id}, {isNextEvent:true} );
	}

	if ( ! options.isNextEvent )
	{
		lib_base.SaveOptScreenObject( candidate );
		lib_reminder.OnEventChanged( this );
		//candidate.Screen.Update();
		UpdateScreens( '*', '*view*' );
	}

	return event;
}


function HandleSetCandidateState( candidate, stateID, eventData, options )
{
	eventData = AdjustEventData( eventData );
	options = AdjustEventOptions( options );

	state = GetForeignElem( candidate_states, stateID );
	eventTypeID = state.event_type_id;
	eventData.occurrence_id = state.event_occurrence_id;

	HandleAddCandidateEvent( candidate, eventTypeID, eventData, options );
}


function AddCandidateEvent( candidate, eventTypeID, eventData, options )
{
	if ( ! candidate.Doc.HasWriteAccess )
		throw UiError( UiText.errors.permission_denied );

	eventData = AdjustEventData( eventData );
	options = AdjustEventOptions( options );
	eventType = GetForeignElem( event_types, eventTypeID );
	
	if ( eventData.occurrence_id == undefined && eventType.has_occurrence( '' ) )
		eventData.occurrence_id = '';

	if ( eventData.occurrence_id == undefined )
		throw UserError( 'Occurence ID is not specified' );

	options.isSilent = true;

	if ( eventData.date == undefined )
		eventData.date = CurDate;

	if ( eventData.vacancy_id == undefined )
		//eventData.vacancy_id = candidate.get_screen_target_vacancy_id();
		eventData.vacancy_id = candidate.main_vacancy_id;

	if ( eventType.occurrences.ChildNum == 0 )
		eventType.occurrences.ObtainChildByKey( '' );

	occurrence = eventType.get_opt_occurrence( eventData.occurrence_id );
	if ( occurrence == undefined )
		throw 'Unknown occurrence: ' + eventData.occurrence_id;

	lib_event.CheckOccurrencePermission( eventType, occurrence );
	SetCandidateStatePrepare( candidate, occurrence, eventData, options );

	prevStateEvent = candidate.get_state_event();

	eventDoc = DefaultDb.OpenNewObjectDoc( eventType.get_object_name() );
	event = eventDoc.TopElem;

	event.type_id = eventType.id;
	event.date = eventData.date;

	if ( eventType.is_poll )
		event.poll_result.spec_id = eventType.poll_spec_id;

	event.occurrence_id = eventData.occurrence_id;
	event.candidate_id = candidate.id;
	event.vacancy_id = eventData.vacancy_id;
	
	if ( eventData.room_id != undefined )
		event.room_id = eventData.room_id;
	
	if ( eventData.group_event_id != undefined )
		event.group_event_id = eventData.group_event_id;
	
	if ( eventData.training_group_id != undefined )
		event.training_group_id = eventData.training_group_id;

	if ( eventData.comment != undefined )
		event.comment = eventData.comment;

	if ( eventData.reminder_date != undefined )
	{
		event.reminder_date = eventData.reminder_date;
		if ( eventData.is_exact_time_reminder != undefined )
			event.is_exact_time_reminder = eventData.is_exact_time_reminder;
	}

	if ( eventData.eid != undefined )
		event.eid = eventData.eid;

	EventDataToEvent( eventData, event );

	if ( eventData.wts_eid != undefined )
		event.wts_eid = eventData.wts_eid;

	event.init();

	if ( eventData.user_id != undefined && eventData.user_id != null )
		event.user_id = eventData.user_id;

	lib_recruit.init_event_participants( event );

	RunCandidateStateCoreActions( candidate, event, occurrence, 0 );

	event.UpdateValues();
	eventDoc.Save();

	candidate.view.target_events_loaded = false;
	candidate.update_state();

	RunCandidateStateCoreActions( candidate, event, occurrence, 1 );

	candidate.Doc.SetChanged( true );
	return event;
}


function SetCandidateState( candidate, stateID, eventData, options )
{
	eventData = AdjustEventData( eventData );
	options = AdjustEventOptions( options );

	state = GetForeignElem( candidate_states, stateID );
	if ( state.event_type_id.HasValue )
	{
		eventTypeID = state.event_type_id;
		eventData.occurrence_id = state.event_occurrence_id;
	}
	else
	{
		eventTypeID = stateID;
	}

	AddCandidateEvent( candidate, eventTypeID, eventData, options );
}


function RunCandidateStateCoreActions( candidate, event, state, phaseID )
{
	if ( phaseID == 1 )
		CheckCandidateStateNotif( candidate, event, state );
	
	vacancyID = event.vacancy_id;

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

				if ( ! template.id.HasValue )
					throw UserError( 'SMS template is not specified' )
			}

			if ( coreAction.type_id == 'send_mail' && template.dest_type == 'candidate' && ! candidate.email.HasValue && phaseID != 0 )
				continue;

			if ( coreAction.type_id == 'send_sms' && template.dest_type == 'candidate' && ! candidate.mobile_phone.HasValue )
				continue;

			if ( coreAction.send_to_participants )
			{
				if ( AppModuleUsed( 'module_rgs' ) && event.type.use_participants_order )
				{
					nextParticipant = ArrayOptFind( event.participants, '( participantPollResult = event.participant_poll_results.GetOptChildByKey( person_id ) ) == undefined || ! participantPollResult.completion_id.HasValue' );
					if ( nextParticipant != undefined )
						destPersonsArray = [nextParticipant.person_id.ForeignElem];
					else
						destPersonsArray = [];
				}
				else
				{
					destPersonsArray = ArrayExtract( event.participants, 'person_id.ForeignElem' );
				}

				msgStr = UiText.messages.send_participants_message_xxx;
			}
			else if ( coreAction.send_to_vacancy_user )
			{
				destPersonsArray = [GetForeignElem( vacancies, vacancyID ).user_id.ForeignElem.person_id.ForeignElem];
				msgStr = UiText.messages.send_user_message_xxx;
			}
			else if ( template.dest_type == 'person' )
			{
				vacancy = GetForeignElem( vacancies, vacancyID );
				destPersonsArray = ArrayExtract( vacancy.rr_persons, 'person_id.ForeignElem' );
				msgStr = UiText.messages.send_contact_person_message_xxx;
			}
			else if ( template.dest_type == 'candidate' )
			{
				destPersonsArray = [candidate];
				msgStr = UiText.messages.send_candidate_message_xxx;
			}
			else if ( template.dest_type == 'user' )
			{
				destPersonsArray = [candidate.user_id.ForeignElem.person_id.ForeignElem];
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

			if ( LdsIsClient && coreAction.ask_to_do && ! lib_base.ask_question( ActiveScreen, StrReplace( msgStr, '%s', template.name ) ) )
				continue;

			envObject = candidate.build_mail_env_object( vacancyID );
			
			if ( event != undefined )
			{
				envObject.event = event;
				envObject.event_web_link = lib_web.build_outer_url( 'event.htm', {id:event.id});
			}

			if ( coreAction.type_id == 'send_mail' )
			{
				if ( coreAction.use_mass_mail || ! LdsIsClient )
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

					//candidate.build_mail_ext_recipients( mailMessage, template, vacancyID );
					lib_mail.show_mail_message( mailMessage );
				}
			}
			else
			{
				if ( coreAction.use_mass_mail || ! LdsIsClient )
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
		else if ( coreAction.type_id == 'request_entry_pass' )
		{
			if ( coreAction.ask_to_do && ! lib_base.ask_question( ActiveScreen, UiText.questions.submit_entry_pass_request ) )
				continue;

			requestData = new Object;
			requestData.person = candidate;
			requestData.date = event.date;

			respData = lib_office_access.SubmitEntryRequest( requestData );

			if ( respData != undefined && respData.eid != undefined && event.Name == 'calendar_entry' )
				event.entry_pass_request_eid = respData.eid;
		}
		else if ( coreAction.type_id == 'request_aux_documents' )
		{
			if ( coreAction.ask_to_do && ! lib_base.ask_question( ActiveScreen, UiText.messages.candidate_aux_documents_request_will_be_submitted ) )
				continue;

			options = new Object;
			if ( coreAction.recruit_provider_id.HasValue )
				options.provider_id = coreAction.recruit_provider_id;

			lib_recruit_provider.RequestCandidateAuxDocument( candidate, event );
		}
		else if ( coreAction.type_id == 'run_code' )
		{
			eval( coreAction.code );
		}
	}
}


function CheckCandidateStateNotif( candidate, event, state )
{
	if ( ! state.create_notification )
		return;

	options = {object_state_id:state.id, vacancy_id:event.vacancy_id};

	if ( AppModuleUsed( 'module_sanofi' ) && event.type_id == 'testing' )
		options.user_id = event.user_id;

	lib_notif.create_notification( event.state_name, event.candidate_id.ForeignElem, options );
}


function UpdateCandidateOnEventOccurrenceChange( event )
{
	candidateDoc = ObtainUiDoc( ObjectDocUrl( 'data', 'candidate', event.candidate_id ) );
	candidate = candidateDoc.TopElem;
	candidate.update_state();
	UpdateUiDoc( candidateDoc );
}


function OnEventOccurrenceChange( event )
{
	candidateDoc = ObtainUiDoc( ObjectDocUrl( 'data', 'candidate', event.candidate_id ) );
	candidate = candidateDoc.TopElem;
	candidate.update_state();

	occurrence = event.occurrence;

	RunCandidateStateCoreActions( candidate, event, event.occurrence, 1 );

	if ( occurrence.use_auto_next_state && occurrence.next_state_id.HasValue )// && ! options.isNextEvent )
	{
		options = AdjustEventOptions( undefined ); 
		//if ( options.chainLevel > 0 )
			//throw UserError( 'Event chain is too long' );

		//LogEvent( '', 'handle_state_change ' + state_id + ' ' + prevStateID );
		options.chainLevel = 1;

		Sleep( 1 );
		//HandleSetCandidateState( candidate, occurrence.next_state_id, {vacancy_id:eventData.vacancy_id}, {isNextEvent:true} );
		AddCandidateEvent( candidate, occurrence.next_state_id, {vacancy_id:event.vacancy_id}, {isNextEvent:true, isSilent:true} );
	}

	UpdateUiDoc( candidateDoc );
}


function OnCandidateEventOccurrenceChange( candidate, event )
{
	candidate.update_state();

	occurrence = event.occurrence;
	RunCandidateStateCoreActions( candidate, event, occurrence, 1 );

	if ( occurrence.use_auto_next_state && occurrence.next_state_id.HasValue )// && ! options.isNextEvent )
	{
		options = AdjustEventOptions( undefined ); 
		//if ( options.chainLevel > 0 )
			//throw UserError( 'Event chain is too long' );

		//LogEvent( '', 'handle_state_change ' + state_id + ' ' + prevStateID );
		options.chainLevel = 1;

		Sleep( 1 );
		//HandleSetCandidateState( candidate, occurrence.next_state_id, {vacancy_id:eventData.vacancy_id}, {isNextEvent:true} );
		AddCandidateEvent( candidate, occurrence.next_state_id, {vacancy_id:event.vacancy_id}, {isNextEvent:true, isSilent:true} );
	}

	UpdateUiDoc( candidate.Doc );
}


function HandleSelectCandidateForGroupEvent( candidate, groupEventTypeID )
{
	groupEventType = GetForeignElem( event_types, groupEventTypeID );

	groupEventID = lib_recruit.select_group_event( groupEventTypeID );
	groupEventDoc = ObtainUiDoc( ObjectDocUrl( 'data', groupEventType.get_object_name(), groupEventID ) );

	if ( ! groupEventDoc.TopElem.has_free_places )
		throw UiError( UiText.errors.no_free_spaces_for_event );

	groupEventDoc.TopElem.participants.ObtainChildByKey( candidate.id );
	UpdateUiDoc( groupEventDoc );

	//if ( vacancyID == null )
		//vacancyID = groupInterviewDoc.TopElem.vacancy_id;

	return groupEventID;
}


function EventDataToEvent( eventData, event )
{
	if ( eventData.talk_transcript != undefined )
		event.talk_transcript = eventData.talk_transcript;

	if ( eventData.talk_recording_url != undefined )
		event.talk_recording_url = eventData.talk_recording_url;
}


function HandleSelectCandidateForTrainingGroup( candidate )
{
	trainingGroupID = lib_recruit.SelectFutureTrainingGroup();
	trainingGroupDoc = ObtainUiDoc( ObjectDocUrl( 'data', 'training_group', trainingGroupID ) );

	trainingGroupDoc.TopElem.participants.ObtainChildByKey( candidate.id );
	UpdateUiDoc( trainingGroupDoc );

	//if ( vacancyID == null )
		//vacancyID = groupInterviewDoc.TopElem.vacancy_id;

	return trainingGroupID;
}


function GetCandidateActiveGroupEvent( candidate, groupEventTypeID )
{
	/*
	queryStr = 'for $elem in events where $elem/type_id = ' + XQueryLiteral( eventTypeID );
	queryStr += ' and $elem/date >= ' + XQueryLiteral( DateOffset( DateNewTime( CurDate ), 0 - 14 * 86400 ) );
	queryStr += ' and $elem/date < ' + XQueryLiteral( DateOffset( CurDate, 86400 ) );
	queryStr += ' and MatchSome( $elem/participants/participant/person_id, ( ' + XQueryLiteral( candidate.id ) + ' ) )';
	queryStr += ' return $elem';

	array = XQuery( queryStr );
	array = ArraySort( array, 'date', '+' );
	return ArrayOptFirstElem( array );
	*/

	regEventType = ArrayOptFind( lib_voc.get_sorted_voc( event_types ), 'is_group_event_reg && group_event_type_id == groupEventTypeID' );
	if ( regEventType == undefined )
		return undefined;

	eventsArray = ArraySelectByKey( candidate.get_ui_events_array(), regEventType.id, 'type_id' );
	groupEventsArray = ArraySelectDistinct( ArraySelect( ArrayExtract( eventsArray, 'group_event_id.OptForeignElem' ), 'This != undefined' ), 'id' );
	if ( ArrayCount( groupEventsArray ) <= 1 )
		return ArrayOptFirstElem( groupEventsArray );

	groupEventsArray = ArraySelect( groupEventsArray, 'This.date < DateOffset( CurDate, 86400 )' );

	groupEventsArray = ArraySort( groupEventsArray, 'Math.abs( DateDiff( This.date, CurDate ) )', '+' );
	return ArrayOptFirstElem( groupEventsArray );
}


function HandleCancelCandidateGroupEventRegistration( candidate, event )
{
	newEvent = SelectCandidateEventResult( candidate, event, {occurrence_id:'cancelled'} );
	if ( newEvent.occurrence_id != 'cancelled' )
		return;

	groupEventDoc = ObtainUiDoc( event.group_event_id.ForeignPrimaryObjectUrl );
	groupEvent = groupEventDoc.TopElem;
	
	participant = groupEvent.participants.GetOptChildByKey( candidate.id );
	if ( participant == undefined )
		return;

	participant.Delete();
	UpdateUiDoc( groupEventDoc );
}


function HandleChangeCandidateGroupEventRegistration( candidate, event )
{
	newEvent = HandleAddCandidateEvent( candidate, event.type_id );
	if ( newEvent.group_event_id == event.group_event_id )
		return;

	groupEventDoc = ObtainUiDoc( event.group_event_id.ForeignPrimaryObjectUrl );
	groupEvent = groupEventDoc.TopElem;
	
	participant = groupEvent.participants.GetOptChildByKey( candidate.id );
	if ( participant != undefined )
	{
		participant.Delete();
		UpdateUiDoc( groupEventDoc );
	}

	eventType = event.type;
	occurrence = eventType.get_opt_occurrence( 'cancelled' );
	if ( occurrence == undefined )
		return;

	eventDoc = OpenDoc( event.PrimaryObjectUrl );
	event = eventDoc.TopElem;

	event.occurrence_id = occurrence.id;
	//event.creation_date = CurDate;

	eventDoc.Save();

	candidate.view.target_events_loaded = false;
	candidate.update_state();
}


function HandleAddCandidatePastEvent( candidate )
{
	if ( lib_user.active_user_access.prohibit_add_past_events )
		throw UiError( UiText.errors.permission_denied );

	if ( ! candidate.Doc.HasWriteAccess )
		throw UiError( UiText.errors.permission_denied );

	eventTypeID = lib_voc.select_voc_elem( event_types );
	eventType = GetForeignElem( event_types, eventTypeID );

	if ( eventType.occurrences.ChildNum == 0 )
		eventType.occurrences.ObtainChildByKey( '' );

	if ( eventType.has_occurrence( '' ) )
		occurrenceID = '';
	else
		occurrenceID = ArrayFirstElem( eventType.occurrences ).id;

	occurrence = eventType.get_opt_occurrence( occurrenceID );
	lib_event.CheckOccurrencePermission( eventType, occurrence );

	eventDoc = DefaultDb.OpenNewObjectDoc( eventType.get_object_name() );
	event = eventDoc.TopElem;
	event.type_id = eventTypeID;
	event.date = CurDate;
	event.occurrence_id = occurrenceID;

	event.candidate_id = candidate.id;
	event.vacancy_id = candidate.get_screen_target_vacancy_id();

	event.init();

	CreateDocScreen( eventDoc );
}


function AdjustEventData( eventData )
{
	if ( eventData == undefined )
		eventData = new Object;

	eventData.SetStrictMode( false );
	return eventData;
}


function AdjustEventOptions( options )
{
	if ( options == undefined )
		options = new Object;

	options.SetStrictMode( false );

	//if ( ! LdsIsClient )
		//options.isSilent = true;

	return options;
}


function SetCandidateStatePrepare( candidate, state, eventData, options )
{
	if ( lib_user.active_user_access.prohibit_change_other_user_active_candidates && candidate.user_id != lib_user.active_user_info.id && candidate.is_active )
		throw UiError( UiText.errors.permission_denied );

	if ( state.require_vacancy && eventData.vacancy_id == null && ! candidate.get_recruit_type().prohibit_spots && ! options.isSilent )
		throw UserError( UiText.errors.candidate_not_selected_for_vacancy );

	if ( state.show_init_warning && ! options.isSilent )
		lib_base.ask_warning_to_continue( ActiveScreen, StrReplaceOne( UiText.messages.set_candidates_state_to_xxx, '%s', state.get_state_name() ) );

	if ( state.require_position && candidate.main_vacancy_id.HasValue && ! candidate.main_vacancy_id.ForeignElem.division_id.HasValue && ! candidate.position_id.HasValue )
		throw UiError( UiText.errors.candidate_position_not_specified );

	if ( ! options.isSilent && state.require_empl_start_date && candidate.est_empl_start_date < CurDate )
		AskCandidateHireInfo( candidate );

	if ( candidate.Doc.NeverSaved )
		lib_base.SaveOptScreenObject( candidate );
}


function AskCandidateSpotDetails( candidate, spot )
{
	//candidate.est_empl_start_date = lib_base.select_date_value( candidate.est_empl_start_date.Title );

	dlgDoc = OpenNewDoc( '//rcr/rcr_dlg_candidate_spot.xml' );
	dlg = dlgDoc.TopElem;

	dlg.AssignElem( spot );

	ActiveScreen.ModalDlg( dlgDoc );

	spot.AssignElem( dlg );
	candidate.AssignExtraElem( dlg );

	candidate.Doc.SetChanged( true );
}


function AskCandidateHireInfo( candidate )
{
	//candidate.est_empl_start_date = lib_base.select_date_value( candidate.est_empl_start_date.Title );

	dlgDoc = OpenNewDoc( '//rcr/rcr_dlg_candidate_hire_info.xml' );
	dlg = dlgDoc.TopElem;

	dlg.probation_period.AssignElem( global_settings.probation_period );

	ActiveScreen.ModalDlg( dlgDoc );

	candidate.est_empl_start_date = dlg.empl_start_date;
	if ( candidate.est_empl_start_date.HasValue && dlg.probation_period.length.HasValue )
		candidate.probation_end_date = lib_base.get_term_date_offset( candidate.est_empl_start_date, dlg.probation_period );
}


function AdjustCandidateOnHireEvent( candidate )
{
	if ( candidate.get_recruit_type().require_hired_candidate_vacancy && candidate.get_main_vacancy_id() == null )
	{
		vacancyID = lib_recruit.select_active_vacancy();

		newSpot = candidate.spots.AddChild();
		newSpot.vacancy_id = vacancyID;
		newSpot.is_active = true;
		newSpot.start_date = CurDate;

		vacancy = newSpot.vacancy_id.ForeignElem;
		if ( vacancy.division_id.HasValue )
			candidate.division_id = vacancy.division_id;
		if ( vacancy.position_id.HasValue )
			candidate.position_id = vacancy.position_id;

		candidate.Doc.SetChanged( true );
	}

	if ( candidate.get_recruit_type().require_hired_candidate_division && ! candidate.division_id.HasValue )
	{
		viewFilter = new Object;
		if ( candidate.location_id.HasValue )
			viewFilter.location_id = candidate.location_id;

		divisionID = lib_base.select_object_from_view( 'divisions_with_mass_recruit', viewFilter );
		candidate.division_id = divisionID;
		candidate.Doc.SetChanged( true );
	}

	if ( candidate.get_recruit_type().require_hired_candidate_position && ! candidate.position_id.HasValue )
	{
		viewFilter = new Object;
		viewFilter.is_active = true;
		if ( candidate.division_id.HasValue )
			viewFilter.division_id = candidate.division_id;

		positionID = lib_base.select_object_from_view( 'positions', viewFilter );
		candidate.position_id = positionID;
		candidate.Doc.SetChanged( true );
	}
}






function CheckCandidateCreateNotif( candidate )
{
	if ( ! AppModuleUsed( 'module_adecco' ) )
		return;

	if ( ! global_settings.use_candidate_create_notif || ! global_settings.candidate_create_notif_mail_template_id.HasValue )
		return;

	if ( ! candidate.email.HasValue )
		return;

	message = lib_mail.build_mail_message( global_settings.candidate_create_notif_mail_template_id.ForeignElem, candidate.email, candidate, candidate.build_mail_env_object( candidate.main_vacancy_id ) );
	//lib_mail.adjust_message_sender( message );
	lib_mail.send_mail_message( message, {RunAsync:false} );
}


function build_candidate_left_actions_panel( candidate, destPanel )
{
	if ( destPanel.target_event_types_ref.HasValue )
		return;

	destPanel.target_event_types_ref = lib_event.build_object_sorted_event_types( candidate );

	destPanel.target_groups.Clear();

	for ( eventTypeGroup in lib_voc.get_sorted_voc( candidate_event_type_groups ) )
	{
		targetGroup = destPanel.target_groups.AddChild();
		targetGroup.event_type_group_id = eventTypeGroup.id;
		targetGroup.event_type_group_ref = eventTypeGroup;

		targetGroup.is_expanded = true;
	}

	destPanel.use_groups = ( destPanel.target_groups.ChildNum != 0 );
}


function RunAgentBindCandidatesToEmployees()
{
	//EnableLog( 'cnd-bind', true );
	LogEvent( 'cnd-bind', 'Starting binding candidates to employees' );

	if ( global_settings.candidate_employee_auto_bind.req_candidate_state_id.HasValue )
		stateIDs = global_settings.candidate_employee_auto_bind.req_candidate_state_id;
	else
		stateIDs = ['hire', 'probation'];

	queryStr = 'for $elem in candidates where MatchSome( $elem/state_id, (' + ArrayMerge( stateIDs, 'XQueryLiteral( This )', ',' ) + ') )';

	if ( true )
	{
		minDate = DateOffset( CurDate, 0 - 365 * 86400 );
		queryStr += ' and $elem/state_date >= ' + XQueryLiteral( minDate );
	}

	queryStr += ' order by $elem/fullname, $elem/birth_date';
	queryStr += ' return $elem/Fields( "id","fullname","birth_date","person_id","state_id","state_date","state_end_date","main_vacancy_id" )';

	array = XQuery( queryStr );
	array = ArraySelectAll( array );
	LogEvent( 'cnd-bind', 'Candidates to check: ' + ArrayCount( array ) );
	candidatesEnum = Enumerator( array );


	queryStr = 'for $elem in persons where $elem/is_own_person = true()';

	if ( true )
	{
		minDate = DateOffset( CurDate, 0 - 365 * 86400 );
		queryStr += ' and $elem/hire_date >= ' + XQueryLiteral( minDate );
	}

	queryStr += ' order by $elem/fullname, $elem/birth_date';
	queryStr += ' return $elem/Fields( "id","fullname","birth_date","hire_date","dismissal_date" )';

	array = XQuery( queryStr );
	array = ArraySelectAll( array );
	LogEvent( 'cnd-bind', 'Employees to check: ' + ArrayCount( array ) );
	personsEnum = Enumerator( array );

	//candidate = undefined;
	//person = undefined;

	candidatesEnum.GetNext();
	personsEnum.GetNext();

	pairsArray = new Array;

	while ( true )
	{
		candidate = candidatesEnum.CurrentElement;
		person = personsEnum.CurrentElement;

		if ( candidate == undefined || person == undefined )
			break;

		LogEvent( 'cnd-bind', 'Candidate: ' + candidate.fullname + ', Employee: ' + person.fullname );

		match = CandidateMatchesEmployee( candidate, person );
		if ( match )
		{
			pair = new Object;
			pair.candidateID = candidate.id;
			pair.person = person;
			//DebugMsg( candidate.Xml );

			pairsArray.push( pair );
			LogEvent( 'cnd-bind', 'Match' );
		}

		diff = CandidateEmployeeCompare( candidate, person );
		if ( diff == 0 )
		{
			candidatesEnum.GetNext();
			personsEnum.GetNext();
		}
		else if ( diff > 0 )
		{
			personsEnum.GetNext();
		}
		else
		{
			candidatesEnum.GetNext();
		}
	}

	for ( pair in pairsArray )
	{
		candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', pair.candidateID );
		candidate = candidateDoc.TopElem;

		LogEvent( 'cnd-bind', 'Candidate to bind: ' + candidate.fullname );

		person = pair.person;

		if ( candidate.person_id != pair.person.id )
		{
			candidate.person_id = pair.person.id;

			candidateDoc.WriteDocInfo = false;
			candidateDoc.Save();


			personDoc = DefaultDb.OpenObjectDoc( 'person', pair.person.id );
			person = personDoc.TopElem;

			person.candidate_id = pair.candidateID;

			personDoc.WriteDocInfo = false;
			personDoc.Save();
		}

		if ( person.dismissal_date.HasValue )
		{
			if ( candidate.state_id == 'probation' && person.dismissal_date < candidate.state_end_date && global_settings.candidate_employee_auto_bind.set_probation_fail_state )
			{
				event = candidate.get_state_event();
				if ( event != undefined && event.type.has_occurrence( 'failed' ) )
				{
					eventDoc = OpenDoc( event.ObjectUrl );
					event = eventDoc.TopElem;

					event.occurrence_id = 'failed';
					event.end_date = person.dismissal_date;
					eventDoc.Save();

					candidate.update_state();
					candidateDoc.Save();
				}
			}
			else if ( global_settings.candidate_employee_auto_bind.set_dismissal_state )
			{
				eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
				event = eventDoc.TopElem;

				event.type_id = 'dismiss';
				event.date = person.dismissal_date;
				event.candidate_id = candidate.id;
				event.vacancy_id = candidate.main_vacancy_id;

				eventDoc.Save();

				candidate.update_state();
				candidateDoc.Save();
			}
		}
		else if ( global_settings.candidate_employee_auto_bind.hire_state_id.HasValue && candidate.state_id != global_settings.candidate_employee_auto_bind.hire_state_id && person.hire_date.HasValue && person.hire_date > candidate.state_date )
		{
			eventData = new Object;

			state = GetForeignElem( candidate_states, global_settings.candidate_employee_auto_bind.hire_state_id );
			eventTypeID = state.event_type_id;
			eventData.occurrence_id = state.event_occurrence_id;
			eventData.date = person.hire_date;

			lib_candidate.AddCandidateEvent( candidate, eventTypeID, eventData, {isSilent:true} );
			candidateDoc.Save();
		}

		LogEvent( 'cnd-bind', 'Done' );
	}

	LogEvent( 'cnd-bind', 'Finished binding candidates to employees' );
}


function CandidateEmployeeCompare( candidate, person )
{
	if ( candidate.fullname > person.fullname )
		return 1;
	else if ( candidate.fullname < person.fullname )
		return -1;

	if ( candidate.birth_date > person.birth_date )
		return 1;
	else if ( candidate.birth_date < person.birth_date )
		return -1;

	return 0;
}


function CandidateMatchesEmployee( candidate, person )
{
	if ( candidate.person_id.HasValue )
		return ( candidate.person_id == person.id );

	if ( candidate.fullname != person.fullname )
		return false;

	if ( candidate.birth_date.HasValue && person.birth_date.HasValue && candidate.birth_date != person.birth_date )
		return false;

	if ( ! person.hire_date.HasValue )
		return false;

	dateDiff = lib_base.get_date_days_diff( candidate.state_date, person.hire_date );
	if ( dateDiff < 0 )
		dateDiff = -dateDiff;

	if ( dateDiff > global_settings.candidate_employee_auto_bind.hire_date_margin )
		return false;

	return true;
}


function HandleChangePersonToCandidate( person )
{
	if ( person.is_candidate )
		throw UserError( 'Person is already a candidate' );

	if ( person.candidate_id.HasValue )
		throw UserError( 'Person is already linked to a candidate' );

	if ( person.Doc.IsChanged )
		person.Doc.Screen.SaveDoc();

	candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate', person.id );
	candidate = candidateDoc.TopElem;

	candidate.AssignExtraElem( person );

	person.Doc.Screen.Close();
	candidateDoc.Save();

	CreateDocScreen( candidateDoc );
}


function GuessCandidateCountry( candidate )
{
	if ( candidate.country_id.HasValue )
		return;

	if ( candidate.location_id.HasValue )
	{
		candidate.country_id = lib_location.GetCountryIDByLocationID( candidate.location_id )
		if ( candidate.country_id.HasValue )
			return;
	}
}


function HandlePrintCandidateExtProfile( candidate )
{
	if ( AppModuleUsed( 'module_pm' ) )
	{
		Ps = candidate;
		reportStr = EvalCodePageUrl( '//module_pm/pm_candidate_rr.xmp', 'strict-errors=1' );
		lib_base.print_report( reportStr );
		return;
	}

	useMsWord = true;

	auxData = new Object;
	auxData.SetStrictMode( false );
	
	auxData.photo = ExtractCandidatePhoto( candidate );
	if ( auxData.photo != undefined )
	{
		auxData.photo.maxWidth = 200;
		auxData.photo.maxHeight = 300;
	}

	//htmlStr = BuildResume( candidate, auxData );
	htmlStr = OpenCodeLib( 'rcr_lib_candidate_resume.js' ).BuildInetResume( candidate, auxData );

	if ( ! useMsWord )
	{
		PutUrlData( 'zz_resume.htm', htmlStr );
		ShellExecute( 'open', UrlToFilePath( 'zz_resume.htm' ) );
		return;
	}

	tempFileUrl = ObtainSessionTempFile( '.docx' );
	//build_native_doc_ext( tempFileUrl, htmlStr, 'text/html', AbsoluteUrl( 'rekadro_profile_template.docx' ) );
	build_native_doc_ext( tempFileUrl, htmlStr, 'text/html', undefined );

	//ShellExecute( 'open', 'winword.exe', '"' + UrlToFilePath( tempFileUrl ) + '"' );
}


function ExtractCandidatePhoto( candidate )
{
	attachment = candidate.opt_default_attachment;
	if ( attachment == undefined || attachment.type_id != 'resume' || ! attachment.is_text )
		return undefined;

	reader = new TagReader( attachment.text );
	if ( reader.SkipToTag( 'img', 'class=EStaffResumePhoto', true ) )
		return ExtractPhotoFromImageUrl( reader.GetAttr( 'src' ) );

	return undefined;
}


function ExtractPhotoFromImageUrl( url )
{
	obj = StrOptScan( url, 'data:%s;base64,%s' );
	if ( obj == undefined )
		return undefined;

	photo = new Object;
	photo.SetStrictMode( false );

	photo.contentType = obj[0];
	photo.data = Base64Decode( obj[1] );
	return photo;
}


function build_native_doc_ext( docUrl, srcText, srcContentType, templateUrl )
{
	tempDir = ObtainSessionTempFile();
	CreateDirectory( tempDir );

	if ( srcContentType == 'text/html' )
	{
		if ( lib_html.is_compound_html( srcText ) )
		{
			tempFileUrl = UrlAppendPath( tempDir, '1.mht' );
			PutUrlData( tempFileUrl, lib_html.compound_html_to_mht( srcText ) );
		}
		else
		{
			tempFileUrl = UrlAppendPath( tempDir, '1.htm' );
			PutUrlData( tempFileUrl, srcText );
		}
	}
	else
	{
		tempFileUrl = UrlAppendPath( tempDir, '1.doc' );
		PutUrlData( tempFileUrl, HtmlEncodeDoc( srcText ) );
	}

	//DebugMsg( tempFileUrl );


	app = lib_office.start_msword_app();
	app.Visible = true;
	app.DisplayAlerts = false;

	if ( StrBegins( app.Version, '8.' ) )
		throw UserError( UiText.errors.mso_2000_required );

	isOffice2007orLater = ( app.Version >= '13.' );

	if ( templateUrl )
	{
		templateUrl2 = ObtainSessionTempFile( UrlPathSuffix( templateUrl ) );
		PutUrlData( templateUrl2, LoadUrlData( templateUrl ) );

		document = app.Documents.Add( UrlToFilePath( templateUrl2 ) );

		findObject = app.Selection.Find;

		findObject.Text = '[CORE]';
		findObject.Execute();
		
		if ( ! findObject.Found )
			app.Selection.EndKey( 6 );
	}
	else
	{
		document = app.Documents.Add();
	}

	try
	{
		app.Selection.InsertFile( UrlToFilePath( tempFileUrl ) );
	}
	catch ( e )
	{
		alert( e );
	}

	/*if ( isOffice2007orLater && StrEnds( docUrl, '.doc', true ) )
		document.SaveAs( UrlToFilePath( docUrl ), 0 );
	else
		document.SaveAs( UrlToFilePath( docUrl ) );

	document.Close( 0 );
	app.Quit( false );*/

	DeleteDirectory( tempDir );
}


function QueryCandidates( queryParam )
{
	queryParam.SetStrictMode( false );

	queryStr = 'for $elem in candidates';
	qual = '';

	if ( queryParam.vacancyID != undefined )
		qual += ' and MatchSome( $elem/spots/spot/vacancy_id, ' + XQueryLiteral( queryParam.vacancyID ) + ' )';

	queryStr += StrReplaceOne( qual, ' and ', ' where ' );
	queryStr += ' return $elem/Fields( "id","fullname" )';

	candidatesArray = XQuery( queryStr );
	
	if ( queryParam.eventTypeID != undefined )
		candidatesArray = FilterCandidatesByEvents( candidatesArray, queryParam );
	
	DebugMsg( ArrayMerge( candidatesArray, 'Xml', '\r\n' ) );
	return candidatesArray;
}


function FilterCandidatesByEvents( candidatesArray, queryParam )
{
	candidatesArray = ArraySort( candidatesArray, 'id', '+' );

	queryStr = 'for $elem in events where MatchSome( $elem/candidate_id, (' + ArrayMerge( candidatesArray, 'id.XQueryLiteral', ',' ) + ') )';
	queryStr += ' and $elem/type_id = ' + XQueryLiteral( queryParam.eventTypeID );
	queryStr += ' return $elem/Fields( "id","occurrence_id","candidate_id" )';

	eventsArray = XQuery( queryStr );
	candidatesArray2 = new Array;

	for ( event in eventsArray )
	{
		if ( event.occurrence_id == 'scheduled' || event.occurrence_id == 'cancelled' )
			continue;

		candidate = ArrayOptFindBySortedKey( candidatesArray, event.candidate_id, 'id' );
		if ( candidate == undefined )
			continue;

		candidatesArray2.push( candidate );
	}

	return candidatesArray2;
}


function SendEmailToCandidates( candidatesArray, templateID, initEnvObject )
{
	template = GetForeignElem( mail_templates, templateID );

	for ( candidate in candidatesArray )
	{
		candidateDoc = OpenDoc( candidate.ObjectUrl );
		candidate = candidateDoc.TopElem;

		if ( ! candidate.email.HasValue )
			continue;

		envObject = lib_mail.build_default_env( candidate, initEnvObject )
		message = lib_mail.build_mail_message_core( template, candidate.email, candidate, envObject );
		lib_mail.send_mail_message( message );
	}
}
