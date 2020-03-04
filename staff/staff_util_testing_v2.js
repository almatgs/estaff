function load_external_tests( testingSystem )
{
	argElem = create_arg_elem( testingSystem );
	body = argElem.AddChild( 'soap:Body' );
	core = body.AddChild( 'GetTests' );

	respElem = call_soap_method( testingSystem, argElem );

	for ( srcElem in respElem.tests )
	{
		newExternalTest = GetFailedForeignElem( external_tests );
		newExternalTest.id = testingSystem.id + ':' + srcElem.id;
		newExternalTest.eid = srcElem.id;
		newExternalTest.name = srcElem.name;
		newExternalTest.testing_system_id = testingSystem.id;
		
		lib_voc.init_voc_std_elem( external_tests, newExternalTest );
	}
}


function activate_testing( testingSystem, testing, assignedTestsArray )
{
	candidate = testing.candidate_id.ForeignElem;

	externalRegistration = candidate.external_registrations.GetOptChildByKey( testingSystem.id );
	if ( externalRegistration != undefined )
	{
		eid = externalRegistration.eid;
	}
	else
	{
		eid = register_candidate( testingSystem, candidate );
	}

	for ( assignedTest in assignedTestsArray )
	{
		externalTest = assignedTest.external_test_id.ForeignElem;
	
		argElem = create_arg_elem( testingSystem );
		body = argElem.AddChild( 'soap:Body' );
		core = body.AddChild( 'AssignTest' );

		core.AddChild( 'person_id', 'string' ).Value = eid;
		core.AddChild( 'test_id', 'string' ).Value = externalTest.eid;
		
		if ( true )
		{
			if ( testing.vacancy_id.HasValue )
				core.AddChild( 'vacancy_id', 'string' ).Value = '0x' + StrHexInt( testing.vacancy_id );
			
			core.AddChild( 'vacancy_name', 'string' ).Value = testing.vacancy_id.ForeignDispName;
		}

		respElem = call_soap_method( testingSystem, argElem );

		assignedTest.eid = respElem.testing_id;
		assignedTest.uid = testingSystem.id + ':' + assignedTest.eid;
		assignedTest.activation_code = respElem.code;
		assignedTest.url = respElem.start_url;
	}
}


function register_candidate( testingSystem, candidate )
{
	if ( candidate.inet_uid.HasValue && ( obj = StrOptScan( candidate.inet_uid, '%s:%s' ) ) != undefined && obj[0] == testingSystem.id )
	{
		return obj[1];
	}

	//alert( 1111111 );

	argElem = create_arg_elem( testingSystem );
	body = argElem.AddChild( 'soap:Body' );
	core = body.AddChild( 'AddPerson' );

	core.AddChild( 'lastname', 'string' ).Value = candidate.lastname;
	core.AddChild( 'firstname', 'string' ).Value = candidate.firstname;
	core.AddChild( 'middlename', 'string' ).Value = candidate.middlename;

	core.AddChild( 'code', 'string' ).Value = candidate.code;
	core.AddChild( 'birth_date', 'date' ).Value = candidate.birth_date;
	core.AddChild( 'birth_year', 'integer' ).Value = candidate.birth_year;

	core.AddChild( 'home_phone', 'string' ).Value = candidate.home_phone;
	core.AddChild( 'mobile_phone', 'string' ).Value = candidate.mobile_phone;
	core.AddChild( 'email', 'string' ).Value = candidate.email;

	core.AddChild( 'is_candidate', 'bool' ).Value = true;

	respElem = call_soap_method( testingSystem, argElem );

	candidateDoc = ObtainUiDoc( candidate.ObjectUrl );
	externalRegistration = candidateDoc.TopElem.external_registrations.ObtainChildByKey( testingSystem.id );
	externalRegistration.eid = respElem.person_id;

	if ( candidateDoc.TopElem.OptScreen != undefined )
		candidateDoc.TopElem.OptScreen.SaveDoc();
	else
		candidateDoc.Save();

	return externalRegistration.eid;
}


function update_testing_state( testingSystem, testing, assignedTestsArray )
{
	var		asignedTest;

	//DebugMsg( 1 );

	candidate = testing.candidate_id.ForeignElem;
	attcDate = CurDate;

	for ( asignedTest in assignedTestsArray )
	{
		if ( candidate.inet_uid.HasValue && ( obj = StrOptScan( candidate.inet_uid, '%s:%s' ) ) != undefined && obj[0] == testingSystem.id )
		{
			eid = obj[1];
		}
		else
		{
			externalRegistration = candidate.external_registrations.GetOptChildByKey( testingSystem.id );
			if ( externalRegistration != undefined )
				eid = externalRegistration.eid;
			else
				eid = '0';
		}

		externalTest = asignedTest.external_test_id.ForeignElem;

		argElem = create_arg_elem( testingSystem );
		body = argElem.AddChild( 'soap:Body' );
		core = body.AddChild( 'GetTestingState' );

		core.AddChild( 'person_id', 'string' ).Value = eid;
		core.AddChild( 'test_id', 'string' ).Value = externalTest.eid;
		core.AddChild( 'testing_id', 'string' ).Value = asignedTest.eid;

		respElem = call_soap_method( testingSystem, argElem );

		switch ( respElem.state_id )
		{
			case '':
				asignedTest.completion_id.Clear();
				break;

			case '0':
				asignedTest.completion_id = 2;
				break;

			case '1':
				asignedTest.completion_id = 1;
				break;

			case '2':
				asignedTest.completion_id = 2;
				break;
		}

		if ( asignedTest.completion_id.HasValue && respElem.start_usage_date != null )
			asignedTest.start_date = respElem.start_usage_date;

		if ( asignedTest.completion_id == 1 && respElem.start_usage_date != null )
			asignedTest.end_date = respElem.last_usage_date;

		asignedTest.score = respElem.score;
		
		if ( asignedTest.completion_id == 1 )
			asignedTest.is_passed = respElem.is_passed;

		if ( respElem.ChildExists( 'report' ) )
		{
			//dataStr = Base64Decode( respElem.report.data );
			
			if ( StrLen( respElem.report.data ) > 2 )
			{
				if ( testing.assigned_tests.ChildNum == 1 )
					attcName = 'Report';
				else
					attcName = 'Report ' + ( asignedTest.ChildIndex + 1 );
					
				attachment = testing.attachments.ObtainChildByKey( attcName, 'name' );
				attachment.date = attcDate;
				attachment.content_type = 'text/html';
				attachment.text = respElem.report.data;
			}

			//PutUrlData( 'zz_report.pdf', dataStr );
		}
	}
}


