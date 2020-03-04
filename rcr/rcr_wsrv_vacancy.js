function AddVacancy( vacancy, options, embedded )
{
	if ( Request.AuthObject.access_role_id.ForeignElem.read_only )
		throw UserError( 'Access denied for this login' );
	
	srcData = vacancy;

	if ( options == undefined )
		options = {full_path_delim:'',divisions_auto_create:false};

	if ( embedded != undefined )
		process_embedded_data( embedded, options );

	if ( ! srcData.name.HasValue )
		throw UserError( 'Empty vacancy name' );

	vacancyDoc = DefaultDb.OpenNewObjectDoc( 'vacancy' );
	vacancy = vacancyDoc.TopElem;

	vacancy.name = srcData.name;
	
	if ( srcData.eid.HasValue )
	{
		storedVacancy = lib_base.query_opt_record_by_key( vacancies, srcData.eid, 'eid' );
		if ( storedVacancy != undefined )
			throw UserError( 'Vacancy with eid ' + srcData.eid + ' already exists' );

		vacancy.eid = srcData.eid;
	}

	if ( srcData.code.HasValue )
		vacancy.code = srcData.code;
	
	if ( srcData.position_id.HasValue && srcData.position_id != 0 )
	{
		if ( ! global_settings.use_positions )
			throw UserError( 'Usage of positions is disabled in global settings' );

		vacancy.position_id = srcData.position_id;
		if ( vacancy.position_id.OptForeignElem == undefined )
			throw UserError( 'Position id ' + srcData.position_id + ' does not reference a valid object' );
	}
	else if ( srcData.position_eid.HasValue )
	{
		if ( ! global_settings.use_positions )
			throw UserError( 'Usage of positions is disabled in global settings' );

		position = lib_base.query_opt_record_by_key( positions, srcData.position_eid, 'eid' );
		if ( position == undefined )
			throw UserError( 'Position with eid ' + srcData.position_eid + ' does not exist' );

		vacancy.position_id = position.id;
	}

	if ( srcData.division_id.HasValue && srcData.division_id != 0 )
	{
		vacancy.division_id = srcData.division_id;
		if ( vacancy.division_id.OptForeignElem == undefined )
			throw UserError( 'Division id ' + srcData.division_id + ' does not reference a valid object' );
	}
	else if ( srcData.division_eid.HasValue )
	{
		division = lib_base.query_opt_record_by_key( divisions, srcData.division_eid, 'eid' );
		if ( division == undefined )
			throw UserError( 'Division with eid ' + srcData.division_eid + ' does not exist' );

		vacancy.division_id = division.id;
	}
	else if ( srcData.division_full_path.HasValue )
	{
		division = obtain_division_by_full_path( srcData.division_full_path, options.full_path_delim, options.divisions_auto_create );
		vacancy.division_id = division.id;
	}
	else if ( vacancy.position_id.HasValue )
	{
		vacancy.division_id = vacancy.position_id.ForeignElem.division_id;
	}

	if ( srcData.orig_rr_person_id.HasValue && srcData.orig_rr_person_id != 0 )
	{
		vacancy.orig_rr_person_id = srcData.orig_rr_person_id;
		if ( vacancy.orig_rr_person_id.OptForeignElem == undefined )
			throw UserError( 'orig_rr_person_id=' + srcData.orig_rr_person_id + ' does not reference a valid object' );
	}
	else if ( srcData.orig_rr_person_eid.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, srcData.orig_rr_person_eid, 'eid' );
		if ( person == undefined )
			throw UserError( 'orig_rr_person_eid=' + srcData.orig_rr_person_eid + ': object does not exist' );

		vacancy.orig_rr_person_id = person.id;
	}
	else if ( srcData.orig_rr_person_email.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, srcData.orig_rr_person_email, 'email' );
		if ( person == undefined )
			throw UserError( 'orig_rr_person_email=' + srcData.orig_rr_person_email + ': object does not exist' );

		vacancy.orig_rr_person_id = person.id;
	}

	if ( srcData.rr_persons.ChildNum != 0 )
	{
		for ( srcRrPerson in srcData.rr_persons )
		{
			rrPerson = vacancy.rr_persons.AddChild();

			if ( srcRrPerson.person_id.HasValue && srcRrPerson.person_id != 0 )
			{
				rrPerson.person_id = srcRrPerson.person_id;
				if ( rrPerson.person_id.OptForeignElem == undefined )
					throw UserError( 'rr_persons.person_id=' + srcRrPerson.person_id + ' does not reference a valid object' );
			}
			else if ( srcRrPerson.person_eid.HasValue )
			{
				person = lib_base.query_opt_record_by_key( persons, srcRrPerson.person_eid, 'eid' );
				if ( person == undefined )
					throw UserError( 'rr_persons.person_eid=' + srcRrPerson.person_eid + ': object does not exist' );

				rrPerson.person_id = person.id;
			}
			else
			{
				throw UserError( 'rr_person: either person_id or person_eid must be specified' );
			}
		}
	}
	else if ( vacancy.orig_rr_person_id.HasValue && vacancy.orig_rr_person_id != 0 )
	{
		rrPerson = vacancy.rr_persons.AddChild();
		rrPerson.person_id = vacancy.orig_rr_person_id;
	}

	if ( srcData.start_date.HasValue )
		vacancy.start_date = srcData.start_date;

	if ( srcData.req_close_date.HasValue )
		vacancy.req_close_date = srcData.req_close_date;

	if ( srcData.req_quantity.HasValue && srcData.req_quantity != 1 )
	{
		if ( srcData.req_quantity == 0 )
			throw UserError( 'req_quantity may not be zero' );

		vacancy.is_mp_vacancy = true;

		for ( i = 0; i < srcData.req_quantity; i++ )
		{
			instance = vacancy.instances.AddChild();
			instance.id = UniqueID();
			instance.start_date = vacancy.start_date;
		}
	}

	AssignVacancyRefField( vacancy, srcData, 'location_id' );
	AssignVacancyRefField( vacancy, srcData, 'reason_id' );
	AssignVacancyRefField( vacancy, srcData, 'recruit_type_id' );
	AssignVacancyRefField( vacancy, srcData, 'staff_category_id' );
	AssignVacancyRefField( vacancy, srcData, 'priority_id' );
	AssignVacancyRefField( vacancy, srcData, 'difficulty_level_id' );
	AssignVacancyRefField( vacancy, srcData, 'cost_center_id' );

	if ( srcData.min_salary.HasValue || srcData.max_salary.HasValue )
	{
		vacancy.min_salary = srcData.min_salary;
		vacancy.max_salary = srcData.max_salary;
		
		if ( srcData.salary_currency_id.HasValue )
		{
			if ( global_settings.use_multi_currencies.vacancy_salary )
			{
				vacancy.salary_currency_id = srcData.salary_currency_id;
				if ( vacancy.salary_currency_id.OptForeignElem == undefined )
					throw UserError( 'salary_currency_id=' + srcData.salary_currency_id + ' does not reference a valid list value' );
			}
			else
			{
				if ( srcData.salary_currency_id != global_settings.default_currency_id )
					throw UserError( 'Currencies other than ' + global_settings.default_currency_id + ' are not allowed for a salary of a vacancy' );
			}
		}
	}

	if ( srcData.work_type_id.HasValue )
	{
		vacancy.work_type_id = srcData.work_type_id;
		if ( vacancy.work_type_id.OptForeignElem == undefined )
			throw UserError( 'work_type_id=' + srcData.work_type_id + ' does not reference a valid list value' );
	}

	if ( srcData.work_schedule_type_id.HasValue )
	{
		vacancy.work_schedule_type_id = srcData.work_schedule_type_id;
		if ( vacancy.work_schedule_type_id.OptForeignElem == undefined )
			throw UserError( 'work_schedule_type_id=' + srcData.work_schedule_type_id + ' does not reference a valid list value' );
	}

	if ( srcData.req_info.educ_type_id.HasValue )
	{
		vacancy.req_info.educ_type_id = srcData.req_info.educ_type_id;
		if ( vacancy.req_info.educ_type_id.OptForeignElem == undefined )
			throw UserError( 'req_info.educ_type_id=' + srcData.req_info.educ_type_id + ' does not reference a valid list value' );
	}

	if ( srcData.req_info.min_exp_years.HasValue )
		vacancy.req_info.min_exp_years = srcData.req_info.min_exp_years;

	if ( srcData.req_info.min_age.HasValue )
		vacancy.req_info.min_age = srcData.req_info.min_age;

	if ( srcData.req_info.max_age.HasValue )
		vacancy.req_info.max_age = srcData.req_info.max_age;

	if ( srcData.req_info.gender_id.HasValue )
	{
		vacancy.req_info.gender_id = srcData.req_info.gender_id;
		if ( vacancy.req_info.gender_id.OptForeignElem == undefined )
			throw UserError( 'req_info.gender_id=' + srcData.req_info.educ_type_id + ' does not reference a valid list value' );
	}

	if ( srcData.description_html.HasValue )
	{
		attachment = vacancy.attachments.ObtainChildByKey( 'vacancy_desc', 'type_id' );
		attachment.content_type = 'text/html';
		attachment.text = srcData.description_html;
	}
	else if ( srcData.description.HasValue )
	{
		attachment = vacancy.attachments.ObtainChildByKey( 'vacancy_desc', 'type_id' );
		attachment.content_type = 'text/plain';
		attachment.plain_text = srcData.description;
	}

	if ( srcData.inet_data.html_comment.HasValue )
		vacancy.inet_data.html_comment = srcData.inet_data.html_comment;
	else if ( srcData.inet_data.comment.HasValue )
		vacancy.inet_data.comment = srcData.inet_data.comment;

	if ( srcData.inet_data.comment_req.HasValue )
		vacancy.inet_data.comment_req = srcData.inet_data.comment_req;

	if ( srcData.inet_data.comment_duty.HasValue )
		vacancy.inet_data.comment_duty = srcData.inet_data.comment_duty;

	if ( srcData.inet_data.comment_cond.HasValue )
		vacancy.inet_data.comment_cond = srcData.inet_data.comment_cond;

	if ( srcData.comment.HasValue )
		vacancy.comment = srcData.comment;

	if ( ( srcData.recruiter_person_id.HasValue && srcData.recruiter_person_id != 0 ) || srcData.recruiter_person_eid.HasValue || srcData.recruiter_person_email.HasValue )
	{
		if ( srcData.recruiter_person_id.HasValue && srcData.recruiter_person_id != 0 )
		{
			person = GetOptForeignElem( persons, srcData.recruiter_person_id );
			if ( person == undefined )
				throw UserError( 'recruiter_person_id=' + srcData.recruiter_person_id + ' does not reference a valid object' );
		}
		else if ( srcData.recruiter_person_eid.HasValue )
		{
			person = lib_base.query_opt_record_by_key( persons, srcData.recruiter_person_eid, 'eid' );
			if ( person == undefined )
				throw UserError( 'recruiter_person_eid=' + srcData.recruiter_person_eid + ': object does not exist' );
		}
		else if ( srcData.recruiter_person_email.HasValue )
		{
			person = lib_base.query_opt_record_by_key( persons, srcData.recruiter_person_email, 'email' );
			if ( person == undefined )
				throw UserError( 'recruiter_person_email=' + srcData.recruiter_person_email + ': object does not exist' );
		}

		usersArray = ArraySelectByKey( ArraySelect( users, 'is_active' ), person.id, 'person_id' );
		switch ( ArrayCount( usersArray ) )
		{
			case 0:
				throw UserError( 'No matching E-Staff user for ' + person.fullname );

			case 1:
				user = ArrayFirstElem( usersArray );
				break;

			default:
				throw UserError( 'Multiple matching E-Staff users for ' + person.fullname );
		}

		vacancy.user_id = user.id;
		vacancy.group_id = user.main_group_id;
	}
	else if ( vacancy.division_id.HasValue && ( group = lib_recruit.get_group_by_division( vacancy.division_id ) ) != undefined )
	{
		vacancy.group_id = group.id;
		vacancy.user_id = group.vacancy_load_default_user_id;
	}
	else
	{
		if ( global_settings.staff_connector.default_vacancy_user_id.HasValue )
			vacancy.user_id = global_settings.staff_connector.default_vacancy_user_id;
		
		if ( global_settings.staff_connector.default_vacancy_group_id.HasValue )
			vacancy.group_id = global_settings.staff_connector.default_vacancy_group_id;
	}

	for ( srcElem in srcData.csd )
	{
		if ( ! StrBegins( srcElem.Name, 'cs_' ) )
			continue;

		elem = vacancy.OptChild( srcElem.Name );
		if ( elem == undefined )
			continue;

		try
		{
			elem.Value = srcElem.Value;
		}
		catch ( e )
		{
		}
	}


	lib_vacancy.InitLoadedVacancy( vacancy );
	vacancyDoc.Save();

	if ( vacancy.user_id.HasValue )
		lib_recruit.create_loaded_vacancy_notif( vacancy );

	CurMethodResult.vacancy_id = vacancy.id;
}


