function check_outer_auth( request, outerPersonEid )
{
	person = lib_base.query_opt_record_by_key( persons, outerPersonEid, 'eid' );
	if ( person == undefined )
		throw UserError( 'Person is not found by eid: ' + outerPersonID );

	request.AuthObjectUrl = person.ObjectUrl;
}


function create_soap_arg_elem()
{
	var			externalTest;

	argElem = OpenDocFromStr( '<soap:Envelope></soap:Envelope>' ).TopElem;
	argElem.AddAttr( 'xmlns:soap', 'http://schemas.xmlsoap.org/soap/envelope/' );

	//header = argElem.AddChild( 'soap:Header' );

	return argElem;
}


function call_soap_method( serviceUrl, argElem, respElem )
{
	coreElem = argElem[0][0];

	reqStr = argElem.GetXml( {DocHeader:1} );
	PutUrlData( 'x-local://Logs/zz_soap_req.xml', reqStr );

	//resp = HttpRequest( serviceUrl, 'post', reqStr, 'Ignore-Errors: 0\nContent-type: text/xml; charset=utf-8\nSOAPAction: http://www.datex-soft.com/uri/' + argElem[0][0].Name );
	resp = HttpRequest( serviceUrl, 'post', reqStr, 'Ignore-Errors: 1\nContent-type: text/xml' );

	//respStr = '<?xml version="1.0" encoding="windows-1251"?>\r\n' + DecodeCharset( resp.Body, 'utf-8' );
	respStr = resp.Body;
	PutUrlData( 'x-local://Logs/zz_soap_resp.xml', respStr );

	respDoc = OpenDocFromStr( respStr, 'drop-namespaces=1' );
	
	if ( respDoc.TopElem.Name != 'Envelope' )
		throw 'Invalid SOAP response';
	
	respBody = respDoc.Envelope.Body;

	if ( respBody.ChildExists( 'Fault' ) )
	{
		throw respBody.Fault.faultstring;
	}

	if ( resp.RespCode != 200 )
		throw 'HTTP ' + resp.RespCode;

	srcRespElem = respBody.Child( coreElem.Name + 'Response' );
	if ( respElem == undefined )
		return srcRespElem;

	if ( srcRespElem.ChildNum == 1 && srcRespElem[0].Name == respElem.Name )
	{
		respElem.LoadData( srcRespElem[0].Xml );
		//respElem.AssignElem( srcRespElem[0] );
	}
	else
		respElem.AssignElem( srcRespElem );

	return respElem;
}


function on_check_linked_system_auth( Url, Login, Password, AuthType )
{
	if ( AuthType == 'ntlm' )
	{
		if ( ( obj = StrOptScan( Login, '%s\\%s' ) ) != undefined )
			userLogin = obj[1];
		else
			userLogin = Login;

		userLogin = StrLowerCase( userLogin );
	}
	else
	{
		userLogin = Login;
	}

	linkedSystem = ArrayOptFirstElem( XQuery( 'for $elem in linked_systems where $elem/use_auth = true() and $elem/login = \'' + userLogin + '\' and $elem/is_active = true() return $elem' ) );
	if ( linkedSystem == undefined )
		return;

	if ( AuthType != 'ntlm' )
	{
		if ( linkedSystem.password == '' )
			return;

		if ( linkedSystem.password != Password )
			return;
	}

	return linkedSystem;
}


