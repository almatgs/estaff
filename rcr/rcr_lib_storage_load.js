function process_raw_mailbox_storage( storageID )
{
	if ( System.IsWebClient )
	{
		task = new BackgroundTask;
		task.RunOnServer = true;
		task.ShowProgress = true;

		task.CallMethod( 'raw_storage_server_lib', 'ProcessRawMailboxStorage', [storageID] );

		UpdateScreens( '*', '*parsed_messages*' );
		return;
	}

	storage = GetForeignElem( raw_storages, storageID );

	CurMethodProgress.TaskName = StrReplace( UiText.messages.processing_messages_in_mailbox_xxx, '%s', storage.name );

	reader = new MailboxReader;

	options = '';
	options = options + 'server=' + storage.server_address + ';';
	options = options + 'login=' + storage.login + ';';
	options = options + 'password=' + storage.password + ';';

	options = options + 'store=' + storage.store_name + ';';
	options = options + 'folder=' + storage.folder_path + ';';

	if ( storage.scan_sub_folders )
		options = options + 'subfolders=1;';

	if ( storage.force_download )
		options = options + 'download=1;';

	if ( storage.scan_unread_only )
		options = options + 'unread-only=1;';

	if ( storage.mark_as_read )
		options = options + 'mark-read=1;';

	options = options + 'detect-html-body=1;';

	if ( storage.use_ssl_port )
		options = options + 'useTLSPort=1;';
	else if ( storage.use_ssl )
		options = options + 'useTLS=1;';

	CurMethodProgress.ActivityName = UiText.messages.opening_mailbox;
	reader.OpenMailbox( storage.access_method_id, options );

	CurMethodProgress.ActivityName = UiText.messages.processing_messages;
	//CurMethodProgress.TotalCount = reader.TotalCount;
	CurMethodProgress.ItemIndex = 0;

	CurMethodStatistics.total_count = 0;
	CurMethodStatistics.new_count = 0;

	var		i;

	while ( true )
	{
		if ( ! reader.ReadNextMessage() )
			break;

		CurMethodProgress.ItemName = reader.Message.sender.address + '   ' + reader.Message.subject + '   ' + StrDate( reader.Message.date, true, false );

		LogEvent( 'mail_trans', 'NEXT MESSAGE READ: ' + reader.Message.sender.address );
		PutUrlData( 'x-local://Logs/mail_trans_message.xml', reader.Message.Xml );
		PutUrlData( 'x-local://Logs/mail_trans_html_body.htm', reader.Message.html_body );

		//alert( FileName( reader.MessageFolderPath ) );

		newDoc = OpenNewDoc( 'rcr_parsed_message.xmd' );
		parse_mail_message( reader.Message, newDoc.TopElem );

		if ( storage.guess_profession_by_folder_name )
			guess_profession( reader.MessageFolderPath, newDoc.TopElem );

		CurMethodStatistics.total_count++;

		bestAttc = ArrayMax( newDoc.TopElem.attachments, 'parsed_info.resume_rating' );
		if ( bestAttc.parsed_info.resume_rating < storage.min_req_rating )
		{
			HandleUnknownMessage( storage, reader );
			CurMethodProgress.ItemIndex++;
			continue;
		}

		newDoc.TopElem.raw_storage_id = storageID;
		newDoc.TopElem.user_id = LdsCurUserID;
		newDoc.TopElem.group_id = lib_user.active_user_info.main_group_id;

		newDoc.TopElem.has_dup_candidates = ( ArrayCount( lib_candidate_dup.find_dup_candidates( newDoc.TopElem.parsed_info ) ) != 0 );
		newDoc.BindToDbObjectType( 'data', 'parsed_message' );
		newDoc.Save();

		HandleMatchedMessage( storage, reader );

		CurMethodStatistics.new_count++;

		CurMethodProgress.ItemIndex++;

		UpdateScreens( '*', '*parsed_messages*' );
	}

	reader.CloseMailbox();
}


function HandleUnknownMessage( storage, reader )
{
	if ( ( storage.access_method_id == 'pop' || storage.access_method_id == 'imap' ) && storage.mark_as_deleted )
		reader.DeleteMessage();
	else if ( storage.access_method_id == 'imap' && storage.mark_as_read )
		reader.MarkMessageAsRead();
}


