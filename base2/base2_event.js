function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;
}


function OnCheckReadAccess()
{
	if ( AppModuleUsed( 'module_sanofi' ) && LdsCurUser.Name == 'person' )
		return;

	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	if ( AppModuleUsed( 'module_rgs' ) && accessType == 'read' )
	{
		match = OpenCodeLib( '//module_rgs/rgs_lib_rgs.js' ).check_object_custom_access( this, LdsCurUser, 'read' );
		if ( match == true )
			return;
		else if ( match == false )
			Cancel();
	}

	if ( userAccess.prohibit_view_other_user_events && user_id != LdsCurUser.id )
		Cancel();

	if ( userAccess.prohibit_view_other_group_events && ! LdsCurUser.matches_group( group_id ) )
		Cancel();
}


function OnBeforeSave()
{
	//DebugMsg( PrimaryObjectTypeID() + ' ' + Name );
	if ( is_derived && PrimaryObjectTypeID() == Name )
		is_derived = false;

	if ( is_derived )
		return;

	if ( this.Name == 'calendar_entry' && this.date.HasValue && ! this.local_date.HasValue )
	{
		if ( this.time_zone.HasValue )
			this.local_date = DateToTimeZoneDate( this.date, this.time_zone );
		else
			this.local_date = this.date;
	}

	if ( ChildExists( 'vacancy_id' ) && vacancy_id.HasValue )
		vacancy_org_id = vacancy_id.ForeignElem.org_id;

	if ( user_id.HasValue )
		group_id = user_id.ForeignElem.main_group_id;

	contacts_desc = get_contacts_desc();
	update_auto_occurrence();

	//DebugMsg( this.Xml );
}


function OnSave()
{
	if ( is_derived )
		return;

	//if ( ChildExists( 'vacancy_id' ) && vacancy_id.HasValue && ( occurrence.make_candidate_final ) )
		//lib_base.update_dep_object( vacancy_id.ForeignObjectUrl, id.Parent, 'save' );

	if ( ( type.target_object_type_id.ByValueExists( 'org' ) || ! type.target_object_type_id.HasValue ) && org_id.HasValue )
		lib_base.update_dep_object( org_id.ForeignObjectUrl, id.Parent, 'save' );

	/*if ( ChildExists( 'candidate_id' ) && candidate_id.HasValue )
	{
		lib_base.update_dep_object( candidate_id.ForeignObjectUrl, id.Parent, 'save' );
		
		if ( type_id != Doc.LastSavedData.type_id || occurrence_id != Doc.LastSavedData.occurrence_id )
			lib_recruit.handle_candidate_event_saved( id.Parent );
	}*/

	/*if ( ChildExists( 'deal_id' ) && deal_id.HasValue )
	{
		lib_base.update_dep_object( deal_id.ForeignObjectUrl, id.Parent, 'save' );
	}*/
}


function OnDelete()
{
	if ( is_derived )
		return;

	if ( type.target_object_type_id.ByValueExists( 'org' ) && org_id.HasValue )
		lib_base.update_dep_object( org_id.ForeignObjectUrl, id.Parent, 'delete' );

	//if ( ChildExists( 'candidate_id' ) && candidate_id.HasValue )
		//lib_base.update_dep_object( candidate_id.ForeignObjectUrl, id.Parent, 'delete' );

	//if ( ChildExists( 'deal_id' ) && deal_id.HasValue )
		//lib_base.update_dep_object( deal_id.ForeignObjectUrl, id.Parent, 'delete' );
}


function OnCatalogBeforeSave( SrcDoc )
{
	if ( type.register_participants )
	{
		participants.Clear();
	}
}


function on_ui_save()
{
	if ( ChildExists( 'vacancy_id' ) && vacancy_id.HasValue && occurrence.make_candidate_final )
		lib_base.update_ui_dep_object( vacancy_id.ForeignObjectUrl, id.Parent, 'save' );

	//if ( type.target_object_type_id.ByValueExists( 'org' ) && org_id.HasValue )
		//lib_base.update_ui_dep_object( org_id.ForeignObjectUrl, id.Parent, 'save' );

	if ( ChildExists( 'candidate_id' ) && candidate_id.HasValue )
		lib_base.update_ui_dep_object( candidate_id.ForeignObjectUrl, id.Parent, 'save' );

	if ( ChildExists( 'deal_id' ) && deal_id.HasValue )
		lib_base.update_ui_dep_object( deal_id.ForeignObjectUrl, id.Parent, 'save' );

	lib_reminder.OnEventChanged( this );

	if ( type.use_training_program && is_calendar_entry )
		PutParticipantsToTrainingGroup();

	if ( this.Name == 'calendar_entry' )
		this.on_calendar_entry_ui_save();

	view.prev_data.AssignElem( this );
}


