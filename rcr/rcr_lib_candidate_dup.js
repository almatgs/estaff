function check_dup_candidates( candidateInfo, options )
{
	dupInfo = check_dup_candidates_prepare( candidateInfo, options );
	if ( dupInfo == undefined )
		return null;

	return check_dup_candidates_finish( candidateInfo, options, dupInfo );
}


function check_dup_candidates_prepare( candidateInfo, options )
{
	if ( options == undefined )
		options = new Object;

	if ( options.GetOptProperty( 'checkInternalCandidates', true ) )
		dupArray = find_dup_candidates( candidateInfo );
	else
		dupArray = [];

	if ( rcr_config.use_ext_duplicates_search && options.GetOptProperty( 'checkExternalCandidates', false ) )
		dupArray = ArrayUnion( dupArray, find_external_dup_candidates( candidateInfo, options ) );

	//DebugMsg( ArrayCount( dupArray ) );

	if ( ArrayCount( dupArray ) == 0 )
	{
		if ( ! options.GetOptProperty( 'allowSaveAsNew', true ) )
			lib_base.show_info_message( ActiveScreen, UiText.messages.duplicates_not_found );
		
		return undefined;
	}

	dupArray = ArraySort( dupArray, 'get_dup_candidate_relevance( This, candidateInfo )', '-' );
	
	dlgDoc = OpenDoc( 'rcr_dlg_dup_candidates.xml' );
	dlg = dlgDoc.TopElem;
	dlg.dup_array = dupArray;
	dlg.candidate_info_ref = candidateInfo;
	dlg.allow_save_as_new = options.GetOptProperty( 'allowSaveAsNew', true );

	ActiveScreen.ModalDlg( dlgDoc );
	return dlg;
}


function check_dup_candidates_finish( candidateInfo, options, dlg )
{
	if ( dlg.dest_candidate_id != null )
	{
		destCandidateDoc = ObtainUiDoc( ObjectDocUrl( 'data', 'candidate', dlg.dest_candidate_id ) );
		lib_recruit.merge_candidates( destCandidateDoc.TopElem, candidateInfo );
		UpdateUiDoc( destCandidateDoc );

		if ( global_settings.use_candidate_card_update_event )
		{
			eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
			eventDoc.TopElem.type_id = 'card_update';
			eventDoc.TopElem.date = CurDate;
			eventDoc.TopElem.candidate_id = dlg.dest_candidate_id;
			eventDoc.RunActionOnSave = false;
			eventDoc.Save();
		}

		return dlg.dest_candidate_id;
	}
	else if ( dlg.dest_external_candidate_ref.HasValue )
	{
		candidateInfo.external_storage_eid = dlg.dest_external_candidate.id;

		if ( ! candidateInfo.birth_date.HasValue )
			candidateInfo.birth_date = dlg.dest_external_candidate.birth_date;

		if ( ! candidateInfo.email.HasValue )
			candidateInfo.email = dlg.dest_external_candidate.email;

		if ( ! candidateInfo.skype.HasValue )
			candidateInfo.skype = dlg.dest_external_candidate.skype;

		if ( dlg.allow_save_as_new && GetOptForeignElem( event_types, 'external_storage_load' ) != undefined )
		{
			eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
			eventDoc.TopElem.type_id = 'external_storage_load';
			eventDoc.TopElem.date = CurDate;
			eventDoc.TopElem.candidate_id = candidateInfo.id;
			eventDoc.TopElem.comment = ArrayMerge( ArraySort( dlg.dest_external_candidate.records, 'date', '-' ), 'StrDate( date, false ) + \': \' + state_name + \' (\' + user_name + \')\'', '\r\n' );
			eventDoc.RunActionOnSave = false;
			eventDoc.Save();

			candidateInfo.view.target_events_loaded = false;
			candidateInfo.update_state();
		}

		candidateInfo.Doc.SetChanged( true );
		candidateInfo.Screen.Update();
		return null;
	}

	return null;
}


