function is_lotus_installed()
{
	return ( get_lotus_dir() != '' );
}


function get_lotus_dir()
{
	str = GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\Software\\Lotus\\Notes', 'Path' );
	if ( str != '' && PathIsDirectory( str ) )
		return str;

	str = GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\Software\\Classes\\Notes\\Defaulticon', '' );
	if ( str != '' && FilePathExists( str ) )
		return ParentDirectory( str );

	return '';
}


function get_lotus_version()
{
	str = GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\Software\\Lotus\\Notes', 'Version' );
	if ( StrLen( str ) < 6 )
		return '';

	part1 = OptInt( StrRangePos( str, 0, 2 ) );
	if ( part1 == undefined )
		return '';

	part2 = OptInt( StrRangePos( str, 2, 4 ) );
	if ( part2 == undefined )
		return '';

	return part1 + '.' + part2;
}


function get_id_file_path()
{
	session = new NotesSession;
	return FilePath( session.GetEnvironmentString( 'Directory' ), session.GetEnvironmentString( 'KeyFilename' ) );
}


function register_lotus_plugin()
{
	lotusDir = lotus_local_settings.lotus_dir;
	if ( lotusDir == '' )
		lotusDir = get_lotus_dir();

	if ( lotusDir != '' && ! PathIsDirectory( lotusDir ) )
		lib_base.show_error_message( ActiveScreen, StrReplace( UiText.errors.folder_xxx_not_found, '%s', lotusDir ) );

	if ( lotusDir == '' || ! PathIsDirectory( lotusDir ) )
		lotusDir = UrlToFilePath( ActiveScreen.AskDir() );

	CopyFile( FilePath( base1_config.app_setup_dir, 'estaff_lotus.dll' ), FilePath( lotusDir, 'estaff_lotus.dll' ) );

	iniFilePath = FilePath( lotusDir, 'notes.ini' );
	if ( ! FilePathExists( iniFilePath ) )
	{
		lib_base.show_error_message( ActiveScreen, StrReplace( UiText.errors.file_xxx_not_found, '%s', iniFilePath ) );
		return;
	}

	data = LoadUrlData( FilePathToUrl( iniFilePath ) );
	str = 'AddInMenus=estaff_lotus.dll\r\n';

	if ( ! StrContains( data, str ) )
	{
		data = data + str;
		PutUrlData( FilePathToUrl( iniFilePath ), data );
	}
}


function unregister_lotus_plugin()
{
	lotusDir = lotus_local_settings.lotus_dir;
	if ( lotusDir == '' )
		lotusDir = get_lotus_dir();

	iniFilePath = FilePath( lotusDir, 'notes.ini' );
	if ( ! FilePathExists( iniFilePath ) )
		return;

	data = LoadFileData( iniFilePath );
	str = 'AddInMenus=estaff_lotus.dll\r\n';

	if ( ! StrContains( data, str ) )
		return;

	data = StrReplace( data, str, '' );
	PutFileData( iniFilePath, data );
}


function is_lotus_plugin_registered()
{
	lotusDir = lotus_local_settings.lotus_dir;
	if ( lotusDir == '' )
		lotusDir = get_lotus_dir();

	iniFilePath = FilePath( lotusDir, 'notes.ini' );
	if ( ! FilePathExists( iniFilePath ) )
		return true;

	linesArray = StrSplitToLines( LoadFileData( iniFilePath ) );
	str = 'AddInMenus=estaff_lotus.dll';

	return ( ArrayOptFind( linesArray, 'This == str' ) != undefined );
}


function id_file_suffix_pattern()
{
	UiText.titles.lotus_id_files + ' (*.id)\t*.id\t' + UiText.titles.all_files + ' (*.*)\t*.*'
}

////////////////////////////////////////////////////////////////////////////////////////

