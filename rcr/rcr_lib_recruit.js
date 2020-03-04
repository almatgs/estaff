function IsHireEventType( eventTypeID, candidate )
{
	recruitType = candidate.get_recruit_type();
	if ( recruitType.hire_event_type_id.HasValue )
		return recruitType.hire_event_type_id.ByValueExists( eventTypeID );
	else
		return ( eventTypeID == 'hire' || eventTypeID == 'probation' );
}


function select_group_event( groupEventTypeID )
{
	viewID = lib_base.object_name_to_catalog_name( groupEventTypeID );
	if ( ArrayOptFindByKey( views, viewID ) != undefined )
	{
		viewFilter = new Object;
		viewFilter.has_free_places = true;
		viewFilter.min_date = StrXmlDate( CurDate );

		groupEventID = lib_base.select_object_from_view( viewID, viewFilter );
	}
	else
	{
		viewFilter = new Object;
		viewFilter.type_id = groupEventTypeID;
		viewFilter.has_free_places = true;
		viewFilter.min_date = StrXmlDate( CurDate );

		groupEventID = lib_base.select_object_from_view( 'events', viewFilter );
	}

	return groupEventID;
}


function SelectFutureTrainingGroup()
{
	viewFilter = new Object;
	viewFilter.min_start_date = StrXmlDate( CurDate );

	return lib_base.select_object_from_view( 'training_groups', viewFilter );
}


function run_triggers_on_candidate_state_changed( candidateID )
{
	if ( ! rcr_config.trigger_on_candidate_state_changed.lib_name.HasValue )
		return;

	lib = eval( rcr_config.trigger_on_candidate_state_changed.lib_name );
	CallObjectMethod( lib, rcr_config.trigger_on_candidate_state_changed.method_name, [candidateID] )
}


function init_event_participants( event )
{
	eventType = event.type;

	if ( ! eventType.use_participants || ! eventType.use_participants_auto_load )
		return;

	vacancy = undefined;

	if ( event.vacancy_id.HasValue )
	{
		vacancy = event.vacancy_id.ForeignElem;

		for ( rrPerson in vacancy.rr_persons )
		{
			person = rrPerson.person_id.ForeignElem;

			if ( eventType.participants_auto_load.restrict_vacancy_rr_persons && ! person.participant_events.ChildByKeyExists( eventType.id ) )
				continue;

			if ( person.is_rr_viewer )
				continue;

			participant = event.participants.ObtainChildByKey( rrPerson.person_id );
		}

		if ( eventType.participants_auto_load.use_vacancy_orig_rr_person && vacancy.orig_rr_person_id.HasValue )
			participant = event.participants.ObtainChildByKey( vacancy.orig_rr_person_id );
	}

	if ( eventType.participants_auto_load.restrict_own_persons )
	{
		array = XQuery( 'for $elem in persons where MatchSome( $elem/participant_events/participant_event/event_type_id, ' + event.type_id.XQueryLiteral + ' ) and $elem/is_active return $elem' );
		for ( person in array )
		{
			if ( person.participant_event_group_id.HasValue && ! person.participant_event_group_id.ByValueExists( event.group_id ) )
				continue;

			participant = event.participants.ObtainChildByKey( person.id );
		}
	}

	if ( eventType.participants_auto_load.use_persons_with_struct_role && eventType.participants_auto_load.person_struct_role_type_id.HasValue )
	{
		array = XQuery( 'for $elem in person_struct_roles where MatchSome( $elem/type_id, ' + eventType.participants_auto_load.person_struct_role_type_id.XQueryLiteral + ' ) return $elem/Fields( "id","person_id","division_id" )' );
		for ( structRole in array )
		{
			if ( structRole.division_id.HasValue )
			{
				if ( vacancy == undefined || ! vacancy.division_id.HasValue )
					continue;

				if ( ! lib_base.is_catalog_hier_child_or_self( divisions, vacancy.division_id, structRole.division_id ) )
					continue;
			}

			person = structRole.person_id.ForeignElem;
			if ( ! person.is_active )
				continue;

			participant = event.participants.ObtainChildByKey( structRole.person_id );
		}
	}
}


function handle_candidate_event_saved( event )
{
	//DebugMsg( 'handle_candidate_event_saved' );
	if ( event.occurrence.create_notification )
	{
		candidate = event.candidate_id.ForeignElem;
		options = {object_state_id:event.state_id, vacancy_id:event.vacancy_id};

		if ( AppModuleUsed( 'module_sanofi' ) && event.type_id == 'testing' )
			options.user_id = event.user_id;

		lib_notif.create_notification( event.state_name, event.candidate_id.ForeignElem, options );
	}
}


function get_sorted_candidate_states()
{
	array = lib_voc.get_sorted_voc( candidate_states );
	array = ArraySelect( array, '! event_type_id.ForeignElem.target_group_id.HasValue || event_type_id.ForeignElem.target_group_id.ByValueExists( ' + CodeLiteral( lib_user.active_user_info.main_group_id ) + ' )' );
	return array;
}


