function RunAgentProcessCustomActions()
{
	for ( customAction in lib_voc.get_sorted_voc( custom_actions ) )
	{
		if ( customAction.trigger_event_id.HasValue )
			continue;

		CheckCustomAction( customAction );
	}
}


function ProcessVacancyCustomActionsOnTriggerEvent( vacancy, triggerEventID )
{
	for ( customAction in lib_voc.get_sorted_voc( custom_actions ) )
	{
		if ( customAction.trigger_event_id != triggerEventID )
			continue;

		if ( ! VacancyMatchesCustomActionCondition( vacancy, customAction ) )
			continue;

		RunVacancyCustomAction( vacancy, customAction );
	}
}


function ProcessCandidateCustomActionsOnTriggerEvent( candidate, triggerEventID, eventData )
{
	for ( customAction in lib_voc.get_sorted_voc( custom_actions ) )
	{
		if ( customAction.trigger_event_id != triggerEventID )
			continue;

		if ( ! CandidateMatchesCustomActionCondition( candidate, customAction ) )
			continue;

		//if ( CheckCandidateLastCustomAction( candidate, customAction ) )
			//continue;

		RunCandidateCustomAction( candidate, customAction, eventData );
	}
}


function CheckCustomAction( customAction )
{
	if ( customAction.target_object_type_id != 'candidate' )
		return;

	if ( ! customAction.condition.candidate_state_id.HasValue )
		return;

	//DebugMsg( customAction.Xml );

	queryStr = 'for $elem in candidates where $elem/state_id = ' + XQueryLiteral( customAction.condition.candidate_state_id );
	queryStr += ' and $elem/state_date >= ' + XQueryLiteral( DateOffset( CurDate, 0 - 60 * 86400 ) );
	queryStr += ' return $elem/Fields( "id","state_id","state_date" )';

	array = XQuery( queryStr );
	for ( candidate in array )
	{
		if ( ! CandidateMatchesCustomActionCondition( candidate, customAction ) )
			continue;

		if ( CheckCandidateLastCustomAction( candidate, customAction ) )
			continue;

		RunCandidateCustomAction( candidate, customAction );
	}
}


function VacancyMatchesCustomActionCondition( vacancy, customAction )
{
	if ( customAction.condition.vacancy_state_id.HasValue )
	{
		if ( vacancy.state_id != customAction.condition.vacancy_state_id )
			return false;
	}

	if ( customAction.condition.expr.HasValue && ! eval( customAction.condition.expr ) )
		return false;

	return true;
}


function CandidateMatchesCustomActionCondition( candidate, customAction )
{
	if ( customAction.condition.candidate_state_id.HasValue )
	{
		if ( candidate.state_id != customAction.condition.candidate_state_id )
			return false;
	}

	if ( customAction.condition.state_duration.length.HasValue && candidate.state_date.HasValue )
	{
		if ( lib_base.get_term_date_offset( candidate.state_date, customAction.condition.state_duration ) > CurDate )
			return false;
	}

	if ( customAction.condition.expr.HasValue && ! eval( customAction.condition.expr ) )
		return false;

	return true;
}


function CheckCandidateLastCustomAction( candidate, customAction )
{
	query = 'for $elem in notifications where $elem/custom_action_id = ' + XQueryLiteral( customAction.id );
	query += ' and $elem/candidate_id = ' + XQueryLiteral( candidate.id );

	if ( customAction.repeat_interval.length.HasValue )
		query += ' and $elem/date >= ' + XQueryLiteral( lib_base.get_term_date_neg_offset( CurDate, customAction.repeat_interval ) );

	query = query + ' return $elem/Fields( "id" )';

	array = XQuery( query );
	if ( ArrayOptFirstElem( array ) != undefined )
		return true;

	return false;
}


function RunVacancyCustomAction( vacancy, customAction, eventData )
{
	if ( eventData == undefined )
		eventData = new Object;

	eventData.SetStrictMode( false );

	//DebugMsg( candidate.Xml );

	if ( vacancy.OptDoc == undefined )
	{
		vacancyDoc = OpenDoc( vacancy.ObjectUrl );
		vacancy = vacancyDoc.TopElem;
	}

	//RunVacancyCoreActions( vacancy, vacancy.state_id.ForeignElem, customAction, 0 );
	lib_vacancy.run_vacancy_state_core_actions( vacancy, vacancy.state_id.ForeignElem, 0 );


	lib_notif.create_notification( customAction.name, vacancy, {custom_action_id:customAction.id,skipEmailNotif:true} );
}


function RunCandidateCustomAction( candidate, customAction, eventData )
{
	if ( eventData == undefined )
		eventData = new Object;

	eventData.SetStrictMode( false );

	//DebugMsg( candidate.Xml );

	if ( candidate.OptDoc == undefined )
	{
		candidateDoc = OpenDoc( candidate.ObjectUrl );
		candidate = candidateDoc.TopElem;
	}

	stateEvent = candidate.get_state_event();
	
	RunCandidateCoreActions( candidate, stateEvent, eventData, customAction, 0 );


	lib_notif.create_notification( customAction.name, candidate, {custom_action_id:customAction.id,skipEmailNotif:true} );
}


function RunCandidateCoreActions( candidate, event, eventData, state, phaseID )
{
	if ( eventData.vacancy_id != undefined )
		vacancyID = eventData.vacancy_id;
	else if ( event != undefined )
		vacancyID = event.vacancy_id;
	else
		vacancyID = candidate.main_vacancy_id;

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

			if ( coreAction.send_to_participants && event != undefined )
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

			if ( coreAction.ask_to_do && ! lib_base.ask_question( ActiveScreen, StrReplace( msgStr, '%s', template.name ) ) )
				continue;

			envObject = candidate.build_mail_env_object( vacancyID );
			
			if ( event != undefined )
			{
				envObject.event = event;
				envObject.event_web_link = lib_web.build_outer_url( 'event.htm', {id:event.id});
			}

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

					//candidate.build_mail_ext_recipients( mailMessage, template, vacancyID );
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
		else if ( coreAction.type_id == 'run_code' )
		{
			eval( coreAction.code );
		}
	}
}