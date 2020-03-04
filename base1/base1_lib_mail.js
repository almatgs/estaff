function get_template_doc( template )
{
	if ( ! template.id.HasValue )
		return template;

	if ( UseLds )
		return EvalCs( 'get_template_doc_core( template )' );
	else
		return OpenDoc( template.ObjectUrl );
}


function get_template_doc_core( template )
{
	for ( cachedTemplate in cached_templates )
	{
		if ( cachedTemplate.template_id == template.id )
		{
			if ( cachedTemplate.template_ref.Object === template )
				return cachedTemplate.template_doc_ref.Object;

			cachedTemplate.Delete();
			break;
		}
	}

	cachedTemplate = cached_templates.AddChild();
	cachedTemplate.template_id = template.id;
	cachedTemplate.template_ref = template;
	cachedTemplate.template_doc_ref = OpenDoc( template.ObjectUrl );

	return cachedTemplate.template_doc_ref.Object;
}


function build_mail_message( template, email, recipientData, envObject )
{
	if ( System.IsWebClient )
	{
		srcMessage = CallServerMethod( 'lib_mail', 'BuildDraftMailMessageCoreSrv', [template.id, email, recipientData, EncodeEnvObject( envObject )] );
		return srcMessage;
	}

	message = build_mail_message_core( template, email, recipientData, envObject );
	build_mail_attachments( message, template, recipientData, envObject );

	finish_template_message( message, template, recipientData, envObject );

	return message;
}


function build_default_env( recipientData, initEnvObject )
{
	if ( recipientData.IsTopElem && recipientData.Name == 'candidate' )
	{
		if ( initEnvObject != undefined && initEnvObject.GetOptProperty( 'vacancy' ) != undefined )
			vacancyID = initEnvObject.vacancy.id;
		else
			vacancyID = recipientData.main_vacancy_id;

		envObject = recipientData.build_mail_env_object( vacancyID );
	}
	else
	{
		envObject = new Object();
	}

	if ( recipientData.IsTopElem )
		envObject.AddProperty( recipientData.Name, recipientData );

	return envObject;
}


function build_mail_message_core( template, email, recipientData, envObject )
{
	templateDoc = get_template_doc( template );
	
	if ( envObject == undefined )
		envObject = new Object();

	if ( envObject.GetOptProperty( 'isMassMail' ) != true && local_settings.mail_method_id == 'outlook' && outlook_global_settings.use_system_signature )
		envObject.signature = '';
	else
		envObject.signature = local_settings.mail_signature;

	message = new MailMessage();
			
	if ( email != '' )
		message.recipients.AddChild().address = email;
	else if ( template.dest_type == 'fixed_email' && template.email != '' )
		message.recipients.AddChild().address = template.email;

	pageOptions = 'bracket-style=1;strict-errors=1;';

	with ( recipientData )
	{
		with ( envObject )
		{
			try
			{
				message.subject = EvalCodePage( template.subject, pageOptions );
			}
			catch ( e )
			{
				throw UserError( UiText.errors.eval_mail_template_failed + '\r\n', e );
			}
		}
	}

	if ( templateDoc.TopElem.use_html_text )
	{
		with ( recipientData )
		{
			with ( envObject )
			{
				try
				{
					message.html_body = EvalCodePage( templateDoc.TopElem.html_text, pageOptions );
				}
				catch ( e )
				{
					throw UserError( UiText.errors.eval_mail_template_failed + '\r\n', e );
				}
			}
		}
	}
	else
	{
		with ( recipientData )
		{
			with ( envObject )
			{
				try
				{
					message.body = EvalCodePage( templateDoc.TopElem.text, pageOptions );
				}
				catch ( e )
				{
					throw UserError( UiText.errors.eval_mail_template_failed + '\r\n', e );
				}
			}
		}
	}

	message.attachments.AssignElem( templateDoc.TopElem.attachments );
	return message;
}



