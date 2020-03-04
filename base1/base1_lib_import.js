function run_import_scenario( scenario )
{
	EnableLog( 'import', true );

	CurMethodStatistics.total_count = 0;
	CurMethodStatistics.new_count = 0;
	CurMethodStatistics.failed_count = 0;

	if ( scenario.use_native_format )
	{
		load_native_dir( scenario, CurMethodProgress, CurMethodStatistics );
		return;
	}

	if ( scenario.scan_dir )
		load_dir( scenario, CurMethodProgress, CurMethodStatistics );
	else
		load_file( scenario, scenario.src_file_path, CurMethodProgress, CurMethodStatistics );
}


function load_native_dir( scenario, progress, statistics )
{
	if ( scenario.src_dir_path == '' )
		return;

	if ( ! PathIsDirectory( scenario.src_dir_path ) )
		throw UserError( 'Invalid import path: ' + scenario.src_dir_path );

	for ( srcUrl in ReadDirectory( FilePathToUrl( scenario.src_dir_path ) ) )
	{
		srcFileName = UrlFileName( srcUrl );
		if ( ! StrEnds( srcFileName, '.xml', true ) )
			continue;
		
		srcFileName = StrLeftRange( srcFileName, StrLen( srcFileName ) - 4 );

		if ( StrLen( srcFileName ) == 16 && ( objectID = OptInt( '0x' + srcFileName ) ) != undefined )
		{
			objectName = '';
		}
		else if ( ( obj = StrOptScan( srcFileName, '%s-0x%s' ) ) != undefined )
		{
			objectID = OptInt( '0x' + obj[1] );
			if ( objectID == undefined )
				continue;

			//alert( objectID );
			objectName = obj[0];
		}
		else
		{
			objectName = '';
			objectID = null;
		}

		try
		{
			doc = OpenDoc( srcUrl );
		}
		catch ( e )
		{
			LogEvent( 'import', 'IMPORT ERROR: ' + srcUrl + ' ' + e );
			statistics.failed_count++;
			continue;
		}

		if ( objectName != '' && objectName != doc.TopElem.Name )
		{
			LogEvent( 'import', 'OBJECT NAME MISMATCH: ' + srcUrl );
			statistics.failed_count++;
			continue;
		}

		objectName = doc.TopElem.Name;

		try
		{
			form = DefaultDb.GetObjectForm( objectName );
		}
		catch ( e )
		{
			LogEvent( 'import', 'INVALID OBJECT TYPE: ' + srcUrl + ' ' + e );
			statistics.failed_count++;
			continue;
		}

		if ( doc.FormUrl == '' )
		{
			doc = OpenDoc( srcUrl, 'form=' + form.Url );
		}

		//alert( objectID );
		if ( objectID != null && objectID != doc.TopElem.id )
		{
			LogEvent( 'import', 'OBJECT ID MISMATCH: ' + srcUrl );
			statistics.failed_count++;
			continue;
		}

		objectID = RValue( doc.TopElem.id );

		if ( scenario.new_only && objectID != null&& ArrayOptFindByKey( DefaultDb.GetOptCatalog( lib_base.object_name_to_catalog_name( objectName ) ), objectID ) != undefined )
		{
			LogEvent( 'import', 'ALREADY EXISTS: ' + srcUrl );
			DeleteUrl( srcUrl );
			statistics.total_count++;
			continue;
		}

		if ( objectID != null )
			doc.Url = ObjectDocUrl( 'data', objectName, objectID );
		else
			doc.BindToDbObjectType( 'data', objectName );

		doc.WriteDocInfo = false;
		doc.Save();

		DeleteUrl( srcUrl );

		statistics.total_count++;
		statistics.new_count++;
	}
}


function load_dir( scenario, progress, statistics )
{
	if ( scenario.src_dir_path == '' )
		return;

	if ( ! PathIsDirectory( scenario.src_dir_path ) )
		throw UserError( 'Invalid import path: ' + scenario.src_dir_path );

	for ( srcUrl in ReadDirectory( FilePathToUrl( scenario.src_dir_path ) ) )
	{
		srcFileName = UrlFileName( srcUrl );

		if ( scenario.file_name_mask.HasValue && ! StrMatchesPattern( srcFileName, scenario.file_name_mask ) )
			continue;

		load_file( scenario, UrlToFilePath( srcUrl ), progress, statistics );
	}
}


function load_file( scenario, srcFilePath, progress, statistics )
{
	srcArray = load_src_file( scenario, srcFilePath );
	//alert( srcArray.Xml );

	if ( scenario.file_format == 'excel' && scenario.use_header_row )
	{
		srcHeaderRow = srcArray[0];
		startRowIndex = 1;
	}
	else
	{
		startRowIndex = 0;
	}

	for ( rowIndex = startRowIndex; rowIndex < srcArray.ChildNum; rowIndex++ )
	{
		load_file_row( scenario, srcArray, srcArray[rowIndex], progress, statistics );
	}
}


