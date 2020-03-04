function is_telephony_enabled()
{
	return ( ArrayCount( lib_voc.get_sorted_voc( telephony_providers ) ) != 0 );
}


function Init()
{
	this.check_notif_timeout = AppServerConfig.GetOptProperty( 'check-incoming-call-timeout', 3 );
	if ( this.check_notif_timeout < 1 )
		this.check_notif_timeout = 1;

	if ( LdsIsClient )
		OnTelephonyLocalSettingsChanged();

	if ( UseLds )
		return;
	
	this.activeEntries = new Dictionary;

	if ( this.is_telephony_enabled )
		CleanPhoneCallRecordsOnStart();
}


function MakeCall( phone, baseObject, options )
{
	if ( options == undefined )
		options = new Object;

	options.SetStrictMode( false );

	last_outgoing_call_info.phone = phone;
	last_outgoing_call_info.baseObject = baseObject;
	last_outgoing_call_info.start_ticks = GetCurTicks();

	if ( global_settings.use_national_call_phone_format )
		phoneStr = lib_phone_details.PhoneToNationalPhone( phone );
	else
		phoneStr = lib_phone_details.PhoneToGlobalPhone( phone );

	if ( AppModuleUsed( 'conn_naumen' ) )
	{
		//baseObject = baseObject;
		lib_naumen.MakeCall( phoneStr );
		return;
	}

	if ( local_settings.telephony.make_outgoing_calls_via_softphone )
	{
		url = 'tel:' + phoneStr;
		ShellExecute( 'open', url );
		return;
	}

	if ( options.providerID != undefined )
		provider = GetOptForeignElem( telephony_providers, options.providerID );
	else
		provider = GetDefaultProvider( options );

	if ( provider != undefined )
	{
		MakeCallWithProvider( phone, baseObject, options, provider );
		return;
	}

	if ( base1_config.use_phone_api )
	{
		lib = GetProviderLib();
		lib.MakeCall( phoneStr );
		return;
	}
}


function GetDefaultProvider( options )
{
	providersArray = lib_voc.get_sorted_voc( telephony_providers );
	rulesArray = lib_voc.get_sorted_voc( telephony_rules );
	rulesArray = ArraySelect( rulesArray, 'telephony_provider_id.HasValue' );

	if ( rulesArray.length != 0 )
	{
		if ( LdsIsClient )
		{
			userID = lib_user.active_user_info.id;
			groupID = lib_user.active_user_info.main_group_id;
			divisionID = lib_user.active_user_person.division_id;
		}
		else
		{
			userID =  LdsCurUserID;
			user = GetForeignElem( users, user_id );

			groupID = GetForeignElem( groups, user.main_group_id ).id;
			divisionID = GetForeignElem( divisions, user.person_id.ForeignElem.division_id ).id;
		}

		if ( userID != null )
			rulesArray = ArraySelect( rulesArray, 'This.target_users.ChildNum == 0 || This.target_users.ChildByValueExists( userID )' );

		if ( groupID != null )
			rulesArray = ArraySelect( rulesArray, 'This.target_groups.ChildNum == 0 || This.target_groups.ChildByValueExists( groupID )' );

		if ( divisionID != null )
			rulesArray = ArraySelect( rulesArray, 'This.target_divisions.ChildNum == 0 || ArrayOptFind( This.target_divisions, \'lib_base.is_catalog_hier_child_or_self( divisions, divisionID, This)\') != undefined' );
	}

	if ( rulesArray.length != 0 )
	{
		rule = rulesArray[0];
		if ( options != undefined )
			options.provider_phone = rule.phone;
		provider = rule.telephony_provider_id.ForeignElem;
	}
	else
	{
		if ( providersArray.length == 0 )
			return undefined;

		provider = providersArray[0];
		if ( options != undefined && provider.phone_numbers.ChildNum != 0 )
			options.provider_phone = provider.phone_numbers[0].phone;
	}

	return provider;
}


