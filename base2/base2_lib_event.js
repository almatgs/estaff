function open_event_ext( event )
{
	if ( event.allows_ext_open() )
	{
		screen = ObtainDocScreen( event.candidate_id.ForeignObjectUrl );
		screen.Doc.TopElem.handle_event_opened( event );
		return screen;
	}

	return open_event( event );
}


function open_event( event )
{
	return ObtainDocScreen( DefaultDb.GetRecordPrimaryObjectUrl( event ) );
}


function delete_event( event )
{
	if ( event.is_calendar_entry )
	{
		entry = GetOptForeignElem( calendar_entries, event.id );
		lib_calendar.delete_calendar_entry( entry );
	}
	else
	{
		DeleteDoc( DefaultDb.GetRecordPrimaryObjectUrl( event ) );
	}

	event.on_ui_delete();
}


function build_state_id( eventTypeID, occurrenceID )
{
	return eventTypeID + ( occurrenceID != '' ? ':' + occurrenceID : '' );
}


function get_event_id_from_state_id( stateID )
{
	if ( StrContains( stateID, ':' ) )
		return StrScan( stateID, '%s:%s' )[0];
	else
		return stateID;
}


function get_occurrence_id_from_state_id( stateID )
{
	if ( StrContains( stateID, ':' ) )
		return StrScan( stateID, '%s:%s' )[1];
	else
		return '';
}


function IsExtraResultOccurrence( eventType, occurrenceID )
{
	if ( ! eventType.has_occurrence( occurrenceID ) )
		return false;

	if ( occurrenceID == '' || occurrenceID == 'scheduled' || occurrenceID == 'cancelled' )
		return false;

	return true;
}


function BuildObjectStateName( eventTypeID, occurrenceID )
{
	eventType = GetForeignElem( event_types, eventTypeID );
	occurrence = eventType.get_occurrence( occurrenceID );

	return BuildOccurrenceStateName( eventType, occurrence );
}


function BuildOccurrenceStateName( eventType, occurrence )
{
	if ( occurrence.state_name.HasValue )
		return occurrence.state_name;

	return GetOccurrenceStdStateName( eventType, occurrence );
}


function BuildOccurrenceObjectStateName( eventType, occurrence, objectTypeID )
{
	if ( occurrence.state_name.HasValue )
		return occurrence.state_name;

	str = eventType.name;
			
	if ( occurrence.id == '' )
		return eventType.name;

	occurrenceName = occurrence.get_name();

	array = ArraySelect( lib_voc.get_sorted_voc( event_types ), 'This.id != eventType.id && This.target_object_type_id.ByValueExists( objectTypeID ) && ArrayOptFind( This.occurrences, \'get_name() == occurrenceName\' ) != undefined' );
	if ( array.length == 0 )
		return occurrenceName;
	
	return GetOccurrenceStdStateName( eventType, occurrence );
}


function GetOccurrenceStdName( eventType, occurrence )
{
	if ( occurrence.id == '' )
	{
		if ( occurrence.OptParent != undefined && ArrayOptFind( occurrence.Parent, 'id.HasValue' ) == undefined )
			return '[' + UiText.titles.default_state + ']';

		if ( eventType.use_end_date && eventType.has_long_duration )
			return UiText.titles.started;
		else
			return UiText.titles.took_place;
	}

	if ( ( elem = base2_common.event_occurrences.GetOptChildByKey( occurrence.id ) ) != undefined )
		return elem.name;

	return '';
}


function GetOccurrenceStdStateName( eventType, occurrence )
{
	str = eventType.name;
			
	if ( occurrence.id != '' )
		str += ' - ' + occurrence.get_name();

	return str;
}


function build_state_bk_color( eventType, occurrenceID )
{
	if ( occurrenceID == '' )
		return eventType.bk_color;

	occurrence = eventType.occurrences.Child( occurrenceID );
	if ( occurrence.text_color != '' )
		return occurrence.bk_color;

	return GetForeignElem( base2_common.event_occurrences, occurrenceID ).bk_color;
}