function HandleMatchedMessage( storage, reader )
{
	if ( ( storage.access_method_id == 'pop' || storage.access_method_id == 'imap' ) && ( storage.mark_as_deleted || storage.mark_matched_as_deleted ) )
		reader.DeleteMessage();
	else if ( storage.access_method_id == 'imap' && ( storage.mark_as_read || storage.mark_matched_as_read ) )
		reader.MarkMessageAsRead();
	else if ( storage.access_method_id != 'pop' && storage.access_method_id != 'imap' && ! storage.mark_as_read && storage.mark_matched_as_read )
		reader.MarkMessageAsRead();
}



function parse_mail_message( message, parsedMessage )
{
	if ( message.ChildExists( 'mime_body' ) && message.mime_body.HasValue )
	{
		//PutUrlData( 'x-local://Logs/mime_message.eml', message.mime_body );
		message = MailMessageFromMimeStr( message.mime_body );
		//message.AssignElem( newMessage );
	}
	else if ( message.html_body.HasValue && message.attachments.ChildNum != 0 )
	{
		message.html_body = lib_html.bind_cid_images( message.html_body, message );
	}

	newAttc = parsedMessage.attachments.AddChild();
	newAttc.is_message_text = true;
	newAttc.type_id = 'letter';

	if ( message.html_body != '' )
	{
		newAttc.content_type = 'text/html';
		newAttc.text = message.html_body;

		newAttc.text = AdjustHtml( newAttc.text, 'remove-scripts=1;remove-small-images=1;bind-ext-data=1' );
	}
	else
	{
		newAttc.content_type = 'text/plain';
		newAttc.plain_text = message.body;
	}

	for ( attc in message.attachments )
	{
		if ( attc.ChildExists( 'file_name' ) )
			attcName = attc.file_name;
		else
			attcName = attc.name;

		attcSuffix = StrLowerCase( UrlPathSuffix( attcName ) );

		if ( StrEnds( attcName, '.txt', true ) )
		{
			newAttc = parsedMessage.attachments.AddChild();
			newAttc.orig_file_name = attcName;
			newAttc.content_type = 'text/plain';
			newAttc.plain_text = attc.data.GetStr();
		}
		else if ( StrEnds( attcName, '.htm', true ) || StrEnds( attcName, '.html', true ) )
		{
			newAttc = parsedMessage.attachments.AddChild();
			newAttc.orig_file_name = attcName;
			newAttc.content_type = 'text/html';
			newAttc.text = attc.data.GetStr();

			newAttc.text = AdjustHtml( newAttc.text, 'remove-scripts=1;remove-small-images=1;bind-ext-data=1' );
		}
		else if ( lib_office.is_editor_file_suffix( attcSuffix ) )
		{
			newAttc = parsedMessage.attachments.AddChild();
			newAttc.orig_file_name = attcName;
			newAttc.content_type = 'text/html';

			tempUrl = ObtainTempFile( UrlPathSuffix( attcName ) );
			attc.data.SaveToFile( tempUrl );

			resources = lib_html.allocate_resource_list();

			try
			{
				newAttc.text = lib_office.doc_file_to_html( tempUrl, resources );
			}
			catch ( e )
			{
				//DeleteUrl( tempUrl );
				newAttc.has_risk = true;
				continue;
			}

			startTicks = GetCurTicks();

			while ( FileIsBusy( tempUrl ) && GetCurTicks() - startTicks < 2000 )
				Sleep( 100 );

			DeleteUrl( tempUrl );

			newAttc.name = attcName;
			newAttc.resources_ref = resources;
		}
		else if ( StrEnds( attcName, '.exe', true ) || StrEnds( attcName, '.bat', true ) || StrEnds( attcName, '.scr', true ) )
		{
			newAttc = parsedMessage.attachments.AddChild();
			newAttc.orig_file_name = attcName;
			newAttc.content_type = 'application/binary';
			newAttc.file_name = attcName;
			newAttc.has_risk = true;
		}
		else
		{
			if ( attcSuffix == '.bmp' || attcSuffix == '.gif' || attcSuffix == '.jpg' || attcSuffix == '.jpeg' || attcSuffix == '.png' || attcSuffix == '.pcx' )
			{
				if ( attc.data.Size <= 5 * 1024 )
					continue;
			}

			newAttc = parsedMessage.attachments.AddChild();
			newAttc.orig_file_name = attcName;
			newAttc.data.AssignElem( attc.data );
			newAttc.content_type = 'application/binary';
			newAttc.file_name = attcName;

			newAttc.build_preview_data();

			//alert( newAttc.file_name );
		}
	}

	parsedMessage.has_risk = ( ArrayOptFind( parsedMessage.attachments, 'has_risk' ) != undefined );

	for ( newAttc in parsedMessage.attachments )
		ProcessParsedMessageAttachment( parsedMessage, newAttc );


	parsedMessage.date = message.date;
	parsedMessage.sender.AssignElem( message.sender );
	parsedMessage.subject = message.subject;

	bestAttc = ArrayOptFirstElem( ArraySort( ArraySelect( parsedMessage.attachments, '! is_message_text' ), 'parsed_info.resume_rating', '-', 'parsed_info.firstname.HasValue', '-', 'file_name.HasValue', '-' ) );
	if ( bestAttc == undefined || bestAttc.parsed_info.resume_rating <= 0 )
		bestAttc = ArrayFirstElem( ArraySort( parsedMessage.attachments, 'parsed_info.resume_rating', '-', 'parsed_info.firstname.HasValue', '-', 'file_name.HasValue', '-' ) );

	for ( newAttc in parsedMessage.attachments )
	{
		if ( newAttc.parsed_info.resume_rating == bestAttc.parsed_info.resume_rating )
		{
			if ( newAttc.type_id == '' || ( newAttc.type_id == 'letter' && parsedMessage.attachments.ChildNum == 1 ) )
				newAttc.type_id = 'resume';
		}
	}

	parsedMessage.parsed_info.AssignElem( bestAttc.parsed_info );


	if ( ! lib_resume.is_non_candidate_email( parsedMessage.sender.address ) )
	{
		if ( parsedMessage.parsed_info.email == '' )
			parsedMessage.parsed_info.email = parsedMessage.sender.address;
		else if ( parsedMessage.parsed_info.email2 == '' && parsedMessage.sender.address != parsedMessage.parsed_info.email )
			parsedMessage.parsed_info.email2 = parsedMessage.sender.address;
	}

	if ( global_settings.rparse.vacancy_mail_prefix != '' && ( pos = String( message.subject ).indexOf( global_settings.rparse.vacancy_mail_prefix ) ) >= 0 )
	{
		restStr = String( message.subject ).slice( pos + StrLen( global_settings.rparse.vacancy_mail_prefix ) );

		if ( ( pos = restStr.indexOf( ' ' ) ) >= 0 )
			 restStr = restStr.slice( 0, pos );

		vaacncy = ArrayOptFindByKey( vacancies, restStr, 'code' );
		if ( vaacncy != undefined )
			parsedMessage.req_vacancy_id = vaacncy.id;
	}
}