function MakeCallWithProvider( phone, baseObject, options, provider )
{
	env = new Object;
	env.login = provider.login;
	env.password = StrStdDecrypt( provider.password_ed );
	
	if ( options.localExtension != undefined )
		env.localExtension = options.localExtension
	else
		env.localExtension = GetCurUserPhoneExtension();
	if ( env.localExtension == null )
		throw UiError( UiText.errors.cur_user_phone_extension_not_specified );

	env.remotePhone = phone;

	if ( ! provider.std_telephony_provider_id.HasValue )
	{
		eval( provider.outgoing_call_code );
		return;
	}

	if ( ! AppModuleUsed( 'conn_' + provider.std_telephony_provider_id ) )
		throw UiError( 'Integration module is not enabled' );

	if ( provider.std_telephony_provider_id.HasValue )
	{
		if ( provider.std_telephony_provider_id.ForeignElem.use_server_address && ! provider.server_address.HasValue )
			throw UiError( 'Server address has not been specified' );

		if ( provider.std_telephony_provider_id.ForeignElem.use_access_token && ! provider.access_token.HasValue )
			throw UiError( 'Access token has not been specified' );

		if ( provider.std_telephony_provider_id.ForeignElem.use_access_token_2 && ! provider.refresh_token.HasValue )
			throw UiError( 'Access token 2 has not been specified' );
	}

	lib = OpenCodeLib( '//conn_' + provider.std_telephony_provider_id + '/' + provider.std_telephony_provider_id + '_lib_' + provider.std_telephony_provider_id + '.js' );
	lib.MakeCall( env, options, provider );
}


function GetCurUserPhoneExtension()
{
	return lib_user.active_user_person.phone_extension;
}


function AcceptCall( callID )
{
	lib_naumen.AcceptCall( callID );
}


function HangUpCall( callID )
{
	lib_naumen.HangUpCall( callID );
}


function ShowCallHistory( phone )
{
	lib = GetProviderLib();
	array = lib.GetCallHistory( phone );

	viewDoc = OpenDoc( 'base1_view_phone_call_history.xml' );
	viewDoc.TopElem.entries_array_ref = array;

	CreateDocScreen( viewDoc );
}


function ShowCallRecordAudio( recordID )
{
	lib = GetProviderLib();
	lib.ShowCallRecordAudio( recordID );
}


function GetProviderLib()
{
	libUrl = AppServerConfig.GetOptProperty( 'phone-api-lib-url' );
	lib = OpenCodeLib( libUrl );
	return lib;
}


function CreateCallEntry()
{
	return CreateElem( 'base1_service_phone_api.xmd', 'service_phone_api.call_record' );
}


function CreateCallInfo()
{
	callInfo = new Object;
	callInfo.SetStrictMode( false );
	return callInfo;
}



function OnProviderCallEvent( callInfo )
{
	CleanUpActiveEntries();
	activeEntry = this.activeEntries.ObtainByKey( callInfo.eid, 'CreateActiveEntry()' );
	activeEntry.cs.Eval( 'ProcessActiveEntryCallEvent( activeEntry, callInfo )' );
}


function CleanUpActiveEntries()
{
	this.activeEntries.Delete( 'NeedDeleteActiveEntry( This )' );
}


function NeedDeleteActiveEntry( activeEntry )
{
	if ( activeEntry.phoneCallRecord != undefined && activeEntry.phoneCallRecord.is_finished && DateDiff( CurDate, activeEntry.startDate ) > 600 )
		return true;

	if ( DateDiff( CurDate, activeEntry.startDate ) > 86400 )
		return true;

	return false;
}


function CreateActiveEntry()
{
	//LogEvent( 'xhttp', '!!! CreateActiveEntry()' );
	activeEntry = new SafeObject;
	activeEntry.cs = new CriticalSection;
	activeEntry.callInfo = undefined;
	activeEntry.bindCompleted = false;
	return activeEntry;
}


