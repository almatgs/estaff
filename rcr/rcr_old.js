var		gSrcBaseDir;
var		gUsersNum;
var		gMaxUsersNum;
var		gOldLocations;
var		gLastSrcFile;
var		gObjectsCount;
var		gAdMap;
var		gPrevConvDate;


function LoadOldDataPrepare()
{
	gSrcBaseDir = FilePath( AppDirectoryPath(), 'data' );

	ConvertGlobalSettings();
	ConvertCsdTemplates();
}


function LoadOldData()
{
	errDesc = '';

	StartModalTask( UiText.messages.converting_old_data );

	WriteDocInfo = false;

	gSrcBaseDir = FilePath( AppDirectoryPath(), 'data' );

	EnableLog( 'conv' );
	LogEvent( 'conv', '--- STARTED' );

	if ( ! DefaultDb.UseSqlStorage )
	{
		destBaseDir = ParentDirectory( UrlToFilePath( 'x-local://data/static/' ) );
		if ( FilePathExists( destBaseDir ) )
		{
			gPrevConvDate = GetFileModDate( destBaseDir );
			
			if ( DateNewTime( gPrevConvDate ) == DateNewTime( CurDate ) )
				gPrevConvDate = undefined;
			else
				gPrevConvDate = DateOffset( DateNewTime( gPrevConvDate ), 86400 );
		}
	}



	rcr_config.is_converting_old_data = true;

	if ( true || gPrevConvDate == undefined )
	{
		ConvertCoding();
		ConvertSkillTypes();
		ConvertCardAttachmentTypes();
		//ConvertExportScenarios();
		//ConvertImportScenarios();
		ConvertEventTypes();
		ConvertLocations();
		ConvertMailTemplates();
		ConvertOrgTypes();
		ConvertRoles();
		ConvertRooms();
		ConvertCandidateSources();
		ConvertInetSites();
		ConvertOrderStates();
		ConvertProfessions();
		ConvertRecordTypes();
		ConvertCourses();
	}

	RegisterFormMapping( 'x-local://bs/bs_org.xmd', '/old/old_org.xmd' );
	RegisterFormMapping( 'x-local://bs/bs_person.xmd', '/old/old_person.xmd' );
	RegisterFormMapping( 'x-local://rc/rc_position.xmd', '/old/old_position.xmd' );
	RegisterFormMapping( 'x-local://rc/rc_position_ad.xmd', '/old/old_position_ad.xmd' );
	RegisterFormMapping( 'x-local://rc/rc_candidate.xmd', '/old/old_candidate.xmd' );
	RegisterFormMapping( 'x-local://bs/bs_user.xmd', '/old/old_user.xmd' );
	RegisterFormMapping( 'x-local://bs/bs_user_group.xmd', '/old/old_user_group.xmd' );
	RegisterFormMapping( 'x-local://bs/bs_event.xmd', '/old/old_event.xmd' );

	gMaxUsersNum = AppSnLimit;
	if ( gMaxUsersNum == 0 )
		gMaxUsersNum = 30;

	gUsersNum = 0;

	gAdMap = OpenNewDoc( 'old/ad_map.xmd' ).TopElem;
	
	//ConvertObject( 'x-local://data/objects/038B080EF81DEF/18.xml' );


	try
	{
		gLastSrcFile = LoadFileData( FilePath( gSrcBaseDir, 'conv_stat.txt' ) );
	}
	catch ( e )
	{
		gLastSrcFile = '';
	}

	gObjectsCount = 0;
	LogEvent( 'conv', '--- //data/objects' );

	ConvertDir( FilePath( gSrcBaseDir, 'objects' ) );

	try
	{
		DeleteFile( FilePath( gSrcBaseDir, 'conv_stat.txt' ) );
	}
	catch ( e )
	{
	}

	ConvertPositionAds();

	if ( ArrayCount( groups ) != 0 )
	{
		lib_recruit.adjust_unbound_groups( 'vacancy' );
		lib_recruit.adjust_unbound_groups( 'candidate' );
		lib_recruit.adjust_unbound_groups( 'event' );
	}
	
	rcr_config.is_converting_old_data = false;

	FinishModalTask();
	LogEvent( 'conv', '--- DONE' );

	WriteDocInfo = true;

	global_settings.conv_old_41_done = true;
	global_settings.Doc.Save();
}


function LoadOldHeapData()
{
	errDesc = '';

	StartModalTask( UiText.messages.converting_old_data );

	WriteDocInfo = false;

	gSrcBaseDir = FilePath( AppDirectoryPath(), 'data_h' );

	EnableLog( 'conv' );
	LogEvent( 'conv', '--- STARTED (HEAP)' );

	rcr_config.is_converting_old_data = true;

	RegisterFormMapping( 'x-local://rc/rc_candidate.xmd', '/old/old_candidate.xmd' );

	gMaxUsersNum = AppSnLimit;
	if ( gMaxUsersNum == 0 )
		gMaxUsersNum = 30;

	gUsersNum = 0;

	try
	{
		gLastSrcFile = LoadFileData( FilePath( gSrcBaseDir, 'conv_stat.txt' ) );
	}
	catch ( e )
	{
		gLastSrcFile = '';
	}

	gObjectsCount = 0;
	LogEvent( 'conv', '--- //data/objects' );

	ConvertDir( FilePath( gSrcBaseDir, 'objects' ) );

	try
	{
		DeleteFile( FilePath( gSrcBaseDir, 'conv_stat.txt' ) );
	}
	catch ( e )
	{
	}

	rcr_config.is_converting_old_data = false;

	FinishModalTask();
	LogEvent( 'conv', '--- DONE (HEAP)' );
}


