function Init()
{
	if ( ! UseLds )
		AdjustStdProviders();
}


function AdjustStdProviders()
{
	for ( provider in lib_voc.get_sorted_voc( recruit_providers ) )
	{
		if ( ! provider.std_provider_id.HasValue )
			continue;

		stdProvider = provider.std_provider_id.OptForeignElem;
		if ( stdProvider == undefined )
			continue;
		provider1 = provider.Clone();
		provider1.id = stdProvider.id;
		if ( provider1.EqualToElem( stdProvider ) )
			continue;

		//DebugMsg( provider.Xml + '\r\n' + stdProvider.Xml );
		providerDoc = OpenDoc( provider.ObjectUrl );
		providerDoc.TopElem.AssignElem( stdProvider );
		//DebugMsg( provider.Xml + '\r\n' + stdProvider.Xml );
		providerDoc.Save();
	}
}


function HandleAddNewStdRecruitProvider()
{
	stdProvider = lib_base.select_elem( rcr_common.std_recruit_providers );
	if ( ArrayOptFindByKey( recruit_providers, stdProvider.id ) != undefined )
		throw UiError( UiText.errors.provider_aleady_exists );

	providerDoc = DefaultDb.OpenNewObjectDoc( 'recruit_provider', stdProvider.id );
	provider = providerDoc.TopElem;
	
	if ( stdProvider.id != 'wts' )
		provider.AssignElem( stdProvider );
	else
		provider.name = stdProvider.name;

	provider.std_provider_id = stdProvider.id;
	CreateDocScreen( providerDoc );
}


function HandleOpenStdRecruitProvider( providerID )
{
	if ( ArrayOptFindByKey( recruit_providers, providerID ) != undefined )
	{
		ObtainDocScreen( ObjectDocUrl( 'data', 'recruit_provider', providerID ) );
		return;
	}

	stdProvider = rcr_common.std_recruit_providers.GetChildByKey( providerID );

	providerDoc = DefaultDb.OpenNewObjectDoc( 'recruit_provider', providerID );
	provider = providerDoc.TopElem;

	provider.AssignElem( stdProvider );

	provider.std_provider_id = stdProvider.id;
	CreateDocScreen( providerDoc );
}


