function ReplicateDb( scenarioID )
{
	scenarioDoc = OpenDoc( GetScenarioDocUrl( scenarioID ) );
	scenario = scenarioDoc.TopElem;
	
	statDocUrl = GetStatDocUrl( scenarioID );
	RegisterAutoDoc( statDocUrl, 'base1_replica_stat.xmd' );
	statDoc = OpenDoc( statDocUrl );
	stat = statDoc.TopElem;

	EnableLog( 'replica', true );

	//task = new BackgroundTask;
	//task.ShowProgress = true;
	//task.CallMethod( 'lib_replica_v2', 'ReplicateDbCore', [scenario] );
	ReplicateDbCore( scenario, stat );

	statDoc.Save();
}


function GetScenarioDocUrl( scenarioID )
{
	return 'x-local://data/static/replica_scenario_' + scenarioID + '.xml';
}


function GetStatDocUrl( scenarioID )
{
	return 'x-local://data/static/replica_stat_' + scenarioID + '.xml';
}



function CreateScenario( scenarioID, serverAddress, login, password )
{
	scenarioDoc = OpenNewDoc( 'base1_replica_scenario.xmd' );
	scenarioDoc.Url = GetScenarioDocUrl( scenarioID );
	scenario = scenarioDoc.TopElem;

	scenario.id = scenarioID;
	scenario.server_address = serverAddress;
	scenario.login = login;
	scenario.password_ed = StrStdEncrypt( password );

	scenarioDoc.Save();
}



function ReplicateDbCore( scenario, stat )
{
	LogEvent( 'replica', '-- Started replication using scenario: ' + scenario.id );
	LogEvent( 'replica', 'Last run date: ' + stat.last_run_date );
	//LogEvent( 'replica', 'Remote last modification date: ' + scenario.remote_last_mod_date );

	progress = new TaskProgress;
	progress.TaskName = StrReplace( UiText.messages.replicating_with_server_xxx, '%s', scenario.server_address );
	startDate = CurDate;

	SendStaticObjects( scenario, stat, progress );

	for ( objectForm in DefaultDb.ObjectForms )
		SendObjectTypeObjects( scenario, stat, objectForm );

	stat.last_run_date = startDate;
	LogEvent( 'replica', '-- Finished replication using scenario: ' + scenario.id );
}


function SendStaticObjects( scenario, stat, progress )
{
	objectUrls = [];
	objectUrls.push( 'x-local://data/static/base1_fields_usage.xml' );
	objectUrls.push( 'x-local://data/static/global_settings.xml' );
	
	for ( cardObjectType in card_object_types )
	{
		if ( cardObjectType.use_auto_coding )
			objectUrls.push( 'x-local://data/coding/coding_' + cardObjectType.id + '.xml' );
		
		if ( cardObjectType.use_csd )
			objectUrls.push( 'x-local://data/csd/csd_' + cardObjectType.id + '.xmc' );
	}

	for ( i = 0; i < objectUrls.length; )
	{
		objectUrl = objectUrls[i];
		if ( ! UrlExists( objectUrl ) )
			objectUrls.splice( i, 1 );
		else
			i++;
	}

	modObjectUrls = new Array;

	for ( objectUrl in objectUrls )
	{
		try
		{
			resp = DoRemoteRequest( scenario, '/replica_service/get_url.htm?url=' + UrlEncode( objectUrl ) );
		}
		catch ( e )
		{
			resp = undefined;
		}

		if ( resp == undefined || resp.Body != LoadUrlData( objectUrl ) )
			modObjectUrls.push( objectUrl );
	}

	if ( modObjectUrls.length == 0 )
		return;

	for ( objectUrl in modObjectUrls )
	{
		dataStr = LoadUrlData( objectUrl );
		DoRemoteRequest( scenario, '/replica_service/put_url.htm?url=' + UrlEncode( objectUrl ), 'put', dataStr );
	}

	LogEvent( 'replica', 'Static objects: ' + objectUrls.length + ' total, ' + modObjectUrls.length + ' sent' );

	if ( ArrayOptFind( modObjectUrls, 'StrContains( This, \'/csd/\' )' ) )
	{
		LogEvent( 'replica', '!!! CSD modified' );
		throw UserError( 'CSD modified. Reboot needed.' );
	}
}