function find_dup_candidates( candidateInfo )
{
	qualStr = '';

	if ( candidateInfo.lastname != '' && candidateInfo.firstname != '' )
	{
		qualStr += ' or ( $elem/lastname = ' + XQueryLiteral( candidateInfo.lastname ) + ' and $elem/firstname = ' + XQueryLiteral( candidateInfo.firstname ) + ' )';

		if ( lib_cproc.is_valid_lang_str_en( candidateInfo.lastname + ' ' + candidateInfo.firstname, ['-', ' '] ) )
		{
			qualStr += ' or ( $elem/lastname_en = ' + XQueryLiteral( candidateInfo.lastname ) + ' and $elem/firstname_en = ' + XQueryLiteral( candidateInfo.firstname ) + ' )';
		}
	}

	if ( candidateInfo.lastname_en != '' && candidateInfo.firstname_en != '' && candidateInfo.lastname_en != candidateInfo.lastname )
	{
		qualStr += ' or ( $elem/lastname = ' + XQueryLiteral( candidateInfo.lastname_en ) + ' and $elem/firstname = ' + XQueryLiteral( candidateInfo.firstname_en ) + ' )';
		qualStr += ' or ( $elem/lastname_en = ' + XQueryLiteral( candidateInfo.lastname_en ) + ' and $elem/firstname_en = ' + XQueryLiteral( candidateInfo.firstname_en ) + ' )';
	}

	if ( candidateInfo.email != '' )
		qualStr += ' or $elem/email = ' + XQueryLiteral( candidateInfo.email ) + ' or $elem/email2 = ' + XQueryLiteral( candidateInfo.email );

	if ( candidateInfo.email2 != '' && candidateInfo.email2 != candidateInfo.email )
		qualStr += ' or $elem/email = ' + XQueryLiteral( candidateInfo.email2 ) + ' or $elem/email2 = ' + XQueryLiteral( candidateInfo.email2 );

	if ( candidateInfo.mobile_phone != '' )
		qualStr += ' or $elem/mobile_phone = ' + XQueryLiteral( candidateInfo.mobile_phone );

	if ( qualStr == '' )
		return Array();

	qualStr = StrReplaceOne( qualStr, ' or ', '' );

	queryStr = 'for $elem in candidates where ' + qualStr + ' return $elem';

	array = new Array;
	for ( candidate in XQuery( queryStr ) )
	{
		if ( candidateInfo.middlename != '' && candidate.middlename != '' && candidate.middlename != candidateInfo.middlename && ! is_dup_candidate_by_contacts( candidateInfo, candidate ) )
			continue;

		array.push( candidate );
	}

	//if ( candidateInfo.middlename != '' )
		//array = ArraySelect( array, 'This.middlename == \'\' || This.middlename == candidateInfo.middlename' );

	return array;
}


function get_dup_candidate_relevance( dupCandidate, candidate )
{
	score = 0;

	if ( dupCandidate.lastname == candidate.lastname )
		score++;

	if ( dupCandidate.firstname == candidate.firstname )
		score++;

	if ( dupCandidate.middlename.HasValue && dupCandidate.middlename == candidate.middlename )
		score++;

	if ( dupCandidate.birth_date.HasValue && dupCandidate.birth_date == candidate.birth_date )
		score++;
	else if ( dupCandidate.birth_year.HasValue && dupCandidate.birth_year == candidate.birth_year )
		score++;

	if ( dupCandidate.email.HasValue && ( StrEqual( dupCandidate.email, candidate.email, true ) || StrEqual( dupCandidate.email, candidate.email2, true ) ) )
		score++;

	if ( dupCandidate.email2.HasValue && ( StrEqual( dupCandidate.email2, candidate.email, true ) || StrEqual( dupCandidate.email2, candidate.email2, true ) ) )
		score++;

	if ( dupCandidate.mobile_phone.HasValue && dupCandidate.mobile_phone == candidate.mobile_phone )
		score++;

	if ( dupCandidate.location_id.HasValue && dupCandidate.location_id == candidate.location_id )
		score++;

	if ( dupCandidate.firstname.HasValue && candidate.firstname.HasValue && dupCandidate.firstname != candidate.firstname )
		score = 0;
	else if ( dupCandidate.middlename.HasValue && candidate.middlename.HasValue && dupCandidate.middlename != candidate.middlename )
		score = 0;
	else if ( dupCandidate.lastname.HasValue && candidate.lastname.HasValue && dupCandidate.lastname != candidate.lastname )
		score--;

	if ( dupCandidate.birth_date.HasValue && candidate.birth_date.HasValue && dupCandidate.birth_date != candidate.birth_date )
		score = 0;
	else if ( dupCandidate.birth_year.HasValue && candidate.birth_year.HasValue && dupCandidate.birth_year != candidate.birth_year )
		score = 0;

	return score;
}