function activate_online_interview( testingSystem, event, candidate )
{
	externalRegistration = candidate.external_registrations.GetOptChildByKey( testingSystem.id );
	if ( externalRegistration != undefined )
	{
		eid = externalRegistration.eid;
	}
	else
	{
		eid = register_candidate( testingSystem, candidate );
	}

	argElem = create_arg_elem( testingSystem );
	body = argElem.AddChild( 'soap:Body' );
	core = body.AddChild( 'AddInterview' );

	core.AddChild( 'person_id', 'string' ).Value = eid;
	core.AddChild( 'date', 'date' ).Value = event.date;

	respElem = call_soap_method( testingSystem, argElem );

	event.eid = respElem.interview_id;
	event.web_url = respElem.start_url;
	event.participant_web_url = respElem.url;
}


function create_arg_elem( testingSystem )
{
	var			externalTest;

	argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;
	argElem.AddAttr( 'xmlns:soap', 'http://schemas.xmlsoap.org/soap/envelope/' );

	//header = argElem.AddChild( 'soap:Header' );

	return argElem;
}


function call_soap_method( testingSystem, argElem, formUrl )
{
	var			reqStr, respStr;
	var			core, subElem;

	if ( ! testingSystem.own_site_id.HasValue )
		throw UserError( '¬заимодействие с внешней системой тестировани€ ' + testingSystem.name + ' не настроено. Ќе указан собственный сайт.' );

	ownSite = testingSystem.own_site_id.ForeignElem;

	serviceUrl = ownSite.std_interface.target_url;
	if ( serviceUrl == '' )
		throw UserError( '¬заимодействие с внешней системой тестировани€ ' + testingSystem.name + ' не настроено. Ќе указан url обработчика.' );

	if ( ownSite.use_auth )
	{
		//lib_imod.check_site_auth_settings( ownSite.id );
		authSettings = lib_imod.CreateTask( ownSite.id ).account;
	}

	/*
	siteSettings = imod_settings.sites.GetOptChildByKey( testingSystem.own_site_id );
	if ( siteSettings == undefined )
		throw UserError( 'Own site is not registered' );

	if ( siteSettings.login == '' )
		throw UserError( '¬заимодействие с внешней системой тестировани€ ' + testingSystem.name + ' не настроено. Ќе указан логин дл€ собственного сайта.' );

	serviceUrl = 'http://' + siteAddress + '/estaff_api_2.html';
	*/

	core = argElem[0][0];

	if ( ownSite.use_auth )
	{
		core.AddChild( 'login', 'string' ).Value = authSettings.login;
		core.AddChild( 'password', 'string' ).Value = authSettings.password;
	}
	
	if ( ownSite.std_interface.protocol_type == 'soap' )
	{
		//reqStr = '<?xml version="1.0" encoding="utf-8"?>\r\n' + EncodeCharset( argElem.Xml, 'utf-8' );
		reqStr = argElem.Xml;
		PutUrlData( 'x-local://Logs/zz_testing_req.xml', reqStr );

		resp = HttpRequest( serviceUrl, 'post', reqStr, 'Ignore-Errors: 0\nContent-type: text/xml; charset=utf-8\nSOAPAction: http://www.datex-soft.com/uri/' + argElem[0][0].Name );

		//if ( resp.RespCode != 200 )
			//throw 'HTTP ' + resp.RespCode;
	}
	else
	{
		serviceUrl += '?method=' + core.Name;

		reqParam = new Object;

		for ( subElem in core )
		{
			reqParam.AddProperty( subElem.Name, subElem.Value );
		}

		resp = HttpRequest( serviceUrl, 'post', UrlEncodeQueryExt( reqParam ) );
	}

	respStr = resp.Body;

	//respStr = '<?xml version="1.0" encoding="windows-1251"?>\r\n' + DecodeCharset( , 'utf-8' );
	PutUrlData( 'zz_resp.xml', respStr );

	respDoc = OpenDocFromStr( respStr, 'drop-namespaces=1' );
	
	if ( respDoc.TopElem.Name != 'Envelope' )
		throw 'Invalid SOAP response';
	
	respBody = respDoc.Envelope.Body;

	if ( respBody.ChildExists( 'Fault' ) )
	{
		throw respBody.Fault.faultstring;
	}

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

