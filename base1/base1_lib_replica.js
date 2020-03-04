function replicate_db_su()
{
	if ( local_settings.replica.server_address == '' )
		throw UserError( UiText.errors.replica_seerver_address_not_specified );

	EnableLog( 'replica', true );

	try
	{
		replicate_db( local_settings.replica );
	}
	catch( e )
	{
		LogEvent( 'replica', e );
		throw e;
	}

	UpdateScreens( '*', '*' );
}


function replicate_db( scenario )
{
	LogEvent( 'replica', '-- Started replication with ' + scenario.server_address );
	LogEvent( 'replica', 'Local last modification date: ' + scenario.local_last_mod_date );
	LogEvent( 'replica', 'Remote last modification date: ' + scenario.remote_last_mod_date );

	CurMethodProgress.TaskName = StrReplace( UiText.messages.replicating_with_server_xxx, '%s', scenario.server_address );

	CurMethodStatistics.sent_count = 0;
	CurMethodStatistics.received_count = 0;
	CurMethodStatistics.collision_count = 0;


	startDate = CurDate;

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

	index = 0;
	remoteIndex = 0;

	while ( true )
	{
		if ( index >= list.ChildNum )
		{
			if ( remoteIndex >= remoteList.ChildNum )
				break;
			else
				diff = 1;
		}
		else
		{
			if ( remoteIndex >= remoteList.ChildNum )
				diff = 0 - 1;
			else
				diff = Compare( list[index].url, remoteList[remoteIndex].url );
		}

		if ( diff < 0 )
		{
			sendArray[sendArray.length] = list[index];
			index++;
		}
		else if ( diff > 0 )
		{
			if ( ! scenario.local_last_mod_date.HasValue || ( record = find_opt_local_record( AbsoluteUrl( remoteList[remoteIndex].url, 'x-db-obj://data/' ) ) ) == undefined || record.last_mod_date < remoteList[remoteIndex].last_mod_date )
				receiveArray[receiveArray.length] = remoteList[remoteIndex];
			//else
				//alert( 22 );

			remoteIndex++;
		}
		else
		{
			if ( list[index].last_mod_date > remoteList[remoteIndex].last_mod_date )
				sendArray[sendArray.length] = list[index];
			else if ( list[index].last_mod_date < remoteList[remoteIndex].last_mod_date )
				receiveArray[receiveArray.length] = remoteList[remoteIndex];
			else
				CurMethodStatistics.collision_count++;
		
			index++;
			remoteIndex++;
		}
	}

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
	

function load_local_object_list( scenario, methodProgress, objectForm, objectTypeOrderIndex, list )
{
	query = 'for $elem in ' + lib_base.object_name_to_catalog_name( objectForm.TopElem.Name );

	if ( scenario.local_last_mod_date.HasValue )
		query += ' where $elem/last_mod_date >= ' + scenario.local_last_mod_date.XQueryLiteral;

	query += ' return $elem';

	array = XQuery( query );

	for ( record in array )
	{
		if ( record.ChildExists( 'is_derived' ) && record.is_derived )
			continue;

		object = list.AddChild();
		object.url = get_object_short_url( record.ObjectUrl );
		object.last_mod_date = record.last_mod_date;
		object.object_type_order_index = objectTypeOrderIndex;

		methodProgress.ItemName = object.url;
	}
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
