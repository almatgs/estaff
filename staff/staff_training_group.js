function OnCreate()
{
	group_id = lib_user.active_user_info.main_group_id;
}


function OnCheckReadAccess()
{
	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	if ( userAccess.prohibit_view_other_group_training_groups && ! LdsCurUser.matches_group( group_id ) )
		Cancel();
}


function on_ui_save()
{
	PutParticipantsToCalendarEntries();
}


function is_active()
{
	return this.start_date.HasValue && CurDate >= this.start_date && CurDate <= DateNewTime( this.end_date, 23, 59, 59 );
}


function is_tentative()
{
	return this.start_date == null || CurDate < this.start_date;
}


function image_url()
{
	if ( is_active )
		return '//base_pict/generic_item.ico';
	else if ( is_tentative )
		return '//base_pict/generic_item_tentative.ico';
	else
		return '//base_pict/generic_item_inactive.ico';
}


function SyncPartEntries()
{
	if ( ! this.training_program_id.HasValue )
		return;

	trainingProgram = training_program_id.ForeignElem;

	for ( part in trainingProgram.parts )
	{
		partEntry = this.part_entries.ObtainChildByKey( part.id );
		
		if ( partEntry.date.HasValue )
			partEntry.end_date = lib_base.get_term_date_offset( partEntry.date, partEntry.part_id.ForeignElem.duration );
		
		if ( ! partEntry.teacher_user_id.HasValue )
			partEntry.teacher_user_id = this.teacher_user_id;
	}

	this.part_entries.DeleteChildren( 'part_id.OptForeignElem == undefined' );
}


function HandleSelectPartEntryDate( partEntry )
{
	calendarOptions = new Object;
	calendarOptions.user_id = partEntry.teacher_user_id;

	resp = lib_calendar.select_date_and_room( partEntry.date, calendarOptions );
							
	partEntry.date = resp.date;
	partEntry.teacher_user_id = resp.filter_user_id;
	//if ( Ps.Parent.ChildExists( 'room_id' ) && obj.room_id.HasValue )
		//Ps.Parent.room_id = obj.room_id;

	this.Doc.SetChanged( true );
}


function HasUnfilledPartEntries()
{
	for ( partEntry in this.part_entries )
	{
		if ( ! partEntry.date.HasValue || ! partEntry.teacher_user_id.HasValue )
			return true;
	}

	return false;
}


function HasUncompletedParticipants()
{
	if ( CurDate < this.end_date )
		return false;

	for ( participant in this.participants )
	{
		if ( ! participant.completion_id.HasValue )
			return true;
	}

	return false;
}


function PartEntryHasMismatch( partEntry )
{
	if ( ! partEntry.calendar_entry_id.HasValue )
		return false;

	calendarEntry = partEntry.calendar_entry_id.ForeignElem;
	return ( partEntry.date != calendarEntry.date || partEntry.end_date != calendarEntry.end_date || partEntry.teacher_user_id != calendarEntry.user_id );
}


function HandlePutPartEntriesInCalendar()
{
	wasChanged = false;

	for ( partEntry in this.part_entries )
	{
		if ( partEntry.calendar_entry_id.HasValue )
		{
			calendarEntry = partEntry.calendar_entry_id.ForeignElem;
			if ( partEntry.date == calendarEntry.date && partEntry.end_date == calendarEntry.end_date && partEntry.teacher_user_id == calendarEntry.user_id )
				continue;

			calendaEntryDoc = OpenDoc( calendarEntry.ObjectUrl );
			calendarEntry = calendaEntryDoc.TopElem;
		}
		else
		{
			calendaEntryDoc = DefaultDb.OpenNewObjectDoc( 'calendar_entry' );
			calendarEntry = calendaEntryDoc.TopElem;
			calendarEntry.type_id = 'group_training';
			calendarEntry.training_program_id = this.training_program_id;
			calendarEntry.training_program_part_id = partEntry.part_id;
			calendarEntry.training_group_id = this.id;
		}

		calendarEntry.date = partEntry.date;
		calendarEntry.end_date = partEntry.end_date;
		calendarEntry.user_id = partEntry.teacher_user_id;
		calendaEntryDoc.Save();

		partEntry.calendar_entry_id = calendarEntry.id;
		wasChanged = true;
	}

	this.start_date = ArrayMin( this.part_entries, 'date' ).date;
	this.end_date = ArrayMax( this.part_entries, 'end_date' ).end_date;

	if ( wasChanged || Doc.IsChanged )
		Screen.SaveDoc();
}


function GetCalendarEntriesArray()
{
	queryStr = 'for $elem in calendar_entries where $elem/training_group_id = ' + this.id.XQueryLiteral;
	queryStr += ' order by $elem/creation_date descending';
	queryStr += ' return $elem/Fields( "id" )';

	return XQuery( queryStr );
}


function HandleSelectParticipants()
{
	for ( personID in lib_base.select_objects_from_view( 'candidates_with_state' ) )
	{
		participant = participants.ObtainChildByKey( personID, 'person_id' );
		BuildParticipationEvent( participant, '' );
	}

	Doc.SetChanged( true );
}


function HandleDeleteParticipant( participant )
{
	participant.Delete();
	Doc.SetChanged( true );
}


