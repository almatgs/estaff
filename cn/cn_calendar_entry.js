function OnBaseBuild()
{
	AssignElem( SrcObject, true );
	attachments.Clear();
}


function get_image_url()
{
	if ( true || completion_id.HasValue )
		return '//base_pict/calendar_entry.ico';
	else
		return '//base_pict/calendar_entry.ico';
}


function get_text_color()
{
	if ( is_completed )
		return '150,150,150';

	return '';
}


function is_completed()
{
	if ( type.has_occurrence( 'scheduled' ) && occurrence_id != 'scheduled' )
		return true;

	if ( occurrence_id == 'succeeded' || occurrence_id == 'failed' || occurrence_id == 'cancelled' )
		return true;

	if ( ! type.use_occurrences )
	{
		if ( type.use_end_date && end_date.HasValue )
		{
			if ( end_date < CurDate )
				return true;
		}
		else
		{
			if ( date < CurDate )
				return true;
		}
	}

	return '';
}


function init()
{
	if ( type.is_delegate )
		is_delegate = true;

	if ( ! local_date.HasValue )
		local_date = date;

	if ( ! end_date.HasValue )
	{
		if ( type_id.ForeignElem.default_duration.length.HasValue )
		{
			duration.AssignElem( type_id.ForeignElem.default_duration );
		}
		else
		{
			duration.unit_id = 'minute';
			duration.length = 60;
		}

		update_end_date_by_duration();
	}

	if ( type_id.ForeignElem.use_road_time )
	{
		road_time.AssignElem( type_id.ForeignElem.default_road_time );
		return_road_time.AssignElem( type_id.ForeignElem.default_road_time );
	}
}


function handle_before_ui_save()
{
	if ( type.use_ext_calendar && lib_ext_calendar.is_ext_calendar_enabled && ! ( user_id.HasValue && user_id != lib_user.active_user_info.id ) )
	{
		if ( this.occurrence_id == 'cancelled' && ! cn_global_settings.export_cancelled_events_to_ext_calendar )
		{
			eidElemName = local_settings.ext_calendar_type_id + '_eid';
			if ( this.Child( eidElemName ).HasValue )
			{
				lib_ext_calendar.delete_ext_calendar_entry( id.Parent );
				this.Child( eidElemName ).Clear();
			}
		}
		else
		{
			lib_ext_calendar.put_entry_to_ext_calendar( id.Parent );
		}
	}
}


function on_calendar_entry_ui_save()
{
	if ( this.entry_pass_request_eid.HasValue && lib_office_access.is_office_access_enabled && this.date > CurDate )
	{
		if ( this.occurrence_id == 'cancelled' )
		{
		}
		else if ( DateNewTime( this.date ) != DateNewTime( this.view.prev_data.date ) )
		{
			if ( lib_base.ask_question( ActiveScreen, UiText.questions.submit_entry_pass_request ) )
				lib_office_access.HandleSubmitEntryPassRequestForCalendarEntry( this );
		}
	}
}


function PutParticipantsToTrainingGroup()
{
	if ( ! training_group_id.HasValue || ! training_program_part_id.HasValue )
		return;

	trainingGroupDoc = ObtainUiDoc( training_group_id.ForeignObjectUrl );
	trainingGroup = trainingGroupDoc.TopElem;

	wasChanged = false;

	for ( participant in this.participants )
	{
		destParticipant = trainingGroup.participants.GetOptChildByKey( participant.person_id );
		if ( destParticipant == undefined )
			continue;

		attended = participant.result_occurrence_id == 'completed';

		targetPart = destParticipant.target_parts.ObtainChildByKey( training_program_part_id );
		if ( targetPart.attended != attended )
		{
			targetPart.attended = attended;
			wasChanged = true;
		}
	}

	if ( wasChanged )
		UpdateUiDoc( trainingGroupDoc );
}


