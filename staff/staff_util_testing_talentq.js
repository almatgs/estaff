function load_external_tests( testingSystem )
{
	newExternalTest = GetFailedForeignElem( external_tests );
	newExternalTest.id = 'talentq:2';
	newExternalTest.name = 'Elements Numeric';
	newExternalTest.testing_system_id = 'talentq';
	
	lib_voc.init_voc_std_elem( external_tests, newExternalTest );

	newExternalTest = GetFailedForeignElem( external_tests );
	newExternalTest.id = 'talentq:3';
	newExternalTest.name = 'Elements Verbal';
	newExternalTest.testing_system_id = 'talentq';
	
	lib_voc.init_voc_std_elem( external_tests, newExternalTest );
}


function activate_testing( testingSystem, testing, assignedTestsArray )
{
	candidate = testing.candidate_id.ForeignElem;
	if ( ! candidate.email.HasValue )
		throw UserError( 'Candidate E-mail is not specified' );

	externalRegistration = candidate.external_registrations.GetOptChildByKey( 'talentq' );
	if ( externalRegistration == undefined )
	{
		register_candidate( testingSystem, candidate );

		candidate = GetForeignElem( candidates, candidate.id );
		externalRegistration = candidate.external_registrations.GetOptChildByKey( 'talentq' );
	}

	for ( assignedTest in assignedTestsArray )
	{
		externalTest = assignedTest.external_test_id.ForeignElem;

		argElem = create_arg_elem( testing );
		body = argElem.AddChild( 'soap:Body' );

		cc = body.AddChild( 'CandidateAssign' );
		cc.AddAttr( 'xmlns', 'http://Talentq.co.uk/integratelive' );

		cc.AddChild( 'iTQUserId', 'string' ).Value = externalRegistration.eid;
		cc.AddChild( 'iTestID', 'string' ).Value = String( externalTest.id ).split( ':' )[1];

		respElem = call_soap_method( argElem, 'MonsterService.xmd' );
		if ( respElem.CandidateAssignResult != '1' )
			throw '?';

		assignedTest.eid = externalRegistration.eid + cc.iTestID;
		//assignedTest.activation_code = respElem.code;
		//assignedTest.url = respElem.start_url;

		//testing.eid = externalRegistration.eid + ':' + externalTest.id;
		//testing.Doc.SetChanged( true );
	}

	if ( testingSystem.send_assign_notif && testingSystem.assign_notif_template_id.HasValue )
	{
		envObject = candidate.build_mail_env_object( null );
		envObject.externalRegistration = externalRegistration;

		mailMessage = lib_mail.build_mail_message( testingSystem.assign_notif_template_id.ForeignElem, candidate.email, candidate, envObject );
		
		lib_mail.show_mail_message( mailMessage );
	}
}


function register_candidate( testingSystem, candidate )
{
	argElem = create_arg_elem( testing );
	body = argElem.AddChild( 'soap:Body' );

	cc = body.AddChild( 'CandidateCreate' );
	cc.AddAttr( 'xmlns', 'http://Talentq.co.uk/integratelive' );

	cc.AddChild( 'sFirst', 'string' ).Value = candidate.firstname;
	cc.AddChild( 'sSecond', 'string' ).Value = candidate.lastname;
	cc.AddChild( 'sExternalId', 'string' ).Value = '0x' + StrHexInt( candidate.id, 16 );
	cc.AddChild( 'iLanguage', 'string' ).Value = 5;


	respElem = call_soap_method( argElem, 'MonsterService.xmd' );

	candidateDoc = ObtainUiDoc( candidate.ObjectUrl );
	externalRegistration = candidateDoc.TopElem.external_registrations.ObtainChildByKey( 'talentq' );
	externalRegistration.eid = respElem.CandidateCreateResult[0];
	externalRegistration.login = respElem.CandidateCreateResult[1];
	externalRegistration.password = respElem.CandidateCreateResult[2];

	if ( candidateDoc.TopElem.OptScreen != undefined )
		candidateDoc.TopElem.OptScreen.SaveDoc();
	else
		candidateDoc.Save();
}


