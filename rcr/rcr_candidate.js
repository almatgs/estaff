function image_url()
{
	is_active ? '//base_pict/candidate.ico' : '//base_pict/candidate_inactive.ico'
}


function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;
	recruit_type_id = lib_user.active_user_info.main_group_id.ForeignElem.recruit_type_id;
	lib_base.init_new_card_object( This );

	if ( global_settings.use_multi_currencies.candidate_salary )
		salary_currency_id = global_settings.default_currency_id;

	adjust_recruit_type();
}


function OnCheckReadAccess()
{
	if ( LdsCurUser.Name == 'person' ) //!!!
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

	if ( userAccess.prohibit_view_other_user_candidates && user_id != LdsCurUser.id )
		Cancel();

	if ( ( userAccess.prohibit_view_other_group_candidates || ( userAccess.prohibit_open_other_group_candidates && OptDoc != undefined ) ) && ! LdsCurUser.matches_group( group_id ) )
		Cancel();

	if ( userAccess.prohibit_view_other_spot_candidates_with_state )
	{
		for ( spot in spots )
		{
			if ( spot.vacancy_id.ForeignElem.user_id != LdsCurUser.id && userAccess.other_spot_candidates_state_id.ByValueExists( spot.state_id ) )
				Cancel();
		}
	}

	if ( userAccess.restrict_view_candidates_with_state )
	{
		if ( user_id != LdsCurUser.id && ! userAccess.candidate_state_id.ByValueExists( state_id ) )
			Cancel();
	}

	if ( userAccess.restrict_view_candidates_with_recruit_type )
	{
		if ( user_id != LdsCurUser.id && recruit_type_id.HasValue && ! userAccess.candidate_recruit_type_id.ByValueExists( recruit_type_id ) )
			Cancel();
	}

	if ( userAccess.prohibit_view_other_division_candidates && user_id != LdsCurUser.id )
	{
		match = false;

		for ( spot in spots )
		{
			if ( spot.vacancy_id.ForeignElem.user_id == LdsCurUser.id || lib_base.is_catalog_hier_child_or_self( divisions, spot.vacancy_id.ForeignElem.division_id, lib_user.active_user_info.person_id.ForeignElem.division_id ) )
			{
				match = true;
				break;
			}
		}

		if ( ! match )
			Cancel();
	}
}


function OnBeforeSave()
{
	for ( spot in ArraySelect( spots, '! vacancy_id.HasValue' ) ) //!!!
		spot.Delete();

	main_vacancy_id = get_main_vacancy_id();

	if ( main_vacancy_id != null )
	{
		main_vacancy_org_id = main_vacancy_id.ForeignElem.org_id;
		main_vacancy_division_id = main_vacancy_id.ForeignElem.division_id;
	}
	else
	{
		main_vacancy_org_id.Clear();
		main_vacancy_division_id.Clear();
	}
	
	if ( ! state_date.HasValue )
		update_state();

	this.state_date = Max( this.state_date, this.last_spot_state_date );

	if ( prev_jobs.ChildNum != 0 )
	{
		last_job_org_name = last_prev_job.org_name;
		last_job_position_name = last_prev_job.position_name;
	}
	else
	{
		last_job_org_name = '';
		last_job_position_name = '';
	}

	if ( ! rcr_config.is_converting_old_data )
	{
		stateDaysNum = DateDiff( CurDate, state_date ) / 86400;

		max_state_date = get_max_state_date();
		is_user_duty = state.is_user_duty && stateDaysNum <= 90;
	}

	if ( user_id.HasValue && ! group_id.HasValue )
		group_id = user_id.ForeignElem.main_group_id;

	if ( this.FormElem.ChildExists( 'idata_group_id' ) )
		lib_voc.update_idata_by_voc( group_id );

	lib_voc.update_idata_by_voc( source_id );
	lib_recruit.guess_candidate_src_competitor_org( this );

	lib_base.update_object_attachments_on_before_save( this );

	if ( AppModuleUsed( 'conn_naumen' ) )
	{
		mobile_phone = lib_phone_details.PhoneToStoredPhone( mobile_phone );
		home_phone = lib_phone_details.PhoneToStoredPhone( home_phone );
	}

	adjust_recruit_type();

	this.UpdateJobSearchLocation();
}


function UpdateJobSearchLocation()
{
	if ( ! this.job_search_location_id.HasValue && this.location_id.HasValue )
		this.job_search_location_id.SetValues( [this.location_id] )
}