function ChangeVacancy( vacancy, options )
{
	if ( Request.AuthObject.access_role_id.ForeignElem.read_only )
		throw UserError( 'Access denied for this login' );
	
	srcData = vacancy;
	if ( srcData.id == null || srcData.id == 0 )
		throw UserError( 'Empty vacancy id' );

	if ( options == undefined )
		options = {full_path_delim:'',divisions_auto_create:false};

	//if ( embedded != undefined )
		//process_embedded_data( embedded, options );

	vacancyDoc = DefaultDb.OpenObjectDoc( 'vacancy', srcData.id );
	vacancy = vacancyDoc.TopElem;

	vacancy.name = srcData.name;
	
	if ( srcData.eid.HasValue )
	{
		storedVacancy = lib_base.query_opt_record_by_key( vacancies, srcData.eid, 'eid' );
		if ( storedVacancy != undefined )
			throw UserError( 'Vacancy with eid ' + srcData.eid + ' already exists' );

		vacancy.eid = srcData.eid;
	}

	if ( srcData.code.HasValue )
		vacancy.code = srcData.code;
	
	if ( srcData.position_id.HasValue && srcData.position_id != 0 )
	{
		if ( ! global_settings.use_positions )
			throw UserError( 'Usage of positions is disabled in global settings' );

		vacancy.position_id = srcData.position_id;
		if ( vacancy.position_id.OptForeignElem == undefined )
			throw UserError( 'Position id ' + srcData.position_id + ' does not reference a valid object' );
	}
	else if ( srcData.position_eid.HasValue )
	{
		if ( ! global_settings.use_positions )
			throw UserError( 'Usage of positions is disabled in global settings' );

		position = lib_base.query_opt_record_by_key( positions, srcData.position_eid, 'eid' );
		if ( position == undefined )
			throw UserError( 'Position with eid ' + srcData.position_eid + ' does not exist' );

		vacancy.position_id = position.id;
	}

	if ( srcData.division_id.HasValue && srcData.division_id != 0 )
	{
		vacancy.division_id = srcData.division_id;
		if ( vacancy.division_id.OptForeignElem == undefined )
			throw UserError( 'Division id ' + srcData.division_id + ' does not reference a valid object' );
	}
	else if ( srcData.division_eid.HasValue )
	{
		division = lib_base.query_opt_record_by_key( divisions, srcData.division_eid, 'eid' );
		if ( division == undefined )
			throw UserError( 'Division with eid ' + srcData.division_eid + ' does not exist' );

		vacancy.division_id = division.id;
	}
	else if ( srcData.division_full_path.HasValue )
	{
		division = obtain_division_by_full_path( srcData.division_full_path, options.full_path_delim, options.divisions_auto_create );
		vacancy.division_id = division.id;
	}
	else if ( vacancy.position_id.HasValue )
	{
		vacancy.division_id = vacancy.position_id.ForeignElem.division_id;
	}

	if ( srcData.orig_rr_person_id.HasValue && srcData.orig_rr_person_id != 0 )
	{
		vacancy.orig_rr_person_id = srcData.orig_rr_person_id;
		if ( vacancy.orig_rr_person_id.OptForeignElem == undefined )
			throw UserError( 'orig_rr_person_id=' + srcData.orig_rr_person_id + ' does not reference a valid object' );
	}
	else if ( srcData.orig_rr_person_eid.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, srcData.orig_rr_person_eid, 'eid' );
		if ( person == undefined )
			throw UserError( 'orig_rr_person_eid=' + srcData.orig_rr_person_eid + ': object does not exist' );

		vacancy.orig_rr_person_id = person.id;
	}
	else if ( srcData.orig_rr_person_email.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, srcData.orig_rr_person_email, 'email' );
		if ( person == undefined )
			throw UserError( 'orig_rr_person_email=' + srcData.orig_rr_person_email + ': object does not exist' );

		vacancy.orig_rr_person_id = person.id;
	}

	if ( srcData.rr_persons.ChildNum != 0 )
	{
		vacancy.rr_persons.Clear();

		for ( srcRrPerson in srcData.rr_persons )
		{
			rrPerson = vacancy.rr_persons.AddChild();

			if ( srcRrPerson.person_id.HasValue && srcRrPerson.person_id != 0 )
			{
				rrPerson.person_id = srcRrPerson.person_id;
				if ( rrPerson.person_id.OptForeignElem == undefined )
					throw UserError( 'rr_persons.person_id=' + srcRrPerson.person_id + ' does not reference a valid object' );
			}
			else if ( srcRrPerson.person_eid.HasValue )
			{
				person = lib_base.query_opt_record_by_key( persons, srcRrPerson.person_eid, 'eid' );
				if ( person == undefined )
					throw UserError( 'rr_persons.person_eid=' + srcRrPerson.person_eid + ': object does not exist' );

				rrPerson.person_id = person.id;
			}
			else
			{
				throw UserError( 'rr_person: either person_id or person_eid must be specified' );
			}
		}
	}
	else if ( vacancy.orig_rr_person_id.HasValue && vacancy.orig_rr_person_id != 0 )
	{
		rrPerson = vacancy.rr_persons.AddChild();
		rrPerson.person_id = vacancy.orig_rr_person_id;
	}

	if ( srcData.start_date.HasValue )
		vacancy.start_date = srcData.start_date;

	if ( srcData.req_close_date.HasValue )
		vacancy.req_close_date = srcData.req_close_date;

	if ( srcData.req_quantity.HasValue && srcData.req_quantity != 1 )
	{
		if ( srcData.req_quantity == 0 )
			throw UserError( 'req_quantity may not be zero' );

		vacancy.is_mp_vacancy = true;

		for ( i = 0; i < srcData.req_quantity; i++ )
		{
			instance = vacancy.instances.AddChild();
			instance.id = UniqueID();
			instance.start_date = vacancy.start_date;
		}
	}

	AssignVacancyRefField( vacancy, srcData, 'location_id' );
	AssignVacancyRefField( vacancy, srcData, 'reason_id' );
	AssignVacancyRefField( vacancy, srcData, 'recruit_type_id' );
	AssignVacancyRefField( vacancy, srcData, 'staff_category_id' );
	AssignVacancyRefField( vacancy, srcData, 'priority_id' );
	AssignVacancyRefField( vacancy, srcData, 'difficulty_level_id' );
	AssignVacancyRefField( vacancy, srcData, 'cost_center_id' );

	if ( srcData.min_salary.HasValue || srcData.max_salary.HasValue )
	{
		vacancy.min_salary = srcData.min_salary;
		vacancy.max_salary = srcData.max_salary;
		
		if ( srcData.salary_currency_id.HasValue )
		{
			if ( global_settings.use_multi_currencies.vacancy_salary )
			{
				vacancy.salary_currency_id = srcData.salary_currency_id;
				if ( vacancy.salary_currency_id.OptForeignElem == undefined )
					throw UserError( 'salary_currency_id=' + srcData.salary_currency_id + ' does not reference a valid list value' );
			}
			else
			{
				if ( srcData.salary_currency_id != global_settings.default_currency_id )
					throw UserError( 'Currencies other than ' + global_settings.default_currency_id + ' are not allowed for a salary of a vacancy' );
			}
		}
	}

	if ( srcData.work_type_id.HasValue )
	{
		vacancy.work_type_id = srcData.work_type_id;
		if ( vacancy.work_type_id.OptForeignElem == undefined )
			throw UserError( 'work_type_id=' + srcData.work_type_id + ' does not reference a valid list value' );
	}

	if ( srcData.work_schedule_type_id.HasValue )
	{
		vacancy.work_schedule_type_id = srcData.work_schedule_type_id;
		if ( vacancy.work_schedule_type_id.OptForeignElem == undefined )
			throw UserError( 'work_schedule_type_id=' + srcData.work_schedule_type_id + ' does not reference a valid list value' );
	}

	if ( srcData.req_info.educ_type_id.HasValue )
	{
		vacancy.req_info.educ_type_id = srcData.req_info.educ_type_id;
		if ( vacancy.req_info.educ_type_id.OptForeignElem == undefined )
			throw UserError( 'req_info.educ_type_id=' + srcData.req_info.educ_type_id + ' does not reference a valid list value' );
	}

	if ( srcData.req_info.min_exp_years.HasValue )
		vacancy.req_info.min_exp_years = srcData.req_info.min_exp_years;

	if ( srcData.req_info.min_age.HasValue )
		vacancy.req_info.min_age = srcData.req_info.min_age;

	if ( srcData.req_info.max_age.HasValue )
		vacancy.req_info.max_age = srcData.req_info.max_age;

	if ( srcData.req_info.gender_id.HasValue )
	{
		vacancy.req_info.gender_id = srcData.req_info.gender_id;
		if ( vacancy.req_info.gender_id.OptForeignElem == undefined )
			throw UserError( 'req_info.gender_id=' + srcData.req_info.educ_type_id + ' does not reference a valid list value' );
	}

	if ( srcData.description_html.HasValue )
	{
		attachment = vacancy.attachments.ObtainChildByKey( 'vacancy_desc', 'type_id' );
		attachment.content_type = 'text/html';
		attachment.text = srcData.description_html;
	}
	else if ( srcData.description.HasValue )
	{
		attachment = vacancy.attachments.ObtainChildByKey( 'vacancy_desc', 'type_id' );
		attachment.content_type = 'text/plain';
		attachment.plain_text = srcData.description;
	}

	if ( srcData.inet_data.html_comment.HasValue )
		vacancy.inet_data.html_comment = srcData.inet_data.html_comment;
	else if ( srcData.inet_data.comment.HasValue )
		vacancy.inet_data.comment = srcData.inet_data.comment;

	if ( srcData.inet_data.comment_req.HasValue )
		vacancy.inet_data.comment_req = srcData.inet_data.comment_req;

	if ( srcData.inet_data.comment_duty.HasValue )
		vacancy.inet_data.comment_duty = srcData.inet_data.comment_duty;

	if ( srcData.inet_data.comment_cond.HasValue )
		vacancy.inet_data.comment_cond = srcData.inet_data.comment_cond;

	if ( srcData.comment.HasValue )
		vacancy.comment = srcData.comment;

	if ( ( srcData.recruiter_person_id.HasValue && srcData.recruiter_person_id != 0 ) || srcData.recruiter_person_eid.HasValue || srcData.recruiter_person_email.HasValue )
	{
		if ( srcData.recruiter_person_id.HasValue && srcData.recruiter_person_id != 0 )
		{
			person = GetOptForeignElem( persons, srcData.recruiter_person_id );
			if ( person == undefined )
				throw UserError( 'recruiter_person_id=' + srcData.recruiter_person_id + ' does not reference a valid object' );
		}
		else if ( srcData.recruiter_person_eid.HasValue )
		{
			person = lib_base.query_opt_record_by_key( persons, srcData.recruiter_person_eid, 'eid' );
			if ( person == undefined )
				throw UserError( 'recruiter_person_eid=' + srcData.recruiter_person_eid + ': object does not exist' );
		}
		else if ( srcData.recruiter_person_email.HasValue )
		{
			person = lib_base.query_opt_record_by_key( persons, srcData.recruiter_person_email, 'email' );
			if ( person == undefined )
				throw UserError( 'recruiter_person_email=' + srcData.recruiter_person_email + ': object does not exist' );
		}

		usersArray = ArraySelectByKey( ArraySelect( users, 'is_active' ), person.id, 'person_id' );
		switch ( ArrayCount( usersArray ) )
		{
			case 0:
				throw UserError( 'No matching E-Staff user for ' + person.fullname );

			case 1:
				user = ArrayFirstElem( usersArray );
				break;

			default:
				throw UserError( 'Multiple matching E-Staff users for ' + person.fullname );
		}

		vacancy.user_id = user.id;
		vacancy.group_id = user.main_group_id;
	}
	else if ( vacancy.division_id.HasValue && ( group = lib_recruit.get_group_by_division( vacancy.division_id ) ) != undefined )
	{
		vacancy.group_id = group.id;
		vacancy.user_id = group.vacancy_load_default_user_id;
	}
	else
	{
		if ( global_settings.staff_connector.default_vacancy_user_id.HasValue )
			vacancy.user_id = global_settings.staff_connector.default_vacancy_user_id;
		
		if ( global_settings.staff_connector.default_vacancy_group_id.HasValue )
			vacancy.group_id = global_settings.staff_connector.default_vacancy_group_id;
	}

	for ( srcElem in srcData.csd )
	{
		if ( ! StrBegins( srcElem.Name, 'cs_' ) )
			continue;

		elem = vacancy.OptChild( srcElem.Name );
		if ( elem == undefined )
			continue;

		try
		{
			elem.Value = srcElem.Value;
		}
		catch ( e )
		{
		}
	}


	vacancyDoc.Save();

	CurMethodResult.vacancy_id = vacancy.id;
}