function on_ui_delete()
{
	if ( type.target_object_type_id.ByValueExists( 'org' ) && ChildExists( 'org_id' ) && org_id.HasValue )
		lib_base.update_ui_dep_object( org_id.ForeignObjectUrl, id.Parent, 'delete' );

	if ( ChildExists( 'candidate_id' ) && candidate_id.HasValue )
		lib_base.update_ui_dep_object( candidate_id.ForeignObjectUrl, id.Parent, 'delete' );

	if ( ChildExists( 'deal_id' ) && deal_id.HasValue )
		lib_base.update_ui_dep_object( deal_id.ForeignObjectUrl, id.Parent, 'delete' );
}


function PrimaryObjectTypeID()
{
	return type.get_object_name();
}


function init()
{
	if ( ! end_date.HasValue )
	{
		duration.AssignElem( type_id.ForeignElem.default_duration );
		update_end_date_by_duration();
	}
}


function type()
{
	type_id.ForeignElem
}


function occurrence()
{
	oc = type.get_opt_occurrence( occurrence_id );
	if ( oc == undefined )
		oc = CreateElem( 'base2_event_type.xmd', 'event_type.occurrences.occurrence' );

	return oc;
}


function opt_occurrence()
{
	return type.get_opt_occurrence( occurrence_id );
}


function state_date()
{
	if ( occurrence_id == 'scheduled' || ( occurrence_id == 'cancelled' && type.has_occurrence( 'scheduled' ) ) )
		return creation_date;
	else if ( type.has_long_duration && end_date.HasValue )
		return end_date;
	else
		return date;
}


function reminder_disp_target_date()
{
	if ( occurrence_id == 'scheduled' )
		return this.date;

	if ( is_exact_time_reminder || Hour( reminder_date ) != undefined )
		return reminder_date;
	else
		return DateNewTime( reminder_date );
}


function update_local_date_by_date()
{
	if ( ! ChildExists( 'local_date' ) )
		return;

	this.local_date = this.date;
}


function update_end_date_by_duration()
{
	if ( ! duration.length.HasValue || ! date.HasValue )
		return;

	end_date = lib_base.get_term_date_offset( date, duration );
}


function update_duration_by_end_date()
{
	if ( ! end_date.HasValue || ! date.HasValue || end_date < date )
		return;

	duration.set_seconds_num( DateDiff( end_date, date ) );
}


function get_contacts_desc()
{
	eventType = type;
	
	if ( ChildExists( 'candidate_id' ) && candidate_id.HasValue && ( eventType.target_object_type_id.ByValueExists( 'candidate' ) ) )
		return candidate_id.ForeignDispName;

	if ( eventType.register_participants )
		return StrIntZero( participants.ChildNum ) + ' / ' + StrIntZero( max_participants_num );

	return ArrayMerge( participants, 'person_id.ForeignDispName', ', ' );
}


function get_contact_phones_desc()
{
	entryType = type;
	
	if ( ChildExists( 'candidate_id' ) && candidate_id.HasValue && entryType.target_object_type_id.ByValueExists( 'candidate' ) )
		return candidate_id.ForeignElem.disp_phone;

	return ArrayMerge( participants, 'person_id.ForeignElem.disp_phone', ', ' );
}


function state_id()
{
	lib_event.build_state_id( type_id, occurrence_id )
}


function core_event_name()
{
	oc = type.get_opt_occurrence( occurrence_id );
	if ( oc == undefined )
		return type_id.ForeignElem.name + ( occurrence_id.HasValue ? ' — ' + occurrence_id : '' );

	if ( lib_event.IsExtraResultOccurrence( type, occurrence_id ) )
		return type_id.ForeignElem.name;

	if ( occurrence_id == '' && ( type.has_long_duration || ! type.has_occurrence( 'scheduled' ) ) ) 
		return type_id.ForeignElem.name;

	return type_id.ForeignElem.name + ' — ' + StrLowerCase( oc.get_name() );
}


function state_name()
{
	oc = type.get_opt_occurrence( occurrence_id );
	if ( oc == undefined )
		return type_id.ForeignElem.name + ' - ' + occurrence_id;

	return lib_event.BuildOccurrenceStateName( type, oc );
}


function state_text_color()
{
	state = type.get_object_state( occurrence_id );
	if ( state != undefined )
		return state.text_color;

	if ( occurrence_id.HasValue )
	{
		oc = type.get_opt_occurrence( occurrence_id );
		if ( oc != undefined )
			return oc.get_text_color();
	}

	return type.text_color;

}