function build_mail_attachments( message, template, recipientData, envObject )
{
	if ( envObject == undefined )
		envObject = new Object();

	pageOptions = 'bracket-style=1;strict-errors=1;';

	for ( cardAttcTemplate in template.card_attachments )
	{
		with ( recipientData )
		{
			with ( envObject )
			{
				try
				{
					attcName = EvalCodePage( cardAttcTemplate.name, pageOptions );
				}
				catch ( e )
				{
					throw UserError( UiText.errors.eval_mail_template_failed + '\r\n', e );
				}
			}
		}

		if ( attcName == '' )
			attcName = '1';

		if ( cardAttcTemplate.card_attachment_type_id != '' )
		{
			if ( cardAttcTemplate.src_object_type_id != '' )
			{
				if ( ! envObject.HasProperty( cardAttcTemplate.src_object_type_id ) )
					throw UserError( StrReplace( UiText.errors.invalid_mail_template_src_object_type_xxx, '%s', cardAttcTemplate.src_object_type_id ) );

				baseCardData = envObject.GetProperty( cardAttcTemplate.src_object_type_id );
			}
			else
			{
				baseCardData = recipientData;
			}

			if ( baseCardData.ChildExists( 'attachments' ) )
				attachment = ArrayOptFindByKey( baseCardData.sorted_attachments, cardAttcTemplate.card_attachment_type_id, 'type_id' );
			else
				attachment = undefined;
		}
		else
		{
			if ( recipientData.ChildExists( 'attachments' ) )
				attachment = ArrayOptFirstElem( recipientData.sorted_attachments );
			else
				attachment = undefined;
		}

		if ( attachment == undefined )
		{
			if ( cardAttcTemplate.is_optional )
				continue;

			if ( cardAttcTemplate.card_attachment_type_id.HasValue )
				throw UserError( StrReplace( UiText.errors.req_attachment_xxx_not_found, '%s', cardAttcTemplate.card_attachment_type_id.ForeignElem.name ) );
			else
				throw UserError( UiText.errors.req_attachment_not_found );
		}

		if ( attachment.is_plain_text || attachment.is_text )
		{
			messageAttc = message.attachments.AddChild();
			messageAttc.name = attcName;

			if ( ! StrContains( messageAttc.name, '.' ) )
				messageAttc.name = messageAttc.name + '.doc';

			suffix = StrLowerCase( UrlPathSuffix( messageAttc.name ) );

			if ( suffix == '.htm' || suffix == '.html' )
			{
				if ( attachment.is_plain_text )
					messageAttc.data = HtmlEncodeDoc( attachment.plain_text );
				else
					messageAttc.data = attachment.text;

				continue;
			}

			tempFile = ObtainTempFile( suffix );
			templateTempFile = '';

			attachmentTypeDoc = OpenDoc( attachment.type_id.ForeignObjectUrl );
			attachmentType = attachmentTypeDoc.TopElem;

			if ( attachment.type_id.ForeignElem.use_msword_template && attachmentType.msword_template.data.HasValue )
			{
				templateSuffix = StrLowerCase( UrlPathSuffix( attachmentType.msword_template.file_name ) );
				templateTempFile = ObtainTempFile( templateSuffix );
				attachmentType.msword_template.data.SaveToFile( templateTempFile );
			}
			else
			{
				templateTempFile = '';
			}

			lib_office.build_native_doc( tempFile, ( attachment.is_plain_text ? attachment.plain_text : AdjustHtml( attachment.text, 'remove-empty-images=1' ) ), attachment.content_type, templateTempFile );

			messageAttc.data.LoadFromFile( tempFile );

			if ( templateTempFile != '' )
				DeleteUrl( templateTempFile );

			DeleteUrl( tempFile );
		}
		else
		{
			if ( attachment.files.ChildNum != 0 )
			{
				for ( attachmentFile in attachment.files )
				{
					messageAttc = message.attachments.AddChild();
					messageAttc.name = attachmentFile.file_name;
					messageAttc.data.AssignElem( attachmentFile.data );
				}
			}
			else
			{
				messageAttc = message.attachments.AddChild();
				messageAttc.name = attachment.file_name;
				messageAttc.data.AssignElem( attachment.data );
			}
		}
	}
}