function UpdateVacancyOnCandidateEvent( candidate, event )
{
	if ( ! event.vacancy_id.HasValue )
		return;

	occurrence = event.type.get_occurrence( event.occurrence_id );
	if ( ! occurrence.make_candidate_final && ! occurrence.deactivate_object && ! rcr_config.use_vacancy_recruit_phases )
		return;

	vacancyDoc = ObtainUiDoc( event.vacancy_id.ForeignObjectUrl );
	vacancy = vacancyDoc.TopElem;
	docWasChanged = vacancyDoc.IsChanged;

	//if ( vacancy.is_mass_vacancy )

	if ( ! vacancy.view.prev_data.state_id.HasValue )
		vacancy.view.prev_data.state_id = vacancy.state_id;

	isChanged = false;
	instance = undefined;

	if ( event.type_id == 'job_offer' && event.occurrence_id == '' )
	{
		if ( vacancy.job_offer_date != event.date )
		{
			vacancy.job_offer_date = event.date;
			isChanged = true;
		}
	}
	else if ( event.type_id == 'job_offer' && event.occurrence_id == 'succeeded' )
	{
		if ( vacancy.job_offer_acceptance_date != event.date )
		{
			vacancy.job_offer_acceptance_date = event.date;
			isChanged = true;
		}
	}

	if ( occurrence.make_candidate_final )
	{
		if ( vacancy.final_candidate_id != candidate.id )
		{
			vacancy.final_candidate_id = candidate.id;
			isChanged = true;
		}

		if ( ! vacancy.multi_final_candidate_id.ByValueExists( candidate.id ) && ArrayCount( vacancy.multi_final_candidate_id ) < 20 )
		{
			vacancy.multi_final_candidate_id.Add().Value = candidate.id;
			isChanged = true;
		}

		if ( vacancy.is_mp_vacancy )
		{
			instance = vacancy.instances.GetOptChildByKey( candidate.id, 'final_candidate_id' );
			if ( instance == undefined )
				instance = vacancy.get_first_free_opened_instance();
			if ( instance == undefined )
				instance = vacancy.get_first_opened_instance();

			if ( instance != undefined && global_settings.use_fractional_mp_vacancies )
			{
				if ( ! candidate.day_ratio.HasValue )
					candidate.day_ratio = ask_candidate_day_ratio( candidate );

				vacancy.adjust_instances_for_day_ratio( instance, candidate );
			}

			if ( instance != undefined && instance.final_candidate_id != candidate.id )
			{
				if ( instance.req_quantity > 1 )
				{
					newInstance = vacancy.instances.InsertChild( instance.ChildIndex );
					newInstance.AssignElem( instance );
					newInstance.id = UniqueID();
					newInstance.req_quantity = 1;
					instance.req_quantity--;
					instance = newInstance;
				}

				instance.final_candidate_id = candidate.id;
				isChanged = true;
			}
		}
	}
	else if ( occurrence.remove_candidate_from_final && vacancy.multi_final_candidate_id.ByValueExists( candidate.id ) )
	{
		vacancy.multi_final_candidate_id.DeleteByValue( candidate.id );
		isChanged = true;

		if ( vacancy.final_candidate_id == candidate.id )
			vacancy.check_next_final_candidate();
	}

	if ( event.occurrence.change_vacancy_state && event.occurrence.next_vacancy_state_id.HasValue && event.occurrence.next_vacancy_state_id.ForeignElem.close_object )
	{
		if ( vacancy.is_mass_vacancy )
		{
			needClose = false;
		}
		else if ( vacancy.is_mp_vacancy )
		{
			needClose = false;

			if ( instance != undefined )
			{
				if ( lib_base.ask_question( ActiveScreen, StrReplaceOne( StrReplaceOne( UiText.messages.changes_vacancy_instance_xxx_state_to_xxx, '%s', vacancy.name ), '%s', event.occurrence.next_vacancy_state_id.ForeignDispName ) ) )
				{
					instance.state_id = event.occurrence.next_vacancy_state_id;
					instance.state_date = CurDate;

					isChanged = true;

					if ( vacancy.get_opened_instances_num() == 0 )
						needClose = true;
				}
			}
			else
			{
				needClose = true;
			}
		}
		else
		{
			needClose = true;
		}

		if ( AppModuleUsed( 'module_sanofi' ) )
		{
			if ( lib_vacancy.CheckVacancyAgencyOnClose( vacancy, candidate ) )
				isChanged = true;
		}

		if ( needClose )
		{
			if ( lib_base.ask_question( ActiveScreen, StrReplaceOne( StrReplaceOne( UiText.messages.changes_vacancy_xxx_state_to_xxx, '%s', vacancy.name ), '%s', event.occurrence.next_vacancy_state_id.ForeignDispName ) ) )
			{
				if ( event.occurrence.next_vacancy_state_id == 'vacancy_closed' && ArrayCount( ArraySelect( lib_voc.get_sorted_voc( vacancy_states ), 'close_object' ) ) > 1 )
					newVacancyStateID = lib_voc.select_voc_elem( vacancy_states, {close_object:true} );
				else
					newVacancyStateID = event.occurrence.next_vacancy_state_id;
				
				lib_vacancy.handle_set_vacancy_state( vacancyDoc.TopElem, newVacancyStateID, {askConfirmation:false, isOnClose:true} );

				if ( ! vacancy.is_mp_vacancy && ! vacancy.is_mass_vacancy )
				{
					vacancy.multi_final_candidate_id.Clear();

					if ( vacancy.final_candidate_id.HasValue )
						vacancy.multi_final_candidate_id.Add().Value = vacancy.final_candidate_id;
				}

				vacancyDoc.TopElem.check_deactivate();
				isChanged = true;
			}
		}
	}

	if ( rcr_config.use_vacancy_recruit_phases && vacancy.is_active && ! vacancy.is_mass_vacancy )
	{
		oldRecruitPhaseID = RValue( vacancy.recruit_phase_id );
		recruitPhase = lib_vacancy.GetMaxVacancyRecruitPhaseByEvent( event, candidate );
		if ( recruitPhase != undefined )
		{
			if ( recruitPhase.id != vacancy.recruit_phase_id && recruitPhase.order_index > vacancy.recruit_phase_id.ForeignElem.order_index )
			{
				vacancy.recruit_phase_id = recruitPhase.id;
				isChanged = true;
			}
			else if ( event.occurrence_id == 'cancelled' )
			{
				lib_vacancy.update_vacancy_recruit_phase( vacancy );
				if ( vacancy.recruit_phase_id != oldRecruitPhaseID )
				{
					isChanged = true;
				}
			}
		}
	}

	if ( isChanged )
	{
		if ( candidate.OptScreen != undefined && candidate.Doc.IsChanged )
			candidate.OptScreen.SaveDoc();
			
		if ( vacancyDoc.TopElem.OptScreen == undefined )
		{
			lib_vacancy_publish.CheckVacancyAutoDelete( vacancyDoc.TopElem );
			vacancyDoc.TopElem.check_change_state_notif();
		}

		//UpdateUiDoc( vacancyDoc );
		lib_base.save_opt_screen_doc( vacancyDoc );
	}
}


function ask_candidate_day_ratio( candidate )
{
	return lib_base.select_real_value( UiText.titles.select_candidate_day_ratio, 1 )
}




function get_opt_candidate_source_by_url( url )
{
	if ( url == '' )
		return undefined;

	for ( inetSite in candidate_sources )
	{
		if ( inetSite.is_site && lib_base.url_host_match( url, inetSite.id ) )
			return inetSite;

		for ( keyword in inetSite.keywords )
		{
			if ( lib_base.url_host_match( url, keyword ) )
				return inetSite;
		}
	}

	return undefined;
}


function merge_candidates( candidate, srcCandidate )
{
	if ( candidate.birth_date == null )
		candidate.birth_date = srcCandidate.birth_date;
	
	if ( candidate.birth_date == null && candidate.birth_year == null )
		candidate.birth_year = srcCandidate.birth_year;

	merge_fields( candidate.location_id, srcCandidate.location_id );
	merge_fields( candidate.address, srcCandidate.address );

	merge_fields_concat( candidate.home_phone, srcCandidate.home_phone );
	merge_fields_concat( candidate.work_phone, srcCandidate.work_phone );
	merge_fields( candidate.mobile_phone, srcCandidate.mobile_phone );

	strArray = ArraySelectDistinct( ArraySelect( [srcCandidate.email, srcCandidate.email2, RValue( candidate.email ), RValue( candidate.email2 )], 'This != \'\'' ) );
	if ( ArrayCount( strArray ) != 0 )
		candidate.email = strArray[0];
	
	if ( ArrayCount( strArray ) >= 2 )
		candidate.email2 = strArray[1];

	if ( StrEqual( candidate.email, candidate.email2, true ) )
		candidate.email2.Clear();

	merge_fields( candidate.skype, srcCandidate.skype );

	merge_fields( candidate.desired_position_name, srcCandidate.desired_position_name );

	for ( professionID in srcCandidate.profession_id )
		candidate.profession_id.ObtainByValue( professionID );
	
	lib_voc.update_idata_by_voc( candidate.profession_id );

	merge_fields( candidate.inet_uid, srcCandidate.inet_uid );

	if ( srcCandidate.prev_jobs.ChildNum != 0 )
		candidate.prev_jobs.AssignElem( srcCandidate.prev_jobs );

	if ( srcCandidate.prev_educations.ChildNum != 0 )
		candidate.prev_educations.AssignElem( srcCandidate.prev_educations );

	for ( srcDocument in srcCandidate.attachments )
	{
		srcCmpdData = get_card_attachment_cmp_data( srcDocument );
		if ( srcCmpdData == '' )
			continue;

		match = false;

		for ( document in candidate.attachments )
		{
			if ( document.type_id != srcDocument.type_id )
				continue;
			
			cmpData = get_card_attachment_cmp_data( document );
			
			if ( StrLen( cmpData ) == StrLen( srcCmpdData ) && cmpData == srcCmpdData )
			{
				match = true;
				break;
			}
		}

		if ( ! match )
		{
			document = candidate.attachments.AddChild();
			document.AssignElem( srcDocument );
		}
	}

	for ( srcSpot in srcCandidate.spots )
	{
		spot = candidate.spots.ObtainChildByKey( srcSpot.vacancy_id );
		spot.AssignElem( srcSpot );
	}

	for ( event in srcCandidate.get_events_array() )
	{
		eventDoc = OpenDoc( event.PrimaryObjectUrl );
		eventDoc.TopElem.candidate_id = candidate.id;
		eventDoc.Save();
	}

	//DebugMsg( candidate.Xml );
}