function OnSave()
{
	if ( person_id.HasValue )
	{
	}
	else
	{
		personDoc = OpenNewDoc( '//base2/base2_person.xmd', 'separate=1' );
		personDoc.Url = ObjectDocUrl( 'data', 'person', id );

		personDoc.TopElem.AssignElem( id.Parent, false, true );
		personDoc.TopElem.attachments.Clear();
		personDoc.TopElem.skills.Clear();
		personDoc.TopElem.is_derived = true;
		personDoc.TopElem.is_candidate = true;

		personDoc.IsSeparated = false;
		personDoc.NeverSaved = false;
		personDoc.WriteDocInfo = false;
		//personDoc.WriteFt = false;
		personDoc.UpdateValues();
		personDoc.Save();
	}

	for ( spot in spots )
	{
		oldSpot = Doc.LastSavedData.spots.GetOptChildByKey( spot.vacancy_id );

		if ( oldSpot == undefined )
		{
			lib_base.update_dep_object( spot.vacancy_id.ForeignObjectUrl, id.Parent, 'save' );

			if ( global_settings.use_candidate_spot_user_notif && spot.vacancy_id.ForeignElem.user_id.HasValue && spot.vacancy_id.ForeignElem.user_id != LdsCurUserID )
				lib_notif.create_notification( UiText.titles.spot_added, id.Parent, {vacancy_id:spot.vacancy_id,user_id:spot.vacancy_id.ForeignElem.user_id} );
				
			continue;
		}

		if ( spot.state_id.ForeignElem.make_candidate_final || oldSpot.state_id.ForeignElem.make_candidate_final )
		{
			lib_base.update_dep_object( spot.vacancy_id.ForeignObjectUrl, id.Parent, 'save' );
			continue;
		}
	}

	//if ( state_id != Doc.LastSavedData.state_id && state_date >= Doc.LastSavedData.state_date )
		//lib_re
}


function OnDelete()
{
	for ( event in ArrayDirect( get_ui_events_array() ) )
		DeleteDoc( event.PrimaryObjectUrl );

	if ( ! person_id.HasValue )
	{
		try
		{
			DefaultDb.DeleteObjectDoc( 'person', id, true );
		}
		catch ( e )
		{
			//alert( e );
		}
	}
}


function check_before_screen_save()
{
	view.is_new = Doc.NeverSaved;

	if ( System.IsWebClient ) // !!!
		this.UpdateValues();

	if ( fullname == '' )
		throw UiError( UiText.errors.candidate_fullname_not_specified );

	if ( AppModuleUsed( 'module_teva' ) )
		lib_teva.check_candidate_name( id.Parent );

	if ( AppModuleUsed( 'module_zest' ) )
		lib_zest.check_candidate_name( id.Parent );

	if ( ( Doc.NeverSaved || need_recheck_duplicates() ) && ! view.duplicates_checked )
	{
		if ( AppModuleUsed( 'module_midlandhunt' ) && ! fullname_en.HasValue )
		{
			fullnameEn = OpenCodeLib( 'x-app://module_midlandhunt/midlandhunt_lib_midlandhunt.js' ).Trans_Liter( Trim( lastname + ' ' + firstname ) );
			if ( fullnameEn != fullname )
				fullname_en = fullnameEn;
		}

		if ( ( destCandidateID = lib_candidate_dup.check_dup_candidates( id.Parent, {checkExternalCandidates:true} ) ) != null )
		{
			destDoc = DefaultDb.OpenObjectDoc( 'candidate', destCandidateID );
			
			screen = Screen;

			screen.Doc.SetChanged( false );
			screen.SetDoc( destDoc );
			screen.FrameName = destDoc.Url;
			Cancel();
		}
	}

	fields_usage.check_object_required_fields( id.Parent );
	save_changed_target_events();
}


function on_ui_save()
{
	if ( view.is_new || ( this.email != view.prev_data.email ) )
		lib_candidate.CheckCandidateCreateNotif( this );

	view.prev_data.AssignElem( this );
}


function adjust_recruit_type()
{
	if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) && ! lib_app2.AppFeatureEnabled( 'classic_recruit' ) )
		recruit_type_id = 'selection';
}


function need_recheck_duplicates()
{
	if ( ! rcr_config.use_ext_duplicates_search )
		return false;

	if ( view.prev_data.fullname != fullname )
		return true;

	if ( view.prev_data.email != email )
		return true;

	if ( view.prev_data.email2 != email2 )
		return true;

	return false;
}


function is_doc_changed()
{
	if ( Doc.IsChanged )
		return true;

	for ( targetEvent in view.target_events )
	{
		if ( targetEvent.mod_event_doc != undefined && targetEvent.mod_event_doc.IsChanged )
			return true;
	}

	return false;
}


function show_metro_station()
{
	return fields_usage.use_object_field( 'candidate', 'metro_station_id' ) && ( ! location_id.HasValue || location_id.ForeignElem.has_metro );
}


function adjust_bad_attachments()
{
	if ( System.IsWebClient )
		return;

	attachment = opt_default_attachment;
	if ( attachment != undefined && attachment.is_text )
		adjust_bad_html_atatchment( attachment );
}


function adjust_bad_html_atatchment( attachment )
{
	//Quick fix for HH

	if ( StrContains( attachment.text, '<!--[if IE]' ) && StrContains( attachment.text, ' href="//i.hh.ru/' ) )
		attachment.text = StrReplace( attachment.text, 'href="//i.hh.ru/', 'href_="//i.hh.ru/' );

	attachment.text = StrReplace( attachment.text, '<img src="//', '<img src_="//' );
}


function active_spots()
{
	ArraySelect( spots, 'is_active' );
}


function opt_main_spot()
{
	return ArrayOptFirstElem( ArraySort( spots, 'is_active', '-', 'state_date', '-' ) );
}


