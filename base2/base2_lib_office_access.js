function is_office_access_enabled()
{
	return ( ArrayCount( lib_voc.get_sorted_voc( office_access_systems ) ) != 0 );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function SubmitEntryRequest( requestData, options )
{
	if ( options == undefined )
		options = new Object;

	options.SetStrictMode( false );

	if ( options.officeAccessSystemID != undefined )
		officeAccessSystem = GetOptForeignElem( office_access_systems, options.officeAccessSystemID );
	else
		officeAccessSystem = ArrayOptFirstElem( lib_voc.get_sorted_voc( office_access_systems ) );

	if ( officeAccessSystem == undefined )
		throw UiText.errors.office_access_not_enabled;

	if ( UseLds && officeAccessSystem.run_on_server )
		return CallServerMethod( 'lib_office_access', 'SubmitEntryRequest', [requestData, options] );

	env = new Object;
	env.login = officeAccessSystem.login;
	env.password = StrStdDecrypt( officeAccessSystem.password_ed );
	env.oaSystem = officeAccessSystem;
	env.access_token = undefined;
	
	if ( ! officeAccessSystem.std_office_access_system_id.HasValue )
	{
		eval( officeAccessSystem.code );
		return;
	}

	if ( ! AppModuleUsed( 'conn_' + officeAccessSystem.std_office_access_system_id ) )
		throw UiError( 'Integration module is not enabled' );

	if ( officeAccessSystem.std_office_access_system_id.ForeignElem.use_server_address && ! officeAccessSystem.server_address.HasValue )
		throw UiError( 'Server address has not been specified' );

	//if ( officeAccessSystem.std_office_access_system_id.ForeignElem.use_access_token && ! officeAccessSystem.access_token.HasValue )
		//throw UiError( 'Access token has not been specified' );

	//if ( officeAccessSystem.std_office_access_system_id.ForeignElem.use_access_token_2 && ! officeAccessSystem.refresh_token.HasValue )
		//throw UiError( 'Access token 2 has not been specified' );

	lib = OpenCodeLib( '//conn_' + officeAccessSystem.std_office_access_system_id + '/' + officeAccessSystem.std_office_access_system_id + '_lib_' + officeAccessSystem.std_office_access_system_id + '.js' );
	return lib.SubmitRequest( env, requestData, options, officeAccessSystem );
}


function HandleSubmitTestRequest( officeAccessSystem )
{
	if ( officeAccessSystem.test_request.lastname == '' )
		throw UiError( UiText.errors.required_field_not_set + ': ' + officeAccessSystem.test_request.lastname.Title );

	if ( officeAccessSystem.test_request.firstname == '' )
		throw UiError( UiText.errors.required_field_not_set + ': ' + officeAccessSystem.test_request.firstname.Title );

	if ( ! officeAccessSystem.test_request.date.HasValue )
		officeAccessSystem.test_request.date = CurDate;
	
	if ( officeAccessSystem.Doc.IsChanged )
		officeAccessSystem.Screen.SaveDoc();

	requestData = new Object;
	requestData.person = officeAccessSystem.test_request;
	requestData.date = officeAccessSystem.test_request.date;

	respData = SubmitEntryRequest( requestData, {officeAccessSystemID:officeAccessSystem.id} );
	
	lib_base.show_info_message( ActiveScreen, UiText.messages.request_submitted );
}


function HandleSubmitEntryPassRequestForCalendarEntry( event )
{
	requestData = new Object;

	if ( event.entry_pass_request_eid.HasValue )
		requestData.eid = event.entry_pass_request_eid;
	else
		requestData.eid = undefined;

	requestData.person = event.candidate_id.ForeignElem;
	requestData.date = event.date;

	respData = SubmitEntryRequest( requestData );

	if ( respData != undefined && respData.eid != undefined )
		event.entry_pass_request_eid = respData.eid;

	lib_base.show_info_message( ActiveScreen, UiText.messages.request_submitted );
}