function AssignVacancyRefField( vacancy, srcData, fieldName )
{
	if ( srcData.Child( fieldName ).HasValue )
	{
		vacancy.Child( fieldName ).Value = srcData.Child( fieldName );
		if ( vacancy.Child( fieldName ).OptForeignElem == undefined )
			throw UserError( fieldName + '=' + srcData.Child( fieldName ) + ' does not reference a valid list value' );
	}
}


function process_embedded_data( embeddedData, options )
{
	for ( srcPerson in embeddedData.persons )
		process_embedded_person( srcPerson, options );
}


function process_embedded_person( srcPerson, options )
{
	if ( ! srcPerson.lastname.HasValue )
		throw UserError( 'Empty embedded person lastname' );

	if ( ! srcPerson.firstname.HasValue )
		throw UserError( 'Empty embedded person firstname' );

	if ( srcPerson.eid.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, srcPerson.eid, 'eid' );
	}
	else if ( srcPerson.email.HasValue )
	{
		person = lib_base.query_opt_record_by_key( persons, srcPerson.email, 'email' );
	}
	else
	{
		throw UserError( 'Embedded person: either eid or email must be specified' );
	}
	
	if ( srcPerson.division_full_path.HasValue )
	{
		division = obtain_division_by_full_path( srcPerson.division_full_path, options.full_path_delim, options.divisions_auto_create );
		divisionID = division.id;
	}
	else
	{
		divisionID = null;
	}

	if ( person != undefined )
	{
		if ( person.firstname != srcPerson.firstname )
			throw UserError( 'Embedded person firstname mismatch: ' + srcPerson.firstname + ' -> ' + person.firstname );

		if ( person.middlename.HasValue && srcPerson.middlename.HasValue && person.middlename != srcPerson.middlename )
			throw UserError( 'Embedded person middlename mismatch: ' + srcPerson.middlename + ' -> ' + person.middlename );

		if ( person.division_id == divisionID && person.EqualToElem( srcPerson ) )
		{
			//DebugMsg( 'SKIP' );
			return;
		}

		personDoc = OpenDoc( person.ObjectUrl );
	}
	else
	{
		personDoc = DefaultDb.OpenNewObjectDoc( 'person' );
	}

	person = personDoc.TopElem;
	person.AssignElem( srcPerson );
	person.is_own_person = true;
	person.division_id = divisionID;
	
	personDoc.Save();
}


