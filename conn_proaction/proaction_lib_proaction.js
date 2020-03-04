function CheckProvider( provider, account )
{
	argObj = new Object;
	CallApiMethod( provider, account, 'get-tests', 'get', argObj );
}


function CheckAccount( provider, account )
{
	argObj = new Object;
	CallApiMethod( provider, account, 'get-tests', 'get', argObj );
}


function GetTests( provider, account )
{
	argObj = new Object;

	respObj = CallApiMethod( provider, account, 'get-tests', 'get', argObj );
	return respObj;
}


function RegisterPerson( provider, account, person )
{
	if ( ! person.email.HasValue )
		throw UiError( UiText.errors.field_is_empty + ': ' + person.email.Title );

	reqObj = new Object;
	reqObj.lastname = person.lastname;
	reqObj.firstname = person.firstname;
	reqObj.middlename = person.middlename;

	reqObj.birth_date = person.birth_date;
	reqObj.birth_year = null;

	reqObj.mobile_phone = person.mobile_phone;
	reqObj.email = person.email;

	respObj = CallApiMethod( provider, account, 'add-person', 'post', undefined, reqObj );
	return {eid:respObj.person_id};
}


function EnablePersonSubsequentTesting( provider, account, personEid, person, testing )
{
	reqObj = new Object;
	reqObj.person_id = personEid;
	reqObj.test_id = 1;
	reqObj.vacancy_name = testing.vacancy_id.ForeignElem.name;
	reqObj.send_notification = '1';

	respObj = CallApiMethod( provider, account, 'assign-test', 'post', undefined, reqObj );
}


function AssignTestToPerson( provider, account, personEid, person, externalTestEid, testing )
{
	reqObj = new Object;
	reqObj.person_id = personEid;
	reqObj.test_id = externalTestEid;
	reqObj.vacancy_name = testing.vacancy_id.ForeignElem.name;
	reqObj.send_notification = '1';

	respObj = CallApiMethod( provider, account, 'assign-test', 'post', undefined, reqObj );

	destObj = new Object;
	destObj.assigned_test_eid = respObj.testing_id;
	destObj.start_url = respObj.start_url;
	return destObj;
}


function CheckTestingState( provider, account, assignedTestEid, personEid, externalTestEid )
{
	argObj = new Object;
	argObj.person_id = personEid;
	argObj.testing_id = assignedTestEid;

	respObj = CallApiMethod( provider, account, 'get-testing-state', 'get', argObj );

	stateInfo = new Object;
	ExtractStateInfo( stateInfo, respObj );
	return stateInfo;
}


function RunCheckStatesTask( provider, account )
{
	CheckStates( provider, account );
	//CheckNewCandidates( provider );
}


function CheckStates( provider, account )
{
	//lib_imod.CheckSync();

	lastRunDate = task_results.GetTaskLastRunDate( 'proaction_check_states' );
	if ( lastRunDate == null )
		lastRunDate = DateOffset( CurDate, - 3 * 86400 );

	runDate = CurDate;
	minDate = DateOffset( lastRunDate, - 2 * 60 );

	//minDate = DateOffset( CurDate, 0 - 10 * 60 ); //!!!

	LogEvent( 'proaction', 'Started checking for changed statuses since ' + StrXmlDate( minDate ) );

	argObj = new Object;
	//argObj.date_from = StrXmlDate( minDate );
	//argObj.date_from = DateToRawSeconds( DateToTimeZoneDate( minDate, 0 ) );
	argObj.date_from = DateToRawSeconds( minDate );

	respObj = CallApiMethod( provider, account, 'get-testing-states', 'get', argObj );
	destArray = new Array;

	for ( srcElem in respObj )
	{
		stateInfo = new Object;
		destArray.push( stateInfo );

		stateInfo.assigned_test_eid = srcElem.testing_id;
		ExtractStateInfo( stateInfo, srcElem );
	}

	lib_recruit_provider.OnProviderUpdateTestingStates( provider, destArray );

	task_results.SetTaskLastRunDate( 'proaction_check_states', runDate );
	LogEvent( 'proaction', 'Finished checking for changed statuses' );
}


function ExtractStateInfo( stateInfo, srcElem )
{
	switch ( srcElem.state )
	{
		case 1:
			stateInfo.completion_id = null;
			break;

		case 2:
			stateInfo.completion_id = 2;
			break;

		case 3:
			stateInfo.completion_id = 1;
			break;

		default:
			stateInfo.completion_id = undefined;
	}

	stateInfo.result_url = srcElem.test_url;
}


function CallApiMethod( provider, account, url, method, reqQueryObj, reqBodyObj )
{
	lib_imod.CheckImod();

	//if ( ! account.access_token.HasValue )
		//throw UiError( UiText.errors.field_is_empty + ': ' + UiText.sections.administration + ', ' + provider.name + ', ' + UiText.fields.access_token );

	CheckAuth( account );

	if ( method == undefined )
		method = 'get';

	targetUrl = AbsoluteUrl( url, 'https://api.proaction.pro/api/hrm/e-staff/' );

	if ( method == 'get' )
	{
		if ( reqQueryObj == undefined )
			reqQueryObj = new Object;

		reqQueryObj.api_key = account.access_token;
	}
	else
	{
		if ( reqBodyObj == undefined )
			reqBodyObj = new Object;

		reqBodyObj.api_key = account.access_token;
	}

	if ( reqQueryObj != undefined )
		targetUrl += '?' + UrlEncodeQueryExt( reqQueryObj, 'utf-8' );

	options = '';

	reqBody = undefined;

	if ( reqBodyObj != undefined )
	{
		options += 'Content-Type: application/json; charset=utf-8\r\n';
		reqBody = EncodeCharset( EncodeJson( reqBodyObj ), 'utf-8' );
	}

	options += 'Ignore-Errors: 1\r\n';

	resp = HttpRequest( targetUrl, method, reqBody, options );

	//if ( resp.RespCode == 204 )
		//return undefined;

	respStr = DecodeCharset( resp.Body, 'utf-8' );
	//respObj = undefined;
	PutUrlData( 'x-app://Logs/zz_proaction_resp.json', respStr );
	
	respObj = undefined;
	if ( StrBegins( resp.ContentType, 'application/json' ) )
		respObj = EvalExtCodeLiteral( respStr );

	if ( resp.RespCode != 200 )
	{
		//if ( method == 'get' )
			//errDesc = 'Unable to load Google API resource: ' + url + '\r\n';
		//else
			errDesc = '';

		errDesc += 'HTTP ' + resp.RespCode;
		if ( respObj != undefined )
			errDesc += '\r\n' + respObj.message;

		throw UserError( errDesc );
	}

	if ( ! StrBegins( resp.ContentType, 'application/json' ) )
		throw UserError( 'Invalid response content type: ' + resp.ContentType );

	return respObj;
}


function CheckAuth( account )
{
	if ( ! account.access_token.HasValue )
		throw UiError( UiText.errors.field_is_empty + ': ' + account.access_token.Title );
}


function RequestAppAccess()
{
	respInfo = new Object;
	respInfo.SetStrictMode( false );
	respInfo.url = 'https://hr.proaction.pro/manager/settings/apikey';
	return respInfo;
}