function load_file_row( scenario, srcArray, srcRow, progress, statistics )
{
	if ( scenario.file_format == 'excel' && scenario.use_header_row )
		envObject = build_row_env_object( scenario, srcArray, srcRow );
	else
		envObject = srcRow;

	docsArray = new Array;
	isProcessed = false;
	
	for ( targetObject in scenario.target_objects )
	{
		doc = DefaultDb.OpenNewObjectDoc( targetObject.object_type_id );
		docsArray[docsArray.length] = doc;

		for ( field in scenario.fields )
		{
			if ( ! field.id.HasValue )
				continue;

			if ( scenario.target_objects.ChildNum > 1 && field.object_type_id != targetObject.object_type_id )
				continue;

			value = undefined;

			with ( envObject )
			{
				try
				{
					value = eval( field.ext_value_expr );
				}
				catch ( e )
				{
					alert( e + '\r\n\r\n' + srcRow.Xml );
				}
			}

			if ( value != undefined )
				doc.TopElem.EvalPath( field.id ).Value = value;
		}

		if ( doc.TopElem.PrimaryDispName == '' )
			continue;

		if ( scenario.target_objects.ChildNum >= 2 && targetObject.object_type_id == 'person' && scenario.target_objects[0].object_type_id == 'org' )
			doc.TopElem.org_id = docsArray[0].TopElem.id;

		doc.Save();
		isProcessed = true;
	}

	if ( isProcessed )
	{
		statistics.total_count++;
		statistics.new_count++;
	}
	else
	{
		statistics.failed_count++;
	}
}


function build_row_env_object( scenario, srcArray, srcRow )
{
	srcHeaderRow = srcArray[0];
	envObject = new Object;

	for ( i = 0; i < srcHeaderRow.ChildNum; i++ )
	{
		envObject.SetProperty( srcHeaderRow[i], srcRow[i] );
	}

	return envObject;
}


function load_fields_from_src_file( scenario, srcFilePath )
{
	srcArray = load_src_file( scenario, srcFilePath );
	//alert( srcArray.Xml );

	if ( scenario.use_header_row && scenario.file_format == 'excel' )
	{
		srcRow = srcArray[0];

		for ( srcCell in srcRow )
		{
			if ( ! srcCell.HasValue )
				continue;

			field = scenario.fields.ObtainChildByKey( srcCell, 'ext_value_expr' );
			if ( ! field.id.HasValue )
				guess_field_id_by_ext_name( scenario, field );
		}
	}
	else
	{
		srcRow = srcArray[0];

		for ( srcCell in srcRow )
		{
			field = scenario.fields.ObtainChildByKey( srcCell.Name, 'ext_value_expr' );
			if ( ! field.id.HasValue )
				guess_field_id_by_ext_name( scenario, field );
		}
	}
}


function load_src_file( scenario, srcFilePath )
{
	options = '';

	if ( scenario.file_format == 'csv' )
	{
		options += 'format=csv;';
	
		options += 'delim=sem;';
		options += 'lower-case-names=0;';

		if ( scenario.use_header_row )
			options += 'header-line=1;';
	}
	else if ( scenario.file_format == 'excel' )
	{
		options += 'format=excel;';
	}

	try
	{
		srcDoc = OpenDoc( FilePathToUrl( srcFilePath ), options );
	}
	catch ( e )
	{
		throw UserError( 'Unable to open file:\r\n\r\n' + ExtractUserError( e ) )
	}

	if ( scenario.file_format == 'excel' )
		return srcDoc.TopElem[0];
	else
		return srcDoc.TopElem;
}


function guess_field_id_by_ext_name( scenario, field )
{
	if ( scenario.target_objects.ChildNum == 0 )
		return;

	if ( field.object_type_id.HasValue )
		objectTypeID = field.object_type_id;
	else
		objectTypeID = scenario.target_objects[0].object_type_id;

	if ( objectTypeID == '' )
		return;

	objectForm = DefaultDb.GetObjectForm( objectTypeID );
	if ( objectForm.PathExists( field.ext_value_expr ) )
	{
		formElem = objectForm.EvalPath( field.ext_value_expr );
		field.id = field.ext_value_expr;
		return;
	}

	if ( objectTypeID == 'org' )
	{
		switch ( StrLowerCase( field.ext_value_expr ) )
		{
			case 'client':
			case 'company':
			case 'orgaization':
				field.id = 'name';
				return;
		}
	}
}