function ProcessParsedMessageAttachment( parsedMessage, attc )
{
	if ( attc.content_type == 'text/html' )
	{
		//lib_resume.parse_resume( attc.parsed_info, '', attc.text, attc.content_type );
		attc.text = lib_resume.load_resume_text( attc.parsed_info, '', attc.text, attc.content_type, ( attc.resources_ref.HasValue ? attc.resources_ref.Object : undefined ) );
	}
	else if ( attc.content_type == 'text/plain' || attc.plain_text.HasValue )
	{
		lib_resume.parse_resume( attc.parsed_info, '', attc.plain_text, attc.content_type );
	}
}


function guess_profession( messageFolderPath, parsedMessage )
{
	if ( messageFolderPath == '' )
		return;

	folderName = FileName( messageFolderPath );

	match = false;

	profession = ArrayOptFind( professions, 'StrLowerCase( name ) == ' + CodeLiteral( StrLowerCase( folderName ) ) );
	if ( profession == undefined )
		return;

	parsedMessage.parsed_info.profession_id.ObtainByValue( profession.id );
	lib_voc.update_idata_by_voc( parsedMessage.parsed_info.profession_id );
}


function process_raw_folder_storage( storageID )
{
	if ( System.IsWebClient )
	{
		task = new BackgroundTask;
		task.RunOnServer = true;
		task.ShowProgress = true;

		task.CallMethod( 'raw_storage_server_lib', 'ProcessRawFolderStorage', [storageID] );

		UpdateScreens( '*', '*parsed_messages*' );
		return;
	}

	EnableLog( 'resume_import', true );

	storage = GetForeignElem( raw_storages, storageID );
	if ( storage.src_dir == '' )
		throw UserError( UiText.errors.src_dir_not_specified );

	if ( ! FilePathExists( storage.src_dir ) )
		throw UserError( UiText.errors.dir_not_found + ': ' + storage.src_dir );

	CurMethodProgress.TaskName = StrReplace( UiText.messages.processing_files_in_raw_storage_xxx, '%s', storage.name );

	files = lib_base.read_directory_files( storage.src_dir, storage.scan_sub_folders );

	CurMethodProgress.TotalCount = ArrayCount( files );
	CurMethodProgress.ItemIndex = 0;

	CurMethodStatistics.total_count = 0;
	CurMethodStatistics.new_count = 0;

	var		i;

	for ( file in files )
	{
		CheckCurThread();

		LogEvent( 'resume_import', file );

		if ( StrBegins( FileName( file ), '~' ) )
		{
			CurMethodProgress.ItemIndex++;
			CurMethodStatistics.total_count++;
			continue;
		}

		if ( ! StrEnds( file, '.htm', true ) && ! StrEnds( file, '.html', true ) && ! StrEnds( file, '.txt', true ) && ! StrEnds( file, '.pdf', true ) && ! lib_office.is_editor_file_suffix( UrlPathSuffix( file ) ) )
		{
			CurMethodProgress.ItemIndex++;
			CurMethodStatistics.total_count++;
			continue;
		}

		CurMethodProgress.ItemName = file;

		LogEvent( 'resume_import', 1 );

		if ( ( rawMessage = ArrayOptFirstElem( XQuery( 'for $elem in parsed_messages where $elem/raw_storage_id = ' + storageID + ' and $elem/file_path = ' + XQueryLiteral( file ) + ' return $elem' ) ) ) != undefined )
		{
			CurMethodProgress.ItemIndex++;
			CurMethodStatistics.total_count++;
			continue;
		}

		LogEvent( 'resume_import', 2 );

		candidateDoc = OpenNewDoc( 'rcr_candidate.xmd', 'separate=1' );
		
		try
		{
			lib_resume.load_resume_file( candidateDoc.TopElem, FilePathToUrl( file ) );
		}
		catch ( e )
		{
			alert( 'Error loading file ' + file + '\r\n\r\n' + ExtractUserError( e ) );
			LogEvent( 'resume_import', 'Error loading file ' + file + ' :  ' + ExtractUserError( e ) );
			continue;
		}

		LogEvent( 'resume_import', 3 );

		newDoc = OpenNewDoc( 'rcr_parsed_message.xmd' );
		newDoc.TopElem.file_path = file;
		newDoc.TopElem.sender.address = FileName( file );
		newDoc.TopElem.date = GetFileModDate( file );
		newDoc.TopElem.parsed_info.AssignElem( candidateDoc.TopElem );
		newDoc.TopElem.attachments.AssignElem( candidateDoc.TopElem.attachments );

		if ( storage.guess_profession_by_folder_name )
			guess_profession( ParentDirectory( file ), newDoc.TopElem );

		newDoc.TopElem.raw_storage_id = storageID;
		newDoc.TopElem.user_id = LdsCurUserID;
		newDoc.TopElem.group_id = lib_user.active_user_info.main_group_id;

		newDoc.TopElem.has_dup_candidates = ( ArrayCount( lib_candidate_dup.find_dup_candidates( newDoc.TopElem.parsed_info ) ) != 0 );
		newDoc.BindToDbObjectType( 'data', 'parsed_message' );
		newDoc.Save();

		CurMethodProgress.ItemIndex++;

		CurMethodStatistics.total_count++;
		CurMethodStatistics.new_count++;

		LogEvent( 'resume_import', 4 );
		UpdateScreens( '*', '*parsed_messages*' );
	}
}


