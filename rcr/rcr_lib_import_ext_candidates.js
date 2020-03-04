function HandleImportExtCandidates()
{
	fileUrls = ActiveScreen.AskFilesOpen( '', 'CSV / Microsoft Excel (*.csv,*.xls,*.xlsx)\t*.csv;*.xls;*.xlsx\tXML (*.xml)\t*.xml' );

	for ( fileUrl in fileUrls )
		ImportCandidatesFromFile( fileUrl );

	UpdateScreens( '*', '*' );
}


function ImportCandidatesFromFile( fileUrl )
{
	task = new BackgroundTask;
	task.ShowProgress = true;
	task.CallMethod( 'x-app://rcr/rcr_lib_import_ext_candidates.js', 'ImportCandidatesFromFileCore', [fileUrl] );
}


function ImportCandidatesFromFileCore( fileUrl )
{
	param = new Object;
	//param.baseDir = AppConfig.GetProperty( 'aweb-xml-dir' );
	//param.attcBaseDir = AppConfig.GetProperty( 'aweb-attc-dir' );

	progress = new TaskProgress;
	progress.TaskName = 'Importing candidates';

	EnableLog( 'import-candidates', true );
	LogEvent( 'import-candidates', 'TASK STARTED' );
	LogEvent( 'import-candidates', 'Source file: ' + fileUrl );

	useXml = false;

	if ( StrLowerCase( UrlPathSuffix( fileUrl ) ) == '.xml' )
	{
		srcDoc = OpenDoc( fileUrl );
		useXml = true;
	}
	else if ( StrLowerCase( UrlPathSuffix( fileUrl ) ) == '.csv' )
	{
		//srcDoc = OpenDoc( fileUrl, 'format=csv;delim=sem;header-line=1' );
		srcDoc = OpenDocFromStr( LoadUrlText( fileUrl ), 'format=csv;delim=sem;header-line=1' );
	}
	else
	{
		srcDoc = OpenDoc( fileUrl, 'format=excel;header-line=1' );
	}
	//PutUrlData( 'x-local://Logs/zz_csv_candidates.xml', srcDoc.TopElem.Xml );

	StartModalTask(' Importing candidates' );

	//progress.ItemCount = ArrayCount( filePathArray );
	//progress.CurrentItemIndex = 0;
	
	for ( srcElem in srcDoc.TopElem )
	{
		CheckCurThread();
		ModalTaskMsg( srcElem.ChildIndex );
		//progress.CurrentItemName = FileName( filePath );

		if ( useXml )
			LoadCandidateFromXml( param, srcElem );
		else
			LoadCandidate( param, srcElem );
		//break;
		
		//progress.CurrentItemIndex++;
	}
}