function finish_template_message( message, template, recipientData, envObject )
{
	if ( ! template.finish_action.HasValue )
		return;

	with ( recipientData )
	{
		with ( envObject )
		{
			eval( template.finish_action );
		}
	}
}


function show_mail_message( message )
{
	if ( message.sender.address == '' )
	{
		message.sender.address = local_settings.sender.address;
		message.sender.name = local_settings.sender.name;
	}

	adjust_message_sender( message );
	adjust_message_recipients( message );

	if ( local_settings.mail_method_id == 'smtp' )
	{
		check_auto_mailing_settings();
		show_native_mail_message( message );
		return;
	}

	if ( local_settings.mail_method_id == 'lotus' )
		lib_lotus.open_notes_session();

	if ( local_settings.mail_method_id == 'outlook' && ( outlook_global_settings.use_system_signature || message.html_body.HasValue ) )
	{
		lib_outlook.show_mail_message( message );
		return;
	}

	ShowMailMessage( message, local_settings.mail_method_id );
}


function check_auto_mailing_settings( options )
{
	if ( LdsIsClient && local_settings.use_local_auto_mailing_settings  && ! ( options != undefined && options.GetOptProperty( 'UseGlobalSettings', false ) ) )
	{
		if ( local_settings.auto_mailing.smtp.server_address == '' )
			throw UiError( UiText.errors.local_smtp_server_not_specified );

		if ( local_settings.sender.address == '' )
			throw UiError( UiText.errors.default_sender_address_not_specified );
	}
	else
	{
		if ( global_settings.auto_mailing.smtp.server_address == '' )
			throw UiError( UiText.errors.smtp_server_not_specified );

		if ( global_settings.auto_mailing.default_sender.address == '' )
			throw UiError( UiText.errors.default_sender_address_not_specified );
	}
}