function get_card_attachment_cmp_data( attachment )
{
	if ( attachment.is_text || attachment.is_plain_text )
		return Trim( attachment.resolve_plain_text() );
	else
		return attachment.data;
}


function merge_fields( field, srcField )
{
	if ( ! field.HasValue )
		field.Value = srcField.Value;
}


function merge_fields_concat( field, srcField, delimStr )
{
	if ( ! field.HasValue )
	{
		field.Value = srcField.Value;
		return;
	}

	if ( delimStr == undefined )
		delimStr = '; ';

	if ( srcField.HasValue && ! StrContains( field.Value, srcField.Value ) )
		field.Value += delimStr + srcField.Value;
}



function select_active_vacancy()
{
	return lib_base.select_object_from_view( 'vacancies_active' );
}


function select_active_vacancies()
{
	return lib_base.select_objects_from_view( 'vacancies_active' );
}


function build_org_candidate_source( org )
{
	source = ArrayOptFindByKey( candidate_sources, org.id, 'org_id' );
	if ( source != undefined )
		return;

	sourceDoc = OpenNewDoc( 'rcr_candidate_source.xmd' );
	sourceDoc.TopElem.id = StrHexInt( org.id, 16 );
	sourceDoc.Url = ObjectDocUrl( 'data', 'candidate_source', sourceDoc.TopElem.id );

	sourceDoc.TopElem.name = org.name;
	sourceDoc.TopElem.org_id = org.id;

	if ( org.is_recruiting_agency && ( baseSource = ArrayOptFindByKey( candidate_sources, 'agency' ) ) != undefined )
		sourceDoc.TopElem.parent_id = baseSource.id;

	sourceDoc.Save();
}


function register_own_site()
{
	rw_tools_ext.register_custom_site( 'own', rc_global_settings.own_site.name, rc_global_settings.own_site.short_name );

	if ( rc_global_settings.own_site.use_common_professions )
		rw_tools_ext.register_custom_site_professions( 'own', professions.items );
	else
		rw_tools_ext.register_custom_site_professions( 'own', own_site_professions.items );
}


function candidate_event_date_str( date, candidate, event )
{
	if ( date == null || Hour( date ) == undefined )
		return date;
	
	/*if ( fields_usage.use_object_field( 'candidate', 'time_zone' ) && candidate.time_zone.HasValue && candidate.time_zone != GetLocalTimeZone() )
		str = StrDate( DateToTimeZoneDate( date, candidate.time_zone ), {ShowSeconds:false} ) + ' (' + ( candidate.time_zone >= 0 ? '+' : '' ) + StrSignedInt( candidate.time_zone, 2 ) + ':00)';
	else
		str = StrDate( date, {ShowSeconds:false,ShowLocalTime:true} );*/

	if ( global_settings.show_candidate_event_date_in_event_timezone && event.time_zone.HasValue )
	{
		str = StrDate( DateToTimeZoneDate( date, event.time_zone ), {ShowSeconds:false} );
		
		if ( global_settings.show_candidate_event_other_timezone && event.time_zone != GetLocalTimeZone() )
			str += ' (' + ( event.time_zone >= 0 ? '+' : '' ) + StrSignedInt( event.time_zone, 2 ) + ':00)';
	}
	else
	{
		//DebugMsg( date.XmlValue );
		str = StrDate( date, {ShowSeconds:false,ShowLocalTime:true} );
	}

	return StrReplace( str, ' ', '  ' );
}


function candidate_event_scheduled_date_str( date, candidate, event )
{
	if ( event.is_calendar_entry && ( calendarEntry = GetOptForeignElem( calendar_entries, event.id ) ) != undefined && calendarEntry.local_date.HasValue )
	{
		if ( global_settings.show_candidate_event_date_in_event_timezone && event.time_zone.HasValue )
		{
			str = StrDate( calendarEntry.local_date, {ShowSeconds:false} );
		
			if ( global_settings.show_candidate_event_other_timezone && event.time_zone != GetLocalTimeZone() )
				str += ' (' + ( event.time_zone >= 0 ? '+' : '' ) + StrSignedInt( event.time_zone, 2 ) + ':00)';
		}
		else
		{
			//DebugMsg( date.XmlValue );
			str = StrDate( date, {ShowSeconds:false,ShowLocalTime:true} );
		}

		return StrReplace( str, ' ', '  ' );
	}
	else
	{
		return candidate_event_date_str( date, candidate, event );
	}
}


function copy_dir_test( srcDir, destDir )
{
}


function handle_select_candidates_for_vacancy( objectIDsArray )
{
	vacancyID = lib_base.select_object_from_view( 'vacancies' );

	select_candidates_for_vacancy( objectIDsArray, vacancyID );
}

	
function select_candidates_for_vacancy( objectIDsArray, vacancyID )
{
	for ( candidateID in objectIDsArray )
	{
		doc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
		candidate = doc.TopElem;
	
		if ( candidate.spots.ChildByKeyExists( vacancyID ) )
		{
			lib_base.show_warning_message( ActiveScreen, StrReplace( UiText.errors.candidate_xxx_already_selected_for_this_vacancy, '%s', candidate.fullname ) );
			continue;
		}

		if ( ! global_settings.allow_multi_spots && ArrayOptFind( candidate.spots, 'is_active' ) != undefined )
			throw UserError( UiText.errors.multi_spots_prohibited );

		candidate.add_spot( vacancyID );
		doc.Save();
	}
}


function detach_candidates_from_vacancy( objectIDsArray, vacancyID )
{
	lib_base.ask_warning_to_continue( ActiveScreen, UiText.messages.detach_candidates_from_vacancy );

	for ( candidateID in objectIDsArray )
	{
		candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
		candidate = candidateDoc.TopElem;
	
		if ( ( spot = candidate.spots.GetOptChildByKey( vacancyID ) ) != undefined )
			spot.Delete();

		candidateDoc.Save();
	}
}


