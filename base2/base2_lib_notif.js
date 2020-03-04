function create_notification( subject, object, options )
{
	if ( options == undefined )
		options = new Object();

	notificationDoc = DefaultDb.OpenNewObjectDoc( 'notification' );
	notification = notificationDoc.TopElem;

	notification.date = CurDate;
	notification.subject = subject;

	notification.object_type_id = object.Name;

	if ( notification.ChildExists( object.Name + '_id' ) )
		notification.Child( object.Name + '_id' ).Value = object.id;

	notification.object_state_id = options.GetOptProperty( 'object_state_id', '' );
	if ( ! notification.object_state_id.HasValue && object.ChildExists( 'state_id' ) )
		notification.object_state_id = object.state_id;

	notification.custom_action_id = options.GetOptProperty( 'custom_action_id', '' );

	event = options.GetOptProperty( 'event' );
	if ( event != undefined )
		notification.event_end_date = event.end_date;

	notification.vacancy_id = options.GetOptProperty( 'vacancy_id', null );
	if ( ! notification.vacancy_id.HasValue && object.Name == 'vacancy' )
		notification.vacancy_id = object.id;

	notification.user_id = options.GetOptProperty( 'user_id', null );
	if ( ! notification.user_id.HasValue )
		notification.user_id = object.user_id;

	notification.comment = options.GetOptProperty( 'comment', '' );

	if ( ( cascaseSeconds = options.GetOptProperty( 'cascade_seconds' ) ) != undefined )
	{
		query = 'for $elem in notifications where $elem/date >= ' + XQueryLiteral( DateOffset( CurDate, 0 - cascaseSeconds ) );

		query += ' and $elem/subject = ' + XQueryLiteral( notification.subject );

		if ( notification.ChildExists( object.Name + '_id' ) )
			query += 'and $elem/' + object.Name + '_id = ' + XQueryLiteral( notification.Child( object.Name + '_id' ) );

		query += ' and $elem/object_state_id = ' + XQueryLiteral( notification.object_state_id );

		query = query + ' return $elem';
		//alert( query );

		array = XQuery( query );
		if ( ArrayOptFirstElem( array ) != undefined )
			return;
	}
	
	notificationDoc.Save();

	if ( LdsIsClient )
		lib_agent.kick_agent( 'notifications_updater' );

	user = notification.user_id.ForeignElem;
	if ( user.send_email_notif && user.person_id.HasValue && ! options.GetOptProperty( 'skipEmailNotif', false ) )
		send_email_notification( notification, user.person_id.ForeignElem );
}


function send_email_notification( notification, destPerson )
{
	if ( destPerson.email == '' )
		return;

	if ( notification.candidate_id.HasValue )
		envObject = notification.candidate_id.ForeignElem.build_mail_env_object( notification.vacancy_id );
	else
		envObject = new Object;
	
	mailMessage = new MailMessage();
	mailMessage.recipients.AddChild().address = destPerson.email;
	mailMessage.subject = notification.get_subject();

	text = '';

	if ( notification.candidate_id.HasValue )
		text += notification.candidate_id.Title + ': ' + notification.candidate_id.ForeignDispName + '\r\n';

	if ( notification.vacancy_id.HasValue )
		text += notification.vacancy_id.Title + ': ' + notification.vacancy_id.ForeignDispName + '\r\n';

	if ( notification.comment.HasValue )
		text += notification.comment + '\r\n';

	mailMessage.body = text;

	//mailMessage = lib_mail.build_mail_message( template, destPerson.email, destPerson, envObject );
	
	lib_mail.send_mail_message( mailMessage, {RunAsync:true} );
}


function notifications_updater_task()
{
	if ( UseLds && LdsCurUserID == null )
		return;

	query = 'for $elem in notifications where $elem/is_read = false()';

	if ( LdsCurUserID != null )
		query = query + ' and $elem/user_id = ' + LdsCurUserID;

	query = query + ' return $elem';

	array = XQuery( query );

	newCount = ArrayCount( array );

	EvalAsync( 'lib_notif.update_notifications( ' + newCount + ' )' );
}


function update_notifications( newCount )
{
	if ( newCount == unread_notifications_num )
		return;

	unread_notifications_num = newCount;
	MainScreen.Update();
}