function SendObjectTypeObjects( scenario, stat, objectForm )
{
	catalogName = lib_base.object_name_to_catalog_name( objectForm.TopElem.Name );
	if ( catalogName == 'agents' )
		return;

	//if ( catalogName != 'mail_templates' )
		//return;

	catalog = DefaultDb.GetOptCatalog( catalogName );
	recordFormElem = catalog.Form.TopElem[0];
	hasDocOnlyFields = ( ArrayCount( objectForm.TopElem ) != ArrayCount( recordFormElem ) );
	
	lastModDateFieldName = undefined;
	if ( objectForm.TopElem.ChildExists( 'last_mod_date' ) )
		lastModDateFieldName = 'last_mod_date';

	if ( lastModDateFieldName == undefined )
	{
		switch ( catalogName )
		{
			case 'parsed_messages':
				lastModDateFieldName = 'date';
				break;

			case 'resp_candidates':
				lastModDateFieldName = 'resp_date';
				break;

			case 'vacancy_instances':
				return;
		}
	}

	query = 'for $elem in ' + catalogName;

	if ( lastModDateFieldName != undefined && stat.last_run_date.HasValue )
		query += ' where $elem/' + lastModDateFieldName + ' >= ' + XQueryLiteral( DateOffset( stat.last_run_date, 0 - 600 ) );

	query += ' order by $elem/id';
	
	if ( ! hasDocOnlyFields && lastModDateFieldName == undefined )
		query += ' return $elem';
	else if ( lastModDateFieldName != undefined )
		query += ' return $elem/Fields( "id","is_derived","' + lastModDateFieldName + '" )';
	else
		query += ' return $elem/Fields( "id","is_derived" )';

	array = XQuery( query );
	array = ArraySelect( array, '!This.ChildExists( \'is_derived\' ) || ! This.is_derived' );
	array = ArraySelect( array, 'This.id.HasValue' );

	if ( hasDocOnlyFields && lastModDateFieldName == undefined )
	{
		//DebugMsg( catalogName );
		docsArray = ArrayExtract( array, 'OpenDoc( This.ObjectUrl ).TopElem' );
		array = docsArray;
	}

	reqParam = new Object;
	reqParam.query = query;
	reqParam.use_full_doc = ( hasDocOnlyFields && lastModDateFieldName == undefined );

	resp = DoRemoteRequest( scenario, '/replica_service/query_objects.htm', 'post', UrlEncodeQueryExt( reqParam ) );
	//remoteArray = OpenDocFromStr( resp.Body ).TopElem;
	remoteArray = LoadElemsFromStr( resp.Body );

	//LogEvent( 'replica', ArrayMerge( array, 'id.XmlValue', ',' ) );
	//LogEvent( 'replica', ArrayMerge( remoteArray, 'id.XmlValue', ',' ) );

	sendIDs = new Array;
	deleteIDs = new Array;

	index = 0;
	remoteIndex = 0;

	while ( true )
	{
		if ( index >= array.length )
		{
			if ( remoteIndex >= remoteArray.length )
				break;
			else
				diff = 1;
		}
		else
		{
			if ( remoteIndex >= remoteArray.length )
				diff = 0 - 1;
			else
			{
				diff = Compare( array[index].id, remoteArray[remoteIndex].id );
			}
		}

				//LogEvent( 'replica', diff );
		if ( diff < 0 )
		{
			//LogEvent( 'replica', array[index].id.XmlValue );
			sendIDs.push( RValue( array[index].id ) );
			index++;
		}
		else if ( diff > 0 )
		{
			if ( lastModDateFieldName == undefined || stat.last_run_date.HasValue || GetOptForeignElem( catalog, remoteArray[remoteIndex].id ) == undefined )
				deleteIDs.push( RValue( remoteArray[remoteIndex].id ) );

			remoteIndex++;
		}
		else
		{
			if ( lastModDateFieldName != undefined )
			{
				if ( array[index].Child( lastModDateFieldName ).Value != remoteArray[remoteIndex].Child( lastModDateFieldName ).Value  )
				{
					sendIDs.push( RValue( array[index].id ) );
				}
			}
			else if ( ! hasDocOnlyFields )
			{
				if ( array[index].Xml != remoteArray[remoteIndex].Xml )
				{
					//DebugMsg( array[index].Xml + '\r\n\r\n' + remoteArray[remoteIndex].Xml );
					sendIDs.push( RValue( array[index].id ) );
				}
			}
			else
			{
				if ( array[index].GetXml() != remoteArray[remoteIndex].GetXml() )
				{
					DebugMsg( array[index].GetXml() + '\r\n\r\n' + remoteArray[remoteIndex].GetXml() );
					sendIDs.push( RValue( array[index].id ) );
				}
			}
		
			index++;
			remoteIndex++;
		}
	}
	
	if ( sendIDs.length == 0 && deleteIDs.length == 0 )
		return;

	for ( id in sendIDs )
	{
		url = ObjectDocUrl( 'data', objectForm.TopElem.Name, id );
		doc = OpenDoc( url );

		stream = new BufStream;
		doc.SaveToStream( stream, 'inline-ext-objects=1' );
		dataStr = stream.DetachStr();

		DoRemoteRequest( scenario, '/replica_service/put_doc.htm?url=' + UrlEncode( url ), 'post', dataStr );
	}

	for ( id in deleteIDs )
	{
		url = ObjectDocUrl( 'data', objectForm.TopElem.Name, id );
		DoRemoteRequest( scenario, '/replica_service/delete_doc.htm?url=' + UrlEncode( url ), 'post', '?' );
	}

	LogEvent( 'replica', catalogName + ': ' + array.length + ' checked, ' + sendIDs.length + ' sent, ' + deleteIDs.length + ' deleted' );
}



