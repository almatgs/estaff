function RunAgentMailboxScanner()
{
	LogEvent( 'mailbox-scan', 'Scan started' );

	for ( account in ArraySelect( external_accounts, 'is_active && type_id == \'imap\'' ) )
	{
		try
		{
			LoadAccountMessages( account );
		}
		catch ( e )
		{
			LogEvent( 'mailbox-scan', 'Error loading messages from account ' + account.login + ': ' + e );
		}
	}

	LogEvent( 'mailbox-scan', 'Scan finished' );
}


function LoadAccountMessages( account )
{
	LogEvent( 'mailbox-scan', 'Account: ' + account.login );

	lastRunDate = task_results.GetTaskLastRunDate( 'mailbox_scanner:' + account.id.XmlValue );
	runDate = CurDate;

	imapClient = lib_base.open_imap_client_session_for_account( account );
	
	//imapClient.RunCommand( 'LIST', '"" ""' );
	respArray = imapClient.RunCommand( 'LIST', '"" "*"' );
	//strArray = imapClient.RunCommand( 'LIST', '"" "%" RETURN (SPECIAL-USE)' );

	foldersArray = new Array;

	for ( resp in respArray )
	{
		folderPath = resp[2];
		delimChar = resp[1];

		if ( StrBegins( folderPath, '.' ) )
			continue;

		if ( ArrayOptFind( resp[0], 'This == \'\\\\Noselect\'' ) )
			continue;

		pos = folderPath.indexOf( delimChar );
		if ( pos > 0 )
			folderRootName = folderPath.slice( 0, pos );
		else
			folderRootName = folderPath;

		switch ( StrLowerCase( folderRootName ) )
		{
			case 'drafts':
			case 'черновики':
			case 'trash':
			case 'корзина':
			case 'deleted items':
			case 'удаленные элементы':
			case 'templates':
			case 'junk':
			case 'junk e-mail':
				continue;
		}

		foldersArray.push( folderPath );
	}
	
	//DebugMsg( ArrayMerge( foldersArray, 'This', '\r\n' ) );

	for ( folderPath in foldersArray )
	{
		//if ( folderPath == 'INBOX' )
			//continue;

		LoadAccountMessagesFromFolder( account, lastRunDate, imapClient, folderPath );
	}

	task_results.SetTaskLastRunDate( 'mailbox_scanner:' + account.id.XmlValue, runDate );
}


function LoadAccountMessagesFromFolder( account, lastRunDate, imapClient, folderPath )
{
	LogEvent( 'mailbox-scan', 'Mailbox folder: ' + folderPath );

	imapClient.RunCommand( 'SELECT', '"' + folderPath + '"' );

	if ( lastRunDate != null )
	{
		minDate = lastRunDate;
	}
	else
	{
		depth = Int( AppServerConfig.GetOptProperty( 'mailbox-scan-depth', 14 ) );
		minDate = DateOffset( CurDate, - depth * 86400 );
	}
	
	seqNoArray = new Array;

	respArray = imapClient.RunCommand( 'SEARCH', 'SINCE ' + EncodeImapDate( minDate ) );
	for ( resp in respArray )
	{
		for ( i = 0; i < resp.length; i++ )
			seqNoArray.push( Int( resp[i] ) );
	}

	for ( seqNo in seqNoArray )
	{
		LoadMessage( account, imapClient, folderPath, seqNo );
		//break;
	}
}


