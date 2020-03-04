function is_ext_calendar_enabled()
{
	if ( ! LdsIsClient )
		return false;

	if ( System.IsWebClient )
		return false;

	return local_settings.ext_calendar_type_id.HasValue;
}


function calendar_app_name()
{
	local_settings.ext_calendar_type_id.ForeignElem.name;
}


function calendar_app_image_url()
{
	local_settings.ext_calendar_type_id.ForeignElem.image_url;
}


function put_entry_to_ext_calendar( entry, options )
{
	if ( ! local_settings.ext_calendar_type_id.HasValue )
		throw UserError( 'No external calendar specified' );

	options = adjust_func_options( options );

	message = lib_ext_calendar.build_entry_message( entry );

	get_ext_calendar_lib().put_entry_to_ext_calendar( entry, message, options );
}


function adjust_func_options( options )
{
	if ( options == undefined )
		options = new Object;

	options.prepareEdit = options.GetOptProperty( 'prepareEdit', false );
	options.forcePut = options.GetOptProperty( 'forcePut', false );
	return options;
}


function get_ext_calendar_entry( entry )
{
	return get_ext_calendar_lib().get_ext_calendar_entry( entry );
}


function check_ext_calendar_entry_editor( entry )
{
	return get_ext_calendar_lib().check_ext_calendar_entry_editor( entry );
}


function delete_ext_calendar_entry( entry )
{
	get_ext_calendar_lib().delete_ext_calendar_entry( entry );
}


function display_ext_calendar_entry( entry )
{
	if ( ! local_settings.ext_calendar_type_id.HasValue )
		throw UserError( 'No external calendar specified' );

	get_ext_calendar_lib().display_ext_calendar_entry( entry );
}


function start_ext_calendar_entry_editor( entry, screen )
{
	if ( ! local_settings.ext_calendar_type_id.HasValue )
		throw UserError( 'No external calendar specified' );

	editor = OpenNewDoc( 'cn_ext_calendar_entry_editor.xmd' ).TopElem;

	editor.init( entry, screen );
	screen.AddExternalEditor( editor );

	return editor;
}


function load_mod_entries()
{
	if ( ! local_settings.ext_calendar_type_id.HasValue )
		return;

	eidElemName = local_settings.ext_calendar_type_id + '_eid';

	startDate = CurDate;

	extEntries = get_ext_calendar_lib().get_mod_entries( local_settings.load_from_ext_calendar.entry_min_last_mod_date );
	for ( srcEntry in extEntries )
	{
		//alert( srcEntry.Xml );
		eid = srcEntry.Child( eidElemName );

		entry = ArrayOptFirstElem( XQuery( 'for $elem in calendar_entries where $elem/' + eidElemName + ' = ' + XQueryLiteral( eid ) + ' return $elem' ) );
		if ( entry != undefined )
		{
			entryDoc = OpenDoc( entry.ObjectUrl );
			entry = entryDoc.TopElem;
			prevData = entry.Clone();
		}
		else
		{
			if ( ! local_settings.load_from_ext_calendar.load_unknown_entries )
				continue;

			entryDoc = DefaultDb.OpenNewObjectDoc( 'calendar_entry' );
			entry = entryDoc.TopElem;
			prevData = undefined;
		}

		if ( prevData == undefined )
		{
			entry.Child( eidElemName ).Value = eid;
			entry.type_id = local_settings.load_from_ext_calendar.unknown_entry_type_id;
			entry.comment = srcEntry.comment;
		}

		entryDoc.TopElem.date = srcEntry.date;
		entryDoc.TopElem.end_date = srcEntry.end_date;
		entryDoc.TopElem.local_date = srcEntry.date;

		if ( srcEntry.room_id.HasValue )
			entry.room_id = srcEntry.room_id;

		for ( srcParticipant in srcEntry.participants )
		{
			if ( ! srcParticipant.person_id.HasValue )
				continue;

			participant = entry.participants.ObtainChildByKey( srcParticipant.person_id );
			participant.AssignElem( srcParticipant );
		}

		if ( prevData != undefined && entryDoc.TopElem.EqualToElem( prevData ) )
		{
			//alert( entryDoc.TopElem.Xml );
			//alert( prevData.Xml );
			
			//alert( '$$' );
			continue;
		}

		entryDoc.Save();
	}

	local_settings.load_from_ext_calendar.entry_min_last_mod_date = startDate;
	local_settings.Doc.Save();
}


function check_room_is_free( room, startDate, endDate )
{
	if ( ! local_settings.ext_calendar_type_id.HasValue )
		return true;

	if ( ! cn_global_settings.check_ext_calendar_room_busy_info )
		return true;

	if ( ! room.ChildExists( local_settings.ext_calendar_type_id + '_name' ) )
		return true;

	if ( ! room.Child( local_settings.ext_calendar_type_id + '_name' ).HasValue )
		return true;

	busyEntries = get_ext_calendar_lib().get_room_busy_info( room, startDate, endDate );
	for ( busyEntry in busyEntries )
	{
		if ( busyEntry.end_date > startDate && busyEntry.date < endDate )
			return false;
	}

	return true;
}


function get_ext_calendar_lib()
{
	if ( ! local_settings.ext_calendar_type_id.HasValue )
		throw UserError( 'No external calendar specified' );

	return eval( 'lib_' + local_settings.ext_calendar_type_id );
}


function build_entry_message( entry )
{
	if ( ! entry.type_id.ForeignElem.ext_calendar_template_id.HasValue )
	{
		message = new MailMessage();
		message.subject = entry.type_id.ForeignDispName;

		if ( entry.occurrence_id == 'cancelled' )
			message.subject += ' (' + entry.occurrence.get_name() + ')';

		message.subject += ':  ';

		if ( entry.ChildExists( 'candidate_id' ) )
		{
			message.subject += entry.candidate_id.ForeignDispName;

			dispPhone = entry.candidate_id.ForeignElem.disp_phone;
			if ( dispPhone != '' )
				message.subject += ',  ' + dispPhone;
		}
		else
		{
			message.subject += entry.person_id.ForeignDispName;
		}

		message.body = entry.comment;

		return message;
	}

	if ( entry.ChildExists( 'candidate_id' ) && entry.candidate_id.HasValue )
	{
		candidateDoc = OpenDoc( entry.candidate_id.ForeignObjectUrl );
		object = candidateDoc.TopElem.build_mail_env_object( entry.vacancy_id );
	}
	else
	{
		object = new Object;
	}

	object.event = entry;

	template = entry.type_id.ForeignElem.ext_calendar_template_id.ForeignElem;
	message = lib_mail.build_mail_message( template, '', GetFailedForeignElem( persons ), object );

	return message;
}


function entry_equal_stored_entry( entry, storedEntry )
{
	if ( entry.date != storedEntry.date )
		return false;

	if ( entry.end_date != storedEntry.end_date )
		return false;

	return true;
}


function RunAgentSyncWithExtCalendars()
{
	if ( AppModuleUsed( 'ras' ) )
		lib_calendar_slots.SyncAllSlotsWithExtCalendars();
}