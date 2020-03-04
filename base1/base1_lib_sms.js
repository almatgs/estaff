function create_sms_message()
{
	message = new Object;
	return message;
}


function build_default_env( recipientData )
{
	if ( recipientData.IsTopElem && recipientData.Name == 'candidate' )
		envObject = recipientData.build_mail_env_object( recipientData.main_vacancy_id );
	else
		envObject = new Object();

	if ( recipientData.IsTopElem )
		envObject.AddProperty( recipientData.Name, recipientData );

	return envObject;
}


function build_sms_message( template, phone, recipientData, envObject )
{
	if ( envObject == undefined )
		envObject = new Object();

	message = create_sms_message();
			
	if ( phone != '' )
		message.dest_phone = phone;
	else if ( template.dest_type == 'fixed_phone' && template.phone != '' )
		message.dest_phone = template.phone;

	with ( recipientData )
	{
		with ( envObject )
		{
			try
			{
				message.text = EvalCodePage( template.text, true );
			}
			catch ( e )
			{
				throw UserError( UiText.errors.eval_sms_template_failed + '\r\n', e );
			}
		}
	}

	return message;
}



function show_sms_message( message )
{
	//check_auto_mailing_settings();
	adjust_message_recipients( message );

	return show_native_sms_message( message );
}


function send_sms_message( message, options )
{
	adjust_message_recipients( message );

	if ( options == undefined )
		options = new Object();

	//check_auto_mailing_settings();

	runner = new MethodRunner( lib_sms, 'send_sms_message_core' );
	runner.SetArguments( message, options.GetOptProperty( 'GateID' ) );
	runner.RunOnServer = true;//global_settings.auto_mailing.run_on_server;
	runner.RunAsync = false;//options.GetOptProperty( 'RunAsync', runner.RunAsync );
	//runner.ErrorLogName = 'mass-mail';

	runner.Run();
}


function send_sms_message_core( message, gateID )
{
	if ( gateID == undefined )
	{
		libUrl = AppServerConfig.GetOptProperty( 'sms-provider-lib-url' );
		if ( libUrl != undefined )
		{
			lib = OpenCodeLib( libUrl );
			LogEvent( 'sms', message.dest_phone + '\t' + UnifySpaces( message.text ) );
			lib.send_sms_message( message );
			LogEvent( 'sms', 'DONE' );
			return;
		}

		gate = find_sms_gate( message.dest_phone );
	}
	else
	{
		gate = GetForeignElem( sms_gates, gateID );
	}

	if ( ! gate.send_code.HasValue )
		throw UiError( "Sending code is not specified" );

	eval( gate.send_code );
}


function send_test_sms_message( phone, gate )
{
	message = create_sms_message();

	message.dest_phone = phone;
	message.text = 'Test message';

	send_sms_message( message, {GateID:RValue( gate.id )} );
}



function show_native_sms_message( message )
{
	msgText = UiText.messages.sms_message_will_be_sent;
	msgText += '\r\n';

	msgText += '\r\n' + UiText.titles.recipient + ': ' + message.dest_phone;
	msgText += '\r\n' + UiText.titles.text + ':\r\n' + message.text;

	if ( ! lib_base.ask_question( ActiveScreen, msgText ) )
		return false;
	
	send_sms_message( message );
}


function adjust_message_recipients( message )
{
	if ( message.dest_phone == '' )
		throw UiError( 'Empty phone number' );

	message.dest_phone = lib_phone_details.PhoneToGlobalPhone( message.dest_phone );
}


function find_sms_gate( phone )
{
	return ArrayFirstElem( lib_voc.get_sorted_voc( sms_gates ) );
}



function handle_send_mass_sms( objectUrlsArray )
{
	//check_auto_mailing_settings();

	templateID = lib_voc.select_voc_elem( sms_templates );

	send_mass_sms( objectUrlsArray, templateID );
}


function send_mass_sms( objectUrlsArray, templateID )
{
	//check_auto_mailing_settings();

	templateDoc = DefaultDb.OpenObjectDoc( 'sms_template', templateID );
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

		if ( object.mobile_phone == '' )
			continue;
	
		//if ( ! IsValidEmail( object.email ) )
			//continue;

		envObject = build_default_env( object );
		//envObject.isMassMail = true;
		
		message = build_sms_message( template, object.mobile_phone, object, envObject );
		//adjust_message_sender( message );

		if ( count == 0 )
		{
			dlgDoc = OpenDoc( 'base1_dlg_mass_sms.xml' );
			dlg = dlgDoc.TopElem;

			dlg.target_type = object.Name;
			dlg.sample_message.text = message.text;
			dlg.count = ArrayCount( objectUrlsArray );
			ActiveScreen.ModalDlg( dlgDoc );
		}
		
		send_sms_message( message );

		//LogEvent( 'mail_trans', 'SENT: ' + object.email );


		lib_base.RegisterSmsSending( template, object );

		if ( count == 0 )
			StartModalTask( UiText.messages.mass_mail + '...' );

		//Sleep( global_settings.auto_mailing.smtp.delay );
		count++;
	}
}