function update_testing_state( testingSystem, testing, assignedTestsArray )
{
	candidate = testing.candidate_id.ForeignElem;

	externalRegistration = candidate.external_registrations.GetOptChildByKey( 'talentq' );
	if ( externalRegistration == undefined )
		throw UserError( 'Candidate is not registered in TalentQ' );

	argElem = create_arg_elem( testing );
	body = argElem.AddChild( 'soap:Body' );

	cc = body.AddChild( 'CandidateStatus' );
	cc.AddAttr( 'xmlns', 'http://Talentq.co.uk/integratelive' );

	cc.AddChild( 'iTQUserId', 'string' ).Value = externalRegistration.eid;

	respElem = call_soap_method( argElem, 'MonsterService.xmd' );
	if ( respElem.CandidateStatusResult.ChildNum == 0 )
		return;

	if ( respElem.CandidateStatusResult.ChildNum % 2 != 0 )
		throw UserError( 'Invalid response' );

	allCompleted = true;

	for ( i = 0; i < respElem.CandidateStatusResult.ChildNum; i += 2 )
	{
		externalTestID = 'talentq:' + Int( respElem.CandidateStatusResult[i] );

		assignedTest = testing.assigned_tests.GetOptChildByKey( externalTestID );
		if ( assignedTest == undefined )
			continue;

		statusDesc = respElem.CandidateStatusResult[i + 1];
		obj = StrScan( statusDesc, '%s/%s' );
		if ( Int( obj[0] ) != Int( obj[1] ) )
			allCompleted = false;
	}

	if ( allCompleted )
		testing.occurrence_id = 'succeeded';

	//alert( respElem.CandidateStatusResult.Xml );


	if ( allCompleted )
	{
		argElem = create_arg_elem( testing );
		body = argElem.AddChild( 'soap:Body' );

		cc = body.AddChild( 'CandidateReport' );
		cc.AddAttr( 'xmlns', 'http://Talentq.co.uk/integratelive' );

		cc.AddChild( 'iTQUserId', 'string' ).Value = externalRegistration.eid;
		cc.AddChild( 'iReportType', 'string' ).Value = 7;
		//cc.AddChild( 'iReportOptions', 'string' ).Value = '-1';
		cc.AddChild( 'iLanguage', 'string' ).Value = 5;

		respElem = call_soap_method( argElem, 'MonsterService.xmd' );
		//alert( respElem.CandidateReportResult.Xml );

		if ( respElem.CandidateReportResult == '' )
			throw UserError( 'Empty report' );

		dataStr = Base64Decode( respElem.CandidateReportResult );

		attachment = testing.attachments.ObtainChildByKey( 'CombinedReport.pdf', 'file_name' );
		attachment.date = CurDate;
		attachment.content_type = 'application/binary';
		attachment.data = dataStr;

		//PutUrlData( 'zz_report.pdf', dataStr );
	}
}


function create_arg_elem( testing )
{
	var			externalTest;
	var			testingSystem;

	externalTest = testing.assigned_tests[0].external_test_id.ForeignElem;
	testingSystem = externalTest.testing_system_id.ForeignElem;

	if ( testingSystem.use_local_logins )
		baseAuthData = local_settings.target_testing_systems.GetOptChildByKey( 'talentq' );
	else
		baseAuthData = testingSystem;

	if ( baseAuthData == undefined || ! baseAuthData.login.HasValue || ! baseAuthData.password.HasValue )
		throw UserError( StrReplaceOne( UiText.errors.testing_systems_xxx_auth_data_not_specified, '%s', testingSystem.name ) );

	argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;
	argElem.AddAttr( 'xmlns:soap', 'http://schemas.xmlsoap.org/soap/envelope/' );

	header = argElem.AddChild( 'soap:Header' );

	authHeader = header.AddChild( 'ServiceAuthHeader' );
	authHeader.AddAttr( 'xmlns', 'http://Talentq.co.uk/integratelive' );

	authHeader.AddChild( 'Username', 'string' ).Value = baseAuthData.login;
	authHeader.AddChild( 'Password', 'string' ).Value = baseAuthData.password;

	return argElem;
}


function call_soap_method( argElem, formUrl )
{
	var			reqStr, respStr;

	if ( true )
		serviceUrl = 'http://apps.talentqgroup.com/integratelive/tqintegration.asmx';
	else
		serviceUrl = 'http://apps.talentqgroup.com/integrate/tqintegration.asmx';

	reqStr = '<?xml version="1.0" encoding="utf-8"?>\r\n' + EncodeCharset( argElem.Xml, 'utf-8' );
	PutUrlData( 'zz_req.xml', reqStr );

	resp = HttpRequest( serviceUrl, 'post', reqStr, 'Ignore-Errors: 1\nContent-type: text/xml; charset=utf-8\nSOAPAction: http://Talentq.co.uk/integratelive/' + argElem[1][0].Name );
	respStr = resp.Body;

	//respStr = '<?xml version="1.0" encoding="windows-1251"?>\r\n' + DecodeCharset( , 'utf-8' );
	PutUrlData( 'zz_resp.xml', respStr );

	respDoc = OpenDocFromStr( respStr, 'drop-namespaces=1' );
	
	if ( respDoc.TopElem.Name != 'Envelope' )
		throw 'Invalid SOAP response';
	
	respBody = respDoc.Envelope.Body;

	if ( respBody.ChildExists( 'Fault' ) )
	{
		if ( StrContains( respBody.Fault.faultstring, 'Please pass a correct username and password for this service' ) )
			throw UserError( UiText.errors.invalid_login );
		else
			throw respBody.Fault.faultstring;
	}

	if ( resp.RespCode != 200 )
		throw 'HTTP ' + resp.RespCode;

	//alert( formUrl + '   ' + argElem[0][0].Name + 'Response' );

	if ( false )
	{
		respElem = CreateElem( formUrl, argElem[0][0].Name + 'Response' );
		respElem.AssignElem( respBody[0] );
		return respElem;
	}
	else
	{
		return respBody[0];
	}
}