function parsed_message_to_candidate( parsedMessage, candidate )
{
	storage = parsedMessage.raw_storage_id.OptForeignElem;

	candidate.AssignElem( parsedMessage.parsed_info );
	candidate.attachments.AssignElem( parsedMessage.attachments );

	if ( ! candidate.source_id.HasValue )
		lib_resume.guess_candidate_source_by_text( candidate, parsedMessage.sender.address );

	if ( storage != undefined )
	{
		if ( storage.dest_candidate_fields.entrance_type_id.HasValue )
		{
			candidate.entrance_type_id = storage.dest_candidate_fields.entrance_type_id;
			lib_voc.update_idata_by_voc( candidate.entrance_type_id );
		}

		if ( storage.dest_candidate_fields.source_id.HasValue )
		{
			candidate.source_id = storage.dest_candidate_fields.source_id;
			lib_voc.update_idata_by_voc( candidate.source_id );
		}
	}

	if ( candidate.attachments.ChildNum != 0 && candidate.attachments[0].type_id == 'letter' )
	{
		letter = candidate.attachments[0];

		if ( ( resume = candidate.attachments.GetOptChildByKey( 'resume', 'type_id' ) ) != undefined )
		{
			if ( ( storage != undefined && ! storage.keep_letter_text ) || StrLen( Trim( letter.resolve_plain_text() ) ) < 20 || Trim( letter.resolve_plain_text() ) == Trim( resume.resolve_plain_text() ) )
				letter.Delete();
		}
		else
		{
			letter.type_id = 'resume';
		}
	}

	for ( attachment in candidate.attachments )
	{
		if ( attachment.type_id == 'resume' )
			attachment.name = '';
	}
}


