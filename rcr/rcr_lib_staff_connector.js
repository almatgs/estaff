function load_staff()
{
	load_divisions();
	load_persons();
}


function load_divisions()
{
	EnableLog( 'staff-connector', true );

	startDate = CurDate;

	CurMethodProgress.TaskName = UiText.titles.loading + ': ' + UiText.titles.divisions;

	if ( global_settings.staff_connector.method_id == 'files' )
	{
		CallCodeUrlFunction( 'rcr_lib_staff_connector_files.js', 'load_divisions_from_files', CurMethodProgress, undefined );
		return;
	}

	LogEvent( 'staff-connector', 'STARTED LOADING DIVISIONS' );

	argElem = create_arg( 'GetDivisions' );
	resp = run_request( argElem );

	LogEvent( 'staff-connector', 'RESPONSE RECEIVED ' + resp.divisions.ChildNum );

	CurMethodProgress.TotalCount = resp.divisions.ChildNum;
	CurMethodProgress.ItemIndex = 0;

	for ( srcElem in resp.divisions )
	{
		CurMethodProgress.ItemName = srcElem.name;

		eid = srcElem.id;
		parentDivisionID = null;

		if ( srcElem.parent_id.HasValue )
		{
			parentDivision = lib_base.query_opt_record_by_key( divisions, srcElem.parent_id, 'eid' );
			if ( parentDivision != undefined )
				parentDivisionID = parentDivision.id;
			else
				LogEvent( 'staff-connector', 'UNABLE TO FIND PARENT DIVISION ' +  srcElem.parent_id );
		}

		curDivision = lib_base.query_opt_record_by_key( divisions, eid, 'eid' );

		if ( curDivision == undefined && AppModuleUsed( 'module_lukoil' ) )
			curDivision = ArrayOptFirstElem( XQuery( 'for $elem in divisions where $elem/parent_id = ' + XQueryLiteral( parentDivisionID ) + ' and $elem/name = ' + XQueryLiteral( srcElem.name ) + ' return $elem' ) );

		if ( curDivision != undefined )
		{
			division = curDivision.Clone();
		}
		else
		{
			divisionDoc = DefaultDb.OpenNewObjectDoc( 'division' );
			division = divisionDoc.TopElem;
		}

		//divisionDoc = DefaultDb.OpenObjectDoc( 'division', division.id );

		division.parent_id = parentDivisionID;
		division.eid = eid;
		division.name = srcElem.name;
		division.code = srcElem.code;

		if ( srcElem.ChildExists( 'type_id' ) )
			division.type_id = srcElem.type_id;

		division.start_date = srcElem.start_date;
		division.end_date = srcElem.end_date;

		if ( srcElem.location_name.HasValue )
		{
			srcLocation = find_location( srcElem.location_name );
			if ( srcLocation != undefined )
			{
				division.location_id = srcLocation.id;
				//lib_voc.update_idata_by_voc( division.location_id );
			}
		}

		for ( srcSubElem in srcElem.csd )
		{
			if ( ! division.ChildExists( srcSubElem.Name ) )
				continue;

			division.Child( srcSubElem.Name ).Value = srcSubElem.Value;
		}
		
		if ( curDivision != undefined )
		{
			if ( curDivision.EqualToElem( division ) )
				continue;

			//DebugMsg( curDivision.Xml + '\r\n\r\n' + division.Xml );
			divisionDoc = OpenDoc( curDivision.ObjectUrl );
			divisionDoc.TopElem.AssignElem( division );
		}

		divisionDoc.Save();

		if ( AppModuleUsed( 'module_hoff' ) )
		{
			structRoles = lib_base.query_records_by_key( person_struct_roles, division.id, 'division_id' );
			
			for ( funcManager in srcElem.func_managers )
			{
				personID = obtain_person( funcManager.person_id );

				structRole = ArrayOptFindByKey( structRoles, funcManager.eid, 'eid' );
				if ( structRole != undefined )
				{
				}
				else
				{
					structRoleDoc = DefaultDb.OpenNewObjectDoc( 'person_struct_role' );
					structRole = structRoleDoc.TopElem;
					structRole.person_id = personID;
					structRole.type_id = funcManager.type_id;
					structRole.division_id = division.id;
					structRole.eid = funcManager.eid;
					structRoleDoc.Save();
				}
			}

			for ( structRole in ArraySelect( structRoles, 'This.eid.HasValue' ) )
			{
				if ( ArrayOptFindByKey( srcElem.func_managers, structRole.person_id.ForeignElem.eid, 'person_id' ) == undefined )
					DeleteDoc( structRole.ObjectUrl );
			}
		}

		CurMethodProgress.ItemIndex++;
	}

	LogEvent( 'staff-connector', 'FINISHED LOADING DIVISIONS' );
}