function ConvertGlobalSettings( docUrl )
{
	srcPath = FilePath( gSrcBaseDir, 'rc_global_settings.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_global_settings.xmd' );

	global_settings.is_agency = srcDoc.TopElem.is_agency;
	global_settings.is_inited = true;

	global_settings.use_vacancy_dual_users = srcDoc.TopElem.use_position_dual_users;
	global_settings.use_org_init_users = srcDoc.TopElem.use_org_init_users;

	//global_settings.use_vacancy_close_notif = srcDoc.TopElem.use_vacancy_close_notif;
	//global_settings.vacancy_close_notif.AssignElem( srcDoc.TopElem.vacancy_close_notif );

	global_settings.staff_connector.AssignElem( srcDoc.TopElem.staff_connector );

	//global_settings.own_mail_domain.AssignElem( srcDoc.TopElem.own_mail_domain );

	global_settings.use_candidate_select_event = true;

	global_settings.set_init_dep_values();
	global_settings.Doc.Save();
}


function ConvertCsdTemplates()
{
	ConvertCsdTemplate( 'org', ( global_settings.is_agency ? 'org' : 'division' ) );
	ConvertCsdTemplate( 'person', 'person' );
	ConvertCsdTemplate( 'position', 'vacancy' );
	ConvertCsdTemplate( 'candidate', 'candidate' );
}


function ConvertCsdTemplate( srcObjectName, newObjectName )
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'csd' ), 'au_csd_' + srcObjectName + '.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_object_csd.xmd' );

	newDoc = OpenDocFromStr( '<SPXML-COMBO-FORM></SPXML-COMBO-FORM>' );
	newBaseElem = newDoc.TopElem.AddChild( 'Ps' );

	ConvertCsdItem( srcDoc.TopElem, newBaseElem, 0 );

	newUrl = 'x-local://data/csd/csd_' + newObjectName + '.xmc';
	newDoc.Save( newUrl );

	//lib_csd.register_csd_data_form( DefaultDb.GetObjectForm( newObjectName ).Url, newUrl );
}


function ConvertCsdItem( srcBaseItem, newBaseItem, level )
{
	var			srcItem, newItem, isDataElem;

	for ( srcItem in srcBaseItem.items )
	{
		if ( srcItem.is_sample )
			continue;

		switch ( srcItem.type )
		{
			case 'string':
			case 'integer':
			case 'real':
			case 'bool':
			case 'date':
			case 'record':
				isDataElem = true;
				break;

			default:
				isDataElem = false;
		}

		if ( isDataElem )
		{
			newItem = newBaseItem.AddChild( ( level == 0 ? 'cs_' : '' ) + srcItem.id );
			
			if ( isDataElem && srcItem.type != 'record' )
				newItem.AddAttr( 'TYPE', srcItem.type );
			
			if ( srcItem.name.HasValue )
				newItem.AddAttr( 'TITLE', srcItem.name );

			if ( srcItem.is_multiline && ! srcItem.has_values_list )
				newItem.AddAttr( 'MULTILINE', '1' );

			if ( srcItem.has_values_list )
			{
				for ( srcValue in srcItem.values_list )
					newItem.AddChild( 'ENTRY' ).AddAttr( 'VALUE', srcValue );
			}

			ConvertCsdItem( srcItem, newItem, level + 1 );
		}
		else
		{
			if ( srcItem.type == 'LINE' )
				newItem = newBaseItem.AddChild( 'LINE' );
			else if ( srcItem.type == 'PAGE' )
			{
				newItem = newBaseItem.AddChild( 'PAGE' );
				newItem.AddAttr( 'TITLE', srcItem.name );
			}

			ConvertCsdItem( srcItem, newBaseItem, level );

			if ( srcItem.type == 'LINE' )
				newItem = newBaseItem.AddChild( 'LINE-END' );
			else if ( srcItem.type == 'PAGE' )
				newItem = newBaseItem.AddChild( 'PAGE-END' );
		}
	}
}


function ConvertCoding()
{
	ConvertObjectCoding( 'org', ( global_settings.is_agency ? 'org' : 'division' ) );
	ConvertObjectCoding( 'person', 'person' );
	ConvertObjectCoding( 'position', 'vacancy' );
	ConvertObjectCoding( 'candidate', 'candidate' );
}


function ConvertObjectCoding( srcObjectName, newObjectName )
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'coding' ), 'au_coding_' + srcObjectName + '.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_object_coding.xmd' );

	newDoc = OpenDoc( lib_base.get_coding_doc_url( newObjectName ) );
	newDoc.TopElem.AssignElem( srcDoc.TopElem );
	newDoc.Save();
}


function ConvertSkillTypes()
{
	srcPath = FilePath( gSrcBaseDir, 'rc_skill_types.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_skill_types.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		newElem = CreateNewVocElem( skill_types );
		newElem.AssignElem( srcItem );
		newElem.use_levels = srcItem.has_levels;

		if ( ! newElem.id.HasValue )
			newElem.id = newElem.name;

		RegisterVocElem( skill_types, newElem );

		if ( srcItem.has_sub_types )
		{
			for ( srcSubItem in srcItem.items )
			{
				newSubElem = CreateNewVocElem( skill_types );
				newSubElem.AssignElem( srcSubItem );
				newSubElem.parent_id = newElem.id;
				newSubElem.use_parent_levels = newElem.use_levels;

				RegisterVocElem( skill_types, newSubElem );
			}
		}
	}
}


