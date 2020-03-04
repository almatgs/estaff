function OnWebRequest( Request )
{
	/*if ( ( obj = StrOptScan( Request.UrlPath, '/api/mobile_ui/mcaller_web_%s' ) ) != undefined )
	{
		Request.HandlerUrl = 'x-app://conn_mcaller/mcaller_web_' + obj[0];
		return false;
	}*/

	if ( ( obj = StrOptScan( Request.UrlPath, '/api/mobile_ui/%s' ) ) != undefined )
	{
		handlerUrl = 'x-app://conn_mcaller/mobile_ui/' + obj[0];
		if ( UrlPathSuffix( Request.UrlPath ) == '' )
			handlerUrl += '.htm';

		Request.HandlerUrl = handlerUrl;
		return false;
	}

	if ( ( obj = StrOptScan( Request.UrlPath, '/api/mobile/%s' ) ) != undefined )
		OnApiRequest( Request, obj[0] );
	//else if ( ( obj = StrOptScan( Request.UrlPath, '/api/mobile_ui/%s' ) ) != undefined )
		//OnWebRequesApiMobileUi( Request, obj[0] );
	else
		return false;

	return true;
}


function OnApiRequest( Request, methodName )
{
	Request.UseJsonFault = true;
	if ( Request.Method != 'POST' )
		throw UserError( 'HTTP POST method is required' );

	if ( Request.Header.GetOptProperty( 'Content-Type' ) != 'application/json' )
		throw UserError( 'Content-Type must be application/json' );

	try
	{
		reqArg = ParseJson( Request.Body );
	}
	catch ( e )
	{
		throw UserError( 'Invalid JSON in request body' );
	}

	CheckApiEnabled( Request );

	Request.CheckLdsAuth();

	switch ( methodName )
	{
		case 'check_login':
			OnApiCheckLogin( Request, reqArg );
			break;

		case 'query_contact':
			OnApiQueryContact( Request, reqArg );
			break;

		case 'get_contacts':
			OnApiGetContacts( Request, reqArg );
			break;

		default:
			throw UserError( 'No such method: ' + methodName );
	}
}


function CheckApiEnabled( Request )
{
	if ( ! global_settings.mcaller.allow_access )
		throw UiError( 'Mobile application access is disabled' );
}


function OnApiCheckLogin( Request, reqArg )
{
	msgStr = UiText.messages.checking_successful;
	/*if ( Request.AuthObject != undefined )
	{
		msgStr += '.\r\n\r\n';
		msgStr += UiText.objects.user + ':\r\n';
		msgStr += respObj.fullname + '\r\n';
		
		if ( respObj.HasProperty( 'email' ) )
			msgStr += respObj.email + '\r\n';
	}*/

	respObj = new Object;
	respObj.status = 'success';
	respObj.message = msgStr;
	
	Request.RespWriteMode = 'single';
	Request.RespContentType = 'application/json';
	Request.RespStream.WriteStr( EncodeCharset( EncodeJson( respObj ), 'utf-8' ) );
}