function get_main_vacancy_id()
{
	if ( ( mainSpot = opt_main_spot ) != undefined )
		return mainSpot.vacancy_id;

	if ( ( stateEvent = get_state_event() ) != undefined )
		return stateEvent.vacancy_id;
	
	return null;
}


function get_screen_target_vacancy_id()
{
	if ( ( targetSpot = get_opt_sel_spot() ) != undefined )
		return targetSpot.vacancy_id;

	array = active_spots();
	
	switch ( ArrayCount( array ) )
	{
		case 0:
			return null;

		case 1:
			return array[0].vacancy_id;

		default:
			if ( global_settings.require_spot_selection )
				throw UiError( UiText.errors.spot_not_selected );

			return ArrayFirstElem( ArraySort( array, 'state_date', '-' ) ).vacancy_id;
	}

	return null;
}


function get_opt_sel_spot()
{
	if ( spots.ChildNum == 0 )
		return undefined;

	list = Screen.FindOptItem( 'SpotsList' );
	if ( list == undefined )
		return undefined;

	if ( list.Type != 'LIST' )
		list = list.FindSubItemByType( 'LIST' );

	if ( list.HasSel )
		return list.SelRow.Env.ListElem;

	return undefined;
}


function get_events_array()
{
	//if ( view.target_events_loaded )
		//throw '!!';

	return XQuery( 'for $elem in events where $elem/candidate_id = ' + id.XQueryLiteral + ' return $elem' )
}


function get_ui_events_array()
{
	if ( this.ChildExists( 'view' ) && view.target_events_loaded )
		return ArrayExtract( view.target_events, 'event' );
	else
		return get_events_array();
}


function get_spot_ui_events_array( spot )
{
	ArraySelectByKey( get_ui_events_array(), spot.vacancy_id, 'vacancy_id' );
}


function get_sorted_events_array()
{
	ArraySort( get_events_array(), 'date', '-' )
}


function get_last_event()
{
	eventsArray = get_ui_events_array();
	if ( ArrayCount( eventsArray ) != 0 )
		return ArrayMax( eventsArray, 'date' );
	else
		return undefined;
}


function get_spot_last_event( spot )
{
	eventsArray = get_spot_ui_events_array( spot );
	if ( ArrayCount( eventsArray ) != 0 )
		return ArrayMax( eventsArray, 'date' );
	else
		return undefined;
}


function get_state_event()
{
	stateEventsArray = ArraySelect( get_ui_events_array(), 'type.is_state' );
	if ( ArrayCount( stateEventsArray ) != 0 )
		return ArrayMax( stateEventsArray, 'state_date' );
	else
		return undefined;
}


function get_spot_state_event( spot )
{
	stateEventsArray = ArraySelect( get_spot_ui_events_array( spot ), 'type.is_state' );
	if ( ArrayCount( stateEventsArray ) != 0 )
		return ArrayMax( stateEventsArray, 'state_date' );
	else
		return undefined;
}


function get_state_bk_color()
{
	if ( state.event_occurrence_id == 'scheduled' )
		return lib_event.build_dyn_state_bk_color( state, state_end_date, null );
	else
		return lib_event.build_dyn_state_bk_color( state, state_date, state_end_date );
}


function get_is_active()
{
	if ( spots.ChildNum == 0 )
		return ! state.deactivate_object;

	return ( ArrayOptFind( spots, 'is_active' ) != undefined );
}


function get_spot_is_active( spot )
{
	return ! spot.state_id.ForeignElem.deactivate_object;
}


function state()
{
	state_id.ForeignElem
}


function last_spot_state_date()
{
	if ( this.spots.ChildNum == 0 )
		return null;

	return ArrayMax( this.spots, 'state_date' ).state_date;
}