function ProcessActiveEntryCallEvent( activeEntry, callInfo )
{
	//LogEvent( 'xhttp', 'callInfo.direction=' + callInfo.direction );
	if ( activeEntry.callInfo == undefined )
	{
		activeEntry.callInfo = callInfo;
		activeEntry.eid = callInfo.eid;
		activeEntry.startDate = CurDate;

		activeEntry.phoneCallRecordDoc = DefaultDb.OpenNewObjectDoc( 'phone_call_record' );
		activeEntry.phoneCallRecord = activeEntry.phoneCallRecordDoc.TopElem;
		activeEntry.phoneCallRecord.ReadOnly = false;

		activeEntry.phoneCallRecord.eid = callInfo.eid;
		
		if ( callInfo.date != undefined )
			activeEntry.phoneCallRecord.date = callInfo.date;
		
		activeEntry.phoneCallRecord.direction = callInfo.direction;
		
		activeEntry.bindCompleted = false;
	}
	else
	{
		if ( callInfo.isRecordingOnlyNotification == true && activeEntry.phoneCallRecord.recording_eid.HasValue )
		{
			//LogEvent( '', activeEntry.phoneCallRecord.recording_eid );
			return undefined;
		}

		if ( activeEntry.callInfo.segmentEid == callInfo.segmentEid && activeEntry.callInfo.seqNo > callInfo.seqNo )
		{
			//LogEvent( '', activeEntry.callInfo.seqNo + '--' + callInfo.seqNo );
			return undefined;
		}

		if ( callInfo.direction != undefined )
			activeEntry.phoneCallRecord.direction = callInfo.direction;

		activeEntry.callInfo.segmentEid = callInfo.segmentEid;
		activeEntry.callInfo.seqNo = callInfo.seqNo;
	}

	if ( callInfo.srcPhoneNumber != undefined )
		activeEntry.phoneCallRecord.src_phone_number = AdjustPhoneNumber( callInfo.srcPhoneNumber );

	if ( callInfo.srcPhoneExtension != undefined )
		activeEntry.phoneCallRecord.src_phone_extension = callInfo.srcPhoneExtension;
		
	if ( callInfo.destPhoneNumber != undefined )
		activeEntry.phoneCallRecord.dest_phone_number = AdjustPhoneNumber( callInfo.destPhoneNumber );

	if ( callInfo.destPhoneExtension != undefined )
		activeEntry.phoneCallRecord.dest_phone_extension = callInfo.destPhoneExtension;

	if ( callInfo.stateID != undefined )
	{
		if ( callInfo.stateID == 'finished' )
			activeEntry.phoneCallRecord.state_id = ( activeEntry.phoneCallRecord.talk_start_date.HasValue ? 'succeeded' : 'failed' );
		else
			activeEntry.phoneCallRecord.state_id = callInfo.stateID;
	}
	
	if ( callInfo.failureReasonID != undefined )
		activeEntry.phoneCallRecord.failure_reason_id = callInfo.failureReasonID;
	
	if ( callInfo.startDate != undefined )
		activeEntry.phoneCallRecord.date = callInfo.startDate;

	if ( callInfo.talkStartDate != undefined )
		activeEntry.phoneCallRecord.talk_start_date = callInfo.talkStartDate;

	if ( callInfo.endDate != undefined )
		activeEntry.phoneCallRecord.end_date = callInfo.endDate;

	if ( activeEntry.phoneCallRecord.state_id == 'connected' && ! activeEntry.phoneCallRecord.talk_start_date.HasValue )
		activeEntry.phoneCallRecord.talk_start_date = CurDate;
	else if ( ( activeEntry.phoneCallRecord.state_id == 'succeeded' || activeEntry.phoneCallRecord.state_id == 'failed' ) && ! activeEntry.phoneCallRecord.end_date.HasValue )
		activeEntry.phoneCallRecord.end_date = CurDate;

	if ( ! activeEntry.phoneCallRecord.date.HasValue )
		activeEntry.phoneCallRecord.date = CurDate;

	if ( callInfo.recordingID != undefined )
		activeEntry.phoneCallRecord.recording_eid = callInfo.recordingID;

	if ( callInfo.callerData != undefined )
	{
		if ( callInfo.callerData.GetOptProperty( 'lastname' ) != undefined )
			activeEntry.phoneCallRecord.src_person_data.lastname = callInfo.callerData.lastname;

		if ( callInfo.callerData.GetOptProperty( 'firstname' ) != undefined )
			activeEntry.phoneCallRecord.src_person_data.firstname = callInfo.callerData.firstname;

		if ( callInfo.callerData.GetOptProperty( 'middlename' ) != undefined )
			activeEntry.phoneCallRecord.src_person_data.middlename = callInfo.callerData.middlename;

		if ( callInfo.callerData.GetOptProperty( 'inet_uid' ) != undefined )
			activeEntry.phoneCallRecord.src_person_data.inet_uid = callInfo.callerData.inet_uid;

		if ( callInfo.callerData.GetOptProperty( 'talk_transcript' ) != undefined )
			activeEntry.phoneCallRecord.src_person_data.talk_transcript = callInfo.callerData.talk_transcript;

		if ( callInfo.callerData.GetOptProperty( 'talk_recording_url' ) != undefined )
			activeEntry.phoneCallRecord.src_person_data.talk_recording_url = callInfo.callerData.talk_recording_url;

		if ( callInfo.callerData.GetOptProperty( 'dest_candidate_state_id' ) != undefined )
			activeEntry.phoneCallRecord.src_person_data.dest_candidate_state_id = callInfo.callerData.dest_candidate_state_id;
	}

	if ( ! activeEntry.bindCompleted )
		BindActiveEntry( activeEntry );

	FlushActiveEntry( activeEntry );
	return activeEntry;
}