function OnApiQueryContact( Request, reqArg )
{
	phone = reqArg.GetOptProperty( 'phone', '' );
	if ( phone == '' )
		throw UserError( 'Argument is required: phone' );

	respObj = new Object;
	respObj.status = 'success';
	respObj.results = new Array;

	queryStr = 'for $elem in candidates where $elem/mobile_phone = ' + XQueryLiteral( phone ) + ' return $elem';
	array1 = XQuery( queryStr );

	queryStr = 'for $elem in persons where $elem/mobile_phone = ' + XQueryLiteral( phone ) + ' and $elem/is_candidate = false() return $elem';
	array2 = XQuery( queryStr );

	array = ArrayUnion( array1, array2 );
	array = ArraySort( array, 'last_mod_date', '-' );

	hasAllowedEntries = false;
	hasProhibitedEntries = false;

	for ( person in array )
	{
		if ( ! person.CheckAccessForCurrentUser() )
		{
			hasProhibitedEntries = true;
			continue;
		}

		hasAllowedEntries = true;

		destResult = new Object;
		destResult.person = new Object;
		destResult.person.fullname = person.fullname;
		
		if ( person.is_candidate )
			destResult.person.type_name = UiText.objects.candidate;
		else if ( person.is_own_person )
			destResult.person.type_name = UiText.objects.employee;
		else
			destResult.person.type_name = UiText.objects.contact_person;

		if ( person.org_id.HasValue && ! person.is_candidate && ! person.is_own_person )
		{
			destResult.org = new Object;
			destResult.org.name = person.org_id.ForeignElem.name;
		}
		else
		{
			destResult.org = null;
		}

		destResult.person.gender_id = person.gender_id;
		respObj.results.push( destResult );
	}
	
	if ( hasProhibitedEntries && ! hasAllowedEntries )
	{
		//throw UiError( UiText.errors.permission_denied );
		destResult = new Object;
		destResult.person = new Object;
		destResult.person.fullname = UiText.errors.permission_denied;
		respObj.results.push( destResult );
	}

	Request.RespWriteMode = 'single';
	Request.RespContentType = 'application/json';
	Request.RespStream.WriteStr( EncodeCharset( EncodeJson( respObj ), 'utf-8' ) );
}


function OnApiGetContacts( Request, reqArg )
{
	if ( reqArg != undefined && reqArg.GetOptProperty( 'min_date' ) != undefined )
		minDate = RawSecondsToDate( reqArg.min_date );
	else
		minDate = DateOffset( DateNewTime( CurDate ), 0 - 365 * 86400 );

	if ( reqArg != undefined && reqArg.GetOptProperty( 'page' ) != undefined )
		pageIndex = Int( reqArg.page );
	else
		pageIndex = 0;

	if ( reqArg != undefined && reqArg.GetOptProperty( 'page_size' ) != undefined )
		pageSize = Int( reqArg.page_size );
	else
		pageSize = 2;

	if ( pageSize < 2 || pageSize > 1000 )
		throw UserError( 'Invalid page size' );

	//if ( reqArg != undefined && reqArg.GetOptProperty( 'unique' ) != undefined )
		//useUnique = reqArg.unique;
	//else
		useUnique = false;

	respObj = new Object;
	respObj.status = 'success';
	respObj.results = new Array;

	queryStr = 'for $elem in persons where $elem/last_mod_date >= ' + XQueryLiteral( minDate );
	queryStr += ' and $elem/mobile_phone != \'\'';
	
	if ( Request.AuthObject.access_role_id.ForeignElem.prohibit_view_other_user_candidates )
		queryStr += ' and $elem/user_id = ' + Request.AuthObject.id.XQueryLiteral;
	else if ( Request.AuthObject.access_role_id.ForeignElem.prohibit_view_other_group_candidates )
		queryStr += ' and $elem/group_id = ' + Request.AuthObject.main_group_id.XQueryLiteral;
		
	queryStr += ' order by $elem/last_mod_date';
	queryStr += ' return $elem/Fields( "id","is_derived","is_candidate","fullname","state_id","last_mod_date","org_id","position_name" )';
	
	queryResult = lib_server_api.RunQueryWithCache( queryStr, pageIndex, pageSize, {storeTimeout:20} );
	
	array = queryResult.array;

	if ( useUnique )
	{
		array = ArraySort( array, 'lib_telephony.AdjustPhoneNumber( mobile_phone )', '+', 'last_mod_date', '-' );
	}

	prevPhone = undefined;

	for ( person in array )
	{
		phone = lib_telephony.AdjustPhoneNumber( person.mobile_phone );
		if ( phone == '' )
			continue;

		if ( useUnique && phone == prevPhone )
			continue;

		destResult = new Object;
		destResult.phone = phone;
		destResult.person = new Object;
		destResult.person.fullname = person.fullname;
		
		if ( person.is_candidate )
			destResult.person.type_name = UiText.objects.candidate;
		else if ( person.is_own_person )
			destResult.person.type_name = UiText.objects.employee;
		else
			destResult.person.type_name = UiText.objects.contact_person;

		if ( person.org_id.HasValue && ! person.is_candidate && ! person.is_own_person )
		{
			destResult.org = new Object;
			destResult.org.name = person.org_id.ForeignElem.name;
		}
		else
		{
			destResult.org = null;
		}

		respObj.results.push( destResult );

		prevPhone = phone;
	}
	
	respObj.more = queryResult.hasMore;
	respObj.total = queryResult.totalCount;

	Request.RespWriteMode = 'single';
	Request.RespContentType = 'application/json';
	Request.RespStream.WriteStr( EncodeCharset( EncodeJson( respObj ), 'utf-8' ) );
}