function open_notes_session()
{
	session = new NotesSession;

	if ( lotus_local_settings.lotus_dir.HasValue )
		session.SetLotusDir( lotus_local_settings.lotus_dir );

	if ( lotus_local_settings.use_auto_login )
	{
		try
		{
			session.SwitchToIDFile( ( lotus_local_settings.id_file_path.HasValue ? lotus_local_settings.id_file_path : get_id_file_path() ), StrStdDecrypt( lotus_local_settings.password_ed ) );
		}
		catch ( e )
		{
			throw UserError( UiText.errors.unable_to_switch_to_id_file, e );
		}
	}

	return session;
}

function open_mail_db()
{
	session = open_notes_session();
	config = getServerConfiguration(session);
	db = session.GetDatabase(config.serverName, config.baseName);
	obj = new Object;
	obj.session = session;
	obj.db = db;
	return obj;
}

function open_rc_db()
{
	session = open_notes_session();
	config = getServerConfiguration(session);
	
	dbName = AppServerConfig.GetOptProperty( 'lotus-resrc-db-name', 'Resource.nsf' );

	try
	{
		db = session.GetDatabase(config.serverName, dbName );
	}
	catch ( e )
	{
		throw UserError( UiText.errors.unable_to_open_resource_db, e );
	}

	obj = new Object;
	obj.session = session;
	obj.db = db;
	return obj;
}


function getServerConfiguration(session)
{
	str = session.Evaluate('@Implode( @MailDbName; \'!\' )');

	obj = str.split('!');
	config = new Object;
	config.serverName = obj[0];
	config.baseName = obj[1];
	return config;
}


function put_entry_to_ext_calendar( entry, message )
{
	var recipients;
	var dateBegin, dateEnd, subject, body;
	var StartDate, EndDate;
	var isEntryID = false;
	var sendTo = [];
	var copyTo = [];

	extEntry = OpenNewDoc('//cn/cn_ext_calendar_entry.xmd', 'separate=1').TopElem;
	extEntry.AssignElem(entry);

	for ( participant in extEntry.participants )
	{
		person = participant.person_id.ForeignElem;
		participant.email = person.email;
	}

	dateBegin = extEntry.date;
	dateEnd = extEntry.end_date;

	subject = message.subject;
	body = message.body;
	recipients = extEntry.participants;

	if (recipients != null)
	{
		for (subElem in recipients)
		{
			if (subElem.is_optional == true)
				//sendTo.push(subElem.email != '' ? subElem.email : subElem.person_id.ForeignElem.lotus_name);
				sendTo.push(subElem.person_id.ForeignElem.lotus_name);
			else if (subElem.is_optional == false)
				//copyTo.push(subElem.email != '' ? subElem.email : subElem.person_id.ForeignElem.lotus_name);
				copyTo.push(subElem.person_id.ForeignElem.lotus_name);
		}
	}

	conn = open_mail_db();

	if (extEntry.lotus_eid == "")
	{
		doc = conn.db.CreateDocument();
		isNew = true;
	}
	else
	{
		doc = conn.db.GetDocumentByUNID(extEntry.lotus_eid);
		isNew = false;
	}

	if (dateBegin == null)
		return;
	if (dateEnd == null)
		dateEnd = DateOffset(dateBegin, 3600);

	doc.Form = "Appointment";
	doc.AppointmentType = "3"; //meeting
	doc.ReplaceItemValue('$CSVersion', '2');
	doc.ReplaceItemValue('$PublicAccess', '1');

	//alert( dateBegin );
	//alert( doc.CalendarDateTime );

	doc.CalendarDateTime = dateBegin;
	doc.STARTDATETIME = dateBegin;
	doc.StartDate = dateBegin;
	doc.StartTime = dateBegin;

	doc.EndDateTime = dateEnd;
	doc.EndDate = dateEnd;
	doc.EndTime = dateEnd;

	doc.Principal = conn.session.UserName;
	doc.Chair = conn.session.UserName;
	doc.From = conn.session.UserName;

	doc.Subject = subject;
	doc.Body = body;

	doc.RoomToReserve = extEntry.room_id.ForeignElem.lotus_name;
	//insElem = { busyName: extEntry.room_id.ForeignElem.lotus_name, startDate: dateBegin, endDate: dateEnd };
	//conn_ = open_rc_db();
	//idRoom = reserveRoom(conn_, insElem);
	
	doc.SendTo = sendTo.length != 0 ? sendTo : "";
	doc.CopyTo = copyTo.length != 0 ? copyTo : "";

	doc.EnterSendTo = sendTo.length != 0 ? sendTo : "";
	doc.EnterCopyTo = copyTo.length != 0 ? copyTo : "";

	if ( isNew )
	{
		for ( attc in message.attachments )
		{
			tempDir = ObtainSessionTempFile();
			CreateDirectory( tempDir );
			tempFile = UrlAppendPath( tempDir, attc.name );
			
			attc.data.SaveToFile( tempFile );

			doc.AttachFile( '$FILE', tempFile, attc.name );
		}
	}

	doc.ComputeWithForm(true, false);
	doc.Save(true, false, false);

	entry.lotus_eid = doc.UniversalID;
}

