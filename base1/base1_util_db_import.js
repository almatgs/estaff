function handle_import_db()
{
	dlgDoc = OpenDoc( 'base1_dlg_db_import.xml' );
	dlgDoc.TopElem.src_dir_path = local_settings.import_db_last_data.src_dir_path;
	dlgDoc.TopElem.import_static_data = local_settings.import_db_last_data.import_static_data;
	dlgDoc.TopElem.import_csd = ! lib_csd.has_csd_fields;
	
	if ( local_settings.import_db_last_data.processed_object_type_id.HasValue || local_settings.import_db_last_data.last_processed_object_url.HasValue )
	{
		dlgDoc.TopElem.may_start_from_prev = true;
		dlgDoc.TopElem.start_from_prev = true;
	}

	ActiveScreen.ModalDlg( dlgDoc );

	local_settings.import_db_last_data.src_dir_path = dlgDoc.TopElem.src_dir_path;
	local_settings.import_db_last_data.import_static_data = dlgDoc.TopElem.import_static_data;
	local_settings.Doc.Save();

	try
	{
		import_db( local_settings.import_db_last_data.src_dir_path, dlgDoc.TopElem.start_from_prev, dlgDoc.TopElem.import_csd );
	}
	catch ( e )
	{
		local_settings.Doc.Save();
		throw e;
	}

	local_settings.import_db_last_data.processed_object_type_id.Clear();
	local_settings.import_db_last_data.last_processed_object_url.Clear();
	local_settings.Doc.Save();

	UpdateScreens( '*', '*' );
}


function import_db( srcDir, startFromPrev, importCsd )
{
	EnableLog( 'import', true );

	if ( ! startFromPrev )
	{
		local_settings.import_db_last_data.processed_object_type_id.Clear();
		local_settings.import_db_last_data.last_processed_object_url.Clear();
	}

	CurMethodStatistics.total_count = 0;
	CurMethodStatistics.new_count = 0;
	CurMethodStatistics.failed_count = 0;

	CurMethodProgress.ItemIndex = 0;

	objDir = FilePath( srcDir, 'obj' );
	if ( ! PathIsDirectory( objDir ) )
		throw UserError( UiText.errors.selected_folder_is_not_db );

	if ( local_settings.import_db_last_data.import_static_data && ! startFromPrev )
	{
		if ( PathIsDirectory( staticDir = FilePath( srcDir, 'static' ) ) )
			import_static_dir( staticDir, CurMethodProgress, CurMethodStatistics );
	}

	if ( importCsd && PathIsDirectory( csdDir = FilePath( srcDir, 'csd' ) ) )
	{
		csdImported = import_csd_dir( csdDir, CurMethodProgress, CurMethodStatistics );
		if ( csdImported )
		{
			lib_base.show_info_message( ActiveScreen, UiText.messages.csd_imported + ' ' + ( UseLds ? UiText.messages.restart_server_to_continue : UiText.messages.restart_app_to_continue ) );
			Cancel();
		}
	}

	if ( AppConfig.GetOptProperty( 'disable-ft-on-import', '' ) == '1' )
		lib_sql.disable_all_objects_ft_population();

	for ( objectForm in DefaultDb.ObjectForms )
	{
		if ( objectForm.TopElem.Name == 'save_trigger' || objectForm.TopElem.Name == 'view' )
			continue;

		if ( startFromPrev && local_settings.import_db_last_data.processed_object_type_id.ByValueExists( objectForm.TopElem.Name ) )
			continue;

		if ( local_settings.import_db_last_data.last_processed_object_url.HasValue && ! StrContains( local_settings.import_db_last_data.last_processed_object_url, '/' + lib_base.object_name_to_catalog_name( objectForm.TopElem.Name ) + '/' ) )
		{
			//alert( local_settings.import_db_last_data.last_processed_object_url + '    ' + '/' + objectForm.TopElem.Name + '/' );
			local_settings.import_db_last_data.last_processed_object_url.Clear();
		}

		catalogName = lib_base.object_name_to_catalog_name( objectForm.TopElem.Name );

		if ( PathIsDirectory( FilePath( objDir, catalogName ) ) )
			import_base_dir( objectForm, FilePath( objDir, catalogName ), startFromPrev, CurMethodProgress, CurMethodStatistics );
		else if ( FilePathExists( filePath = FilePath( FilePath( objDir, 'xml' ), catalogName + '.xml' ) ) )
			import_single_xml( objectForm, filePath, CurMethodProgress, CurMethodStatistics );

		local_settings.import_db_last_data.processed_object_type_id.ObtainByValue( objectForm.TopElem.Name );
	}

	if ( AppConfig.GetOptProperty( 'disable-ft-on-import', '' ) == '1' )
		lib_sql.enable_all_objects_ft_population();
}


function import_base_dir( objectForm, baseDir, startFromPrev, progress, statistics )
{
	LogEvent( 'import', 'Importing directory: ' + baseDir );

	if ( objectForm.TopElem.Child( 'id' ).Type == 'string' )
	{
		import_dir( objectForm, baseDir, startFromPrev, progress, statistics );
	}
	else
	{
		array = ReadDirectoryByPath( baseDir );
		array = ArraySort( array, 'This', '+' );

		for ( dir in array )
		{
			if ( ! PathIsDirectory( dir ) || StrLen( FileName( dir ) ) != 14 )
				continue;

			import_dir( objectForm, dir, startFromPrev, progress, statistics );
		}
	}

	LogEvent( 'import', 'Importing directory finished' );
}