function load_positions()
{
	if ( ! global_settings.use_positions )
		throw UiError( UiText.errors.positions_disabled );

	EnableLog( 'staff-connector', true );

	startDate = CurDate;
	CurMethodProgress.TaskName = UiText.titles.loading + ': ' + UiText.fields.positions;

	if ( global_settings.staff_connector.method_id == 'files' )
	{
		OpenCodeLib( 'rcr_lib_staff_connector_files.js' ).load_positions_from_files( CurMethodProgress, undefined );
		return;
	}

	LogEvent( 'staff-connector', 'STARTED LOADING POSITIONS ' + global_settings.staff_connector.position_import.last_run_date );

	argElem = create_arg( 'GetPositions' );
	
	if ( global_settings.staff_connector.position_import.last_run_date.HasValue )
		argElem.min_date = DateOffset( global_settings.staff_connector.position_import.last_run_date, 0 - 3600 * 8 );
	
	resp = run_request( argElem );

	LogEvent( 'staff-connector', 'RESPONSE RECEIVED ' + resp.positions.ChildNum );

	CurMethodProgress.TotalCount = resp.positions.ChildNum;
	CurMethodProgress.ItemIndex = 0;

	for ( srcElem in resp.positions )
	{
		LogEvent( 'staff-connector', srcElem.name );

		eid = srcElem.id;
		curPosition = lib_base.query_opt_record_by_key( positions, eid, 'eid' );

		if ( curPosition != undefined )
		{
			position = curPosition.Clone();
		}
		else
		{
			positionDoc = DefaultDb.OpenNewObjectDoc( 'position' );
			position = positionDoc.TopElem;
		}

		position.eid = eid;
		position.name = srcElem.name;
		position.code = srcElem.code;

		CurMethodProgress.ItemName = position.name;

		if ( srcElem.division_id.HasValue && ( division = find_opt_object_record( 'division', srcElem.division_id ) ) != undefined )
			position.division_id = division.id;

		position.is_division_head = srcElem.is_division_head;
		position.is_active = srcElem.is_active;

		if ( curPosition != undefined )
		{
			if ( curPosition.EqualToElem( position ) )
				continue;

			//DebugMsg( curPosition.Xml + '\r\n\r\n' + position.Xml );
			positionDoc = OpenDoc( curPosition.ObjectUrl );
			positionDoc.TopElem.AssignElem( position );
		}

		try
		{
			positionDoc.Save();
		}
		catch ( e )
		{
			LogEvent( '', 'UNABLE TO SAVE PERSON: ' + e );
			LogEvent( 'staff-connector', 'UNABLE TO SAVE PERSON: ' + e );
		}


		CurMethodProgress.ItemIndex++;
	}

	LogEvent( 'staff-connector', 'FINISHED LOADING POSITIONS' );

	global_settings.staff_connector.position_import.last_run_date = startDate;
	global_settings.Doc.Save();
}