function TTT()
{
	CurMethodProgress.ActivityName = UiText.messages.building_local_replica_list;
	list = load_local_list( scenario, CurMethodProgress );

	LogEvent( 'replica', 'Local object list: ' + list.ChildNum );


	CurMethodProgress.ActivityName = UiText.messages.loading_remote_replica_list;
	remoteList = load_remote_list( scenario, CurMethodProgress );

	if ( remoteList.ChildNum != 0 )
		scenario.remote_last_mod_date = ArrayMax( remoteList, 'last_mod_date' ).last_mod_date;

	LogEvent( 'replica', 'Remote object list: ' + remoteList.ChildNum );


	list.Sort( 'object_type_order_index', '+', 'url', '+' );
	remoteList.Sort( 'object_type_order_index', '+', 'url', '+' );

	remove_simple_duplicate_objects( scenario, list, remoteList );
	
	LogEvent( 'replica', 'Adjusted local object list: ' + list.ChildNum );
	LogEvent( 'replica', 'Adjusted remote object list: ' + remoteList.ChildNum );



	sendArray = new Array;
	receiveArray = new Array;

	LogEvent( 'replica', 'Send list: ' + sendArray.length );
	LogEvent( 'replica', 'Receive list: ' + receiveArray.length );
	LogEvent( 'replica', 'Collisions: ' + CurMethodStatistics.collision_count );


	CurMethodProgress.ActivityName = UiText.messages.sending_replica_items;
	CurMethodProgress.TotalCount = ArrayCount( sendArray );
	CurMethodProgress.ItemIndex = 0;

	for ( object in sendArray )
	{
		objectUrl = AbsoluteUrl( object.url, 'x-db-obj://data/' );

		doc = OpenDoc( objectUrl, 'separate=1' );
		CurMethodProgress.ItemName = doc.TopElem.PrimaryDispName;

		doc.WriteDocInfo = false;
		doc.SaveToLds();
		
		CurMethodProgress.ItemIndex++;
		CurMethodStatistics.sent_count++
	}


	CurMethodProgress.ActivityName = UiText.messages.receiving_replica_items;
	CurMethodProgress.TotalCount = ArrayCount( receiveArray );
	CurMethodProgress.ItemIndex = 0;

	for ( object in receiveArray )
	{
		objectUrl = AbsoluteUrl( object.url, 'x-db-obj://data/' );

		doc = OpenNewDoc( DefaultDb.GetObjectForm( ObjectNameFromUrl( objectUrl ) ).Url, 'separate=1' );
		doc.Url = objectUrl;
		doc.LoadFromLds();

		CurMethodProgress.ItemName = doc.TopElem.PrimaryDispName;

		doc.WriteDocInfo = false;
		doc.Save();
		
		CurMethodProgress.ItemIndex++;
		CurMethodStatistics.received_count++
	}

	

	trashList = load_local_trash_list( scenario, CurMethodProgress );

	CurMethodProgress.ActivityName = UiText.messages.sending_deleted_replica_items;
	CurMethodProgress.TotalCount = ArrayCount( trashList );
	CurMethodProgress.ItemIndex = 0;

	for ( object in trashList )
	{
		objectUrl = AbsoluteUrl( object.url, 'x-db-obj://data/' );

		CurMethodProgress.ItemName = objectUrl;
		
		try
		{
			LdsDeleteDoc( objectUrl );
			CurMethodStatistics.sent_del_count++
		}
		catch ( e )
		{
			'Unable to delete object from remote server: ' + e;
		}

		CurMethodProgress.ItemIndex++;
	}



	remoteTrashList = load_remote_trash_list( scenario, CurMethodProgress );

	CurMethodProgress.ActivityName = UiText.messages.receiving_deleted_replica_items;
	CurMethodProgress.TotalCount = ArrayCount( remoteTrashList );
	CurMethodProgress.ItemIndex = 0;

	for ( object in remoteTrashList )
	{
		objectUrl = AbsoluteUrl( object.url, 'x-db-obj://data/' );

		CurMethodProgress.ItemName = objectUrl;
		
		try
		{
			DeleteDoc( objectUrl );
			CurMethodStatistics.received_del_count++
		}
		catch ( e )
		{
			'Unable to delete object: ' + e;
		}

		CurMethodProgress.ItemIndex++;
	}


	
	
	scenario.local_last_mod_date = startDate;
	scenario.Doc.Save();

	LogEvent( 'replica', '-- Finished replication with ' + scenario.server_address );
}