function ConvertCardAttachmentTypes()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'au_card_attachment_types.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_card_attachment_types.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		if ( srcItem.is_std )
			continue;

		newElem = CreateNewVocElem( card_attachment_types );
		newElem.AssignElem( srcItem );
		
		RegisterVocElem( card_attachment_types, newElem );
	}
}


function ConvertExportScenarios()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'au_export_scenarios.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_export_scenarios.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		if ( srcItem.is_std )
			continue;

		newElem = CreateNewVocElem( export_scenarios );
		newElem.AssignElem( srcItem );
		
		RegisterVocElem( export_scenarios, newElem );
	}
}


function ConvertEventTypes()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'bs_event_types.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_event_types.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		if ( srcItem.is_std || srcItem.is_ext )
			continue;

		newElem = CreateNewVocElem( event_types );
		newElem.AssignElem( srcItem );

		if ( srcItem.show_in_calendar )
			newElem.is_calendar_entry = true;

		newElem.use_participants = true;

		if ( srcItem.use_completion )
		{
			if ( srcItem.show_in_calendar )
			{
				newElem.occurrences.ObtainChildByKey( 'scheduled' );
				newElem.occurrences.ObtainChildByKey( '' );
				newElem.occurrences.ObtainChildByKey( 'cancelled' );
			}
		}

		RegisterVocElem( event_types, newElem );
	}
}


function ConvertLocations()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'bs_locations.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_locations.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		//if ( srcItem.is_std )
			//continue;

		newElem = CreateNewVocElem( locations );
		newElem.AssignElem( srcItem );
		
		RegisterVocElem( locations, newElem );
	}
}


function ConvertMailTemplates()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'bs_mail_templates.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_mail_templates.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		//if ( srcItem.is_std )
			//continue;

		newElem = CreateNewVocElem( mail_templates );
		newElem.AssignElem( srcItem );

		newElem.text = StrReplace( newElem.text, 'position.', 'vacancy.' );
		newElem.text = StrReplace( newElem.text, 'postal_address', 'address' );
		newElem.text = StrReplace( newElem.text, 'location_desc_text', 'org.opt_attachment_plain_text( \'location_desc\' )' );
		newElem.text = StrReplace( newElem.text, 'find_planned_record', 'find_scheduled_event' );
		
		RegisterVocElem( mail_templates, newElem );
	}
}


function ConvertOrgTypes()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'bs_org_types.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_org_types.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		//if ( srcItem.is_std )
			//continue;

		newElem = CreateNewVocElem( org_types );
		newElem.AssignElem( srcItem );
		
		RegisterVocElem( org_types, newElem );
	}
}


function ConvertRoles()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'bs_roles.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_roles.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		if ( srcItem.is_std )
			continue;

		newElem = CreateNewVocElem( person_roles );
		newElem.AssignElem( srcItem );
		
		RegisterVocElem( person_roles, newElem );
	}
}


function ConvertRooms()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'bs_rooms.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_rooms.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		//if ( srcItem.is_std )
			//continue;

		newElem = CreateNewVocElem( rooms );
		newElem.AssignElem( srcItem );
		
		RegisterVocElem( rooms, newElem );
	}
}


function ConvertCandidateSources()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'rc_cand_sources.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_cand_sources.xmd' );

	ConvertCandidateSourcesLevel( srcDoc.TopElem.items, '' );
}


function ConvertCandidateSourcesLevel( srcBaseItem, parentID )
{
	for ( srcItem in srcBaseItem )
	{
		if ( srcItem.is_std )
		{
			ConvertCandidateSourcesLevel( srcItem.items, srcItem.id );
			continue;
		}

		if ( parentID == 'ad_response' || parentID == 'resume_search' )
			parentID = '';

		newElem = CreateNewVocElem( candidate_sources );
		newElem.AssignElem( srcItem );
		newElem.parent_id = parentID;

		RegisterVocElem( candidate_sources, newElem );

		ConvertCandidateSourcesLevel( srcItem.items, newElem.id );
	}
}


function ConvertInetSites()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'rc_inet_sites.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_inet_sites.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		if ( srcItem.is_std )
			continue;

		newElem = CreateNewVocElem( candidate_sources );
		newElem.AssignElem( srcItem );
		newElem.is_site = true;
		newElem.parent_id = 'site';
		
		RegisterVocElem( candidate_sources, newElem );
	}
}


function ConvertOrderStates()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'rc_order_states.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_order_states.xmd' );

	for ( srcItem in srcDoc.TopElem.items )
	{
		if ( srcItem.is_std )
			continue;

		newElem = CreateNewVocElem( vacancy_states );
		newElem.AssignElem( srcItem );
		newElem.deactivate_object = srcItem.stop_active;
		
		RegisterVocElem( vacancy_states, newElem );
	}
}


function ConvertProfessions()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'rc_professions.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	for ( elem in ArraySelectAll( professions ) )
	{
		if ( ! elem.is_std )
			continue;

		try
		{
			DeleteDoc( elem.ObjectUrl, true );
		}
		catch ( e )
		{
		}
	}
	
	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_professions.xmd' );

	ConvertProfessionsLevel( srcDoc.TopElem.items, null );
}


function ConvertProfessionsLevel( srcBaseItem, parentID )
{
	for ( srcItem in srcBaseItem )
	{
		//if ( srcItem.is_std )
			//continue;

		newElem = CreateNewVocElem( professions );
		newElem.AssignElem( srcItem );
		newElem.parent_id = parentID;

		RegisterVocElem( professions, newElem );

		ConvertProfessionsLevel( srcItem.items, newElem.id );
	}
}


