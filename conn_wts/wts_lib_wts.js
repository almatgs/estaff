function CheckProvider( provider )
{
	argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;

	body = argElem.AddChild( 'soap:Body' );
	baseElem = body.AddChild( 'Test' );
	paramElem = baseElem.AddChild( 'param' );
	paramElem.AddChild( 'name', 'string' ).Value = 'Test';

	respElem = CallSoapMethod( argElem );
}


function HandleUploadPollSpec( pollSpec )
{
	argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;

	body = argElem.AddChild( 'soap:Body' );
	baseElem = body.AddChild( 'UpdatePoll' );
	pollElem = baseElem.AddChild( 'poll' );
	pollElem.AddChild( 'code', 'string' ).Value = pollSpec.id;
	pollElem.AddChild( 'name', 'string' ).Value = pollSpec.name;
	//pollElem.AddChild( 'start_date', 'date' ).Value = CurDate;
	//pollElem.AddChild( 'end_date', 'date' ).Value = Date( '2018-12-31T00:00' );
	questionsElem = pollElem.AddChild( 'questions' );
	
	for ( question in pollSpec.questions )
	{
		questionElem = questionsElem.AddChild( 'question' );
		questionElem.AddChild( 'id', 'integer' ).Value = FNV1a64( question.id );
		questionElem.AddChild( 'type_id', 'string' ).Value = question.type_id;
		questionElem.AddChild( 'title', 'string' ).Value = question.name;
		questionElem.AddChild( 'required', 'bool' ).Value = ! question.is_optional;

		if ( question.type_id == 'choice_single' || question.type_id == 'choice_multiple' || question.type_id == 'dropdown' )
		{
			answersElem = questionElem.AddChild( 'entries' );
			
			for ( answer in question.answers )
			{
				answerElem = answersElem.AddChild( 'entry' );
				answerElem.AddChild( 'id', 'integer' ).Value = answer.id;
				answerElem.AddChild( 'name', 'string' ).Value = answer.name;
			}
		}
		else if ( question.type_id == 'rating' )
		{
			questionElem.AddChild( 'min_entry_value', 'integer' ).Value = question.min_score;
			questionElem.AddChild( 'max_entry_value', 'integer' ).Value = question.max_score;
		}
		else if ( question.type_id == 'video' )
		{
			questionElem.AddChild( 'prohibit_viewing', 'bool' ).Value = question.prohibit_view;
			questionElem.AddChild( 'prohibit_overwriting', 'bool' ).Value = question.prohibit_overwrite;
			questionElem.AddChild( 'preparation_time', 'integer' ).Value = question.max_preparation_period.get_seconds_num();
			questionElem.AddChild( 'max_duration', 'integer' ).Value = question.max_duration.get_seconds_num();
		}
	}

	pollElem.AddChild( 'complete_message', 'string' ).Value = pollSpec.final_message_text;

	//pollElem.AddChild( 'ext_form_fields', 'string' ).Value = '';

	respElem = CallSoapMethod( argElem );

	//pollSpec.wts_eid = StrLowerCase( StrHexInt( Int( respElem.poll_id ) ) );
	pollSpec.wts_eid = respElem.poll_id;


	if ( pollSpec.use_auto_apply && pollSpec.auto_apply_data.position_name.HasValue )
		UploadAutoApplyData( pollSpec );

	pollSpec.Doc.SetChanged( true );
	lib_base.show_info_message( ActiveScreen, UiText.messages.operation_completed_successfully );
}


function UploadAutoApplyData( pollSpec )
{
	argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;

	body = argElem.AddChild( 'soap:Body' );
	baseElem = body.AddChild( 'UpdateVacancy' );
	pollElem = baseElem.AddChild( 'poll' );
	pollElem.AddChild( 'code', 'string' ).Value = pollSpec.id;
	vacancyElem = baseElem.AddChild( 'vacancy' );
	vacancyElem.AddChild( 'name', 'string' ).Value = pollSpec.auto_apply_data.position_name;
	vacancyElem.AddChild( 'source_id', 'string' ).Value = pollSpec.id;

	respElem = CallSoapMethod( argElem );

	pollSpec.auto_apply_data.url = AdjustServiceUrl( respElem.url_launch );
}


