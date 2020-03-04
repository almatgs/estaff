function Main()
{
	while ( true )
	{
		try
		{
			CheckExportTasks();
		}
		catch ( e )
		{
			alert( e );
			LogEvent( '', e );
		}

		try
		{
			CheckImportTasks();
		}
		catch ( e )
		{
			alert( e );
			LogEvent( '', e );
		}

		Sleep( 1000 );
	}
}



function CheckExportTasks()
{
	for ( scenario in export_scenarios.items )
		RunExportTask( scenario );
}


function RunExportTask( scenario )
{
	if ( scenario.schedule.term.length == null || scenario.schedule.term.length == 0 )
		return;

	if ( scenario.last_run_date != null && DateToRawSeconds( Date() ) - DateToRawSeconds( scenario.last_run_date ) < scenario.schedule.term.length )
		return;

	scenario.last_run_date = Date();

	if ( scenario.dest_dir_path == '' )
		return;

	if ( ! PathIsDirectory( scenario.dest_dir_path ) )
	{
		LogEvent( 'Invalid export path: ' + scenario.dest_dir_path );
		return;
	}

	exportDate = Date();

	query = 'for $doc in db_docs';
	
	if ( scenario.filter.min_date != null )
		query = query + ' where $doc/mod_date >= date( \'' + scenario.filter.min_date + '\' )';

	query = query + ' return $doc';

	//alert( query );

	array = XQuery( query );

	for ( elem in array )
	{
		try
		{
			doc = OpenDoc( UrlFromDocID( elem.id ) );
		}
		catch ( e )
		{
			continue;
		}

		if ( ! doc.TopElem.ChildExists( 'doc_info' ) )
			continue;

		if ( scenario.filter.use_object_type )
		{
			match = false;

			for ( objectType in scenario.filter.object_type_id.Instances )
			{
				if ( GetForeignElem( object_types.items, objectType ).object_form_url == doc.FormUrl )
				{
					match = true;
					break;
				}
			}

			if ( ! match )
				continue;
		}

		destUrl = FilePathToUrl( scenario.dest_dir_path ) + '/' + StrHexInt( elem.id, 16 ) + '.xml';
		doc.SaveToUrl( destUrl );
	}

	scenario.filter.min_date = exportDate;
	scenario.Doc.Save();
}




function CheckImportTasks()
{
	for ( scenario in import_scenarios.items )
		RunImportTask( scenario );
}


function RunImportTask( scenario )
{
	if ( scenario.schedule.term.length == null || scenario.schedule.term.length == 0 )
		return;

	if ( scenario.last_run_date != null && DateToRawSeconds( Date() ) - DateToRawSeconds( scenario.last_run_date ) < scenario.schedule.term.length )
		return;

	scenario.last_run_date = Date();

	if ( scenario.src_dir_path == '' )
		return;

	if ( ! PathIsDirectory( scenario.src_dir_path ) )
	{
		LogEvent( 'Invalid import path: ' + scenario.src_dir_path );
		return;
	}

	for ( srcUrl in ReadDirectory( FilePathToUrl( scenario.src_dir_path ) ) )
	{
		srcFileName = UrlFileName( srcUrl );
		if ( StrLen( srcFileName ) != 20 || ! StrEnds( srcFileName, '.xml', true ) )
			continue;

		try
		{
			docID = Int( '0x' + StrLeftRange( srcFileName, 16 ) );
		}
		catch ( e )
		{
			//alert( e );
			continue;
		}

		docUrl = UrlFromDocID( docID );

		try
		{
			doc = OpenDoc( srcUrl );
		}
		catch ( e )
		{
			//alert( e );
			continue;
		}

		if ( scenario.new_only && FilePathExists( UrlToFilePath( docUrl ) ) )
		{
			DeleteUrl( srcUrl );
			continue;
		}

		doc.Url = docUrl;
		doc.WriteDocInfo = false;
		doc.Save();

		DeleteUrl( srcUrl );
	}

	scenario.Doc.Save();
}


Main();