function store_parsed_message( parsedMessage, professionID, vacancyID )
{
	if ( System.IsWebClient )
	{
		task = new BackgroundTask;
		task.RunOnServer = true;
		//task.ShowProgress = true;

		respInfo = task.CallMethod( 'raw_storage_server_lib', 'StoreParsedMessage', [parsedMessage.id, professionID, vacancyID] );

		UpdateScreens( '*', '*parsed_messages*' );
		return respInfo;
	}

	storage = parsedMessage.raw_storage_id.OptForeignElem;
	srcUrl = DefaultDb.GetRecordPrimaryObjectUrl( parsedMessage );

	candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
	parsedMessageDoc = OpenDoc( srcUrl );
	parsed_message_to_candidate( parsedMessageDoc.TopElem, candidateDoc.TopElem );

	if ( professionID != null )
	{
		candidateDoc.TopElem.profession_id.ObtainByValue( professionID );
		lib_voc.update_idata_by_voc( candidateDoc.TopElem.profession_id );
	}

	if ( vacancyID != null )
		candidateDoc.TopElem.add_spot( vacancyID );

	if ( ! storage.skip_duplicates_check && ( dupCandidateID = lib_candidate_dup.check_dup_candidates( candidateDoc.TopElem ) ) != null )
	{
		DeleteDoc( srcUrl );
		return DefaultDb.OpenObjectDoc( 'candidate', dupCandidateID );
	} 

	if ( storage != undefined && storage.dest_candidate_fields.state_id.HasValue && storage.dest_candidate_fields.state_id != 'new' )
	{
		lib_candidate.HandleSetCandidateState( candidateDoc.TopElem, storage.dest_candidate_fields.state_id, {vacancy_id:vacancyID} );
		candidateDoc.TopElem.view.target_events_loaded = false;
	}
	else
	{
		candidateDoc.TopElem.view.target_events_loaded = true;
	}

	candidateDoc.TopElem.update_state();
	candidateDoc.Save();

	DeleteDoc( srcUrl );
	return candidateDoc;
}



function import_xml_mail_messages( baseDir )
{
	itemsList = ReadDirectory( baseDir );

	if ( local_settings.mail_plugins.open_single_candidate && ArrayCount( itemsList ) == 1 )
	{
		item = ArrayFirstElem( itemsList );

		messageDoc = OpenDoc( item, 'form=//app/sx_mail_message.xmd' );

		newDoc = OpenNewDoc( 'rcr_parsed_message.xmd', 'separate=1' );
		parse_mail_message( messageDoc.TopElem, newDoc.TopElem );

		//PutUrlData( 'z_pm.xml', newDoc.TopElem.Xml );

		candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
		parsed_message_to_candidate( newDoc.TopElem, candidateDoc.TopElem );

		if ( ( dupCandidateID = lib_candidate_dup.check_dup_candidates( candidateDoc.TopElem ) ) == null )
		{
			candidateDoc.TopElem.view.duplicates_checked = true;
			CreateDocScreen( candidateDoc );
		}
		else
		{
			ObtainDocScreen( ObjectDocUrl( 'data', 'candidate', dupCandidateID ) );
		}
	}
	else
	{
		for ( item in itemsList )
		{
			messageDoc = OpenDoc( item, 'form=//app/sx_mail_message.xmd' );

			newDoc = OpenNewDoc( 'rcr_parsed_message.xmd', 'separate=1' );
			parse_mail_message( messageDoc.TopElem, newDoc.TopElem );

			if ( newDoc.TopElem.attachments.ChildNum == 0 )
				continue;

			candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
			parsed_message_to_candidate( newDoc.TopElem, candidateDoc.TopElem );

			if ( lib_candidate_dup.check_dup_candidates( candidateDoc.TopElem ) == null )
			{
				candidateDoc.Save();
			}
		}

		ActiveScreen.Navigate( lib_view.obtain_view_url( 'candidates' ), 'FrameMain' );
	}

	DeleteDirectory( baseDir );
}