function get_mod_entries(minLastModDate)
{
	str = GetChangedCalendarEntries(minLastModDate);
	entriesArray = LoadElemsFromStr(str);
	return entriesArray;
}

function GetChangedCalendarEntries(minLastModDate)
{
	conn = open_mail_db();

	view = conn.db.GetView('Meetings');
	destArray = new Array();
	for (subItem in view)
	{
		minLastModDate_ = subItem.LastModified;
		if (minLastModDate_ >= minLastModDate)
		{
			if (subItem.GetItemTextValue('Form') == 'Appointment')
			{
				entry = OpenNewDoc('//cn/cn_ext_calendar_entry.xmd', 'separate=1').TopElem;
				convertToEntry(subItem, entry);
				destArray.push(entry);
			}
		}
		else
		{
		}
	}
	return ExportElemsToStr(destArray);
}


function get_room_busy_info( room, startDate, endDate )
{
	conn = open_rc_db();
	view = conn.db.GetView('ResByDate');

	destArray = OpenNewDoc('//cn/cn_service_room_busy_info.xmd').TopElem.busy_entries;
	busyEntry = destArray.AddChild();

	startDate = Date(StrDate(startDate, true, true));
	endDate = Date(StrDate(endDate, true, true));

	var subItem;
	var startTime, endTime;
	for ( subItem in view )
	{
		startTime = subItem.GetItemDateValue('StartDate');
		endTime = subItem.GetItemDateValue('EndDate');
		busyRoom = subItem.GetItemTextValue('ResourceName');
		//alert(startTime + " - " + endTime);
		if (busyRoom == room.lotus_name)
		{
			if ((startDate >= startTime && startDate < endTime) ||
				(endDate > startTime && endDate <= endTime) ||
				(startDate <= startTime && endDate >= endTime))
			{
				busyEntry.date = startDate;
				busyEntry.end_date = endDate;
			}
		}
		
	}
	return destArray;
}

function reserveRoom( conn, insElem )
{
	room = conn.db.CreateDocument();

	room.Form = "Reservation";
	room.ReplaceItemValue('$CSVersion', '2');
	room.ReplaceItemValue('$PublicAccess', '1');
	room.ReplaceItemValue('$BusyName', insElem.busyName);

	room.ResourceName = insElem.busyName;
	room.StartDate = insElem.startDate;
	room.StartDateTime = insElem.startDate;
	room.StartTime = insElem.startDate;

	room.EndDate = insElem.endDate;
	room.EndDateTime = insElem.endDate;
	room.EndTime = insElem.endDate;

	room.Principal = conn.session.UserName;
	room.Chair = conn.session.UserName;
	room.From = conn.session.UserName;

	room.ComputeWithForm(true, false);
	room.Save(true, false, false);

	return room.UniversalID;
}