function LoadMessage( account, imapClient, folderPath, seqNo )
{
	respArray = imapClient.RunCommand( 'FETCH', seqNo + ' (RFC822.HEADER INTERNALDATE FLAGS)' );
	//resp = ArrayFind( respArray, 'Int(This[0]) == seqNo && This[1] == \'FETCH\'' );
	resp = respArray[0];

	mimeMessage = new MimeMessage;

	subArray = resp[1];

	for ( i = 0; i < subArray.length; i += 2 )
	{
		if ( subArray[i] == 'RFC822.HEADER' )
			mimeMessage.LoadHeader( subArray[i+1] );
		else if ( subArray[i] == 'INTERNALDATE' )
			messageDate = DecodeImapDate( Trim( subArray[i+1] ) );
	}

	//DebugMsg( messageDate );

	isOutgoing = false;
	
	if ( mimeMessage.Header.GetOptProperty( 'Received' ) == undefined )
		isOutgoing = true;

	if ( StrContains( folderPath, 'sent', true ) || StrContains( folderPath, 'отправленные', true ) )
		isOutgoing = true;

	if ( isOutgoing )
		emailsArray = ArrayExtract( mimeMessage.Recipients, 'Address' );
	else
		emailsArray = [mimeMessage.Sender.Address];

	LogEvent( 'mailbox-scan', 'Message: Date: ' + StrXmlDate( messageDate ) + '  ' + ( isOutgoing ? 'To: ' : 'From: ' ) + ArrayMerge( emailsArray, 'This', '; ' ) );

	match = false;
	peerPerson = undefined;
	candidate = undefined;

	for ( email in emailsArray )
	{
		if ( global_settings.use_client_orgs || global_settings.use_other_orgs )
		{
			peerPerson = lib_base.query_opt_record_by_key( persons, email, 'email' );
			if ( peerPerson != undefined )
			{
				if ( ! peerPerson.is_candidate && peerPerson.is_own_person )
					continue;

				if ( peerPerson.is_candidate )
					candidate = peerPerson;

				match = true;
				break;
			}
		}
		else
		{
			candidate = lib_base.query_opt_record_by_key( candidates, email, 'email' );
			if ( candidate != undefined )
			{
				match = true;
				break;
			}
		}
	}

	if ( ! match )
	{
		LogEvent( 'mailbox-scan', 'Neither a candidate nor a contact person' );
		return;
	}

	messageEid = mimeMessage.Header.GetOptProperty( 'Message-ID' );
	if ( messageEid == undefined )
	{
		LogEvent( 'mailbox-scan', 'Empty Message-ID' );
		return;
	}

	obj = StrScan( messageEid, '<%s>' );
	messageEid = obj[0];

	grabbedMessage = lib_base.query_opt_record_by_key( email_messages, messageEid, 'eid' );
	if ( grabbedMessage != undefined )
	{
		LogEvent( 'mailbox-scan', 'Already loaded' );
		return;
	}

	respArray = imapClient.RunCommand( 'FETCH', seqNo + ' (BODY.PEEK[])' );
	resp = respArray[0];

	mimeMessage = new MimeMessage;
	mimeMessage.Load( resp[1][1] );

	grabbedMessageDoc = DefaultDb.OpenNewObjectDoc( 'email_message' );
	grabbedMessage = grabbedMessageDoc.TopElem;

	grabbedMessage.eid = messageEid;
	grabbedMessage.date = messageDate;
	grabbedMessage.is_outgoing = isOutgoing;
	
	grabbedMessage.sender_address = mimeMessage.Sender.Address;
	grabbedMessage.sender_name = mimeMessage.Sender.Name;

	for ( srcRecipient in mimeMessage.Recipients )
	{
		recipient = grabbedMessage.recipients.AddChild();
		recipient.address = srcRecipient.Address;
		recipient.name = srcRecipient.Name;
	}

	grabbedMessage.subject = mimeMessage.Subject;
	grabbedMessage.body = mimeMessage.BodyText;

	grabbedMessage.body = StrReplace( Trim( grabbedMessage.body ), '\r\n\r\n', '\r\n' );
	
	grabbedMessage.external_account_id = account.id;
	grabbedMessage.person_id = account.person_id;

	user = ArrayOptFindByKey( users, grabbedMessage.person_id, 'person_id' );
	if ( user != undefined )
		grabbedMessage.user_id = user.id;

	if ( peerPerson != undefined )
	{
		grabbedMessage.peer_person_id = peerPerson.id;
		grabbedMessage.peer_org_id = peerPerson.org_id;
	}
	
	if ( candidate != undefined )
		grabbedMessage.candidate_id = candidate.id;

	grabbedMessageDoc.Save();

	LogEvent( 'mailbox-scan', 'Loaded' );
}


function EncodeImapDate( date )
{
	return StrInt( Day( date ), 2 ) + '-' + GetMonthShortName( Month( date ) ) + '-' + StrInt( Year( date ) );
}


function DecodeImapDate( str )
{
	obj = StrScan( str, '%s-%s-%s %s %s' );
	
	switch ( obj[1] )
	{
		case 'Jan':
			month = 1;
			break;

		case 'Feb':
			month = 2;
			break;

		case 'Mar':
			month = 3;
			break;

		case 'Apr':
			month = 4;
			break;

		case 'May':
			month = 5;
			break;

		case 'Jun':
			month = 6;
			break;

		case 'Jul':
			month = 7;
			break;

		case 'Aug':
			month = 8;
			break;

		case 'Sep':
			month = 9;
			break;

		case 'Oct':
			month = 10;
			break;

		case 'Nov':
			month = 11;
			break;

		case 'Dec':
			month = 12;
			break;
	}

	newStr = obj[2] + '-' + StrInt( month, 2 ) + '-' + obj[0] + 'T' + obj[3] + obj[4];
	//DebugMsg( newStr );

	return Date( newStr );
}


function GetMonthShortName( month )
{
	switch ( month )
	{
		case 1:
			return "Jan";

		case 2:
			return "Feb";

		case 3:
			return "Mar";

		case 4:
			return "Apr";

		case 5:
			return "May";

		case 6:
			return "Jun";

		case 7:
			return "Jul";

		case 8:
			return "Aug";

		case 9:
			return "Sep";

		case 10:
			return "Oct";

		case 11:
			return "Nov";

		case 12:
			return "Dec";

		default:
			return "";
	}
}