function expiration_state_id()
{
	lib_event.build_expiration_state_id( type, occurrence_id, date, end_date );
}


function dyn_state_bk_color()
{
	return lib_event.build_dyn_occurrence_bk_color( type, occurrence_id, date, end_date );
}


function select_participant()
{
	regEventType = ArrayOptFind( lib_voc.get_sorted_voc( event_types ), 'is_group_event_reg && group_event_type_id == ' + CodeLiteral( this.type_id ) );
	if ( regEventType != undefined && regEventType.target_object_type_id.ByValueExists( 'candidate' ) )
	{
		candidateID = lib_base.select_object_from_view( 'candidates' );
		personID = candidateID;
	}
	else
	{
		if ( global_settings.is_agency )
			personID = lib_base.select_object_from_view( 'persons_other' );
		else
			personID = lib_base.select_object_from_view( 'persons_own' );
	}

	participants.ObtainChildByKey( personID, 'person_id' );
	Doc.UpdateValues();
}


function update_auto_occurrence()
{
	if ( ! type.is_approval )
		return;

	if ( participants.ChildNum == 0 )
		return;

	for ( participant in participants )
	{
		approvalEntry = approval_entries.GetOptChildByKey( participant.person_id );
		if ( approvalEntry == undefined )
			return;

		if ( ! approvalEntry.is_approved )
		{
			occurrence_id = 'failed';
			return;
		}
	}

	occurrence_id = 'succeeded';
}


function get_backward_occurrences_array()
{
	array = type.get_sorted_occurrences();

	switch ( occurrence_id )
	{
		case '':
		case 'scheduled':
		case 'cancelled':
		case 'started':
			array = ArraySelect( array, 'id == \'scheduled\' || id == occurrence_id' );
			break;

		case 'succeeded':
			array = ArraySelect( array, 'id == \'scheduled\' || id == \'\' || id == \'started\' || id == occurrence_id' );
			break;

		case 'failed':
			array = ArraySelect( array, 'id != \'succeeded\' && id != \'cancelled\'' );
			break;
	}

	return array;
}


function handle_before_ui_save()
{
	if ( AppModuleUsed( 'module_rgs' ) && ( type_id == 'rr_poll_regional' || type_id == 'rr_poll_co' ) && participants.ChildNum == 0 )
		throw UiError( UiText.errors.participants_not_specified );
}


function requires_completion()
{
	if ( occurrence_id == 'scheduled' || occurrence_id == 'waiting_to_start' )
		return true;

	if ( ( occurrence_id == '' || occurrence_id == 'started' ) && type.use_end_date && type.has_long_duration && ( type.has_occurrence( 'finished' ) || type.has_occurrence( 'succeeded' ) ) )
		return true;
	
	return false;
}


function allows_ext_open()
{
	eventType = type;
	
	if ( ChildExists( 'candidate_id' ) && candidate_id.HasValue && eventType.target_object_type_id.ByValueExists( 'candidate' ) )
		return eventType.show_target_object_on_open;

	return false;
}