function update_state()
{
	init_target_events();
	
	for( spot in spots )
		update_spot_state( spot );

	stateEvent = get_state_event();
	if ( stateEvent != undefined )
	{
		state_id = stateEvent.state_id;
	}
	else
	{
		if ( creation_date.HasValue && global_settings.use_candidate_unused_state && global_settings.unused_candidate_start_period.length.HasValue && lib_base.get_term_date_offset( creation_date, global_settings.unused_candidate_start_period ) < CurDate )
			state_id = global_settings.unused_candidate_state_id;
		else
			state_id = 'new';
	}

	if ( stateEvent != undefined )
	{
		if ( stateEvent.occurrence_id == 'scheduled' && stateEvent.creation_date.HasValue )
		{
			state_date = stateEvent.creation_date;
			state_end_date = stateEvent.date;
		}
		else if ( stateEvent.occurrence_id == 'cancelled' && stateEvent.type.has_occurrence( 'scheduled' ) && stateEvent.creation_date.HasValue )
		{
			state_date = stateEvent.creation_date;
			state_end_date = null;
		}
		else
		{
			state_date = stateEvent.date;

			if ( stateEvent.type.use_end_date && stateEvent.end_date.HasValue )
			{
				state_end_date = stateEvent.end_date;
				if ( state_end_date > state_date && ( stateEvent.occurrence_id == 'succeeded' || stateEvent.occurrence_id == 'failed' ) )
					state_date = state_end_date;
			}
			else
			{
				state_end_date = null;
			}
		}

		if ( ! state_date.HasValue )
			state_date = ( creation_date != null ? creation_date : CurDate );
	}
	else
	{
		state_date = ( creation_date != null ? creation_date : CurDate );
		state_end_date = null;
	}

	if ( global_settings.use_candidate_latest_event_cp_date && ( lastEvent = get_last_event() ) != undefined )
		cp_date = Max( lastEvent.date, state_date );
	else
		cp_date = state_date;

	is_active = get_is_active();

	eventsArray = get_ui_events_array();
	commentEventsArray = ArraySort( ArraySelect( eventsArray, 'comment.HasValue' ), 'state_date', '-' );

	lastCommentEvent = ArrayOptFirstElem( commentEventsArray );
	if ( lastCommentEvent != undefined )
		last_comment = StrLeftRange( UnifySpaces( lastCommentEvent.comment ), rcr_config.last_comment_max_len );
	else
		last_comment = '';

	if ( AppModuleUsed( 'module_rgs' ) || AppModuleUsed( 'module_midlandhunt' ) )
	{
		for ( spot in spots )
		{
			lastCommentEvent = ArrayOptFindByKey( commentEventsArray, spot.vacancy_id, 'vacancy_id' );
			if ( lastCommentEvent != undefined )
			{
				if ( AppModuleUsed( 'module_midlandhunt' ) )
				{
					lastCommentDoc = OpenDoc( lastCommentEvent.ObjectUrl );
					lastCommentEvent = lastCommentDoc.TopElem;
				}

				spot.last_comment = StrLeftRange( UnifySpaces( lastCommentEvent.comment ), rcr_config.last_comment_max_len );
			}
			else
			{
				spot.last_comment = '';
			}
		}
	}
	/*else if ( AppModuleUsed( 'module_pauwels' ) )
	{
		this.ft_secondary_text.Clear();

		for ( event in commentEventsArray )
		{
			if ( event === lastCommentEvent )
				continue;

			this.ft_secondary_text += event.comment + '\r\n';
		}
	}*/

	hot_events.Clear();

	for ( event in eventsArray )
	{
		if ( ! event.type.use_object_view_column )
			continue;

		hotEvent = ArrayOptFind( hot_events, 'type_id == ' + CodeLiteral( event.type_id ) + ' && vacancy_id == ' + CodeLiteral( event.vacancy_id ) );
		if ( hotEvent == undefined )
			hotEvent = hot_events.AddChild();

		hotEvent.AssignElem( event );
	}
}


function update_spot_state( spot )
{
	stateEvent = get_spot_state_event( spot );
	/*if ( stateEvent == undefined )
	{
		stateEvent = get_state_event();
		if ( stateEvent != undefined && ( stateEvent.occurrence.deactivate_object || stateEvent.occurrence.require_vacancy ) )
			stateEvent = undefined;
	}*/
	
	if ( stateEvent != undefined )
	{
		spot.state_id = stateEvent.state_id;

		if ( stateEvent.occurrence_id == 'scheduled' && stateEvent.creation_date.HasValue )
		{
			spot.state_date = stateEvent.creation_date;
			spot.state_end_date = stateEvent.date;
		}
		else if ( stateEvent.occurrence_id == 'cancelled' && stateEvent.type.has_occurrence( 'scheduled' ) && stateEvent.creation_date.HasValue )
		{
			spot.state_date = stateEvent.creation_date;
			spot.state_end_date = null;
		}
		else
		{
			spot.state_date = stateEvent.date;

			if ( stateEvent.type.use_end_date )
				spot.state_end_date = stateEvent.end_date;
			else
				spot.state_end_date = null;
		}
	}
	else
	{
		spot.state_id = 'new';
		spot.state_date = spot.start_date;
		spot.state_end_date = null;
	}

	spot.is_active = get_spot_is_active( spot );
}


function state_duration_desc()
{
	daysNum = DateDiff( CurDate, state_date ) / 86400;

	if ( daysNum == 0 )
		return UiText.titles.today;

	return StrIntZero( daysNum );
}


function state_duration_days_num()
{
	daysNum = DateDiff( CurDate, state_date ) / 86400;
	return daysNum;
}


function state_duration_today_time_desc()
{
	minutesNum = DateDiff( CurDate, state_date ) / 60;
	hoursNum = minutesNum / 60;

	if ( hoursNum >= 24 )
		return '';

	return StrInt( hoursNum, 2 ) + ':' + StrInt( minutesNum % 60, 2 );
}


function get_hot_event( eventTypeID, vacancyID )
{
	hotEvent = ArrayOptFind( hot_events, 'type_id == ' + CodeLiteral( eventTypeID ) + ' && vacancy_id == ' + vacancyID );
	if ( hotEvent != undefined )
		return hotEvent;

	hotEvent = ArrayOptFindByKey( hot_events, eventTypeID, 'type_id' );
	return hotEvent;
}


function get_hot_event_data( eventTypeID, vacancyID )
{
	hotEvent = get_hot_event( eventTypeID, vacancyID );
	if ( hotEvent != undefined )
		return hotEvent;

	return CreateElem( '//rcr/rcr_candidate.xmd', 'candidate.hot_events.hot_event' );
}