function FlushActiveEntry( activeEntry )
{
	UpdatePhoneCallRecordTimes( activeEntry.phoneCallRecord );

	activeEntry.phoneCallRecordDoc.Save();
	//activeEntry.isChanged = false;
}


function BindActiveEntry( activeEntry )
{
	if ( activeEntry.phoneCallRecord.src_phone_extension.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, activeEntry.phoneCallRecord.src_phone_extension, 'phone_extension' );
		if ( person != undefined )
		{
			activeEntry.phoneCallRecord.src_person_id = person.id;
			user = ArrayOptFindByKey( users, person.id, 'person_id' );
			if ( user != undefined )
				activeEntry.phoneCallRecord.user_id = user.id;
		}
	}
	else if ( activeEntry.phoneCallRecord.src_phone_number.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, activeEntry.phoneCallRecord.src_phone_number, 'mobile_phone' );
		if ( person != undefined )
			activeEntry.phoneCallRecord.src_person_id = person.id;
	}

	if ( activeEntry.phoneCallRecord.dest_phone_extension.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, activeEntry.phoneCallRecord.dest_phone_extension, 'phone_extension' );
		if ( person != undefined )
		{
			activeEntry.phoneCallRecord.dest_person_id = person.id;
			user = ArrayOptFindByKey( users, person.id, 'person_id' );
			if ( user != undefined && ! activeEntry.phoneCallRecord.user_id.HasValue )
				activeEntry.phoneCallRecord.user_id = user.id;
		}
	}
	else if ( activeEntry.phoneCallRecord.dest_phone_number.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, activeEntry.phoneCallRecord.dest_phone_number, 'mobile_phone' );
		if ( person != undefined )
			activeEntry.phoneCallRecord.dest_person_id = person.id;
	}

	activeEntry.bindCompleted = true;
}


