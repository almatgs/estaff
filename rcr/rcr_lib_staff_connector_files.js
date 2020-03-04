function load_divisions_from_files( progress, statistics )
{
	if ( global_settings.staff_connector.src_dir_path == '' )
		throw UserError( UiText.errors.src_folder_not_specified_in_settings );

	//statistics.divisions_total_count = 0;
	//statistics.divisions_new_count = 0;

	for ( filePath in ArraySort( ReadDirectoryByPath( global_settings.staff_connector.src_dir_path ), 'This', '+' ) )
	{
		fileName = FileName( filePath );

		if ( global_settings.staff_connector.file_format == 'xml' )
		{
			if ( ! StrEnds( filePath, '.xml', true ) )
				continue;
		}
		else
		{
			if ( ! StrEnds( filePath, '.csv', true ) )
				continue;
		}

		if ( global_settings.staff_connector.divisions_file_name_mask.HasValue && ! StrMatchesPattern( fileName, global_settings.staff_connector.divisions_file_name_mask ) )
			continue;

		load_divisions_file( filePath, progress, statistics );
		
		if ( global_settings.staff_connector.processed_dir_path.HasValue )
			MoveFile( filePath, FilePath( global_settings.staff_connector.processed_dir_path, FileName( filePath ) ) );
		
		//DeleteFile( filePath, FilePath( global_settings.staff_connector.processed_dir_path, FileName( filePath ) ) );
	}
}


function load_divisions_file( filePath, progress, statistics )
{
	var			srcElem;

	progress.TaskName = 'Обработка файла ' + filePath;

	if ( global_settings.staff_connector.file_format == 'xml' )
		srcDoc = OpenDoc( FilePathToUrl( filePath ) );
	else
		srcDoc = OpenDoc( FilePathToUrl( filePath ), 'format=csv;delim=sem;header-line=1' );

	if ( global_settings.staff_connector.file_format == 'xml' )
	{
		orgName = srcDoc.TopElem.OptAttrValue( 'd1p1:name' );
	
		divisionDoc = obtain_object_doc( 'division', orgName );
		isNew = divisionDoc.NeverSaved;
		division = divisionDoc.TopElem;

		division.name = orgName;

		divisionDoc.Save();
	}
	else
	{
		//alert( srcDoc.TopElem.Xml );
	}

	if ( global_settings.staff_connector.drop_single_root_division )
	{
		if ( ! global_settings.staff_connector.single_root_division_eid.HasValue )
		{
			rootsArray = ArraySelect( srcDoc.TopElem,  '! parent_id.HasValue' );
			if ( ArrayCount( rootsArray ) == 0 )
				throw UserError( 'No root division exists' );
			else if ( ArrayCount( rootsArray ) >= 2 )
				throw UserError( 'Multiple root divisions exist' );

			global_settings.staff_connector.single_root_division_eid = ArrayFirstElem( rootsArray ).id;
		}
	}

	progress.TotalCount = srcDoc.TopElem.ChildNum;
	progress.ItemIndex = 0;

	for ( srcElem in srcDoc.TopElem )
	{
		progress.ItemName = srcElem.name;

		load_division( srcElem, progress, statistics, 0 );
		progress.ItemIndex++;

		CheckCurThread();
	}
}