function get_max_state_date()
{
	curState = state;

	if ( curState.max_duration.length.HasValue )
		return lib_base.get_term_date_offset( state_date, curState.max_duration );
	
	eventType = curState.event_type_id.ForeignElem;

	if ( eventType.use_end_date && eventType.get_object_state( 'succeeded' ) != undefined && state_end_date.HasValue && ! curState.event_occurrence_id.HasValue )
		return state_end_date;

	return null;
}


function state_term_rest_seconds()
{
	if ( ! max_state_date.HasValue )
		return null;

	return DateDiff( max_state_date, CurDate );
}


function state_term_rest_desc()
{
	if ( ! max_state_date.HasValue )
		return '';
	
	daysDiff = lib_base.smart_days_diff( max_state_date, CurDate );
	if ( daysDiff >= 0 )
		return StrIntZero( daysDiff );
	else
		return '- ' + ( 0 - daysDiff );
}


function state_term_rest_bk_color()
{
	if ( ! max_state_date.HasValue )
		return '';
	
	daysDiff = lib_base.smart_days_diff( max_state_date, CurDate );

	if ( daysDiff == 0 )
		return lib_event.bk_color_reached;
	else if ( daysDiff < 0 )
		return lib_event.bk_color_expired;

	return '';
}


function find_scheduled_event( eventTypeID, vacancyID )
{
	array = ArraySelect( get_ui_events_array(), 'type_id == ' + CodeLiteral( eventTypeID ) + ' && date > Date( \'' + CurDate + '\' )' );
	
	switch ( ArrayCount( array ) )
	{
		case 0:
			throw UiError( UiText.errors.no_events_scheduled );

		case 1:
			return ArrayFirstElem( array );

		default:
			if ( vacancyID != null && ( event = ArrayOptFindByKey( array, vacancyID, 'vacancy_id' ) ) != undefined )
				return event;
			else
				return ArrayFirstElem( array );
	}
}


function add_new_spot()
{
	lib_base.ensure_doc_ever_saved( Doc );
	
	if ( AppModuleUsed( 'module_rgs' ) )
	{
		vacancyID = lib_base.select_object_from_view( 'vacancies' );
		vacancy = GetForeignElem( vacancies, vacancyID );
		if ( ! vacancy.state_id.ForeignElem.allow_candidate_selection )
			throw UiError( UiText.errors.candidate_selection_prohibited );
	}
	else
	{
		vacancyID = lib_recruit.select_active_vacancy();
	}

	if ( spots.ChildByKeyExists( vacancyID ) )
		throw UserError( UiText.errors.candidate_already_selected_for_this_vacancy );

	newSpot = add_spot( vacancyID );

	if ( global_settings.use_candidate_spot_source && AppModuleUsed( 'module_rekadro' ) )
		lib_candidate.AskCandidateSpotDetails( this, newSpot );

	Doc.SetChanged( true );

	lib_custom_action.ProcessCandidateCustomActionsOnTriggerEvent( this, 'candidate_selected_for_vacancy', {vacancy_id:vacancyID} );

	if ( AppModuleUsed( 'module_sanofi' ) )
		lib_sanofi.UpdateCandidateLeftPanel( this );
	
	return newSpot;
}


function add_spot( vacancyID )
{
	if ( spots_prohibited() )
		throw UiError( lib_base.BuildUiParamEntry( UiText.errors.spots_prohibited_for_recruit_type_xxx, get_recruit_type().name ) );

	if ( ! global_settings.allow_multi_spots && ArrayOptFind( spots, 'is_active' ) != undefined )
		throw UiError( UiText.errors.multi_spots_prohibited );

	newSpot = spots.AddChild();
	newSpot.vacancy_id = vacancyID;
	newSpot.is_active = true;
	newSpot.start_date = CurDate;

	if ( global_settings.use_candidate_spot_source )
	{
		newSpot.entrance_type_id = this.entrance_type_id;
		newSpot.source_id = this.source_id;
	}

	update_spot_state( newSpot );

	vacancy = GetForeignElem( vacancies, vacancyID );

	if ( fields_usage.use_object_field( 'vacancy', 'recruit_type_id' ) && ! recruit_type_id.HasValue )
		recruit_type_id = vacancy.recruit_type_id;

	if ( vacancy.recruit_type_id.ForeignElem.use_candidate_position_type && ! position_type_id.HasValue )
		position_type_id = vacancy.position_type_id;

	if ( fields_usage.use_object_field( 'vacancy', 'profession_id' ) && fields_usage.use_object_field( 'candidate', 'profession_id' ) && global_settings.init_candidate_profession_from_vacancy && ( ! profession_id.HasValue || AppModuleUsed( 'module_hoff' ) ) )
	{
		if ( vacancy.profession_id.HasValue )
		{
			profession_id.ObtainByValue( vacancy.profession_id );
			lib_voc.update_idata_by_voc( profession_id );
		}

		if ( AppModuleUsed( 'module_hoff' ) && vacancy.location_id.HasValue )
		{
			location_id = vacancy.location_id;
			lib_voc.update_idata_by_voc( location_id );
		}
	}

	if ( global_settings.use_candidate_select_event )
	{
		if ( AppModuleUsed( 'module_sns' ) )
		{
			eventData = new Object;
			eventData.vacancy_id = vacancyID;

			lib_candidate.AddCandidateEvent( this, 'candidate_select', eventData, {isSilent:true} );
		}
		else
		{
			eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
			eventDoc.TopElem.type_id = 'candidate_select';
			eventDoc.TopElem.date = newSpot.start_date;
			eventDoc.TopElem.candidate_id = id;
			eventDoc.TopElem.vacancy_id = vacancyID;
			eventDoc.RunActionOnSave = false;
			eventDoc.Save();

			build_target_events();
			update_state();
		}
	}

	/*if ( AppModuleUsed( 'module_sanofi' ) )
	{
		lib_recruit.send_add_spot_notif( id.Parent, vacancyID );
	}*/

	main_vacancy_id = get_main_vacancy_id();
	return newSpot;
}