function LoadCandidate( param, srcElem )
{
	for ( srcSubElem in srcElem )
	{
		if ( srcSubElem.Value == 'null' )
			srcSubElem.Value = '';
	}

	eid = 'ext:' + srcElem.id;

	candidate = lib_base.query_opt_record_by_key( candidates, eid, 'eid' );
	if ( candidate != undefined )
	{
		candidateDoc = OpenDoc( candidate.ObjectUrl );
		isNew = false;
	}
	else
	{
		candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
		isNew = true;
	}

	candidate = candidateDoc.TopElem;
	id = RValue( candidate.id );
	candidate.AssignElem( srcElem );
	candidate.eid = eid;
	//candidate.creation_date = srcCandidate.RegisterDate;
	//candidate.last_mod_date = srcCandidate.RevisedDate;

	if ( srcElem.ChildExists( 'location_name' ) && srcElem.location_name.HasValue )
	{
		location = ArrayOptFindByKey( locations, srcElem.location_name, 'name' );
		if ( location != undefined )
			candidate.location_id = location.id;
		else if ( ! candidate.address.HasValue )
			candidate.address = srcElem.location_name;
	}

	if ( srcElem.ChildExists( 'last_job_org_name' ) && srcElem.last_job_org_name.HasValue )
	{
		candidate.prev_jobs.Clear();

		prevJob = candidate.prev_jobs.AddChild();
		prevJob.org_name = srcElem.last_job_org_name;

		if ( srcElem.ChildExists( 'last_job_position_name' ) && srcElem.last_job_position_name.HasValue )
			prevJob.position_name = srcElem.last_job_position_name;
	}

	vacancy = undefined;
	if ( srcElem.ChildExists( 'vacancy_id' ) && srcElem.vacancy_id.HasValue )
		vacancy = lib_base.query_opt_record_by_key( vacancies, srcElem.vacancy_id, 'eid' );

	if ( vacancy != undefined )
	{
		spot = candidate.spots.ObtainChildByKey( vacancy.id );
		spot.start_date = candidate.creation_date;
	}
	
	for ( srcAttcElem in srcElem )
	{
		if ( ( obj = StrOptScan( srcAttcElem.Name, 'attachment_%s_file_path' ) ) == undefined )
			continue;

		cardAttachmentTypeID = obj[0];
		if ( GetOptForeignElem( card_attachment_types, cardAttachmentTypeID ) == undefined )
			cardAttachmentTypeID = '';

		fileName = UrlFileName( srcAttcElem.Value );

		try
		{
			data = LoadUrlData( srcAttcElem.Value );
		}
		catch ( e )
		{
			LogEvent( 'import-candidates', 'ERROR: unable to load data from srcAttcElem.Value\r\n' + e );
			continue;
		}

		attc = candidate.attachments.ObtainChildByKey( cardAttachmentTypeID, 'type_id' );
		attc.date = candidate.creation_date;
		//if ( attc.type_id == '' )
			attc.file_name = UrlFileName( srcAttcElem.Value );
		
		if ( StrLowerCase( UrlPathSuffix( fileName ) ) == '.txt' )
		{
			attc.content_type = 'text/plain';
			attc.plain_text = data;
		}
		else
		{
			attc.content_type = 'application/binary';
			attc.data = data;
		}
	}

	if ( ! candidate.last_mod_date.HasValue )
		candidate.last_mod_date = CurDate;

	candidateDoc.WriteDocInfo = false;
	candidateDoc.RunActionOnSave = false;
	candidateDoc.Save();
	
	hasEvents = false;

	if ( ! isNew )
		eventsArray = lib_base.query_records_by_key( events, candidate.id, 'candidate_id' );

	for ( srcEventElem in srcElem )
	{
		if ( srcEventElem.Name == 'hire_date' )
		{
			eventTypeID = 'hire';
		}
		else if ( ( obj = StrOptScan( srcEventElem.Name, 'event_%s_date' ) ) != undefined )
			eventTypeID = obj[0];
		else
			continue;

		if ( ! srcEventElem.HasValue )
			continue;

		if ( eventTypeID == 'client_review' )
			eventTypeID = 'rr_resume_review';

		eventType = GetOptForeignElem( event_types, eventTypeID );
		if ( eventType == undefined )
			continue;

		if ( ! isNew && ( event = ArrayOptFindByKey( eventsArray, eventTypeID, 'type_id' ) ) != undefined )
		{
			eventDoc = OpenDoc( event.ObjectUrl );
		}
		else
		{
			eventDoc = DefaultDb.OpenNewObjectDoc( eventType.get_object_name() );
		}

		event = eventDoc.TopElem;
		event.type_id = eventTypeID;
		event.date = srcEventElem.Value;
		event.candidate_id = candidate.id;

		if ( vacancy != undefined )
			event.vacancy_id = vacancy.id;

		eventCommentElemName = 'event_' + eventTypeID + '_comment';
		if ( ( eventCommentElem = srcElem.OptChild( eventCommentElemName ) ) != undefined && eventCommentElem.HasValue )
			event.comment = eventCommentElem.Value;

		eventDoc.Save();
		hasEvents = true;
	}

	if ( hasEvents )
	{
		candidate.view.target_events_loaded = false;
		candidate.update_state();
		candidateDoc.Save();
	}

	LogEvent( 'import-candidates', ( isNew ? 'Candidate added' : 'Candidate updated' ) );
}