function OnWebRequesApiMobileUi( Request, methodName )
{
	if ( Request.Method != 'GET' )
		throw UserError( 'HTTP GET method is required' );

	Request.RespWriteMode = 'single';
	Request.RespContentType = 'text/html; charset=utf-8';

	reqArg = UrlQuery( Request.Url );
	//Request.CheckLdsAuth();
	CheckMobileUiAuth( Request, reqArg );

	switch ( methodName )
	{
		case 'query_contact':
			ProcessApiMobileUiQueryContact( Request, reqArg );
			break;

		case 'add_contact':
			ProcessApiMobileUiAddContact( Request, reqArg );
			break;

		default:
			throw UserError( 'No such method: ' + methodName );
	}
}


function ProcessApiMobileUiQueryContact( Request, reqArg )
{
	phone = reqArg.GetOptProperty( 'phone', '' );
	if ( phone == '' )
		throw UserError( 'Argument is required: phone' );

	if ( phone == '' )
		throw UserError( 'Empty phone' );

	fullname = reqArg.GetOptProperty( 'fullname', '' );
	lastCallTime = reqArg.GetOptProperty( 'last_call_time', '' );

	destStream = Request.RespStream;
	ExportPageHeader( destStream, UiText.titles.phone_search_in_database );

	destStream.WriteStr( '<h2>' );
	ExportPageText( destStream, lib_phone_details.FormatPhone( phone ) );
	destStream.WriteStr( '</h2>' );

	hasAllowedEntries = false;
	hasProhibitedEntries = false;

	entriesArray = QueryContactsByPhone( phone );
	if ( entriesArray.length == 0 )
	{
		destStream.WriteStr( '<p style="text-align:center;">' );
		ExportPageText( destStream, UiText.errors.phone_not_found_in_database );
		destStream.WriteStr( '</p>' );
	}
	else
	{
		count = 0;

		for ( entry in entriesArray )
		{
			if ( ! entry.CheckAccessForCurrentUser() )
			{
				hasProhibitedEntries = true;
				continue;
			}

			hasAllowedEntries = true;
			person = entry;

			destStream.WriteStr( '<h2 class="ContactName">' );
			ExportPageText( destStream, person.fullname );
			destStream.WriteStr( '</h2>' );

			if ( person.is_candidate )
			{
				destStream.WriteStr( '<p class="ContactType">' );
				ExportPageText( destStream, UiText.objects.candidate );
				destStream.WriteStr( '</p>' );
			}
			else if ( person.is_own_person )
			{
				destStream.WriteStr( '<p class="ContactType">' );
				ExportPageText( destStream, UiText.objects.employee );
				destStream.WriteStr( '</p>' );
			}
			else
			{
				//ExportPageText( destStream, UiText.objects.contact_person );
			}

			if ( person.org_id.HasValue && ! person.is_candidate && ! person.is_own_person )
			{
				destStream.WriteStr( '<p class="OrgName">' );
				ExportPageText( destStream, person.org_id.ForeignElem.name );
				destStream.WriteStr( '</p>' );

				if ( person.position_name.HasValue )
				{
					destStream.WriteStr( '<p class="PositionName">' );
					ExportPageText( destStream, person.position_name );
					destStream.WriteStr( '</p>' );
				}
			}

			if ( entriesArray.length > 1 )
				destStream.WriteStr( '<div class="Delim"></div>' );

			count++;
		}

		if ( hasProhibitedEntries && ! hasAllowedEntries )
		{
			destStream.WriteStr( '<p style="text-align:center;">' );
			ExportPageText( destStream, UiText.errors.permission_denied );
			destStream.WriteStr( '</p>' );
		}
	}

	ExportPageFooter( destStream );
}