function load_division( srcElem, progress, statistics, recCount )
{
	var			doc;
	var			isNew;
	var			division;

	if ( global_settings.staff_connector.drop_single_root_division && srcElem.id == global_settings.staff_connector.single_root_division_eid )
		return null;

	if ( recCount >= 16 )
	{
		LogEvent( 'agents', 'Maximal recursion level exceeded' );
		return null;
	}

	curDivision = lib_base.query_opt_record_by_key( divisions, srcElem.id, 'eid' );
	if ( curDivision != undefined )
	{
		division = curDivision.Clone();
		isNew = false;
	}
	else
	{
		divisionDoc = DefaultDb.OpenNewObjectDoc( 'division' );
		division = divisionDoc.TopElem;
		isNew = true;
	}

	division.eid = srcElem.id;

	if ( srcElem.parent_id.HasValue && ! ( global_settings.staff_connector.drop_single_root_division && srcElem.parent_id == global_settings.staff_connector.single_root_division_eid ) )
	{
		parentRecord = find_opt_object_record( 'division', srcElem.parent_id );
		if ( parentRecord == undefined )
		{
			srcParentRecord = srcElem.Doc.TopElem.GetOptChildByKey( srcElem.parent_id, 'id' );
			if ( srcParentRecord == undefined )
			{
				LogEvent( 'agents', 'Невозможно загрузить подразделение ' + srcElem.id + '. Родительское подразделение ' + srcElem.parent_id + ' не существует' );
				return null;
			}

			division.parent_id = load_division( srcParentRecord, progress, statistics, recCount + 1 );
			if ( division.parent_id == null )
			{
				LogEvent( 'agents', 'Невозможно загрузить подразделение ' + srcElem.id + '. Родительское подразделение ' + srcElem.parent_id + ' не существует' );
				return null;
			}
		}
		else
		{
			division.parent_id = parentRecord.id;
		}
	}

	division.name = srcElem.name;
	
	if ( srcElem.ChildExists( 'full_name' ) )
		division.full_name = srcElem.full_name;

	if ( srcElem.ChildExists( 'short_name' ) )
		division.short_name = srcElem.short_name;

	if ( srcElem.ChildExists( 'code' ) )
		division.code = srcElem.code;

	if ( srcElem.ChildExists( 'start_date' ) )
		division.start_date = srcElem.start_date;
	
	if ( srcElem.ChildExists( 'end_date' ) )
		division.end_date = srcElem.end_date;

	if ( srcElem.ChildExists( 'comment' ) )
		division.comment = srcElem.comment;

	if ( curDivision != undefined )
	{
		if ( curDivision.EqualToElem( division ) )
			return;

		//DebugMsg( curDivision.Xml + '\r\n\r\n' + division.Xml );
		divisionDoc = OpenDoc( curDivision.ObjectUrl );
		divisionDoc.TopElem.AssignElem( division );
	}

	divisionDoc.Save();

	if ( statistics != undefined )
	{
		statistics.divisions_total_count++;

		if ( isNew )
			statistics.divisions_new_count++;
	}

	return division.id;
}


function load_positions_from_files( progress, statistics )
{
	if ( global_settings.staff_connector.src_dir_path == '' )
		throw UserError( UiText.errors.src_folder_not_specified_in_settings );

	//statistics.persons_total_count = 0;
	//statistics.persons_new_count = 0;

	for ( filePath in ArraySort( ReadDirectoryByPath( global_settings.staff_connector.src_dir_path ), 'This', '+' ) )
	{
		fileName = FileName( filePath );

		if ( global_settings.staff_connector.file_format == 'xml' )
		{
			if ( ! StrEnds( filePath, '.xml', true ) )
				continue;
		}
		else
		{
			if ( ! StrEnds( filePath, '.csv', true ) )
				continue;
		}

		if ( global_settings.staff_connector.positions_file_name_mask.HasValue && ! StrMatchesPattern( fileName, global_settings.staff_connector.positions_file_name_mask ) )
			continue;

		load_positions_file( filePath, progress, statistics );
		
		if ( global_settings.staff_connector.processed_dir_path.HasValue )
			MoveFile( filePath, FilePath( global_settings.staff_connector.processed_dir_path, FileName( filePath ) ) );
		
		//DeleteFile( filePath, FilePath( global_settings.staff_connector.processed_dir_path, FileName( filePath ) ) );
	}
}


function load_positions_file( filePath, progress, statistics )
{
	var			srcElem;

	progress.TaskName = 'Обработка файла ' + filePath;

	if ( global_settings.staff_connector.file_format == 'xml' )
		srcDoc = OpenDoc( FilePathToUrl( filePath ) );
	else
		srcDoc = OpenDoc( FilePathToUrl( filePath ), 'format=csv;delim=sem;header-line=1' );

	progress.TotalCount = srcDoc.TopElem.ChildNum;
	progress.ItemIndex = 0;

	for ( srcElem in srcDoc.TopElem )
	{
		progress.ItemName = srcElem.name;

		load_position( srcElem, progress, statistics );
		progress.ItemIndex++;

		CheckCurThread();
	}
}


