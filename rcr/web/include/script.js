function SxModalDialog( sURL, vArguments, sFeatures ) 
{
	if (sURL==null||sURL=='')
	{ 
		alert ("Invalid URL input."); 
		return false; 
	} 
	if (vArguments==null||vArguments=='') 
	{ 
		vArguments=''; 
	} 
	if (!sFeatures||sFeatures=='') 
	{ 
		sFeatures='status:no;dialogWidth:700px;dialogHeight:550px;help:no;resizable:1'; 
	} 

	if ( window.showModalDialog == undefined ) 
	{ 
		alert( 'This feature requires Internet Explorer' );
		return false;
	}

	window.showModalDialog( sURL, vArguments, sFeatures );
	return true;


	sFeatures = sFeatures.replace(/ /gi,''); 
	aFeatures = sFeatures.split(";"); 
	sWinFeat = "modal=yes,directories=0,menubar=0,titlebar=0,toolbar=0,"; 
	for ( x in aFeatures ) 
	{ 
		aTmp = aFeatures[x].split(":"); 
		sKey = aTmp[0].toLowerCase(); 
		sVal = aTmp[1]; 
		switch (sKey) 
		{ 
			case "dialogheight": 
				sWinFeat += "height="+sVal+","; 
				pHeight = sVal; 
				break; 
			case "dialogwidth": 
				sWinFeat += "width="+sVal+","; 
				pWidth = sVal; 
				break; 
			case "dialogtop": 
				sWinFeat += "screenY="+sVal+","; 
				break; 
			case "dialogleft": 
				sWinFeat += "screenX="+sVal+","; 
				break; 
			case "resizable": 
				sWinFeat += "resizable="+sVal+","; 
				break; 
			case "status": 
				sWinFeat += "status="+sVal+","; 
				break; 
			case "center": 
				if ( sVal.toLowerCase() == "yes" ) 
				{ 
					sWinFeat += "screenY="+((screen.availHeight-pHeight)/2)+","; 
					sWinFeat += "screenX="+((screen.availWidth-pWidth)/2)+","; 
				} 
				break; 
		} 
	}
	if (vArguments!=null&&vArguments!='') 
		curModalWindow.dialogArguments=vArguments;
	return true;
}


function SxSelectForeignObject( fieldName, viewName, filter )
{
	dispFieldName = fieldName.replace( '_id', '_name' );

	queryStr = 'view_id=' + viewName;
	filterQueryStr = '';
	
	if ( filter != undefined )
	{
		for ( propName in filter )
		{
			if ( filterQueryStr != '' )
				filterQueryStr += '&';

			filterQueryStr += propName + '=' + filter[propName];
		}
	}

	queryStr += '&view_filter=' + escape( filterQueryStr );
	
	args = new Object();
	
	SxModalDialog( SxBuildDirectOuterLink( 'object_select.htm', queryStr ), args, '' );
	
	if ( args.object_id == undefined )
		return;
	
	document.getElementById( fieldName ).value = args.object_id;
	document.getElementById( dispFieldName ).value = args.object_primary_disp_name;
}


function SxSelectOuterObject( catalogName )
{
	selected_object_ids = document.all['rr_person_eid'].value;

	var pars=new Object();
	var strAttr="status:no;dialogWidth:780px;dialogHeight:550px;help:no;resizable:1";
	pars.selected_object_ids = document.getElementById( 'rr_person_eid' ).value;
	pars.can_be_empty = true;
	pars.show_all = true;
//		pars.display_object_ids = null;

	xqueryQual = '';

	if ( window.location.href.indexOf( '.rgs.ru/' ) >= 0 )
		xqueryQual = '$elem/org_id = 113909422348986546 or $elem/org_id = 113909422348986548 or $elem/org_id = 113909422348986541';

	xShowModalDialog( 'dlg_select.html?catalog_name=collaborator&typein=1&multi_select=1&xquery_qual=' + escape( xqueryQual ) + '&rand='+ Math.random(), pars, strAttr );

	if ( ! pars.handle )
		return;

	if ( pars.elemNamesArray == undefined )
		pars.elemNamesArray = new Array;

	var		tempStr = "";
	var		index;

	for ( index = 0; index < pars.elemNamesArray.length; index++ )
	{
		if ( index != 0 )
			tempStr += ", ";
		
		tempStr += pars.elemNamesArray[index];
	}


	//debugger;
	//if ( pars.selected_object_ids == '' )
		//return;


	document.getElementById( 'rr_person_eid' ).value = pars.selected_object_ids;
	document.getElementById( 'rr_person_name' ).value = tempStr;//pars.elemNamesArray.join( ', ' );
}