function LoadCandidateFromXml( param, srcElem )
{
	eid = 'ext:' + srcElem.id;

	candidate = lib_base.query_opt_record_by_key( candidates, eid, 'eid' );
	if ( candidate != undefined )
	{
		candidateDoc = OpenDoc( candidate.ObjectUrl );
		isNew = false;
	}
	else
	{
		candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
		isNew = true;
	}

	candidate = candidateDoc.TopElem;
	id = RValue( candidate.id );
	
	if ( srcElem.ChildExists( 'prev_jobs' ) )
		candidate.prev_jobs.Clear();

	if ( srcElem.ChildExists( 'prev_educations' ) )
		candidate.prev_educations.Clear();

	candidate.AssignElem( srcElem );
	candidate.id = id;
	candidate.eid = eid;

	if ( srcElem.ChildExists( 'recruiter_id' ) )
	{
		user = lib_base.query_opt_record_by_key( users, srcElem.recruiter_id, 'login' );
		if ( user == undefined )
			LogEvent( 'import-candidates', 'ERROR: Unable to find user: ' + srcElem.recruiter_id );
		else
			candidate.user_id = user.id;
	}

	if ( srcElem.ChildExists( 'attachments' ) )
	{
		candidate.attachments.Clear();
	
		for ( srcAttachment in srcElem.attachments )
		{
			attachment = candidate.attachments.AddChild();
			attachment.id = FNV1a64( srcAttachment.id );

			if ( srcAttachment.ChildExists( 'type_id' ) )
				attachment.type_id = srcAttachment.type_id;

			attachment.date = srcAttachment.date;
			attachment.file_name = srcAttachment.file_name;
			attachment.content_type = srcAttachment.content_type;
			if ( srcAttachment.data.HasValue )
				attachment.data = Base64Decode( srcAttachment.data );
		}
	}

	if ( srcElem.ChildExists( 'spots' ) )
	{
		candidate.spots.Clear();

		for ( srcSpot in srcElem.spots )
		{
			if ( ! srcSpot.vacancy_id.HasValue )
			{
				LogEvent( 'import-candidates', 'ERROR: Empty spot vacancy_id' );
				continue;
			}

			vacancy = lib_base.query_opt_record_by_key( vacancies, srcElem.vacancy_id, 'eid' );
			if ( vacancy == undefined )
			{
				LogEvent( 'import-candidates', 'ERROR: No vacancy found by eid: ' + srcElem.vacancy_id );
				continue;
			}

			spot = candidate.spots.ObtainChildByKey( vacancy.id );
			spot.start_date = srcSpot.start_date;
		}
	}

	hasEvents = false;

	if ( false && srcElem.ChildExists( 'events' ) )
	{
		if ( ! isNew )
			eventsArray = lib_base.query_records_by_key( events, candidate.id, 'candidate_id' );

		for ( srcEvent in srcElem.events )
		{
			eventTypeID = srcEvent.type_id;

			eventType = GetOptForeignElem( event_types, eventTypeID );
			if ( eventType == undefined )
			{
				LogEvent( 'import-candidates', 'ERROR: Invalid event type: ' + eventTypeID );
				continue;
			}

			if ( ! isNew && ( event = ArrayOptFindByKey( eventsArray, eventTypeID, 'type_id' ) ) != undefined )
			{
				eventDoc = OpenDoc( event.ObjectUrl );
			}
			else
			{
				eventDoc = DefaultDb.OpenNewObjectDoc( eventType.get_object_name() );
			}

			event = eventDoc.TopElem;
			event.type_id = eventTypeID;
			event.occurrence_id = srcEvent.occurrence_id;
			event.date = srcEvent.date;
			event.candidate_id = candidate.id;

			vacancy = undefined;
			if ( srcEvent.vacancy_id.HasValue )
			{
				vacancy = lib_base.query_opt_record_by_key( vacancies, srcEvent.vacancy_id, 'eid' );
				if ( vacancy == undefined )
					LogEvent( 'import-candidates', 'ERROR: No vacancy found by eid: ' + srcEvent.vacancy_id );
			}

			if ( vacancy != undefined )
				event.vacancy_id = vacancy.id;

			event.comment = srcEvent.comment;

			event.creation_date = event.date;
			eventDoc.WriteDocInfo = false;
			eventDoc.RunActionOnSave = false;
			eventDoc.Save();

			hasEvents = true;
		}
	}

	if ( hasEvents )
	{
		candidate.view.target_events_loaded = false;
		candidate.update_state();
		candidateDoc.Save();
	}

	candidateDoc.WriteDocInfo = false;
	candidateDoc.RunActionOnSave = false;
	candidateDoc.Save();

	LogEvent( 'import-candidates', ( isNew ? 'Candidate added' : 'Candidate updated' ) );
}