function build_dyn_state_bk_color( state, date, endDate )
{
	expirationStateID = build_expiration_state_id( state.event_type_id.ForeignElem, state.event_occurrence_id, date, endDate );
	if ( expirationStateID != '' )
		return GetForeignElem( base2_common.event_expiration_states, expirationStateID ).bk_color;

	return state.bk_color;
}


function build_dyn_occurrence_bk_color( eventType, occurrenceID, date, endDate )
{
	expirationStateID = build_expiration_state_id( eventType, occurrenceID, date, endDate );
	if ( expirationStateID != '' )
		return GetForeignElem( base2_common.event_expiration_states, expirationStateID ).bk_color;

	occurrence = eventType.get_opt_occurrence( occurrenceID );
	if ( occurrence == undefined )
		return '';

	return occurrence.get_bk_color();
}


function build_expiration_state_id( eventType, occurrenceID, date, endDate )
{
	if ( occurrenceID == 'scheduled' )
	{
		//if ( reqEndDate == null )
			//return 'completed';

		if ( date > CurDate || date == null )
			return 'scheduled';

		if ( DateToRawSeconds( CurDate ) - DateToRawSeconds( date ) <= 15 * 60 )
			return 'reached';
		else
			return 'expired';
	}
	
	if ( ! eventType.has_long_duration || endDate == null )
		return '';

	if ( ! lib_event.occurrence_requires_completion( eventType, occurrenceID ) )
		return '';

	if ( endDate > CurDate )
		return '';

	if ( DateNewTime( CurDate ) == DateNewTime( endDate ) )
		return 'end_reached';
	else
		return 'end_expired';
}


function occurrence_requires_completion( eventType, occurrenceID )
{
	if ( occurrenceID == 'scheduled' )
		return true;

	if ( occurrenceID == 'started' )
		return true;

	if ( occurrenceID == '' && eventType.has_occurrence( 'succeeded' ) )
	{
		if ( AppModuleUsed( 'module_sanofi' ) && eventType.has_occurrence( 'scheduled' ) )
			return false;

		return true;
	}

	return false;
}


function IsRejectOccurrence( eventType, occurrenceID )
{
	return eventType.id == 'reject' || ( occurrenceID == 'failed' && eventType.has_occurrence( 'withdrawn'  ) );
}


function IsWithdrawalOccurrence( eventType, occurrenceID )
{
	return eventType.id == 'self_reject' || occurrenceID == 'withdrawn';
}


function bk_color_reached()
{
	GetForeignElem( base2_common.event_expiration_states, 'reached' ).bk_color;
}


function bk_color_expired()
{
	GetForeignElem( base2_common.event_expiration_states, 'expired' ).bk_color;
}


