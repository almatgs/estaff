function ConvertOldData41()
{
	if ( ArrayCount( candidates ) != 0 )
		ConvertOldDataCore();

	global_settings.conv_old_41_done = true;
	global_settings.Doc.Save();
}


function ConvertOldDataCore()
{
	StartModalTask( UiText.messages.converting_old_data_4x );

	if ( ! DefaultDb.UseSqlStorage )
	{
		try
		{
			ZipCreate( UrlToFilePath( 'x-local://data/obj/xml_41.zip' ), UrlToFilePath( 'x-local://data/obj/xml' ) );
		}
		catch ( e )
		{
			//alert( e );
		}
	}

	if ( ! global_settings.conv_old_40_done )
	{
		ConvertMailTemplates();
		UpdateCandidates();
	}

	UpdateEventTypes();
	UpdateViews();
	
	UpdateVacancies();
	UpdateCalendarEntries();
	UpdateTestings();

	FinishModalTask();
}


function UpdateEventTypes()
{
	for ( eventType in ArraySelect( event_types, 'was_customized || ! is_std' ) )
	{
		//alert( eventType.Xml );

		eventTypeDoc = OpenDoc( eventType.ObjectUrl );
		eventType = eventTypeDoc.TopElem;

		isChanged = false;

		if ( eventType.id == 'vacancy_response' )
		{
			eventType.occurrences.ObtainChildByKey( '' );
			
			try
			{
				eventType.occurrences.DeleteChildByKey( 'succeeded' );
				eventType.occurrences.DeleteChildByKey( 'failed' );
			}
			catch ( e )
			{
			}

			//eventType.was_customized = false;
			isChanged = true;
		}

		for ( occurrence in eventType.occurrences )
		{
			if ( occurrence.id == '' )
			{
				if ( eventType.state_name.HasValue && occurrence.name != eventType.state_name )
				{
					occurrence.name = eventType.state_name;
					eventType.state_name = '';
					isChanged = true;
				}

				if ( ! occurrence.is_enabled )
					isChanged = true;
				
				occurrence.is_enabled = true;
				continue;
			}

			if ( ! occurrence.is_enabled )
				continue;

			if ( occurrence.state_name.HasValue )
			{
				occurrence.name = occurrence.state_name;
				occurrence.state_name = '';
				isChanged = true;
			}
			else if ( occurrence.name.HasValue && ! StrContains( occurrence.name, '-' ) && ! StrContains( occurrence.name, eventType.name ) )
			{
				occurrence.name = eventType.name + ' - ' + occurrence.name;
				isChanged = true;
			}
		}

		if ( isChanged )
		{
			eventTypeDoc.Save();
		}
	}

	lib_event.update_object_states_by_event_types( 'candidate' );
}


function UpdateViews()
{
	view = GetForeignElem( views, 'events' );
	if ( view.was_customized )
	{
		viewDoc = OpenDoc( view.ObjectUrl );
		viewDoc.TopElem.was_customized = false;
		viewDoc.TopElem.AssignElem( OpenDoc( '//base2/base2_std_view_events.xml' ).TopElem );
		viewDoc.Save();
	}
}


function ConvertMailTemplates()
{
	if ( DefaultDb.UseSqlStorage )
		return;

	if ( ArrayOptFind( mail_templates, '! is_std || was_customized' ) != undefined )
		return;

	srcDocUrl = 'x-local://data/obj/xml/mail_templates.xml';
	filePath = UrlToFilePath( srcDocUrl );

	if ( ! FilePathExists( filePath ) )
		return;

	srcDoc = OpenDoc( srcDocUrl, 'form=old/old_mail_templates_40.xmd' );
	for ( srcElem in srcDoc.TopElem )
	{
		if ( ! srcElem.was_customized && srcElem.is_std )
			continue;

		doc = DefaultDb.OpenNewObjectDoc( 'mail_template', srcElem.id );
		doc.TopElem.AssignElem( srcElem );
		doc.Save();
	}

	srcDoc = undefined;
	MoveFile( filePath, FilePath( ParentDirectory( filePath ), 'mail_templates_CONVERTED.xml' ) );
}