function HandleListenPhoneCallRecording( phoneCallRecord )
{
	provider = ArrayOptFirstElem( lib_voc.get_sorted_voc( telephony_providers ) );
	if ( provider == undefined )
		throw UiError( 'Telephony provider not found' );

	if ( provider.std_telephony_provider_id.HasValue )
	{
		lib = OpenCodeLib( 'x-app://conn_' + provider.std_telephony_provider_id + '/' + provider.std_telephony_provider_id + '_lib_' + provider.std_telephony_provider_id + '.js' );

		if ( provider.std_telephony_provider_id == 'mango' )
		{
			respObj = lib.GetCallRecording( phoneCallRecord.eid, phoneCallRecord.recording_eid, provider );
		}
		else if ( provider.std_telephony_provider_id == 'govorit' )
		{
			ShellExecute( 'open', phoneCallRecord.recording_eid );
			return;
		}
		else
		{
			respObj = lib.GetCallRecording( phoneCallRecord.eid, phoneCallRecord.recording_eid, provider );
		}
	}
	else
	{
		if ( ! provider.recording_retrieval_code.HasValue )
			throw UiError( 'No script for call recording retrieval has been specified' );
		
		call = new Object;
		call.SetStrictMode( false );
		call.callID = phoneCallRecord.eid;
		call.recordingID = phoneCallRecord.recording_eid;

		respObj = eval( provider.recording_retrieval_code );
	}

	if ( respObj == undefined )
		Cancel();

	if ( DataType( respObj ) != 'object' )
		throw UiError( 'Provider returned value which is not an object' );

	if ( respObj.GetOptProperty( 'url' ) != undefined )
	{
		ShellExecute( 'open', respObj.url );
	}
	else if ( respObj.GetOptProperty( 'data' ) != undefined )
	{
		fileNameSuffix = respObj.GetOptProperty( 'fileNameSuffix', '.mp3' );

		tempFileUrl = ObtainSessionTempFile( fileNameSuffix );
		PutUrlData( tempFileUrl, respObj.data );

		ShellExecute( 'open', tempFileUrl );
	}
	else
	{
		throw UiError( 'Provider returned neither "url" nor "data" property' );
	}
}


function AdjustPhoneNumber( phoneNumber )
{
	formalPhone = lib_phone_details.GetOptFormalPhone( phoneNumber );
	if ( formalPhone == undefined )
		return '';

	return formalPhone;
}


function OnCallStarted( callID, callUid, phone, isIncoming )
{
	if ( ! isIncoming && ! last_outgoing_call_info.phone.HasValue )
		return;

	//DebugMsg( last_outgoing_call_info.phone );

	activeCall = active_calls.ObtainChildByKey( '' + callID );
	activeCall.uid = callUid;
	activeCall.is_incoming = isIncoming;
	activeCall.phone = phone;
	activeCall.start_ticks = GetCurTicks();

	if ( ! isIncoming && last_outgoing_call_info.phone.HasValue )
	{
		activeCall.baseObject = last_outgoing_call_info.baseObject;
		last_outgoing_call_info.Clear();
	}
	
	panel = GetTelephonyPanel();
	panel.SetActiveCall( activeCall );
}


function OnCallConnected( callID )
{
	activeCall = active_calls.GetOptChildByKey( '' + callID );
	if ( activeCall == undefined )
		return;

	activeCall.is_connected = true;
	activeCall.conn_start_ticks = GetCurTicks();

	panel = GetTelephonyPanel();
	panel.Update();
}


function OnCallFailed( callID )
{
	activeCall = active_calls.GetOptChildByKey( '' + callID );
	if ( activeCall == undefined )
		return;

	if ( ! activeCall.is_incoming && activeCall.baseObject != undefined && activeCall.baseObject.Name == 'candidate' )
		RegisterFailedOutgoingCallEvent( activeCall.baseObject );

	panel = GetTelephonyPanel();
	panel.DeleteActiveCall( activeCall );

	activeCall.is_ended = true;
	activeCall.Delete();
}