function ConvertRecordTypes()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'rc_record_types.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_record_types.xmd' );

	for ( srcElem in srcDoc.TopElem.items )
	{
		if ( srcElem.is_std )
			continue;

		newElem = CreateNewVocElem( event_types );
		newElem.AssignElem( srcElem );
		newElem.target_object_type_id.ObtainByValue( 'candidate' );
		newElem.image_url = '';

		if ( srcElem.use_completion )
		{
			if ( srcElem.show_in_calendar )
			{
				newElem.occurrences.ObtainChildByKey( 'scheduled' );
				newElem.occurrences.ObtainChildByKey( '' );
				newElem.occurrences.ObtainChildByKey( 'cancelled' );
			}
			else
			{
				newElem.occurrences.ObtainChildByKey( 'succeeded' );
				newElem.occurrences.ObtainChildByKey( 'failed' );
			}
		}

		RegisterVocElem( event_types, newElem );
		


		/*
		if ( srcElem.use_completion && srcElem.custom.completed.str.HasValue )
		{
			newElem = CreateNewVocElem( event_types );
			newElem.AssignElem( srcElem );
			newElem.target_object_type_id = 'candidate';
			newElem.image_url = '';
			newElem.name = srcElem.custom.completed.str;
			newElem.text_color = srcElem.custom.completed.text_color;
		}
		
		if ( srcElem.use_completion && srcElem.custom.not_completed.str.HasValue )
		{
			newElem = CreateNewVocElem( event_types );
			newElem.AssignElem( srcElem );
			newElem.target_object_type_id = 'candidate';
			newElem.image_url = '';
			newElem.name = srcElem.custom.not_completed.str;
			newElem.text_color = srcElem.custom.not_completed.text_color;
		}
		*/
	}

	lib_event.update_object_states_by_event_types( 'candidate' );
}



function ConvertCourses()
{
	srcPath = FilePath( FilePath( gSrcBaseDir, 'vocs' ), 'rc_courses.xml' );
	if ( ! FilePathExists( srcPath ) )
		return;

	srcDoc = OpenDoc( FilePathToUrl( srcPath ), 'form=old/old_courses.xmd' );

	for ( srcElem in srcDoc.TopElem.items )
	{
		if ( srcElem.is_std )
			continue;

		newElem = CreateNewVocElem( external_tests );
		newElem.AssignElem( srcElem );

		RegisterVocElem( external_tests, newElem );
	}
}




function ConvertDir( srcDir )
{
	var			items;
	var			item;

	//if ( gObjectsCount >= 2000 )
		//return;

	try
	{
		items = ReadDirectoryByPath( srcDir );
	}
	catch ( e )
	{
		return;
	}

	items = ArraySort( items, 'This', '+' );

	for ( item in items )
	{
		if ( StrEnds( item, '.xml' ) )
			ConvertObject( item );
		else
			ConvertDir( item );
	}
}