function handle_delete_spot( spot )
{
	vacancy = spot.vacancy_id.ForeignElem;

	if ( vacancy.final_candidate_id == id || vacancy.multi_final_candidate_id.ByValueExists( id ) )
	{
		vacancyDoc = ObtainUiDoc( spot.vacancy_id.ForeignObjectUrl );
		
		vacancyDoc.TopElem.multi_final_candidate_id.DeleteByValue( id );
		vacancyDoc.TopElem.check_next_final_candidate();

		vacancyDoc.TopElem.final_candidate_source_id.Clear();
		vacancyDoc.TopElem.idata_final_candidate_source_id.Clear();
		vacancyDoc.TopElem.final_candidate_state_id.Clear();
		UpdateUiDoc( vacancyDoc );
	}

	spot.Delete();
	Doc.SetChanged( true );
}


function restore_prev_spots()
{
	for ( vacancyID in ArraySelectDistinct( ArrayExtract( get_ui_events_array(), 'vacancy_id' ) ) )
	{
		if ( vacancyID == null )
			continue;

		if ( spots.GetOptChildByKey( vacancyID ) != undefined )
			continue;

		spot = spots.AddChild();
		spot.vacancy_id = vacancyID;
		spot.start_date = ArrayMin( get_spot_ui_events_array( spot ), 'date' ).date;
	}
}


function is_not_rejected_for_vacancy( vacancyID )
{
	spot = spots.GetOptChildByKey( vacancyID );
	if ( spot == undefined )
		return false;
	
	return ( ! StrContains( spot.state_id, 'reject' ) );
}


function handle_link_to_person()
{
	personID = lib_base.select_object_from_view( 'persons' );
	person = GetForeignElem( persons, personID );

	if ( person.is_candidate )
		throw UserError( UiText.errors.cannot_link_candidate_to_candidate );

	if ( person.candidate_id.HasValue && person.candidate_id != id )
		throw UserError( UiText.errors.person_already_linked_to_candidate );

	if ( person.fullname != fullname )
		lib_base.ask_warning_to_continue( Screen, UiText.messages.candidate_pserson_fullname_mismatch );

	link_to_person( personID );
	Doc.SetChanged( true );
}


function link_to_person( personID )
{	
	if ( person_id.HasValue )
	{
		personDoc = DefaultDb.OpenObjectDoc( 'person', person_id );
		personDoc.TopElem.candidate_id.Clear();
		personDoc.Save();
	}
	else
	{
		DefaultDb.DeleteObjectDoc( 'person', id, true );
	}

	personDoc = DefaultDb.OpenObjectDoc( 'person', personID );
	personDoc.TopElem.candidate_id = id;
	personDoc.Save();

	person_id = personID;
}


function unlink_from_person()
{	
	if ( ! person_id.HasValue )
		return;

	personDoc = DefaultDb.OpenObjectDoc( 'person', person_id );
	personDoc.TopElem.candidate_id.Clear();
	personDoc.Save();

	person_id.Clear();
}


function start_event_editing()
{
}





function init_target_events()
{
	if ( view.target_events_loaded )
		return;

	build_target_events();
}