function handle_send_candidates_to_rr_person( objectIDsArray, list )
{
	fixedVacancyID = null;

	if ( list != undefined )
	{
		if ( list.Screen.Doc.TopElem.Name == 'vacancy' )
			fixedVacancyID = RValue( list.Screen.Doc.TopElem.id );
		else if ( list.Screen.Doc.TopElem.PathExists( 'curVacancyID' ) )
			fixedVacancyID = RValue( list.Screen.Doc.TopElem.curVacancyID );
	}

	templateID = lib_voc.select_voc_elem( mail_templates );
	templateDoc = lib_mail.get_template_doc( GetForeignElem( mail_templates, templateID ) );
	template = templateDoc.TopElem;
	
	count = 0;
	
	for ( candidateID in objectIDsArray )
	{
		doc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
		candidate = doc.TopElem;
	
		if ( candidate.main_vacancy_id == null )
			throw UserError( StrReplace( UiText.errors.candidate_xxx_not_selected_for_vacancy, '%s', candidate.fullname ) );

		if ( count == 0 )
		{
			if ( fixedVacancyID != null )
				vacancyID = fixedVacancyID;
			else
				vacancyID = RValue( candidate.main_vacancy_id );

			vacancy = GetForeignElem( vacancies, vacancyID );
			destPersonsArray = ArrayExtract( vacancy.rr_persons, 'person_id.ForeignElem' );
			destPersonsArray = ArraySelect( destPersonsArray, 'email.HasValue' );

			person = ArrayOptFirstElem( destPersonsArray );
			if ( person == undefined )
				person = GetFailedForeignElem( persons );

			email = ArrayMerge( destPersonsArray, 'email', ';' );

			mailMessage = lib_mail.build_mail_message( template, email, person, candidate.build_mail_env_object( vacancyID ) );
		}
		else
		{
			if ( fixedVacancyID == null && candidate.main_vacancy_id != vacancyID )
				throw UserError( StrReplace( UiText.errors.candidate_xxx_selected_for_different_vacancy, '%s', candidate.fullname ) );

			lib_mail.build_mail_attachments( mailMessage, template, person, candidate.build_mail_env_object( vacancyID ) );
		}

		count++;
	}

	//PutUrlData( 'z_message.xml', mailMessage.Xml );

	lib_mail.show_mail_message( mailMessage );

	if ( template.register_event && template.event_type_id.HasValue )
	{
		for ( candidateID in objectIDsArray )
		{
			doc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
			candidate = doc.TopElem;

			candidate.register_mail_message_event( template, vacancyID );
		}
	}
}


function handle_send_candidates_to_arbitrary_person( objectIDsArray, list )
{
	templateID = lib_voc.select_voc_elem( mail_templates );
	templateDoc = lib_mail.get_template_doc( GetForeignElem( mail_templates, templateID ) );
	template = templateDoc.TopElem;
	
	count = 0;
	
	for ( candidateID in objectIDsArray )
	{
		doc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
		candidate = doc.TopElem;

		if ( count == 0 )
		{
			mailMessage = lib_mail.build_mail_message( template, '', undefined, candidate.build_mail_env_object( null ) );
		}
		else
		{
			lib_mail.build_mail_attachments( mailMessage, template, undefined, candidate.build_mail_env_object( null ) );
		}

		count++;
	}

	lib_mail.show_mail_message( mailMessage );

	if ( template.register_event && template.event_type_id.HasValue )
	{
		for ( candidateID in objectIDsArray )
		{
			doc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
			candidate = doc.TopElem;

			candidate.register_mail_message_event( template, candidate.main_vacancy_id );
		}
	}
}


function handle_change_candidates_state( objectIDsArray, list )
{
	fixedVacancyID = null;

	if ( list != undefined )
	{
		if ( list.Screen.Doc.TopElem.Name == 'vacancy' )
			fixedVacancyID = RValue( list.Screen.Doc.TopElem.id );
		else if ( list.Screen.Doc.TopElem.PathExists( 'filter.spots__spot__vacancy_id' ) )
			fixedVacancyID = RValue( list.Screen.Doc.TopElem.filter.spots__spot__vacancy_id );
	}

	//stateID = lib_voc.select_voc_elem( candidate_states );
	state = lib_base.select_elem( lib_recruit.get_sorted_candidate_states() );
	stateID = state.id;
	if ( stateID == 'new' || stateID == 'unused' )
		throw UserError( UiText.errors.cannot_set_empty_state );

	lib_base.ask_warning_to_continue( ActiveScreen, UiText.warnings.change_candidates_state );
	
	for ( candidateID in objectIDsArray )
	{
		candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
		candidate = candidateDoc.TopElem;

		if ( candidate.state_id == stateID )
			continue;

		if (fixedVacancyID != null && (spot = candidate.spots.GetOptChildByKey(fixedVacancyID)) != undefined)
		{
			curState = spot.state_id.ForeignElem;
			curStateEvent = candidate.get_spot_state_event( spot );
		}
		else
		{
			curState = candidate.state_id.ForeignElem;
			curStateEvent = candidate.get_state_event();
		}
			
		if ( curStateEvent != undefined && curState.event_type_id == state.event_type_id )
		{
			eventDoc = OpenDoc(curStateEvent.PrimaryObjectUrl);
			event = eventDoc.TopElem;
			event.occurrence_id = state.event_occurrence_id;
			eventDoc.Save();

			lib_candidate.OnCandidateEventOccurrenceChange( candidate, event );
		}
		else
		{
			lib_candidate.SetCandidateState( candidate, stateID, {vacancy_id:( fixedVacancyID != null ? fixedVacancyID : candidate.main_vacancy_id )} );
			if ( candidateDoc.IsChanged )
				candidateDoc.Save();
		}
	}
}


function open_vacancy_instance( vacancyInstance )
{
	/*if ( vacancyInstance.vacancy_id == vacancyInstance.id )
	{
		return ObtainDocScreen( vacancyInstance.vacancy_id.ForeignObjectUrl );
	}

	return ObtainDocScreen( vacancyInstance.ObjectUrl );*/

	screen = ObtainDocScreen( vacancyInstance.vacancy_id.ForeignObjectUrl );
	if ( ! screen.Doc.TopElem.is_mp_vacancy )
		return screen;
	
	instance = screen.Doc.TopElem.instances.GetOptChildByKey( vacancyInstance.id );
	if ( instance == undefined )
		return screen;
	
	screen.Doc.TopElem.handle_open_instance( instance );
	return screen;
}


function get_group_by_division( divisionID )
{
	divisionsArray = lib_base.get_hier_chain( divisions, divisionID );

	for ( division in divisionsArray )
	{
		group = ArrayOptFind( groups, 'matches_explicit_division( division.id )' );
		if ( group != undefined )
			return group;
	}

	return undefined;
}








function handle_convert_divisions_to_orgs( objectIDsArray, list )
{
	for ( divisionID in objectIDsArray )
	{
		divisionDoc = DefaultDb.OpenObjectDoc( 'division', divisionID );

		orgDoc = DefaultDb.OpenNewObjectDoc( 'org', divisionID );
		orgDoc.TopElem.AssignElem( divisionDoc.TopElem );
		orgDoc.WriteDocInfo = false;
		orgDoc.Save();

		for ( person in ArraySelectAll( XQuery( 'for $elem in persons where $elem/division_id = ' + divisionID + ' return $elem' ) ) )
		{
			personDoc = OpenDoc( person.ObjectUrl );
			personDoc.TopElem.is_own_person = false;
			personDoc.TopElem.org_id = divisionID;
			personDoc.WriteDocInfo = false;
			personDoc.Save();

			/*
			for ( event in ArraySelectAll( XQuery( 'for $elem in events where $elem/person_id = ' + person.id + ' return $elem' ) ) )
			{
				if ( event.org_id.HasValue )
					continue;

				eventDoc = OpenDoc( event.ObjectUrl );
				eventDoc.TopElem.org_id = divisionID;
				eventDoc.WriteDocInfo = false;
				eventDoc.Save();
			}
			*/
		}
	}
}


