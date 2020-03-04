function Init()
{
	if ( System.IsWebClient )
		return;

	if ( local_settings.use_reminder )
		StartTask();
}


function OnReminderLocalSettingsChanged()
{
	if ( System.IsWebClient )
		return;

	if ( local_settings.use_reminder )
	{
		if ( this.task == undefined )
			StartTask();

		this.entriesBuildDate = null;
	}
	else
	{
		if ( this.task != undefined )
			KillTask();
	}
}


function OnEventChanged( event )
{
	if ( ! LdsIsClient || System.IsWebClient )
		return;

	if ( ! local_settings.use_reminder )
		return;
	
	this.entriesBuildDate = null;
}


function StartTask()
{
	this.task = new Thread;
	this.task.EvalCode( 'lib_reminder.TaskProc()' );
}


function KillTask()
{
	this.task.Kill();
	this.task = undefined;
}


function TaskProc()
{
	while ( true )
	{
		if ( EvalSync( 'this.entriesBuildDate < DateOffset( CurDate, 0 - 30 * 60 )' ) )
			BuildEntries();

		if ( reminderPoints.ChildNum != 0 && CurDate >= reminderPoints[0].date )
		{
			reminderPoints[0].Delete();
			EvalAsync( 'lib_reminder.ShowReminder( false )' );
		}
		else if ( hasDateOnlyReminders && reminderSettings.use_date_only_reminder_events && reminderSettings.date_only_reminder_minute_interval > 0 && lastDateOnlyReminderDate < DateOffset( CurDate, - reminderSettings.date_only_reminder_minute_interval * 60 ) )
		{
			lastDateOnlyReminderDate = CurDate;
			EvalAsync( 'lib_reminder.ShowReminder( true )' );
		}

		Sleep( 10000 );
	}
}


function BuildEntries()
{
	//DebugMsg( 'BuildEntries()' );
	
	EvalSync( 'BuildEntriesStart()' );

	reminderPoints.Clear();
	tempEntries = new Array;
	
	if ( this.reminderSettings.use_calendar_entries )
		BuildCalendarEntries( tempEntries );
	
	if ( this.reminderSettings.use_reminder_events )
		BuildReminderEvents( tempEntries );

	tempEntries = ArraySort( tempEntries, 'date', '+' );
	EvalSync( 'PushTempEntries( tempEntries )' );

	reminderPoints.Sort( 'date', '+' );
	prevPoint = undefined;
	for ( point in ArraySelectAll( reminderPoints ) )
	{
		if ( prevPoint != undefined && DateDiff( point, prevPoint.date ) < 60 )
			point.Delete();
	}
}


function BuildEntriesStart()
{
	this.reminderSettings = local_settings.reminder.Clone();
	this.entriesBuildDate = CurDate;
}


function BuildCalendarEntries( tempEntries )
{
	curDate = CurDate;

	queryStr = 'for $elem in calendar_entries';
	queryStr += ' where $elem/date >= ' + XQueryLiteral( DateNewTime( curDate ) ) + ' and $elem/date <= ' + XQueryLiteral( DateNewTime( curDate, 23, 59, 59 ) );
			
	if ( LdsCurUserID != null )
		queryStr += ' and $elem/user_id = ' + LdsCurUserID;

	queryStr += ' return $elem/Fields( "id","is_derived","is_calendar_entry","date","end_date","type_id","occurrence_id","state_name","user_id","group_id","candidate_id","contacts_desc","vacancy_id","state_text_color" )';

	array = XQuery( queryStr );

	for ( event in array )
	{
		if ( event.occurrence_id != 'scheduled' && event.date < CurDate && event.end_date < CurDate )
			continue;

		entry = CreateElemByFormElem( entries.FormElem[0] );
		entry.event = event;
		entry.date = event.date;
		entry.name = event.type.name;
		entry.isCalendarEntry = true;

		tempEntries.push( entry );

		RegisterReminderPoint( DateOffset( entry.date, 0 - reminderSettings.calendar_entry_minute_offset * 60 ) );
		if ( reminderSettings.calendar_entry_extra_minute_offset.HasValue )
			RegisterReminderPoint( DateOffset( entry.date, 0 - reminderSettings.calendar_entry_extra_minute_offset * 60 ) );
	}
}


function BuildReminderEvents( tempEntries )
{
	curDate = CurDate;

	queryStr = 'for $elem in events';
	queryStr += ' where $elem/reminder_date >= ' + XQueryLiteral( DateOffset( DateNewTime( curDate ), 0 - 2 * 86400 ) );
	queryStr += ' and $elem/reminder_date <= ' + XQueryLiteral( DateNewTime( curDate, 23, 59, 59 ) );

	if ( LdsCurUserID != null )
		queryStr += ' and $elem/user_id = ' + LdsCurUserID;

	queryStr += ' return $elem/Fields( "id","is_derived","is_calendar_entry","date","end_date","type_id","occurrence_id","state_name","user_id","group_id","candidate_id","contacts_desc","vacancy_id","state_text_color","reminder_date","is_exact_time_reminder" )';

	array = XQuery( queryStr );

	hasDateOnlyReminders = false;

	for ( event in array )
	{
		entry = CreateElemByFormElem( entries.FormElem[0] );
		entry.event = event;
		entry.date = event.reminder_date;
		entry.name = event.type.name;

		tempEntries.push( entry );

		if ( Hour( entry.date ) > 0 && entry.date >= CurDate )
		{
			RegisterReminderPoint( DateOffset( entry.date, 0 - reminderSettings.reminder_event_minute_offset * 60 ) );
			if ( reminderSettings.reminder_event_extra_minute_offset.HasValue )
				RegisterReminderPoint( DateOffset( entry.date, 0 - reminderSettings.reminder_event_extra_minute_offset * 60 ) );
		}
		else
		{
			hasDateOnlyReminders = true;
		}
	}
}