function load_position( srcElem, progress, statistics )
{
	var			isNew;
	var			person;

	curPosition = lib_base.query_opt_record_by_key( positions, srcElem.id, 'eid' );
	if ( curPosition != undefined )
	{
		position = curPosition.Clone();
		isNew = false;
	}
	else
	{
		positionDoc = DefaultDb.OpenNewObjectDoc( 'position' );
		position = positionDoc.TopElem;
		position.eid = srcElem.id;
		isNew = true;
	}

	id = RValue( position.id );
	position.AssignElem( srcElem );
	position.id = id;

	if ( srcElem.division_id.HasValue )
	{
		division = find_opt_object_record( 'division', srcElem.division_id );
		if ( division == undefined )
		{
			LogEvent( 'agents', 'Division ' + srcElem.division_id + ' is not found for division ' + srcElem.id );
		}
		else
		{
			position.division_id = division.id;
		}
	}

	if ( curPosition != undefined )
	{
		if ( curPosition.EqualToElem( position ) )
			return;

		//DebugMsg( curPosition.Xml + '\r\n\r\n' + position.Xml );
		positionDoc = OpenDoc( curPosition.ObjectUrl );
		positionDoc.TopElem.AssignElem( position );
	}

	positionDoc.Save();

	if ( statistics != undefined )
	{
		statistics.positions_total_count++;

		if ( isNew )
			statistics.positions_new_count++;
	}
}


function load_persons_from_files( progress, statistics )
{
	if ( global_settings.staff_connector.src_dir_path == '' )
		throw UserError( UiText.errors.src_folder_not_specified_in_settings );

	//statistics.persons_total_count = 0;
	//statistics.persons_new_count = 0;

	for ( filePath in ArraySort( ReadDirectoryByPath( global_settings.staff_connector.src_dir_path ), 'This', '+' ) )
	{
		fileName = FileName( filePath );

		if ( global_settings.staff_connector.file_format == 'xml' )
		{
			if ( ! StrEnds( filePath, '.xml', true ) )
				continue;
		}
		else
		{
			if ( ! StrEnds( filePath, '.csv', true ) )
				continue;
		}

		if ( global_settings.staff_connector.persons_file_name_mask.HasValue && ! StrMatchesPattern( fileName, global_settings.staff_connector.persons_file_name_mask ) )
			continue;

		load_persons_file( filePath, progress, statistics );
		
		if ( global_settings.staff_connector.processed_dir_path.HasValue )
			MoveFile( filePath, FilePath( global_settings.staff_connector.processed_dir_path, FileName( filePath ) ) );
		
		//DeleteFile( filePath, FilePath( global_settings.staff_connector.processed_dir_path, FileName( filePath ) ) );
	}
}


function load_persons_file( filePath, progress, statistics )
{
	var			srcElem;

	progress.TaskName = 'Обработка файла ' + filePath;

	if ( global_settings.staff_connector.file_format == 'xml' )
		srcDoc = OpenDoc( FilePathToUrl( filePath ) );
	else
		srcDoc = OpenDoc( FilePathToUrl( filePath ), 'format=csv;delim=sem;header-line=1' );

	progress.TotalCount = srcDoc.TopElem.ChildNum;
	progress.ItemIndex = 0;

	for ( srcElem in srcDoc.TopElem )
	{
		progress.ItemName = srcElem.lastname + ' ' + srcElem.firstname + ' ' + srcElem.middlename;

		load_person( srcElem, progress, statistics );
		progress.ItemIndex++;

		CheckCurThread();
	}
}