function SxBuildDirectOuterLink( path, queryStr )
{
	if ( gSxOuterEnv == undefined )
		return path + ( queryStr != undefined ? '?' + queryStr : '' );

	link = gSxOuterEnv.outerDirectUrl;
	link += '?inner_url_path=' + path;

	if ( queryStr != undefined )
		link += String( '&' + queryStr ).replace( /&/g, '&inner_' );

	return link;
}


function SxUpdateFormData( srcNode )
{
	var		form, inputNode;
	var		inputsArray, strArray, obj;
	var		reqBody;
	var		i;
	var		resp;
	var		propName, propVal;

	form = srcNode.form;
	inputsArray = form.getElementsByTagName( 'input' );
	
	reqBody = "";
	
	for ( i = 0; i < inputsArray.length; i++ )
	{
		inputNode = inputsArray[i];
		if ( inputNode.type == "radio" )
		{
			if ( ! inputNode.checked )
				continue;
		}

		if ( reqBody != "" )
			reqBody += "&";

		reqBody += inputNode.name + "=" + escape( inputNode.value );
	}

	//alert( reqBody );

	resp = BmHttpRequest( "post", SxBuildDirectOuterLink( "rr_poll_auto_update_form.htm" ), reqBody, {"Content-Type":"application/x-www-form-urlencoded"} );
	//alert( resp.body );

	strArray = resp.body.split( '&' );

	for ( i = 0; i < strArray.length; i++ )
	{
		obj = strArray[i].split( '=' );
		propName = unescape( obj[0] );
		propVal = unescape( obj[1] );

		inputNode = document.getElementsByName( propName )[0];
		inputNode.value = propVal;
	}
}


function BmHttpRequest( method, url, reqBody, reqHeaders, options )
{
	var		xhReq;
	var		headerName;
	var		resp;
	var		pos;

	if ( options == undefined )
		options = new Object;

	if ( window.XMLHttpRequest )
		xhReq = new XMLHttpRequest();
	else
		xhReq = new ActiveXObject( 'Microsoft.XMLHTTP' );

	xhReq.open( method, url, false );

	if ( reqHeaders != undefined )
	{
		for ( headerName in reqHeaders )
		{
			xhReq.setRequestHeader( headerName, reqHeaders[headerName] );
		}
	}

	xhReq.send( reqBody );

	if ( xhReq.status != 200 && ! options.ignoreErrors )
	{
		var	errDesc = unescape( xhReq.getResponseHeader( 'X-Error-Message' ) );
		/*if ( ( pos = errDesc.indexOf( "$USER:" ) >= 0 ) )
		{
			errDesc = errDesc.slice( pos + 6 );
			throw errDesc;
		}*/

		throw( xhReq.status + ' ' + xhReq.statusText + '\r\n' + errDesc );
	}

	resp = new Object;
	resp.respCode = xhReq.status;
	resp.body = xhReq.responseText;
	//nativeDoc = xhReq.responseXML;

	resp.contentType = xhReq.getResponseHeader( "Content-Type" );
	if ( resp.contentType != null )
	{
		if ( ( pos = resp.contentType.indexOf( ';' ) ) >= 0 )
			resp.contentType = Trim( resp.contentType.slice( 0, pos ) );
	}
	else
	{
		resp.contentType = undefined;
	}

	return resp;
}