function load_local_list( scenario, methodProgress )
{
	list = OpenNewDoc( 'base1_replica_objects.xmd' ).TopElem;
	objectTypeOrderIndex = 0;

	for ( objectForm in DefaultDb.ObjectForms )
	{
		if ( ! objectForm.TopElem.ChildExists( 'last_mod_date' ) )
			continue;

		if ( objectForm.TopElem.Name == 'user' || objectForm.TopElem.Name == 'group' )
			continue;

		load_local_object_list( scenario, methodProgress, objectForm, objectTypeOrderIndex, list );
		objectTypeOrderIndex++;
	}

	return list;
}
	

function load_local_trash_list( scenario, methodProgress )
{
	list = OpenNewDoc( 'base1_replica_objects.xmd' ).TopElem;

	if ( ! scenario.local_last_mod_date.HasValue )
		return list;

	query = 'for $elem in trash_objects';
	query += ' where $elem/del_date >= ' + scenario.local_last_mod_date.XQueryLiteral;
	query += ' return $elem';

	array = XQuery( query );

	for ( record in array )
	{
		if ( record.ChildExists( 'is_derived' ) && record.is_derived )
			continue;

		object = list.AddChild();
		object.url = get_object_short_url( ObjectDocUrl( 'data', record.object_name, record.id ) );
		object.last_mod_date = record.del_date;
	}

	return list;
}


function load_remote_list( scenario, methodProgress )
{
	objectTypeOrderIndex = 0;

	spxml_machine_settings.lds.address = scenario.server_address;
	spxml_settings.lds_auth.AssignElem( scenario );

	remoteList = LdsGetModObjects( scenario.remote_last_mod_date, 'lds-server=' + scenario.server_address + ';compress=' + scenario.compress );
	return remoteList;
}


function load_remote_trash_list( scenario, methodProgress )
{
	if ( ! scenario.remote_last_mod_date.HasValue )
		return Array();

	spxml_machine_settings.lds.address = scenario.server_address;
	spxml_settings.lds_auth.AssignElem( scenario );

	remoteList = LdsGetModDeletedObjects( scenario.remote_last_mod_date, 'lds-server=' + scenario.server_address );
	return remoteList;
}


function remove_simple_duplicate_objects( scenario, list, remoteList )
{
	index = 0;
	remoteIndex = 0;

	while ( true )
	{
		if ( index >= list.ChildNum )
			break;

		if ( remoteIndex >= remoteList.ChildNum )
			break;

		if ( list[index].url == remoteList[remoteIndex].url )
		{
			if ( list[index].last_mod_date == remoteList[remoteIndex].last_mod_date )
			{
				list[index].Delete();
				remoteList[remoteIndex].Delete();
			}
			else
			{
				index++;
				remoteIndex++;
			}
		}
		else if ( list[index].url > remoteList[remoteIndex].url )
		{
			remoteIndex++;
		}
		else
		{
			index++;
		}
	}
}


function find_opt_local_record( objectUrl )
{
	catalog = DefaultDb.GetOptCatalog( lib_base.object_name_to_catalog_name( ObjectNameFromUrl( objectUrl ) ) );
	record = ArrayOptFindByKey( catalog, ObjectIDFromUrl( objectUrl ) );
	return record;
}


function get_object_short_url( url )
{
	return UrlPath( url );
}


function DoRemoteRequest( scenario, url, method, reqBody )
{
	targetUrl = AbsoluteUrl( url, 'http://' + scenario.server_address + '/' );
	if ( method == undefined )
		method = 'get';

	options = 'Authorization: Basic ' + Base64Encode( scenario.login + ':' + StrStdDecrypt( scenario.password_ed ) ) + '\r\n';

	resp = HttpRequest( targetUrl, method, reqBody, options );
	return resp;
}