function ProcessApiMobileUiAddContact( Request, reqArg )
{
	phone = reqArg.GetOptProperty( 'phone', '' );
	if ( phone == '' )
		throw UserError( 'Argument is required: phone' );

	fullname = reqArg.GetOptProperty( 'fullname', '' );
	lastCallTime = reqArg.GetOptProperty( 'last_call_time', '' );

	destStream = Request.RespStream;
	ExportPageHeader( destStream, UiText.titles.phone_search_in_database );

	destStream.WriteStr( '<p><b>Add contact request is accepted</b></p>' );
	destStream.WriteStr( '<p>Phone: <b>' + phone + '</b></p>' );
	destStream.WriteStr( '<p>Fullname: <b>' + fullname + '</b></p>' );
	destStream.WriteStr( '<p>Last call time: <b>' + ( lastCallTime != '' ? RawSecondsToDate( Int( lastCallTime ) ) : '' ) + '</b></p>' );

	ExportPageFooter( destStream );
}


function CheckMobileUiAuth( Request, reqArg )
{
	userLogin = reqArg.login;
	if ( userLogin == '' )
		throw UserError( 'Empty login' );

	user = ArrayOptFirstElem( XQuery( 'for $elem in users where $elem/login = \'' + userLogin + '\' and $elem/is_active = true() return $elem' ) );
	if ( user == undefined )
	{
		Request.SetWrongLdsAuth();
		Cancel();
	}

	if ( ! lib_app2.CheckMobilePasswordHash( user, reqArg.password_hash ) )
	{
		//Request.SetWrongLdsAuth();

		destStream = Request.RespStream;
		ExportPageHeader( destStream, UiText.titles.phone_search_in_database );

		destStream.WriteStr( '<p>' );
		ExportPageText( destStream, UiText.errors.invalid_login );
		destStream.WriteStr( '</p>' );

		ExportPageFooter( destStream );
		Cancel();
	}

	Request.AuthObject = user;
	return user;
}


function ExportPageHeader( destStream, pageTitle )
{
	destStream.WriteStr( '<!DOCTYPE html>' );
	destStream.WriteStr( '<html lang="' + lib_base.InternalToIsoLangID( AppUiLangID ) + '">' );
	destStream.WriteStr( '<head>' );
	destStream.WriteStr( '<meta charset="utf-8"/>' );
	destStream.WriteStr( '<title>' );
	ExportPageText( destStream, pageTitle )
	destStream.WriteStr( '</title>' );
	destStream.WriteStr( '<meta name="viewport" content="width=device-width, initial-scale=1">' );
	destStream.WriteStr( '<meta name="format-detection" content="telephone=no">' );
	destStream.WriteStr( '<link rel="stylesheet" href="style.css">' );
 
	destStream.WriteStr( '</head>' );
	destStream.WriteStr( '<body>' );
}


function ExportPageFooter( destStream, pageTitle )
{
	destStream.WriteStr( '</body>' );
	destStream.WriteStr( '</html>' );
}


function ExportPageText( destStream, str )
{
	destStream.WriteStr( HtmlEncode( EncodeCharset( str, 'utf-8' ) ) );
}


function QueryContactsByPhone( phone )
{
	queryStr = 'for $elem in persons where $elem/mobile_phone = ' + XQueryLiteral( phone ) + ' order by $elem/last_mod.date descending';
	queryStr += ' return $elem/Fields( "id","is_derived","is_candidate","fullname","state_id","last_mod_date","org_id","position_name" )';

	array = ArraySelectAll( XQuery( queryStr ) );
	if ( array.length != 0 )
		return array;

	return [];
}