function OnCallEnded( callID )
{
	activeCall = active_calls.GetOptChildByKey( '' + callID );
	if ( activeCall == undefined )
		return;

	if ( activeCall.baseObject != undefined && activeCall.baseObject.Name == 'candidate' )
	{
		if ( activeCall.is_incoming )
			RegisterIncomingCallEvent( activeCall.baseObject, activeCall );
		else
			RegisterOutgoingCallEvent( activeCall.baseObject, activeCall );
	}

	panel = GetTelephonyPanel();
	panel.DeleteActiveCall( activeCall );

	activeCall.is_ended = true;
	activeCall.Delete();
}


function RegisterOutgoingCallEvent( candidate, activeCall )
{
	eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
	event = eventDoc.TopElem;

	event.date = CurDate;
	event.type_id = 'outgoing_phone_call';
	event.occurrence_id = '';
	event.candidate_id = candidate.id;
	event.vacancy_id = candidate.main_vacancy_id;
	event.eid = activeCall.uid;

	event.handle_before_ui_save();
	eventDoc.Save();
}


function RegisterFailedOutgoingCallEvent( candidate )
{
	eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
	event = eventDoc.TopElem;

	event.date = CurDate;
	event.type_id = 'outgoing_phone_call';
	event.occurrence_id = 'failed';
	event.candidate_id = candidate.id;
	event.vacancy_id = candidate.main_vacancy_id;

	event.handle_before_ui_save();
	eventDoc.Save();
}


function RegisterIncomingCallEvent( candidate, activeCall )
{
	eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
	event = eventDoc.TopElem;

	event.date = CurDate;
	event.type_id = 'incoming_phone_call';
	event.occurrence_id = '';
	event.candidate_id = candidate.id;
	event.vacancy_id = candidate.main_vacancy_id;
	event.eid = activeCall.uid;

	event.handle_before_ui_save();
	eventDoc.Save();
}


function GetTelephonyPanel()
{
	return FetchDoc( 'base1_telephony_panel.xml' ).TopElem;
}


function GetTelephonyPanel2()
{
	return FetchDoc( 'base1_telephony_panel_2.xml' ).TopElem;
}



function OpenPhoneCallRecords()
{
	if ( ! lib_telephony.is_telephony_enabled )
		return;

	ActiveScreen.Navigate( '//base2/base2_view_phone_call_records.xml', 'FramePhoneCallRecords' );
}


function GetPhoneCallRecordRelativeDirection( phoneCallRecord )
{
	if ( phoneCallRecord.direction != 0 )
		return phoneCallRecord.direction;

	if ( phoneCallRecord.src_phone_extension == GetCurUserPhoneExtension() )
		return 2;
	else if ( phoneCallRecord.dest_phone_extension == GetCurUserPhoneExtension() )
		return 1;
	else
		return 0;
}


function UpdatePhoneCallRecordTimes( phoneCallRecord )
{
	if ( ! phoneCallRecord.date.HasValue )
		return;

	if ( phoneCallRecord.talk_start_date.HasValue && phoneCallRecord.talk_start_date >= phoneCallRecord.date )
		phoneCallRecord.wait_seconds = DateDiff( phoneCallRecord.talk_start_date, phoneCallRecord.date );
	else if ( phoneCallRecord.end_date.HasValue && phoneCallRecord.end_date >= phoneCallRecord.date )
		phoneCallRecord.wait_seconds = DateDiff( phoneCallRecord.end_date, phoneCallRecord.date );

	if ( phoneCallRecord.talk_start_date.HasValue && phoneCallRecord.end_date.HasValue && phoneCallRecord.end_date >= phoneCallRecord.talk_start_date )
		phoneCallRecord.talk_seconds = DateDiff( phoneCallRecord.end_date, phoneCallRecord.talk_start_date );
}


function DurationDesc( seconds )
{
	if ( seconds == null )
		return '';

	minutes = seconds / 60;
	seconds = seconds % 60;
	
	str = StrInt( minutes );
	str += ':' + StrInt( seconds, 2 );

	return str ;
}