function ConvertObject( srcFile )
{
	if ( false && srcFile < gLastSrcFile )
	{
		LogEvent( 'conv', 'SKIP ' + srcFile );
		return;
	}

	gLastSrcFile = srcFile;
	PutFileData( FilePath( gSrcBaseDir, 'conv_stat.txt' ), gLastSrcFile );

	gObjectsCount++;
	LogEvent( 'conv', srcFile );

	try
	{
		obj = StrScan( srcFile, '%*s\\objects\\%s\\%s.xml' );
	}
	catch ( e )
	{
		return;
	}

	if ( StrLen( obj[0] ) == 4 )
	{
		try
		{
			objectID = Int( obj[0] + obj[1] );
		}
		catch ( e )
		{
			return;
		}
	}
	else
	{
		try
		{
			objectID = Int( '0x' + obj[0] + obj[1] );
		}
		catch ( e )
		{
			return;
		}
	}

	//alert( objectID );


	try
	{
		srcDoc = OpenDoc( FilePathToUrl( srcFile ) );
	}
	catch ( e )
	{
		LogEvent( 'conv', e );
		//alert( e );
		//throw e;
		return;
	}

	if ( StrEnds( srcDoc.FormUrl, '_position_ad.xmd' ) )
	{
		entry = gAdMap.AddChild();
		entry.ad_id = objectID;
		entry.src_url = srcDoc.Url;
		entry.vacancy_id = srcDoc.TopElem.position_id;
		return;
	}


	ModalTaskMsg( StrHexInt( objectID, 16 ) );

	if ( StrEnds( srcDoc.FormUrl, '_org.xmd' ) )
		objectName = ( global_settings.is_agency ? 'org' : 'division' );
	else if ( StrEnds( srcDoc.FormUrl, '_person.xmd' ) )
		objectName = 'person';
	else if ( StrEnds( srcDoc.FormUrl, '_position.xmd' ) )
		objectName = 'vacancy';
	else if ( StrEnds( srcDoc.FormUrl, '_candidate.xmd' ) )
		objectName = 'candidate';
	else if ( StrEnds( srcDoc.FormUrl, '/old_user.xmd' ) )
		objectName = 'user';
	else if ( StrEnds( srcDoc.FormUrl, '_group.xmd' ) )
		objectName = 'group';
	else if ( StrEnds( srcDoc.FormUrl, '_event.xmd' ) )
	{
		if ( GetForeignElem( event_types, srcDoc.TopElem.type_id ).is_calendar_entry )
			objectName = 'calendar_entry';
		else
			objectName = 'event';
	}
	else
	{
		//alert( srcDoc.FormUrl );
		return;
	}


	newDoc = OpenNewDoc( DefaultDb.GetObjectForm( objectName ).Url, 'separate=1' );
	newDoc.Url = ObjectDocUrl( 'data', objectName, objectID );

	newDoc.TopElem.AssignElem( srcDoc.TopElem );
	newDoc.TopElem.id = objectID;
	newDoc.TopElem.creation_date = srcDoc.TopElem.doc_info.creation.date;
	newDoc.TopElem.last_mod_date = srcDoc.TopElem.doc_info.modification.date;

	if ( srcDoc.TopElem.ChildExists( 'csd' ) )
		ConvertCsdElems( srcDoc.TopElem.csd, newDoc.TopElem, 0 );


	if ( objectName == 'org' )
	{
		newDoc.TopElem.name = srcDoc.TopElem.disp_name;
		newDoc.TopElem.full_name = srcDoc.TopElem.name;
		newDoc.TopElem.is_customer = true;
		newDoc.TopElem.address = srcDoc.TopElem.postal_address;
		//newDoc.TopElem.state_id = srcDoc.TopElem.state_event_type_id;
		//newDoc.TopElem.state_date = srcDoc.TopElem.state_event_date;
	}
	else if ( objectName == 'division' )
	{
		newDoc.TopElem.name = srcDoc.TopElem.disp_name;
		newDoc.TopElem.full_name = srcDoc.TopElem.name;
		newDoc.TopElem.type_id = '';
	}
	else if ( objectName == 'person' )
	{
		if ( newDoc.TopElem.birth_date.HasValue && Month( newDoc.TopElem.birth_date ) == undefined )
		{
			newDoc.TopElem.birth_year = Year( newDoc.TopElem.birth_date );
			newDoc.TopElem.birth_date.Clear();
		}

		newDoc.TopElem.work_phone = srcDoc.TopElem.phone;

		if ( ! global_settings.is_agency )
		{
			newDoc.TopElem.is_own_person = true;
			newDoc.TopElem.division_id = srcDoc.TopElem.org_id;
		}
	}
	else if ( objectName == 'vacancy' )
	{
		if ( ! global_settings.is_agency )
		{
			newDoc.TopElem.division_id = srcDoc.TopElem.org_id;
			newDoc.TopElem.org_id = null;
		}

		if ( srcDoc.TopElem.person_id.HasValue )
			newDoc.TopElem.rr_persons.AddChild().person_id = srcDoc.TopElem.person_id;

		attachment = newDoc.TopElem.attachments.ObtainChildByKey( 'vacancy_desc', 'type_id' );
		attachment.date = newDoc.TopElem.creation_date;
		attachment.text = HtmlEncodeDoc( srcDoc.TopElem.job_desc );

		if ( srcDoc.TopElem.orders.ChildNum == 0 && srcDoc.TopElem.records.ChildNum != 0 )
		{
			for ( record in newDoc.TopElem.records )
			{
				record.state_id = ConvertVacancyRecordTypeID( record.type_id );
				record.type_id = 'state_change';
			}

			newDoc.TopElem.records.Sort( 'date', '+' );

			newDoc.TopElem.start_date = newDoc.TopElem.records[0].date;
			newDoc.TopElem.state_id = newDoc.TopElem.records[newDoc.TopElem.records.ChildNum - 1].state_id;
			newDoc.TopElem.state_date = newDoc.TopElem.records[newDoc.TopElem.records.ChildNum - 1].date;
		}
		else if ( srcDoc.TopElem.orders.ChildNum <= 1 )
		{
			newDoc.TopElem.records.Clear();

			newDoc.TopElem.start_date = srcDoc.TopElem.main_order.date;
			newDoc.TopElem.state_id = ConvertOrderStateID( srcDoc.TopElem.main_order.state_id );
			newDoc.TopElem.state_date = srcDoc.TopElem.state_date;
		}
		else
		{
			newDoc.TopElem.records.Clear();

			newDoc.TopElem.state_id = srcDoc.TopElem.state_id;
			newDoc.TopElem.state_date = srcDoc.TopElem.state_date;

			newDoc.TopElem.is_mp_vacancy = true;

			for ( srcOrder in ArraySort( srcDoc.TopElem.orders, 'date', '+' ) )
			{
				if ( ! newDoc.TopElem.start_date.HasValue )
					newDoc.TopElem.start_date = srcOrder.date;

				instance = newDoc.TopElem.instances.AddChild();
				instance.start_date = srcOrder.date;
				instance.req_close_date = srcOrder.req_end_date;
				instance.state_id = ConvertOrderStateID( srcOrder.state_id );
				instance.final_candidate_id = srcOrder.candidate_id;

				if ( srcOrder.state_id != 'order_open' && srcOrder.end_date.HasValue && srcOrder.end_date > srcOrder.date )
					instance.state_date = srcOrder.end_date;
			}

			newDoc.TopElem.state_id = ConvertOrderStateID( srcDoc.TopElem.main_order.state_id );
		}

		if ( newDoc.TopElem.state_id == 'vacancy_closed' )
			newDoc.TopElem.close_date = newDoc.TopElem.state_date;

		newDoc.TopElem.final_candidate_id = srcDoc.TopElem.main_order.candidate_id;
	}
	else if ( objectName == 'candidate' )
	{
		if ( newDoc.TopElem.birth_date.HasValue && ( Month( newDoc.TopElem.birth_date ) == undefined || srcDoc.TopElem.birth_date.year_only ) )
		{
			newDoc.TopElem.birth_year = Year( newDoc.TopElem.birth_date );
			newDoc.TopElem.birth_date.Clear();
		}

		newDoc.TopElem.home_phone = srcDoc.TopElem.phone;
		newDoc.TopElem.score = srcDoc.TopElem.grade_id;

		newDoc.TopElem.spots.Clear();

		for ( srcSpot in srcDoc.TopElem.spots )
		{
			newSpot = newDoc.TopElem.spots.AddChild();
			newSpot.vacancy_id = srcSpot.position_id;
			newSpot.start_date = srcSpot.start_date;
		}

		newDoc.TopElem.prev_jobs.Clear();

		for ( srcPrevJob in srcDoc.TopElem.prev_jobs )
		{
			newPrevJob = newDoc.TopElem.prev_jobs.AddChild();
			newPrevJob.AssignElem( srcPrevJob );
			newPrevJob.comment = Trim( srcPrevJob.comment_duty + '\r\n' + srcPrevJob.comment_result );
		}

		for ( srcSkill in srcDoc.TopElem.skills )
		{
			newSkill = newDoc.TopElem.skills[srcSkill.ChildIndex];
			newSkill.type_id = srcSkill.skill_sub_type_id;
		}

		if ( ( obj = StrOptScan( srcDoc.TopElem.source_id, '%s:%s' ) ) != undefined )
		{
			if ( obj[0] == 'resume_search' )
				newDoc.TopElem.entrance_type_id = 'active_search';
			else if ( obj[0] == 'ad_response' )
				newDoc.TopElem.entrance_type_id = 'vacancy_response';

			newDoc.TopElem.source_id = obj[1];
		}

		if ( newDoc.TopElem.source_id == 'headhunter.ru' )
			newDoc.TopElem.source_id = 'hh.ru';

		lib_voc.update_idata_by_voc( newDoc.TopElem.source_id );

		ConvertCandidateRecords( srcDoc.TopElem, objectID );
		newDoc.TopElem.update_state();
	}
	else if ( objectName == 'user' )
	{
		newDoc.TopElem.main_group_id = srcDoc.TopElem.group_id;

		if ( srcDoc.TopElem.allow_all )
			newDoc.TopElem.access_role_id = 'full';
		else
			newDoc.TopElem.access_role_id = 'basic';
	}
	else if ( objectName == 'event' || objectName == 'calendar_entry' )
	{
		if ( ! global_settings.is_agency )
		{
			//newDoc.TopElem.division_id = srcDoc.TopElem.org_id;
			newDoc.TopElem.org_id = null;
		}

		if ( newDoc.TopElem.type_id.ForeignElem.use_participants && srcDoc.TopElem.person_id.HasValue )
		{
			newDoc.TopElem.participants.AddChild().person_id = srcDoc.TopElem.person_id;
		}

		if ( objectName == 'calendar_entry' && newDoc.TopElem.type_id.ForeignElem.has_occurrence( '' ) && newDoc.TopElem.type_id.ForeignElem.has_occurrence( 'scheduled' ) )
		{
			if ( srcDoc.TopElem.completion_id == 0 )
				newDoc.TopElem.occurrence_id = 'cancelled';
			else if ( srcDoc.TopElem.completion_id == 1 )
				newDoc.TopElem.occurrence_id = '';
			else
				newDoc.TopElem.occurrence_id = 'scheduled';
		}

		if ( objectName == 'event' && newDoc.TopElem.type_id.ForeignElem.has_occurrence( 'succeeded' ) && newDoc.TopElem.type_id.ForeignElem.has_occurrence( 'failed' ) )
		{
			if ( srcDoc.TopElem.completion_id == 0 )
				newDoc.TopElem.occurrence_id = 'failed';
			else if ( srcDoc.TopElem.completion_id == 1 )
				newDoc.TopElem.occurrence_id = 'succeeded';
			else
				newDoc.TopElem.occurrence_id = '';
		}
	}


	if ( gPrevConvDate != undefined )
	{
		newFilePath = UrlToFilePath( 'x-local://data/obj/' );
		newFilePath = FilePath( newFilePath, lib_base.object_name_to_catalog_name( objectName ) );
		newFilePath = FilePath( newFilePath, StrHexInt( objectID ) + '.xml' );
		newFilePath = StrLeftRange( newFilePath, StrLen( newFilePath ) - 6 ) + '\\' + StrRightRangePos( newFilePath, StrLen( newFilePath ) - 6 );

		//alert( newFilePath );
		//Cancel();

		if ( FilePathExists( newFilePath ) && GetFileModDate( newFilePath ) >= gPrevConvDate )
		{
			LogEvent( 'conv', 'ALREADY MODIFIED: ' + srcFile );
			return;
		}
	}


	newDoc.IsSeparated = false;
	newDoc.UpdateValues();
	newDoc.WriteDocInfo = false;

	try
	{
		//alert( newDoc.Url );
		newDoc.Save();
	}
	catch ( e )
	{
		LogEvent( 'conv', ExtractUserError( e ) );
	}
}