function load_persons()
{
	EnableLog( 'staff-connector', true );

	startDate = CurDate;
	CurMethodProgress.TaskName = UiText.titles.loading + ': ' + UiText.sections.employees;

	if ( global_settings.staff_connector.method_id == 'files' )
	{
		CallCodeUrlFunction( 'rcr_lib_staff_connector_files.js', 'load_persons_from_files', CurMethodProgress, undefined );
		return;
	}

	LogEvent( 'staff-connector', 'STARTED LOADING PERSONS ' + global_settings.staff_connector.person_import.last_run_date );

	argElem = create_arg( 'GetPersons' );
	
	if ( global_settings.staff_connector.person_import.last_run_date.HasValue )
		argElem.min_date = DateOffset( global_settings.staff_connector.person_import.last_run_date, 0 - 3600 * 8 );
	
	resp = run_request( argElem );

	LogEvent( 'staff-connector', 'RESPONSE RECEIVED ' + resp.persons.ChildNum );

	CurMethodProgress.TotalCount = resp.persons.ChildNum;
	CurMethodProgress.ItemIndex = 0;

	for ( srcElem in resp.persons )
	{
		LogEvent( 'staff-connector', srcElem.lastname + ' ' + srcElem.firstname + ' ' + srcElem.middlename );

		eid = srcElem.id;
		fullname = lib_base.get_person_fullname( srcElem );

		curPerson = lib_base.query_opt_record_by_key( persons, eid, 'eid' );

		if ( AppModuleUsed( 'module_lukoil' ) )
		{
			if ( curPerson == undefined && srcElem.email.HasValue )
			{
				array = XQuery( 'for $elem in persons where $elem/email = ' + XQueryLiteral( srcElem.email ) + ' and $elem/fullname = ' + XQueryLiteral( fullname ) + ' return $elem' );
				if ( ArrayCount( array ) > 0 )
					curPerson = ArrayOptFirstElem( array );
			}

			if ( curPerson == undefined )
			{
				array = XQuery( 'for $elem in persons where $elem/fullname = ' + XQueryLiteral( fullname ) + ' return $elem' );
				if ( ArrayCount( array ) > 1 && srcElem.birth_date.HasValue )
					array = ArraySelectByKey( array, Date( srcElem.birth_date ), 'birth_date' );
				if ( ArrayCount( array ) > 0 )
					curPerson = ArrayOptFirstElem( array );
			}
		}

		if ( curPerson != undefined )
		{
			person = curPerson.Clone();
		}
		else
		{
			personDoc = DefaultDb.OpenNewObjectDoc( 'person' );
			person = personDoc.TopElem;
		}

		person.eid = eid;
		person.is_own_person = true;

		person.lastname = srcElem.lastname;
		person.firstname = srcElem.firstname;
		person.middlename = srcElem.middlename;
		person.code = srcElem.code;

		CurMethodProgress.ItemName = person.fullname;

		person.gender_id = srcElem.gender_id;
		person.birth_date = srcElem.birth_date;
		person.email = srcElem.email;
		person.sys_login = srcElem.sys_login;
		person.work_phone = srcElem.phone;

		if ( AppModuleUsed( 'module_lukoil' ) && global_settings.use_positions )
		{
			if ( srcElem.position_id.HasValue && ! person.position_id.HasValue )
			{
				try
				{
					person.position_id = obtain_position( srcElem.position_id );
				}
				catch ( e )
				{
					DebugMsg( e );
				}
			}
		}

		if ( srcElem.division_id.HasValue && ( division = find_opt_object_record( 'division', srcElem.division_id ) ) != undefined )
			person.division_id = division.id;

		if ( srcElem.position_id.HasValue && ( position = find_opt_object_record( 'position', srcElem.position_id ) ) != undefined )
			person.position_id = position.id;

		person.position_name = srcElem.position_name;
		person.is_division_head = srcElem.is_division_head;
		person.hire_date = srcElem.hire_date;
		person.dismissal_date = srcElem.dismissal_date;

		person.employee_state_id = srcElem.employee_state_id;

		if ( AppModuleUsed( 'module_hoff' ) )
		{
			if ( srcElem.login.HasValue )
				person.login = srcElem.login;

			if ( srcElem.password.HasValue )
			{
				if ( person.password_hash.HasValue && PasswordVerify( srcElem.password, person.password_hash ) )
				{
				}
				else
				{
					person.password_hash = PasswordHash( srcElem.password );
				}
			}
		}

		if ( curPerson != undefined )
		{
			if ( curPerson.EqualToElem( person ) )
				continue;

			//DebugMsg( curPerson.Xml + '\r\n\r\n' + person.Xml );
			personDoc = OpenDoc( curPerson.ObjectUrl );
			personDoc.TopElem.AssignElem( person );
		}

		try
		{
			personDoc.Save();
		}
		catch ( e )
		{
			LogEvent( '', 'UNABLE TO SAVE PERSON: ' + e );
			LogEvent( 'staff-connector', 'UNABLE TO SAVE PERSON: ' + e );
		}


		CurMethodProgress.ItemIndex++;
	}

	LogEvent( 'staff-connector', 'FINISHED LOADING PERSONS' );

	if ( global_settings.staff_connector.delete_old_persons && resp.persons.ChildNum != 0 )
	{
		LogEvent( 'staff-connector', 'STARTED DELETING PERSONS' );

		for ( person in ArraySelectAll( XQuery( 'for $elem in persons where $elem/is_own_person = true() return $elem' ) ) )
		{
			if ( ! person.eid.HasValue )
				continue;

			if ( resp.persons.GetOptChildByKey( person.eid ) == undefined )
			{
				DeleteDoc( person.ObjectUrl );
				LogEvent( '', 'PERSON DELETED: ' + person.eid + '  ' + person.fullname );
				LogEvent( 'staff-connector', 'PERSON DELETED: ' + person.eid + '  ' + person.fullname );
			}

			LogEvent( 'staff-connector', 'FINISHED DELETING PERSONS' );
		}
	}

	global_settings.staff_connector.person_import.last_run_date = startDate;
	global_settings.Doc.Save();
}


