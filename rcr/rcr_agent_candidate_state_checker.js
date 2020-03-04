function RunAgentCandidateStateChecker()
{
	minDate = DateOffset( DateNewTime( CurDate ), 0 - 30 * 86400 );

	queryStr = 'for $elem in candidates where $elem/max_state_date >= ' + XQueryLiteral( minDate ) + ' and $elem/max_state_date <= ' + XQueryLiteral( CurDate );
	//queryStr += ' where MatchSome( $elem/state_id, (' + ArrayMerge( statesArray, 'XQueryLiteral( This )', ',' ) + ' ) )'
	queryStr += ' order by $elem/user_id';
	queryStr += ' return $elem/Fields( "id","is_active","image_url","state_id","state_date","user_id","group_id","fullname","main_vacancy_id" )';

	array = XQuery( queryStr );
	array = ArraySelectAll( array );

	curDate = CurDate;
	curCandidatesArray = undefined;
	curUser = undefined;

	for ( candidate in array )
	{
		state = candidate.state_id.ForeignElem;
		if ( ! state.max_duration.length.HasValue )
			continue;

		dueDate = lib_base.get_term_date_offset( candidate.state_date, state.max_duration );
		if ( dueDate > curDate )
			continue;

		lib_notif.create_notification( UiText.titles.state_overdue + ': ' + candidate.state_id.ForeignDispName, candidate, {object_state_id:candidate.state_id,cascade_seconds:(2*86400)} );

		if ( ! candidate.user_id.HasValue )
		{
			ProcessCandidateWithMaxDurationReachResult( candidate );
			continue;
		}

		if ( curUser != undefined && candidate.user_id != curUser.id )
		{
			ProcessUserCandidates( curUser, curCandidatesArray );
			curUser = undefined;
		}

		if ( curUser == undefined )
		{
			curUser = candidate.user_id.ForeignElem;
			curCandidatesArray = new Array;
		}

		curCandidatesArray.push( candidate );
	}

	if ( curUser != undefined )
		ProcessUserCandidates( curUser, curCandidatesArray );
}


function ProcessUserCandidates( user, candidatesArray )
{
	for ( candidate in candidatesArray )
	{
		ProcessCandidateWithMaxDurationReachResult( candidate );
	}

	//DebugMsg( user.login + '  ' + ArrayMerge( candidatesArray, 'fullname', ',' ) );

	/*destPerson = user.person_id.ForeignElem;
	if ( ! destPerson.email.HasValue )
	{
		LogEvent( '', 'Email is not specified for user ' + user.PrimaryDispName );
		return;
	}

	message = new MailMessage();
	message.recipients.AddChild().address = destPerson.email;
		
	message.subject = 'Внимание: Истекли сроки работы по кандидатам';

	for ( candidate in candidatesArray )
	{
		message.body += candidate.fullname;
		message.body += ': ' + candidate.state_id.ForeignElem.name;
		message.body += ', ' + lib_base.DateOffsetDescription( DateDiff( CurDate, candidate.state_date ) );
		message.body += '\r\n';
	}

	//DebugMsg( message.body );

	lib_mail.send_mail_message( message );*/
}


function ProcessCandidateWithMaxDurationReachResult( candidate )
{
	state = candidate.state_id.ForeignElem;
	if ( ! state.max_duration_reach_result.occurrence_id.HasValue )
		return;

	DebugMsg( candidate.fullname );

	candidateDoc = OpenDoc( candidate.ObjectUrl );
	candidate = candidateDoc.TopElem;

	eventDoc = OpenDoc( candidate.get_state_event().PrimaryObjectUrl );
	event = eventDoc.TopElem;

	if ( event.occurrence_id == state.max_duration_reach_result.occurrence_id )
		return;

	if ( ! event.type.has_occurrence( state.max_duration_reach_result.occurrence_id ) )
		return;

	if ( event.type_id != state.event_type_id )
	{
		LogEvent( '', 'ERROR: candidate state event mismatch: ' + candidate.fullname + ', ' + event.type_id + '/' + state.event_type_id );
		return;
	}

	event.occurrence_id = state.max_duration_reach_result.occurrence_id;
	eventDoc.Save();

	candidate.update_state();
	candidateDoc.Save();

	DebugMsg( 'Done' );
}