function handle_update_candidate_state( candidateID )
{
	candidateDoc = OpenDoc( ObjectDocUrl( 'data', 'candidate', candidateID ) );
	candidateDoc.TopElem.update_state();
	
	candidateDoc.WriteDocInfo = false;
	candidateDoc.RunActionOnSave = false;
	
	try
	{
		candidateDoc.Save();
	}
	catch ( e )
	{
	}
}


function send_candidate_state_notif( candidate, stateEvent )
{
	template = stateEvent.type.state_notif_template_id.ForeignElem;

	otherEnv = candidate.build_mail_env_object( stateEvent.vacancy_id );
	otherEnv.event_web_link = lib_web.build_outer_url( 'event.htm', {id:stateEvent.id});

	if ( stateEvent.participants.ChildNum != 0 )
		srcArray = stateEvent.participants;
	else
		srcArray = stateEvent.vacancy_id.ForeignElem.rr_persons;

	for ( participant in srcArray )
	{
		destPerson = participant.person_id.ForeignElem;
		if ( destPerson.email == '' )
			continue;

		message = lib_mail.build_mail_message( template, destPerson.email, destPerson, otherEnv );
		lib_mail.send_mail_message( message );
	}
}


function OnNewVacancyLoaded( vacancy )
{
	create_loaded_vacancy_notif( vacancy );
}


function create_loaded_vacancy_notif( vacancy )
{
	lib_notif.create_notification( UiText.actions.new_vacancy, vacancy );

	if ( global_settings.staff_connector.vacancy_import.send_create_notif && global_settings.staff_connector.vacancy_import.create_notif_template_id.HasValue && global_settings.staff_connector.vacancy_import.create_notif_email.HasValue )
	{
		runner = new MethodRunner( lib_recruit, 'send_vacancy_create_notif' );
		runner.SetArguments( vacancy );
		runner.RunAsync = true;
		runner.Run();
	}
}


function send_vacancy_create_notif( vacancy )
{
	template = global_settings.staff_connector.vacancy_import.create_notif_template_id.ForeignElem;

	otherEnv = new Object;
	otherEnv.vacancy = vacancy;

	if ( ( group = get_group_by_division( vacancy.division_id ) ) != undefined && group.vacancy_import.create_notif_email.HasValue )
		email = group.vacancy_import.create_notif_email;
	else
		email = global_settings.staff_connector.vacancy_import.create_notif_email;

	message = lib_mail.build_mail_message( template, email, GetFailedForeignElem( persons ), otherEnv );
	lib_mail.send_mail_message( message );
}


function send_add_spot_notif( candidate, vacancyID )
{
	vacancy = ArrayOptFindByKey( vacancies, vacancyID );
	if ( vacancy.user_id.ForeignElem.main_group_id.ForeignElem.name == 'HR Recruitment' )
		return;

	if ( UseLds && vacancy.user_id == LdsCurUserID )
		return;

	destPerson = vacancy.user_id.ForeignElem.person_id.ForeignElem;
	if ( destPerson.email == '' )
		return;

	template = ArrayOptFindByKey( mail_templates, 'notify_candidate_select' );
	otherEnv = candidate.build_mail_env_object( vacancyID );

	message = lib_mail.build_mail_message( template, destPerson.email, destPerson, otherEnv );

	runner = new MethodRunner( lib_mail, 'send_mail_message' );
	runner.SetArguments( message );
	runner.RunAsync = true;
	runner.Run();

	//lib_mail.send_mail_message( message );
}


function guess_candidate_src_competitor_org( candidate )
{
	if ( candidate.src_competitor_org_id.HasValue )
		return;

	if ( candidate.prev_jobs.ChildNum == 0 )
		return;

	orgName = candidate.last_prev_job.org_name;
	if ( orgName == '' )
		return;

	match = false;

	for ( org in orgs )
	{
		if ( ! org.is_competitor )
			continue;

		if ( org.name.HasValue && StrContains( orgName, org.name, true ) )
		{
			match = true;
			break;
		}
		
		if ( org.full_name.HasValue && StrContains( orgName, org.full_name, true ) )
		{
			match = true;
			break;
		}
		if ( org.alt_name.HasValue && StrContains( orgName, org.alt_name, true ) )
		{
			match = true;
			break;
		}
	}

	if ( match )
		candidate.src_competitor_org_id = org.id;
}



"META:ALLOW-CALL-FROM-CLIENT:1";

function adjust_dep_views()
{
	view = ArrayOptFindByKey( views, 'divisions' );
	if ( view.was_customized || ArrayCount( view.frame_sub_view_id.Instances ) != 1 )
		return;

	if ( global_settings.use_positions )
		frameSubViewID = 'positions_of_division';
	else
		frameSubViewID = 'persons_of_division';

	if ( ArrayFirstElem( view.frame_sub_view_id ) != frameSubViewID )
	{
		doc = OpenDoc( view.ObjectUrl );
		ArrayFirstElem( view.frame_sub_view_id ).Value = frameSubViewID;
		doc.Save();
	}
}


function adjust_unbound_groups( objectName )
{
	array = XQuery( 'for $elem in ' + lib_base.object_name_to_catalog_name( objectName ) + ' where $elem/group_id = null() return $elem' );
	array = ArraySelect( array, 'user_id.HasValue' );

	for ( record in array )
	{
		group = record.user_id.ForeignElem.main_group_id.OptForeignElem;
		if ( group == undefined )
			continue;

		doc = OpenDoc( record.ObjectUrl );
		doc.TopElem.group_id = group.id;

		doc.WriteDocInfo = false;
		doc.RunActionOnSave = false;
		doc.Save();


	}
}


function init_org_types()
{
	if ( ! global_settings.is_agency )
		lib_voc.init_voc_std_data( org_types, FetchDoc( 'rcr_std_org_types_hr.xml' ).TopElem );

}


function old_app_data_exists()
{
	if ( AppActivationCode == '' )
		return false;

	try
	{
		ReadDirectoryByPath( FilePath( AppDirectoryPath(), 'data_converted' ) );
		return false;
	}
	catch ( e )
	{
	}

	try
	{
		ReadDirectoryByPath( FilePath( AppDirectoryPath(), 'data' ) );
	}
	catch ( e )
	{
		//alert( e );
		return false;
	}

	return true;
}


function old_heap_data_exists()
{
	if ( AppActivationCode == '' )
		return false;

	try
	{
		ReadDirectoryByPath( FilePath( AppDirectoryPath(), 'data_h_converted' ) );
		return false;
	}
	catch ( e )
	{
	}

	try
	{
		ReadDirectoryByPath( FilePath( AppDirectoryPath(), 'data_h' ) );
	}
	catch ( e )
	{
		//alert( e );
		return false;
	}

	return true;
}


function build_candidate_ratings_array()
{
	rcr_common.candidate_ratings.Clear();

	for ( i = global_settings.candidate_rating_min_value; i <= global_settings.candidate_rating_max_value; i++ )
	{
		entry = rcr_common.candidate_ratings.AddChild();
		entry.id = i;
		entry.name = i;
	}

	return rcr_common.candidate_ratings;
}