function UpdateCandidates()
{
	queryStr = 'for $elem in candidates where $elem/state_date >= ' + XQueryLiteral( DateOffset( CurDate, 0 - 86400 * 30 ) ) + ' return $elem';

	for ( candidateID in ArrayExtract( XQuery( queryStr ), 'id' ) )
	{
		candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
		if ( candidateDoc.TopElem.cp_date.HasValue )
			continue;

		ModalTaskMsg( candidateDoc.TopElem.fullname );

		candidateDoc.WriteDocInfo = false;
		candidateDoc.RunActionOnSave = false;
		candidateDoc.Save();
	}
}


function UpdateVacancies()
{
	//if ( global_settings.is_agency )
		//return;

	queryStr = 'for $elem in vacancies where $elem/is_active = true() or $elem/is_mass_vacancy = true() return $elem';

	for ( vacancy in ArraySelectAll( XQuery( queryStr ) ) )
	{
		ModalTaskMsg( vacancy.name );

		vacancyDoc = OpenDoc( vacancy.ObjectUrl );
		
		if ( ! global_settings.conv_old_40_done )
		{
			if ( vacancyDoc.TopElem.is_mass_vacancy )
			{
				vacancyDoc.TopElem.is_mp_vacancy = true;
				if ( vacancyDoc.TopElem.req_quantity >= 2 && vacancyDoc.TopElem.req_quantity >= vacancyDoc.TopElem.processed_quantity )
					vacancyDoc.TopElem.active_req_quantity = vacancyDoc.TopElem.req_quantity - vacancyDoc.TopElem.processed_quantity;
			}
		}

		vacancyDoc.WriteDocInfo = false;
		vacancyDoc.Save();
	}
}


function UpdateCalendarEntries()
{
	if ( ArrayCount( calendar_entries ) != 0 )
		return;

	query = 'for $elem in events where $elem/date >= ' + XQueryLiteral( DateOffset( CurDate, 0 - 30 * 86400 ) ) + ' return $elem';

	array = ArraySelect( XQuery( query ), 'type.is_calendar_entry' );

	for ( event in array )
	{
		ModalTaskMsg( event.date );

		//LogEvent( '', event.ObjectUrl );
		eventDoc = OpenDoc( event.ObjectUrl );

		calendarEntryDoc = OpenNewDoc( '//cn/cn_calendar_entry.xmd', 'separate=1' );
		calendarEntryDoc.Url = ObjectDocUrl( 'data', 'calendar_entry', event.id );
		calendarEntryDoc.TopElem.AssignElem( eventDoc.TopElem );

		calendarEntryDoc.RunActionOnSave = false;
		calendarEntryDoc.WriteDocInfo = false;
		calendarEntryDoc.Save();
	}
}


function UpdateTestings()
{
	query = 'for $elem in events where $elem/date >= ' + XQueryLiteral( DateOffset( CurDate, 0 - 30 * 86400 ) ) + ' return $elem';

	array = ArraySelectAll( XQuery( query ) );

	for ( testing in ArraySelect( testings, 'occurrence_id == \'started\'' ) )
	{
		eventType = testing.type;

		if ( ! eventType.has_occurrence( testing.occurrence_id ) )
		{
			eventDoc = OpenDoc( testing.ObjectUrl );
			eventDoc.TopElem.occurrence_id.Clear();
			eventDoc.Save();
		}
	}
}


function RestoreVacancyInstances( vacancy )
{
	if ( vacancy.instances.ChildNum != 0 )
		return;

	if ( vacancy.req_quantity <= 1 )
		return;

	for ( i = 0; i < vacancy.req_quantity; i++ )
	{
		instance = vacancy.instances.AddChild();
		instance.start_date = vacancy.start_date;
	}

	closedInstancesNum = 0;

	for ( record in ArraySelectAll( vacancy.records ) )
	{
		if ( record.type_id == 'hire' )
		{
			if ( closedInstancesNum >= vacancy.instances.ChildNum )
				break;

			instance = vacancy.instances[closedInstancesNum];
			instance.state_id = 'vacancy_closed';
			instance.state_date = record.date;
			instance.final_candidate_id = record.candidate_id;
			instance.comment = record.comment;

			closedInstancesNum++;
			record.Delete();
		}
		else if ( record.type_id != 'state_change' )
		{
			record.Delete();
		}
	}
}