function ConvertCandidateRecords( srcCandidate, objectID )
{
	for ( srcRecord in srcCandidate.records )
	{
		if ( srcRecord.type_id == 'inet_resume_load' )
			continue;

		eventID = srcRecord.id;

		if ( ! DefaultDb.UseSqlStorage )
		{
			while ( true )
			{
				event = ArrayOptFindByKey( events, eventID );
				if ( event == undefined )
					break;

				if ( event.candidate_id == objectID )
					break;

				//alert( 'new id required ' + eventID );
				eventID++;
			}
		}
		else
		{
			event = undefined;
		}

		if ( event != undefined && gPrevConvDate != undefined )
		{
			newFilePath = UrlToFilePath( 'x-local://data/obj/events/' );
			newFilePath = FilePath( newFilePath, StrHexInt( eventID ) + '.xml' );
			newFilePath = StrLeftRange( newFilePath, StrLen( newFilePath ) - 6 ) + '\\' + StrRightRangePos( newFilePath, StrLen( newFilePath ) - 6 );

			if ( FilePathExists( newFilePath ) && GetFileModDate( newFilePath ) >= gPrevConvDate )
			{
				LogEvent( 'conv', 'EVENT ALREADY MODIFIED: ' + newFilePath );
				continue;
			}
		}

		if ( srcRecord.type_id == 'learning_test' )
		{
			eventDoc = OpenNewDoc( '//staff/staff_testing.xmd', 'separate=1' );
			eventDoc.Url = ObjectDocUrl( 'data', 'testing', eventID );
		}
		else if ( srcRecord.type_id == 'interview' || srcRecord.type_id == 'phone_interview' || srcRecord.type_id == 'client_interview' )
		{
			eventDoc = OpenNewDoc( '//cn/cn_calendar_entry.xmd', 'separate=1' );
			eventDoc.Url = ObjectDocUrl( 'data', 'calendar_entry', eventID );
		}
		else
		{
			eventDoc = OpenNewDoc( '//base2/base2_event.xmd', 'separate=1' );
			eventDoc.Url = ObjectDocUrl( 'data', 'event', eventID );
		}
		
		eventDoc.TopElem.candidate_id = objectID;
		//eventDoc.TopElem.person_id = objectID;

		if ( srcRecord.creation_date.HasValue )
			eventDoc.TopElem.creation_date = srcRecord.creation_date;
		else
			eventDoc.TopElem.creation_date = srcRecord.date;
			
		eventDoc.TopElem.date = srcRecord.date;
		eventDoc.TopElem.end_date = srcRecord.end_date;
		eventDoc.TopElem.type_id = ConvertCandidateRecordTypeID( srcRecord.type_id );

		if ( srcRecord.completion_id == null )
		{
			if ( eventDoc.TopElem.type.has_occurrence( 'scheduled' ) && ! eventDoc.TopElem.type.has_occurrence( 'succeeded' ) )
				eventDoc.TopElem.occurrence_id = 'scheduled';
		}
		else if ( srcRecord.completion_id == 1 )
		{
			if ( eventDoc.TopElem.type.has_occurrence( 'succeeded' ) )
				eventDoc.TopElem.occurrence_id = 'succeeded';
		}
		else if ( srcRecord.completion_id == 0 )
		{
			if ( eventDoc.TopElem.type.has_occurrence( 'failed' ) )
				eventDoc.TopElem.occurrence_id = 'failed';
		}

		eventDoc.TopElem.date = srcRecord.date;
		eventDoc.TopElem.vacancy_id = srcRecord.position_id;
		eventDoc.TopElem.user_id = srcRecord.user_id;
		eventDoc.TopElem.comment = srcRecord.comment;

		if ( srcRecord.type_id == 'learning_test' )
		{
			eventDoc.TopElem.external_test_id = srcRecord.learning.course_id;
			eventDoc.TopElem.score = srcRecord.learning.score;
		}

		eventDoc.IsSeparated = false;
		eventDoc.UpdateValues();
		eventDoc.WriteDocInfo = false;
		eventDoc.RunActionOnSave = false;
		eventDoc.Save();
	}
}