function handle_email_plugin_action( srcFile )
{
	MainScreen.BringWindowToFront();

	srcDoc = OpenDoc( srcFile, 'form=//gate/gate_email_plugin_action.xmd' );
	//PutUrlData( 'x-local://Logs/plugin_message.xml', srcDoc.TopElem.Xml );

	if ( false )
	{
		for ( item in srcDoc.TopElem.items )
		{
			if ( item.ChildExists( 'mime_body' ) && item.mime_body.HasValue )
			{
				PutUrlData( 'x-local://Logs/mime_message.eml', item.mime_body );
				message = MailMessageFromMimeStr( item.mime_body );
				item.AssignExtraElem( message );
			}
		}
	}

	switch ( srcDoc.TopElem.action_id )
	{
		case 'LoadResume':
			lib_storage_load.import_plugin_mail_messages( srcDoc.TopElem );
			break;

		case 'ShowEvent':
			lib_calendar.show_plugin_events( srcDoc.TopElem );
			break;

		case 'FindPerson':
			handle_find_person_action( srcDoc.TopElem );
			break;

		case 'AddCardAttachments':
			handle_add_card_attachments( srcDoc.TopElem );
			break;

		default:
			throw UserError( 'Unknown action: ' + srcDoc.TopElem.action_id );
	}

	DeleteFile( srcFile );
}


function handle_find_person_action( srcData )
{
	srcItem = srcData.items[0];

	if ( srcItem.item_type_id == 'calendar_entry' )
	{
		handle_find_person_by_ext_calendar_entry( srcData, srcItem );
		return;
	}

	if ( srcItem.ChildExists( 'mime_body' ) && srcItem.mime_body.HasValue )
	{
		PutUrlData( 'x-local://Logs/mime_message.eml', srcItem.mime_body );
		message = MailMessageFromMimeStr( srcItem.mime_body );
		srcItem.AssignElem( message );
	}

	if ( srcItem.sender.address == '' )
		throw UserError( 'Empty sender address' );

	array = XQuery( 'for $elem in persons where $elem/email = ' + XQueryLiteral( srcItem.sender.address ) + ' or $elem/email2 = ' + XQueryLiteral( srcItem.sender.address ) + ' return $elem' );
	if ( ArrayCount( array ) == 0 )
		throw UiError( StrReplaceOne( UiText.errors.person_with_email_xxx_not_found, 'xxx', srcItem.sender.address ) );

	for ( person in array )
		ObtainDocScreen( person.PrimaryObjectUrl );
}


function handle_add_card_attachments( srcData )
{
	srcItem = srcData.items[0];

	if ( srcItem.ChildExists( 'mime_body' ) && srcItem.mime_body.HasValue )
	{
		PutUrlData( 'x-local://Logs/mime_message.eml', srcItem.mime_body );
		message = MailMessageFromMimeStr( srcItem.mime_body );
		srcItem.AssignElem( message );
	}

	if ( srcItem.sender.address == '' )
		throw UserError( 'Empty sender address' );

	if ( srcItem.attachments.ChildNum == 0 )
		throw UiError( UiText.errors.no_message_attachments );

	array = XQuery( 'for $elem in candidates where $elem/email = ' + XQueryLiteral( srcItem.sender.address ) + ' or $elem/email2 = ' + XQueryLiteral( srcItem.sender.address ) + ' return $elem' );
	if ( ArrayCount( array ) == 1 )
	{
		candidateID = ArrayFirstElem( array ).id;
	}
	else
	{
		//throw UiError( StrReplaceOne( UiText.errors.candidate_with_email_xxx_not_found, 'xxx', srcItem.sender.address ) );

		candidateID = lib_base.select_object_from_view( 'candidates_with_state_all' );
	}

	dlgDoc = OpenNewDoc( 'rcr_dlg_mail_attachments_select.xml' );
	dlgDoc.TopElem.AssignElem( srcItem );

	ActiveScreen.ModalDlg( dlgDoc );

	screen = ObtainDocScreen( ObjectDocUrl( 'data', 'candidate', candidateID ) );
	candidate = screen.Doc.TopElem;

	for ( srcAttachment in dlgDoc.TopElem.attachments )
	{
		if ( srcAttachment.skip )
			continue;

		cardAttachment = candidate.attachments.AddChild();
		cardAttachment.file_name = srcAttachment.file_name;
		cardAttachment.content_type = 'application/binary';
		cardAttachment.data = srcAttachment.data;
		cardAttachment.type_id = srcAttachment.dest_card_attachment_type_id;
	}

	if ( ArrayOptFind( dlgDoc.TopElem.attachments, 'dest_card_attachment_type_id.ForeignElem.allow_multiple_files' ) != undefined )
		lib_base.MergeObjectAttachments( candidate );

	candidate.Doc.SetChanged( true );
	screen.Update();
}


function handle_find_person_by_ext_calendar_entry( srcData, srcItem )
{
	eidFieldName = srcData.email_app_id + '_eid';

	calendarEntry = ArrayOptFirstElem( XQuery( 'for $elem in calendar_entries where $elem/' + eidFieldName + ' = ' + XQueryLiteral( srcItem.id ) + ' return $elem' ) );
	if ( calendarEntry == undefined )
		throw UiError( UiText.errors.calendar_entry_by_ext_calendar_eid_not_found );

	lib_calendar.open_calendar_entry_ext( calendarEntry );
}


function handle_browser_plugin_action( srcFile )
{
	srcDoc = OpenDoc( srcFile, 'form=//gate/gate_browser_plugin_action.xmd' );
	//alert( srcDoc.TopElem.Xml );
	
	switch( srcDoc.TopElem.action_id )
	{
		case 'LoadResume':
			import_web_plugin_selection( srcDoc.TopElem );
			break;

		default:
			throw UserError( 'Unknown action: ' + srcDoc.TopElem.action_id );
	}

	DeleteFile( srcFile );
}


function import_web_plugin_selection( srcItem )
{
	MainScreen.BringWindowToFront();

	if ( ! srcItem.sel_html.HasValue )
	{
		import_web_plugin_page( srcItem );
		return;
	}

	doc = DefaultDb.OpenNewObjectDoc( 'candidate' );

	try
	{
		PutUrlData( 'x-local://Logs/web_resume.htm', srcItem.sel_html );
	}
	catch ( e )
	{
	}

	lib_resume.load_resume_text( doc.TopElem, srcItem.url, srcItem.sel_html, 'text/html', undefined );
	
	doc.TopElem.entrance_type_id = 'active_search';

	//record = doc.TopElem.records.AddChild();
	//record.type_id = 'inet_resume_load';

	doc.SetChanged( true );
	CreateDocScreen( doc );
}


function import_web_plugin_page( srcItem )
{
	doc = DefaultDb.OpenNewObjectDoc( 'candidate' );

	if ( AppConfig.GetOptProperty( 'debug-web-resume' ) == '1' && FilePathExists( filePath = FilePath( AppDirectoryPath(), 'web_resume.htm' ) ) )
	{
		srcItem.html = LoadFileData( filePath );
	}
	else
	{
		try
		{
			PutUrlData( 'x-local://Logs/web_resume.htm', srcItem.html );
		}
		catch ( e )
		{
		}
	}

	lib_imod.LoadWebResume( doc.TopElem, srcItem.url, srcItem.html );

	//lib_resume.load_resume_text( doc.TopElem, srcItem.url, srcItem.sel_html, 'text/html', undefined );
	

	//record = doc.TopElem.records.AddChild();
	//record.type_id = 'inet_resume_load';

	doc.SetChanged( true );
	CreateDocScreen( doc );
}