function handle_find_candidates_dup_candidates( objectIDsArray, list )
{
	viewDoc = OpenNewDoc( 'rcr_view_dup_candidates.xml' );
	destData = viewDoc.TopElem;

	for ( candidateID in objectIDsArray )
	{
		candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
		candidate = candidateDoc.TopElem;

		find_candidate_dup_candidates( candidate, destData );
	}

	if ( destData.dup_sets.ChildNum == 0 )
	{
		lib_base.show_info_message( ActiveScreen, UiText.messages.duplicates_not_found );
		return;
	}

	adjust_dest_data( destData );
	CreateDocScreen( viewDoc );
}


function find_candidate_dup_candidates( candidate, destData )
{
	dupArray = find_dup_candidates( candidate );
	if ( ArrayCount( dupArray ) <= 1 )
		return;

	for ( dupCandidate in dupArray )
	{
		obtain_dup_set( destData, dupCandidate );
	}
}


function handle_find_all_dup_candidates()
{
	viewDoc = OpenNewDoc( 'rcr_view_dup_candidates.xml' );
	destData = viewDoc.TopElem;

	find_all_dup_candidates( viewDoc.TopElem );

	if ( destData.dup_sets.ChildNum == 0 )
	{
		lib_base.show_info_message( ActiveScreen, UiText.messages.duplicates_not_found );
		return;
	}

	adjust_dest_data( destData );
	CreateDocScreen( viewDoc );
}


function find_all_dup_candidates( destData )
{
	CurMethodProgress.ActivityName = UiText.messages.searching_for_duplicates + ' - 1';
	array = XQuery( 'for $elem in candidates order by $elem/fullname return $elem' );
	find_all_dup_candidates_in_array( destData, array, CurMethodProgress );

	CurMethodProgress.ActivityName = UiText.messages.searching_for_duplicates + ' - 2';
	array = XQuery( 'for $elem in candidates order by $elem/email return $elem' );
	find_all_dup_candidates_in_array( destData, array, CurMethodProgress );

	CurMethodProgress.ActivityName = UiText.messages.searching_for_duplicates + ' - 3';
	array = XQuery( 'for $elem in candidates order by $elem/fullname_en return $elem' );
	find_all_dup_candidates_in_array( destData, array, CurMethodProgress );
}


function find_all_dup_candidates_in_array( destData, srcArray, progress )
{
	//progress.TotalCount = reader.TotalCount;
	progress.ItemIndex = 0;

	prevCandidate = undefined;
	curDupSet = undefined;

	for ( candidate in srcArray )
	{
		CheckCurThread();
		progress.ItemName = candidate.fullname + '   ' + candidate.email;
		//Sleep( 300 );

		if ( prevCandidate != undefined && is_dup_candidate( candidate, prevCandidate ) )
		{
			if ( curDupSet == undefined )
			{
				curDupSet = obtain_dup_set( destData, prevCandidate, candidate );
			}
			else
			{
				targetCandidate = curDupSet.target_candidates.ObtainChildByKey( candidate.id );
				targetCandidate.candidate_ref = candidate;
			}
		}
		else
		{
			curDupSet = undefined;
		}

		prevCandidate = candidate;
	}
}