function BuildParticipationEvent( participant, occurrenceID )
{
	if ( ! training_program_id.ForeignElem.participation_event_type_id.HasValue )
		return;

	eventType = training_program_id.ForeignElem.participation_event_type_id.ForeignElem;
	if ( ! eventType.has_occurrence( occurrenceID ) )
		return;

	queryStr = 'for $elem in events where $elem/candidate_id = ' + participant.person_id.XQueryLiteral;
	queryStr += ' and $elem/type_id = ' + training_program_id.ForeignElem.participation_event_type_id.XQueryLiteral;
	queryStr += ' and $elem/training_group_id = ' + id.XQueryLiteral;
	queryStr += ' return $elem/Fields( "id","is_derived","is_calendar_entry","occurrence_id" )';

	event = ArrayOptMax( XQuery( queryStr ), 'date' );
	if ( event != undefined )
	{
		if ( event.occurrence_id == occurrenceID )
			return;

		eventDoc = OpenDoc( event.PrimaryObjectUrl );
		event = eventDoc.TopElem;
		event.occurrence_id = occurrenceID;
		eventDoc.Save();
		return;
	}
	
	candidateDoc = ObtainUiDoc( ObjectDocUrl( 'data', 'candidate', participant.person_id ) );
	candidate = candidateDoc.TopElem;

	eventData = new Object;
	eventData.occurrence_id = occurrenceID;

	if ( event != undefined )
	{
		lib_candidate.SelectCandidateEventResult( candidate, event, eventData, {isSilent:true} );
	}
	else
	{
		eventData.vacancy_id = candidate.main_vacancy_id;
		eventData.training_group_id = this.id;
		lib_candidate.AddCandidateEvent( candidate, training_program_id.ForeignElem.participation_event_type_id, eventData, {isSilent:true} );
	}

	if ( candidateDoc.IsChanged )
		UpdateUiDoc( candidateDoc );
}


function InitParticipantsResults()
{
	//participants.DeleteChildren( '! This.person_id.HasValue' );

	queryStr = 'for $elem in persons'
	queryStr += ' where MatchSome( $elem/id, ( ' + ArrayMerge( participants, 'person_id', ',' ) + ') )';
	queryStr += ' return $elem/Fields( "id","fullname","mobile_phone","is_derived","is_candidate" )';

	personsArray = XQuery( queryStr );

	for ( participant in participants )
	{
		participant.person = ArrayOptFindByKey( personsArray, participant.person_id, 'id' );
	}

	/*queryStr = 'for $elem in events'
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
	}*/

	participants.Sort( 'person.fullname', '+' );
}


function HandleAskParticipantOptions( participant )
{
	dlgDoc = OpenDoc( 'staff_dlg_participant.xml' );
	dlg = dlgDoc.TopElem;

	dlg.training_program_id = this.training_program_id;
	dlg.target_parts.AssignElem( participant.target_parts );
	dlg.Init();

	ActiveScreen.ModalDlg( dlgDoc );
	participant.target_parts.AssignElem( dlg.target_parts );
	Doc.SetChanged( true );
}


function PutParticipantsToCalendarEntries()
{
	if ( this.participants.ChildNum == 0 )
		return;

	for ( partEntry in this.part_entries )
	{
		if ( partEntry.calendar_entry_id.HasValue )
			PutParticipantsToPartCalendarEntry( partEntry );
	}
}


function PutParticipantsToPartCalendarEntry( partEntry )
{
	calendaEntryDoc = ObtainUiDoc( partEntry.calendar_entry_id.ForeignObjectUrl );
	calendarEntry = calendaEntryDoc.TopElem;

	wasChanged = false;
	personIDs = new Array;

	for ( participant in this.participants )
	{
		targetPart = participant.target_parts.GetOptChildByKey( partEntry.part_id );
		if ( targetPart != undefined && targetPart.not_required )
			continue;

		personIDs.push( participant.person_id );

		destParticipant = calendarEntry.participants.GetOptChildByKey( participant.person_id );
		if ( destParticipant == undefined )
		{
			destParticipant = calendarEntry.participants.AddChild();
			destParticipant.person_id = participant.person_id;
			wasChanged = true;
		}

		resultOccurrenceID = ( targetPart.attended ? 'completed' : '' );
		if ( destParticipant.result_occurrence_id != resultOccurrenceID )
		{
			destParticipant.result_occurrence_id = resultOccurrenceID;
			wasChanged = true;
		}
	}

	for ( i = 0 ; i < calendarEntry.participants.ChildNum; )
	{
		if ( personIDs.indexOf( calendarEntry.participants[i].person_id ) < 0 )
		{
			calendarEntry.participants[i].Delete();
			wasChanged = true;
		}
		else
		{
			i++;
		}
	}

	if ( wasChanged )
		UpdateUiDoc( calendaEntryDoc );
}


function HandleMarkAsCompleted()
{
	dlgDoc = OpenDoc( 'staff_dlg_training_group_completion.xml' );
	dlg = dlgDoc.TopElem;

	for ( participant in this.participants )
	{
		if ( participant.person_id.OptForeignElem == undefined )
			continue;

		destParticipant = dlg.participants.AddChild();
		destParticipant.AssignElem( participant );

		if ( ! destParticipant.completion_id.HasValue )
		{
			if ( ArrayOptFind( participant.target_parts, '! not_required && ! attended' ) == undefined )
				destParticipant.completion_id = 'succeeded';
		}
	}
	
	ActiveScreen.ModalDlg( dlgDoc );

	for ( destParticipant in dlg.participants )
	{
		if ( destParticipant.completion_id.HasValue )
			BuildParticipationEvent( destParticipant, destParticipant.completion_id );

		participant = this.participants.GetChildByKey( destParticipant.person_id );
		participant.completion_id = destParticipant.completion_id;
	}

	this.is_completed = true;
	Doc.SetChanged( true );
}