function ConvertCsdElems( srcBaseElem, destBaseElem, level )
{
	var			srcElems;

	for ( srcElem in srcBaseElem )
	{
		destElem = destBaseElem.OptChild( ( level == 0 ? 'cs_' : '' ) + srcElem.Name );
		if ( destElem == undefined )
			continue;

		destElem.AssignElem( srcElem );
	}
}


function ConvertOrderStateID( oldStateID )
{
	switch ( oldStateID )
	{
		case 'order_open':
			return 'vacancy_opened';

		case 'order_suspend':
			return 'vacancy_suspended';

		case 'order_reopen':
			return 'vacancy_opened';

		case 'order_cancel':
			return 'vacancy_cancelled';

		case 'order_close':
			return 'vacancy_closed';

		default:
			return oldStateID;
	}
}


function ConvertVacancyRecordTypeID( oldStateID )
{
	switch ( oldStateID )
	{
		case 'position_open':
			return 'vacancy_opened';

		case 'position_suspend':
			return 'vacancy_suspended';

		case 'position_reopen':
			return 'vacancy_opened';

		case 'position_cancel':
			return 'vacancy_cancelled';

		case 'position_close':
			return 'vacancy_closed';

		default:
			return oldStateID;
	}
}


function ConvertCandidateRecordTypeID( oldTypeID )
{
	switch ( oldTypeID )
	{
		case 'candidate_note':
			return 'note';

		case 'ad_response':
			return 'vacancy_response';

		case 'client_resume_review':
			return 'rr_resume_review';

		case 'client_interview':
			return 'rr_interview';

		case 'client_interview2':
			return 'rr_interview2';

		case 'candidate_offer':
			return 'job_offer';

		case 'client_reject':
			return 'rr_reject';

		case 'close':
			return 'vacancy_close';

		case 'cancel':
			return 'vacancy_cancel';

		case 'learning_test':
			return 'testing';

		case 'select':
			return 'candidate_select';

		default:
			return oldTypeID;
	}
}