function load_person( srcElem, progress, statistics )
{
	curPerson = lib_base.query_opt_record_by_key( persons, srcElem.id, 'eid' );
	if ( curPerson != undefined )
	{
		person = curPerson.Clone();
		isNew = false;
	}
	else
	{
		personDoc = DefaultDb.OpenNewObjectDoc( 'person' );
		person = personDoc.TopElem;
		person.eid = srcElem.id;
		isNew = true;
	}

	id = RValue( person.id );
	person.AssignElem( srcElem );
	person.id = id;

	if ( srcElem.ChildExists( 'password' ) && srcElem.password.HasValue )
	{
		if ( person.password_hash.HasValue && PasswordVerify( srcElem.password, person.password_hash ) )
		{
		}
		else
		{
			person.password_hash = PasswordHash( srcElem.password );
		}
	}

	person.is_own_person = true;

	if ( srcElem.division_id.HasValue )
	{
		division = find_opt_object_record( 'division', srcElem.division_id );
		if ( division == undefined )
		{
			LogEvent( 'agents', 'Division ' + srcElem.division_id + ' is not found for person ' + srcElem.id );
		}
		else
		{
			person.division_id = division.id;
		}
	}

	if ( srcElem.ChildExists( 'position_id' ) && srcElem.position_id.HasValue )
	{
		position = find_opt_object_record( 'position', srcElem.position_id );
		if ( position == undefined )
		{
			LogEvent( 'agents', 'Position ' + srcElem.position_id + ' is not found for person ' + srcElem.id );
		}
		else
		{
			person.position_id = position.id;
		}
	}


	if ( curPerson != undefined )
	{
		if ( curPerson.EqualToElem( person ) )
			return;

		//DebugMsg( curPerson.Xml + '\r\n\r\n' + person.Xml );
		personDoc = OpenDoc( curPerson.ObjectUrl );
		personDoc.TopElem.AssignElem( person );
	}

	personDoc.Save();

	if ( statistics != undefined )
	{
		statistics.persons_total_count++;

		if ( isNew )
			statistics.persons_new_count++;
	}
}



function load_vacancies_from_files( progress, statistics )
{
	if ( global_settings.staff_connector.src_dir_path == '' )
		throw UserError( UiText.errors.src_folder_not_specified_in_settings );

	statistics.total_count = 0;
	statistics.new_count = 0;

	for ( filePath in ArraySort( ReadDirectoryByPath( global_settings.staff_connector.src_dir_path ), 'This', '+' ) )
	{
		fileName = FileName( filePath );

		if ( global_settings.staff_connector.file_format == 'xml' )
		{
			if ( ! StrEnds( filePath, '.xml', true ) )
				continue;
		}
		else
		{
			if ( ! StrEnds( filePath, '.csv', true ) )
				continue;
		}

		if ( global_settings.staff_connector.vacancies_file_name_mask.HasValue && ! StrMatchesPattern( fileName, global_settings.staff_connector.vacancies_file_name_mask ) )
			continue;

		load_vacancies_file( filePath, progress, statistics );
		
		if ( global_settings.staff_connector.processed_dir_path.HasValue )
			MoveFile( filePath, FilePath( global_settings.staff_connector.processed_dir_path, FileName( filePath ) ) );
		
		//DeleteFile( filePath, FilePath( global_settings.staff_connector.processed_dir_path, FileName( filePath ) ) );
	}
}


function load_vacancies_file( filePath, progress, statistics )
{
	var			srcElem;

	progress.TaskName = 'Обработка файла ' + filePath;

	if ( global_settings.staff_connector.file_format == 'xml' )
		srcDoc = OpenDoc( FilePathToUrl( filePath ) );
	else
		srcDoc = OpenDoc( FilePathToUrl( filePath ), 'format=csv;delim=sem;header-line=1' );

	progress.TotalCount = srcDoc.TopElem.ChildNum;
	progress.ItemIndex = 0;

	for ( srcElem in srcDoc.TopElem )
	{
		progress.ItemName = srcElem.name;

		load_vacancy( srcElem, progress, statistics );
		progress.ItemIndex++;

		CheckCurThread();
	}
}