function AddCandidateWithEmployeeReferral( candidateData )
{
	srcData = candidateData;

	if ( ! srcData.lastname.HasValue )
		throw UserError( 'Empty candidate last name' );

	if ( ! srcData.firstname.HasValue )
		throw UserError( 'Empty candidate first name' );

	if ( ! srcData.vacancy_id.HasValue )
		throw UserError( 'Empty vacancy_id' );

	if ( ! srcData.src_person_id.HasValue )
		throw UserError( 'Empty src_person_id' );

	vacancy = lib_base.query_opt_record_by_key( vacancies, srcData.vacancy_id, 'eid' );
	if ( vacancy == undefined )
		throw UserError( 'Vacancy not found' );

	srcPerson = lib_base.query_opt_record_by_key( persons, srcData.src_person_id, 'eid' );
	if ( srcPerson == undefined )
		throw UserError( 'Source person not found' );

	candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
	candidate = candidateDoc.TopElem;

	candidate.lastname = srcData.lastname;
	candidate.firstname = srcData.firstname;
	candidate.middlename = srcData.middlename;
	
	candidate.home_phone = srcData.phone;
	candidate.work_phone = srcData.work_phone;
	candidate.mobile_phone = srcData.mobile_phone;
	candidate.email = srcData.email;

	AssignVacancyRefField( candidate, srcData, 'location_id' );

	candidate.source_id = 'emp_ref';
	candidate.source_person_id = srcPerson.id;

	if ( srcData.html_resume.HasValue )
	{
		lib_resume.load_resume_text( candidate, '', srcData.html_resume, 'text/html', undefined );
	}

	if ( srcData.file_resume.data.HasValue )
	{
		attachment = candidate.atatchments.AddChild();
		attachment.type_id = 'resume';
		attachment.content_type = 'application/binary';
		attachment.file_name = srcData.file_resume.file_name;
		attachment.data = srcData.file_resume.data;
	}

	candidate.user_id = vacancy.user_id;
	candidate.group_id = vacancy.group_id;
	
	candidate.add_spot( vacancy.id );

	candidateDoc.Save();


	if ( srcData.letter_text.HasValue )
	{
		eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
		event = eventDoc.TopElem;

		event.date = CurDate;
		event.type_id = 'note';
		event.candidate_id = candidate.id;
		event.vacancy_id = vacancy.id;
		event.comment = srcPerson.fullname + ':\r\n' + srcData.letter_text;

		eventDoc.Save();
	}

	lib_notif.create_notification( UiText.actions.new_candidate, candidate, {comment: candidate.source_id.ForeignDispName} );

	CurMethodResult.respData.status = 'Ready';
}