function HandleCheckProvider( provider )
{
	if ( provider.Doc.IsChanged || provider.Doc.NeverSaved )
		provider.Screen.SaveDoc();

	CallServerMethod( this.Name, 'CheckProviderCore', [provider.id, ObtainAccountID( provider )] );
	
	msgStr = UiText.messages.checking_successful;
	lib_base.show_info_message( ActiveScreen, msgStr );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function CheckProviderCore( providerID, accountID )
{
	provider = GetForeignElem( recruit_providers, providerID );
	account = ( accountID != undefined ? GetForeignElem( external_accounts, accountID ) : undefined );
	
	lib = GetProviderLib( provider );
	lib.CheckProvider( provider, account );
}


function HandleCheckAccount( account )
{
	if ( ! account.recruit_provider_id.HasValue )
		throw UiError( UiText.errors.field_is_empty + ': ' + account.recruit_provider_id.Title );

	if ( account.Doc.IsChanged )
		account.Screen.SaveDoc();

	provider = account.recruit_provider_id.ForeignElem;

	respInfo = CallServerMethod( this.Name, 'CheckAccountCore', [provider.id, account.id] );
	
	msgStr = UiText.messages.checking_successful;
	lib_base.show_info_message( ActiveScreen, msgStr );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function CheckAccountCore( providerID, accountID )
{
	provider = GetForeignElem( recruit_providers, providerID );
	account = GetForeignElem( external_accounts, accountID );
	
	lib = GetProviderLib( provider );
	return lib.CheckAccount( provider, account );
}


function HandleRequestAppAccess( account )
{
	if ( ! account.recruit_provider_id.HasValue )
		throw UiError( UiText.errors.field_is_empty + ': ' + account.recruit_provider_id.Title );

	if ( account.Doc.IsChanged )
		account.Screen.SaveDoc();

	provider = account.recruit_provider_id.ForeignElem;
	
	respInfo = CallServerMethod( this.Name, 'RequestAppAccessCore', [provider.id, account.id] );
	if ( respInfo != undefined && respInfo.GetOptProperty( 'url' ) != undefined )
		ShellExecute( 'open', respInfo.url );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function RequestAppAccessCore( providerID, accountID )
{
	provider = GetForeignElem( recruit_providers, providerID );
	account = ( accountID != undefined ? GetForeignElem( external_accounts, accountID ) : undefined );
	
	lib = GetProviderLib( provider );
	return lib.RequestAppAccess( provider, account );
}


function ExternalVacanciesEnabled()
{
	provider = GetDefaultProvider( 'video_interview' );
	if ( provider == undefined || ! provider.std_provider_id.HasValue )
		return false;

	return provider.use_external_vacancies;
}


function HandleLoadProviderExternalVacancies( provider )
{
	if ( provider.Doc.IsChanged )
		provider.Screen.SaveDoc();

	LoadProviderExternalVacancies( provider );
}


function HandleLoadAllExternalVacancies()
{
	provider = GetDefaultProvider( 'video_interview' );
	if ( provider == undefined || ! provider.std_provider_id.HasValue || ! provider.std_provider_id.ForeignElem.use_external_vacancies )
		return;

	CallServerMethod( 'lib_recruit_provider', 'LoadProviderExternalVacanciesCore', [provider.id] );
	DropXQueryCache( ObjectDocUrl( 'data', 'external_vacancy', 1 ) );
}


function OnBeforeExternalVacancySelect()
{
	HandleLoadAllExternalVacancies();
}


function LoadProviderExternalVacancies( provider )
{
	CallServerMethod( 'lib_recruit_provider', 'LoadProviderExternalVacanciesCore', [provider.id] );
	DropXQueryCache( ObjectDocUrl( 'data', 'external_vacancy', 1 ) );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function LoadProviderExternalVacanciesCore( providerID )
{
	provider = GetForeignElem( recruit_providers, providerID );
	lib = GetProviderLib( provider );
	
	srcVacancies = lib.GetVacancies( provider );
	for ( srcVacancy in srcVacancies )
	{
		if ( srcVacancy.id == null || srcVacancy.id == '' )
			throw UserError( 'Empty external vacancy id' );

		uid = provider.std_provider_id + ':' + srcVacancy.id;
		
		curExternalVacancy = ArrayOptFirstElem( XQuery( 'for $elem in external_vacancies where $elem/uid = ' + XQueryLiteral( uid ) + ' return $elem' ) );
		if ( curExternalVacancy != undefined )
		{
			externalVacancy = curExternalVacancy.Clone();
		}
		else
		{
			externalVacancyDoc = DefaultDb.OpenNewObjectDoc( 'external_vacancy' );
			externalVacancy = externalVacancyDoc.TopElem;
		}

		externalVacancy.name = srcVacancy.name;
		externalVacancy.recruit_provider_id = provider.id;
		externalVacancy.recruit_provider_eid = provider.std_provider_id;
		externalVacancy.eid = srcVacancy.id;
		externalVacancy.uid = uid;

		if ( curExternalVacancy != undefined )
		{
			if ( curExternalVacancy.EqualToElem( externalVacancy ) )
				continue;

			//DebugMsg( curExternalVacancy.Xml + '\r\n\r\n' + externalVacancy.Xml );
			externalVacancyDoc = OpenDoc( curExternalVacancy.ObjectUrl );
			externalVacancyDoc.TopElem.AssignElem( externalVacancy );
		}

		externalVacancyDoc.Save();
	}
}


function HandleLoadProviderExternalTests( provider )
{
	if ( provider.Doc.IsChanged )
		provider.Screen.SaveDoc();

	LoadExternalTests( provider, undefined );
	lib_base.show_info_message( ActiveScreen, UiText.messages.operation_completed_successfully );
}


function LoadExternalTests( provider )
{
	CallServerMethod( 'lib_recruit_provider', 'LoadProviderExternalTestsCore', [provider.id] );
	DropXQueryCache( ObjectDocUrl( 'data', 'external_test', 1 ) );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function LoadProviderExternalTestsCore( providerID )
{
	provider = GetForeignElem( recruit_providers, providerID );
	testingSystem = provider.ObtainTestingSystem();
	account = ObtainAccount( provider );

	lib = GetProviderLib( provider );
	
	srcTests = lib.GetTests( provider, account, testingSystem );
	for ( srcTest in srcTests )
	{
		if ( srcTest.id == null || srcTest.id == '' )
			throw UserError( 'Empty external test id' );

		uid = provider.std_provider_id + ':' + srcTest.id;

		curExternalTest = ArrayOptFirstElem( XQuery( 'for $elem in external_tests where $elem/id = ' + XQueryLiteral( uid ) + ' return $elem' ) );
		if ( curExternalTest != undefined )
		{
			externalTest = curExternalTest.Clone();
		}
		else
		{
			externalTestDoc = DefaultDb.OpenNewObjectDoc( 'external_test', uid );
			externalTest = externalTestDoc.TopElem;
			externalTest.order_index = lib_voc.obtain_next_voc_elem_order_index( external_tests );
		}

		externalTest.eid = srcTest.id;
		externalTest.name = srcTest.name;
		externalTest.testing_system_id = testingSystem.id;

		if ( curExternalTest != undefined )
		{
			if ( curExternalTest.EqualToElem( externalTest ) )
				continue;

			//DebugMsg( curExternalTest.Xml + '\r\n\r\n' + externalTest.Xml );
			externalTestDoc = OpenDoc( curExternalTest.ObjectUrl );
			externalTestDoc.TopElem.AssignElem( externalTest );
		}

		externalTestDoc.Save();
	}
}


function HandleRegisterCandidateForSubsequentTesting( provider, testing )
{
	candidate = GetForeignElem( candidates, testing.candidate_id );
	externalRegistration = candidate.external_registrations.GetOptChildByKey( provider.id );
	if ( externalRegistration != undefined )
		lib_base.ask_warning_to_continue( ActiveScreen, lib_base.BuildUiParamEntry( UiText.messages.candidate_already_registered_in_xxx, provider.name ) );

	if ( testing.Doc.IsChanged || testing.Doc.NeverSaved )
		testing.Screen.SaveDoc();

	ObtainAccount( provider );
	respInfo = CallServerMethod( 'lib_recruit_provider', 'RegisterCandidateForSubsequentTestingCore', [provider.id, testing.candidate_id, testing.id] );

	if ( respInfo.externalRegistrationEid != undefined )
	{
		candidateDoc = ObtainUiDoc( testing.candidate_id.ForeignObjectUrl );
		externalRegistration = candidateDoc.TopElem.external_registrations.ObtainChildByKey( provider.id );
		externalRegistration.eid = respInfo.externalRegistrationEid;

		if ( candidateDoc.TopElem.OptScreen != undefined )
			candidateDoc.TopElem.OptScreen.SaveDoc();
		else
			candidateDoc.Save();
	}

	lib_base.show_info_message( ActiveScreen, UiText.messages.operation_completed_successfully );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function RegisterCandidateForSubsequentTestingCore( providerID, candidateID, testingID )
{
	provider = GetForeignElem( recruit_providers, providerID );
	testingSystem = undefined;
	account = ObtainAccount( provider );

	candidate = GetForeignElem( candidates, candidateID );
	testing = GetForeignElem( testings, testingID );

	personEid = RegisterCandidate( provider, testingSystem, candidate, testing );

	lib = GetProviderLib( provider );
	lib.EnablePersonSubsequentTesting( provider, account, personEid, candidate, testing );

	respInfo = new Object;
	respInfo.externalRegistrationEid = personEid;
	return respInfo;
}


function ActivateTesting( testingSystem, testing, assignedTestsArray )
{
	if ( testing.Doc.IsChanged || testing.Doc.NeverSaved )
		testing.Screen.SaveDoc();

	provider = testingSystem.recruit_provider_id.ForeignElem;
	ObtainAccount( provider );

	respInfo = CallServerMethod( 'lib_recruit_provider', 'ActivateTestingCore', [testingSystem.recruit_provider_id, testing.id] );
	respInfo.SetStrictMode( false );
	
	if ( testing.OptScreen != undefined )
	{
		testing.AssignElem( OpenDoc( testing.ObjectUrl ).TopElem );
		testing.Doc.SetChanged( true );

		assignedTestsArray = ArraySelect( testing.assigned_tests, 'ArrayOptFindByKey( assignedTestsArray, This.external_test_id, \'external_test_id\' ) != undefined' );
	}
	
	if ( respInfo.externalRegistrationEid != undefined )
	{
		candidateDoc = ObtainUiDoc( testing.candidate_id.ForeignObjectUrl );
		externalRegistration = candidateDoc.TopElem.external_registrations.ObtainChildByKey( testingSystem.id );
		externalRegistration.eid = respInfo.externalRegistrationEid;

		if ( candidateDoc.TopElem.OptScreen != undefined )
			candidateDoc.TopElem.OptScreen.SaveDoc();
		else
			candidateDoc.Save();
	}

	if ( ! provider.has_own_testing_notif )
		SendPersonTestingNotif( testingSystem, testing, assignedTestsArray );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function ActivateTestingCore( providerID, testingID )
{
	provider = GetForeignElem( recruit_providers, providerID );
	testingSystem = provider.ObtainTestingSystem();
	account = ObtainAccount( provider );

	testingDoc = DefaultDb.OpenObjectDoc( 'testing', testingID );
	testing = testingDoc.TopElem;

	candidate = testing.candidate_id.ForeignElem;

	respInfo = new Object;
	respInfo.SetStrictMode( false );
	
	externalRegistration = candidate.external_registrations.GetOptChildByKey( testingSystem.id );
	if ( externalRegistration != undefined )
	{
		eid = externalRegistration.eid;
	}
	else
	{
		eid = RegisterCandidate( provider, testingSystem, candidate, testing );
		respInfo.externalRegistrationEid = eid;
	}

	for ( assignedTest in testing.assigned_tests )
	{
		externalTest = assignedTest.external_test_id.ForeignElem;
		if ( externalTest.testing_system_id != testingSystem.id )
			continue;

		respElem = AssignTestToPerson( provider, eid, candidate, externalTest.eid, testing );

		assignedTest.eid = respElem.assigned_test_eid;
		assignedTest.uid = testingSystem.id + ':' + assignedTest.eid;
		//assignedTest.activation_code = respElem.code;
		assignedTest.url = respElem.start_url;
	}

	testing.person_eid = eid;
	testingDoc.Save();

	lib_agent.EnsureAgentHasSchedule( 'check_external_event_states', {unit_id:'minute',length:15} );
	return respInfo;
}


function RegisterCandidate( provider, testingSystem, candidate, testing )
{
	lib = GetProviderLib( provider );
	account = ObtainAccount( provider );
	
	respInfo = lib.RegisterPerson( provider, account, candidate );
	personEid = respInfo.eid;
	return personEid;
}


function AssignTestToPerson( provider, personEid, person, externalTestEid, testing )
{
	lib = GetProviderLib( provider );
	account = ObtainAccount( provider );
	
	respInfo = lib.AssignTestToPerson( provider, account, personEid, person, externalTestEid, testing );
	
	destInfo = new Object;
	destInfo.assigned_test_eid = respInfo.assigned_test_eid;
	destInfo.start_url = respInfo.start_url;

	return destInfo;
}


function SendPersonTestingNotif( testingSystem, testing, assignedTestsArray )
{
	person = testing.candidate_id.ForeignElem;
	email = person.email;
	mailTemplate = GetOptForeignElem( mail_templates, 'testing_link' );
	if ( mailTemplate == undefined )
		throw UiError( 'Mail template is not found: ' + 'testing_link' );

	otherEnv = new Object;
	otherEnv.candidate = person;
	otherEnv.testing = testing;

	if ( testing.vacancy_id.HasValue )
		otherEnv.vacancy = testing.vacancy_id.ForeignElem;

	otherEnv.web_link = ArrayMerge( assignedTestsArray, 'url', '\r\n' );

	message = lib_mail.build_mail_message( mailTemplate, email, person, otherEnv );
	lib_mail.show_mail_message( message );
}


function HandleSendPersonTestingNotif( testingSystem, testing, assignedTestsArray )
{
	SendPersonTestingNotif( testingSystem, testing, assignedTestsArray );
}


function CheckTestingState( testingSystem, testing, assignedTestsArray )
{
	if ( testing.Doc.IsChanged || testing.Doc.NeverSaved )
		testing.Screen.SaveDoc();

	ObtainAccount( testingSystem.recruit_provider_id.ForeignElem );

	respInfo = CallServerMethod( 'lib_recruit_provider', 'CheckTestingStateCore', [testingSystem.recruit_provider_id, testing.id] );
	respInfo.SetStrictMode( false );
	
	if ( respInfo.stateChanged == true && testing.OptScreen != undefined )
	{
		testing.AssignElem( OpenDoc( testing.ObjectUrl ).TopElem );
		testing.Doc.SetChanged( true );
	}
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function CheckTestingStateCore( providerID, testingID )
{
	provider = GetForeignElem( recruit_providers, providerID );
	testingSystem = provider.ObtainTestingSystem();
	account = ObtainAccount( provider );

	testingDoc = DefaultDb.OpenObjectDoc( 'testing', testingID );
	testing = testingDoc.TopElem;

	candidate = testing.candidate_id.ForeignElem;
	externalRegistration = candidate.external_registrations.GetOptChildByKey( testingSystem.id );

	lib = GetProviderLib( provider );

	respInfo = new Object;
	respInfo.SetStrictMode( false );
	
	for ( assignedTest in testing.assigned_tests )
	{
		externalTest = assignedTest.external_test_id.ForeignElem;
		if ( externalTest.testing_system_id != testingSystem.id )
			continue;

		if ( ! assignedTest.eid.HasValue )
			continue;

		stateInfo = lib.CheckTestingState( provider, account, assignedTest.eid, ( externalRegistration != undefined ? externalRegistration.eid : undefined ), externalTest );
		stateInfo.assigned_test_eid = assignedTest.eid;

		if ( OnProviderUpdateTestingState( provider, stateInfo, [testing] ) )
			respInfo.stateChanged = true;
	}

	//if ( respInfo.stateChanged )
		//testingDoc.Save();

	return respInfo;
}


function HandleAssignCandidateVideoInterview( candidate, event )
{
	provider = GetDefaultProvider( 'video_interview' );
	if ( provider == undefined || provider.std_provider_id == 'wts' )
	{
		lib_wts.HandleAssignCandidateVideoInterviewPoll( candidate, event );
		lib_agent.EnsureAgentHasSchedule( 'check_external_event_states', {unit_id:'minute',length:15} );
		return;
	}

	vacancy = event.vacancy_id.ForeignElem;
	if ( vacancy.video_interview_external_vacancy_id.HasValue )
	{
		externalVacancyID = vacancy.video_interview_external_vacancy_id;
	}
	else
	{
		externalVacancyID = lib_base.select_object_from_catalog( 'external_vacancies', ({recruit_provider_id:provider.id}) );
	}

	if ( candidate.OptScreen != undefined && candidate.Doc.IsChanged )
		candidate.OptScreen.SaveDoc();

	destData = CallServerMethod( this.Name, 'AssignCandidateVideoInterviewCore', [provider.id, ObtainAccountID( provider ), candidate.id, externalVacancyID] );

	event.eid = destData.eventEid;
	//event.participant_web_url = AdjustServiceUrl( respInfo.url_launch );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function AssignCandidateVideoInterviewCore( providerID, accountID, candidateID, externalVacancyID, event )
{
	provider = GetForeignElem( recruit_providers, providerID );
	candidate = GetForeignElem( candidates, candidateID );
	externalVacancy = GetForeignElem( external_vacancies, externalVacancyID );

	lib = GetProviderLib( provider );

	viData = new Object;
	viData.SetStrictMode( false );
	viData.vacancy_eid = externalVacancy.eid;

	respInfo = lib.AssignPersonVideoInterview( provider, candidate, viData );

	destData = new Object;
	destData.eventEid = provider.std_provider_id + ':' + respInfo.eid;

	lib_agent.EnsureAgentHasSchedule( 'check_external_event_states', {unit_id:'minute',length:15} );

	return destData;
}


function HandleAssignCandidateTesting( candidate, testing )
{
}


function HandleRequestCandidatePdConsent( candidate )
{
	RequestCandidatePdConsent( candidate );
	lib_base.show_info_message( ActiveScreen, UiText.messages.document_submitted );
}


function RequestCandidatePdConsent( candidate )
{
	if ( global_settings.pd_processing.consent_request_method == 'eos' )
	{
		provider = GetOptForeignElem( recruit_providers, 'eos' );
		if ( provider == undefined )
			throw UiError( 'Provider is not registered: E-Staff Online 2' );

		providerID = provider.id;
		accountID = ObtainAccountID( provider );
	}
	else
	{
		providerID = undefined;
		accountID = undefined;
	}

	CallServerMethod( this.Name, 'RequestCandidatePdConsentCore', [providerID, accountID, candidate.id] );
	candidate.pd_consent_request_date = CurDate;
	candidate.Doc.SetChanged( true );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function RequestCandidatePdConsentCore( providerID, accountID, candidateID )
{
	if ( providerID != undefined )
		provider = GetForeignElem( recruit_providers, providerID );

	candidate = GetForeignElem( candidates, candidateID );

	if ( ! candidate.email.HasValue )
		throw UiError( 'Empty e-mail' );

	if ( ! global_settings.pd_processing.consent_request_mail_template_id.HasValue )
		throw UiError( 'Mail template has not been specified' );

	if ( providerID != undefined )
	{
		lib = GetProviderLib( provider );
		respInfo = lib.RequestPersonPdConsent( provider, candidate );
		startUrl = respInfo.start_url;
	}
	else
	{
		reqParam = new Object;
		reqParam.candidate_id = candidateID;

		startUrl = Url( ui_base.GetServerProtocol(), ui_base.GetServerHostName(), '/personal/pd_consent_form.htm', UrlEncodeQuery( reqParam ) );
	}

	otherEnv = candidate.build_mail_env_object( candidate.get_main_vacancy_id() );
	otherEnv.request = new Object;
	otherEnv.request.web_link = startUrl;

	message = lib_mail.build_mail_message( GetForeignElem( mail_templates, global_settings.pd_processing.consent_request_mail_template_id ), candidate.email, candidate, otherEnv );
	lib_mail.send_mail_message( message );

	lib_agent.EnsureAgentHasSchedule( 'check_external_event_states', {unit_id:'minute',length:15} );
}



function HandleLoadProviderAuxDocumentTypes( provider )
{
	if ( provider.Doc.IsChanged )
		provider.Screen.SaveDoc();

	LoadAuxDocumentTypes( provider, undefined );
	provider.Doc.SetChanged( true );	
	provider.Screen.Update();
}


function LoadAuxDocumentTypes( provider )
{
	srcArray = CallServerMethod( 'lib_recruit_provider', 'GetProviderAuxDocumentTypesCore', [provider.id] );
	provider.aux_document_types.Clear();
	for ( srcElem in srcArray )
	{
		elem = provider.aux_document_types.AddChild();
		elem.id = srcElem.id;
		elem.name = srcElem.name;
	}
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function GetProviderAuxDocumentTypesCore( providerID )
{
	provider = GetForeignElem( recruit_providers, providerID );
	account = ObtainAccount( provider );

	lib = GetProviderLib( provider );
	return lib.GetAuxDocumentTypes( provider, account );
}


function HandleRequestCandidateAuxDocument( candidate, event, options )
{
	RequestCandidateAuxDocument( candidate, event, options );
	lib_base.show_info_message( ActiveScreen, UiText.messages.document_submitted );
}


function RequestCandidateAuxDocument( candidate, event, options )
{
	if (options != undefined && (providerID = options.GetOptProperty('provider_id')) != undefined)
	{
		provider = GetOptForeignElem( recruit_providers, providerID );
		if ( provider == undefined )
			throw UiError( 'Provider is not registered: ' + providerID );
	}
	else
	{
		provider = GetOptForeignElem( recruit_providers, 'eos' );
		if ( provider == undefined )
			throw UiError( 'Provider is not registered: E-Staff Online 2' );
	}

	respInfo = CallServerMethod( this.Name, 'RequestCandidateAuxDocumentCore', [provider.id, ObtainAccountID( provider ), candidate.id, event, options] );
	event.participant_web_url = respInfo.start_url;
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function RequestCandidateAuxDocumentCore( providerID, accountID, candidateID, event, options )
{
	provider = GetForeignElem( recruit_providers, providerID );
	candidate = GetForeignElem( candidates, candidateID );

	if ( ! candidate.email.HasValue )
		throw UiError( 'Empty e-mail' );

	lib = GetProviderLib( provider );
	respInfo = lib.RequestPersonAuxDocument( provider, candidate, event, options );
	return respInfo;
}




function GetDefaultProvider( featureID )
{
	array = lib_voc.get_sorted_voc( recruit_providers );
	if ( featureID != undefined )
		array = ArraySelect( array, 'features.Child( featureID )' );

	return ArrayOptFirstElem( array );
}


function GetProviderLib( provider )
{
	if ( ! provider.std_provider_id.HasValue )
		throw UiError( "Provider type has not been specified" );
	
	lib = OpenCodeLib( 'x-app://conn_' + provider.std_provider_id + '/' + provider.std_provider_id + '_lib_' + provider.std_provider_id + '.js' );
	return lib;
}


function RunCheckStatesTask()
{
	for ( provider in lib_voc.get_sorted_voc( recruit_providers ) )
	{
		try
		{
			RunProviderCheckStatesTask( provider );
		}
		catch ( e )
		{
			if ( LdsIsClient )
				throw e;

			LogEvent( '', 'ERROR: ' + e );
		}
	}
}


function RunProviderCheckStatesTask( provider )
{
	if ( provider.std_provider_id == 'wts' )
	{
		lib_wts.RunCheckPollAutoApplyTask();
		lib_wts.RunCheckStatesTask();
		return;
	}

	lib = GetProviderLib( provider );

	if ( provider.use_accounts )
	{
		for ( account in XQuery( 'for $elem in external_accounts where $elem/type_id = "recruit_provider" and $elem/recruit_provider_id = ' + XQueryLiteral( provider.id ) + ' return $elem' ) )
		{
			if ( provider.use_access_token && ! account.access_token.HasValue )
				continue;

			lib.RunCheckStatesTask( provider, account );
		}
	}
	else
	{
		account = ObtainAccount( provider );
		lib.RunCheckStatesTask( provider, account );
	}
}


function OnProviderNewCandidate( provider, srcCandidate )
{
	if ( srcCandidate.inet_eid == '' || srcCandidate.inet_eid == null )
		throw 'Provider returned empty eid';

	logName = provider.std_provider_id;
	LogEvent( logName, 'New candidate: ' + srcCandidate.inet_eid + ' ' + srcCandidate.lastname + ' ' + srcCandidate.firstname );

	//DebugMsg( srcCandidate.Xml );
	uid = provider.std_provider_id + ':' + srcCandidate.inet_eid;
	
	candidate = ArrayOptFirstElem( XQuery( 'for $elem in candidates where $elem/eid = ' + XQueryLiteral( uid ) + ' return $elem/Fields( "id" )' ) )
	if ( candidate != undefined )
	{
		LogEvent( logName, 'Already exists' );
		return;
	}

	externalVacancy = undefined;

	if ( srcCandidate.vacancy_inet_eid.HasValue )
	{
		externalVacancy = ArrayOptFindByKey( external_vacancies, provider.std_provider_id + ':' + srcCandidate.vacancy_inet_eid, 'uid' );
		if ( externalVacancy == undefined )
			LogEvent( logName, 'External vacancy is not found: ' + srcCandidate.vacancy_inet_eid );
	}

	candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
	candidate = candidateDoc.TopElem;

	lib_imod.AdjustInetCandidateCore( srcCandidate );
	lib_imod.LoadCandidateDataFromInetCandidate( candidate, srcCandidate );
	candidate.eid = uid;

	if ( externalVacancy != undefined && externalVacancy.user_id.HasValue )
		candidate.user_id = externalVacancy.user_id;

	if ( provider.dest_candidate_fields.source_id.HasValue )
		candidate.source_id = provider.dest_candidate_fields.source_id;

	if ( provider.dest_candidate_fields.state_id.HasValue && provider.dest_candidate_fields.state_id != 'new' )
	{
		stateID = provider.dest_candidate_fields.state_id;
		eventData = new Object;

		eventData.user_id = candidate.user_id;

		if ( srcCandidate.resp_inet_eid.HasValue )
			eventData.eid = provider.std_provider_id + ':' + srcCandidate.resp_inet_eid;

		lib_candidate.SetCandidateState( candidate, stateID, eventData, {isSilent:true} );
	}

	candidateDoc.Save();

	LogEvent( logName, 'Done' );
}


function OnProviderEventStates( provider, stateInfoArray )
{
	for ( stateInfo in stateInfoArray )
		OnProviderEventState( provider, stateInfo );
}


function OnProviderEventState( provider, stateInfo )
{
	if ( stateInfo.eid == '' || stateInfo.eid == null )
		throw 'Provider returned empty eid';

	logName = provider.std_provider_id;
	LogEvent( logName, 'Event status: ' + stateInfo.eid + ' ' + stateInfo.web_url );

	uid = provider.std_provider_id + ':' + stateInfo.eid;
	
	event = ArrayOptFirstElem( XQuery( 'for $elem in events where $elem/eid = ' + XQueryLiteral( uid ) + ' return $elem/Fields( "id","occurrence_id","web_url" )' ) )
	if ( event != undefined )
	{
		UpdateEventState( provider, stateInfo, event );
	}
	/*else if ( stateInfo.resp_inet_eid )
	{
		uid = provider.std_provider_id + ':' + stateInfo.resp_inet_eid;
		event = ArrayOptFirstElem( XQuery( 'for $elem in events where $elem/eid = ' + XQueryLiteral( uid ) + ' return $elem/Fields( "id","occurrence_id","web_url" )' ) )
	}*/
	else
	{
		LogEvent( logName, 'Event is not found' );
		return;
	}

	LogEvent( logName, 'Done' );
}


function UpdateEventState( provider, stateInfo, event )
{
	newEventData = event.Clone();
	if ( event.type.has_occurrence( stateInfo.occurrence_id ) )
		newEventData.occurrence_id = stateInfo.occurrence_id;
	newEventData.web_url = stateInfo.web_url;

	if ( event.EqualToElem( newEventData ) )
	{
		logName = provider.std_provider_id;
		LogEvent( logName, 'Not modified' );
		return;
	}

	eventDoc = OpenDoc( event.ObjectUrl );
	event = eventDoc.TopElem;
	//event.AssignElem( newEventData );
	event.occurrence_id = newEventData.occurrence_id;
	event.web_url = newEventData.web_url;
	eventDoc.Save();
	event.UpdateDepObjectState();
}


function OnProviderUpdateTestingStates( provider, statesArray )
{
	testingsArray = XQuery( 'for $elem in testings where $elem/date >= ' + XQueryLiteral( DateOffset( DateNewTime( CurDate ), 0 - 30 * 86400 ) ) + ' and $elem/is_active = true() return $elem' );

	for ( stateInfo in statesArray )
		OnProviderUpdateTestingState( provider, stateInfo, testingsArray );
}


function OnProviderUpdateTestingState( provider, stateInfo, testingsArray )
{
	if ( stateInfo.assigned_test_eid == '' || stateInfo.assigned_test_eid == null )
		throw 'Provider returned empty assigned_test_eid';

	logName = provider.std_provider_id;
	LogEvent( logName, 'Testing status: ' + stateInfo.assigned_test_eid + ' ' + stateInfo.completion_id + ' ' + stateInfo.result_url );

	assignedTestUid = provider.std_provider_id + ':' + stateInfo.assigned_test_eid;

	testing = ArrayOptFind( testingsArray, 'assigned_tests.GetOptChildByKey( assignedTestUid, \'uid\' ) != undefined' );
	if ( testing == undefined )
	{
		LogEvent( logName, 'Testing is not found' );
		return false;
	}

	assignedTest = testing.assigned_tests.GetChildByKey( assignedTestUid, 'uid' );
	//DebugMsg( assignedTest.Xml );
	
	assignedTest2 = assignedTest.Clone();
	if ( stateInfo.completion_id != undefined )
		assignedTest2.completion_id = stateInfo.completion_id;
	assignedTest2.result_url = stateInfo.result_url;

	if ( assignedTest2.EqualToElem( assignedTest ) )
	{
		LogEvent( logName, 'Not modified' );
		return false;
	}

	testingDoc = OpenDoc( testing.ObjectUrl );
	testing = testingDoc.TopElem;
	assignedTest = testing.assigned_tests.GetChildByKey( assignedTestUid, 'uid' );
	assignedTest.AssignElem( assignedTest2 );
	testingDoc.Save();
	testing.UpdateDepObjectState();

	LogEvent( logName, 'Done' );
	return true;
}


function OnProviderPdConsents( provider, srcArray )
{
	for ( srcElem in srcArray )
		OnProviderPdConsent( provider, srcElem );
}


function OnProviderPdConsent( provider, srcElem )
{
	try
	{
		candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', srcElem.native_id );
	}
	catch ( e )
	{
		LogEvent( '', 'ERROR: unable to open candidate ' + srcElem.native_id + ' to receive PD consent. ' + e );
		return;
	}

	candidate = candidateDoc.TopElem;

	candidate.pd_consent_received = true;
	candidate.pd_consent_date = srcElem.end_date;

	candidateDoc.RunActionOnSave = false;
	candidateDoc.WriteDocInfo = false;
	candidateDoc.Save();

	LogEvent( '', 'PD consent received: ' + candidate.fullname );
}


function OnProviderAuxDocuments( provider, srcArray )
{
	for ( srcElem in srcArray )
		OnProviderAuxDocument( provider, srcElem );
}


function OnProviderAuxDocument( provider, srcElem )
{
	try
	{
		candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', srcElem.native_id );
	}
	catch ( e )
	{
		LogEvent( '', 'ERROR: unable to open candidate ' + srcElem.native_id + ' to receive aux document. ' + e );
		return;
	}

	try
	{
		eventDoc = DefaultDb.OpenObjectDoc( 'event', srcElem.native_event_id );
	}
	catch ( e )
	{
		LogEvent( '', 'ERROR: unable to open event ' + srcElem.native_event_id + ' to receive aux document. ' + e );
		return;
	}

	candidate = candidateDoc.TopElem;
	event = eventDoc.TopElem;

	for ( srcAttachment in srcElem.attachments )
	{
		attatchment = candidate.attachments.AddChild( srcAttachment.type_id );
		attatchment.type_id = srcAttachment.type_id;
		attatchment.file_name = srcAttachment.file_name;
		attatchment.content_type = srcAttachment.GetOptProperty( 'content_type', 'aplication/binary' );
		
		if ( attatchment.content_type == 'text/html' )
			attatchment.text = Base64Decode( srcAttachment.data_base64 );
		else
			attatchment.data = Base64Decode( srcAttachment.data_base64 );
	}

	candidateDoc.RunActionOnSave = false;
	candidateDoc.WriteDocInfo = false;
	candidateDoc.Save();

	if ( event.occurrence_id == '' )
	{
		if ( event.type.has_occurrence( 'finished' ) )
			event.occurrence_id = 'finished';
		else if ( event.type.has_occurrence( 'succeeded' ) )
			event.occurrence_id = 'succeeded';

		eventDoc.RunActionOnSave = false;
		eventDoc.WriteDocInfo = false;
		eventDoc.Save();

		event.UpdateDepObjectState();
	}

	LogEvent( '', 'Aux document received: ' + candidate.fullname );
}


function ObtainAccountID( provider )
{
	account = ObtainAccount( provider );
	if ( account == undefined )
		return undefined;

	return account.id;
}


function ObtainAccount( provider )
{
	if ( ! provider.use_accounts )
		return undefined;

	if ( LdsIsClient && ! UseLds )
	{
		userID = null;
	}
	else
	{
		if ( LdsCurUserID == null /*CurAuthObject == undefined*/ )
			throw UserError( 'No authorized user is found' );

		userID = LdsCurUserID;
	}

	account = ArrayOptFirstElem( XQuery( 'for $elem in external_accounts where $elem/type_id = ' + XQueryLiteral( 'recruit_provider' ) + ' and $elem/recruit_provider_id = ' + XQueryLiteral( provider.id ) + ' and $elem/user_id = ' + XQueryLiteral( userID ) + ' return $elem' ) );
	if ( account != undefined )
		return account;

	if ( ! LdsIsClient )
		throw UserError( 'No account is found' );

	accountDoc = DefaultDb.OpenNewObjectDoc( 'external_account' );
	account = accountDoc.TopElem;
	account.type_id = 'recruit_provider';
	account.recruit_provider_id = provider.id;
	account.user_id = userID;
	accountDoc.Save();

	CreateDocScreen( accountDoc );
	Cancel();
}