function CheckProvider( provider )
{
	argObj = new Object;
	//argObj.pageSize = 1;

	CallApiMethod( provider, 'account_info', 'get', argObj );
}


function RequestPersonPdConsent( provider, person )
{
	destPersonInfo = new Object;
	destPersonInfo.native_id = person.id;
	destPersonInfo.lastname = person.lastname;
	destPersonInfo.firstname = person.firstname;
	destPersonInfo.middlename = person.middlename;
	destPersonInfo.email = person.email;

	reqObj = new Object;
	reqObj.person = destPersonInfo;

	respObj = CallApiMethod( provider, 'request_pd_consent', 'post', undefined, reqObj );

	respInfo = new Object;
	respInfo.start_url = respObj.start_url;
	return respInfo;
}


function GetAuxDocumentTypes( provider )
{
	respObj = CallApiMethod( provider, 'get_aux_document_types', 'get' );
	return respObj;
}


function RequestPersonAuxDocument( provider, person, event, options )
{
	destPersonInfo = new Object;
	destPersonInfo.native_id = person.id;
	destPersonInfo.lastname = person.lastname;
	destPersonInfo.firstname = person.firstname;
	destPersonInfo.middlename = person.middlename;
	destPersonInfo.email = person.email;

	reqObj = new Object;
	reqObj.person = destPersonInfo;
	reqObj.native_event_id = event.id;
	reqObj.native_event_type_id = event.type_id;

	if ( options != undefined && ( attrValue = options.GetOptProperty( 'req_file_name' ) ) != undefined )
		reqObj.req_file_name = attrValue;
	else
		reqObj.req_file_name = '';

	if ( options != undefined && ( attrValue = options.GetOptProperty( 'attachment_type_id' ) ) != undefined )
		reqObj.attachment_type_id = attrValue;
	else
		reqObj.attachment_type_id = '';

	respObj = CallApiMethod( provider, 'request_aux_document', 'post', undefined, reqObj );

	respInfo = new Object;
	respInfo.start_url = respObj.start_url;
	return respInfo;
}


function RunCheckStatesTask( provider )
{
	 CheckPdConsents( provider );
	 CheckAuxDocuments( provider );
}


function CheckPdConsents( provider )
{
	if ( UseLds )
		lastRunDate = AppLocalStorage.LoadEntryValue( 'task=eos_check_pd_consents;field=last_run_date', 'date' );
	else
		lastRunDate = task_results.GetTaskLastRunDate( 'eos_check_pd_consents' );
	if ( lastRunDate == undefined || lastRunDate == null )
		lastRunDate = DateOffset( CurDate, - 3 * 86400 );

	runDate = CurDate;
	minDate = DateOffset( lastRunDate, - 2 * 60 );

	//minDate = DateOffset( CurDate, 0 - 2 * 86400 ); //!!!

	LogEvent( 'eos', 'Started checking for changed PD consents ' + StrXmlDate( minDate ) );

	argObj = new Object;
	argObj.date_from = StrXmlDate( minDate );
	//argObj.pageSize = 1000;

	respArray = CallApiMethod( provider, 'get_pd_consents', 'get', argObj );

	lib_recruit_provider.OnProviderPdConsents( provider, respArray );

	if ( UseLds )
		lastRunDate = AppLocalStorage.PutEntryValue( 'task=eos_check_pd_consents;field=last_run_date', runDate );
	else
		task_results.SetTaskLastRunDate( 'eos_check_pd_consents', runDate );

	LogEvent( 'eos', 'Finished checking for changed PD consents' );
}


function CheckAuxDocuments( provider )
{
	if ( UseLds )
		lastRunDate = AppLocalStorage.LoadEntryValue( 'task=eos_check_aux_documents;field=last_run_date', 'date' );
	else
		lastRunDate = task_results.GetTaskLastRunDate( 'eos_check_aux_documents' );

	if ( lastRunDate == undefined || lastRunDate == null )
		lastRunDate = DateOffset( CurDate, - 3 * 86400 );

	runDate = CurDate;
	minDate = DateOffset( lastRunDate, - 2 * 60 );

	//minDate = DateOffset( CurDate, 0 - 2 * 86400 ); //!!!

	LogEvent( 'eos', 'Started checking for changed aux documents ' + StrXmlDate( minDate ) );

	argObj = new Object;
	argObj.date_from = StrXmlDate( minDate );
	//argObj.pageSize = 1000;

	respArray = CallApiMethod( provider, 'get_aux_documents', 'get', argObj );

	lib_recruit_provider.OnProviderAuxDocuments( provider, respArray );

	if ( UseLds )
		lastRunDate = AppLocalStorage.PutEntryValue( 'task=eos_check_aux_documents;field=last_run_date', runDate );
	else
		task_results.SetTaskLastRunDate( 'eos_check_aux_documents', runDate );

	LogEvent( 'eos', 'Finished checking for changed aux documents' );
}


function CallApiMethod( provider, url, method, reqQueryObj, reqBodyObj )
{
	if ( ! provider.access_token.HasValue )
		throw UiError( UiText.errors.field_is_empty + ': ' + UiText.sections.administration + ', ' + provider.name + ', ' + UiText.fields.access_token );

	if ( ( baseUrl = AppServerConfig.GetOptProperty( 'eos-service-url' ) ) == undefined )
		baseUrl = 'http://reg.datex-soft.com/eos/';
	
	targetUrl = AbsoluteUrl( url, baseUrl );

	if ( reqQueryObj == undefined )
		reqQueryObj = new Object;

	reqQueryObj.token = provider.access_token;

	targetUrl += '?' + UrlEncodeQueryExt( reqQueryObj, 'utf-8' );

	if ( method == undefined )
		method = 'get';

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
	//PutUrlData( 'x-app://Logs/zz_eos_resp.json', respStr );
	
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
			errDesc += '\r\n' + respObj.error.message;

		throw UserError( errDesc );
	}

	if ( ! StrBegins( resp.ContentType, 'application/json' ) )
		throw UserError( 'Invalid response content type: ' + resp.ContentType );

	return respObj;
}