function RegisterReminderPoint( date )
{
	if ( date < DateOffset( CurDate, 0 - 59 ) )
		return;

	reminderPoints.ObtainChildByKey( date );
}


function PushTempEntries( tempEntries )
{
	entries.Clear();

	for ( tempEntry in tempEntries )
		entries.AddChildElem( tempEntry );
}


function ShowReminder( isDateOnlyReminder )
{
	if ( isDateOnlyReminder )
	{
		doc = FetchDoc( 'base2_view_reminder.xml?date_only=1' );
		doc.TopElem.isDateOnlyReminder = true;

		ActiveScreen.Navigate( doc.Url, 'FrameReminderDateOnly', true );
	}
	else
	{
		doc = FetchDoc( 'base2_view_reminder.xml' );
		ActiveScreen.Navigate( doc.Url, 'FrameReminder', true );
	}
}


function check_reminder()
{
	Cancel();
}



function RunAgentAutoReminder()
{
	autoRemindersArray = lib_voc.get_sorted_voc( auto_reminders );
	if ( ArrayCount( autoRemindersArray ) == 0 )
		return;

	lastRunDate = task_results.GetTaskLastRunDate( 'auto_reminder' );
	if ( lastRunDate == null )
		lastRunDate = DateOffset( CurDate, - 12 * 3600 );

	runDate = CurDate;

	for ( autoReminder in autoRemindersArray )
		RunAutoReminder( autoReminder, runDate, lastRunDate );

	task_results.SetTaskLastRunDate( 'auto_reminder', runDate );
}


function RunAutoReminder( autoReminder, runDate, lastRunDate )
{
	if ( ! autoReminder.multi_event_type_id.HasValue )
		return;

	if ( ( ! autoReminder.send_email || ! autoReminder.mail_template_id.HasValue ) && ( ! autoReminder.send_sms || ! autoReminder.sms_template_id.HasValue ) )
		return;

	queryStr = 'for $elem in calendar_entries where MatchSome( $elem/type_id, (' + ArrayMerge( autoReminder.multi_event_type_id, 'This.XQueryLiteral', ',' ) + ') )';
	queryStr += ' and $elem/date > ' + XQueryLiteral( runDate );
	queryStr += ' and $elem/occurrence_id = \'scheduled\'';
	queryStr += ' return $elem';

	eventsArray = XQuery( queryStr );

	for ( event in eventsArray )
	{
		if ( EventMatchesAutoReminder( event, autoReminder, runDate ) )
		{
			if ( EventMatchesAutoReminder( event, autoReminder, lastRunDate ) )
			{
				continue;
			}

			SendEventReminder( event, autoReminder );
		}
	}
}


function EventMatchesAutoReminder( event, autoReminder, runDate )
{
	if ( autoReminder.use_morning_rule && autoReminder.morning_end_time.hour.HasValue && GetDateDayMunute( event.date ) < autoReminder.morning_end_time.day_minute )
	{
		if ( lib_base.get_date_days_diff( DateNewTime( event.date ), DateNewTime( runDate ) ) != 1 )
			return false;

		return ( GetDateDayMunute( runDate ) >= autoReminder.prev_day_fixed_time.day_minute );
	}
	
	if ( autoReminder.use_fixed_time )
	{
		if ( ! autoReminder.fixed_time.hour.HasValue )
			return false;

		if ( DateNewTime( event.date ) != DateNewTime( runDate ) )
			return false;

		return ( GetDateDayMunute( runDate ) >= autoReminder.fixed_time.day_minute );
	}
	else
	{
		if ( ! autoReminder.interval.length.HasValue )
			return;

		return ( lib_base.get_term_date_offset( runDate, autoReminder.interval ) >= event.date );
	}
}


function GetDateDayMunute( date )
{
	return Hour( date ) * 60 + Minute( date );
}


function SendEventReminder( event, autoReminder )
{
	candidate = event.candidate_id.ForeignElem;

	if ( autoReminder.send_email && autoReminder.mail_template_id.HasValue )
	{
		if ( ! candidate.email.HasValue )
			return;

		otherEnv = candidate.build_mail_env_object( event.vacancy_id );
		otherEnv.event = event;

		mailMessage = lib_mail.build_mail_message( autoReminder.mail_template_id.ForeignElem, candidate.email, candidate, otherEnv );
		lib_mail.send_mail_message( mailMessage );
	}
	
	if ( autoReminder.send_sms && autoReminder.sms_template_id.HasValue )
	{
		if ( ! candidate.mobile_phone.HasValue )
			return;

		otherEnv = candidate.build_mail_env_object( event.vacancy_id );
		otherEnv.event = event;

		mailMessage = lib_sms.build_sms_message( autoReminder.sms_template_id.ForeignElem, candidate.mobile_phone, candidate, otherEnv );
		lib_sms.send_sms_message( mailMessage );
	}
}