function preprocess_mail_message( mailMessage )
{
	// Under construction

	if ( message.ChildExists( 'mime_body' ) && message.mime_body.HasValue )
	{
		PutUrlData( 'x-local://Logs/mime_message.eml', message.mime_body );
		message = MailMessageFromMimeStr( message.mime_body );
		//message.AssignElem( newMessage );
	}
	else if ( message.html_body.HasValue && message.attachments.ChildNum != 0 )
	{
		message.html_body = lib_html.bind_cid_images( message.html_body, message );
	}

	preprocesedMessage = CreateElem( 'rcr_preprocessed_mail_message.xmd', 'preprocessed_mail_message' );
	
	if ( message.html_body.HasValue )
	{
		preprocesedMessage.body.html_text = message.html_body;
		preprocesedMessage.body.plain_text = HtmlToPlainText( message.html_body );
	}
	else
	{
		preprocesedMessage.body.plain_text = message.body;
	}

	preprocesedMessage.body.card_attachment_type_id = 'letter';

	for ( srcAttachment in mailMessage.attachments )
	{
		attachment = preprocesedMessage.attachments.AddChild();
		attachment.AssignElem( srcAttachment );
	}

	newAttc = parsedMessage.attachments.AddChild();
	newAttc.type_id = 'letter';

	if ( message.html_body != '' )
	{
		newAttc.content_type = 'text/html';
		newAttc.text = message.html_body;

		newAttc.text = AdjustHtml( newAttc.text, 'remove-scripts=1;remove-small-images=1;bind-ext-data=1' );
	}
	else
	{
		newAttc.content_type = 'text/plain';
		newAttc.plain_text = message.body;
	}

	for ( attc in message.attachments )
	{
		if ( attc.ChildExists( 'file_name' ) )
			attcName = attc.file_name;
		else
			attcName = attc.name;

		attcSuffix = StrLowerCase( UrlPathSuffix( attcName ) );

		if ( StrEnds( attcName, '.txt', true ) )
		{
			newAttc = parsedMessage.attachments.AddChild();
			newAttc.content_type = 'text/plain';
			newAttc.plain_text = attc.data.GetStr();
		}
		else if ( StrEnds( attcName, '.htm', true ) || StrEnds( attcName, '.html', true ) )
		{
			newAttc = parsedMessage.attachments.AddChild();
			newAttc.content_type = 'text/html';
			newAttc.text = attc.data.GetStr();

			newAttc.text = AdjustHtml( newAttc.text, 'remove-scripts=1;remove-small-images=1;bind-ext-data=1' );
		}
		else if ( lib_office.is_editor_file_suffix( attcSuffix ) )
		{
			newAttc = parsedMessage.attachments.AddChild();
			newAttc.content_type = 'text/html';

			tempUrl = ObtainTempFile( UrlPathSuffix( attcName ) );
			attc.data.SaveToFile( tempUrl );

			resources = lib_html.allocate_resource_list();

			try
			{
				newAttc.text = lib_office.doc_file_to_html( tempUrl, resources );
			}
			catch ( e )
			{
				//DeleteUrl( tempUrl );
				newAttc.has_risk = true;
				continue;
			}

			startTicks = GetCurTicks();

			while ( FileIsBusy( tempUrl ) && GetCurTicks() - startTicks < 2000 )
				Sleep( 100 );

			DeleteUrl( tempUrl );

			newAttc.name = attcName;
			newAttc.resources_ref = resources;
		}
		else if ( StrEnds( attcName, '.exe', true ) || StrEnds( attcName, '.bat', true ) || StrEnds( attcName, '.scr', true ) )
		{
			newAttc = parsedMessage.attachments.AddChild();
			newAttc.content_type = 'application/binary';
			newAttc.file_name = attcName;
			newAttc.has_risk = true;
		}
		else
		{
			if ( attcSuffix == '.bmp' || attcSuffix == '.gif' || attcSuffix == '.jpg' || attcSuffix == '.jpeg' || attcSuffix == '.png' || attcSuffix == '.pcx' )
			{
				if ( attc.data.Size <= 5 * 1024 )
					continue;
			}

			newAttc = parsedMessage.attachments.AddChild();
			newAttc.data.AssignElem( attc.data );
			newAttc.content_type = 'application/binary';
			newAttc.file_name = attcName;

			newAttc.build_preview_data();

			//alert( newAttc.file_name );
		}
	}

	parsedMessage.has_risk = ( ArrayOptFind( parsedMessage.attachments, 'has_risk' ) != undefined );

	for ( newAttc in parsedMessage.attachments )
	{
		if ( newAttc.content_type == 'text/html' )
		{
			//lib_resume.parse_resume( newAttc.parsed_info, '', newAttc.text, newAttc.content_type );
			newAttc.text = lib_resume.load_resume_text( newAttc.parsed_info, '', newAttc.text, newAttc.content_type, ( newAttc.resources_ref.HasValue ? newAttc.resources_ref.Object : undefined ) );
		}
		else if ( newAttc.content_type == 'text/plain' || newAttc.plain_text.HasValue )
		{
			lib_resume.parse_resume( newAttc.parsed_info, '', newAttc.plain_text, newAttc.content_type );
		}

		//alert( newAttc.parsed_info.resume_rating );
	}




	parsedMessage.date = message.date;
	parsedMessage.sender.AssignElem( message.sender );
	parsedMessage.subject = message.subject;


	bestAttc = ArrayFirstElem( ArraySort( parsedMessage.attachments, 'parsed_info.resume_rating', '-', 'parsed_info.firstname.HasValue', '-', 'file_name.HasValue', '-' ) );

	for ( newAttc in parsedMessage.attachments )
	{
		if ( newAttc.parsed_info.resume_rating == bestAttc.parsed_info.resume_rating )
		{
			if ( newAttc.type_id == '' )
				newAttc.type_id = 'resume';
		}
	}

	parsedMessage.parsed_info.AssignElem( bestAttc.parsed_info );


	if ( ! lib_resume.is_non_candidate_email( parsedMessage.sender.address ) )
	{
		if ( parsedMessage.parsed_info.email == '' )
			parsedMessage.parsed_info.email = parsedMessage.sender.address;
		else if ( parsedMessage.parsed_info.email2 == '' && parsedMessage.sender.address != parsedMessage.parsed_info.email )
			parsedMessage.parsed_info.email2 = parsedMessage.sender.address;
	}

	if ( global_settings.rparse.vacancy_mail_prefix != '' && ( pos = String( message.subject ).indexOf( global_settings.rparse.vacancy_mail_prefix ) ) >= 0 )
	{
		restStr = String( message.subject ).slice( pos + StrLen( global_settings.rparse.vacancy_mail_prefix ) );

		if ( ( pos = restStr.indexOf( ' ' ) ) >= 0 )
			 restStr = restStr.slice( 0, pos );

		vaacncy = ArrayOptFindByKey( vacancies, restStr, 'code' );
		if ( vaacncy != undefined )
			parsedMessage.req_vacancy_id = vaacncy.id;
	}
}


function handle_select_mail_message_attachments_before_import( parsedMessage )
{
	for ( attachment in parsedMessage.attachments )
	{
		//destAttachment.should_load = true;
		//destAttachment.card_attachment_type_id = 'resume';
	}

	dlgDoc = OpenNewDoc( 'rcr_dlg_mail_import.xml' );
	dlgDoc.TopElem.parsed_message_ref = parsedMessage;

	ActiveScreen.ModalDlg( dlgDoc );

	for ( attachment in ArraySelectAll( parsedMessage.attachments ) )
	{
		if ( attachment.skip )
			attachment.Delete();
	}

	return dlgDoc.TopElem;
}