function import_plugin_mail_messages( srcData )
{
	if ( local_settings.mail_plugins.open_single_candidate && ArrayCount( srcData.items ) == 1 )
	{
		item = srcData.items[0];

		newDoc = OpenNewDoc( 'rcr_parsed_message.xmd', 'separate=1' );
		parse_mail_message( item, newDoc.TopElem );

		//PutUrlData( 'x-local://Logs/parsed_message.xml', newDoc.TopElem.Xml );

		candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
		parsed_message_to_candidate( newDoc.TopElem, candidateDoc.TopElem );

		dupInfo = lib_candidate_dup.check_dup_candidates_prepare( candidateDoc.TopElem );

		candidateDocs = [candidateDoc];

		if ( global_settings.select_plugin_mail_message_attachments )
		{
			dlgData = lib_recruit.handle_select_mail_message_attachments_before_import( newDoc.TopElem );

			if ( dlgData.use_multi_candidate )
			{
				candidateDocs = [];

				for ( attachment in newDoc.TopElem.attachments )
				{
					if ( attachment.is_message_text )
						continue;

					newDoc2 = OpenNewDoc( 'rcr_parsed_message.xmd', 'separate=1' );
					newDoc2.TopElem.attachments.AddChild().AssignElem( attachment );
					newDoc2.TopElem.sender.AssignElem( item.sender );
					newDoc2.TopElem.parsed_info.AssignElem( attachment.parsed_info );
					
					//ProcessParsedMessageAttachment( newDoc2.TopElem, newAttc );

					candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
					parsed_message_to_candidate( newDoc2.TopElem, candidateDoc.TopElem );

					candidateDocs.push( candidateDoc );
				}
			}
			else
			{
				candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
				parsed_message_to_candidate( newDoc.TopElem, candidateDoc.TopElem );
				lib_base.MergeObjectAttachments( candidateDoc.TopElem );
				candidateDocs = [candidateDoc];
			}
		}

		for ( candidateDoc in candidateDocs )
		{
			if ( candidateDocs.length >= 2 )
				dupInfo = lib_candidate_dup.check_dup_candidates_prepare( candidateDoc.TopElem );

			if ( dupInfo != undefined )
				dupCandidateID = lib_candidate_dup.check_dup_candidates_finish( candidateDoc.TopElem, {}, dupInfo );
			else
				dupCandidateID = null;

			if ( dupCandidateID == null )
			{
				candidateDoc.TopElem.view.duplicates_checked = true;
				CreateDocScreen( candidateDoc );
			}
			else
			{
				ObtainDocScreen( ObjectDocUrl( 'data', 'candidate', dupCandidateID ) );
			}
		}
	}
	else
	{
		for ( item in srcData.items )
		{
			newDoc = OpenNewDoc( 'rcr_parsed_message.xmd', 'separate=1' );
			parse_mail_message( item, newDoc.TopElem );

			if ( newDoc.TopElem.attachments.ChildNum == 0 )
				continue;

			candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
			parsed_message_to_candidate( newDoc.TopElem, candidateDoc.TopElem );

			if ( lib_candidate_dup.check_dup_candidates( candidateDoc.TopElem ) == null )
			{
				candidateDoc.Save();
			}
		}

		ActiveScreen.Navigate( lib_view.obtain_view_url( 'candidates' ), 'FrameMain' );
	}
}


function import_mime_mail_message( fileUrl )
{
	message = MailMessageFromMimeStr( LoadUrlData( fileUrl ) );

	newDoc = OpenNewDoc( 'rcr_parsed_message.xmd', 'separate=1' );
	parse_mail_message( message, newDoc.TopElem );

	candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
	parsed_message_to_candidate( newDoc.TopElem, candidateDoc.TopElem );

	if ( ( dupCandidateID = lib_candidate_dup.check_dup_candidates( candidateDoc.TopElem ) ) == null )
	{
		candidateDoc.TopElem.view.duplicates_checked = true;
		CreateDocScreen( candidateDoc );
	}
	else
	{
		ObtainDocScreen( ObjectDocUrl( 'data', 'candidate', dupCandidateID ) );
	}
}