function send_mail_message( message, options )
{
	if ( options == undefined )
		options = new Object();

	check_auto_mailing_settings( options );

	if ( lib_html.is_compound_html( message.html_body ) && ! System.IsWebClient )
		message.html_body = lib_html.CompoundHtmlToMailMessageBody( message.html_body, message );

	if ( System.IsWebClient )
	{
		if ( ! options.GetOptProperty( 'UseGlobalSettings', false ) )
			options.UseAccount = true;
		
		CallServerMethod( 'lib_mail', 'send_mail_message_core', [message, options] );
	}
	else
	{
		runner = new MethodRunner( lib_mail, 'send_mail_message_core' );
		runner.SetArguments( message, options );
		runner.RunOnServer = global_settings.auto_mailing.run_on_server;
		runner.RunAsync = options.GetOptProperty( 'RunAsync', runner.RunAsync );
		runner.ErrorLogName = 'mass-mail';

		runner.Run();
	}
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function send_mail_message_core( message, options )
{
	LogEvent( 'mass-mail', ArrayMerge( message.recipients, 'address', ';' ) + '\t' + message.subject );

	adjust_message_sender( message, options );
	adjust_message_recipients( message );

	if ( ( debugEmail = AppServerConfig.GetOptProperty( 'debug-notif-email' ) ) != undefined )
	{
		for ( recipient in message.recipients )
		{
			message.body += '\r\n\r\nDEBUG. Actual email: ' + recipient.address;
			recipient.address = debugEmail;
		}
	}

	draftMessageUrl = options.GetOptProperty( 'DraftMessageUrl' );
	if ( draftMessageUrl != undefined )
		LoadMailMessageAttachmentsFromDraft( message, draftMessageUrl );
	
	settings = get_auto_mailing_settings( options );

	client = new SmtpClient;
	
	if ( settings.smtp.use_ssl_port )
		client.UseTLSPort = true;
	else if ( settings.smtp.use_ssl )
		client.UseTLS = true;

	client.OpenSession( settings.smtp.server_address );
	
	if ( settings.smtp.use_auth )
		client.Authenticate( settings.smtp.login, settings.smtp.password );

	client.SendMessage( message );
	client.CloseSession();

	if ( draftMessageUrl != undefined )
		DeleteUrl( draftMessageUrl );
	
	LogEvent( 'mass-mail', 'DONE' );
}


function send_test_mail_message( email, options )
{
	message = new MailMessage();

	message.recipients.AddChild( email ).address = email;
	message.subject = 'Test';
	message.body = 'Test';

	send_mail_message( message, options );
}


function adjust_message_sender( message, options )
{
	if ( message.sender.address != '' )
		return;

	if ( options == undefined )
		options = new Object;
	
	if ( options.GetOptProperty( 'UseAccount', false ) )
	{
		account = GetCurUserRequiredSmtpAccount();
		message.sender.address = account.login;
	}
	else if ( LdsIsClient && local_settings.sender.address.HasValue && ! options.GetOptProperty( 'UseGlobalSettings', false ) )
	{
		message.sender.address = local_settings.sender.address;
		message.sender.name = local_settings.sender.name;
	}
	else
	{
		message.sender.address = global_settings.auto_mailing.default_sender.address;
		message.sender.name = global_settings.auto_mailing.default_sender.name;
	}
}


function adjust_message_recipients( message )
{
	if ( message.recipients.ChildNum != 1 )
		return;

	recipient = message.recipients[0];

	if ( StrContains( recipient.address, ';' ) )
		strArray = String( recipient.address ).split( ';' );
	else
		return;

	message.recipients.Clear();

	for ( str in strArray )
	{
		message.recipients.AddChild().address = str;
	}
}


function handle_send_mass_mail( objectUrlsArray )
{
	check_auto_mailing_settings();

	templateID = lib_voc.select_voc_elem( mail_templates );

	send_mass_mail( objectUrlsArray, templateID );
}


function send_mass_mail( objectUrlsArray, templateID, initEnvObject )
{
	check_auto_mailing_settings();

	templateDoc = DefaultDb.OpenObjectDoc( 'mail_template', templateID );
	template = templateDoc.TopElem;
	
	count = 0;
	
	for ( objectUrl in objectUrlsArray )
	{
		objectDoc = OpenDoc( objectUrl );
		object = objectDoc.TopElem;

		if ( count == 0 )
		{
			if ( object.Name == 'person' )
			{
			}
			else if ( object.Name == 'candidate' )
			{
			}
			else
			{
				throw UserError( UiText.errors.wrong_mass_mail_object_type );
			}

			if ( template.dest_type != object.Name )
				lib_base.ask_warning_to_continue( ActiveScreen, UiText.messages.mass_mail_dest_type_mismatch );
		}

		if ( object.email == '' )
			continue;
	
		if ( ! IsValidEmail( object.email ) )
			continue;

		envObject = build_default_env( object, initEnvObject );
		envObject.isMassMail = true;
		
		message = build_mail_message( template, object.email, object, envObject );
		adjust_message_sender( message );

		if ( count == 0 )
		{
			dlgDoc = OpenDoc( 'base1_dlg_mass_mail.xml' );
			dlg = dlgDoc.TopElem;

			dlg.target_type = object.Name;
			dlg.sample_letter.AssignElem( message );
			dlg.count = ArrayCount( objectUrlsArray );
			ActiveScreen.ModalDlg( dlgDoc );
		}
		
		send_mail_message( message );

		LogEvent( 'mail_trans', 'SENT: ' + object.email );


		if ( false && template.should_register )
		{
			newRecord = candidate.records.AddChild();
			newRecord.type_id = ( template.record_type_id != null ? template.record_type_id : template.dest_type + '_letter' );
			//newRecord.position_id = _position_id;
			newRecord.comment = ( template.record_type_id != null ? '' : template.name );
			newRecord.user_id = LdsCurUserID;

			candidateDoc.Save();
			LogEvent( 'mail_trans', 'RECORD ADDED: ' + candidate.email );
		}

		if ( count == 0 )
			StartModalTask( UiText.messages.mass_mail + '...' );

		Sleep( global_settings.auto_mailing.smtp.delay );
		count++;
	}
}


function get_auto_mailing_settings( options )
{
	if ( options.GetOptProperty( 'UseAccount', false ) )
	{
		account = GetCurUserRequiredSmtpAccount();

		settings = CreateElemByFormElem( global_settings.auto_mailing.FormElem );
		settings.smtp.AssignElem( account );
		settings.smtp.use_auth = true;
		settings.smtp.password = StrStdDecrypt( account.password_ed );
		return settings;
	}

	if ( LdsIsClient && local_settings.use_local_auto_mailing_settings && ! options.GetOptProperty( 'UseGlobalSettings', false ) )
		return local_settings.auto_mailing;
	else
		return global_settings.auto_mailing;
}


function get_sys_default_email_app_name()
{
	if ( System.CombVersion >= 600 )
	{
		str = GetSysRegStrValue( 'HKEY_CURRENT_USER\\Software\\Clients\\Mail\\', '' );
		if ( str != '' )
			return str;
	}

	str = GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\', '' );
	return str;
}


function guess_default_mail_method_id()
{
	if ( System.IsWebClient )
		return 'smtp';
	
	mailAppName = get_sys_default_email_app_name();
	if ( mailAppName == 'Lotus Notes' && lib_lotus.get_lotus_version() < '8.0' )
		return 'lotus';
	else if ( mailAppName == 'Microsoft Outlook1' || lib_outlook.is_outlook_installed() )
		return 'outlook';
	else
		return 'mapi';
}


function guess_default_mailbox_accees_method_id()
{
	mailAppName = get_sys_default_email_app_name();
	if ( mailAppName == 'Outlook Express' || mailAppName == 'Windows Mail' )
		return 'mapi';
	else if ( mailAppName == 'Microsoft Outlook' )
		return 'mapi2';
	else
		return 'pop';
}


function show_native_mail_message( message )
{
	doc = OpenNewDoc( 'base1_mail_message_compose.xmd' );
	doc.TopElem.message_ref = message;
	CreateDocScreen( doc );
}



"META:ALLOW-CALL-FROM-CLIENT:1";
function BuildDraftMailMessageCoreSrv( templateID, email, recipientData, envObject )
{
	template = GetForeignElem( mail_templates, templateID );
	envObject = DecodeEnvObject( envObject );

	message = build_mail_message_core( template, email, recipientData, envObject );
	build_mail_attachments( message, template, recipientData, envObject );
	finish_template_message( message, template, recipientData, envObject );

	for ( attachment in message.attachments )
		attachment.id = UniqueStrID( 32 );

	draftUrl = 'x-local://share/drafts/' + UniqueStrID( 32 ) + '.xml';

	draftMailMessageDoc = OpenNewDoc( 'x-app://app/sx_mail_message.xmd' );
	draftMailMessageDoc.Url = draftUrl;
	darftMailMessage = draftMailMessageDoc.TopElem;

	darftMailMessage.AssignElem( message );
	draftMailMessageDoc.Save();

	message.draft_url = draftUrl;

	for ( attachment in message.attachments )
		attachment.data.Clear();

	return message;
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function LoadDraftMailMessageAttachment( draftUrl, srcFileUrl )
{
	if ( ! StrBegins( srcFileUrl, 'x-local://share/uploaded_files/' ) )
		throw UserError( "Source url is forbidden" );

	lib_base.CheckAllowedAttcFileSuffix( srcFileUrl );

	if ( draftUrl == '' )
	{
		draftUrl = 'x-local://share/drafts/' + UniqueStrID( 32 ) + '.xml';
		mailMessageDoc = OpenNewDoc( 'x-app://app/sx_mail_message.xmd' );
		mailMessageDoc.Url = draftUrl;
		mailMessage = mailMessageDoc.TopElem;
	}
	else
	{
		if ( ! StrBegins( draftUrl, 'x-local://share/drafts/' ) )
			throw UserError( "Draft url is forbidden" );

		mailMessageDoc = OpenDoc( draftUrl );
		mailMessage = mailMessageDoc.TopElem;
	}

	attachment = mailMessage.attachments.AddChild();

	attachment.data.LoadFromFile( srcFileUrl );
	attachment.name = UrlFileName( srcFileUrl );
	attachment.id = UniqueStrID( 32 );

	mailMessageDoc.Save();

	DeleteUrl( srcFileUrl );

	respInfo = new Object;
	respInfo.draft_url = draftUrl;
	respInfo.attachment_id = RValue( attachment.id );
	return respInfo;
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function SaveDraftMailMessageAttachmentToTempUrl( draftUrl, attachmentID )
{
	if ( ! StrBegins( draftUrl, 'x-local://share/drafts/' ) )
		throw UserError( "Draft url is forbidden" );

	mailMessageDoc = OpenDoc( draftUrl );
	mailMessage = mailMessageDoc.TopElem;

	attachment = mailMessage.attachments.GetChildByKey( attachmentID );

	tempUrl = 'x-local://share/temp/' + UniqueStrID( 32 ) + '/' + attachment.name;
	attachment.data.SaveToFile( tempUrl );

	respInfo = new Object;
	respInfo.temp_url = tempUrl;
	return respInfo;
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function DeleteDraftMailMessageAttachment( draftUrl, attachmentID )
{
	if ( ! StrBegins( draftUrl, 'x-local://share/drafts/' ) )
		throw UserError( "Draft url is forbidden" );

	mailMessageDoc = OpenDoc( draftUrl );
	mailMessage = mailMessageDoc.TopElem;

	attachment = mailMessage.attachments.GetChildByKey( attachmentID );
	attachment.Delete();

	mailMessageDoc.Save();
}


function LoadMailMessageAttachmentsFromDraft( mailMessage, draftMessageUrl )
{
	draftMessageDoc = OpenDoc( draftMessageUrl );
	draftMessage = draftMessageDoc.TopElem;

	/*for ( srcAttachment in draftMessage.attachments )
	{
		attachment = mailMessage.attachments.ObtainChildByKey( srcAttachment.id, 'id' );
		attachment.AssignElem( srcAttachment);
	}*/

	mailMessage.attachments.AssignElem( draftMessage.attachments );
}


function GetCurUserRequiredSmtpAccount()
{
	account = GetCurUserSmtpAccount();
	if ( account == undefined )
		throw UiError( UiText.errors.cur_user_smtp_account_not_found );

	return account;
}


function GetCurUserSmtpAccount()
{
	if ( CurAuthObject == undefined || CurAuthObject.Name != 'user' )
		return undefined;

	return ArrayOptFind( external_accounts, 'is_active && user_id == CurAuthObject.id && type_id == \'smtp\'' );
}


function EncodeEnvObject( envObject )
{
	newEnvObject = new Object;

	for ( propName in envObject )
	{
		switch ( propName )
		{
			case 'candidate':
			case 'vacancy':
			case 'org':
			case 'person':
				if ( ! envObject.HasProperty( propName + 'Doc' ) )
					newEnvObject[propName + 'DocUrl'] = envObject[propName].Doc.Url;
				break;

			case 'candidateDoc':
			case 'vacancyDoc':
			case 'orgDoc':
			case 'personDoc':
				newEnvObject[StrReplaceOne( propName, 'Doc', 'DocUrl' )] = envObject[propName].Url;
				break;

			default:
				newEnvObject[propName] = envObject[propName];
		}
	}

	return newEnvObject;
}


function DecodeEnvObject( srcEnvObject )
{
	envObject = new Object;

	for ( propName in srcEnvObject )
	{
		switch ( propName )
		{
			case 'candidateDocUrl':
			case 'vacancyDocUrl':
			case 'orgDocUrl':
			case 'personDocUrl':
				docUrl = srcEnvObject[propName];
				if ( docUrl != '' )
				{
					doc = OpenDoc( srcEnvObject[propName] );
				}
				else
				{
					doc = DefaultDb.OpenNewObjectDoc( StrReplaceOne( propName, 'DocUrl', '' ), 'separate=1' );
				}

				envObject[StrReplaceOne( propName, 'DocUrl', 'Doc' )] = doc;
				envObject[StrReplaceOne( propName, 'DocUrl', '' )] = doc.TopElem;
				break;

			default:
				envObject[propName] = srcEnvObject[propName];
		}
	}

	return envObject;
}