function load_vacancies()
{
	EnableLog( 'staff-connector', true );

	startDate = CurDate;
	CurMethodProgress.TaskName = UiText.titles.loading + ': ' + UiText.titles.vacancies;

	if ( global_settings.staff_connector.method_id == 'files' )
	{
		OpenCodeLib( 'rcr_lib_staff_connector_files.js' ).load_vacancies_from_files( CurMethodProgress, CurMethodStatistics );
		return;
	}

	LogEvent( 'staff-connector', 'STARTED LOADING VACANCIES ' + global_settings.staff_connector.vacancy_import.last_run_date );

	argElem = create_arg( 'GetVacancies' );
	argElem.min_date = global_settings.staff_connector.vacancy_import.last_run_date;
	argElem.is_active = true;

	resp = run_request( argElem );

	LogEvent( 'staff-connector', 'RESPONSE RECEIVED ' + resp.vacancies.ChildNum );

	CurMethodProgress.TotalCount = resp.vacancies.ChildNum;
	CurMethodProgress.ItemIndex = 0;

	CurMethodStatistics.total_count = 0;
	CurMethodStatistics.new_count = 0;

	for ( srcVacancy in resp.vacancies )
	{
		vacancyDoc = obtain_object_doc( 'vacancy', srcVacancy.id );
		isNew = vacancyDoc.NeverSaved;

		vacancy = vacancyDoc.TopElem;

		vacancy.name = srcVacancy.name;
		
		if ( srcVacancy.code.HasValue )
			vacancy.code = srcVacancy.code;

		if ( srcVacancy.position_id.HasValue )
		{
			srcPosition = load_position( srcVacancy.position_id );
	
			vacancy.division_id = obtain_division( srcPosition.division_id, 0 );
		}
		else if ( srcVacancy.division_id.HasValue )
		{
			vacancy.division_id = obtain_division( srcVacancy.division_id, 0 );
		}

		if ( srcVacancy.location_name.HasValue )
		{
			srcLocation = find_location( srcVacancy.location_name, srcVacancy.idata_location_name );
			if ( srcLocation != undefined )
			{
				vacancy.location_id = srcLocation.id;
				lib_voc.update_idata_by_voc( vacancy.location_id );
			}
		}

		vacancy.start_date = srcVacancy.open_date;
		vacancy.req_close_date = srcVacancy.req_close_date;

		if ( vacancyDoc.NeverSaved )
			vacancy.is_mp_vacancy = global_settings.use_mp_vacancies && srcVacancy.req_quantity > 1;

		if ( vacancyDoc.NeverSaved && vacancy.is_mp_vacancy )
		{
			if ( srcVacancy.req_quantity > 10000 )
				throw 'Invalid req_quantity value';

			for ( i = 0; i < srcVacancy.req_quantity; i++ )
			{
				instance = vacancy.instances.AddChild();
				instance.id = UniqueID();
				instance.start_date = vacancy.start_date;
			}
		}

		vacancy.reason_id = get_flex_voc_elem_id( srcVacancy.reason_id, vacancy_reasons );

		vacancy.min_salary = srcVacancy.min_salary;
		vacancy.max_salary = srcVacancy.max_salary;
		vacancy.salary_currency_id = srcVacancy.salary_currency_id;

		attachment = vacancy.attachments.ObtainChildByKey( 'vacancy_desc', 'type_id' );
		
		if ( srcVacancy.description_html.HasValue )
			attachment.text = srcVacancy.description_html;
		else
			attachment.text = HtmlEncodeDoc( srcVacancy.description );

		for ( srcPerson in srcVacancy.rr_persons )
		{
			vacancy.rr_persons.ObtainChildByKey( obtain_person( srcPerson.person_id ) );
		}

		if ( srcVacancy.orig_rr_person_id.HasValue )
			vacancy.orig_rr_person_id = obtain_person( srcVacancy.orig_rr_person_id );

		if ( vacancy.rr_persons.ChildNum == 0 && vacancy.division_id.HasValue )
			vacancy.load_rr_persons_by_division();

		if ( ! vacancy.division_id.HasValue && vacancy.rr_persons.ChildNum != 0 )
			vacancy.division_id = vacancy.rr_persons[0].person_id.ForeignElem.division_id;


		if ( srcVacancy.recruiter_person_id.HasValue && ! vacancy.user_id.HasValue )
		{
			recruiterPerson = find_opt_object_record( 'person', srcVacancy.recruiter_person_id );
			if ( recruiterPerson == undefined )
				throw UserError( 'Recruiter person not found: ' + srcVacancy.recruiter_person_id );

			user = ArrayOptFindByKey( users, recruiterPerson.id, 'person_id' );
			if ( user == undefined )
				throw UserError( 'User not found: ' + recruiterPerson.fullname );

			vacancy.user_id = user.id;
		}

		if ( srcVacancy.recruiter_email.HasValue && ! vacancy.user_id.HasValue )
		{
			recruiterPerson = ArrayOptFirstElem( XQuery( 'for $elem in persons where $elem/email = ' + srcVacancy.recruiter_email.XQueryLiteral + ' return $elem' ) );
			if ( recruiterPerson == undefined )
				throw UserError( 'Recruiter person not found: ' + srcVacancy.recruiter_email );

			user = ArrayOptFindByKey( users, recruiterPerson.id, 'person_id' );
			if ( user == undefined )
				throw UserError( 'User not found: ' + recruiterPerson.fullname );

			vacancy.user_id = user.id;
		}

		vacancy.inet_data.AssignElem( srcVacancy.inet_data );

		if ( isNew )
			InitNewVacancyData( vacancy );

		if ( srcVacancy.csd.ChildExists( 'estaff_group_code' ) )
		{
			group = ArrayOptFindByKey( groups, srcVacancy.csd.estaff_group_code, 'name' );
			if ( group == undefined )
				group = ArrayOptFindByKey( groups, 'Moscow', 'name' );

			if ( group != undefined )
				vacancy.group_id = group.id;
		}
		
		for ( srcSubElem in srcVacancy.csd )
		{
			if ( ! vacancy.ChildExists( srcSubElem.Name ) )
				continue;

			vacancy.Child( srcSubElem.Name ).Value = srcSubElem.Value;
		}

		vacancyDoc.Save();

		if ( isNew )
			lib_recruit.OnNewVacancyLoaded( vacancy );

		CurMethodStatistics.total_count++;
		if ( isNew )
			CurMethodStatistics.new_count++;

		CurMethodProgress.ItemIndex++;
	}

	LogEvent( 'staff-connector', 'FINISHED LOADING VACANCIES' );

	global_settings.staff_connector.vacancy_import.last_run_date = startDate;
	global_settings.Doc.Save();

	//LogEvent( '', 'Загружено вакансий: ' + count1 + ( count2 != 0 ? '\nОбновлено заявок: ' + count2 : '' ) );
}