function build_target_events()
{
	//DebugMsg( 'build_target_events' );

	for ( targetEvent in view.target_events )
		targetEvent.event_ref.Clear();

	for ( event in get_events_array() )
	{
		targetEvent = view.target_events.ObtainChildByKey( event.id );

		if ( targetEvent.mod_event_doc_ref.HasValue )
			targetEvent.event_ref = targetEvent.mod_event;
		else
			targetEvent.event_ref = event;
	}

	
	for ( targetEvent in ArraySelectAll( view.target_events ) )
	{
		if ( ! targetEvent.event_ref.HasValue )
		{
			//if ( targetEvent.mod_event_doc_ref.HasValue )
				//targetEvent.mod_event_doc_ref.Object.SetChanged( false );

			targetEvent.Delete();
		}
	}

	view.target_events_loaded = true;
	group_target_events_by_date();

	for ( targetEvent in view.target_events )
	{
		targetEvent.groupEvent = undefined;
		targetEvent.group_event_requires_completion = false;

		if ( ! targetEvent.event.type.is_group_event_reg || ! targetEvent.event.group_event_id.HasValue )
			continue;

		targetEvent.groupEvent = targetEvent.event.group_event_id.ForeignElem;

		if ( lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
		{
			resultEventType = ArrayOptFind( lib_voc.get_sorted_voc( event_types ), 'is_group_event_result && group_event_type_id == targetEvent.event.type.group_event_type_id' );
			if ( resultEventType == undefined )
				continue;

			resultEvent = ArrayOptFind( get_ui_events_array(), 'type_id == resultEventType.id && group_event_id == targetEvent.event.group_event_id' );
			if ( resultEvent != undefined )
				continue;

			if ( ! targetEvent.groupEvent.date.HasValue )
				continue;

			if ( targetEvent.groupEvent.date < CurDate && DateDiff( CurDate, targetEvent.groupEvent.date ) > 30 * 86400 )
				continue;

			if ( targetEvent.event.occurrence_id == 'cancelled' )
				continue;

			targetEvent.group_event_requires_completion = true;
			targetEvent.groupEventResultEventType = resultEventType;
		}
	}
}


function group_target_events_by_date()
{
	view.target_events.Sort( 'event_ref.Object.state_date', '-' );

	view.target_event_groups.Clear();

	prevTargetEvent = undefined;
	targetGroup = undefined;

	for ( targetEvent in view.target_events )
	{
		if ( prevTargetEvent == undefined || prevTargetEvent.event.vacancy_id != targetEvent.event.vacancy_id )
		{
			targetGroup = view.target_event_groups.AddChild();
			targetGroup.vacancy_id = targetEvent.event.vacancy_id;
		}
		
		targetEvent.group_index = view.target_event_groups.ChildNum - 1;
		targetGroup.events_count++;

		prevTargetEvent = targetEvent;
	}
}


function set_target_event_sel( targetEvent )
{
	for ( otherTargetEvent in view.target_events )
		otherTargetEvent.has_sel = false;

	targetEvent.has_sel = true;
}


function open_target_event( targetEvent )
{
	eventDocUrl = DefaultDb.GetRecordPrimaryObjectUrl( targetEvent.event );
	isOpened = ( FindOptScreenByDocUrl( eventDocUrl ) != undefined );

	if ( targetEvent.mod_event_doc != undefined && targetEvent.mod_event_doc.IsChanged && ! isOpened )
	{
		eventDoc = OpenDoc( eventDocUrl );
		eventDoc.TopElem.AssignElem( targetEvent.event );
		CreateDocScreen( eventDoc );
	}
	else
	{
		ObtainDocScreen( eventDocUrl );
	}
}


function save_changed_target_events()
{
	for ( targetEvent in view.target_events )
	{
		if ( targetEvent.mod_event_doc_ref.HasValue && targetEvent.mod_event_doc.IsChanged )
		{
			targetEvent.mod_event_doc.TopElem.check();

			targetEvent.mod_event_doc.RunActionOnSave = ! Doc.IsChanged;
			targetEvent.mod_event_doc.Save();
			targetEvent.mod_event_doc.SetChanged( false );
		}
	}
}


function handle_event_changed( srcEvent )
{
	//DebugMsg( 'handle_event_changed' );
	//prevStateID = RValue( state_id );
	//prevStateDate = RValue( state_date );

	update_state();

	//if ( state_id != prevStateID && state_date >= prevStateDate )
}


function handle_ui_event_changed( srcEvent, action )
{
	prevStateID = RValue( state_id );

	//build_target_events();
	view.target_events_loaded = false;
	update_state();

	if ( /*AppModuleUsed( 'module_rgs' ) &&*/ srcEvent != undefined && srcEvent.OptScreen != undefined && state_id != prevStateID && ( stateEvent = get_state_event() ) != undefined && stateEvent.id == srcEvent.id )
	{
		lib_candidate.RunCandidateStateCoreActions( id.Parent, srcEvent, srcEvent.type.get_opt_occurrence( srcEvent.occurrence_id ), 1 );
	}
	
	lib_base.SaveOptScreenObject( this );

	if ( action == 'delete' && srcEvent != undefined )
	{
		if ( srcEvent.vacancy_id.HasValue )
		{
			try
			{
				vacancyDoc = ObtainUiDoc( srcEvent.vacancy_id.ForeignObjectUrl );
				lib_vacancy.update_vacancy_recruit_phase( vacancyDoc.TopElem );
				UpdateUiDoc( vacancyDoc );
			}
			catch ( e )
			{
				lib_base.show_error_message( ActiveScreen, e );
			}
		}

		if ( srcEvent.type_id.ForeignElem.use_training_group && srcEvent.training_group_id.HasValue )
		{
			try
			{
				trainingGroupDoc = ObtainUiDoc( srcEvent.training_group_id.ForeignObjectUrl );
				trainingGroup = trainingGroupDoc.TopElem;
				
				if ( ( participant = trainingGroup.participants.GetOptChildByKey( this.id ) ) != undefined )
					participant.Delete();

				UpdateUiDoc( trainingGroupDoc );
			}
			catch ( e )
			{
				lib_base.show_error_message( ActiveScreen, e );
			}
		}
	}
	
	if ( OptScreen != undefined )
		Screen.Update();
}


function handle_event_opened( srcEvent )
{
	targetEvent = view.target_events.GetOptChildByKey( srcEvent.id );
	if ( targetEvent == undefined )
		return;

	set_target_event_sel( targetEvent );
	Screen.ExposeItemBySource( targetEvent );
}




function build_mail_env_object( vacancyID )
{
	object = new Object;
	object.candidate = id.Parent;
	object.vacancy_id = vacancyID;

	if ( vacancyID != null )
	{
		lib_base.CheckFieldReference( vacancyID, vacancies, this );

		object.vacancyDoc = DefaultDb.OpenObjectDoc( 'vacancy', vacancyID );
		object.vacancy = object.vacancyDoc.TopElem;
	}
	else
	{
		object.vacancy = OpenNewDoc( 'rcr_vacancy.xmd', 'separate=1' ).TopElem;
	}

	if ( global_settings.is_agency )
	{
		if ( object.vacancy.org_id.HasValue )
		{
			object.orgDoc = DefaultDb.OpenObjectDoc( 'org', object.vacancy.org_id );
			object.org = object.orgDoc.TopElem;
		}
		else
		{
			object.org = OpenNewDoc( '//base2/base2_org.xmd', 'separate=1' ).TopElem;
		}
	}
	else
	{
		if ( object.vacancy.division_id.HasValue && global_settings.use_divisions )
		{
			lib_base.CheckFieldReference( object.vacancy.division_id, divisions, object.vacancy );

			object.orgDoc = DefaultDb.OpenObjectDoc( 'division', object.vacancy.division_id );
			object.org = object.orgDoc.TopElem;
		}
		else
		{
			object.org = OpenNewDoc( '//base2/base2_org.xmd', 'separate=1' ).TopElem;
		}
	}

	rrPerson = ArrayOptFind( object.vacancy.rr_persons, 'person_id.OptForeignElem != undefined' );
	if ( rrPerson != undefined )
	{
		object.personDoc = DefaultDb.OpenObjectDoc( 'person', rrPerson.person_id );
		object.person = object.personDoc.TopElem;
	}
	else
	{
		object.person = OpenNewDoc( '//base2/base2_person.xmd', 'separate=1' ).TopElem;
	}
		
	return object;
}


function build_mail_ext_recipients( message, emplate, vacancyID )
{
	return;
	
	
	if ( template.dest_type != 'person' )
		return;

	if ( ! template.register_event || template.event_type_id == '' )
		return;

	if ( vacancyID == null || ( vacancy = GetOptForeignElem( vacancies, vacancyID ) ) == undefined || vacancy.org_id == null )
		return;

	array = XQuery( 'for $elem in persons where $elem/org_id = ' + vacancy.org_id + ' return $elem' );
	for ( person in array )
	{
		if ( person.email == '' )
			continue;

		attendEvent = person.attend_events.GetOptChildByKey( template.record_type_id );
		if ( attendEvent == undefined )
			continue;

		recipient = message.recipients.ObtainChildByKey( person.email, 'address' );
		//recipient.address = person.email;
	}
}


function register_mail_message_event( template, vacancyID )
{
	if ( ! template.register_event || ! template.event_type_id.HasValue )
		return;

	if ( ! template.event_type_id.ForeignElem.is_active )
		throw UiError( 'Event type is disabled: ' + template.event_type_id.ForeignDispName );

	eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
	
	eventDoc.TopElem.type_id = template.event_type_id;
	eventDoc.TopElem.date = CurDate;
	eventDoc.TopElem.candidate_id = id;
	eventDoc.TopElem.vacancy_id = vacancyID;
	eventDoc.Save();

	eventDoc.TopElem.on_ui_save();
}


function get_ft_secondary_text()
{
	str = '';

	for ( event in get_ui_events_array() )
	{
		if ( event.comment.HasValue )
			str += event.comment + '\n';
	}

	return str;
}


function get_recruit_type()
{
	if ( recruit_type_id.HasValue )
		return recruit_type_id.ForeignElem;

	return lib_recruit.GetDefaultRecruitType();
}


function spots_prohibited()
{
	if ( ! lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
		return false;

	if ( ! lib_app2.AppFeatureEnabled( 'classic_recruit' ) )
		return true;

	return get_recruit_type().prohibit_spots;
}


function position_type_enabled( candidate )
{
	if ( ! lib_app2.AppFeatureEnabled( 'mass_recruit' ) )
		return false;

	return get_recruit_type().use_candidate_position_type;
}


function CalcLine1ItemWidthMeasure( field )
{
	if ( field.FormElem.Name == 'country_id' )
		return lib_voc.CalcVocElemSelectorWidthMeasure( field, 15, 20 );

	if (System.IsWebClient)
	{
		if (field.FormElem.Name == 'metro_station_id')
			return '15zr';

		if (show_metro_station())
			return '50%';

		return '100%';
	}
	else
	{
		if (show_metro_station())
			return '33%';

		return '40%';
	}
	//lib_voc.CalcVocElemSelectorWidthMeasure( Ps.location_id, 20, ( fields_usage.use_object_field( 'candidate', 'job_search_location_id' ) ? 15 : ( Ps.show_metro_station() ? 20 : 30 ) ) )
}