function obtain_division_by_full_path( fullPath, pathDelim, autoCreate )
{
	if ( pathDelim == '' )
		pathDelim = '/';

	namesArray = ArrayExtract( String( fullPath ).split( pathDelim ), 'Trim( This )' );
	if ( ArrayCount( namesArray ) == 0 )
		throw UserError( 'Invalid full pathname: "' + fullPath + '"' );

	curBaseID = null;
	count = 1;
	isNew = false;

	for ( name in namesArray )
	{
		if ( name == '' )
			throw UserError( 'Invalid full pathname: "' + fullPath + '"' );

		if ( ! isNew )
			division = ArrayOptFindByKey( lib_base.query_records_by_key( divisions, curBaseID, 'parent_id' ), name, 'name' );
		
		if ( isNew || division == undefined )
		{
			if ( ! autoCreate )
				throw UserError( 'Division with full pathname "' + ArrayMerge( ArrayRange( namesArray, 0, count ), 'This', pathDelim ) + '" does not exist' );

			isNew = true;

			divisionDoc = DefaultDb.OpenNewObjectDoc( 'division' );
			division = divisionDoc.TopElem;
			division.name = name;
			division.parent_id = curBaseID;
			divisionDoc.Save();
		}

		curBaseID = division.id;
		count++;
	}

	return division;
}