function HandleAssignCandidateVideoInterviewPoll( candidate, event )
{
	vacancy = event.vacancy_id.ForeignElem;
	if ( vacancy.video_interview_poll_spec_id.HasValue )
	{
		pollSpecID = vacancy.video_interview_poll_spec_id;
	}
	else
	{
		lib_voc.check_voc_not_empty( poll_specs );
		pollSpecID = lib_voc.select_voc_elem( poll_specs );
	}
	
	pollSpec = GetForeignElem( poll_specs, pollSpecID );
	if ( !pollSpec.wts_eid.HasValue )
		throw UiError( UiText.errors.poll_spec_not_uploaded_to_wts );

	argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;
	body = argElem.AddChild( 'soap:Body' );
	baseElem = body.AddChild( 'AssignPoll' );

	pollElem = baseElem.AddChild( 'poll' );
	//pollElem.AddChild( 'id', 'string' ).Value = pollSpec.wts_eid;
	pollElem.AddChild( 'code', 'string' ).Value = pollSpec.id;
	//pollElem.AddChild( 'name', 'string' ).Value = pollSpec.name;
	candidateElem = baseElem.AddChild( 'candidate' );
	candidateElem.AddChild( 'code', 'string' ).Value = StrLowerCase( StrHexInt( candidate.id ) );
	//candidateElem.AddChild( 'eid', 'string' ).Value = StrLowerCase( StrHexInt( candidate.id ) );
	candidateElem.AddChild( 'lastname', 'string' ).Value = candidate.lastname;
	candidateElem.AddChild( 'firstname', 'string' ).Value = candidate.firstname;
	candidateElem.AddChild( 'middlename', 'string' ).Value = candidate.middlename;
	candidateElem.AddChild( 'email', 'string' ).Value = candidate.email;

	pollResultElem = baseElem.AddChild( 'poll_result' );
	pollResultElem.AddChild( 'code', 'string' ).Value = StrLowerCase( StrHexInt( event.id ) );

	respElem = CallSoapMethod( argElem );

	//externalRegistration = candidateDoc.TopElem.external_registrations.ObtainChildByKey( 'wts' );
	//externalRegistration.eid = respElem.person_id;

	event.participant_web_url = AdjustServiceUrl( respElem.url_launch );
	//event.wts_eid = respElem.poll_result.code;
	//event.web_url = respElem.url;
}


function HandleShowPollResult( event )
{
	argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;
	body = argElem.AddChild( 'soap:Body' );
	baseElem = body.AddChild( 'GeneratePollResultReportUrl' );
	
	if ( event.wts_eid.HasValue )
		baseElem.AddChild( 'id', 'string' ).Value = event.id;
	else
		baseElem.AddChild( 'code', 'string' ).Value = StrLowerCase( StrHexInt( event.id ) );

	respElem = CallSoapMethod( argElem );

	ShellExecute( 'open', AdjustServiceUrl( respElem.url ) );
}