function use_participants_event_result()
{
	if ( ! lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
		return false;

	if ( ! type.register_participants )
		return false;

	resultEventType = participation_result_event_type();
	if ( resultEventType == undefined )
		return false;

	return true;
}


function participation_result_event_type()
{
	return ArrayOptFind( lib_voc.get_sorted_voc( event_types ), 'is_group_event_result && group_event_type_id == type_id' );
}


function InitParticipantsResults()
{
	participants.DeleteChildren( '! This.person_id.HasValue' );

	queryStr = 'for $elem in persons'
	queryStr += ' where MatchSome( $elem/id, ( ' + ArrayMerge( participants, 'person_id', ',' ) + ') )';
	queryStr += ' return $elem/Fields( "id","fullname","mobile_phone","is_derived","is_candidate" )';

	personsArray = XQuery( queryStr );

	for ( participant in participants )
	{
		participant.person = ArrayOptFindByKey( personsArray, participant.person_id, 'id' );
	}

	if ( use_participants_event_result )
	{
		queryStr = 'for $elem in events'
		queryStr += ' where $elem/group_event_id = ' + id.XQueryLiteral;
		queryStr += ' and $elem/type_id = ' + participation_result_event_type.id.XQueryLiteral;
		queryStr += ' return $elem/Fields( "id","occurrence_id","candidate_id" )';

		resultEventsArray = XQuery( queryStr );

		for ( participant in participants )
		{
			resultEvent = ArrayOptFindByKey( resultEventsArray, participant.person_id, 'candidate_id' );
			if ( resultEvent != undefined )
				participant.result_occurrence_id = resultEvent.occurrence_id;
			else
				participant.result_occurrence_id.Clear();
		}
	}
}


function SetParticipantResultOccurrence( participant, occurrenceID, eventData )
{
	SetParticipantResultOccurrenceCore( participant, occurrenceID, eventData );

	participant.result_occurrence_id = occurrenceID;
	Screen.SaveDoc();
}


function SetParticipantResultOccurrenceCore( participant, occurrenceID, eventData )
{
	queryStr = 'for $elem in events';
	queryStr += ' where $elem/group_event_id = ' + id.XQueryLiteral;
	queryStr += ' and $elem/candidate_id = ' + participant.person_id.XQueryLiteral;
	queryStr += ' and $elem/type_id = ' + participation_result_event_type.id.XQueryLiteral;
	queryStr += ' return $elem/Fields( "id","occurrence_id","is_derived" )';

	resultEvent = ArrayOptFirstElem( XQuery( queryStr ) );
	if ( resultEvent != undefined )
	{
		resultEventDoc = OpenDoc( resultEvent.PrimaryObjectUrl );
		resultEvent = resultEventDoc.TopElem;
		isNew = false;
	}
	else
	{
		resultEventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
		resultEvent = resultEventDoc.TopElem;
		isNew = true;

		resultEvent.type_id = participation_result_event_type.id;
		//resultEvent.person_id = participant.person_id;
		resultEvent.candidate_id = participant.person_id;
		resultEvent.group_event_id = this.id;

		if ( ( global_settings.use_candidate_user_for_event || LdsCurUserID == null ) )
			resultEvent.user_id = resultEvent.candidate_id.ForeignElem.user_id;
	}

	resultEvent.occurrence_id = occurrenceID;
	
	if ( eventData != undefined && eventData.GetOptProperty( 'comment' ) != undefined )
		resultEvent.comment = eventData.comment;

	//if ( DateNewTime( CurDate ) == DateNewTime( this.date ) )
		resultEvent.date = CurDate;
	//else
		//resultEvent.date = this.date;

	resultEventDoc.Save();
	resultEvent.on_ui_save();

	lib_candidate.OnEventOccurrenceChange( resultEvent );
}


function SelectParticipantResultOccurrence( participant )
{
	dlgDoc = OpenDoc( '//base2/base2_dlg_event.xml' );
	dlg = dlgDoc.TopElem;
	dlg.eventType = participation_result_event_type;
	dlg.showComment = true;
	dlg.Init();

	ActiveScreen.ModalDlg( dlgDoc );

	if ( dlg.selectedEventResult == undefined )
		return;

	newOccurrence = dlg.selectedEventResult.occurrence;
	SetParticipantResultOccurrenceCore( participant, newOccurrence.id, {comment:dlg.comment} );

	if ( dlg.selectedEventResult.nextEventType != undefined )
	{
		Sleep( 1 );

		candidateDoc = ObtainUiDoc( ObjectDocUrl( 'data', 'candidate', participant.person_id ) );
		candidate = candidateDoc.TopElem;
		lib_candidate.HandleAddCandidateEvent( candidate, dlg.selectedEventResult.nextEventType.id, {occurrence_id:dlg.selectedEventResult.nextEventOccurrence.id,vacancy_id:vacancy_id}, {isNextEvent:true} );
		UpdateUiDoc( candidateDoc );
	}

	participant.result_occurrence_id = newOccurrence.id;
	Screen.SaveDoc();
}


function HandleSetParticipantTypicalNextState( participationOccurrence, typicalNextState )
{
	nextEventType = typicalNextState.event_type_id.ForeignElem;
	nextEventOccurrence = nextEventType.get_opt_occurrence( typicalNextState.event_occurrence_id );
	if ( nextEventOccurrence != undefined )
		nextStateName = StrTitleCase( nextEventOccurrence.get_state_name() );
	else
		nextStateName = nextEventType.name;

	lib_base.ask_warning_to_continue( ActiveScreen, lib_base.BuildUiParamEntry( UiText.messages.move_participants_with_occurrence_xxx_to_next_state_xxx, participationOccurrence.get_name(), nextStateName ) );

	srcParticipants = ArraySelectByKey( this.participants, participationOccurrence.id, 'result_occurrence_id' )
	lib_candidate.HandleAddCandidatesEvents( ArrayExtract( srcParticipants, 'person_id' ), nextEventType.id, {occurrence_id:typicalNextState.event_occurrence_id,vacancy_id:this.vacancy_id} );
}


function UpdateDepObjectState()
{
	if ( ChildExists( 'candidate_id' ) && candidate_id.HasValue )
		lib_candidate.UpdateCandidateOnEventOccurrenceChange( this );
}



function address()
{
	return '';
}


function locationDesc()
{
	return '';
}