function ConvertPositionAds()
{
	gAdMap.Sort( 'vacancy_id', '+' );
	prevVacancyID = undefined;

	for ( entry in gAdMap )
	{
		srcDoc = OpenDoc( entry.src_url );

		ModalTaskMsg( 'Ad: ' + StrHexInt( entry.vacancy_id, 16 ) );
		useBaseVacancy = false;

		if ( entry.vacancy_id.HasValue && entry.vacancy_id != prevVacancyID )
		{
			try
			{
				vacancyDoc = DefaultDb.OpenObjectDoc( 'vacancy', entry.vacancy_id );
				useBaseVacancy = true;
			}
			catch ( e )
			{
				//alert( e );
			}
		}

		if ( ! useBaseVacancy )
		{
			vacancyDoc = OpenNewDoc( 'rcr_vacancy.xmd', 'separate=1' );
			vacancyDoc.Url = ObjectDocUrl( 'data', 'vacancy', entry.ad_id );
			vacancyDoc.TopElem.id = entry.ad_id;

			//newDoc.TopElem.AssignElem( srcDoc.TopElem );
			vacancyDoc.TopElem.creation_date = srcDoc.TopElem.doc_info.creation.date;
			vacancyDoc.TopElem.last_mod_date = srcDoc.TopElem.doc_info.modification.date;

			vacancyDoc.TopElem.is_extra_ad = true;
			vacancyDoc.TopElem.base_vacancy_id = entry.vacancy_id;
			vacancyDoc.TopElem.name = srcDoc.TopElem.content.position_name;

			if ( global_settings.is_agency )
				vacancyDoc.TopElem.org_id = srcDoc.TopElem.position_id.sd.org_id;
			else
				vacancyDoc.TopElem.division_id = srcDoc.TopElem.position_id.sd.org_id;

			vacancyDoc.TopElem.start_date = vacancyDoc.TopElem.creation_date;

			if ( srcDoc.TopElem.is_active )
				vacancyDoc.TopElem.state_id = 'vacancy_opened';
			else
				vacancyDoc.TopElem.state_id = 'vacancy_closed';

			vacancyDoc.TopElem.state_date = vacancyDoc.TopElem.last_mod_date;
			vacancyDoc.TopElem.is_active = srcDoc.TopElem.is_active;
		}

		vacancyDoc.TopElem.inet_data.AssignElem( srcDoc.TopElem );
		vacancyDoc.TopElem.inet_data.AssignElem( srcDoc.TopElem.content );

		vacancyDoc.IsSeparated = false;
		vacancyDoc.UpdateValues();
		vacancyDoc.WriteDocInfo = false;
		vacancyDoc.Save();

		prevVacancyID = entry.vacancy_id;
	}
}



function CreateNewVocElem( voc )
{
	vocInfo = lib_voc.get_voc_info( voc );
	return OpenNewDoc( vocInfo.object_form_url, 'separate=1' ).TopElem;
}


function RegisterVocElem( voc, stdElem )
{
	vocInfo = lib_voc.get_voc_info( voc );

	if ( vocInfo.key_synonym != '' )
		stdElem.Child( vocInfo.key_synonym ).AssignElem( stdElem.id );

	elem = ArrayOptFindByKey( voc, stdElem.id, 'id' );
	if ( elem != undefined )
	{
		if ( elem.EqualToElem( stdElem ) )
		{
			return;
			//alert( elem.Xml + '\n\n' + stdElem.Xml );
		}

		doc = DefaultDb.OpenObjectDoc( vocInfo.object_name, elem.id );
	}
	else
	{
		doc = DefaultDb.OpenNewObjectDoc( vocInfo.object_name, stdElem.id );
	}

	elem = doc.TopElem;
	elem.AssignElem( stdElem );

	if ( vocInfo.auto_order == '' && elem.ChildExists( 'order_index' ) && elem.order_index == null )
		elem.order_index = lib_voc.obtain_next_voc_elem_order_index( voc );

	doc.Save();
}


function RestoreMissedSkills()
{
	gSrcBaseDir = FilePath( AppDirectoryPath(), 'data_converted' );
	if ( ! PathIsDirectory( gSrcBaseDir ) )
		throw UserError( 'data_converted folder not found' );

	if ( UseLds )
		throw UserError( 'Unable to run on client' );

	RegisterFormMapping( 'x-local://rc/rc_candidate.xmd', '/old/old_candidate.xmd' );

	EnableLog( 'conv' );
	LogEvent( 'conv', '--- SKILL GRABBER STARTED' );

	array = ArraySort( ArraySelect( candidates, 'skills.GetOptChildByKey( \'\', \'type_id\' ) != undefined' ), 'fullname', '+' );

	for ( candidate in array )
	{
		alert( candidate.fullname );
		RestoreCandidateMissedSkills( candidate );
	}

	LogEvent( 'conv', '--- SKILL GRABBER FINISHED' );
}


function RestoreCandidateMissedSkills( candidate )
{
	srcUrl = candidate.ObjectUrl;
	srcUrl = StrReplace( srcUrl, 'x-db-obj://data/candidate/0x', 'x-local://data_converted/objects/' );
	srcUrl = StrLeftRange( srcUrl, StrLen( srcUrl ) - 6 ) + '/' + StrRightRangePos( srcUrl, StrLen( srcUrl ) - 6 );
	srcUrl = FilePathToUrl( UrlToFilePath( srcUrl ) );

	//alert( srcUrl );
	LogEvent( 'conv', srcUrl );

	try
	{
		srcDoc = OpenDoc( srcUrl, 'separate=1' );
	}
	catch ( e )
	{
		LogEvent( 'conv', e );
		//alert( e );
		//throw e;
		return;
	}

	candidateDoc = OpenDoc( candidate.ObjectUrl );
	candidateDoc.TopElem.skills.DeleteChildren( '! type_id.HasValue' );

	for ( srcSkill in srcDoc.TopElem.skills )
	{
		newSkill = candidateDoc.TopElem.skills.AddChild();
		newSkill.AssignElem( srcSkill );
		newSkill.type_id = srcSkill.skill_sub_type_id;
	}

	candidateDoc.WriteDocInfo = false;
	candidateDoc.RunActionOnSave = false;
	candidateDoc.Save();
}