function RunCheckStatesTask()
{
	if ( ! wts_global_settings.access_token.HasValue )
		return;

	lastRunDate = task_results.GetTaskLastRunDate( 'check_poll_states' );
	if ( lastRunDate == null )
		lastRunDate = DateOffset( CurDate, - 30 * 3600 );

	runDate = CurDate;


	minDate = DateOffset( lastRunDate, 0 - 4 * 3600 );

	queryStr = 'for $elem in events';

	queryStr += ' where $elem/type_id = \'video_interview_poll\'';
	queryStr += ' and $elem/date >= ' + XQueryLiteral( DateOffset( CurDate, 0 - 7 * 86400 ) );
	queryStr += ' return $elem/Fields( "id","is_derived","is_calendar_entry","is_rr_poll" )';

	eventsArray = ArraySelectAll( XQuery( queryStr ) );
	if ( ArrayCount( eventsArray ) != 0 )
	{
		argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;
		body = argElem.AddChild( 'soap:Body' );
		baseElem = body.AddChild( 'GetPollResults' );

		baseElem.AddChild( 'date', 'date' ).Value = minDate;

		respElem = CallSoapMethod( argElem );

		for ( srcResult in respElem.poll_results )
		{
			if ( ! srcResult.ChildExists( 'poll_result_code' ) ) //!!
				continue;

			event = ArrayOptFindByKey( eventsArray, Int( '0x' + srcResult.poll_result_code ), 'id' );
			if ( event == undefined )
				continue;

			UpdateEventState( event, srcResult );
		}

		task_results.SetTaskLastRunDate( 'check_poll_states', runDate );
	}
}


function UpdateEventState( event, srcResult )
{
	switch ( Int( srcResult.status ) )
	{
		case 2:
			occurrenceID = 'succeeded';
			break;

		default:
			return;
	}

	if ( event.occurrence_id == occurrenceID )
		return;

	eventDoc = OpenDoc( DefaultDb.GetRecordPrimaryObjectUrl( event ) );
	event = eventDoc.TopElem;
	event.occurrence_id = occurrenceID;
	if ( ! event.end_date.HasValue )
		event.end_date = srcResult.modification_date;
	eventDoc.Save();

	if ( event.candidate_id.HasValue )
	{
		candidateDoc = OpenDoc( event.candidate_id.ForeignObjectUrl );
		candidateDoc.TopElem.update_state();
		candidateDoc.WriteDocInfo = false;
		candidateDoc.RunActionOnSave = false;
		candidateDoc.Save();
	}
	
	//event.on_ui_save();
}


function RunCheckPollAutoApplyTask()
{
	if ( ArrayOptFind( lib_voc.get_sorted_voc( poll_specs ), 'use_auto_apply' ) == undefined )
		return;

	if ( ! wts_global_settings.access_token.HasValue )
		return;

	lastRunDate = task_results.GetTaskLastRunDate( 'check_poll_auto_apply' );
	if ( lastRunDate == null )
		lastRunDate = DateOffset( CurDate, - 30 * 3600 );

	runDate = CurDate;
	minDate = DateOffset( lastRunDate, 0 - 4 * 3600 );

	argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;
	body = argElem.AddChild( 'soap:Body' );
	baseElem = body.AddChild( 'GetVacancyResponses' );

	baseElem.AddChild( 'date', 'date' ).Value = minDate;

	respElem = CallSoapMethod( argElem );

	for ( srcResponse in respElem.vacancy_responses )
	{
		LoadAutoApplyCandidate( srcResponse );
	}

	task_results.SetTaskLastRunDate( 'check_poll_auto_apply', runDate );
}