function GetDefaultRecruitType()
{
	return GetForeignElem( recruit_types, GetDefaultRecruitTypeID() );
}


function GetDefaultRecruitTypeID()
{
	return '';
}


function GetUserActiveVacancyCount( userID )
{
	if ( LdsIsServer )
		return 0;

	UpdateUsersWorkload();
	
	entry = ArrayOptFindByKey( rcr_config.usersStat.entries, userID, 'userID' );
	if ( entry == undefined )
		return 0;

	return entry.activeVacanciesNum;
}


function GetUserCurWorkload( userID )
{
	if ( LdsIsServer )
		return 0;

	UpdateUsersWorkload();
	
	entry = ArrayOptFindByKey( rcr_config.usersStat.entries, userID, 'userID' );
	if ( entry == undefined )
		return 0;

	return entry.curWorkload;
}


function GetUserCurWorkloadBkColor( user )
{
	UpdateUsersWorkload();

	entry = ArrayOptFindByKey( rcr_config.usersStat.entries, user.id, 'userID' );
	if ( entry == undefined )
		return '';

	if ( entry.metricsSet == undefined || ! entry.metricsSet.max_cur_workload.HasValue )
		return '';

	if ( entry.curWorkload > entry.metricsSet.max_cur_workload )
		return '255,130,130';
	else if ( entry.curWorkload = entry.metricsSet.max_cur_workload )
		return '255,255,130';

	return '';
}


function UpdateUsersWorkload()
{
	if ( LdsIsServer )
		return;

	if ( rcr_config.usersStat != undefined && DateDiff( CurDate, rcr_config.usersStat.lastUpdateDate ) < 5 )
		return;

	if ( rcr_config.usersStat == undefined )
		rcr_config.usersStat = new Object;

	rcr_config.usersStat.entries = new Array;
	rcr_config.usersStat.lastUpdateDate = CurDate;

	queryStr = 'for $elem in vacancies where MatchSome( $elem/state_id, ( "vacancy_opened", "vacancy_reopened" ) )';
	queryStr += ' return $elem/Fields( "user_id","group_id","recruit_type_id","staff_category_id","recruit_metrics_set_id" )';

	array = XQuery( queryStr );

	for ( vacancy in array )
	{
		if ( ! vacancy.user_id.HasValue )
			continue;

		userStat = ArrayOptFindByKey( rcr_config.usersStat.entries, vacancy.user_id, 'userID' );
		if ( userStat == undefined )
		{
			userStat = new Object;
			userStat.userID = vacancy.user_id;
			userStat.activeVacanciesNum = 0;
			userStat.curWorkload = 0;
			userStat.metricsSet = GetUserRecruitMetricsSet( vacancy.user_id.ForeignElem );
		}

		if ( vacancy.recruit_metrics_set_id.HasValue )
			metricsSet = vacancy.recruit_metrics_set_id.ForeignElem;
		else
			metricsSet = lib_vacancy.GuessVacancyRecruitMetricsSet( vacancy );
		
		workload = 1;

		if ( metricsSet != undefined )
		{
			targetStaffCategory = metricsSet.target_staff_categories.GetOptChildByKey( vacancy.staff_category_id );
			if ( targetStaffCategory != undefined && targetStaffCategory.workload_multiplier.HasValue )
				workload = targetStaffCategory.workload_multiplier;
		}

		userStat.activeVacanciesNum++;
		userStat.curWorkload += workload;

		rcr_config.usersStat.entries.push( userStat );
	}

	rcr_config.usersStat.lastUpdateDate = CurDate;
	//DebugMsg( EncodeJson( rcr_config.usersStat.entries ) );
}


function GetUserRecruitMetricsSet( user )
{
	array = lib_voc.get_sorted_voc( recruit_metrics_sets );
	if ( user.main_group_id.HasValue )
		array = ArraySelect( array, '! target_group_id.HasValue || target_group_id.ByValueExists( user.main_group_id )' );
	else
		array = ArraySelect( array, '! target_group_id.HasValue' );

	if ( user.access_role_id.HasValue )
		array = ArraySelect( array, '! target_access_role_id.HasValue || target_access_role_id.ByValueExists( user.access_role_id )' );
	else
		array = ArraySelect( array, '! target_access_role_id.HasValue' );

	/*
	if ( vacancy.recruit_type_id.HasValue )
		array = ArraySelect( array, '! target_recruit_type_id.HasValue || target_recruit_type_id.ByValueExists( vacancy.recruit_type_id )' );
	else
		array = ArraySelect( array, '! target_recruit_type_id.HasValue' );
	*/

	array = ArraySort( array, 'target_group_id.HasValue || target_access_role_id.HasValue || target_recruit_type_id.HasValue', '-' );
	return ArrayOptFirstElem( array );
}


function RunAgentCheckExternalEventStates()
{
	lib_recruit_provider.RunCheckStatesTask();
}


function set_catalog_constraints()
{
	if ( lib_user.active_user_access.prohibit_view_other_user_vacancies )
	{
		filterConstraint = lib_base.register_catalog_filter_constraint( 'vacancies', 'user_id' );
		filterConstraint.value.ObtainByValue( lib_user.active_user_info.id );

		filterConstraint = lib_base.register_catalog_filter_constraint( 'vacancy_instances', 'user_id' );
		filterConstraint.value.ObtainByValue( lib_user.active_user_info.id );
	}

	if ( lib_user.active_user_access.prohibit_view_other_group_vacancies )
	{
		lib_user.register_catalog_filter_group_constraint( 'vacancies' );
		lib_user.register_catalog_filter_group_constraint( 'vacancy_instances' );

		if ( AppModuleUsed( 'module_adecco' ) )
		{
			lib_user.register_catalog_filter_idata_group_constraint( 'vacancies' );
			lib_user.register_catalog_filter_idata_group_constraint( 'vacancy_instances' );
		}
	}

	if ( lib_user.active_user_access.restrict_view_vacancies_with_recruit_type )
	{
		filterConstraint = lib_base.register_catalog_filter_constraint( 'vacancies', 'recruit_type_id' );
		filterConstraint.values = ArraySelectAll( lib_user.active_user_access.vacancy_recruit_type_id );
	}

	if ( lib_user.active_user_access.prohibit_view_other_user_candidates )
	{
		filterConstraint = lib_base.register_catalog_filter_constraint( 'candidates', 'user_id' );
		filterConstraint.value.ObtainByValue( lib_user.active_user_info.id );
	}

	if ( lib_user.active_user_access.prohibit_view_other_group_candidates )
	{
		lib_user.register_catalog_filter_group_constraint( 'candidates' );

		if ( AppModuleUsed( 'module_adecco' ) )
		{
			lib_user.register_catalog_filter_idata_group_constraint( 'candidates' );
		}
	}

	if ( lib_user.active_user_access.restrict_view_candidates_with_recruit_type )
	{
		filterConstraint = lib_base.register_catalog_filter_constraint( 'candidates', 'recruit_type_id' );
		filterConstraint.values = ArraySelectAll( lib_user.active_user_access.candidate_recruit_type_id );
	}

	if ( false )
	{
		filterConstraint = lib_base.register_catalog_filter_constraint( 'vacancies', 'group_id' );
		filterConstraint.value.ObtainByValue( Int( '0x4AF4493E7968476D' ) );
	}
}