function import_dir( objectForm, dir, startFromPrev, progress, statistics )
{
	dirName = FileName( dir );

	array = ReadDirectoryByPath( dir );
	array = ArraySort( array, 'This', '+' );

	for ( filePath in array )
	{
		fileName = FileName( filePath );

		if ( PathIsDirectory( filePath ) || ! StrEnds( fileName, '.xml', true ) )
			continue;

		CheckCurThread();

		if ( startFromPrev && local_settings.import_db_last_data.last_processed_object_url.HasValue && FilePathToUrl( filePath ) <= local_settings.import_db_last_data.last_processed_object_url )
			continue;

		LogEvent( 'import', filePath );

		try
		{
			doc = OpenDoc( FilePathToUrl( filePath ), 'separate=0' );
		}
		catch( e )
		{
			if ( ! StrContains( e, 'End of file' ) )
				throw e;

			LogEvent( 'import', e );
			continue;
		}

		if ( ! doc.TopElem.id.HasValue )
			continue;
		
		try
		{
			progress.ItemName = doc.TopElem.PrimaryDispName;
		}
		catch( e )
		{
			//alert( e );
			//alert( doc.TopElem.Xml );
		}

		if ( PathIsDirectory( ( auxDir = FilePath( dir, StrReplace( fileName, '.xml', '_files' ) ) ) ) )
			import_doc_large_fields( doc, auxDir );

		doc.Url = ObjectDocUrl( 'data', objectForm.TopElem.Name, doc.TopElem.id );
		doc.WriteDocInfo = false;
		doc.RunActionOnBeforeSave = false;
		doc.RunActionOnSave = false;
		doc.Save();
		
		local_settings.import_db_last_data.last_processed_object_url = FilePathToUrl( filePath );

		progress.ItemIndex++;
		statistics.total_count++
	}
}


function import_doc_large_fields( doc, auxDir )
{
	array = ReadDirectoryByPath( auxDir );
	array = ArraySort( array, 'This', '+' );

	for ( filePath in array )
	{
		fileName = FileName( filePath );

		if ( PathIsDirectory( filePath ) || StrLen( fileName ) != 16 )
			continue;

		fieldID = OptInt( '0x' + fileName );
		if ( fieldID == undefined )
			continue;

		elem = doc.FindExtDataElemByFieldID( fieldID );
		if ( elem == undefined )
			continue;

		elem.LoadFromFile( FilePathToUrl( filePath ) );
	}
}


function import_single_xml( objectForm, filePath, progress, statistics )
{
	catalog = DefaultDb.GetOptCatalog( lib_base.object_name_to_catalog_name( objectForm.TopElem.Name ) );

	srcDoc = OpenDoc( FilePathToUrl( filePath ), 'form=' + catalog.Form.Url );

	for ( srcElem in srcDoc.TopElem )
	{
		if ( srcElem.ChildExists( 'is_std' ) && srcElem.is_std && ! srcElem.was_customized && srcElem.Name != 'location' )
			continue;

		CheckCurThread();

		doc = OpenNewDoc( objectForm.Url, 'separate=1' );
		progress.ItemName = doc.TopElem.PrimaryDispName;

		doc.TopElem.AssignElem( srcElem );
		doc.Url = ObjectDocUrl( 'data', objectForm.TopElem.Name, srcElem.id );
		
		doc.IsSeparated = false;
		doc.WriteDocInfo = false;
		doc.RunActionOnBeforeSave = false;
		doc.RunActionOnSave = false;
		doc.Save();
		
		progress.ItemIndex++;
		statistics.total_count++
	}
}


function import_static_dir( staticDir, progress, statistics )
{
	array = ReadDirectoryByPath( staticDir );
	array = ArraySort( array, 'This', '+' );

	for ( filePath in array )
	{
		fileName = FileName( filePath );

		if ( PathIsDirectory( filePath ) || ! StrEnds( fileName, '.xml', true ) )
			continue;

		CheckCurThread();

		try
		{
			doc = OpenDoc( FilePathToUrl( filePath ), 'separate=1' );
		}
		catch ( e )
		{
			//alert( e );
			continue;
		}

		progress.ItemName = fileName;

		try
		{
			cachedDoc = GetCachedDoc( 'x-local://data/static/' + fileName );
		}
		catch ( e )
		{
			//alert( e );
			continue;
		}

		cachedDoc.TopElem.AssignElem( doc.TopElem );
		cachedDoc.Save();
	}
}


function import_csd_dir( staticDir, progress, statistics )
{
	array = ReadDirectoryByPath( staticDir );
	array = ArraySort( array, 'This', '+' );

	match = false;

	for ( filePath in array )
	{
		fileName = FileName( filePath );

		if ( PathIsDirectory( filePath ) || ! StrEnds( fileName, '.xmc', true ) )
			continue;

		PutUrlData( 'x-local://data/csd/' + fileName, LoadFileData( filePath ) );
		match = true;
	}

	return match;
}