function InitNewVacancyData( vacancy )
{
	vacancy.state_id = global_settings.staff_connector.default_vacancy_state_id;

	if ( ( group = lib_recruit.get_group_by_division( vacancy.division_id ) ) != undefined )
	{
		vacancy.group_id = group.id;
		vacancy.user_id = group.vacancy_load_default_user_id;
	}
	else if ( ! vacancy.user_id.HasValue )
	{
		if ( global_settings.staff_connector.default_vacancy_user_id.HasValue )
			vacancy.user_id = global_settings.staff_connector.default_vacancy_user_id;
				
		if ( global_settings.staff_connector.default_vacancy_group_id.HasValue )
			vacancy.group_id = global_settings.staff_connector.default_vacancy_group_id;
	}
}


function load_position( eid )
{
	argElem = create_arg( 'GetPosition' );
	argElem.position_id = eid;

	resp = run_request( argElem );
	return resp.position;
}


function obtain_division( eid, recursionCount )
{
	if ( eid == '' )
		return null;

	division = lib_base.query_opt_record_by_key( divisions, eid, 'eid' );
	if ( division != undefined )
		return division.id;

	argElem = create_arg( 'GetDivision' );
	argElem.division_id = eid;

	resp = run_request( argElem );

	srcDivision = resp.division;

	//divisionDoc = obtain_object_doc( 'division', eid );
	divisionDoc = DefaultDb.OpenNewObjectDoc( 'division' );
	divisionDoc.TopElem.eid = eid;

	if ( recursionCount >= 32 && srcDivision.parent_id.HasValue )
	{
		LogEvent( 'staff-connector', 'Infinite divisions chain: ' + eid + '  ' + srcDivision.name );
		newParentID = null;
	}
	else
	{
		newParentID = obtain_division( srcDivision.parent_id, recursionCount + 1 );
	}
	
	divisionDoc.TopElem.name = srcDivision.name;
	divisionDoc.TopElem.parent_id = newParentID;
	divisionDoc.TopElem.comment = srcDivision.description;

	divisionDoc.Save();


	for ( srcPerson in srcDivision.rr_persons )
		obtain_person( srcPerson.person_id );

	return divisionDoc.DocID;
}