function GetPhoneExtensioTextColor( phoneExtension )
{
	if ( phoneExtension != '' && phoneExtension == GetCurUserPhoneExtension() )
		return '0,60,120';
	
	return '';
}


function CleanPhoneCallRecordsOnStart()
{
	queryStr = 'for $elem in phone_call_records';
	queryStr += ' where $elem/is_active = true()';
	queryStr += ' and $elem/date >= ' + XQueryLiteral( DateOffset( CurDate, 0 - 30 * 86400 ) );
	queryStr += ' return $elem/Fields( "id" )';

	array = XQuery( queryStr );

	for ( phoneCallRecord in ArraySelectAll( array ) )
	{
		phoneCallRecordDoc = OpenDoc( phoneCallRecord.ObjectUrl );
		phoneCallRecord = phoneCallRecordDoc.TopElem;

		if ( phoneCallRecord.state_id == 'connected' )
			phoneCallRecord.state_id = 'succeeded';
		else
			phoneCallRecord.state_id = '';
		
		phoneCallRecordDoc.Save();
	}
}


function OnWebRequest( Request )
{
	if ( ( obj = StrOptScan( Request.UrlPath, '/telephony/std/call' ) ) != undefined )
	{
		OnWebRequesStdCall( Request );
	}
	else if ( ( obj = StrOptScan( Request.UrlPath, '/telephony/%s/%*s' ) ) != undefined )
	{
		stdProvider = base1_common.std_telephony_providers.GetOptChildByKey( obj[0] );
		if ( stdProvider == undefined )
			throw UserError( 'Unknown standard telephony provider: ' + obj[0] );
		
		provider = ArrayOptFindByKey( lib_voc.get_sorted_voc( telephony_providers ), stdProvider.id, 'std_telephony_provider_id' );
		if ( provider == undefined )
			throw 'Telephony provider is not registered';
		
		lib = OpenCodeLib( 'x-app://conn_' + stdProvider.id + '/' + stdProvider.id + '_lib_' + stdProvider.id + '.js' );
		if ( lib.OnWebRequest( Request, provider ) )
			Cancel();
	}
	else
		return false;

	return true;
}



function OnWebRequesStdCall( Request )
{
	provider = ArrayOptFirstElem( lib_voc.get_sorted_voc( telephony_providers ) );
	if ( provider == undefined )
		throw 'Provider is not registered';
		
	EnableLog( 'telephony', true );
	//LogEvent( 'telephony', Request.Url );
	LogEvent( 'telephony', Request.Body );

	accessToken = AppConfig.GetOptProperty( 'telephony-access_token' );
	if ( accessToken != undefined )
	{
		if ( UrlQuery( Request.Url ).api_key != accessToken )
			throw 'API key mismatch';
	}

	if ( Request.Method != 'POST' )
		throw UiError( 'Invalid request method ' );

	if ( Request.Header.GetOptProperty( 'Content-Type' ) != 'application/json' )
		throw UiError( 'Content-Type must be "application/json"' );

	Request.UseJsonFault = true;
	reqArg = ParseJson( DecodeCharset( Request.Body, 'utf-8' ) );

	callInfo = lib_telephony.CreateCallInfo();
	callInfo.eid = reqArg.callID;
	callInfo.direction = reqArg.direction;

	callInfo.srcPhoneNumber = reqArg.GetOptProperty( 'fromPhone' );
	if ( callInfo.srcPhoneNumber == null )
		callInfo.srcPhoneNumber = undefined;

	callInfo.srcPhoneExtension = reqArg.GetOptProperty( 'fromExtension' );
	if ( callInfo.srcPhoneExtension == null )
		callInfo.srcPhoneExtension = undefined;

	callInfo.destPhoneNumber = reqArg.GetOptProperty( 'toPhone' );
	if ( callInfo.destPhoneNumber == null )
		callInfo.destPhoneNumber = undefined;

	callInfo.destPhoneExtension = reqArg.GetOptProperty( 'toExtension' );
	if ( callInfo.destPhoneNumber == null )
		callInfo.destPhoneNumber = undefined;

	if ( reqArg.HasProperty( 'startTime' ) )
		callInfo.startDate = RawSecondsToDate( Int( Real(reqArg.startTime) ) );

	if ( reqArg.HasProperty( 'talkStartTime' ) )
		callInfo.talkStartDate = RawSecondsToDate( Int( Real(reqArg.talkStartTime) ) );

	if ( reqArg.HasProperty( 'endTime' ) )
		callInfo.endDate = RawSecondsToDate( Int( Real(reqArg.endTime ) ) );

	callInfo.stateID = reqArg.GetOptProperty( 'state' );
	callInfo.failureReasonID = reqArg.GetOptProperty( 'failureReason' );

	callInfo.callerData = reqArg.GetOptProperty( 'callerData' );

	lib_telephony.OnProviderCallEvent( callInfo );
	
	Request.SetRespStatus( 200, 'OK' );
	return true;
}