function load_vacancy( srcElem, progress, statistics )
{
	var			doc;
	var			isNew;
	var			person;

	doc = obtain_object_doc( 'vacancy', srcElem.id );
	isNew = doc.NeverSaved;
	vacancy = doc.TopElem;

	vacancy.AssignElem( srcElem );

	if ( isNew && ! vacancy.start_date.HasValue )
		vacancy.start_date = CurDate;

	if ( srcElem.division_id.HasValue )
	{
		division = find_opt_object_record( 'division', srcElem.division_id );
		if ( division == undefined )
		{
			LogEvent( 'agents', 'Division ' + srcElem.division_id + ' is not found for vacancy ' + srcElem.id );
		}
		else
		{
			vacancy.division_id = division.id;
		}
	}

	if ( srcElem.ChildExists( 'position_id' ) && srcElem.position_id.HasValue )
	{
		position = find_opt_object_record( 'position', srcElem.position_id );
		if ( position == undefined )
		{
			LogEvent( 'agents', 'Position ' + srcElem.position_id + ' is not found for vacancy ' + srcElem.id );
		}
		else
		{
			vacancy.position_id = position.id;
		}
	}

	if ( srcElem.ChildExists( 'hiring_manager_id' ) && srcElem.hiring_manager_id.HasValue )
	{
		person = find_opt_object_record( 'person', srcElem.hiring_manager_id );
		if ( person == undefined )
		{
			LogEvent( 'agents', 'Person ' + srcElem.hiring_manager_id + ' is not found for vacancy ' + srcElem.id );
		}
		else
		{
			vacancy.rr_persons.ObtainChildByKey( person.id );
		}
	}

	if ( srcElem.ChildExists( 'description_html' ) && srcElem.description.HasValue )
	{
		attachment = vacancy.attachments.ObtainChildByKey( 'vacancy_desc', 'type_id' );
		attachment.content_type = 'text/html';
		attachment.text = srcElem.description_html;
	}
	else if ( srcElem.ChildExists( 'description' ) && srcElem.description.HasValue )
	{
		attachment = vacancy.attachments.ObtainChildByKey( 'vacancy_desc', 'type_id' );
		attachment.content_type = 'text/plain';
		attachment.plain_text = srcElem.description;
	}

	if ( isNew && srcElem.ChildExists( 'req_quantity' ) && srcElem.req_quantity.HasValue && global_settings.use_mp_vacancies )
	{
		reqQuantity = Int( srcElem.req_quantity );
		if ( reqQuantity > 1 )
		{
			vacancy.is_mp_vacancy = true;
			instance = vacancy.instances.AddChild();
			instance.id = UniqueID();
			instance.start_date = vacancy.start_date;
			instance.req_quantity = reqQuantity;
		}
	}

	if ( isNew )
		lib_staff_connector.InitNewVacancyData( vacancy );

	doc.Save();

	if ( isNew )
		lib_recruit.OnNewVacancyLoaded( vacancy );

	if ( statistics != undefined )
	{
		statistics.total_count++;

		if ( isNew )
			statistics.new_count++;
	}
}







function obtain_object_doc( objectName, eid )
{
	//Sleep( 200 );
	record = find_opt_object_record( objectName, eid );
	if ( record != undefined )
	{
		doc = DefaultDb.OpenObjectDoc( objectName, record.id );
	}
	else
	{
		//doc = DefaultDb.OpenNewObjectDoc( objectName );

		doc = OpenNewDoc( DefaultDb.GetObjectForm( objectName ).Url, 'separate=1' );
		doc.BindToDbObjectType( 'data', objectName );
		doc.IsSeparated = false;
		doc.TopElem.eid = eid;
	}

	return doc;
}


function find_opt_object_record( objectName, eid )
{
	return ArrayOptFirstElem( XQuery( 'for $elem in ' + lib_base.object_name_to_catalog_name( objectName ) + ' where $elem/eid = ' + XQueryLiteral( eid ) + ' return $elem' ) );
}