function LoadAutoApplyCandidate( srcResponse )
{
	pollSpec = ArrayOptFindByKey( poll_specs, srcResponse.vacancy_code, 'id' );
	if ( pollSpec == undefined )
	{
		LogEvent( '', 'RunCheckPollAutoApplyTask() error: No such poll spec: ' + srcResponse.vacancy_code );
		return;
	}

	candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
	candidate = candidateDoc.TopElem;
	candidate.lastname = srcResponse.person.lastname;
	candidate.firstname = srcResponse.person.firstname;
	candidate.middlename = srcResponse.person.middlename;
	
	if ( srcResponse.ChildExists( 'birthdate' ) )
		candidate.birth_date = srcResponse.birthdate;

	if ( srcResponse.ChildExists( 'email' ) )
		candidate.email = srcResponse.email;

	if ( srcResponse.ChildExists( 'mobile_phone' ) )
		candidate.mobile_phone = lib_phone_details.PhoneToStoredPhone( srcResponse.phone );

	if ( srcResponse.ChildExists( 'files' ) )
	{
		for ( srcFile in srcResponse.files )
		{
			attachment = candidate.attachments.AddChild();
			attachment.type_id = 'resume';
			attachment.file_name = srcFile.name;
			attachment.content_type = 'application/binary';
			attachment.data = srcFile.data;
		}
	}

	if ( pollSpec.auto_apply_data.dest_candidate_fields.state_id.HasValue )
	{
		stateID = pollSpec.auto_apply_data.dest_candidate_fields.state_id;
	}
	else
	{
		stateID = 'vacancy_response';
	}

	if ( ( state = GetOptForeignElem( candidate_states, stateID ) ) == undefined )
	{
		LogEvent( '', 'RunCheckPollAutoApplyTask() error: No such candidate state: ' + stateID );
		return;
	}

	//lib_candidate.SetCandidateState( candidate, stateID, {wts_eid:Int( srcResponse.id )} );
	candidateDoc.Save();


	eventType = GetForeignElem( event_types, state.event_type_id );

	eventDoc = DefaultDb.OpenNewObjectDoc( eventType.get_object_name() );
	event = eventDoc.TopElem;
	event.type_id = eventType.id;
	event.date = srcResponse.modification_date;
	event.candidate_id = candidate.id;
	event.wts_eid = srcResponse.id;
	event.on_ui_save();
	eventDoc.Save();
}


function CallSoapMethod( argElem, formUrl )
{
	var			reqStr, respStr;

	if ( ! wts_global_settings.access_token.HasValue )
		throw UiError( UiText.errors.wts_access_token_not_specified );

	baseUrl = GetServiceBaseUrl();
	targetUrl = AbsoluteUrl( '/services/EStaffOnlineService', baseUrl );

	reqStr = '<?xml version="1.0" encoding="utf-8"?>\r\n' + EncodeCharset( argElem.Xml, 'utf-8' );
	PutUrlData( 'zz_req.xml', reqStr );

	options = 'Content-type: text/xml\r\n';
	options += 'Authorization: Bearer ' + wts_global_settings.access_token + '\r\n';
	//options += 'authkey: ' + wts_global_settings.access_token;
	resp = HttpRequest( targetUrl, 'post', reqStr, options );

	respStr = DecodeCharset( resp.Body, 'utf-8' );
	PutUrlData( 'zz_resp.xml', respStr );

	respDoc = OpenDocFromStr( resp.Body, 'drop-namespaces=1' );
	
	if ( respDoc.TopElem.Name != 'Envelope' )
		throw 'Invalid SOAP response';
	
	respBody = respDoc.Envelope.Body;

	if ( respBody.ChildExists( 'Fault' ) )
	{
		throw respBody.Fault.faultstring;
	}

	if ( resp.RespCode != 200 )
		throw 'HTTP ' + resp.RespCode;

	//alert( formUrl + '   ' + argElem[0][0].Name + 'Response' );

	return respBody[0];

	//respElem = CreateElem( formUrl, argElem[0][0].Name + 'Response' );
	//respElem.AssignElem( respBody[0] );
	//return respElem;
}


function GetServiceBaseUrl()
{
	return OpenCodeLib( '//rws/rws_lib_rws_code.js' ).GetWtsServiceBaseUrl();
}


function AdjustServiceUrl( url )
{
	baseUrl = GetServiceBaseUrl();

	if ( ! IsAbsoluteUrlStr( url ) )
		return AbsoluteUrl( url, baseUrl );

	if ( StrBegins( url, 'https://estaff-online.webtutor.ru/' ) )
		url = StrReplaceOne( url, 'https://estaff-online.webtutor.ru/', baseUrl );
	else if ( StrBegins( url, 'https://online.e-staff.ru/' ) )
		url = StrReplaceOne( url, 'https://online.e-staff.ru/', baseUrl );
	else
		throw UserError( 'Service url is not allowed:' + url );

	return url;
}


function HandleAssingCandidateVideoInterviewPoll( candidate, event ) // for compatibility with old event type
{
	lib_recruit_provider.HandleAssignCandidateVideoInterview( candidate, event );
}