function obtain_dup_set( destData, candidate1, candidate2 )
{
	for ( dupSet in destData.dup_sets )
	{
		for ( targetCandidate in dupSet.target_candidates )
		{
			if ( is_dup_candidate( targetCandidate.candidate, candidate1 ) || ( candidate2 != undefined && is_dup_candidate( targetCandidate.candidate, candidate2 ) ) )
			{
				targetCandidate = dupSet.target_candidates.ObtainChildByKey( candidate1.id );
				targetCandidate.candidate_ref = candidate1;
				
				if ( candidate2 != undefined )
				{
					targetCandidate = dupSet.target_candidates.ObtainChildByKey( candidate2.id );
					targetCandidate.candidate_ref = candidate2;
				}

				return dupSet;
			}
		}
	}

	dupSet = destData.dup_sets.AddChild();
	dupSet.fullname = candidate1.fullname;

	targetCandidate = dupSet.target_candidates.ObtainChildByKey( candidate1.id );
	targetCandidate.candidate_ref = candidate1;

	if ( candidate2 != undefined )
	{
		targetCandidate = dupSet.target_candidates.ObtainChildByKey( candidate2.id );
		targetCandidate.candidate_ref = candidate2;
	}

	return dupSet;
}


function adjust_dest_data( destData )
{
	destData.dup_sets.Sort( 'fullname', '+' );

	for ( dupSet in destData.dup_sets )
		adjust_dup_set( dupSet );
}


function adjust_dup_set( dupSet )
{
	dupSet.target_candidates.Sort( 'candidate.state_id == \'new\' || candidate.state_id == \'unused\'', '+', 'candidate.state_date', '-' );
	dupSet.target_candidates[0].is_primary = true;
}


function handle_merge_dup_candidates( destData, selTargetCandidatesArray )
{
	for ( dupSet in destData.dup_sets )
		handle_merge_dup_candidates_from_set( dupSet, selTargetCandidatesArray );
}


function handle_merge_dup_candidates_from_set( dupSet, selTargetCandidatesArray )
{
	targetCandidatesArray = ArrayIntersect( dupSet.target_candidates, selTargetCandidatesArray, 'candidate_id', 'candidate_id' );
	if ( ArrayCount( targetCandidatesArray ) == 0 )
		return;

	if ( ArrayCount( targetCandidatesArray ) == 1 )
		throw UiError( StrReplaceOne( UiText.errors.dup_set_xxx_single_sel, '%s', dupSet.fullname ) );

	targetCandidate = ArrayOptFind( targetCandidatesArray, 'is_primary' );
	if ( targetCandidate == undefined )
		throw UiError( StrReplaceOne( UiText.errors.dup_set_xxx_no_primary_sel, '%s', dupSet.fullname ) );

	array = ArraySelect( targetCandidatesArray, 'candidate_id != targetCandidate.candidate_id' );

	for ( dupTargetCandidate in array )
		merge_dup_candidates( targetCandidate.candidate, dupTargetCandidate.candidate );
}


function merge_dup_candidates( candidate, dupCandidate )
{
	candidateDoc = ObtainUiDoc( ObjectDocUrl( 'data', 'candidate', candidate.id ) );
	candidate = candidateDoc.TopElem;

	dupCandidateDoc = OpenDoc( ObjectDocUrl( 'data', 'candidate', dupCandidate.id ) );
	dupCandidate = dupCandidateDoc.TopElem;

	lib_recruit.merge_candidates( candidate, dupCandidate );

	UpdateUiDoc( candidateDoc );

	dupCandidateDoc = undefined;
	DeleteDoc( dupCandidate.ObjectUrl );
}


function is_dup_candidate( candidate1, candidate2 )
{
	//DebugMsg( candidate1.Xml );
	//DebugMsg( candidate2.Xml );

	if ( is_dup_candidate_by_name( candidate1, candidate2 ) )
		return true;

	if ( is_dup_candidate_by_contacts( candidate1, candidate2 ) )
		return true;

	return false;
}