function obtain_position( eid )
{
	if ( eid == '' )
		return null;

	position = lib_base.query_opt_record_by_key( positions, eid, 'eid' );
	if ( position != undefined )
		return position.id;

	argElem = create_arg( 'GetPosition' );
	argElem.position_id = eid;

	resp = run_request( argElem );

	srcElem = resp.position;

	positionDoc = DefaultDb.OpenNewObjectDoc( 'position' );
	position = positionDoc.TopElem;

	position.eid = eid;
	position.name = srcElem.name;
	position.division_id = obtain_division( srcElem.division_id, 0 );

	positionDoc.Save();

	return positionDoc.DocID;
}


function obtain_person( eid, divisionID )
{
	person = lib_base.query_opt_record_by_key( persons, eid, 'eid' );
	if ( person != undefined )
		return person.id;

	argElem = create_arg( 'GetPerson' );
	argElem.person_id = eid;

	try
	{
		resp = run_request( argElem );
	}
	catch ( e )
	{
		LogEvent( '', 'Error loading staff connector person: ' + eid );
		return null;
	}

	srcPerson = resp.person;

	personDoc = obtain_object_doc( 'person', eid );

	personDoc.TopElem.lastname = srcPerson.lastname;
	personDoc.TopElem.firstname = srcPerson.firstname;
	personDoc.TopElem.middlename = srcPerson.middlename;

	personDoc.TopElem.code = srcPerson.code;
	personDoc.TopElem.birth_date = srcPerson.birth_date;

	personDoc.TopElem.work_phone = srcPerson.phone;
	personDoc.TopElem.mobile_phone = srcPerson.mobile_phone;
	personDoc.TopElem.email = srcPerson.email;
	personDoc.TopElem.email2 = srcPerson.email2;

	personDoc.TopElem.is_own_person = true;
	personDoc.TopElem.position_name = srcPerson.position_name;

	if ( srcPerson.position_id.HasValue )
	{
		//DebugMsg( srcPerson.position_id );
		srcPosition = load_position( srcPerson.position_id );
		personDoc.TopElem.division_id = obtain_division( srcPosition.division_id, 0 );

		if ( srcPerson.position_name == '' )
			personDoc.TopElem.position_name = srcPosition.name;
	}
	else if ( srcPerson.division_id.HasValue )
	{
		personDoc.TopElem.division_id = obtain_division( srcPerson.division_id, 0 );
	}

	personDoc.Save();
	return personDoc.DocID;
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
		doc = DefaultDb.OpenNewObjectDoc( objectName );
		doc.TopElem.eid = eid;
	}

	return doc;
}


