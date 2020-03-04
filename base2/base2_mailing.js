function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;
	code = lib_base.obtain_new_object_code( Name );
	date = CurDate;
}



function handle_add_recipients()
{
	array = lib_base.select_objects_from_view( 'persons' );

	for ( personID in array )
		recipients.ObtainChildByKey( personID );

	Doc.SetChanged( true );
}


function send_messages()
{
	if ( ! lib_user.active_user_access.allow_all )
		throw UserError( UiText.errors.permission_denied );

	lib_mail.check_auto_mailing_settings();

	count = 0;
	StartModalTask( UiText.titles.mass_mailing + '...' );
	
	for ( recipient in recipients )
	{
		if ( recipient.completion_id != null )
			continue;

		person = recipient.person_id.ForeignElem;

		ModalTaskMsg( person.org_id.ForeignDispName + '  ' + person.fullname );

		message = MailMessage();

		if ( person.email.HasValue )
			message.recipients.AddChild().address = person.email;

		if ( person.email2.HasValue )
			message.recipients.AddChild().address = person.email2;

		message.subject = template.subject;
		message.body = template.text;
		
		message.sender.address = 'st@e-staff.ru';
		message.sender.name = 'E-Staff Information Center';


		client = new SmtpClient;

		client.OpenSession( global_settings.auto_mailing.smtp.server_address );
		//client.OpenSession( 'mail.datex.ru' );
		//client.Authenticate( '', '' );
		client.SendMessage( message );
		client.CloseSession();

		recipient.completion_id = 1;

		Sleep( 100 );
		count++;

		Doc.SetChanged( true );

		if ( count == 200 )
			break;
	}

	FinishModalTask();
}


function send_test_messages()
{
	if ( test_email == '' )
		throw UserError( UiText.errors.test_email_not_specified );

	lib_mail.check_auto_mailing_settings();

	message = MailMessage();
	message.recipients.AddChild().address = test_email;

	message.subject = template.subject;
	message.body = template.text;
	
	message.sender.address = 'st@e-staff.ru';
	message.sender.name = 'E-Staff Information Center';


	client = new SmtpClient;

	client.OpenSession( global_settings.auto_mailing.smtp.server_address );
	//client.OpenSession( 'mail.datex.ru' );
	//client.Authenticate( '', '' );
	client.SendMessage( message );
	client.CloseSession();

	Sleep( 100 );
}