function build_object_sorted_event_types( object )
{
	objectTypeID = object.Name;
	recruitTypeID = undefined;

	array = lib_voc.get_sorted_voc( event_types );
	array = ArraySelect( array, 'target_object_type_id.ByValueExists( ' + CodeLiteral( objectTypeID ) + ' )' );

	array = ArraySelect( array, '! target_group_id.HasValue || target_group_id.ByValueExists( ' + CodeLiteral( lib_user.active_user_info.main_group_id ) + ' )' );

	if ( lib_app2.AppFeatureEnabled( 'classic_recruit' ) && lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
	{
		recruitTypeID = '';

		if ( object.recruit_type_id.HasValue )
			recruitTypeID = object.recruit_type_id;
		else if ( lib_user.active_user_info.main_group_id.ForeignElem.recruit_type_id.HasValue )
			recruitTypeID = lib_user.active_user_info.main_group_id.ForeignElem.recruit_type_id;

		if ( recruitTypeID != '' )
			array = ArraySelect( array, '! ChildExists( \'target_recruit_type_id\' ) || ! target_recruit_type_id.HasValue || target_recruit_type_id.ByValueExists( ' + CodeLiteral( recruitTypeID ) + ' )' );
	}

	return array;
}


function CheckOccurrencePermission( eventType, occurrence )
{
	if ( occurrence.restrict_by_access_role && ! occurrence.allowed_multi_access_role_id.ByValueExists( lib_user.active_user_info.access_role_id ) )
		throw UiError( UiText.errors.set_state_prohibited );
}


function check_event_comment( eventData, state )
{
	if ( state != undefined && state.require_comment )
	{
		if ( eventData.comment == '' )
		{
			lib_base.show_error_message( ActiveScreen, UiText.errors.comment_not_specified );
			Cancel();
		}

		if ( state.min_comment_len.HasValue && StrLen( Trim( eventData.comment ) ) < state.min_comment_len )
		{
			lib_base.show_error_message( ActiveScreen, UiText.errors.comment_too_short );
			Cancel();
		}
	}
}


function update_object_states_by_event_types( objectTypeID )
{
	destVoc = eval( objectTypeID + '_states' );

	statesArray = new Array;

	for ( eventType in event_types )
	{
		if ( ! eventType.is_active )
			continue;

		if ( ! eventType.is_state )
			continue;

		if ( ! eventType.target_object_type_id.ByValueExists( objectTypeID ) )
			continue;
		
		eventType.UpdateOccurrences();

		j = 0;

		for ( occurrence in eventType.get_sorted_occurrences() )
		{
			occurrenceID = occurrence.id;

			stateID = build_state_id( eventType.id, occurrenceID );
			statesArray[statesArray.length] = stateID;

			state = ArrayOptFindByKey( destVoc, stateID );
			if ( state != undefined )
				stateDoc = DefaultDb.OpenObjectDoc( destVoc.ObjectName, stateID );
			else
				stateDoc = DefaultDb.OpenNewObjectDoc( destVoc.ObjectName, stateID );

			stateDoc.TopElem.AssignElem( occurrence );
			stateDoc.TopElem.id = stateID;

			stateDoc.TopElem.event_type_id = eventType.id;
			stateDoc.TopElem.event_occurrence_id = occurrence.id;
			
			//stateDoc.TopElem.name = lib_event.BuildOccurrenceStateName( eventType, occurrence );
			stateDoc.TopElem.name = lib_event.BuildOccurrenceObjectStateName( eventType, occurrence, objectTypeID );

			stateDoc.TopElem.text_color = occurrence.get_text_color();
			if ( ! stateDoc.TopElem.text_color.HasValue )
				stateDoc.TopElem.text_color = eventType.text_color;

			stateDoc.TopElem.bk_color = occurrence.get_bk_color();
			if ( ! stateDoc.TopElem.bk_color.HasValue )
				stateDoc.TopElem.bk_color = eventType.bk_color;

			stateDoc.TopElem.is_std = eventType.is_std;

			if ( eventType.order_index.HasValue )
				stateDoc.TopElem.order_index = eventType.order_index * 10 + j;

			//DebugMsg( stateID  + '  ' + stateDoc.TopElem.order_index );

			lib_voc.get_voc_info( destVoc ).registered_std_elem_id.ObtainByValue( stateID );

			//alert( stateID );

			j++;

			elem = ArrayOptFindByKey( destVoc, stateDoc.TopElem.id );
			if ( elem != undefined && lib_voc.voc_elem_equal_std_elem( lib_voc.get_voc_info( destVoc ), elem, stateDoc.TopElem ) && elem.order_index == stateDoc.TopElem.order_index )
				continue;

			//lib_voc.init_voc_std_elem( destVoc, stateDoc.TopElem );

			stateDoc.Save();
		}
	}

	for ( state in ArraySelectAll( destVoc ) )
	{
		if ( state.id == 'new' || state.id == 'unused' )
			continue;

		if ( ArrayOptFind( statesArray, 'This == ' + CodeLiteral( state.id ) ) == undefined )
			DefaultDb.DeleteObjectDoc( destVoc.ObjectName, state.id );
	}
}


function EventTypeHasStdComplianceProblems( eventType, stdEventType )
{
	if ( stdEventType.has_occurrence( '' ) && ! eventType.has_occurrence( '' ) )
	{
		return true;
	}

	//DebugMsg( eventType.id );
	return false;
}


function EnforceEventTypeStdCompliance( eventType, stdEventType )
{
	if ( stdEventType.has_occurrence( '' ) && ! eventType.has_occurrence( '' ) )
	{
		eventType.occurrences.ObtainChildByKey( '' ).AssignElem( stdEventType.get_opt_occurrence( '' ) );
		return true;
	}

	//DebugMsg( eventType.id );
	return false;
}


function LoadEventParticipantsFromTrainingGroup( event )
{
	trainingGroupDoc = OpenDoc( event.training_group_id.ForeignObjectUrl );
	trainingGroup = trainingGroupDoc.TopElem;

	for ( srcParticipant in trainingGroup.participants )
	{
		partcipant = event.participants.ObtainChildByKey( srcParticipant.person_id );
	}

	event.Doc.SetChanged( true );
}


function RunEventParticipantsObjectAction( event, actionID )
{
	participants = event.participants;

	grid = event.Doc.Screen.FindOptItem( 'ParticipantsGrid' );
	if ( grid != undefined && grid.HasSel )
		participants = ArrayExtract( grid.SelRows, 'Env._participant' );

	action = GetForeignElem( object_actions, actionID );

	if ( action.object_type_id.HasValue && action.object_type_id != 'candidate' )
		throw UiError( UiText.errors.action_not_available_for_this_list );

	if ( ArrayCount( participants ) == 0 )
		throw UiError( UiText.titles.list_empty );
	
	if ( action.code.HasValue )
	{
		for ( participant in participants )
		{
			with ( participant.person )
			{
				eval( action.code );
			}
		}

		return;
	}

	if ( action.object_type_id.HasValue )
	{
		objectIDsArray = ArrayExtract( ArraySelect( participants, 'This.person != undefined' ), 'person.id' );
		if ( ArrayCount( objectIDsArray ) == 0 )
			return;

		lib = eval( action.lib_name );

		if ( action.mass_method_name.HasValue )
		{
			CallObjectMethod( lib, action.mass_method_name, [objectIDsArray, list] );
		}
		else
		{
			for ( objectID in objectIDsArray )
			{
				CallObjectMethod( lib, action.method_name, [objectID] );
			}
		}
	}
	else
	{
		objectUrlsArray = ArrayExtract( ArraySelect( participants, 'This.person != undefined' ), 'person.PrimaryObjectUrl' );
		if ( ArrayCount( objectUrlsArray ) == 0 )
			return;

		lib = eval( action.lib_name );

		if ( action.mass_method_name.HasValue )
		{
			CallObjectMethod( lib, action.mass_method_name, [objectUrlsArray, grid] );
		}
		else
		{
			for ( objectUrl in objectUrlsArray )
			{
				CallObjectMethod( lib, action.method_name, [objectUrl] );
			}
		}
	}

	if ( ! action.is_passive )
		event.Screen.Update();
}



function end_date_checker_task()
{
	typesArray = ArraySelect( event_types, 'is_active && has_long_duration && create_end_reach_notification' );
	if ( ArrayCount( typesArray ) == 0 )
		return;

	minEndDate = DateOffset( DateNewTime( CurDate ), 0 - 7 * 86400 );
	maxEndDate = DateNewTime( CurDate );

	query = 'for $elem in events where $elem/end_date >= ' + XQueryLiteral( minEndDate ) + ' and $elem/end_date <= ' + XQueryLiteral( maxEndDate );

	query += ' and MatchSome( $elem/type_id, ( ' + ArrayMerge( typesArray, 'XQueryLiteral( id )', ', ' ) + ' ) )';

	query += ' return $elem';

	//alert( query );

	array = XQuery( query );

	for ( event in array )
	{
		lib_notif.create_notification( UiText.titles.end_date_reach + ': ' + event.state_name, event.candidate_id.ForeignElem, {event:event, vacancy_id:event.vacancy_id,cascade_seconds:(86400)} );
	}
}


function RunAgentEventAutoCreator()
{
	for ( eventType in ArraySelect( event_types, 'is_active && use_auto_create' ) )
		CheckEventAutoCreateForEventType( eventType );
}


function CheckEventAutoCreateForEventType( eventType )
{
	if ( ! eventType.auto_create.condition.candidate_state_id.HasValue )
		return;

	if ( ! eventType.auto_create.condition.offset_base.HasValue )
		return;

	if ( ! eventType.auto_create.condition.offset.length.HasValue )
		return;

	queryStr = 'for $elem in candidates where $elem/state_id = ' + XQueryLiteral( eventType.auto_create.condition.candidate_state_id );
	
	if ( eventType.auto_create.condition.is_negative_offset )
		date = lib_base.get_term_date_offset( CurDate, eventType.auto_create.condition.offset );
	else
		date = lib_base.get_term_date_neg_offset( CurDate, eventType.auto_create.condition.offset );

	maxDate = DateNewTime( date );
	minDate = DateOffset( maxDate, 0 - 7 * 86400 );
	
	queryStr += ' and $elem/' + eventType.auto_create.condition.offset_base + ' >= ' + XQueryLiteral( minDate );
	queryStr += ' and $elem/' + eventType.auto_create.condition.offset_base + ' <= ' + XQueryLiteral( maxDate );

	queryStr += ' return $elem/Fields( "id","main_vacancy_id","user_id" )';

	candidatesArray = XQuery( queryStr );
	
	if ( eventType.target_group_id.HasValue )
		candidatesArray = ArraySelect( candidatesArray, 'eventType.target_group_id.ByValueExists( This.group_id )' );
	else
		candidatesArray = ArraySelectAll( candidatesArray )
	
	if ( ArrayCount( candidatesArray ) == 0 )
		return;

	queryStr = 'for $elem in events where $elem/type_id = ' + XQueryLiteral( eventType.id );
	queryStr += ' and $elem/date > ' + XQueryLiteral( DateOffset( CurDate, 0 - 30 * 86400 ) );
	queryStr += ' and MatchSome( $elem/candidate_id, ( ' + ArrayMerge( candidatesArray, 'id.XQueryLiteral', ',' ) + ' ) )';
	queryStr += ' return $elem/Fields( "id","candidate_id","vacancy_id" )';

	eventsArray = XQuery( queryStr );
	eventsArray = ArraySort( eventsArray, 'candidate_id', '+' );

	for ( candidate in candidatesArray )
	{
		//if ( ArrayOptFindBySortedKey( eventsArray, candidate.id, 'candidate_id' ) != undefined )
			//continue;

		eventsArray2 = ArraySelectByKey( eventsArray, candidate.id, 'candidate_id' );
		if ( eventsArray2.length != 0 )
			continue;

		stateEventsArray = ArraySelect( eventsArray2, 'type.is_state' );
		if ( ArrayCount( stateEventsArray ) != 0 )
			stateEvent = ArrayMax( stateEventsArray, 'state_date' );
		else
			stateEvent = undefined;

		candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', candidate.id );
		candidate = candidateDoc.TopElem;

		eventData = new Object;
		eventData.occurrence_id = eventType.auto_create.occurrence_id;
		eventData.vacancy_id = ( stateEvent != undefined && stateEvent.vacancy_id.HasValue ? stateEvent.vacancy_id : candidate.main_vacancy_id );
		eventData.user_id = candidate.user_id;

		if ( eventType.auto_create.create_reminder )
			eventData.reminder_date = DateNewTime( CurDate );

		lib_candidate.AddCandidateEvent( candidate, eventType.id, eventData, {isSilent:true} );
		if ( candidateDoc.IsChanged )
			candidateDoc.Save();

		/*eventDoc = DefaultDb.OpenNewObjectDoc( eventType.get_object_name() );
		eventDoc.TopElem.type_id = eventType.id;
		eventDoc.TopElem.date = CurDate;
		eventDoc.TopElem.candidate_id = candidate.id;
		eventDoc.TopElem.vacancy_id = candidate.main_vacancy_id;
		eventDoc.TopElem.reminder_date = DateNewTime( date );

		eventDoc.Save();
		eventDoc.TopElem.on_ui_save();*/
	}
}