function find_opt_object_record( objectName, eid )
{
	array = XQuery( 'for $elem in ' + lib_base.object_name_to_catalog_name( objectName ) + ' where $elem/eid = ' + XQueryLiteral( eid ) + ' return $elem' );

	return ArrayOptFirstElem( array );
}




function create_arg( methodName )
{
	argElem = create_soap_method_arg( 'rcr_service_staff_connector.xmd', methodName );
	if ( argElem.ChildExists( 'auth' ) )
	{
		argElem.auth.login = global_settings.staff_connector.auth.login;
		argElem.auth.password = StrStdDecrypt( global_settings.staff_connector.auth.password_ed );
	}

	return argElem;
}


function run_request( argElem )
{
	if ( global_settings.staff_connector.service_url == '' )
		throw UserError( UiText.errors.staff_connector_service_url_not_specified );

	serviceUrl = global_settings.staff_connector.service_url;

	return call_soap_method( serviceUrl, argElem, 'rcr_service_staff_connector.xmd' );
}



function create_soap_method_arg( formUrl, methodName )
{
	return CreateElem( formUrl, methodName );
}


function call_soap_method( serviceUrl, argElem, formUrl )
{
	var			reqStr, respStr;

	reqStr = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\r\n';
	reqStr += '<soap:Body>\r\n';
	reqStr += argElem.Xml;
	reqStr += '</soap:Body>\r\n';
	reqStr += '</soap:Envelope>\r\n';
	
	reqStr = '<?xml version="1.0" encoding="windows-1251"?>\r\n' + reqStr;
	//reqStr = '<?xml version="1.0" encoding="utf-8"?>\r\n' + EncodeCharset( argElem.Xml, 'utf-8' );
	
	//PutUrlData( 'x-local://Logs/staff-connector-' + argElem.Name + '.xml', reqStr );

	if ( true )
	{
		try
		{
			resp = HttpRequest( serviceUrl, 'post', reqStr, 'Ignore-Errors: 0\nContent-type: text/xml\nSOAPAction: http://www.e-staff.ru/soap/' + argElem.Name );
		}
		catch ( e )
		{
			throw UserError( 'Error calling ' + argElem.Name + ' method through ' + serviceUrl, e );
		}

		respStr = resp.Body;
	}
	else
	{
		respStr = LoadUrlData( 'z.xml' );
	}


	//respStr = '<?xml version="1.0" encoding="windows-1251"?>\r\n' + DecodeCharset( resp.Body, 'utf-8' );
	//PutUrlData( 'x-local://Logs/staff-connector-' + argElem.Name + 'Response.xml', respStr );

	respDoc = OpenDocFromStr( respStr, 'drop-namespaces=1' );
	
	if ( respDoc.TopElem.Name != 'Envelope' )
		throw 'Invalid SOAP response';
	
	respBody = respDoc.Envelope.Body;

	if ( respBody.ChildExists( 'Fault' ) )
		throw respBody.Fault.faultstring;

	if ( resp.RespCode != 200 )
		throw 'HTTP ' + resp.RespCode;

	//alert( formUrl + '   ' + argElem[0][0].Name + 'Response' );

	if ( formUrl == undefined )
		return respBody[0];

	respElem = CreateElem( formUrl, argElem.Name + 'Response' );
	respElem.AssignElem( respBody[0] );
	
	//alert( respElem.Xml );
	return respElem;
}


function get_flex_voc_elem_id( eid, voc )
{
	if ( eid == '' )
		return '';

	if ( ( elem = ArrayOptFindByKey( voc, eid, 'id' ) ) != undefined )
		return elem.id;

	if ( ( elem = ArrayOptFindByKey( voc, eid, 'name' ) ) != undefined )
		return elem.id;

	return '';
}


function find_location( locationName, idataLocationName )
{
	location = ArrayOptFindByKey( locations, locationName, 'name' );
	return location;
}