function convertToEntry(item, entry)
{
	entry.lotus_eid = item.UniversalID;
	entry.date = item.GetItemDateStrValue('StartDateTime');
	entry.end_date = item.GetItemDateStrValue('EndDateTime');

	entry.comment = Trim(item.GetItemTextValue('Subject') + '\r\n' + item.GetItemTextValue('Body'));

	docTo = (item.GetItemStrValue('SendTo') != '') ? item.GetItemStrValue('SendTo') :
	((item.GetItemStrValue('EnterSendTo') != '') ? item.GetItemStrValue('EnterSendTo') : item.GetItemStrValue('RequiredAttendees'));

	if (docTo != "")
	{
		docTo_ = docTo.split(';');
		for (elem in docTo_)
		{
			participant = entry.participants.AddChild();
			participant.is_optional = true;

			person = ArrayOptFindByKey(persons, elem, 'lotus_name');

			participant.person_id = (ArrayOptFindByKey(persons, elem, 'lotus_name')) != undefined ?
				ArrayOptFindByKey(persons, elem, 'lotus_name').id : (ArrayOptFindByKey(persons, elem, 'email') != undefined ?
				ArrayOptFindByKey(persons, elem, 'email').id:"");
		}
	}

	copyTo = (item.GetItemStrValue('CopyTo') != '') ? item.GetItemStrValue('CopyTo') :
	((item.GetItemStrValue('EnterCopyTo') != '') ? item.GetItemStrValue('EnterCopyTo') : item.GetItemStrValue('OptionalAttendees'));

	if (copyTo != "")
	{
		copyTo_ = copyTo.split(';');
		for (elem in copyTo_)
		{
			participant = entry.participants.AddChild();
			participant.is_optional = false;
			try
			{
				participant.person_id = ArrayOptFindByKey(persons, elem, 'lotus_name').id;
			}
			catch (e) { }
		}
	}
	//alert(entry.Xml);
}

function display_ext_calendar_entry(entry)
{
	if (!entry.lotus_eid.HasValue)
		throw UserError('Item has not been exported to Lotus Notes');
	
	DisplayCalendarEntry(entry);
}

function check_ext_calendar_entry_editor( entry )
{
	return false;
}


function DisplayCalendarEntry(entry)
{
	conn = open_mail_db();
	config = getServerConfiguration(conn.session);
	serverName = config.serverName;
	baseName = config.baseName;

	if ( serverName != '' )
	{
		var CN, Org;
		
		for ( str in String( serverName ).split( '/' ) )
		{
			if ( ( obj = StrOptScan(str, 'CN=%s') ) != undefined )
				CN = obj[0];
			else if ( ( obj = StrOptScan(str, 'O=%s')) != undefined)
				Org = obj[0];
		}

		if ( CN == undefined || Org == undefined )
			throw UiError( 'Invalid Lotus server name: ' ) + serverName;

		host = CN + "@" + Org;
	}
	else
	{
		host = '';
		//DebugMsg( host );
	}
		
	baseName = StrReplace(baseName, '\\', '/');

	entryUrl = "notes://" + host + "/" + baseName + "/x/";
	entryUrl += entry.lotus_eid;
	
	//LogEvent( '', entryUrl );

	ShellExecute( 'open', entryUrl );
}


function delete_ext_calendar_entry(entry)
{
	if (!entry.lotus_eid.HasValue)
		throw UserError('Item has not been exported to Lotus Notes');

	conn = open_mail_db();
	view = conn.db.GetView('Meetings');
	try
	{
		doc = conn.db.GetDocumentByUNID(entry.lotus_eid);
	}
	catch (e)
	{
		alert('Item has been moved or deleted');
		return;
	}
	doc.Remove(true);
}


function get_ext_calendar_entry( entry )
{
	return entry;
}