function OnTelephonyLocalSettingsChanged()
{
	if ( System.IsWebClient )
		return;

	if ( local_settings.telephony.display_panel_on_incoming_call && GetCurUserPhoneExtension() != null )
	{
		if ( this.task == undefined )
			StartTask();
	}
	else
	{
		if ( this.task != undefined )
			KillTask();
	}
}


function StartTask()
{
	this.task = new Thread;
	this.task.EvalCode( 'lib_telephony.TaskProc()' );
}


function KillTask()
{
	this.task.Kill();
	this.task = undefined;
}


function TaskProc()
{
	while ( true )
	{
		phoneCallRecord = CallServerMethod( 'lib_telephony', 'CheckActiveIncomingCall', [GetCurUserPhoneExtension()] );
		if ( phoneCallRecord != undefined )
		{
			EvalAsync( 'lib_telephony.OnIncomingCallDetected( phoneCallRecord )', 'phoneCallRecord', phoneCallRecord );
		}
		
		Sleep( this.check_notif_timeout * 1000 );
	}
}


function OnIncomingCallDetected( phoneCallRecord )
{
	telephonyPanel = GetTelephonyPanel2();

	if ( telephonyPanel.OptScreen == undefined && ( phoneCallRecord.state_id == 'succeeded' || phoneCallRecord.state_id == 'failed' || phoneCallRecord.state_id == 'connected' ) )
		return;

	if ( telephonyPanel.curPhoneCallRecord == undefined || telephonyPanel.curPhoneCallRecord.eid != phoneCallRecord.eid )
	{
		telephonyPanel.curPhoneCallRecord = phoneCallRecord;
		telephonyPanel.Display();
	}
	else if ( telephonyPanel.OptScreen != undefined && telephonyPanel.curPhoneCallRecord.state_id != phoneCallRecord.state_id )
	{
		telephonyPanel.curPhoneCallRecord = phoneCallRecord;
		telephonyPanel.Update();
	}
}




"META:ALLOW-CALL-FROM-CLIENT:1";
function CheckActiveIncomingCall( phoneExtension )
{
	array = this.activeEntries.SelectAll();
	//LogEvent( '',	'array: ' + ArrayCount( array ) );

	array = ArraySelect( array, 'phoneCallRecord != undefined && phoneCallRecord.direction == 1 && phoneCallRecord.dest_phone_extension == phoneExtension' );
	array = ArraySort( array, 'phoneCallRecord.date', '-' );

	activeEntry = ArrayOptFirstElem( array );
	if ( activeEntry == undefined || activeEntry.phoneCallRecord == undefined )
		return undefined;

	//if ( activeEntry.phoneCallRecord.state_id == 'succeeded' || activeEntry.phoneCallRecord.state_id == 'failed' )
		//return undefined;

	return activeEntry.phoneCallRecord.Clone();
}