function is_dup_candidate_by_name( candidate1, candidate2 )
{
	if ( candidate1.middlename != '' && candidate2.middlename != '' && candidate1.middlename != candidate2.middlename )
		return false;

	if ( candidate1.lastname != '' && candidate1.firstname != '' )
	{
		if ( candidate1.lastname == candidate2.lastname && candidate1.firstname == candidate2.firstname )
			return true;

		if ( candidate1.lastname == candidate2.lastname_en && candidate1.firstname == candidate2.firstname_en )
			return true;
	}

	if ( candidate1.lastname_en != '' && candidate1.firstname_en != '' )
	{
		if ( candidate1.lastname_en == candidate2.lastname_en && candidate1.firstname_en == candidate2.firstname_en )
			return true;

		if ( candidate1.lastname_en == candidate2.lastname && candidate1.firstname_en == candidate2.firstname )
			return true;
	}

	return false;
}


function is_dup_candidate_by_contacts( candidate1, candidate2 )
{
	if ( candidate1.mobile_phone != '' && candidate1.mobile_phone == candidate2.mobile_phone )
		return true;

	if ( candidate1.email != '' && StrEqual( candidate1.email, candidate2.email, true ) )
		return true;
	
	if ( candidate1.email2 != '' && StrEqual( candidate1.email2, candidate2.email2, true ) )
		return true;
	
	if ( candidate1.email != '' && StrEqual( candidate1.email, candidate2.email2, true ) )
		return true;

	if ( candidate1.email2 != '' && StrEqual( candidate1.email2, candidate2.email, true ) )
		return true;

	return false;
}



function get_external_pool_service_url()
{
	serverAddress = AppServerConfig.GetOptProperty( 'external-candidates-storage-address', '' );
	if ( serverAddress == '' )
		throw UserError( 'External database address has not been specified' );

	return 'http://' + serverAddress + '/services/CandidateService';
}


function find_external_dup_candidates( candidateInfo, options )
{
	argElem = lib_ipc.create_soap_arg_elem();
	body = argElem.AddChild( 'soap:Body' );
	core = body.AddChild( 'SearchCandidates' );

	filterElem = core.AddChild( 'filter' );

	optionsElem = core.AddChild( 'options' );
	searchModeElem = optionsElem.AddChild( 'search_mode', 'string' );

	if ( options.GetOptProperty( 'checkPairOnly', false ) )
	{
		filterElem.AddChild( 'id', 'integer' ).Value = candidateInfo.external_storage_eid;
		searchModeElem.Value = 'single_elem';
	}
	else
	{
		filterElem.AddChild( 'lastname', 'string' ).Value = candidateInfo.lastname;
		filterElem.AddChild( 'firstname', 'string' ).Value = candidateInfo.firstname;
		filterElem.AddChild( 'middlename', 'string' ).Value = candidateInfo.middlename;
		filterElem.AddChild( 'birth_date', 'date' ).Value = candidateInfo.birth_date;
		filterElem.AddChild( 'birth_year', 'integer' ).Value = candidateInfo.birth_year;
		filterElem.AddChild( 'email', 'string' ).Value = candidateInfo.email;
		filterElem.AddChild( 'email2', 'string' ).Value = candidateInfo.email2;

		searchModeElem.Value = 'duplicates';
	}

	respElem = CreateWebServiceMethodResultsElem( 'rcr_wsrv_candidate.xml', 'SearchCandidates' );
	
	respElem = lib_ipc.call_soap_method( get_external_pool_service_url(), argElem, respElem );

	destArray = new Array;
	
	for ( srcCandidate in respElem.candidates )
	{
		destArray.push( srcCandidate );
	}

	return destArray;
}


function handle_check_external_dup_candidates( candidateInfo )
{
	check_dup_candidates( candidateInfo, {checkInternalCandidates:false,checkExternalCandidates:true,allowSaveAsNew:false} );
}


function handle_check_external_pair( candidateInfo )
{
	check_dup_candidates( candidateInfo, {checkInternalCandidates:false,checkExternalCandidates:true,checkPairOnly:true,allowSaveAsNew:false} );
}


